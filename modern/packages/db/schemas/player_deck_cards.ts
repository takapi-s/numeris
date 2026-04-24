import { integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { cardTemplates } from "./card_templates";
import { playerDecks } from "./player_decks";

export const playerDeckCards = pgTable(
  "player_deck_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerDeckId: uuid("player_deck_id")
      .notNull()
      .references(() => playerDecks.id, { onDelete: "cascade", onUpdate: "cascade" }),
    cardTemplateId: uuid("card_template_id")
      .notNull()
      .references(() => cardTemplates.id, { onDelete: "cascade", onUpdate: "cascade" }),
    count: integer("count").notNull(),
  },
  (table) => ({
    playerDeckCardUidIdx: uniqueIndex("player_deck_cards_deck_card_uidx").on(
      table.playerDeckId,
      table.cardTemplateId,
    ),
  }),
);

