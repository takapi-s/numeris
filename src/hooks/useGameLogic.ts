import { useEffect, useState } from "react";
import { database } from "../firebaseConfig";
import { ref, update, onValue, get } from "firebase/database";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";

type Card = {
  color: string;
  number: number;
  ability?: Ability;
};

type Ability = {
  name: string;
  title: string;
  playAbility?: string;
  traitAbility?: string;
  number: number;
};

const loadAbilitiesFromCSV = async (filePath: string): Promise<Ability[]> => {
  try {
    const response = await fetch(`${process.env.PUBLIC_URL}${filePath}`);
    const reader = response.body?.getReader();
    const result = await reader?.read();
    const decoder = new TextDecoder("utf-8");
    const csv = decoder.decode(result?.value);

    return new Promise((resolve, reject) => {
      Papa.parse(csv, {
        header: true,
        dynamicTyping: true,
        complete: (result) => {
          if (result.errors.length) {
            reject(result.errors);
          } else {
            const abilities = result.data.map((row: any) => ({
              name: row.name,
              title: row.title,
              playAbility: row.playAbility,
              traitAbility: row.traitAbility,
              number: row.number,
            })) as Ability[];
            resolve(abilities);
          }
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Failed to load abilities from CSV:", error);
    return [];
  }
};

const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const createDeck = async () => {
  const colors = ["red", "yellow", "blue"];
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const deck: Card[] = [];

  for (let color of colors) {
    for (let i = 0; i < 2; i++) {
      for (let number of numbers) {
        deck.push({ color, number });
      }
    }
  }

  const _deck = shuffle(deck);
  const abilities = await loadAbilitiesFromCSV("/decks/NormalDeck.csv");

  let j = 0;
  abilities.forEach((_ability) => {
    for (let i = 0; i < _ability.number; i++) {
      _deck[j].ability = _ability;
      j += 1;
    }
  });

  return shuffle(_deck);
};

const initializeGame = async (roomId: string, owner: string) => {
  const roomRef = ref(database, `rooms/${roomId}/players`);

  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    console.error("Room data does not exist.");
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
  updates[`rooms/${roomId}/currentTurn`] = shuffledTurnOrder[0];
  updates[`rooms/${roomId}/gameStatus`] = "initialized";

  await update(ref(database), updates);
};

const useGameLogic = (id: string | undefined, currentPlayer: string | null) => {
  const navigate = useNavigate();
  const [hand, setHand] = useState<Card[]>([]);
  const [opponentHands, setOpponentHands] = useState<Record<string, number>>({});
  const [deckCount, setDeckCount] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [stageCard, setStageCard] = useState<Card | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [owner, setOwner] = useState<string | null>(null);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [passAvailable, setPassAvailable] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false); // ドロー状態の管理
  


  const checkForDraw = async () => {
    if (deckCount === 0 && discardPile.length === 0) {
      await update(ref(database), {
        [`rooms/${id}/gameStatus`]: "draw",
      });
    }
  };

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
        setCurrentTurn(data.currentTurn || null);
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
            opponentData[player] = data.players[player].hand
              ? data.players[player].hand.length
              : 0;
          }
        });

        setOpponentHands(opponentData);
        setDeckCount(data.deck ? data.deck.length : 0);
      }
    });

    return () => unsubscribe();
  }, [id, currentPlayer, route]);

  useEffect(() => {
    if (currentPlayer && owner === currentPlayer) {
      initializeGame(id!, owner);
    }
  }, [currentPlayer, owner, gameStatus, id]);

  useEffect(() => {
    if (currentPlayer === currentTurn && timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    } else if (timer === 0 && currentPlayer === currentTurn) {
      drawCard();
      passTurn();
    }
  }, [timer, currentPlayer, currentTurn]);

  useEffect(() => {
    if (currentPlayer === currentTurn) {
      setTimer(20);
      setHasDrawn(false);
      setPassAvailable(false); // パスの状態をリセット
    }
  }, [currentTurn]);


  useEffect(() => {
    if (gameStatus === "draw" || gameStatus === "win") {
      navigate(`/stickpuzzle/room/${id}`, {
        state: { currentPlayer, gameStatus },
      });
    }
  }, [gameStatus, navigate, currentPlayer, id]);

  

  const playCard = (card: Card) => {
    if (currentPlayer !== currentTurn) {
      alert("It's not your turn!");
      return;
    }

    if (
      stageCard &&
      (card.color === stageCard.color || card.number === stageCard.number)
    ) {
      const updates: Record<string, any> = {};
      updates[`rooms/${id}/stageCard`] = card;
      updates[`rooms/${id}/players/${currentPlayer}/hand`] = hand.filter(
        (c) => !(c.color === card.color && c.number === card.number)
      );
      updates[`rooms/${id}/discardPile`] = [...discardPile, stageCard];

      // 手札が0枚になった場合、勝利としてゲーム終了
      const remainingHand = hand.filter(
        (c) => !(c.color === card.color && c.number === card.number)
      );
      if (remainingHand.length === 0) {
        updates[`rooms/${id}/gameStatus`] = "win";
        updates[`rooms/${id}/winner`] = currentPlayer; // 勝者の情報を保存
      } else {
        const nextPlayerIndex = (route.indexOf(currentTurn!) + 1) % route.length;
        updates[`rooms/${id}/currentTurn`] = route[nextPlayerIndex];
      }

      update(ref(database), updates);
      setTimer(20);
    }
  };

  const drawCard = async () => {
    if (hasDrawn) return;
    await checkForDraw();

    if (currentPlayer !== currentTurn) return;

    const roomRef = ref(database, `rooms/${id}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();

    if (!data) return;

    let newDeck = [...data.deck];
    const drawnCard = newDeck.pop();

    const updates: Record<string, any> = {};
    updates[`rooms/${id}/players/${currentPlayer}/hand`] = [...hand, drawnCard];
    updates[`rooms/${id}/deck`] = newDeck;

    await update(ref(database), updates);

    setDeckCount(newDeck.length);

    if (newDeck.length === 0 && discardPile.length > 0) {
      newDeck = shuffle([...discardPile]);
      updates[`rooms/${id}/deck`] = newDeck;
      updates[`rooms/${id}/discardPile`] = [];
      await update(ref(database), updates);
      setDeckCount(newDeck.length);
      setDiscardPile([]);
    }
    setHasDrawn(true); 
    setPassAvailable(true); // パスボタンを有効化
  };

  const passTurn = async () => {
    if (currentPlayer !== currentTurn) return;

    const nextPlayerIndex = (route.indexOf(currentTurn!) + 1) % route.length;

    const updates: Record<string, any> = {};
    updates[`rooms/${id}/currentTurn`] = route[nextPlayerIndex];

    await update(ref(database), updates);

    setTimer(20);
    setPassAvailable(false); // パスボタンを無効化
  };

  return {
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
    passAvailable, // パスボタンの状態
    passTurn, // パス関数
    hasDrawn, // ドロー済みかどうかの状態
  };
};

export default useGameLogic;
