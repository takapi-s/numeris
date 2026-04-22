import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleDB } from "../types";
import { roomPlayers, rooms } from "@packages/db/schemas";

export class RoomRepository {
  constructor(private readonly db: DrizzleDB) {}

  async transaction<T>(fn: (tx: DrizzleDB) => Promise<T>) {
    return this.db.transaction(async (tx) => fn(tx as unknown as DrizzleDB));
  }

  async listRooms(limit = 50) {
    return this.db
      .select({ id: rooms.id, publicId: rooms.publicId, status: rooms.status, createdAt: rooms.createdAt })
      .from(rooms)
      .orderBy(desc(rooms.createdAt))
      .limit(limit);
  }

  async getRoomByPublicId(publicId: string) {
    const rows = await this.db
      .select({ id: rooms.id, publicId: rooms.publicId, status: rooms.status, ownerPlayerId: rooms.ownerPlayerId })
      .from(rooms)
      .where(eq(rooms.publicId, publicId))
      .limit(1);
    return rows[0] ?? null;
  }

  async createRoom(ownerPlayerId: string) {
    const created = await this.db
      .insert(rooms)
      .values({ ownerPlayerId, status: "waiting" })
      .returning({ id: rooms.id, publicId: rooms.publicId });
    return created[0] ?? null;
  }

  async setStatus(roomId: number, status: "waiting" | "in_game" | "finished") {
    await this.db.update(rooms).set({ status }).where(eq(rooms.id, roomId));
  }

  async deleteRoomById(roomId: number) {
    await this.db.delete(rooms).where(eq(rooms.id, roomId));
  }

  async listRoomPlayers(roomId: number) {
    return this.db
      .select({ playerId: roomPlayers.playerId, isOwner: roomPlayers.isOwner, joinedAt: roomPlayers.joinedAt })
      .from(roomPlayers)
      .where(eq(roomPlayers.roomId, roomId))
      .orderBy(asc(roomPlayers.joinedAt));
  }

  async countPlayersByRoomIds(roomIds: number[]) {
    if (roomIds.length === 0) return new Map<number, number>();
    const rows = await this.db
      .select({ roomId: roomPlayers.roomId })
      .from(roomPlayers)
      .where(inArray(roomPlayers.roomId, roomIds));
    const map = new Map<number, number>();
    for (const r of rows) map.set(r.roomId, (map.get(r.roomId) ?? 0) + 1);
    return map;
  }

  async joinRoom(roomId: number, playerId: string, isOwner: boolean) {
    await this.db
      .insert(roomPlayers)
      .values({ roomId, playerId, isOwner })
      .onConflictDoNothing();
  }

  async leaveRoom(roomId: number, playerId: string) {
    await this.db.delete(roomPlayers).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.playerId, playerId)));
  }

  async isRoomOwner(roomId: number, playerId: string) {
    const rows = await this.db
      .select({ isOwner: roomPlayers.isOwner })
      .from(roomPlayers)
      .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.playerId, playerId)))
      .limit(1);
    return rows[0]?.isOwner ?? false;
  }

  async hasAnyPlayers(roomId: number) {
    const rows = await this.db
      .select({ playerId: roomPlayers.playerId })
      .from(roomPlayers)
      .where(eq(roomPlayers.roomId, roomId))
      .limit(1);
    return rows.length > 0;
  }
}

