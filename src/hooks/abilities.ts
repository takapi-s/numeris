// /hooks/abilities.ts
import { Card, shuffle} from "./useGameLogic";
import { database } from "../firebaseConfig";
import { get, onValue, ref, update } from "firebase/database";
import { reverse } from "dns";
import Room from "../pages/Room";

export const triggerPlayAbility = async (
  card: Card,
  currentPlayer: string,
  roomId: string,
  setTimer: (value: number) => void,
) => {
  if (!card.ability?.playAbility) return;

  // アビリティによる効果を適用
  const abilityName = card.ability.name;
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  const route = data.route;
  const currentTurn = data.currentTurn;
  const nextPlayerIndex = (route.indexOf(currentTurn) + 1) % route.length;
  const nextPlayer = route[nextPlayerIndex];

  switch (abilityName) {
    case "skip":
      await skipNextPlayer(roomId);
      break;
    case "draw":
      console.log("ability:draw");
      await forceDrawCards(roomId, nextPlayer, 1);
      break;
    case "reverse":
      await reverseAbility(roomId, data);
      break;

    case "drawTwoAll":
      await drawTwoAllAbility(roomId, data);
      break;

    case "bomb":
      await forceDrawCards(roomId, currentPlayer, 2);
      break;

    case "forceTrade":
      await forceTradeAbility(roomId, currentPlayer, nextPlayer, data);
      break;

    //Colorselctはボタンを表示する関数を作ってから

    case "swapHands":
      await swapHandsAbility(roomId, data);
      break;

    case "extraTurn":
      await extraTurn(roomId);
      break;

    case "chain":
      await chainAbility(roomId, currentPlayer, card.number, data);
      break;

    case "discard":
      //カードを選択する
      const selectedCards = await selectCardsFromMyHand(roomId, currentPlayer, 1);
      discardAbility(selectedCards, currentPlayer, roomId);
      //カードを捨てる
      break;

    case "opponentDraw":
      await opponentDrawAbility(roomId, currentPlayer, data, 1); 
      break;

    case "giveCard":
      const selectedCardsToGive = await selectCardsFromMyHand(roomId, currentPlayer, 1); // N is the number of cards to give
      await giveCard(roomId, currentPlayer, selectedCardsToGive);    
      break;

    case "copy":
      await copyAbility(roomId, currentPlayer, setTimer);
      break;

    case "lightning":
      await lightningAbility(roomId);
      break;

    case "curse":
      const selectCards =  await selectCardsFromMyHand(roomId, currentPlayer, 1);
      await curseAbility(roomId, currentPlayer, card, selectCards);
      break;
    
    case "Uno":
      await unoAbility(roomId, currentPlayer);
      break;
    
    case "perfect":
      await perfectAbility(roomId, currentPlayer, card);
      break;

    case "refresh":
      await refresh(roomId, currentPlayer);
      break;



    default:
      console.error(`Unknown ability: ${abilityName}`);
  }

  // アビリティ発動後のタイマーリセット
  setTimer(20);
};

//全員か一人かで処理が違うカード選択
//selectModeをtrueに書き換えてfalseになるのを待つ
const selectCardsFromMyHand = async (roomId: string, player: string, N: number): Promise<Card[]> => {
  // プレイヤーの手札を取得
  const handRef = ref(database, `rooms/${roomId}/players/${player}/hand`);
  const handSnapshot = await get(handRef);
  const hand: Card[] = handSnapshot.val() || [];
  
  // 手札が0枚の場合、空の配列を返して終了
  if (hand.length === 0) {
    return [];
  }

  // 手札がNより少ない場合、Nを手札の枚数に制限
  const selectN = Math.min(N, hand.length);

  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${player}/selectMode`] = true;
  updates[`rooms/${roomId}/players/${player}/selectN`] = selectN;
  await update(ref(database), updates);
  
  const playerRef = ref(database, `rooms/${roomId}/players/${player}/selectMode`);

  return new Promise<Card[]>((resolve) => {
    const unsubscribe = onValue(playerRef, async (snapshot) => {
      const selectMode = snapshot.val();
      if (!selectMode) {
        const selectedCardsRef = ref(
          database,
          `rooms/${roomId}/players/${player}/selectedCards`
        );
        const selectedCardsSnapshot = await get(selectedCardsRef);
        const selectedCards: Card[] = selectedCardsSnapshot.val() || [];
        
        // selectMode が false になった場合、selectedCards を resolve で返す
        resolve(selectedCards);
        // リスナーを解除
        unsubscribe();
      }
    });
  });
}




const skipNextPlayer = async (roomId: string) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();
  console.log("ability:skip");

  if (!data) return;
  console.log("ability:skip");

  const route = data.route;
  const currentTurn = data.currentTurn;
  
  const nextPlayerIndex = (route.indexOf(currentTurn) + 1) % route.length;
  const nextPlayer = route[nextPlayerIndex];
  console.log(nextPlayer);



  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/currentTurn`] = nextPlayer;
  await update(ref(database), updates);
};

