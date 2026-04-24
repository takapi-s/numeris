import type { Ability, Card } from "../lib/types";

export type { Card, Ability };

export default function CardContent({ card }: { card: Card | null }) {
  if (!card) return null;

  const bg =
    card.color === "red"
      ? 'url("/card_graphic/redcard.png")'
      : card.color === "blue"
        ? 'url("/card_graphic/bluecard.png")'
        : card.color === "green"
          ? 'url("/card_graphic/greencard.png")'
          : 'url("/card_graphic/backcard.png")';

  return (
    <div
      className="relative aspect-[1/1.586] w-full overflow-hidden rounded-2xl ring-1 ring-white/10"
      style={{ backgroundImage: bg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <img
        src={`/numbers/${card.number}.png`}
        className="absolute left-[-6%] top-[-3%] w-[40%] object-contain drop-shadow"
        alt={`${card.number}`}
      />
      <img
        src={`/ability_icon/${card.ability?.name}.png`}
        alt={`Ability ${card.ability?.name ?? "none"}`}
        className="absolute left-[7%] top-[4%] h-[92%]"
      />
    </div>
  );
}

