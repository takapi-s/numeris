import React, { useEffect, useState } from 'react';
import { database } from '../firebaseConfig';
import { ref, update, onValue, get } from 'firebase/database';
import { useLocation, useParams } from 'react-router-dom';
import Papa from 'papaparse';

type Card = {
  color: string;
  number: number;
  ability?: Ability;
};

type Ability = {
  name: string;
  title: string;
  description: string;
  number: number;
};

const loadAbilitiesFromCSV = async (csvFilePath: string): Promise<Ability[]> => {
  return new Promise<Ability[]>((resolve, reject) => {
    fetch(csvFilePath)
      .then((response) => {
        if (!response.ok) {
          // ファイルが見つからない、またはアクセスに失敗した場合
          throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then((csvData) => {
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true, // 空行をスキップ
          complete: (results) => {
            const abilities: Ability[] = results.data.map((row: any) => ({
              name: row.name?.trim() || null,
              title: row.title?.trim() || null,
              description: row.description?.trim() || null,
              number: isNaN(parseInt(row.number, 10)) ? 0 : parseInt(row.number, 10),
            }));
            resolve(abilities);
          },
          error: (error: Error) => reject(error),
        });
      })
      .catch((error: Error) => {
        // Fetchやパース中にエラーが発生した場合
        console.error(`Error loading abilities from CSV: ${error.message}`);
        reject(new Error(`Error loading abilities from CSV: ${error.message}`));
      });
  });
};



// デッキ作成関数
const createDeck = async () => {
  const colors = ['red', 'yellow', 'blue'];
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const deck: Card[] = [];

  for (let color of colors) {
    for (let i = 0; i < 2; i++) { // 2回繰り返すループ    
      for (let number of numbers) {
        deck.push({ color, number });
      }
    }
  }


  loadAbilitiesFromCSV('../../assets/decks/NormalDecks.csv').then((abilities) => {
    console.log(abilities); // ここで出力を確認
  });
  
  const abilities = await loadAbilitiesFromCSV('../../assets/decks/NormalDecks.csv'); // CSVのパスを指定
  
  // 通常カードにアビリティを付与
  abilities.forEach((ability) => {
    for (let i = 0; i < ability.number; i++) {
      // ランダムなカードにアビリティを付与
      const randomIndex = Math.floor(Math.random() * deck.length);
      deck[randomIndex].ability = ability;
    }
  });

  return shuffle(deck);
};

// シャッフル関数
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// ゲームの初期化関数
const initializeGame = async (roomId: string, owner: string) => {
  const roomRef = ref(database, `rooms/${roomId}/players`);

  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    console.error('Room data does not exist.');
    return;
  }

  const data = snapshot.val();
  const deck = await createDeck();

  const inRoomPlayers = Object.keys(data).filter(
    (player) => data[player].inRoom === true
  );

  const shuffledTurnOrder = shuffle([...inRoomPlayers]);
  const updates: Record<string, any> = {};

  let deckIndex = 0;

  shuffledTurnOrder.forEach((player) => {
    const playerHand = deck.slice(deckIndex, deckIndex + 7);
    updates[`rooms/${roomId}/players/${player}/hand`] = playerHand;
    deckIndex += 7;
  });

  const initialCard = deck[deckIndex];
  deckIndex += 1;

  updates[`rooms/${roomId}/deck`] = deck.slice(deckIndex);
  updates[`rooms/${roomId}/stageCard`] = initialCard;
  updates[`rooms/${roomId}/discardPile`] = [];
  updates[`rooms/${roomId}/route`] = shuffledTurnOrder;
  updates[`rooms/${roomId}/currentTurn`] = shuffledTurnOrder[0]; // 最初のプレイヤーを設定
  updates[`rooms/${roomId}/gameStatus`] = 'initialized';

  await update(ref(database), updates);
};

