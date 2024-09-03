import React, { useState, useEffect } from 'react';
import { get, ref, onValue, push, set } from 'firebase/database';
import { database } from '../firebaseConfig'; // Firebase設定ファイルからエクスポートされたdatabaseをインポート
import { useNavigate } from 'react-router-dom';

interface Room {
  name: string;
  gameState: string;
  owner: string;
  players: Record<string, any>;
  timestamp: number; // 新しくtimestampフィールドを追加
}

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRooms(data);
      } else {
        setRooms({});
      }
    });
  }, []);

  const handleJoinRoom = (roomId: string) => {
    // Roomに入室する処理を実装
    console.log(`Joining room: ${roomId}`);

    const roomRef = ref(database, `rooms/${roomId}`);
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const playerCount = data.players ? Object.keys(data.players).length : 0;
        const newPlayerRef = push(ref(database, `rooms/${roomId}/players`));
        const newPlayerId = newPlayerRef.key;
        if (newPlayerId) {
          console.log("SET", newPlayerId);

          set(newPlayerRef, {
            name: newPlayerId,
            isOwner: playerCount === 0 // Set the first player as the owner
          }).then(() => {
            if (playerCount === 0) {
              // Set the first player as the owner of the room
              const ownerRef = ref(database, `rooms/${roomId}/owner`);
              set(ownerRef, newPlayerId);
            }
          });


          navigate(`/numeris/rooms/${roomId}`, {
            state: { playerId: newPlayerId },
          });

        }
      } else {
        console.log("No data available");
      }
    }).catch((error) => {
      console.error(error);
    });

  };



  const handleCreateRoom = () => {
    const newRoomRef = push(ref(database, 'rooms'));
    const roomId = newRoomRef.key;
    if (roomId) {
      const newRoom: Room = {
        name: roomId,
        gameState: 'waiting',
        owner: '', // ここにオーナーを設定する（例えば現在のユーザーID）
        players: {},
        timestamp: Date.now(), // 現在のタイムスタンプを追加
      };
      set(newRoomRef, newRoom).then(() => {
        handleJoinRoom(roomId);
      });
    }
  };

  return (
    <div>
      <h1>Home</h1>
      <h2>Existing Rooms</h2>
      <ul>
        {rooms && Object.entries(rooms).map(([roomId, room]) => {
          const playerCount = room.players ? Object.keys(room.players).length : 0;
          const isRoomFull = playerCount === 4;


          return (
            <li key={roomId}>
              {room.name} - Status: {room.gameState} ({playerCount}/4)
              <button
                onClick={() => handleJoinRoom(roomId)}
                disabled={isRoomFull || room.gameState !== "waiting"}
              >
                {isRoomFull ? 'Room Full' : 'Join Room'}
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={handleCreateRoom}>Create New Room</button>
    </div>
  );
};

export default Home;
