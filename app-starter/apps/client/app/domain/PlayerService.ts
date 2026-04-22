import { PlayerRepository } from "./repositories/PlayerRepository";
import { getSession } from "../lib/session.server";
import { redirect } from "react-router";

export class PlayerService {
  constructor(private readonly players: PlayerRepository) {}

  async requirePlayer(request: Request) {
    const session = await getSession(request);
    const playerId = session.get("playerId");
    const displayName = session.get("displayName");
    if (!playerId || !displayName) {
      throw redirect("/player/setup");
    }
    return { playerId, displayName };
  }

  async ensurePlayerFromSession(request: Request) {
    const session = await getSession(request);
    const playerId = session.get("playerId");
    const displayName = session.get("displayName");
    if (!playerId || !displayName) return null;
    return { playerId, displayName };
  }
}

