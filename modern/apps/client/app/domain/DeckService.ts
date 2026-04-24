import { DeckRepository } from "./repositories/DeckRepository";

export class DeckService {
  constructor(private readonly decks: DeckRepository) {}

  async ensureStarterDeck(playerId: string) {
    const activeDeck = await this.decks.getActivePlayerDeck(playerId);
    if (activeDeck) return activeDeck;

    const existingDecks = await this.decks.listPlayerDecks(playerId);
    if (existingDecks[0]) {
      await this.decks.deactivatePlayerDecks(playerId);
      await this.decks.setPlayerDeckActive(existingDecks[0].id, true);
      return this.decks.getActivePlayerDeck(playerId);
    }

    return this.decks.transaction(async (tx) => {
      const repo = new DeckRepository(tx);
      const baseTemplate = await repo.getDeckTemplateBySlug("normal");
      if (!baseTemplate) {
        throw new Response("Deck template not found: normal", { status: 500 });
      }

      const createdDeck = await repo.createPlayerDeck({
        playerId,
        baseTemplateId: baseTemplate.id,
        name: `${baseTemplate.name} Deck`,
        isActive: true,
      });
      if (!createdDeck) {
        throw new Response("Failed to create starter deck", { status: 500 });
      }

      const templateCards = await repo.listDeckTemplateCards(baseTemplate.id);
      await repo.createPlayerDeckCards(
        templateCards.map((row) => ({
          playerDeckId: createdDeck.id,
          cardTemplateId: row.cardTemplateId,
          count: row.count,
        })),
      );

      const templateAbilities = await repo.listDeckTemplateAbilities(baseTemplate.id);
      await repo.createPlayerDeckAbilities(
        templateAbilities.map((row) => ({
          playerDeckId: createdDeck.id,
          abilityName: row.abilityName,
          count: row.count,
        })),
      );

      const nextActiveDeck = await repo.getActivePlayerDeck(playerId);
      if (!nextActiveDeck) {
        throw new Response("Starter deck was not activated", { status: 500 });
      }
      return nextActiveDeck;
    });
  }

  async requireActiveDeck(playerId: string) {
    const activeDeck = await this.ensureStarterDeck(playerId);
    if (!activeDeck) {
      throw new Response("Active deck not found", { status: 500 });
    }
    return activeDeck;
  }

  async activateDeck(playerId: string, playerDeckId: string) {
    const ownedDeck = await this.decks.getPlayerDeckForPlayer(playerId, playerDeckId);
    if (!ownedDeck) {
      throw new Response("Deck not found", { status: 404 });
    }

    await this.decks.transaction(async (tx) => {
      const repo = new DeckRepository(tx);
      await repo.deactivatePlayerDecks(playerId);
      await repo.setPlayerDeckActive(playerDeckId, true);
    });
  }
}

