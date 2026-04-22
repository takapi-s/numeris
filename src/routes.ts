export const BASE_PATH = '/numeris';

export const routes = {
  home: () => `${BASE_PATH}`,
  room: (roomId: string) => `${BASE_PATH}/rooms/${roomId}`,
  game: (roomId: string) => `${BASE_PATH}/game/${roomId}`,
} as const;

