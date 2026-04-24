import { Form, redirect } from "react-router";
import { db } from "@packages/db/client.server";
import { DeckService } from "../../domain/DeckService";
import { PlayerRepository } from "../../domain/repositories/PlayerRepository";
import { DeckRepository } from "../../domain/repositories/DeckRepository";
import { commitSession, getSession } from "../../lib/session.server";
import type { Route } from "./+types/route";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PageShell } from "../../components/ui/PageShell";

export const meta: Route.MetaFunction = () => [{ title: "Player Setup" }];

export async function loader(args: Route.LoaderArgs) {
  const session = await getSession(args.request);
  if (session.get("playerId") && session.get("displayName")) {
    throw redirect("/");
  }
  return {};
}

export async function action(args: Route.ActionArgs) {
  const existingSession = await getSession(args.request);
  if (existingSession.get("playerId") && existingSession.get("displayName")) {
    throw redirect("/");
  }

  const formData = await args.request.formData();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    return { error: "名前を入力してください" };
  }

  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const repo = new PlayerRepository(dbClient);
  const created = await repo.createPlayer(displayName);
  if (!created) throw new Response("Failed to create player", { status: 500 });
  await new DeckService(new DeckRepository(dbClient)).ensureStarterDeck(created.id);

  const session = await getSession(args.request);
  session.set("playerId", created.id);
  session.set("displayName", created.displayName);

  throw redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function PlayerSetupRoute({ actionData }: Route.ComponentProps) {
  const error = actionData && "error" in actionData ? (actionData as any).error : undefined;

  return (
    <PageShell>
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-300">Player</p>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">プレイヤー設定</h1>
        </div>
      </header>

      <div className="mt-6 grid place-items-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-100">表示名</h2>
            <p className="mt-1 text-sm text-zinc-300">ルーム作成・参加に使用します。</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? (
              <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-100 ring-1 ring-rose-400/20">
                {error}
              </div>
            ) : null}

            <Form method="post" className="space-y-3">
              <Input name="displayName" placeholder="例: takapi" maxLength={32} required autoFocus />
              <Button variant="primary" className="w-full" type="submit">
                はじめる
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

