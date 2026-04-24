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
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { PageShell } from "../../components/ui/PageShell";

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
    <PageShell>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-300">Game</p>
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Room #{room.publicId}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={href("/rooms/:roomID", { roomID: room.publicId })}>
            <Button variant="secondary" size="sm" type="button">
              Room
            </Button>
          </Link>
          <Link to={href("/")}>
            <Button variant="ghost" size="sm" type="button">
              Home
            </Button>
          </Link>
        </div>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">My Hand</h2>
              <p className="mt-1 text-sm text-zinc-300">
                {me.displayName} <span className="text-zinc-500">({me.playerId})</span>
              </p>
            </div>
            <Badge tone={game ? "info" : "warning"}>{game ? "進行中" : "未開始"}</Badge>
          </CardHeader>

          <CardContent>
            {myHand.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
                <p className="text-sm font-medium text-zinc-200">手札がありません</p>
                <p className="mt-1 text-sm text-zinc-400">Draw でカードを引いてください。</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {myHand.map((c) => (
                  <Form
                    key={c.id}
                    method="post"
                    className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {c.color} {c.number}
                        </p>
                        <p className="mt-1 truncate text-xs text-zinc-400">{c.abilityName ?? "-"}</p>
                      </div>
                      <Badge tone="neutral" className="shrink-0">
                        #{String(c.id).slice(0, 4)}
                      </Badge>
                    </div>
                    <input type="hidden" name="intent" value="play" />
                    <input type="hidden" name="cardId" value={c.id} />
                    <div className="mt-3">
                      <Button variant="secondary" size="sm" className="w-full" type="submit">
                        Play
                      </Button>
                    </div>
                  </Form>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-100">Actions</h2>
              <p className="mt-1 text-sm text-zinc-300">ゲーム操作</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value="start" />
                <Button variant="primary" className="w-full" type="submit">
                  Start（未開始なら）
                </Button>
              </Form>
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value="draw" />
                <Button variant="secondary" className="w-full" type="submit">
                  Draw
                </Button>
              </Form>
              <Form method="post" className="contents">
                <input type="hidden" name="intent" value="pass" />
                <Button variant="ghost" className="w-full" type="submit">
                  Pass
                </Button>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Events</h2>
                <p className="mt-1 text-sm text-zinc-300">Realtime（直近20件）</p>
              </div>
              <Badge tone="neutral">{realtimeEvents.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {realtimeEvents.map((e, idx) => (
                  <li
                    key={`${e.createdAt}-${idx}`}
                    className="rounded-xl bg-black/30 p-3 ring-1 ring-white/10"
                  >
                    <p className="text-xs text-zinc-400">{e.createdAt}</p>
                    <p className="mt-1 font-semibold text-zinc-100">{e.type}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-100">State（暫定）</h2>
            <p className="mt-1 text-sm text-zinc-300">デバッグ表示</p>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-zinc-200 ring-1 ring-white/10">
              {JSON.stringify(game?.state ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

