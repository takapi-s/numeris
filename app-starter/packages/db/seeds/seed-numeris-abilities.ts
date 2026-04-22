import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import type { AbilityCanPlayRule, AbilityEffect, TraitEffect } from "../../../apps/client/app/game/abilities/AbilityTypes";

type CsvRow = {
  name: string;
  title: string;
  playAbility: string;
  traitAbility: string;
  number: string;
};

function toInt(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function inferOnPlayEffects(name: string): AbilityEffect[] {
  switch (name) {
    case "skip":
      return [{ type: "skipNext" }];
    case "draw":
      return [{ type: "draw", target: "next", n: 1 }];
    case "reverse":
      return [{ type: "reverseTurnOrder" }];
    case "drawTwoAll":
      return [{ type: "draw", target: "allOpponents", n: 2 }];
    default:
      return [];
  }
}

function inferTraitEffects(name: string, traitText: string): TraitEffect[] {
  if (name === "rainbow" && traitText) {
    return [{ type: "canPlayOverride", value: "always" }];
  }
  return [];
}

function inferCanPlayRule(name: string): AbilityCanPlayRule | null {
  if (name === "reaper") return { type: "never" };
  return null;
}

async function main() {
  const csvPath = path.resolve(__dirname, "../../../apps/client/public/decks/NormalDeck.csv");
  const raw = await readFile(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines.shift();
  if (!header) throw new Error("CSV header missing");
  const cols = header.split(",");
  const idx = (key: string) => cols.indexOf(key);
  const rows: CsvRow[] = lines.map((line) => {
    const parts = line.split(",");
    return {
      name: parts[idx("name")] ?? "",
      title: parts[idx("title")] ?? "",
      playAbility: parts[idx("playAbility")] ?? "",
      traitAbility: parts[idx("traitAbility")] ?? "",
      number: parts[idx("number")] ?? "0",
    };
  });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (set it to your local Supabase postgres connection string)");
  }

  const sql = postgres(databaseUrl);

  try {
    await sql.begin(async (tx) => {
      // Ensure deck template exists
      const deckSlug = "normal";
      const deckName = "Normal";
      const deckTemplateRows =
        await (tx as any)`select id from deck_templates where slug = ${deckSlug} limit 1`;
      const deckTemplateId =
        deckTemplateRows?.[0]?.id ??
        (
          await (tx as any)`
            insert into deck_templates (slug, name, version)
            values (${deckSlug}, ${deckName}, 1)
            on conflict (slug) do update set name = excluded.name
            returning id
          `
        )[0]!.id;

      // Ensure card templates and base deck composition (0:1枚, 1-9:2枚 per color)
      const colors = ["red", "green", "blue", "yellow"] as const;
      for (const color of colors) {
        for (let n = 0; n <= 9; n++) {
          const slug = `${color}_${n}`;
          const cardRows =
            await (tx as any)`select id from card_templates where slug = ${slug} limit 1`;
          const cardTemplateId =
            cardRows?.[0]?.id ??
            (
              await (tx as any)`
                insert into card_templates (slug, color, number)
                values (${slug}, ${color}, ${n})
                on conflict (slug) do update set color = excluded.color, number = excluded.number
                returning id
              `
            )[0]!.id;

          const count = n === 0 ? 1 : 2;
          await (tx as any)`
            insert into deck_template_cards (deck_template_id, card_template_id, count)
            values (${deckTemplateId}, ${cardTemplateId}, ${count})
            on conflict (deck_template_id, card_template_id) do update set count = excluded.count
          `;
        }
      }

      for (const r of rows) {
        const name = r.name.trim();
        if (!name) continue;
        const title = r.title.trim() || name;

        const deckCount = toInt(r.number);
        const onPlayEffects = inferOnPlayEffects(name);
        const traitEffects = inferTraitEffects(name, r.traitAbility.trim());
        const canPlayRule = inferCanPlayRule(name);

        await (tx as any)`
          insert into abilities (name, title, can_play_rule, on_play_effects, trait_effects)
          values (
            ${name},
            ${title},
            ${canPlayRule ? (canPlayRule as any) : null},
            ${onPlayEffects.length ? (onPlayEffects as any) : null},
            ${traitEffects.length ? (traitEffects as any) : null}
          )
          on conflict (name) do update set
            title = excluded.title,
            can_play_rule = excluded.can_play_rule,
            on_play_effects = excluded.on_play_effects,
            trait_effects = excluded.trait_effects
        `;

        // Deck template ability counts belong to the deck, not ability definition
        if (deckCount > 0 && name !== "normal") {
          await (tx as any)`
            insert into deck_template_abilities (deck_template_id, ability_name, count)
            values (${deckTemplateId}, ${name}, ${deckCount})
            on conflict (deck_template_id, ability_name) do update set count = excluded.count
          `;
        }
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded abilities: ${rows.length}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

