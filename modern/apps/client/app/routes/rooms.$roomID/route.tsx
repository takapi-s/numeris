import { useEffect, useMemo, useState } from "react";
import { Form, Link, href, redirect } from "react-router";
import { db } from "@packages/db/client.server";
import { supabaseBrowser } from "../../lib/supabase.client";
import type { Route } from "./+types/route";
import { DeckService } from "../../domain/DeckService";
import { GameService } from "../../domain/GameService";
import { PlayerRepository } from "../../domain/repositories/PlayerRepository";
import { PlayerService } from "../../domain/PlayerService";
import { DeckRepository } from "../../domain/repositories/DeckRepository";
import { RoomRepository } from "../../domain/repositories/RoomRepository";
import { RoomService } from "../../domain/RoomService";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { PageShell } from "../../components/ui/PageShell";

export const meta: Route.MetaFunction = () => [{ title: "Room" }];

type LoaderData = {
  room: {
    id: number;
    publicId: string;
    status: "waiting" | "in_game" | "finished";
    selectedDeck: { id: string; name: string; baseTemplateName: string } | null;
  };
  players: Array<{ playerId: string; isOwner: boolean }>;
  me: { playerId: string; isOwner: boolean };
  availableDecks: Array<{ id: string; name: string; isActive: boolean; baseTemplateName: string }>;
};

export async function loader(args: Route.LoaderArgs): Promise<LoaderData> {
  const roomPublicId = args.params.roomID;
  if (!roomPublicId) throw new Response("roomID is required", { status: 400 });

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });

  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.requirePlayer(args.request);
  const deckRepo = new DeckRepository(dbClient);
  const deckService = new DeckService(deckRepo);
  const roomRepo = new RoomRepository(dbClient);

  const room = await roomRepo.getRoomByPublicId(roomPublicId);
  if (!room) throw new Response("Room not found", { status: 404 });

  const roomService = new RoomService(roomRepo);
  const joinedRoom = await roomService.joinRoomByPublicId(roomPublicId, me.playerId);

  // 参加していなければ参加（Supabase移行前提で、アクセス時に自動参加）
  const playerRows = await roomRepo.listRoomPlayers(joinedRoom.id);
  const meIsOwner = await roomRepo.isRoomOwner(joinedRoom.id, me.playerId);

  let selectedDeck = joinedRoom.selectedDeckId
    ? await deckRepo.getPlayerDeckById(joinedRoom.selectedDeckId)
    : null;
  if (!selectedDeck && joinedRoom.ownerPlayerId === me.playerId) {
    const fallbackDeck = await deckService.requireActiveDeck(me.playerId);
    await roomRepo.setSelectedDeckId(joinedRoom.id, fallbackDeck.id);
    selectedDeck = fallbackDeck;
  }

  const availableDecks = meIsOwner ? await deckRepo.listPlayerDecks(me.playerId) : [];

  return {
    room: {
      id: room.id,
      publicId: String(room.publicId),
      status: room.status,
      selectedDeck: selectedDeck
        ? {
            id: selectedDeck.id,
            name: selectedDeck.name,
            baseTemplateName: selectedDeck.baseTemplateName,
          }
        : null,
    },
    players: playerRows.map((p) => ({ playerId: String(p.playerId), isOwner: p.isOwner })),
    me: { playerId: me.playerId, isOwner: meIsOwner },
    availableDecks: availableDecks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      isActive: deck.isActive,
      baseTemplateName: deck.baseTemplateName,
    })),
  };
}

