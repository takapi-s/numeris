CREATE TABLE "player_decks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"base_template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_deck_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_deck_id" uuid NOT NULL,
	"card_template_id" uuid NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_deck_abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_deck_id" uuid NOT NULL,
	"ability_name" text NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "selected_deck_id" uuid;--> statement-breakpoint
ALTER TABLE "player_decks" ADD CONSTRAINT "player_decks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_decks" ADD CONSTRAINT "player_decks_base_template_id_deck_templates_id_fk" FOREIGN KEY ("base_template_id") REFERENCES "public"."deck_templates"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_deck_cards" ADD CONSTRAINT "player_deck_cards_player_deck_id_player_decks_id_fk" FOREIGN KEY ("player_deck_id") REFERENCES "public"."player_decks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_deck_cards" ADD CONSTRAINT "player_deck_cards_card_template_id_card_templates_id_fk" FOREIGN KEY ("card_template_id") REFERENCES "public"."card_templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_deck_abilities" ADD CONSTRAINT "player_deck_abilities_player_deck_id_player_decks_id_fk" FOREIGN KEY ("player_deck_id") REFERENCES "public"."player_decks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_deck_abilities" ADD CONSTRAINT "player_deck_abilities_ability_name_abilities_name_fk" FOREIGN KEY ("ability_name") REFERENCES "public"."abilities"("name") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_selected_deck_id_player_decks_id_fk" FOREIGN KEY ("selected_deck_id") REFERENCES "public"."player_decks"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "player_decks_player_id_idx" ON "player_decks" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_decks_player_active_idx" ON "player_decks" USING btree ("player_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "player_deck_cards_deck_card_uidx" ON "player_deck_cards" USING btree ("player_deck_id","card_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_deck_abilities_deck_ability_uidx" ON "player_deck_abilities" USING btree ("player_deck_id","ability_name");--> statement-breakpoint
CREATE INDEX "rooms_selected_deck_id_idx" ON "rooms" USING btree ("selected_deck_id");
