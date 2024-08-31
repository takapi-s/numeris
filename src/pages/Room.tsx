// pages/Room.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { database } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { useLocation } from "react-router-dom";
import "../css/Room.css"

type PlayerStatus = {
  inRoom: boolean;
};

type Players = {
  [key: string]: PlayerStatus;
};

type RoomData = {
  owner: string;
  players: Players;
  gameStatus?: string; // ゲームの状態（optional）
  winner?: string; // 勝者情報を追加
};

const Room: React.FC = () => {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Players>({});
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null); // 勝者を保存する状態
  const location = useLocation();
  const { currentPlayer: cPlayer, gameStatus: returnedGameStatus } = location.state || {}; // ゲームから戻ってきた場合の状態
  const [gameStatus, setGameStatus] = useState<string | null>(returnedGameStatus || null); // 初期値を設定
  const [isReturning, setIsReturning] = useState<boolean>(!!returnedGameStatus); // ゲーム画面から戻ってきたかどうかを判別


  useEffect(() => {
    if (!id) return;

    const roomRef = ref(database, `rooms/${id}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data: RoomData = snapshot.val();
      if (data) {
        setPlayers(data.players);
        setOwner(data.owner);
        setGameStatus(data.gameStatus || null); // ゲームの状態を取得
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    // 既にcurrentPlayerが設定されている場合は処理をスキップ
    if (!id || isReturning){
      setCurrentPlayer(cPlayer);
      const roomRef = ref(database, `rooms/${id}/players`);
      onValue(
        roomRef,
        async (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const allPlayers = Object.keys(data);
            const allPlayersOutOfRoom = allPlayers.every((player) => !data[player].inRoom);
            if (cPlayer) {
              const updates: Record<string, any> = {};
              updates[`rooms/${id}/players/${cPlayer}/inRoom`] = true;

              try {
                await update(ref(database), updates);
                setCurrentPlayer(cPlayer);
              } catch (error) {
                setMessage('Failed to join the room.');
              }
            } else {
              setMessage('Room is full or unavailable.');
            }
          }
        },
        { onlyOnce: true }
      );

    } else {
      const roomRef = ref(database, `rooms/${id}/players`);
      onValue(
        roomRef,
        async (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const allPlayers = Object.keys(data);
            const allPlayersOutOfRoom = allPlayers.every((player) => !data[player].inRoom);

            let assignedPlayer: string | null = null;

            if (allPlayersOutOfRoom) {
              assignedPlayer = allPlayers[0];
              const ownerUpdate = { [`rooms/${id}/owner`]: assignedPlayer };
              await update(ref(database), ownerUpdate);
              setOwner(assignedPlayer);
            } else {
              assignedPlayer = allPlayers.find((player) => !data[player].inRoom) || null;
            }

            if (assignedPlayer) {
              const updates: Record<string, any> = {};
              updates[`rooms/${id}/players/${assignedPlayer}/inRoom`] = true;

              try {
                await update(ref(database), updates);
                setCurrentPlayer(assignedPlayer);
              } catch (error) {
                setMessage('Failed to join the room.');
              }
            } else {
              setMessage('Room is full or unavailable.');
            }
          }
        },
        { onlyOnce: true }
      );
    }


  }, [id, isReturning]);

  useEffect(() => {
    if (gameStatus === 'started') {
      navigate(`/numeris/game/${id}`, { state: { currentPlayer } });
    } else if (gameStatus === 'draw') {
      setMessage('The game is a draw!');
      setTimeout(async () => {
        await update(ref(database, `rooms/${id}`), { gameStatus: 'waiting' });
      }, 3000);
    } else if (gameStatus === 'win') {
      const winnerRef = ref(database, `rooms/${id}/winner`);
      onValue(winnerRef, (snapshot) => {
        const winnerData = snapshot.val();
        if (winnerData) {
          setWinner(winnerData);
          setMessage(`Congratulations, ${winnerData} is the winner!`);
        }
      });
      setTimeout(async () => {
        await update(ref(database, `rooms/${id}`), { gameStatus: 'waiting' });
      }, 3000);
    }
  }, [gameStatus, id, navigate, currentPlayer]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (id && currentPlayer) {
        const updates: Record<string, any> = {};
        updates[`rooms/${id}/players/${currentPlayer}/inRoom`] = false;

        if (currentPlayer === owner) {
          const remainingPlayers = Object.keys(players).filter((player) => players[player].inRoom && player !== currentPlayer);
          if (remainingPlayers.length > 0) {
            updates[`rooms/${id}/owner`] = remainingPlayers[0];
          } else {
            updates[`rooms/${id}/owner`] = '';
          }
        }

        await update(ref(database), updates);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id, currentPlayer, owner, players]);

  const handleExitRoom = async () => {
    if (!id || !currentPlayer) return;

    const updates: Record<string, any> = {};
    updates[`rooms/${id}/players/${currentPlayer}/inRoom`] = false;

    if (currentPlayer === owner) {
      const remainingPlayers = Object.keys(players).filter((player) => players[player].inRoom && player !== currentPlayer);
      if (remainingPlayers.length > 0) {
        updates[`rooms/${id}/owner`] = remainingPlayers[0];
      } else {
        updates[`rooms/${id}/owner`] = '';
      }
    }

    try {
      await update(ref(database), updates);
      navigate('/numeris');
    } catch (error) {
      setMessage('Failed to exit the room.');
    }
  };

  const handleStartGame = async () => {
    const activePlayers = Object.keys(players).filter((player) => players[player].inRoom);

    if (id && owner === currentPlayer) {
      if (activePlayers.length < 2) {
        setMessage('At least two players are required to start the game.');
        return;
      }

      const updates: Record<string, any> = {};
      updates[`rooms/${id}/gameStatus`] = 'started';
      try {
        await update(ref(database), updates);
        setMessage('Game started!');
      } catch (error) {
        setMessage('Failed to start the game.');
      }
    }
  };

  return (
    <div className="room-container">
      <h1>Room {id}</h1>
      {message && <p className="result-message">{message}</p>}
      <div className="player-status">
        {Object.keys(players).map((player) => (
          <div key={player} className="player-item">
            {players[player].inRoom ? (
              <span className="player-active-mark">🟢</span>
            ) : (
              <span className="player-inactive-mark">🔴</span>
            )}
            <span className="player-name">
              {player} {player === currentPlayer ? '(You)' : ''} {player === owner ? '(Owner)' : ''}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={handleStartGame}
        disabled={owner !== currentPlayer || Object.keys(players).filter((player) => players[player].inRoom).length < 2}
        className={owner !== currentPlayer || Object.keys(players).filter((player) => players[player].inRoom).length < 2 ? 'disabled-button' : 'start-game-button'}
      >
        Start Game
      </button>
      <button onClick={handleExitRoom}>Exit Room</button>
      {gameStatus === 'started' && <p>The game has started! Prepare yourself!</p>}
    </div>
  );
};

export default Room;
