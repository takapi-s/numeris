//pages/Game.tsx
import React from "react";
import { useLocation, useParams } from "react-router-dom";
import useGameLogic from "../hooks/useGameLogic";
import "../css/Game.css"
import "../css/CardStyle.css"

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
      <h1>{id}</h1>
      <p
        className={`stage-card ${stageCard?.color || ''} ${stageCard?.ability?.name || ''}`}
      >
        {stageCard ? `${stageCard.color} - ${stageCard.number}` : "None"}
      </p>

      <button onClick={drawCard} disabled={currentPlayer !== currentTurn || hasDrawn}>
        Draw from Deck
      </button>

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
      {passAvailable && (
        <button onClick={passTurn} disabled={currentPlayer !== currentTurn}>
          Pass
        </button>
      )}
      <div className="Stage">
        <p>Time Remaining: {currentPlayer === currentTurn ? `${timer} seconds` : "Waiting for your turn"}</p>
      </div>
      <div className="myHand">
        <ul>
          {hand.map((card) => (
            <li key={card.id}>
              {selectMode ? (
                // 選択モード時の表示
                <button
                  onClick={() => toggleCardSelection(card)}
                  className={`card-button ${selectedCards.some((c) => c.id === card.id) ? "selected" : ""}`}
                  style={{
                    backgroundColor: selectedCards.some((c) => c.id === card.id)
                      ? "lightgreen"
                      : "white",
                  }}
                >
                  {card.number}
                </button>
              ) : (
                // 通常時の表示
                <button
                  onClick={() => playCard(card)}
                  className={`card-button ${card.color} ${card.ability?.name ? card.ability.name : ''}`}
                  disabled={
                    (currentPlayer !== currentTurn || !isPlayable(card, stageCard)) || playFlag
                  }
                >
                  {card.number}
                </button>

              )}
            </li>
          ))}

        </ul>
      </div>
    </div>
  );
};

export default Game;

