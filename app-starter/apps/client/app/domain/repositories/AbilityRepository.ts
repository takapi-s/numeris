import { abilities } from "@packages/db/schemas";
import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../types";

export class AbilityRepository {
  constructor(private readonly db: DrizzleDB) {}

  async listAll() {
    return this.db.select().from(abilities);
  }

  async getByName(name: string) {
    const rows = await this.db.select().from(abilities).where(eq(abilities.name, name)).limit(1);
    return rows[0] ?? null;
  }
}

