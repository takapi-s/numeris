import { redirect } from "react-router";
import { RoomRepository } from "./repositories/RoomRepository";

export class RoomService {
  constructor(private readonly rooms: RoomRepository) {}

  async createRoom(ownerPlayerId: string) {
    const created = await this.rooms.createRoom(ownerPlayerId);
    if (!created) throw new Response("Failed to create room", { status: 500 });
    await this.rooms.joinRoom(created.id, ownerPlayerId, true);
    return created;
  }

  async joinRoomByPublicId(roomPublicId: string, playerId: string) {
    const room = await this.rooms.getRoomByPublicId(roomPublicId);
    if (!room) throw new Response("Room not found", { status: 404 });
    await this.rooms.joinRoom(room.id, playerId, room.ownerPlayerId === playerId);
    return room;
  }

  async leaveRoomByPublicId(roomPublicId: string, playerId: string) {
    await this.rooms.transaction(async (tx) => {
      const roomRepo = new RoomRepository(tx);
      const room = await roomRepo.getRoomByPublicId(roomPublicId);
      if (!room) return;

      await roomRepo.leaveRoom(room.id, playerId);
      const stillHasPlayers = await roomRepo.hasAnyPlayers(room.id);
      if (!stillHasPlayers) {
        await roomRepo.deleteRoomById(room.id);
      }
    });

    throw redirect("/");
  }
}

