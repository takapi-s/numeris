import { Form, Link, href, redirect } from "react-router";
import { db } from "@packages/db/client.server";
import { rooms, roomPlayers } from "@packages/db/schemas";
import { desc, inArray } from "drizzle-orm";
import type { Route } from "./+types/index";
import { DeckService } from "../domain/DeckService";
import { PlayerService } from "../domain/PlayerService";
import { DeckRepository } from "../domain/repositories/DeckRepository";
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
  const activeDeck = me
    ? await new DeckService(new DeckRepository(dbClient)).ensureStarterDeck(me.playerId)
    : null;

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

  return { rooms: summaries, me, activeDeck };
}

export async function action(args: Route.ActionArgs) {
  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.requirePlayer(args.request);
  const activeDeck = await new DeckService(new DeckRepository(dbClient)).requireActiveDeck(me.playerId);
  const roomService = new RoomService(new RoomRepository(dbClient));

  const formData = await args.request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create_room") {
    const createdRoom = await roomService.createRoom(me.playerId, activeDeck.id);
    throw redirect(href("/rooms/:roomID", { roomID: String(createdRoom.publicId) }));
  }

  throw new Response("Bad Request", { status: 400 });
}

function formatRoomStatus(status: RoomSummary["status"]) {
  switch (status) {
    case "waiting":
      return { label: "募集中", tone: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25" };
    case "in_game":
      return { label: "対戦中", tone: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25" };
    case "finished":
      return { label: "終了", tone: "bg-zinc-500/15 text-zinc-200 ring-1 ring-zinc-400/25" };
  }
}

export default function IndexRoute({ loaderData }: Route.ComponentProps) {
  const { rooms: roomList, me, activeDeck } = loaderData;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[880px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-56 left-0 h-[520px] w-[820px] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <span className="text-sm font-semibold tracking-wide">N</span>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-300">Numeris</p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">ルームを選んで対戦</h1>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              to={href("/decks")}
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
            >
              デッキ
            </Link>
            <Link
              to={href("/player/setup")}
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
            >
              プレイヤー
            </Link>
          </nav>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur">
            <p className="text-sm font-medium text-zinc-200">クイックスタート</p>
            <p className="mt-1 text-sm text-zinc-300">
              ルーム作成または参加で、すぐにゲームを開始できます。
            </p>

            {!me ? (
              <div className="mt-4 rounded-xl bg-amber-500/10 p-4 ring-1 ring-amber-400/15">
                <p className="text-sm font-medium text-amber-100">プレイヤー名が未設定です</p>
                <p className="mt-1 text-sm text-amber-100/80">
                  先にプレイヤー名を設定すると、ルーム作成・参加ができます。
                </p>
                <div className="mt-3">
                  <Link
                    to={href("/player/setup")}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
                  >
                    プレイヤー名を設定
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Form method="post" action="?index" className="contents">
                  <input type="hidden" name="intent" value="create_room" />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-sky-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.15)_inset] transition hover:brightness-110 active:brightness-95"
                  >
                    新規ルームを作成
                  </button>
                </Form>
                <p className="mt-2 text-xs text-zinc-400">
                  参加可能なルームがなければ、作成して招待してください。
                </p>
                {activeDeck ? (
                  <p className="mt-2 text-xs text-zinc-500">現在の使用デッキ: {activeDeck.name}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">ルーム一覧</h2>
                <p className="mt-1 text-sm text-zinc-300">最大50件（新しい順）</p>
              </div>
              <div className="rounded-lg bg-black/30 px-3 py-2 text-xs text-zinc-300 ring-1 ring-white/10">
                合計 <span className="font-semibold text-zinc-100">{roomList.length}</span> 件
              </div>
            </div>

            {roomList.length === 0 ? (
              <div className="px-5 pb-6">
                <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
                  <p className="text-sm font-medium text-zinc-200">ルームがまだありません</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    まずは新規ルームを作成して、対戦を始めましょう。
                  </p>
                </div>
              </div>
            ) : (
              <ul className="grid gap-3 px-5 pb-6 sm:grid-cols-2">
                {roomList.map((room) => {
                  const isRoomFull = room.players >= 4;
                  const canJoin = !isRoomFull && room.status === "waiting" && Boolean(me);
                  const status = formatRoomStatus(room.status);

                  return (
                    <li
                      key={room.publicId}
                      className="group relative overflow-hidden rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 transition hover:bg-black/35"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-2xl" />
                      </div>

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}
                            >
                              {status.label}
                            </span>
                            {isRoomFull ? (
                              <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/25">
                                満室
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-zinc-100">
                            Room #{room.publicId}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            プレイヤー {room.players}/4
                          </p>
                        </div>

                        <button
                          type="button"
                          className={[
                            "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition",
                            canJoin
                              ? "bg-white text-zinc-950 hover:bg-zinc-100"
                              : "cursor-not-allowed bg-white/10 text-zinc-300 ring-1 ring-white/10",
                          ].join(" ")}
                          onClick={() => {
                            if (!canJoin) return;
                            window.location.href = href("/rooms/:roomID", { roomID: room.publicId });
                          }}
                          disabled={!canJoin}
                        >
                          参加
                        </button>
                      </div>

                      {!me ? (
                        <p className="relative mt-3 text-xs text-zinc-400">
                          参加するには「プレイヤー名を設定」が必要です。
                        </p>
                      ) : room.status !== "waiting" ? (
                        <p className="relative mt-3 text-xs text-zinc-400">
                          このルームは現在参加できません。
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
