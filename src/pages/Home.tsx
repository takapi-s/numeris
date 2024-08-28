import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';

type Player = {
  inRoom: boolean;
};

type Room = {
  id: string;
  name: string;
  currentPlayers: number;
  maxPlayers: number;
  gameStatus: string; // gameStatusを追加
  players: Record<string, Player>;
};

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsArray = Object.keys(data).map((key) => {
          const players: Record<string, Player> = data[key].players;
          const currentPlayers = Object.values(players).filter((player) => player.inRoom).length;
          return {
            ...data[key],
            id: key,
            currentPlayers,
          };
        });
        setRooms(roomsArray);
      }
    });

    return () => unsubscribe();
  }, []);

  const joinRoom = (roomId: string) => {
    const roomRef = ref(database, `rooms/${roomId}/players`);
    onValue(
      roomRef,
      (snapshot) => {
        const playersData: Record<string, Player> = snapshot.val();
        if (playersData) {
          const availablePlayer = Object.keys(playersData).find(
            (player) => !playersData[player].inRoom
          );

          if (availablePlayer) {
            // HomeではinRoomをtrueにしない
            navigate(`/numeris/rooms/${roomId}`);
          } else {
            setMessage('Room is full or unavailable.');
          }
        }
      },
      { onlyOnce: true }
    );
  };

  return (
    <div className="home-container">
      <h1>Welcome to the Home Page</h1>
      {message && <p className="error-message">{message}</p>}
      <div className="button-container">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => joinRoom(room.id)}
            disabled={room.currentPlayers >= room.maxPlayers || room.gameStatus !== 'waiting'} // gameStatusを考慮
          >
            {room.name} ({room.currentPlayers}/{room.maxPlayers})
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;
