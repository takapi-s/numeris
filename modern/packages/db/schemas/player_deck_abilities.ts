import { integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { abilities } from "./abilities";
import { playerDecks } from "./player_decks";

export const playerDeckAbilities = pgTable(
  "player_deck_abilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerDeckId: uuid("player_deck_id")
      .notNull()
      .references(() => playerDecks.id, { onDelete: "cascade", onUpdate: "cascade" }),
    abilityName: text("ability_name")
      .notNull()
      .references(() => abilities.name, { onDelete: "cascade", onUpdate: "cascade" }),
    count: integer("count").notNull(),
  },
  (table) => ({
    playerDeckAbilityUidIdx: uniqueIndex("player_deck_abilities_deck_ability_uidx").on(
      table.playerDeckId,
      table.abilityName,
    ),
  }),
);

