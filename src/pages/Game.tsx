//pages/Game.tsx
import React from "react";
import { useLocation, useParams } from "react-router-dom";
import useGameLogic from "../hooks/useGameLogic";
import "../css/Game.css";
import CardButton from "../components/CardButton";
import StageCard from "../components/StageCard";
import "../css/OpponentHand.css"

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
      <div className="opponentHand">
        <ul
          className={
            Object.keys(opponentHands).length === 1
              ? "position-one"
              : Object.keys(opponentHands).length === 2
                ? "position-two"
                : Object.keys(opponentHands).length === 3
                  ? "position-three"
                  : Object.keys(opponentHands).length === 4
                    ? "position-four"
                    : "position-default"
          }
        >
          {Object.keys(opponentHands).map((player, index) => (
            <li key={index}>
              <span className="handNum">{opponentHands[player]}</span>
              <div className="opponentHandContainer">
                {Array.from({ length: opponentHands[player] }).map((_, imgIndex) => (
                  <img
                    key={imgIndex}
                    className="backcard"
                    src={`${process.env.PUBLIC_URL}/card_graphic/backcard.png`}
                    alt="Card"
                    style={{ width: '20px', height: '30px', marginLeft: '2px' }}
                  />
                ))}
              </div>

            </li>
          ))}
        </ul>

      </div>










      {/* <p className="Deck Count">Remaining Deck: {deckCount} cards</p> */}
      <div className="pile">
        <p>Discard Pile: {discardPile.length} cards</p>
      </div>

      <button onClick={drawCard} disabled={currentPlayer !== currentTurn || hasDrawn}
        className="Deck"
      >
        {deckCount}
      </button>

      <button onClick={passTurn} disabled={currentPlayer !== currentTurn || !hasDrawn} className="passButton">
        Pass
      </button>

      <div className="StageCard">

        <StageCard card={stageCard} />

      </div>

      <div className="timer">
        <p>Time Remaining: {currentPlayer === currentTurn ? `${timer} seconds` : "Waiting for your turn"}</p>
      </div>
      <div className="myHand">
        <ul>
          {hand.map((card, index) => (
            <CardButton
              key={card.id}
              card={card}
              selectMode={selectMode}
              selectedCards={selectedCards}
              toggleCardSelection={toggleCardSelection}
              playCard={playCard}
              currentPlayer={currentPlayer}
              currentTurn={currentTurn}
              isPlayable={isPlayable}
              stageCard={stageCard}
              playFlag={playFlag}
              index={index}
              totalCards={hand.length}
            />
          ))}
        </ul>

      </div>
    </div>
  );
};

export default Game;

