import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { players } from "./players";
import { rooms } from "./rooms";

export const roomPlayers = pgTable(
  "room_players",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade", onUpdate: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    isOwner: boolean("is_owner").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    roomIdIdx: index("room_players_room_id_idx").on(table.roomId),
    playerIdIdx: index("room_players_player_id_idx").on(table.playerId),
    roomPlayerUidIdx: uniqueIndex("room_players_room_id_player_id_uidx").on(table.roomId, table.playerId),
  }),
);

