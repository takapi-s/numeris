import React from "react";
import { useLocation, useParams } from "react-router-dom";
import useGameLogic from "../hooks/useGameLogic";

const Game: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const currentPlayer = location.state?.currentPlayer || null;

  const {
    hand,
    opponentHands,
    deckCount,
    gameStatus,
    route,
    stageCard,
    timer,
    discardPile,
    currentTurn,
    playCard,
    drawCard,
    passAvailable,
    passTurn,
    isPlayable, // 新たに取得
    selectMode,
    toggleCardSelection,
    selectedCards,
    hasDrawn,
    playFlag

  } = useGameLogic(id, currentPlayer);


  
  return (
    <div className="game-container">
      <h1>Game Room {id}</h1>
      <p>
        Current Stage Card: {stageCard ? `${stageCard.color} - ${stageCard.number}` : "None"}
        {stageCard?.ability && (
          <span>
            <br />
            Ability: {stageCard.ability.title}
            {stageCard.ability.playAbility && ` - ${stageCard.ability.playAbility}`}
            {stageCard.ability.traitAbility && ` - ${stageCard.ability.traitAbility}`}
          </span>
        )}
      </p>

      <p>Your Hand:</p>
<ul>
  {hand.map((card) => (
    <li key={card.id}>
      {selectMode ? (
        // 選択モード時の表示
        <button
          onClick={() => toggleCardSelection(card)}
          style={{
            backgroundColor: selectedCards.some((c) => c.id === card.id)
              ? "lightgreen"
              : "white",
          }}
        >
          {card.color} - {card.number} {card.ability?.name && `(${card.ability.name})`}
        </button>
      ) : (
        // 通常時の表示
        <button
          onClick={() => playCard(card)}
          disabled={
            (currentPlayer !== currentTurn || !isPlayable(card, stageCard)) || playFlag
          }
        >
          id:{card.id} - {card.color} - {card.number} {card.ability?.name && `(${card.ability.name})`}
        </button>
      )}
    </li>
  ))}
</ul>

      <button onClick={drawCard} disabled={currentPlayer !== currentTurn || hasDrawn}>
        Draw from Deck
      </button>
      {passAvailable && (
        <button onClick={passTurn} disabled={currentPlayer !== currentTurn}>
          Pass
        </button>
      )}
      <p>Opponent Hands:</p>
      <ul>
        {Object.keys(opponentHands).map((player, index) => (
          <li key={index}>
            {player}: {opponentHands[player]} cards
          </li>
        ))}
      </ul>
      <p>Remaining Deck: {deckCount} cards</p>
      <p>Discard Pile: {discardPile.length} cards</p>
      <p>Time Remaining: {currentPlayer === currentTurn ? `${timer} seconds` : "Waiting for your turn"}</p>
    </div>
  );
};

export default Game;

