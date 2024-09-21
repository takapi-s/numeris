import React, { useState, useEffect } from 'react';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { database } from '../firebaseConfig';

interface Player {
  name: string;
  isOwner: boolean;
  timestamp: number;
}

interface Room {
  gameState: string;
  name: string;
  players: Record<string, Player>;
}

const Room: React.FC = () => {
  const { roomID } = useParams<{ roomID: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [canExit, setCanExit] = useState<boolean>(false); // 退出可能かを管理する状態
  const [countdown, setCountdown] = useState<number>(10); // カウントダウン用の状態
  const [GameResult, setResult] = useState<string>("");
  const location = useLocation();
  const playerId = location.state?.playerId || null;

  useEffect(() => {
    if (!playerId) {
      console.error('PlayerID is missing');
      setTimeout(() => {
        navigate('/numeris');
      }, 2000);
      return;
    }

    if (!roomID) return;

    const roomRef = ref(database, `rooms/${roomID}`);

    // プレイヤーのデータ参照
    const playerRef = ref(database, `rooms/${roomID}/players/${playerId}`);

    // onDisconnectを設定して接続が切れた場合にプレイヤーを削除
    const disconnectRef = onDisconnect(playerRef);
    disconnectRef.set(null).then(() => {
      console.log('onDisconnect has been set to remove the player on disconnection');
    }).catch((error) => {
      console.error('Error setting onDisconnect:', error);
    });

    const unsubscribe = onValue(roomRef, async (snapshot) => {
      if (!snapshot.exists()) {
        console.log('Room not found or deleted');
        setLoading(true);
        setTimeout(() => {
          navigate('/numeris');
        }, 2000);
        return;
      }

      const data = snapshot.val();
      setRoom(data);

      // プレイヤーデータが存在しない場合にHomeに戻る
      if (!data.players || !data.players[playerId]) {
        console.log('Player data not found, redirecting to Home');
        navigate('/numeris');
        return;
      }

      if (data.players && playerId && data.players[playerId] && !data.players[playerId].timestamp) {
        const playerTimestampRef = ref(database, `rooms/${roomID}/players/${playerId}/timestamp`);
        await set(playerTimestampRef, Date.now());
      }

      const currentOwner = data.players
        ? (Object.values(data.players) as Player[]).find((player: Player) => player.isOwner)
        : null;

      if (!currentOwner && playerId) {
        const remainingPlayers = data.players
          ? Object.entries(data.players).filter(([_, player]) => (player as Player).timestamp)
          : [];

        if (remainingPlayers.length > 0) {
          const newOwner = remainingPlayers.reduce((oldest, current) => {
            return ((current[1] as Player).timestamp < (oldest[1] as Player).timestamp) ? current : oldest;
          });

          const newOwnerRef = ref(database, `rooms/${roomID}/players/${newOwner[0]}/isOwner`);
          await set(newOwnerRef, true);
        }
      }

      if (data.gameState === 'in-game' && playerId) {
        navigate(`/numeris/game/${roomID}`, { state: { currentPlayer: playerId } });
      } else if (data.gameState === "win") {
        setResult(data.winner === playerId ? "You are Winner!!!" : "You are Loser");
        setTimeout(() => updateGameStateToWaiting(roomID), 3000);
      } else if (data.gameState === "draw") {
        setResult("DRAW");
        setTimeout(() => updateGameStateToWaiting(roomID), 3000);
      } else if (data.gameState === "disconnect") {
        setResult("Disconnect Error");
        setTimeout(() => updateGameStateToWaiting(roomID), 3000);
      }

      setLoading(false);
    }, (error) => {
      console.error('Error fetching room data:', error);
      setLoading(false);
    });

    // カウントダウンをスタート
    const countdownTimer = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown > 1) {
          return prevCountdown - 1;
        } else {
          clearInterval(countdownTimer);
          setCanExit(true); // 10秒後に退出を許可
          return 0;
        }
      });
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
      unsubscribe();
      // プレイヤーが正常に退出した場合、onDisconnectを解除
      onDisconnect(playerRef).cancel();
    };
  }, [roomID, navigate, playerId]);

  const updateGameStateToWaiting = async (roomID: string) => {
    const roomRef = ref(database, `rooms/${roomID}/gameState`);
    try {
      await set(roomRef, 'waiting');
      console.log('Game state updated to waiting');
    } catch (error) {
      console.error('Failed to update game state to waiting:', error);
    }
  };

  const handleStartGame = () => {
    if (!room || !room.players[playerId]?.isOwner) return;

    const roomRef = ref(database, `rooms/${roomID}/gameState`);
    set(roomRef, 'in-game').then(() => {
      console.log('Game started');
    });
  };

  const handleExitRoom = async () => {
    if (!room || !playerId || !canExit) return; // 退出可能かどうかをチェック

    try {
      const playerRef = ref(database, `rooms/${roomID}/players/${playerId}`);
      await set(playerRef, null);

      console.log('Player removed from room');
      navigate('/numeris');
    } catch (error) {
      console.error('Failed to remove player from room:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {room ? (
        <>
          <h1>{room?.name}</h1>
          <h2>Players:</h2>
          <ul>
            {room.players && Object.entries(room.players).map(([key, player]) => {
              const typedPlayer = player as Player;
              return (
                <li key={key} style={{ fontWeight: key === playerId ? 'bold' : 'normal' }}>
                  {typedPlayer.name} {typedPlayer.isOwner ? '(Owner)' : ''} {key === playerId ? '(You)' : ''}
                </li>
              );
            })}
          </ul>
          {room?.players[playerId]?.isOwner && (
            <button onClick={handleStartGame} disabled={Object.keys(room.players).length < 2}>
              Start Game
            </button>
          )}

          <button onClick={handleExitRoom} disabled={!canExit}>
            {canExit ? 'Exit Room' : `Exit Room (${countdown} seconds remaining)`}
          </button>
        </>
      ) : (
        <div>Room information is not available</div>
      )}

      {GameResult && (
        <div>
          <h2>{GameResult}</h2>
        </div>
      )}
    </div>
  );
};

export default Room;
