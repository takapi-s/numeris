import { Form, redirect } from "react-router";
import { db } from "@packages/db/client.server";
import { PlayerRepository } from "../../domain/repositories/PlayerRepository";
import { commitSession, getSession } from "../../lib/session.server";
import type { Route } from "./+types/route";

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
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">プレイヤー設定</h1>
      <p className="text-sm text-gray-600">表示名を設定してください。</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Form method="post" className="space-y-3">
        <input
          name="displayName"
          className="w-full border rounded px-3 py-2"
          placeholder="例: takapi"
          maxLength={32}
          required
        />
        <button className="px-3 py-2 rounded bg-blue-600 text-white" type="submit">
          はじめる
        </button>
      </Form>
    </div>
  );
}

