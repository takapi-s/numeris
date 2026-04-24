import Papa, { type ParseResult } from "papaparse";
import type { Ability, Card } from "./types";

async function loadAbilitiesFromCSV(filePath: string): Promise<Ability[]> {
  try {
    const response = await fetch(filePath);
    const csv = await response.text();

    return await new Promise((resolve, reject) => {
      Papa.parse(csv, {
        header: true,
        dynamicTyping: true,
        complete: (result: ParseResult<Record<string, unknown>>) => {
          if (result.errors.length) {
            reject(result.errors);
            return;
          }
          const abilities = (result.data as Array<Record<string, unknown>>).map((row) => ({
            name: String(row.name ?? ""),
            title: String(row.title ?? ""),
            playAbility: row.playAbility ? String(row.playAbility) : undefined,
            traitAbility: row.traitAbility ? String(row.traitAbility) : undefined,
            number: Number(row.number ?? 0),
          })) satisfies Ability[];
          resolve(abilities);
        },
        error: (error: Error) => reject(error),
      });
    });
  } catch (error) {
    console.error("Failed to load abilities from CSV:", error);
    return [];
  }
}

export function shuffle<T>(array: T[]) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

export async function createDeck() {
  const colors = ["red", "green", "blue"];
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const deck: Card[] = [];

  let id = 0;
  for (const color of colors) {
    for (let i = 0; i < 2; i++) {
      for (const number of numbers) {
        deck.push({ id: id++, color, number });
      }
    }
  }

  const seededDeck = shuffle(deck);
  const abilities = await loadAbilitiesFromCSV("/decks/NormalDeck.csv");

  let j = 0;
  for (const ability of abilities) {
    for (let i = 0; i < ability.number; i++) {
      if (!seededDeck[j]) break;
      seededDeck[j] = { ...seededDeck[j], ability };
      j += 1;
    }
  }

  return shuffle(seededDeck);
}

