import { useEffect, useMemo, useState } from "react";
import { Link, href } from "react-router";
import CardContent, { type Card } from "./components/CardContent";
import { createDeck } from "./lib/deck";
import type { Route } from "./+types/route";

import "./styles/deck-dialog.css";
import "./styles/card-content.css";

export const meta: Route.MetaFunction = () => [{ title: "Deck" }];

export default function DecksRoute() {
  const [deck, setDeck] = useState<Card[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nextDeck = await createDeck();
      if (cancelled) return;
      setDeck(nextDeck);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedDeck = useMemo(() => {
    const copied = [...deck];
    copied.sort((a, b) => {
      const aName = a.ability?.name ?? "";
      const bName = b.ability?.name ?? "";
      return aName.localeCompare(bName);
    });
    return copied;
  }, [deck]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deck</h1>
        <Link className="text-sm underline" to={href("/")}>
          Homeへ戻る
        </Link>
      </header>

      <div className="dialog-content">
        <h2>Deck Information</h2>
        <ul className="deck-list">
          {sortedDeck.map((card) => (
            <li key={card.id} className="deckCard">
              <CardContent card={card} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

