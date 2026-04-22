import type { AbilityDefinition } from "../abilities/AbilityTypes";
import { applyOnPlay, applyTraitsOnTurnStart, canPlayWithTraits } from "../abilities/AbilityEngine";
import type { GameCard, GameState } from "./GameState";

export class Game {
  constructor(
    private state: GameState,
    private abilitiesByName: Map<string, AbilityDefinition>,
  ) {}

  static from(state: GameState, abilities: AbilityDefinition[]): Game {
    return new Game(state, new Map(abilities.map((a) => [a.name, a])));
  }

  getState(): GameState {
    return this.state;
  }

  startTurn(): void {
    applyTraitsOnTurnStart(this.state, this.abilitiesByName);
  }

  draw(actorPlayerId: string, n = 1): void {
    this.assertTurn(actorPlayerId);
    const hand = this.state.hands[actorPlayerId] ?? (this.state.hands[actorPlayerId] = []);
    for (let i = 0; i < n; i++) {
      const c = this.state.deck.shift();
      if (!c) break;
      hand.push(c);
    }
  }

  pass(actorPlayerId: string): void {
    this.assertTurn(actorPlayerId);
    this.endTurn();
  }

  playCard(actorPlayerId: string, cardId: string): void {
    this.assertTurn(actorPlayerId);
    const hand = this.state.hands[actorPlayerId] ?? [];
    const idx = hand.findIndex((c) => c.id === cardId);
    if (idx < 0) throw new Error("Card not in hand");

    const card = hand[idx]!;
    const top = this.state.discardPile[0] ?? null;

    const baseCanPlay = !top || top.color === card.color || top.number === card.number;
    const ability = card.abilityName ? this.abilitiesByName.get(card.abilityName) ?? null : null;
    const canPlay = canPlayWithTraits(baseCanPlay, ability?.traitEffects);
    if (!canPlay) throw new Error("Cannot play this card");

    hand.splice(idx, 1);
    this.state.discardPile.unshift(card);

    if (ability) applyOnPlay(this.state, ability, { actorPlayerId });

    this.endTurn();
  }

  private assertTurn(playerId: string) {
    if (this.state.currentTurnPlayerId !== playerId) throw new Error("Not your turn");
  }

  private endTurn() {
    const idx = this.state.turnOrder.indexOf(this.state.currentTurnPlayerId);
    const nextIdx = (idx + this.state.direction + this.state.turnOrder.length) % this.state.turnOrder.length;
    this.state.currentTurnPlayerId = this.state.turnOrder[nextIdx]!;
    this.state.turnNumber += 1;
  }
}

export function makeInitialState(args: {
  players: Array<{ playerId: string; displayName: string }>;
  deck: GameCard[];
}): GameState {
  const order = args.players.map((p) => p.playerId);
  const hands: Record<string, GameCard[]> = {};
  for (const pid of order) hands[pid] = [];
  // deal 7
  for (let i = 0; i < 7; i++) {
    for (const pid of order) {
      const c = args.deck.shift();
      if (!c) break;
      hands[pid]!.push(c);
    }
  }
  const first = args.deck.shift();
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    players: args.players,
    turnOrder: order,
    currentTurnPlayerId: order[0]!,
    direction: 1,
    deck: args.deck,
    discardPile: first ? [first] : [],
    hands,
    appliedTraits: {},
    turnNumber: 1,
  };
}

