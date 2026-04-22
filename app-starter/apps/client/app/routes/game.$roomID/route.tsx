import { useCallback, useEffect, useMemo, useState } from "react";
import { Form, Link, href } from "react-router";
import { gameEvents, rooms } from "@packages/db/schemas";
import { desc, eq } from "drizzle-orm";
import { supabaseBrowser } from "../../lib/supabase.client";
import { GameService } from "../../domain/GameService";
import { PlayerService } from "../../domain/PlayerService";
import { PlayerRepository } from "../../domain/repositories/PlayerRepository";
import { db } from "@packages/db/client.server";
import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => [{ title: "Game" }];

type LoaderData = {
  room: { id: number; publicId: string };
  game: { id: number; state: any } | null;
  events: Array<{ type: string; createdAt: string }>;
  me: { playerId: string; displayName: string };
};

export async function loader(args: Route.LoaderArgs): Promise<LoaderData> {
  const roomPublicId = args.params.roomID;
  if (!roomPublicId) throw new Response("roomID is required", { status: 400 });

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const me = await new PlayerService(new PlayerRepository(dbClient as any)).requirePlayer(args.request);

  const gameService = new GameService(dbClient);
  const { room, game } = await gameService.getGameByRoomPublicId(roomPublicId);

  const eventRows = await dbClient
    .select({ type: gameEvents.type, createdAt: gameEvents.createdAt })
    .from(gameEvents)
    .where(eq(gameEvents.roomId, room.id))
    .orderBy(desc(gameEvents.createdAt))
    .limit(20);

  return {
    room: { id: room.id, publicId: String(room.publicId) },
    game: game ? { id: game.id, state: game.state as any } : null,
    events: eventRows.map((e) => ({ type: e.type, createdAt: e.createdAt.toISOString() })),
    me,
  };
}

export async function action(args: Route.ActionArgs) {
  const roomPublicId = args.params.roomID;
  if (!roomPublicId) throw new Response("roomID is required", { status: 400 });

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const me = await new PlayerService(new PlayerRepository(dbClient as any)).requirePlayer(args.request);
  const form = await args.request.formData();
  const intent = String(form.get("intent") ?? "");

  const gameService = new GameService(dbClient);
  if (intent === "draw") {
    await gameService.applyIntent(roomPublicId, me.playerId, { type: "draw" });
    return null;
  }
  if (intent === "pass") {
    await gameService.applyIntent(roomPublicId, me.playerId, { type: "pass" });
    return null;
  }
  if (intent === "play") {
    const cardId = String(form.get("cardId") ?? "");
    if (!cardId) throw new Response("cardId required", { status: 400 });
    await gameService.applyIntent(roomPublicId, me.playerId, { type: "play", cardId });
    return null;
  }
  if (intent === "start") {
    await gameService.startGame(roomPublicId);
    return null;
  }

  throw new Response("Unknown intent", { status: 400 });
}

export default function GameRoute({ loaderData }: Route.ComponentProps) {
  const { room, game, events, me } = loaderData;
  const [realtimeEvents, setRealtimeEvents] = useState(events);
  const state = game?.state as any;
  const myHand = useMemo(() => {
    const hands = state?.hands ?? {};
    return (hands[me.playerId] ?? []) as Array<any>;
  }, [state, me.playerId]);

  const refreshEvents = useCallback(async () => {
    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("game_events")
        .select("type, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error || !data) return;
      setRealtimeEvents(
        data.map((row: any) => ({
          type: row.type,
          createdAt: new Date(row.created_at).toISOString(),
        })),
      );
    } catch {
      // env未設定など
    }
  }, [room.id]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof supabaseBrowser>["channel"]> | null = null;
    try {
      const supabase = supabaseBrowser();
      channel = supabase
        .channel(`game:${room.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "game_events", filter: `room_id=eq.${room.id}` },
          () => void refreshEvents(),
        )
        .subscribe();
    } catch {
      // env未設定など
    }

    return () => {
      channel?.unsubscribe();
    };
  }, [room.id, refreshEvents]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Game</h1>
        <Link className="text-sm underline" to={href("/rooms/:roomID", { roomID: room.publicId })}>
          Roomへ戻る
        </Link>
      </header>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">roomID: {room.publicId}</p>
        <p className="text-sm text-gray-600">
          player: {me.displayName} ({me.playerId})
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="flex gap-2 flex-wrap">
          <Form method="post">
            <input type="hidden" name="intent" value="start" />
            <button className="px-3 py-1 rounded bg-black text-white text-sm" type="submit">
              Start（未開始なら）
            </button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="draw" />
            <button className="px-3 py-1 rounded bg-gray-200 text-sm" type="submit">
              Draw
            </button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="pass" />
            <button className="px-3 py-1 rounded bg-gray-200 text-sm" type="submit">
              Pass
            </button>
          </Form>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">My Hand</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {myHand.map((c) => (
            <Form key={c.id} method="post" className="p-2 rounded border bg-white space-y-1">
              <div className="text-sm font-medium">
                {c.color} {c.number}
              </div>
              <div className="text-xs text-gray-600">{c.abilityName ?? "-"}</div>
              <input type="hidden" name="intent" value="play" />
              <input type="hidden" name="cardId" value={c.id} />
              <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" type="submit">
                Play
              </button>
            </Form>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">State（暫定）</h2>
        <pre className="p-3 bg-gray-50 rounded text-xs overflow-x-auto">{JSON.stringify(game?.state ?? {}, null, 2)}</pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Events（Realtime）</h2>
        <ul className="text-sm space-y-1">
          {realtimeEvents.map((e, idx) => (
            <li key={`${e.createdAt}-${idx}`} className="text-gray-700">
              {e.createdAt} - {e.type}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