const forceDrawCards = async (
  roomId: string,
  player: string,
  count: number
) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  let newDeck = [...data.deck];
  let playerHand = [...(data.players[player].hand || [])];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      if (data.discardPile.length > 0) {
        // 捨て札からデッキを再構築してシャッフル
        newDeck = shuffle([...data.discardPile]);
        data.discardPile = []; // 捨て札をクリア
      } else {
        // デッキも捨て札もない場合はドローできない
        break;
      }
    }

    // デッキの最後のカードを取り出し、手札に追加
    const drawnCard = newDeck.pop();
    if (drawnCard) {
      playerHand.push(drawnCard);
    }
  }

  // 更新内容をFirebaseに反映
  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${player}/hand`] = playerHand;
  updates[`rooms/${roomId}/deck`] = newDeck;
  updates[`rooms/${roomId}/discardPile`] = data.discardPile;

  await update(ref(database), updates);
};

const reverseAbility = async (roomId: string, data: any) => {
  const route = [...data.route].reverse();

  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/route`] = route;
  await update(ref(database), updates);
};

const drawTwoAllAbility = async (roomId: string, data: any) => {
  for (const player of data.route) {
    await forceDrawCards(roomId, player, 2);
  }
};

const forceTradeAbility = async (
  roomId: string,
  player1: string,
  player2: string,
  data: any
) => {
  const hand1 = [...(data.players[player1].hand || [])];
  const hand2 = [...(data.players[player2].hand || [])];

  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${player1}/hand`] = hand2;
  updates[`rooms/${roomId}/players/${player2}/hand`] = hand1;

  await update(ref(database), updates);
};


const swapHandsAbility = async (roomId: string, data: any) => {
  const route = data.route;
  const hands = route.map((player: string) => [...(data.players[player].hand || [])]); // 手札がない場合に空配列を設定
  console.log("swaphand");
  console.log(hands)

  const updates: Record<string, any> = {};

  // forループを用いて手札をシフト
  for (let i = 0; i < route.length; i++) {
    const currentPlayer = route[i];
    const nextHand = hands[(i + route.length - 1) % route.length]; // 前のプレイヤーの手札を取得
    console.log(`Player: ${currentPlayer}, Next Hand: ${nextHand}`); // ログ出力で確認
    updates[`rooms/${roomId}/players/${currentPlayer}/hand`] = nextHand;
  }

  await update(ref(database), updates);
};

const extraTurn = async (roomId: string) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  const route = data.route;
  const currentTurn = data.currentTurn;
  const previousPlayerIndex = (route.indexOf(currentTurn) - 1 + route.length) % route.length;
  console.log("ext")
  console.log(route[previousPlayerIndex]);


  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/currentTurn`] = route[previousPlayerIndex];
  await update(ref(database), updates);
};

const chainAbility = async (
  roomId: string,
  player: string,
  number: number,
  data: any
) => {
  let playerHand = [...data.players[player].hand];
  const discardPile = [...data.discardPile];

  const cardsToDiscard = playerHand.filter((card) => card.number === number);
  playerHand = playerHand.filter((card) => card.number !== number);

  discardPile.push(...cardsToDiscard);

  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${player}/hand`] = playerHand;
  updates[`rooms/${roomId}/discardPile`] = discardPile;

  await update(ref(database), updates);
};

const discardAbility = async (
  cards: Card[], // カードの配列を受け取る
  player: string,
  roomId: string
) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  // プレイヤーの手札と捨て札を取得
  let playerHand = data.players[player]?.hand ? [...data.players[player].hand] : [];
  const discardPile = data.discardPile ? [...data.discardPile] : [];


  // 手札から選択されたカードを削除
  playerHand = playerHand.filter(
    (c) => !cards.some((card) => card.id === c.id)
  );

  // 選択されたカードを捨て札に追加
  discardPile.push(...cards);

  // Firebase への更新内容を準備
  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${player}/hand`] = playerHand;
  updates[`rooms/${roomId}/discardPile`] = discardPile;

  // Firebase に更新を反映
  await update(ref(database), updates);
};


const opponentDrawAbility = async (
  roomId: string,
  currentPlayer: string,
  data: any,
  drawCount: number
) => {
  for (const player of data.route) {
    if (player !== currentPlayer) {
      await forceDrawCards(roomId, player, drawCount);
    }
  }
};