// ゲームコンポーネント
const Game: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [owner, setOwner] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(location.state?.currentPlayer || null);
  const [hand, setHand] = useState<Card[]>([]);
  const [opponentHands, setOpponentHands] = useState<Record<string, number>>({});
  const [deckCount, setDeckCount] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [stageCard, setStageCard] = useState<Card | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null); // 現在のターンのプレイヤー

  useEffect(() => {
    if (!id) return;

    const roomRef = ref(database, `rooms/${id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoute(data.route || []);
        setOwner(data.owner);
        setGameStatus(data.gameStatus);
        setStageCard(data.stageCard || null);
        setDiscardPile(data.discardPile || []);
        setCurrentTurn(data.currentTurn || null); // 現在のターンのプレイヤーを設定
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || !currentPlayer) return;

    const roomRef = ref(database, `rooms/${id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.players[currentPlayer]) {
          setHand(data.players[currentPlayer].hand || []);
        }

        const opponentData: Record<string, number> = {};
        route.forEach((player) => {
          if (player !== currentPlayer && data.players[player]) {
            opponentData[player] = data.players[player].hand ? data.players[player].hand.length : 0;
          }
        });

        setOpponentHands(opponentData);
        setDeckCount(data.deck ? data.deck.length : 0);
      }
    });

    return () => unsubscribe();
  }, [id, currentPlayer, route]);

  useEffect(() => {
    if (currentPlayer && owner === currentPlayer && gameStatus !== 'initialized') {
      initializeGame(id!, owner);
    }
  }, [currentPlayer, owner, gameStatus, id]);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    } else {
      if (currentPlayer === currentTurn) {
        drawCard();
      }
    }
  }, [timer, currentPlayer, currentTurn]);

  useEffect(() => {
    // ターンが切り替わった際にタイマーをリセット
    setTimer(20);
  }, [currentTurn]);

  const playCard = (card: Card) => {
    if (currentPlayer !== currentTurn) {
      // 自分のターンでなければカードを出せない
      alert("It's not your turn!");
      return;
    }

    if (stageCard && (card.color === stageCard.color || card.number === stageCard.number)) {
      const updates: Record<string, any> = {};
      updates[`rooms/${id}/stageCard`] = card;
      updates[`rooms/${id}/players/${currentPlayer}/hand`] = hand.filter(
        (c) => !(c.color === card.color && c.number === card.number)
      );
      updates[`rooms/${id}/discardPile`] = [...discardPile, stageCard];

      // 次のプレイヤーにターンを移動
      const nextPlayerIndex = (route.indexOf(currentTurn!) + 1) % route.length;
      updates[`rooms/${id}/currentTurn`] = route[nextPlayerIndex];

      update(ref(database), updates);
      setTimer(20); // タイマーをリセット
    }
  };

  const drawCard = async () => {
    if (currentPlayer !== currentTurn) return;

    const roomRef = ref(database, `rooms/${id}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();

    if (!data) return;

    let newDeck = [...data.deck];
    const drawnCard = newDeck.pop();

    const updates: Record<string, any> = {};
    updates[`rooms/${id}/players/${currentPlayer}/hand`] = [
      ...hand,
      drawnCard,
    ];
    updates[`rooms/${id}/deck`] = newDeck;

    // 次のプレイヤーにターンを移動
    const nextPlayerIndex = (route.indexOf(currentTurn!) + 1) % route.length;
    updates[`rooms/${id}/currentTurn`] = route[nextPlayerIndex];

    await update(ref(database), updates);

    setDeckCount(newDeck.length);

    // ドロー後にデッキが0枚になった場合に墓地をシャッフルして新しいデッキを作成
    if (newDeck.length === 0 && discardPile.length > 0) {
      newDeck = shuffle([...discardPile]);
      updates[`rooms/${id}/deck`] = newDeck;
      updates[`rooms/${id}/discardPile`] = [];
      await update(ref(database), updates);
      setDeckCount(newDeck.length);
      setDiscardPile([]);
    }

    setTimer(20); // タイマーをリセット
  };

  return (
    <div className="game-container">
      <h1>Game Room {id}</h1>
      <p>Current Stage Card: {stageCard ? `${stageCard.color} - ${stageCard.number}` : "None"}</p>
      <p>Your Hand:</p>
      <ul>
        {hand.map((card, index) => (
          <li key={index}>
            <button onClick={() => playCard(card)} disabled={currentPlayer !== currentTurn}>
              {card.color} - {card.number} {card.ability?.name && `(${card.ability.name})`}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={drawCard} disabled={currentPlayer !== currentTurn}>
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
      <p>Discard Pile: {discardPile.length} cards</p> {/* 墓地のカード数を表示 */}
      <p>Time Remaining: {timer} seconds</p>
    </div>
  );
};

export default Game;
