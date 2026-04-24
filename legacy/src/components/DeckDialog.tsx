import React, { useState, useEffect } from 'react';
import { createDeck } from '../hooks/useGameLogic';
import { Card } from './CardContent';
import "../css/DeckDialog.css";
import CardContent from './CardContent';

interface DeckDialogProps {
  isOpen: boolean;
  onClose: () => void;
}


const DeckDialog: React.FC<DeckDialogProps> = ({ isOpen, onClose }) => {
  const [deck, setDeck] = useState<Card[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchDeck = async () => {
        const deck = await createDeck();
  
        // ability.nameでソートする
        const sortedDeck = deck.sort((a: Card, b: Card) => {
          if (a.ability && b.ability) {
            return a.ability.name.localeCompare(b.ability.name);
          } else if (a.ability) {
            return -1; // aにabilityがあるがbにはない場合、aを前に
          } else if (b.ability) {
            return 1;  // bにabilityがあるがaにはない場合、bを前に
          } else {
            return 0;  // 両方abilityがない場合、並び替えなし
          }
        });
  
        setDeck(sortedDeck);
      };
      fetchDeck();
    }
  }, [isOpen]);
  

  if (!isOpen) {
    return null; // ダイアログが閉じている場合は何も表示しない
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>Deck Information</h2>
        {/* デッキを一覧表示する */}
        <ul className="deck-list">
          {deck.map((card) => (
            <li key={card.id} className='deckCard'>
              <CardContent card={card}/>
            </li>
          ))}
        </ul>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default DeckDialog;
