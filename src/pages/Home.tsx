import React, { useState, useEffect } from 'react';
import { get, ref, onValue, push, set, remove, runTransaction } from 'firebase/database';
import { database } from '../firebaseConfig'; // Firebase設定ファイルからエクスポートされたdatabaseをインポート
import { useNavigate } from 'react-router-dom';
import "../css/Home.css"

interface Room {
  name: string;
  gameState: string;
  owner: string;
  players: Record<string, any>;
  timestamp: number;
}

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [isJoining, setIsJoining] = useState(false); // join中かどうかの状態を追加
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
                return null; // ルームを削除する
              }
              return currentRoom; // ルームを削除しない
            })
              .then(() => {
                console.log(`Room ${roomId} deleted due to no players.`);
              })
              .catch((error) => {
                console.error(`Failed to delete room ${roomId}: `, error);
              });

            delete updatedRooms[roomId]; // ローカル状態からも削除
          }
        });
        setRooms(updatedRooms);
      } else {
        setRooms({});
      }
    });
  }, []);

  const handleJoinRoom = (roomId: string, playerId: string) => {
    setIsJoining(true); // すべてのボタンを非活性化
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
          isOwner: playerCount === 0 // 最初のプレイヤーはオーナー
        };

        if (playerCount === 0) {
          currentRoom.owner = playerId; // 最初のプレイヤーをオーナーにする
        }
      }

      return currentRoom;
    }).then(() => {
      // プレイヤーをルームに追加後、ルーム画面に移動
      navigate(`/numeris/rooms/${roomId}`, {
        state: { playerId: playerId },
      });
    }).catch((error) => {
      console.error(error);
      setIsJoining(false); // エラー発生時に再度ボタンを押せるようにする
    });
  };

  const handleCreateRoom = () => {
    setIsJoining(true); // すべてのボタンを非活性化
    const newRoomRef = push(ref(database, 'rooms'));
    const roomId = newRoomRef.key;
    const playerId = push(ref(database, 'players')).key; // 自分のplayerIdを生成

    if (roomId && playerId) {
      const newRoom: Room = {
        name: roomId,
        gameState: 'waiting',
        owner: playerId, // 自分をオーナーに設定
        players: {
          [playerId]: {
            name: playerId,
            isOwner: true // 自分をオーナーとして設定
          }
        },
        timestamp: Date.now(), // タイムスタンプを追加
      };

      set(newRoomRef, newRoom).then(() => {
        // ルーム作成後、ルーム画面に移動
        navigate(`/numeris/rooms/${roomId}`, {
          state: { playerId: playerId },
        });
      }).catch((error) => {
        console.error(error);
        setIsJoining(false); // エラー発生時に再度ボタンを押せるようにする
      });
    }
  };

  return (
    <div id="home-page">
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
                onClick={() => handleJoinRoom(roomId, push(ref(database, 'players')).key!)}
                disabled={isJoining || isRoomFull || room.gameState !== "waiting"}
              >
                {isRoomFull ? 'Room Full' : 'Join Room'}
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={handleCreateRoom} disabled={isJoining}>Create New Room</button>
    </div>

  );
};

export default Home;
