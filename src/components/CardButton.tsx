import React from 'react';
import "../css/CardStyle.css";

export type Card = {
  id: number;
  color: string;
  number: number;
  ability?: Ability;
  URL?: String;
};

export type Ability = {
  name: string;
  title: string;
  playAbility?: string;
  traitAbility?: string;
  number: number;
};



type CardButtonProps = {
  card: Card;
  selectMode: boolean;
  selectedCards: Card[];
  toggleCardSelection: (card: Card) => void;
  playCard: (card: Card) => void;
  currentPlayer: string;
  currentTurn: string | null;
  isPlayable: (card: Card, stageCard: Card) => boolean;
  stageCard: Card | null;
  playFlag: boolean;
  index: number;
  totalCards: number;
};

const CardButton: React.FC<CardButtonProps> = ({
  card,
  selectMode,
  selectedCards,
  toggleCardSelection,
  playCard,
  currentPlayer,
  currentTurn,
  isPlayable,
  stageCard,
  playFlag,
  index,
  totalCards
}) => {

  const handleMouseOver = (index: number) => {
    const maxslide = -50;
    const cards = document.querySelectorAll('.myHand ul li');
    cards.forEach((card, i) => {
      const distance = index - i;
      const overlapAmount = maxslide / distance; // 重なりの量を設定（必要に応じて調整）
      (card as HTMLElement).style.transform = `translateX(${overlapAmount}%)`; // カードを左にずらして重なりを増やす
    });
  };

  const handleMouseOut = () => {
    const cards = document.querySelectorAll('.myHand ul li');
    cards.forEach((card) => {
      (card as HTMLElement).style.transform = 'translateX(0)'; // 元の位置に戻す
    });
  };

  return (
    <li key={card.id}>
      <button
        onMouseOver={() => handleMouseOver(index)} // ホバー時に距離を基に計算
        onMouseOut={handleMouseOut}
        onClick={() => selectMode ? toggleCardSelection(card) : card && playCard(card)}
        className={
          `card-button ${card?.color || ''} 
      ${card?.ability?.name || ''} 
      ${selectMode ? 'select-mode' : ''} 
      ${selectedCards.some((c) => c.id === card.id) ? 'selected' : ''} 
      ${(currentPlayer === currentTurn && card && stageCard && isPlayable(card, stageCard) && !playFlag) ? 'hover-effect' : ''} 
      ${(!selectMode && (!card || !stageCard || !isPlayable(card, stageCard) || playFlag)) ? 'inactive' : ''}
      ${currentPlayer !== currentTurn ? 'not-your-turn' : ''}`
        }
        disabled={
          !selectMode && (
            currentPlayer !== currentTurn ||
            !(card && stageCard && isPlayable(card, stageCard)) ||
            playFlag
          )
        }
      >
        <div className="card-content">
          <img src={`${process.env.PUBLIC_URL}/numbers/${card.number}.png`} className='card-number' />

          <img src={`${process.env.PUBLIC_URL}/ability_icon/${card.ability?.name}.png`} alt={`Card image for ${card.number}`} className="card-image" />
        </div>
      </button>
    </li>



  );
};

export default CardButton;

