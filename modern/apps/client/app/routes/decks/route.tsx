import { Form, Link, href, redirect } from "react-router";
import { db } from "@packages/db/client.server";
import CardContent, { type Card } from "./components/CardContent";
import type { Route } from "./+types/route";
import { Button } from "../../components/ui/Button";
import { Card as UiCard, CardContent as UiCardContent, CardHeader } from "../../components/ui/Card";
import { PageShell } from "../../components/ui/PageShell";
import { PlayerService } from "../../domain/PlayerService";
import { PlayerRepository } from "../../domain/repositories/PlayerRepository";
import { DeckRepository } from "../../domain/repositories/DeckRepository";
import { DeckService } from "../../domain/DeckService";
import { Badge } from "../../components/ui/Badge";

export const meta: Route.MetaFunction = () => [{ title: "Deck" }];

type AbilitySummary = {
  abilityName: string;
  count: number;
  title: string;
};

type CardSummary = {
  cardTemplateId: string;
  count: number;
  color: string;
  number: number;
  slug: string;
};

type TemplateSummary = {
  id: string;
  slug: string;
  name: string;
  version: number;
  cardCount: number;
  abilityCount: number;
};

type PlayerDeckSummary = {
  id: string;
  name: string;
  isActive: boolean;
  baseTemplateSlug: string;
  baseTemplateName: string;
  cardCount: number;
  abilityCount: number;
};

type SelectedDeckDetail = {
  kind: "template" | "player";
  id: string;
  name: string;
  subtitle: string;
  cards: Card[];
  abilityCounts: AbilitySummary[];
};

