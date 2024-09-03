import { useEffect, useState } from "react";
import { database } from "../firebaseConfig";
import { ref, update, onValue, get } from "firebase/database";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";
import { triggerPlayAbility } from "./abilities";
import { Card, Ability } from "../components/CardButton";


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

export const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const createDeck = async () => {
  const colors = ["red", "green", "blue"];
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const deck: Card[] = [];


  let id = 0;
  for (let color of colors) {
    for (let i = 0; i < 2; i++) { // ここで2セット作る
      for (let number of numbers) {
        deck.push({ id: id++, color, number });
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

  // ルーム内にいる全プレイヤーを取得
  const inRoomPlayers = Object.keys(data);

  // プレイヤーリストをシャッフル
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
  updates[`rooms/${roomId}/gameState`] = "initialized";

  await update(ref(database), updates);
};

const isPlayable = (card: Card, stageCard: Card | null): boolean => {
  if (!stageCard || card.ability?.name === "reaper") return false; // ステージカードがない場合はプレイ不可

  if (card.ability?.name === "curse") {
    // "curse"の場合は数値が一致しないとプレイ不可
    return card.number === stageCard.number;
  }

  return (
    card.color === stageCard.color ||
    card.number === stageCard.number ||
    card.ability?.name === "rainbow" // 何かしらの特殊能力を持つ場合
  );
};

const useGameLogic = (id: string | undefined, currentPlayer: string | null) => {
  const navigate = useNavigate();
  const [hand, setHand] = useState<Card[]>([]);
  const [opponentHands, setOpponentHands] = useState<Record<string, number>>(
    {}
  );
  const [deckCount, setDeckCount] = useState<number>(0);
  const [gameState, setGameState] = useState<string | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [stageCard, setStageCard] = useState<Card | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [owner, setOwner] = useState<string | null>(null);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [passAvailable, setPassAvailable] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false); // ドロー状態の管理
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectN, setSelectN] = useState<number>(0);
  const [playFlag, setplayFlag] = useState(true);

  useEffect(() => {
    if (selectedCards.length === selectN && selectN !== 0) {
      // ここに処理を追加します。例としてコンソールにメッセージを表示します。
      const updates: Record<string, any> = {};
      updates[`rooms/${id}/players/${currentPlayer}/selectedCards`] =
        selectedCards;
      updates[`rooms/${id}/players/${currentPlayer}/selectMode`] = false;

      update(ref(database), updates);
      setSelectedCards([]);
      setSelectMode(false);
    }
  }, [selectedCards, selectN, id, currentPlayer]);

  useEffect(() => {
    //selectModeがtrueになるとselectNを読み取り設定
    if (id && currentPlayer) {
      const roomRef = ref(
        database,
        `rooms/${id}/players/${currentPlayer}/selectMode`
      );
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data !== null) {
          setSelectMode(data);

          if (data === true) {
            const selectNRef = ref(
              database,
              `rooms/${id}/players/${currentPlayer}/selectN`
            );
            onValue(selectNRef, (selectNSnapshot) => {
              const selectN = selectNSnapshot.val();
              if (selectN !== null) {
                setSelectN(selectN);
              }
            });
          }
        }
      });
      return () => unsubscribe();
    }
  }, [id, currentPlayer]);


  const toggleCardSelection = (card: Card) => {
    setSelectedCards((prevSelectedCards) => {
      if (
        prevSelectedCards.some((selectedCard) => selectedCard.id === card.id)
      ) {
        // 既に選択されている場合はリストから削除
        return prevSelectedCards.filter(
          (selectedCard) => selectedCard.id !== card.id
        );
      } else {
        // 選択されていない場合はリストに追加
        return [...prevSelectedCards, card];
      }
    });
  };

  useEffect(() => {
    if (!id) return;
    const roomRef = ref(database, `rooms/${id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoute(data.route || []);
        setOwner(data.owner);
        setGameState(data.gameState);
        setStageCard(data.stageCard || null);
        setDiscardPile(data.discardPile || []);
        setCurrentTurn(data.currentTurn || null);
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id) return;
  
    const deckRef = ref(database, `rooms/${id}/deck`);
    const unsubscribe = onValue(deckRef, (snapshot) => {
      const newDeck = snapshot.val() || [];
      setDeckCount(newDeck.length);

    });
  
    return () => unsubscribe();
  }, [id, discardPile]);
  

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
    console.log("iiinitial");
    console.log(currentPlayer);
    console.log(owner);
    if (currentPlayer && owner === currentPlayer) {
      console.log("initial");
      initializeGame(id!, owner);
    }
  }, [currentPlayer, owner, gameState, id]);

  useEffect(() => {
    // selectModeがtrueになった場合、タイマーを停止
    if (selectMode) {
      return; // タイマーを停止するため、何もせずにreturn
    }

    if (currentPlayer === currentTurn && timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    } else if (timer === 0 && currentPlayer === currentTurn) {
      drawCard();
      passTurn();
    }
  }, [timer, currentPlayer, currentTurn, selectMode]);

  useEffect(() => {
    if (currentPlayer === currentTurn) {
      setTimer(20);
      setHasDrawn(false);
      setplayFlag(false);
      setPassAvailable(false); // パスの状態をリセット
    }
  }, [currentTurn]);

  useEffect(() => {
    if (gameState === "draw" || gameState === "win") {

      navigate(`/numeris/rooms/${id}`, {
        state: { playerId: currentPlayer},
      });
    }
  }, [gameState, navigate, currentPlayer, id]);

  const playCard = async (card: Card) => {
    setplayFlag(true);

    if (currentPlayer !== currentTurn) {
      alert("It's not your turn!");
      return;
    }

    const updates: Record<string, any> = {};
    //ステージカードに移動
    updates[`rooms/${id}/stageCard`] = card;

    // カードのIDを使用して正確に1枚を削除
    const updatedHand = hand.filter((c) => c.id !== card.id);
    updates[`rooms/${id}/players/${currentPlayer}/hand`] = updatedHand;
    updates[`rooms/${id}/discardPile`] = [...discardPile, stageCard];

    // Firebaseにアップデートを反映
    await update(ref(database), updates);

    //アビリティを発動
    await triggerPlayAbility(card, currentPlayer!, id!, setTimer);

    // 手札が0枚になった場合、勝利としてゲーム終了
    // Firebaseから最新の手札を再取得
    // プレイヤー全員の手札をチェック

    // 手札が0枚になった場合、勝利としてゲーム終了

    setTimeout(() => {
      console.log("tim");
    }, 3000); // 3
    
    const roomRef = ref(database, `rooms/${id}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();

    let winner = null;
    const players = data.players;
    for (const playerId of route) {
      // route内のプレイヤーのみ確認
      const hand = players[playerId].hand || [];
      if (hand.length === 0) {
        winner = playerId;
        break;
      }
    }

    if (winner) {
      // 勝者が見つかった場合、ゲームを終了
      updates[`rooms/${id}/gameState`] = "win";
      updates[`rooms/${id}/winner`] = winner; // 勝者の情報を保存
      await update(ref(database), updates);
    } else {
      // 次のターンへ
      await passTurn();
    }

    setTimer(20);
  };

  const drawCard = async () => {
    if (hasDrawn) return;

    if (currentPlayer !== currentTurn) return;

    const roomRef = ref(database, `rooms/${id}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();

    if (!data) return;

    let newDeck = [...(data.deck || [])];

    // デッキが空である場合の処理
    if (newDeck.length === 0) {
      if (discardPile.length > 0) {
        newDeck = shuffle([...discardPile]);
        await update(ref(database), {
          [`rooms/${id}/deck`]: newDeck,
          [`rooms/${id}/discardPile`]: [],
        });
        setDeckCount(newDeck.length);
        setDiscardPile([]);
      } else {
        await update(ref(database), {
          [`rooms/${id}/gameState`]: "draw",
        });
        return;
      }
    }

    const drawnCard = newDeck.pop();

    // drawnCardがundefinedである場合は処理を中断
    if (!drawnCard) return;

    const updates: Record<string, any> = {};
    updates[`rooms/${id}/players/${currentPlayer}/hand`] = [...hand, drawnCard];
    updates[`rooms/${id}/deck`] = newDeck;

    await update(ref(database), updates);

    setDeckCount(newDeck.length);
    setHasDrawn(true);
    setPassAvailable(true); // パスボタンを有効化
  };

  const passTurn = async () => {
    // 最新の currentPlayer を取得
    const currentPlayerSnapshot = await get(
      ref(database, `rooms/${id}/currentTurn`)
    );
    const currentPlayer = currentPlayerSnapshot.val();
    
    const routeSnapshot = await get(ref(database, `rooms/${id}/route`));
    const _route = routeSnapshot.val()
    setRoute(_route);

    // 次のプレイヤーのインデックスを計算
    const nextPlayerIndex = (route.indexOf(currentPlayer!) + 1) % route.length;
    // 更新する内容を準備
    const updates: Record<string, any> = {};
    updates[`rooms/${id}/currentTurn`] = route[nextPlayerIndex];

    // Firebaseのデータを更新
    await update(ref(database), updates);

    // タイマーをリセットして、パスボタンを無効化
    setTimer(20);
    setPassAvailable(false); // パスボタンを無効化
  };

  return {
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
    passAvailable, // パスボタンの状態
    passTurn, // パス関数
    hasDrawn, // ドロー済みかどうかの状態
    isPlayable,
    selectMode,
    toggleCardSelection,
    selectedCards,
    playFlag,
  };
};

export default useGameLogic;
