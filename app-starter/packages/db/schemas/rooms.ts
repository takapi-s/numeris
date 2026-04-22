import { sql } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { players } from "./players";

export const ROOM_STATUS_VALUES = ["waiting", "in_game", "finished"] as const;
export type RoomStatus = (typeof ROOM_STATUS_VALUES)[number];
export const roomStatusEnum = pgEnum("room_status", ROOM_STATUS_VALUES);

export const rooms = pgTable(
  "rooms",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: uuid("public_id").notNull().defaultRandom(),
    status: roomStatusEnum("status").notNull().default("waiting"),
    ownerPlayerId: uuid("owner_player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict", onUpdate: "cascade" }),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    statusIdx: index("rooms_status_idx").on(table.status),
    ownerPlayerIdIdx: index("rooms_owner_player_id_idx").on(table.ownerPlayerId),
    publicIdUidIdx: uniqueIndex("rooms_public_id_uidx").on(table.publicId),
  }),
);

