import { db } from "@packages/db/client.server";
import {
  cardTemplates,
  gameEvents,
  games,
  players,
  playerDeckAbilities,
  playerDeckCards,
  playerDecks,
  roomPlayers,
  rooms,
} from "@packages/db/schemas";
import { eq } from "drizzle-orm";
import type { Route } from "../routes/game.$roomID/+types/route";
import { AbilityRepository } from "./repositories/AbilityRepository";
import type { AbilityDefinition } from "../game/abilities/AbilityTypes";
import type { GameCard, GameState } from "../game/domain/GameState";
import { Game, makeInitialState } from "../game/domain/Game";

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function assignAbilities(deck: GameCard[], pool: string[]): GameCard[] {
  shuffle(pool);
  for (const card of deck) {
    const name = pool.pop();
    if (!name) break;
    card.abilityName = name;
  }
  return deck;
}

export class GameService {
  static fromArgs(args: { env: Route.LoaderArgs["context"]["cloudflare"]["env"] }) {
    const dbClient = db({ DATABASE_URL: args.env.HYPERDRIVE.connectionString });
    return new GameService(dbClient);
  }

  constructor(private readonly dbClient: ReturnType<typeof db>) {}

  async startGame(roomPublicId: string): Promise<GameState> {
    return this.dbClient.transaction(async (tx) => {
      const roomRows = await tx
        .select({ id: rooms.id, selectedDeckId: rooms.selectedDeckId })
        .from(rooms)
        .where(eq(rooms.publicId, roomPublicId))
        .limit(1);
      const room = roomRows[0];
      if (!room) throw new Response("Room not found", { status: 404 });
      if (!room.selectedDeckId) throw new Response("Selected deck not found", { status: 400 });

      const roomPlayerRows = await tx
        .select({ playerId: roomPlayers.playerId, displayName: players.displayName })
        .from(roomPlayers)
        .innerJoin(players, eq(players.id, roomPlayers.playerId))
        .where(eq(roomPlayers.roomId, room.id));

      if (roomPlayerRows.length < 2) throw new Response("Need at least 2 players", { status: 400 });

      const abilityRepo = new AbilityRepository(tx as any);
      const abilityRows = await abilityRepo.listAll();
      const abilityDefs: AbilityDefinition[] = abilityRows.map((r: any) => ({
        name: r.name,
        title: r.title,
        canPlayRule: (r.canPlayRule as any) ?? null,
        onPlayEffects: (r.onPlayEffects as any) ?? null,
        traitEffects: (r.traitEffects as any) ?? null,
      }));

      const selectedDeckRows = await tx
        .select({ id: playerDecks.id })
        .from(playerDecks)
        .where(eq(playerDecks.id, room.selectedDeckId))
        .limit(1);
      const selectedDeck = selectedDeckRows[0];
      if (!selectedDeck) throw new Response("Player deck not found", { status: 404 });

      const deckCardRows = await tx
        .select({
          cardTemplateId: playerDeckCards.cardTemplateId,
          count: playerDeckCards.count,
          color: cardTemplates.color,
          number: cardTemplates.number,
        })
        .from(playerDeckCards)
        .innerJoin(cardTemplates, eq(cardTemplates.id, playerDeckCards.cardTemplateId))
        .where(eq(playerDeckCards.playerDeckId, selectedDeck.id));

      let seq = 0;
      const deck: GameCard[] = [];
      for (const row of deckCardRows) {
        for (let i = 0; i < row.count; i++) {
          deck.push({ id: `c_${seq++}`, color: row.color as any, number: row.number, abilityName: null });
        }
      }

      const abilityCountRows = await tx
        .select({ abilityName: playerDeckAbilities.abilityName, count: playerDeckAbilities.count })
        .from(playerDeckAbilities)
        .where(eq(playerDeckAbilities.playerDeckId, selectedDeck.id));

      const abilityPool: string[] = [];
      for (const a of abilityCountRows) {
        for (let i = 0; i < a.count; i++) abilityPool.push(a.abilityName);
      }

      shuffle(deck);
      assignAbilities(deck, abilityPool);
      const state = makeInitialState({ players: roomPlayerRows, deck });
      await tx.update(rooms).set({ status: "in_game" }).where(eq(rooms.id, room.id));
      const game = await tx.insert(games).values({ roomId: room.id, state }).returning({ id: games.id });

      await tx.insert(gameEvents).values({ roomId: room.id, gameId: game[0]!.id, type: "game_started", payload: {} });
      return state;
    });
  }

  async getGameByRoomPublicId(roomPublicId: string) {
    const roomRows = await this.dbClient
      .select({ id: rooms.id, publicId: rooms.publicId })
      .from(rooms)
      .where(eq(rooms.publicId, roomPublicId))
      .limit(1);
    const room = roomRows[0];
    if (!room) throw new Response("Room not found", { status: 404 });

    const gameRows = await this.dbClient.select({ id: games.id, state: games.state }).from(games).where(eq(games.roomId, room.id)).limit(1);
    return { room, game: gameRows[0] ?? null };
  }

  async applyIntent(roomPublicId: string, actorPlayerId: string, intent: { type: "play"; cardId: string } | { type: "draw" } | { type: "pass" }) {
    return this.dbClient.transaction(async (tx) => {
      const roomRows = await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.publicId, roomPublicId)).limit(1);
      const room = roomRows[0];
      if (!room) throw new Response("Room not found", { status: 404 });

      const gameRows = await tx.select({ id: games.id, state: games.state }).from(games).where(eq(games.roomId, room.id)).limit(1);
      const row = gameRows[0];
      if (!row) throw new Response("Game not started", { status: 400 });

      const abilityRepo = new AbilityRepository(tx as any);
      const abilityRows = await abilityRepo.listAll();
      const abilityDefs: AbilityDefinition[] = abilityRows.map((r: any) => ({
        name: r.name,
        title: r.title,
        canPlayRule: (r.canPlayRule as any) ?? null,
        onPlayEffects: (r.onPlayEffects as any) ?? null,
        traitEffects: (r.traitEffects as any) ?? null,
      }));

      const game = Game.from(row.state as any, abilityDefs);
      game.startTurn(); // trait on turn start (idempotent)

      if (intent.type === "draw") {
        game.draw(actorPlayerId, 1);
        await tx.insert(gameEvents).values({ roomId: room.id, gameId: row.id, type: "card_drawn", payload: { actorPlayerId } });
      } else if (intent.type === "pass") {
        game.pass(actorPlayerId);
        await tx.insert(gameEvents).values({ roomId: room.id, gameId: row.id, type: "turn_passed", payload: { actorPlayerId } });
      } else {
        game.playCard(actorPlayerId, intent.cardId);
        await tx.insert(gameEvents).values({ roomId: room.id, gameId: row.id, type: "card_played", payload: { actorPlayerId, cardId: intent.cardId } });
      }

      const nextState = game.getState();
      await tx.update(games).set({ state: nextState }).where(eq(games.id, row.id));
      return nextState;
    });
  }
}

