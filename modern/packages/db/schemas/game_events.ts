import { index, integer, jsonb, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";

import { games } from "./games";
import { rooms } from "./rooms";

export const GAME_EVENT_TYPE_VALUES = [
  "room_created",
  "player_joined",
  "player_left",
  "game_started",
  "card_played",
  "card_drawn",
  "turn_passed",
  "game_finished",
] as const;
export type GameEventType = (typeof GAME_EVENT_TYPE_VALUES)[number];
export const gameEventTypeEnum = pgEnum("game_event_type", GAME_EVENT_TYPE_VALUES);

export const gameEvents = pgTable(
  "game_events",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    gameId: integer("game_id").references(() => games.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: gameEventTypeEnum("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    roomIdIdx: index("game_events_room_id_idx").on(table.roomId),
    gameIdIdx: index("game_events_game_id_idx").on(table.gameId),
    createdAtIdx: index("game_events_created_at_idx").on(table.createdAt),
  }),
);

