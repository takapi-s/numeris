import { eq } from "drizzle-orm";
import { players } from "@packages/db/schemas";
import type { DrizzleDB } from "../types";

export class PlayerRepository {
  constructor(private readonly db: DrizzleDB) {}

  async getPlayerById(id: string) {
    const rows = await this.db.select().from(players).where(eq(players.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async createPlayer(displayName: string) {
    const created = await this.db
      .insert(players)
      .values({ displayName })
      .returning({ id: players.id, displayName: players.displayName });
    return created[0] ?? null;
  }

  async updateDisplayName(id: string, displayName: string) {
    await this.db.update(players).set({ displayName }).where(eq(players.id, id));
  }
}