function buildPreviewCards(cardRows: CardSummary[], abilityRows: AbilitySummary[]): Card[] {
  const cards: Card[] = [];
  let seq = 0;
  for (const row of cardRows) {
    for (let i = 0; i < row.count; i++) {
      cards.push({
        id: seq++,
        color: row.color,
        number: row.number,
      });
    }
  }

  const abilityPool = abilityRows
    .flatMap((row) =>
      Array.from({ length: row.count }, () => ({
        name: row.abilityName,
        title: row.title,
        number: 1,
      })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return cards.map((card, index) => ({
    ...card,
    ability: abilityPool[index],
  }));
}

export async function loader(args: Route.LoaderArgs) {
  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const playerService = new PlayerService(new PlayerRepository(dbClient));
  const me = await playerService.ensurePlayerFromSession(args.request);
  const deckRepo = new DeckRepository(dbClient);
  const deckService = new DeckService(deckRepo);
  const searchParams = new URL(args.request.url).searchParams;
  const selectedDeckId = searchParams.get("deck");
  const selectedTemplateSlug = searchParams.get("template");

  if (me) {
    await deckService.ensureStarterDeck(me.playerId);
  }

  const templates = await deckRepo.listDeckTemplates();
  const templateSummaries: TemplateSummary[] = [];
  for (const template of templates) {
    const cardRows = await deckRepo.listDeckTemplateCards(template.id);
    const abilityRows = await deckRepo.listDeckTemplateAbilities(template.id);
    templateSummaries.push({
      ...template,
      cardCount: cardRows.reduce((sum, row) => sum + row.count, 0),
      abilityCount: abilityRows.reduce((sum, row) => sum + row.count, 0),
    });
  }

  const playerDeckSummaries: PlayerDeckSummary[] = [];
  if (me) {
    const decks = await deckRepo.listPlayerDecks(me.playerId);
    for (const deck of decks) {
      const cardRows = await deckRepo.listPlayerDeckCards(deck.id);
      const abilityRows = await deckRepo.listPlayerDeckAbilities(deck.id);
      playerDeckSummaries.push({
        id: deck.id,
        name: deck.name,
        isActive: deck.isActive,
        baseTemplateSlug: deck.baseTemplateSlug,
        baseTemplateName: deck.baseTemplateName,
        cardCount: cardRows.reduce((sum, row) => sum + row.count, 0),
        abilityCount: abilityRows.reduce((sum, row) => sum + row.count, 0),
      });
    }
  }

  let selectedDetail: SelectedDeckDetail | null = null;
  if (me && selectedDeckId) {
    const playerDeck = await deckRepo.getPlayerDeckForPlayer(me.playerId, selectedDeckId);
    if (playerDeck) {
      const cardRows = await deckRepo.listPlayerDeckCards(playerDeck.id);
      const abilityRows = await deckRepo.listPlayerDeckAbilities(playerDeck.id);
      selectedDetail = {
        kind: "player",
        id: playerDeck.id,
        name: playerDeck.name,
        subtitle: `ベース: ${playerDeck.baseTemplateName}`,
        cards: buildPreviewCards(cardRows, abilityRows),
        abilityCounts: abilityRows,
      };
    }
  } else if (selectedTemplateSlug) {
    const template = await deckRepo.getDeckTemplateBySlug(selectedTemplateSlug);
    if (template) {
      const cardRows = await deckRepo.listDeckTemplateCards(template.id);
      const abilityRows = await deckRepo.listDeckTemplateAbilities(template.id);
      selectedDetail = {
        kind: "template",
        id: template.id,
        name: template.name,
        subtitle: `テンプレート: ${template.slug}`,
        cards: buildPreviewCards(cardRows, abilityRows),
        abilityCounts: abilityRows,
      };
    }
  }

  return {
    me,
    templates: templateSummaries,
    playerDecks: playerDeckSummaries,
    selectedDetail,
  };
}

export async function action(args: Route.ActionArgs) {
  const dbClient = db({ DATABASE_URL: args.context.cloudflare.env.HYPERDRIVE.connectionString });
  const me = await new PlayerService(new PlayerRepository(dbClient)).requirePlayer(args.request);
  const deckRepo = new DeckRepository(dbClient);
  const deckService = new DeckService(deckRepo);
  const formData = await args.request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "set_active_deck") {
    const playerDeckId = String(formData.get("playerDeckId") ?? "");
    if (!playerDeckId) {
      throw new Response("playerDeckId is required", { status: 400 });
    }
    await deckService.activateDeck(me.playerId, playerDeckId);
    throw redirect(`${href("/decks")}?deck=${playerDeckId}`);
  }

  throw new Response("Bad Request", { status: 400 });
}

export default function DecksRoute({ loaderData }: Route.ComponentProps) {
  const { me, templates, playerDecks, selectedDetail } = loaderData;

  return (
    <PageShell>
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-300">Deck</p>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">デッキ一覧</h1>
        </div>
        <Link to={href("/")}>
          <Button variant="secondary" size="sm" type="button">
            Home
          </Button>
        </Link>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <UiCard>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-100">テンプレート</h2>
              <p className="mt-1 text-sm text-zinc-300">DBで管理される共通デッキ定義</p>
            </CardHeader>
            <UiCardContent>
              <ul className="space-y-3">
                {templates.map((template) => (
                  <li key={template.id}>
                    <Link
                      to={`${href("/decks")}?template=${template.slug}`}
                      className="block rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 transition hover:bg-black/35"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
                          <p className="mt-1 text-xs text-zinc-400">slug: {template.slug}</p>
                        </div>
                        <Badge tone="neutral">v{template.version}</Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                        <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                          カード: {template.cardCount}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                          能力: {template.abilityCount}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </UiCardContent>
          </UiCard>

          <UiCard>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-100">マイデッキ</h2>
              <p className="mt-1 text-sm text-zinc-300">
                {me ? "保存済みデッキ" : "プレイヤー設定後に利用できます"}
              </p>
            </CardHeader>
            <UiCardContent>
              {!me ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-zinc-400">
                  プレイヤー名を設定すると、自分のデッキを管理できます。
                </div>
              ) : (
                <ul className="space-y-3">
                  {playerDecks.map((deck) => (
                    <li key={deck.id} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`${href("/decks")}?deck=${deck.id}`} className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-100">{deck.name}</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            ベース: {deck.baseTemplateName}
                          </p>
                        </Link>
                        {deck.isActive ? <Badge tone="success">使用中</Badge> : null}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                        <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                          カード: {deck.cardCount}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                          能力: {deck.abilityCount}
                        </span>
                      </div>

                      {!deck.isActive ? (
                        <Form method="post" className="mt-3">
                          <input type="hidden" name="intent" value="set_active_deck" />
                          <input type="hidden" name="playerDeckId" value={deck.id} />
                          <Button variant="secondary" size="sm" className="w-full" type="submit">
                            使用デッキに設定
                          </Button>
                        </Form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </UiCardContent>
          </UiCard>
        </div>

        <UiCard className="lg:col-span-2">
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                {selectedDetail ? selectedDetail.name : "デッキ詳細"}
              </h2>
              <p className="mt-1 text-sm text-zinc-300">
                {selectedDetail ? selectedDetail.subtitle : "左からデッキを選ぶと詳細を表示します。"}
              </p>
            </div>
            {selectedDetail ? (
              <div className="rounded-lg bg-black/30 px-3 py-2 text-xs text-zinc-300 ring-1 ring-white/10">
                合計 <span className="font-semibold text-zinc-100">{selectedDetail.cards.length}</span> 枚
              </div>
            ) : null}
          </CardHeader>

          <UiCardContent className="space-y-5">
            {!selectedDetail ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
                <p className="text-sm font-medium text-zinc-200">デッキを選択してください</p>
                <p className="mt-1 text-sm text-zinc-400">
                  テンプレートまたはマイデッキを選ぶと、カード構成と能力構成が見られます。
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">カードプレビュー</h3>
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {selectedDetail.cards.map((card) => (
                      <li
                        key={card.id}
                        className="group rounded-2xl bg-black/30 p-3 ring-1 ring-white/10 transition hover:bg-black/35"
                      >
                        <CardContent card={card} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">能力構成</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectedDetail.abilityCounts.map((ability) => (
                      <li
                        key={ability.abilityName}
                        className="rounded-xl bg-black/30 p-4 ring-1 ring-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">{ability.title}</p>
                            <p className="mt-1 text-xs text-zinc-400">{ability.abilityName}</p>
                          </div>
                          <Badge tone="info">x{ability.count}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </UiCardContent>
        </UiCard>
      </section>
    </PageShell>
  );
}

