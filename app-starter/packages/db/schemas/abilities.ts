import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const abilities = pgTable("abilities", {
  name: text("name").primaryKey(),
  title: text("title").notNull(),
  canPlayRule: jsonb("can_play_rule"),
  onPlayEffects: jsonb("on_play_effects"),
  traitEffects: jsonb("trait_effects"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

