import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { database } from '../firebaseConfig';

interface Player {
  name: string;
  isOwner: boolean;
}

interface Room {
  gameState: string;
  name: string;
  owner: string;
  players: Record<string, Player>;
}


const Room: React.FC = () => {
  const { roomID } = useParams<{ roomID: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const location = useLocation();
  const currentPlayer = location.state?.currentPlayer || null;
  const playerId = location.state?.playerId || null;
  const [GameResult, setResult] = useState<string>("");
  const [isReloading, setIsReloading] = useState<boolean>(false);
  
  useEffect(() => {
    if (!roomID) return;

    const roomRef = ref(database, `rooms/${roomID}`);
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoom(data);
        if (data.gameState === 'in-game' && playerId) {
          navigate(`/numeris/game/${roomID}`, { state: { currentPlayer: playerId } });
        } else if (data.gameState === "win") {
          if (data.winner === playerId && playerId) {
            setResult(`You are Winner!!!`);
          } else if (playerId) {
            setResult("You are Loser");
          }
          setTimeout(() => updateGameStateToWaiting(roomID), 3000);
        } else if (data.gameState === "draw") {
          setResult("DRAW");
          setTimeout(() => updateGameStateToWaiting(roomID), 3000);
        }
      } else {
        console.log('Room not found');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching room data:', error);
      setLoading(false);
    });
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
    if (!room || room.owner !== playerId) return;

    const roomRef = ref(database, `rooms/${roomID}/gameState`);
    set(roomRef, 'in-game').then(() => {
      console.log('Game started');
    });
  };

  const handleExitRoom = async () => {
    if (!room || !playerId) return;

    const playerCount = room.players ? Object.keys(room.players).length : 0;

    if (playerCount === 1) {
      try {
        const roomRef = ref(database, `rooms/${roomID}`);
        await set(roomRef, null);
        console.log('Room deleted');
        navigate('/numeris');
      } catch (error) {
        console.error('Failed to delete room:', error);
      }
    } else {
      try {
        if (room.owner === playerId) {
          const remainingPlayers = Object.keys(room.players).filter(key => key !== playerId);
          if (remainingPlayers.length > 0) {
            const newOwnerId = remainingPlayers[0];
            const ownerRef = ref(database, `rooms/${roomID}/owner`);
            await set(ownerRef, newOwnerId);
            const newOwnerRef = ref(database, `rooms/${roomID}/players/${newOwnerId}/isOwner`);
            await set(newOwnerRef, true);
          }
        }
        const playerRef = ref(database, `rooms/${roomID}/players/${playerId}`);
        await set(playerRef, null);

        console.log('Player removed from room');
        navigate('/numeris');
      } catch (error) {
        console.error('Failed to remove player from room:', error);
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{room?.name}</h1>
      <h2>Players:</h2>
      <ul>
        {room?.players && Object.entries(room.players).map(([key, player]) => (
          <li key={key} style={{ fontWeight: key === playerId ? 'bold' : 'normal' }}>
            {player.name} {player.isOwner ? '(Owner)' : ''} {key === playerId ? '(You)' : ''}
          </li>
        ))}
      </ul>
      {room?.owner === playerId && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
      <button onClick={handleExitRoom}>Exit Room</button>

      {GameResult && (
        <div>
          <h2>{GameResult}</h2>
        </div>
      )}
    </div>
  );
};

export default Room;
