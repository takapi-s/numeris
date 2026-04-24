import { integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { cardTemplates } from "./card_templates";
import { deckTemplates } from "./deck_templates";

export const deckTemplateCards = pgTable(
  "deck_template_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckTemplateId: uuid("deck_template_id")
      .notNull()
      .references(() => deckTemplates.id, { onDelete: "cascade", onUpdate: "cascade" }),
    cardTemplateId: uuid("card_template_id")
      .notNull()
      .references(() => cardTemplates.id, { onDelete: "cascade", onUpdate: "cascade" }),
    count: integer("count").notNull(),
  },
  (table) => ({
    deckCardUidIdx: uniqueIndex("deck_template_cards_deck_card_uidx").on(table.deckTemplateId, table.cardTemplateId),
  }),
);

