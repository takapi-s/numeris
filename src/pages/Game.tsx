//pages/Game.tsx
import { useLocation, useParams } from "react-router-dom";
import useGameLogic from "../hooks/useGameLogic";
import "../css/Game.css";
import CardButton from "../components/CardButton";
import StageCard from "../components/StageCard";
import "../css/OpponentHand.css"
import React, { useState, useEffect } from "react";

const Game: React.FC = () => {
  const { roomID } = useParams<{ roomID: string }>();
  const location = useLocation();
  const currentPlayer = location.state?.currentPlayer || null;

  const {
    hand,
    opponentHands,
    deckCount,
    gameState,
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

  } = useGameLogic(roomID, currentPlayer);

  // 自分の順番を基準にしてrouteを回転させる
  const currentIndex = route.indexOf(currentPlayer);
  const rotatedRoute = [
    ...route.slice(currentIndex + 1),
    ...route.slice(0, currentIndex),
  ];


    // 初期の順番を保存するためのステート
    const [initialOrder, setInitialOrder] = useState<string[]>([]);

    // 最初にプレイヤーの順番を設定
    useEffect(() => {
      if (route.length > 0 && initialOrder.length === 0) {
        const currentIndex = route.indexOf(currentPlayer);
        const rotatedRoute = [
          ...route.slice(currentIndex + 1),
          ...route.slice(0, currentIndex),
        ];
        setInitialOrder(rotatedRoute.filter(player => player !== currentPlayer));
      }
    }, [route, currentPlayer, initialOrder]);

  return (
    <div className="game-container">

      <div className="opponentHand">
        <ul
          className={
            rotatedRoute.length === 1
              ? "position-one"
              : rotatedRoute.length === 2
                ? "position-two"
                : rotatedRoute.length === 3
                  ? "position-three"
                  : rotatedRoute.length === 4
                    ? "position-four"
                    : "position-default"
          }
        >
          {rotatedRoute.map((player, index) => (
            player !== currentPlayer && (
              <li key={index} className={`opponent-position-${index}`}>
                <span className="handNum">{player} : {opponentHands[player]}</span>
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
            )
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

