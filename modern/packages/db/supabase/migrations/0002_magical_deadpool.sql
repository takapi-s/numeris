CREATE TYPE "public"."card_color" AS ENUM('red', 'green', 'blue', 'yellow');--> statement-breakpoint
CREATE TABLE "card_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"color" "card_color" NOT NULL,
	"number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "deck_template_abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_template_id" uuid NOT NULL,
	"ability_name" text NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_template_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_template_id" uuid NOT NULL,
	"card_template_id" uuid NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deck_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "deck_template_abilities" ADD CONSTRAINT "deck_template_abilities_deck_template_id_deck_templates_id_fk" FOREIGN KEY ("deck_template_id") REFERENCES "public"."deck_templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deck_template_abilities" ADD CONSTRAINT "deck_template_abilities_ability_name_abilities_name_fk" FOREIGN KEY ("ability_name") REFERENCES "public"."abilities"("name") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deck_template_cards" ADD CONSTRAINT "deck_template_cards_deck_template_id_deck_templates_id_fk" FOREIGN KEY ("deck_template_id") REFERENCES "public"."deck_templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deck_template_cards" ADD CONSTRAINT "deck_template_cards_card_template_id_card_templates_id_fk" FOREIGN KEY ("card_template_id") REFERENCES "public"."card_templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "deck_template_abilities_deck_ability_uidx" ON "deck_template_abilities" USING btree ("deck_template_id","ability_name");--> statement-breakpoint
CREATE UNIQUE INDEX "deck_template_cards_deck_card_uidx" ON "deck_template_cards" USING btree ("deck_template_id","card_template_id");--> statement-breakpoint
ALTER TABLE "abilities" DROP COLUMN "deck_count";