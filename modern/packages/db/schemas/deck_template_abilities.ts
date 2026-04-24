import { integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { abilities } from "./abilities";
import { deckTemplates } from "./deck_templates";

export const deckTemplateAbilities = pgTable(
  "deck_template_abilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckTemplateId: uuid("deck_template_id")
      .notNull()
      .references(() => deckTemplates.id, { onDelete: "cascade", onUpdate: "cascade" }),
    abilityName: text("ability_name")
      .notNull()
      .references(() => abilities.name, { onDelete: "cascade", onUpdate: "cascade" }),
    count: integer("count").notNull(),
  },
  (table) => ({
    deckAbilityUidIdx: uniqueIndex("deck_template_abilities_deck_ability_uidx").on(table.deckTemplateId, table.abilityName),
  }),
);