export async function action(args: Route.ActionArgs) {
  const roomPublicId = args.params.roomID;
  if (!roomPublicId) throw new Response("roomID is required", { status: 400 });

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.requirePlayer(args.request);
  const roomService = new RoomService(new RoomRepository(dbClient));
  const deckService = new DeckService(new DeckRepository(dbClient));

  const formData = await args.request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "leave_room") {
    return await roomService.leaveRoomByPublicId(roomPublicId, me.playerId);
  }

  const roomRepo = new RoomRepository(dbClient);
  const room = await roomRepo.getRoomByPublicId(roomPublicId);
  if (!room) throw new Response("Room not found", { status: 404 });
  const isOwner = await roomRepo.isRoomOwner(room.id, me.playerId);
  if (!isOwner) throw new Response("Forbidden", { status: 403 });

  if (intent === "select_deck") {
    const playerDeckId = String(formData.get("playerDeckId") ?? "");
    if (!playerDeckId) throw new Response("playerDeckId is required", { status: 400 });
    const deckRepo = new DeckRepository(dbClient);
    const ownedDeck = await deckRepo.getPlayerDeckForPlayer(me.playerId, playerDeckId);
    if (!ownedDeck) throw new Response("Deck not found", { status: 404 });

    await deckService.activateDeck(me.playerId, playerDeckId);
    await roomRepo.setSelectedDeckId(room.id, playerDeckId);
    throw redirect(href("/rooms/:roomID", { roomID: roomPublicId }));
  }

  if (intent !== "start_game") {
    throw new Response("Bad Request", { status: 400 });
  }

  await new GameService(dbClient).startGame(roomPublicId);
  throw redirect(href("/game/:roomID", { roomID: roomPublicId }));
}

export default function RoomRoute({ loaderData }: Route.ComponentProps) {
  const { room, players, me, availableDecks } = loaderData;
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
    <PageShell>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-300">Room</p>
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Room #{room.publicId}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={href("/")}>
            <Button variant="secondary" size="sm" type="button">
              Home
            </Button>
          </Link>
          <Link to={href("/game/:roomID", { roomID: room.publicId })}>
            <Button variant="ghost" size="sm" type="button">
              Game
            </Button>
          </Link>
        </div>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">参加メンバー</h2>
              <p className="mt-1 text-sm text-zinc-300">最大4人</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={room.status === "waiting" ? "success" : room.status === "in_game" ? "info" : "neutral"}>
                {room.status === "waiting" ? "募集中" : room.status === "in_game" ? "対戦中" : "終了"}
              </Badge>
              <Badge tone={displayPlayers.length >= 4 ? "danger" : "neutral"}>{displayPlayers.length}/4</Badge>
            </div>
          </CardHeader>

          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {displayPlayers.map((p) => {
                const isMe = p.playerId === playerId;
                return (
                  <li
                    key={p.playerId}
                    className={[
                      "rounded-2xl bg-black/30 p-4 ring-1 ring-white/10",
                      isMe ? "ring-sky-400/30" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {p.playerId}
                          {isMe ? <span className="ml-2 text-xs text-sky-200">(You)</span> : null}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {p.isOwner ? "Owner" : "Player"}
                        </p>
                      </div>
                      {p.isOwner ? <Badge tone="warning">Owner</Badge> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-100">使用デッキ</h2>
            <p className="mt-1 text-sm text-zinc-300">この部屋で使うデッキ</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-black/30 p-4 ring-1 ring-white/10">
              {room.selectedDeck ? (
                <>
                  <p className="text-sm font-semibold text-zinc-100">{room.selectedDeck.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    ベース: {room.selectedDeck.baseTemplateName}
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-400">デッキが未選択です。</p>
              )}
            </div>

            {me.isOwner ? (
              <div className="space-y-2">
                {availableDecks.map((deck) => (
                  <Form method="post" key={deck.id}>
                    <input type="hidden" name="intent" value="select_deck" />
                    <input type="hidden" name="playerDeckId" value={deck.id} />
                    <Button
                      variant={room.selectedDeck?.id === deck.id ? "primary" : "secondary"}
                      className="w-full justify-between"
                      type="submit"
                      disabled={room.status !== "waiting"}
                    >
                      <span>{deck.name}</span>
                      <span className="text-xs opacity-80">{deck.baseTemplateName}</span>
                    </Button>
                  </Form>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-100">操作</h2>
            <p className="mt-1 text-sm text-zinc-300">開始はオーナーのみ</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Form method="post" className="contents">
              <input type="hidden" name="intent" value="start_game" />
              <Button
                variant="primary"
                className="w-full"
                type="submit"
                disabled={
                  !me.isOwner ||
                  displayPlayers.length < 2 ||
                  room.status !== "waiting" ||
                  !room.selectedDeck
                }
              >
                ゲーム開始
              </Button>
            </Form>

            <Form method="post" className="contents">
              <input type="hidden" name="intent" value="leave_room" />
              <Button variant="danger" className="w-full" type="submit">
                退出
              </Button>
            </Form>

            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs text-zinc-300">
                オーナーは使用デッキを選択してからゲームを開始できます。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

