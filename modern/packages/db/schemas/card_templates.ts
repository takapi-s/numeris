import { sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const CARD_COLOR_VALUES = ["red", "green", "blue", "yellow"] as const;
export type CardColor = (typeof CARD_COLOR_VALUES)[number];
export const cardColorEnum = pgEnum("card_color", CARD_COLOR_VALUES);

export const cardTemplates = pgTable("card_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  color: cardColorEnum("color").notNull(),
  number: integer("number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

