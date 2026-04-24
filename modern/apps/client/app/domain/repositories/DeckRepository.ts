import {
  abilities,
  cardTemplates,
  deckTemplateAbilities,
  deckTemplateCards,
  deckTemplates,
  playerDeckAbilities,
  playerDeckCards,
  playerDecks,
  rooms,
} from "@packages/db/schemas";
import { and, asc, eq } from "drizzle-orm";
import type { DrizzleDB } from "../types";

export class DeckRepository {
  constructor(private readonly db: DrizzleDB) {}

  async transaction<T>(fn: (tx: DrizzleDB) => Promise<T>) {
    return this.db.transaction(async (tx) => fn(tx as unknown as DrizzleDB));
  }

  async listDeckTemplates() {
    return this.db
      .select({
        id: deckTemplates.id,
        slug: deckTemplates.slug,
        name: deckTemplates.name,
        version: deckTemplates.version,
      })
      .from(deckTemplates)
      .orderBy(asc(deckTemplates.createdAt));
  }

  async getDeckTemplateById(id: string) {
    const rows = await this.db
      .select({
        id: deckTemplates.id,
        slug: deckTemplates.slug,
        name: deckTemplates.name,
        version: deckTemplates.version,
      })
      .from(deckTemplates)
      .where(eq(deckTemplates.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async getDeckTemplateBySlug(slug: string) {
    const rows = await this.db
      .select({
        id: deckTemplates.id,
        slug: deckTemplates.slug,
        name: deckTemplates.name,
        version: deckTemplates.version,
      })
      .from(deckTemplates)
      .where(eq(deckTemplates.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async listDeckTemplateCards(deckTemplateId: string) {
    return this.db
      .select({
        cardTemplateId: deckTemplateCards.cardTemplateId,
        count: deckTemplateCards.count,
        color: cardTemplates.color,
        number: cardTemplates.number,
        slug: cardTemplates.slug,
      })
      .from(deckTemplateCards)
      .innerJoin(cardTemplates, eq(cardTemplates.id, deckTemplateCards.cardTemplateId))
      .where(eq(deckTemplateCards.deckTemplateId, deckTemplateId))
      .orderBy(asc(cardTemplates.color), asc(cardTemplates.number));
  }

  async listDeckTemplateAbilities(deckTemplateId: string) {
    return this.db
      .select({
        abilityName: deckTemplateAbilities.abilityName,
        count: deckTemplateAbilities.count,
        title: abilities.title,
      })
      .from(deckTemplateAbilities)
      .innerJoin(abilities, eq(abilities.name, deckTemplateAbilities.abilityName))
      .where(eq(deckTemplateAbilities.deckTemplateId, deckTemplateId))
      .orderBy(asc(deckTemplateAbilities.abilityName));
  }

  async listPlayerDecks(playerId: string) {
    return this.db
      .select({
        id: playerDecks.id,
        name: playerDecks.name,
        isActive: playerDecks.isActive,
        baseTemplateId: playerDecks.baseTemplateId,
        baseTemplateSlug: deckTemplates.slug,
        baseTemplateName: deckTemplates.name,
      })
      .from(playerDecks)
      .innerJoin(deckTemplates, eq(deckTemplates.id, playerDecks.baseTemplateId))
      .where(eq(playerDecks.playerId, playerId))
      .orderBy(asc(playerDecks.createdAt));
  }

  async getPlayerDeckById(playerDeckId: string) {
    const rows = await this.db
      .select({
        id: playerDecks.id,
        playerId: playerDecks.playerId,
        name: playerDecks.name,
        isActive: playerDecks.isActive,
        baseTemplateId: playerDecks.baseTemplateId,
        baseTemplateSlug: deckTemplates.slug,
        baseTemplateName: deckTemplates.name,
      })
      .from(playerDecks)
      .innerJoin(deckTemplates, eq(deckTemplates.id, playerDecks.baseTemplateId))
      .where(eq(playerDecks.id, playerDeckId))
      .limit(1);
    return rows[0] ?? null;
  }

  async getPlayerDeckForPlayer(playerId: string, playerDeckId: string) {
    const rows = await this.db
      .select({
        id: playerDecks.id,
        playerId: playerDecks.playerId,
        name: playerDecks.name,
        isActive: playerDecks.isActive,
        baseTemplateId: playerDecks.baseTemplateId,
        baseTemplateSlug: deckTemplates.slug,
        baseTemplateName: deckTemplates.name,
      })
      .from(playerDecks)
      .innerJoin(deckTemplates, eq(deckTemplates.id, playerDecks.baseTemplateId))
      .where(and(eq(playerDecks.playerId, playerId), eq(playerDecks.id, playerDeckId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async getActivePlayerDeck(playerId: string) {
    const rows = await this.db
      .select({
        id: playerDecks.id,
        playerId: playerDecks.playerId,
        name: playerDecks.name,
        isActive: playerDecks.isActive,
        baseTemplateId: playerDecks.baseTemplateId,
        baseTemplateSlug: deckTemplates.slug,
        baseTemplateName: deckTemplates.name,
      })
      .from(playerDecks)
      .innerJoin(deckTemplates, eq(deckTemplates.id, playerDecks.baseTemplateId))
      .where(and(eq(playerDecks.playerId, playerId), eq(playerDecks.isActive, true)))
      .limit(1);
    return rows[0] ?? null;
  }

  async createPlayerDeck(input: {
    playerId: string;
    baseTemplateId: string;
    name: string;
    isActive: boolean;
  }) {
    const rows = await this.db
      .insert(playerDecks)
      .values(input)
      .returning({ id: playerDecks.id });
    return rows[0] ?? null;
  }

  async createPlayerDeckCards(rows: Array<{ playerDeckId: string; cardTemplateId: string; count: number }>) {
    if (rows.length === 0) return;
    await this.db.insert(playerDeckCards).values(rows);
  }

  async createPlayerDeckAbilities(rows: Array<{ playerDeckId: string; abilityName: string; count: number }>) {
    if (rows.length === 0) return;
    await this.db.insert(playerDeckAbilities).values(rows);
  }

  async listPlayerDeckCards(playerDeckId: string) {
    return this.db
      .select({
        cardTemplateId: playerDeckCards.cardTemplateId,
        count: playerDeckCards.count,
        color: cardTemplates.color,
        number: cardTemplates.number,
        slug: cardTemplates.slug,
      })
      .from(playerDeckCards)
      .innerJoin(cardTemplates, eq(cardTemplates.id, playerDeckCards.cardTemplateId))
      .where(eq(playerDeckCards.playerDeckId, playerDeckId))
      .orderBy(asc(cardTemplates.color), asc(cardTemplates.number));
  }

  async listPlayerDeckAbilities(playerDeckId: string) {
    return this.db
      .select({
        abilityName: playerDeckAbilities.abilityName,
        count: playerDeckAbilities.count,
        title: abilities.title,
      })
      .from(playerDeckAbilities)
      .innerJoin(abilities, eq(abilities.name, playerDeckAbilities.abilityName))
      .where(eq(playerDeckAbilities.playerDeckId, playerDeckId))
      .orderBy(asc(playerDeckAbilities.abilityName));
  }

  async deactivatePlayerDecks(playerId: string) {
    await this.db.update(playerDecks).set({ isActive: false }).where(eq(playerDecks.playerId, playerId));
  }

  async setPlayerDeckActive(playerDeckId: string, isActive: boolean) {
    await this.db.update(playerDecks).set({ isActive }).where(eq(playerDecks.id, playerDeckId));
  }

  async setRoomSelectedDeck(roomId: number, selectedDeckId: string | null) {
    await this.db.update(rooms).set({ selectedDeckId }).where(eq(rooms.id, roomId));
  }
}