const giveCard = async (
  roomId: string,
  currentPlayer: string,
  selectedCards: Card[]
) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  const route = data.route;
  const currentTurn = data.currentTurn;
  const nextPlayerIndex = (route.indexOf(currentTurn) + 1) % route.length;
  const nextPlayer = route[nextPlayerIndex];

  // プレイヤーの手札を取得
  let currentPlayerHand = data.players[currentPlayer].hand || [];
  let nextPlayerHand = data.players[nextPlayer].hand || [];
  

  // currentPlayerHand から選択されたカードを削除
  currentPlayerHand = currentPlayerHand.filter(
    (card: Card) => !selectedCards.some((selectedCard) => selectedCard.id === card.id)
  );

  // nextPlayerHand に選択されたカードを追加
  nextPlayerHand.push(...selectedCards);

  // Firebase への更新内容を準備
  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${currentPlayer}/hand`] = currentPlayerHand;
  updates[`rooms/${roomId}/players/${nextPlayer}/hand`] = nextPlayerHand;

  // Firebase に更新を反映
  await update(ref(database), updates);
};

const copyAbility = async (
  roomId: string,
  currentPlayer: string,
  setTimer: (value: number) => void
) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  // 捨て札の一番上のカードを取得
  const latestDiscardCard =data. discardPile[data.discardPile.length - 1];

  if (!latestDiscardCard || !latestDiscardCard.ability || !latestDiscardCard.ability.playAbility || latestDiscardCard.ability.name === "copy" ) {
   return;
  }

  // アビリティをコピーして発動する
  await triggerPlayAbility(
    latestDiscardCard,
    currentPlayer,
    roomId,
    setTimer   // 何も選択しない
  );
};

const lightningAbility = async (roomId: string) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  const players = data.players;
  
  for (const player of Object.keys(players)) {
    const playerHand = players[player].hand || [];

    // 手札が2枚以下の場合は2枚引かせる
    if (playerHand.length <= 2) {
      await forceDrawCards(roomId, player, 2);
    }
  }
};


const curseAbility = async (
  roomId: string,
  currentPlayer: string,
  playCard: Card,
  selectedCards: Card[]
) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  const curse = playCard.ability;


  // 選択したカードのアビリティをcurseにコピー
  let currentPlayerHand = data.players[currentPlayer]?.hand ? [...data.players[currentPlayer].hand] : [];

  

  currentPlayerHand = currentPlayerHand.map(card => {
    if (selectedCards.some(selectedCard => selectedCard.id === card.id)) {
      return {
        ...card,
        ability: curse // コピーされたcurseアビリティ
      };
    }
    return card;
  });

  // Firebase への更新内容を準備
  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${currentPlayer}/hand`] = currentPlayerHand;

  // Firebase に更新を反映
  await update(ref(database), updates);
};


const unoAbility = async (roomId: string, currentPlayer: string) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  const playerHand = data.players[currentPlayer].hand || [];

  // 手札が1枚以下の場合は2枚引かせる
  if (playerHand.length <= 1) {
    await forceDrawCards(roomId, currentPlayer, 2);
  }
};

const perfectAbility = async (
  roomId: string,
  currentPlayer: string,
  card: Card
) => {
  // Firebase からルームのデータを取得
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  // 捨て札の一番上のカードを取得
  const latestDiscardCard = data.discardPile[data.discardPile.length - 1];
  let currentPlayerHand = data.players[currentPlayer].hand;

  if (
    card.number === latestDiscardCard.number &&
    card.color === latestDiscardCard.color
  ) {
    // カードの色と数が一致する場合、2枚カードを捨てる
    const sCards = await selectCardsFromMyHand(roomId, currentPlayer, 2);
    discardAbility(sCards, currentPlayer, roomId);
  } else {
    // 一致しない場合は1枚カードを引く
    await forceDrawCards(roomId, currentPlayer, 1);
  }

  // 更新用オブジェクトを作成
  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/deck`] = data.deck;

  // Firebase に更新を反映
  await update(ref(database), updates);
};

const refresh = async (
  roomId: string,
  currentPlayer: string
) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) return;

  // 現在のプレイヤーの手札の枚数を取得
  const handSize = data.players[currentPlayer].hand.length;

  // 手札を捨て札に移動
  const discardPile = [...data.discardPile, ...data.players[currentPlayer].hand];
  data.players[currentPlayer].hand = []; // 手札を空にする
  
  const updates: Record<string, any> = {};
  updates[`rooms/${roomId}/players/${currentPlayer}/hand`] = [];
  await update(ref(database), updates)
  // デッキから新しいカードを手札の枚数分引く
  await forceDrawCards(roomId, currentPlayer, handSize);

  // 捨て札を更新
  const _updates: Record<string, any> = {};
  _updates[`rooms/${roomId}/discardPile`] = discardPile;

  // Firebase に更新を反映
  await update(ref(database), _updates);
};
