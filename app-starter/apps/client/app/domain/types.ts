import type { db as dbFactory } from "@packages/db/client.server";

export type DrizzleDB = ReturnType<typeof dbFactory>;

