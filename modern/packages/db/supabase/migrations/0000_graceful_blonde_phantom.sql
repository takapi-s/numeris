CREATE TYPE "public"."game_event_type" AS ENUM('room_created', 'player_joined', 'player_left', 'game_started', 'card_played', 'card_drawn', 'turn_passed', 'game_finished');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('waiting', 'in_game', 'finished');--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"room_id" integer NOT NULL,
	"game_id" integer,
	"type" "game_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "games_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"room_id" integer NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "room_players_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"room_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" "room_status" DEFAULT 'waiting' NOT NULL,
	"owner_player_id" uuid NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_player_id_players_id_fk" FOREIGN KEY ("owner_player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "game_events_room_id_idx" ON "game_events" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "game_events_game_id_idx" ON "game_events" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_events_created_at_idx" ON "game_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "games_room_id_uidx" ON "games" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "games_room_id_idx" ON "games" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "games_public_id_uidx" ON "games" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "room_players_room_id_idx" ON "room_players" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_players_player_id_idx" ON "room_players" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_players_room_id_player_id_uidx" ON "room_players" USING btree ("room_id","player_id");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rooms_owner_player_id_idx" ON "rooms" USING btree ("owner_player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_public_id_uidx" ON "rooms" USING btree ("public_id");