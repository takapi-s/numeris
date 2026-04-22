import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { rooms } from "./rooms";

export const games = pgTable(
  "games",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: uuid("public_id").notNull().defaultRandom(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    state: jsonb("state").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    roomIdUidIdx: uniqueIndex("games_room_id_uidx").on(table.roomId),
    roomIdIdx: index("games_room_id_idx").on(table.roomId),
    publicIdUidIdx: uniqueIndex("games_public_id_uidx").on(table.publicId),
  }),
);

