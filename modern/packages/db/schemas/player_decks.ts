import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { deckTemplates } from "./deck_templates";
import { players } from "./players";

export const playerDecks = pgTable(
  "player_decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade", onUpdate: "cascade" }),
    baseTemplateId: uuid("base_template_id")
      .notNull()
      .references(() => deckTemplates.id, { onDelete: "restrict", onUpdate: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    playerIdIdx: index("player_decks_player_id_idx").on(table.playerId),
    playerActiveIdx: index("player_decks_player_active_idx").on(table.playerId, table.isActive),
  }),
);

