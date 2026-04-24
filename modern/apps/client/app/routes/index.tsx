import { Form, Link, href, redirect } from "react-router";
import { db } from "@packages/db/client.server";
import { rooms, roomPlayers } from "@packages/db/schemas";
import { desc, inArray } from "drizzle-orm";
import type { Route } from "./+types/index";
import { PlayerService } from "../domain/PlayerService";
import { PlayerRepository } from "../domain/repositories/PlayerRepository";
import { RoomService } from "../domain/RoomService";
import { RoomRepository } from "../domain/repositories/RoomRepository";

type RoomSummary = {
  publicId: string;
  status: "waiting" | "in_game" | "finished";
  players: number;
};

export const meta: Route.MetaFunction = () => [{ title: "Numeris" }];

export async function loader(args: Route.LoaderArgs) {
  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.ensurePlayerFromSession(args.request);

  const roomRows = await dbClient
    .select({
      id: rooms.id,
      publicId: rooms.publicId,
      status: rooms.status,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .orderBy(desc(rooms.createdAt))
    .limit(50);

  const roomIds = roomRows.map((r) => r.id);
  const playersByRoomId = new Map<number, number>();
  if (roomIds.length) {
    const rpRows = await dbClient
      .select({ roomId: roomPlayers.roomId })
      .from(roomPlayers)
      .where(inArray(roomPlayers.roomId, roomIds));
    for (const row of rpRows) {
      playersByRoomId.set(row.roomId, (playersByRoomId.get(row.roomId) ?? 0) + 1);
    }
  }

  const summaries: RoomSummary[] = roomRows.map((r) => ({
    publicId: String(r.publicId),
    status: r.status,
    players: playersByRoomId.get(r.id) ?? 0,
  }));

  return { rooms: summaries, me };
}

export async function action(args: Route.ActionArgs) {
  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.requirePlayer(args.request);
  const roomService = new RoomService(new RoomRepository(dbClient));

  const formData = await args.request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create_room") {
    const createdRoom = await roomService.createRoom(me.playerId);
    throw redirect(href("/rooms/:roomID", { roomID: String(createdRoom.publicId) }));
  }

  throw new Response("Bad Request", { status: 400 });
}

export default function IndexRoute({ loaderData }: Route.ComponentProps) {
  const { rooms: roomList, me } = loaderData;

  return (
    <div id="home-page" className="HomePage">
      <div className="info">
        <Link id="deck" to={href("/decks")}>
          deck
        </Link>
        <h1>Home</h1>
      </div>

      {!me ? (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Link to={href("/player/setup")}>
            <button type="button">プレイヤー名を設定</button>
          </Link>
        </div>
      ) : null}

      <div className="RoomList">
        <h2>Room List</h2>
        <ul>
          {roomList.map((room) => {
            const isRoomFull = room.players >= 4;
            const isDisabled = isRoomFull || room.status !== "waiting";

            return (
              <li key={room.publicId} className="ROOM">
                <div>
                  <p>ID: {room.publicId}</p>
                  <p>
                    Status: {room.status} ({room.players}/4)
                  </p>
                </div>
                <button
                  className="joinButton"
                  type="button"
                  onClick={() =>
                    (window.location.href =
                      href("/rooms/:roomID", { roomID: room.publicId }))
                  }
                  disabled={isDisabled}
                >
                  {isRoomFull ? "Room Full" : "Join Room"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Form method="post" action="?index">
        <input type="hidden" name="intent" value="create_room" />
        <button type="submit" disabled={!me}>
          Create New Room
        </button>
      </Form>
    </div>
  );
}
