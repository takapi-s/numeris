import React, { useState, useEffect } from 'react';
import { get, ref, onValue, push, set, remove, runTransaction } from 'firebase/database';
import { database } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import "../css/Home.css"
import DeckDialog from '../components/DeckDialog';// デッキダイアログのインポート

interface Room {
  name: string;
  gameState: string;
  owner: string;
  players: Record<string, any>;
  timestamp: number;
}

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [isJoining, setIsJoining] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの表示状態を管理
  const navigate = useNavigate();

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const updatedRooms: Record<string, Room> = { ...data };
        Object.entries(updatedRooms).forEach(([roomId, room]) => {
          if (!room.players || Object.keys(room.players).length === 0) {
            const roomRef = ref(database, `rooms/${roomId}`);
            runTransaction(roomRef, (currentRoom) => {
              if (currentRoom && (!currentRoom.players || Object.keys(currentRoom.players).length === 0)) {
                return null;
              }
              return currentRoom;
            })
              .then(() => {
                console.log(`Room ${roomId} deleted due to no players.`);
              })
              .catch((error) => {
                console.error(`Failed to delete room ${roomId}: `, error);
              });

            delete updatedRooms[roomId];
          }
        });
        setRooms(updatedRooms);
      } else {
        setRooms({});
      }
    });
  }, []);

  const handleJoinRoom = (roomId: string, playerId: string) => {
    setIsJoining(true);
    console.log(`Joining room: ${roomId}`);

    const roomRef = ref(database, `rooms/${roomId}`);
    runTransaction(roomRef, (currentRoom) => {
      if (currentRoom) {
        const playerCount = currentRoom.players ? Object.keys(currentRoom.players).length : 0;

        if (!currentRoom.players) {
          currentRoom.players = {};
        }

        currentRoom.players[playerId] = {
          name: playerId,
          isOwner: playerCount === 0
        };

        if (playerCount === 0) {
          currentRoom.owner = playerId;
        }
      }

      return currentRoom;
    }).then(() => {
      navigate(`/numeris/rooms/${roomId}`, {
        state: { playerId: playerId },
      });
    }).catch((error) => {
      console.error(error);
      setIsJoining(false);
    });
  };

  const handleCreateRoom = () => {
    setIsJoining(true);
    const newRoomRef = push(ref(database, 'rooms'));
    const roomId = newRoomRef.key;
    const playerId = push(ref(database, 'players')).key;

    if (roomId && playerId) {
      const newRoom: Room = {
        name: roomId,
        gameState: 'waiting',
        owner: playerId,
        players: {
          [playerId]: {
            name: playerId,
            isOwner: true
          }
        },
        timestamp: Date.now(),
      };

      set(newRoomRef, newRoom).then(() => {
        navigate(`/numeris/rooms/${roomId}`, {
          state: { playerId: playerId },
        });
      }).catch((error) => {
        console.error(error);
        setIsJoining(false);
      });
    }
  };

  const openDialog = () => {
    setIsDialogOpen(true); // ダイアログを開く
  };

  const closeDialog = () => {
    setIsDialogOpen(false); // ダイアログを閉じる
  };

  return (
    <div id="home-page" className='HomePage'>
      <div className='info'>
        <button id='deck' onClick={openDialog}>
          deck
        </button>
        <h1>Home</h1>
      </div>
      <DeckDialog isOpen={isDialogOpen} onClose={closeDialog} /> {/* ダイアログを表示 */}
      <div className='RoomList'>
        <h2>Room List</h2>
        <ul>
          {rooms && Object.entries(rooms)
            .sort(([roomIdA, roomA], [roomIdB, roomB]) => {
              const playerCountA = roomA.players ? Object.keys(roomA.players).length : 0;
              const isRoomFullA = playerCountA === 4;
              const isDisabledA = isJoining || isRoomFullA || roomA.gameState !== "waiting";

              const playerCountB = roomB.players ? Object.keys(roomB.players).length : 0;
              const isRoomFullB = playerCountB === 4;
              const isDisabledB = isJoining || isRoomFullB || roomB.gameState !== "waiting";

              if (isDisabledA === isDisabledB) return 0;
              return isDisabledA ? 1 : -1;
            })
            .map(([roomId, room]) => {
              const playerCount = room.players ? Object.keys(room.players).length : 0;
              const isRoomFull = playerCount === 4;
              const isDisabled = isJoining || isRoomFull || room.gameState !== "waiting";

              return (
                <li key={roomId} className='ROOM'>
                  <div>
                    <p>ID: {room.name}</p>
                    <p>Status: {room.gameState} ({playerCount}/4)</p>
                  </div>

                  <button
                    className='joinButton'
                    onClick={() => handleJoinRoom(roomId, push(ref(database, 'players')).key!)}
                    disabled={isDisabled}
                  >
                    {isRoomFull ? 'Room Full' : 'Join Room'}
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
      <button onClick={handleCreateRoom} disabled={isJoining}>Create New Room</button>
    </div>
  );
};

export default Home;
