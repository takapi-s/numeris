CREATE TABLE "abilities" (
	"name" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"can_play_rule" jsonb,
	"on_play_effects" jsonb,
	"trait_effects" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
