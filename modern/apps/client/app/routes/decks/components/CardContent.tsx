import type { Ability, Card } from "../lib/types";
import "../styles/card-content.css";

export type { Card, Ability };

export default function CardContent({ card }: { card: Card | null }) {
  if (!card) return null;

  return (
    <div className={`card-content ${card.color || ""}`}>
      <img src={`/numbers/${card.number}.png`} className="card-number" alt={`${card.number}`} />
      <img
        src={`/ability_icon/${card.ability?.name}.png`}
        alt={`Ability ${card.ability?.name ?? "none"}`}
        className="card-image"
      />
    </div>
  );
}

