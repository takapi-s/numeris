import { useEffect, useMemo, useState } from "react";
import { Form, Link, href, redirect, useSearchParams } from "react-router";
import { db } from "@packages/db/client.server";
import { gameEvents, games, roomPlayers, rooms } from "@packages/db/schemas";
import { and, asc, eq } from "drizzle-orm";
import { supabaseBrowser } from "../../lib/supabase.client";
import type { Route } from "./+types/route";
import { PlayerRepository } from "../../domain/repositories/PlayerRepository";
import { PlayerService } from "../../domain/PlayerService";
import { RoomRepository } from "../../domain/repositories/RoomRepository";
import { RoomService } from "../../domain/RoomService";

export const meta: Route.MetaFunction = () => [{ title: "Room" }];

type LoaderData = {
  room: { id: number; publicId: string; status: "waiting" | "in_game" | "finished" };
  players: Array<{ playerId: string; isOwner: boolean }>;
  me: { playerId: string; isOwner: boolean };
};

export async function loader(args: Route.LoaderArgs): Promise<LoaderData> {
  const roomPublicId = args.params.roomID;
  if (!roomPublicId) throw new Response("roomID is required", { status: 400 });

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });

  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.requirePlayer(args.request);

  const roomRows = await dbClient
    .select({ id: rooms.id, publicId: rooms.publicId, status: rooms.status })
    .from(rooms)
    .where(eq(rooms.publicId, roomPublicId))
    .limit(1);

  const room = roomRows[0];
  if (!room) throw new Response("Room not found", { status: 404 });

  const roomService = new RoomService(new RoomRepository(dbClient));
  const joinedRoom = await roomService.joinRoomByPublicId(roomPublicId, me.playerId);

  // 参加していなければ参加（Supabase移行前提で、アクセス時に自動参加）
  const roomRepo = new RoomRepository(dbClient);
  const playerRows = await roomRepo.listRoomPlayers(joinedRoom.id);
  const meIsOwner = await roomRepo.isRoomOwner(joinedRoom.id, me.playerId);

  return {
    room: { id: room.id, publicId: String(room.publicId), status: room.status },
    players: playerRows.map((p) => ({ playerId: String(p.playerId), isOwner: p.isOwner })),
    me: { playerId: me.playerId, isOwner: meIsOwner },
  };
}

export async function action(args: Route.ActionArgs) {
  const roomPublicId = args.params.roomID;
  if (!roomPublicId) throw new Response("roomID is required", { status: 400 });

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.requirePlayer(args.request);
  const roomService = new RoomService(new RoomRepository(dbClient));

  const formData = await args.request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "leave_room") {
    return await roomService.leaveRoomByPublicId(roomPublicId, me.playerId);
  }

  if (intent !== "start_game") {
    throw new Response("Bad Request", { status: 400 });
  }

  const roomRepo = new RoomRepository(dbClient);
  const room = await roomRepo.getRoomByPublicId(roomPublicId);
  if (!room) throw new Response("Room not found", { status: 404 });
  const isOwner = await roomRepo.isRoomOwner(room.id, me.playerId);
  if (!isOwner) throw new Response("Forbidden", { status: 403 });

  await dbClient.update(rooms).set({ status: "in_game" }).where(eq(rooms.id, room.id));
  const gameRows = await dbClient
    .insert(games)
    .values({ roomId: room.id, state: {} })
    .onConflictDoNothing()
    .returning({ id: games.id });

  const gameId = gameRows[0]?.id;
  await dbClient.insert(gameEvents).values({
    roomId: room.id,
    gameId: gameId ?? null,
    type: "game_started",
    payload: {},
  });

  throw redirect(href("/game/:roomID", { roomID: roomPublicId }));
}

export default function RoomRoute({ loaderData }: Route.ComponentProps) {
  const { room, players, me } = loaderData;
  const [searchParams] = useSearchParams();
  const playerId = me.playerId;
  const [realtimePlayers, setRealtimePlayers] = useState(players);

  // Realtime購読（実装初期: 差分通知→再取得）
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof supabaseBrowser>["channel"]> | null = null;

    try {
      const supabase = supabaseBrowser();

      const refresh = async () => {
        const { data, error } = await supabase
          .from("room_players")
          .select("is_owner, joined_at, player_id")
          .eq("room_id", room.id)
          .order("joined_at", { ascending: true });
        if (cancelled) return;
        if (error || !data) return;
        setRealtimePlayers(
          data.map((row: any) => ({
            playerId: row.player_id ?? "unknown",
            isOwner: !!row.is_owner,
          })),
        );
      };

      void refresh();

      channel = supabase
        .channel(`room:${room.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
          () => void refresh(),
        )
        .subscribe();
    } catch {
      // env未設定などでRealtimeが使えない場合は無視（後で必須化）
    }

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [room.id]);

  const displayPlayers = useMemo(() => realtimePlayers, [realtimePlayers]);

  return (
    <div id="room-page">
      <h1>ID : {room.publicId}</h1>
      <h2>Players List</h2>
      <ul>
        {displayPlayers.map((p) => (
          <li
            key={p.playerId}
            style={{ fontWeight: p.playerId === playerId ? "bold" : "normal" }}
          >
            {p.playerId} {p.isOwner ? "(Owner)" : ""} {p.playerId === playerId ? "(You)" : ""}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Form method="post">
          <input type="hidden" name="intent" value="start_game" />
          <button type="submit" disabled={!me.isOwner || displayPlayers.length < 2 || room.status !== "waiting"}>
            Start Game
          </button>
        </Form>

        <Form method="post">
          <input type="hidden" name="intent" value="leave_room" />
          <button type="submit">Exit Room</button>
        </Form>
      </div>

      <p style={{ textAlign: "center", color: "#666", marginTop: 16 }}>
        移植中: Supabaseの状態同期（Realtime）とゲーム開始処理は次のToDoで実装します。
      </p>
    </div>
  );
}

