// src/components/CardContent.tsx
import React from 'react';
import "../css/CardContent.css"



export type Card = {
  id: number;
  color: string;
  number: number;
  ability?: Ability;
};

export type Ability = {
  name: string;
  title: string;
  playAbility?: string;
  traitAbility?: string;
  number: number;
};


interface CardContentProps {
  card: Card | null; // cardはnullも許容する
}

const CardContent: React.FC<CardContentProps> = ({ card }) => {
  if (!card) {
    return null; // cardがnullのとき、何も表示しない
  }


  return (
    <div className={`card-content ${card.color || ''}`}>
      <img src={`${process.env.PUBLIC_URL}/numbers/${card.number}.png`} className='card-number' />
      <img src={`${process.env.PUBLIC_URL}/ability_icon/${card.ability?.name}.png`} alt={`Card image for ${card.number}`} className="card-image" />
    </div>
  );
};

export default CardContent;
