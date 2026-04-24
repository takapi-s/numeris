# app-starter

Cloudflare Workers + Supabase + Clerk + React Router v7 で動く、モノレポのアプリケーションスターターです。最小構成でサインイン〜ルーティング〜DB アクセス（Hyperdrive 経由）まで揃えてあり、各種設定名を変更してもそのまま動作するように構成しています。

## スタック概要

- React Router v7（SSR）
- Cloudflare Workers（Wrangler デプロイ、Hyperdrive で Postgres 接続）
- Supabase（Postgres 利用。Drizzle ORM でスキーマ定義）
- Clerk（メール/パスワード認証例）
- Monorepo（Yarn Workspaces）
- proto で Node/Yarn のバージョン固定（`.prototools`）

## リポジトリ構成（抜粋）

```
apps/
  client/              # Cloudflare Worker + React Router v7 のアプリ本体
    app/               # ルート、認証、UI など
    workers/app.ts     # Worker エントリ（fetch ハンドラ）
    wrangler.jsonc     # デプロイ設定（name, account_id, Hyperdrive など）
packages/
  db/                  # Drizzle のスキーマとシード
    schemas/           # tenants, users など
    seeds/             # サンプルシード（テナント・ユーザー）
    drizzle.config.ts  # Drizzle Kit 設定（出力先は supabase/migrations）
```

## 重要な前提・方針

- このテンプレートではマイグレーションを適用していません。DB はサンプルのスキーマ定義（`packages/db/schemas`）をベースにしています。
- Clerk / Cloudflare / Supabase など各 SaaS の初期設定はご自身のアカウントで実施してください（詳細は下記）。
- 設定や命名（サービス名、Worker 名、Hyperdrive ID など）を変更しても動くようにしてあります。変更点の反映箇所だけご確認ください（下記「名前を変えて使う」）。

## 必要環境

- Cloudflare アカウント（Wrangler ログイン済み）
- Supabase プロジェクト（Postgres 接続文字列）
- Clerk プロジェクト（Publishable Key / Secret Key）
- proto（Node/Yarn のバージョン管理）

`.prototools` でバージョンを固定しています：

```
node = "22.16.0"
yarn = "4.9.1"
```

proto を使う場合：

```bash
proto install   # 指定バージョンを取得
proto use       # カレントディレクトリで有効化
```

## クローン後の初期化と別リポジトリへの紐付け

1) 別リポジトリに紐付け（Git リモート）

- 既存のコミット履歴を「維持」して新しいリモートに変更する場合:

```bash
git remote -v
git remote remove origin
git remote add origin git@github.com:<your-org-or-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

- 履歴を「リセット」して最初のコミットから開始する場合:

```bash
rm -rf .git
git init
git add -A
git commit -m "chore: scaffold from app-starter"
git branch -M main
git remote add origin git@github.com:<your-org-or-user>/<your-repo>.git
git push -u origin main
```

2) クローン直後の初期化

```bash
# Node/Yarn を `.prototools` のバージョンで有効化
proto install && proto use

# 依存関係インストール（Git フックも自動セットアップされます）
yarn install

# 開発用環境変数（Clerk キー）
cp apps/client/.env.example apps/client/.env
# 値を書き換え
```

> `yarn install` 時に `prepare` スクリプトで lefthook が自動インストールされ、`pre-commit`（lint/format）と `pre-push`（typecheck）が有効になります。

3) 名前や設定の見直し（任意）

- Worker 名/Cloudflare アカウント/Hyperdrive ID などは `apps/client/wrangler.jsonc` を更新
- Binding 名を変更した場合はコード参照（`HYPERDRIVE`）も更新（例: `app/lib/auth.server.ts`）
- 詳細は「名前を変えて使う（Safe Rename）」セクションも参照

以降は「セットアップ（ローカル）」→「デプロイ」の順で進めれば動作します。

## セットアップ（ローカル）

1) 依存関係のインストール

```bash
yarn install
```

2) 環境変数（アプリ側）

`apps/client/.env.example` を `.env` にコピーして、Clerk のキーを設定します。

```bash
cp apps/client/.env.example apps/client/.env
# 必要に応じて値を書き換え
VITE_CLERK_PUBLISHABLE_KEY=...   # 公開キー（クライアント側）
CLERK_SECRET_KEY=...             # シークレット（サーバ側で使用）
```

3) データベース

- ローカルで Supabase（または任意の Postgres）を起動し、接続文字列を用意してください。
- 開発中は `wrangler.jsonc` の Hyperdrive `localConnectionString` が使われます（デフォルト: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`）。
- スキーマはサンプルのため、必要に応じてご自身でマイグレーション運用を追加してください。

4) サンプルデータ投入（任意）

```bash
# DATABASE_URL を環境変数で指定して実行（未指定時は 127.0.0.1:54322 を使用）
DATABASE_URL=postgresql://... \
yarn workspace @packages/db seed-sample-tenants
```

5) 開発サーバ起動

```bash
yarn dev
# （内部的には `@apps/*` の `dev` を並列実行）
# または特定ワークスペースのみ
yarn workspace @apps/client dev
```

`@apps/client` は `http://localhost:5173` 固定（`--strictPort`）で起動します。

## デプロイ（Cloudflare Workers）

1) Cloudflare 側の設定

- `apps/client/wrangler.jsonc` の `account_id` を自分のアカウントに変更
- Hyperdrive を作成し、`id` を設定（`binding` 名はコードで参照しています。既定は `HYPERDRIVE`）
- 本番の Secret として `CLERK_SECRET_KEY` を登録

2) ビルド＆デプロイ

```bash
yarn workspace @apps/client deploy
```

## 認証と権限

- Clerk を利用しています。`/login` でメール/パスワードのログイン例を実装。
- `app/root.tsx` の `loader` で認証ガードとリダイレクトを実装しています。
- `app/lib/auth.server.ts` で Clerk のユーザー ID をもとにアプリ用ユーザー（DB `users`）とテナントを解決します。
  - DB に対応するユーザーが存在しない場合は `null` を返し、`/unauthorized` に誘導します（サンプル運用）。

## DB（Drizzle ORM / Supabase Postgres）

- スキーマ: `packages/db/schemas/{tenants,users}.ts`
- クライアント: `packages/db/client.server.ts`（Hyperdrive の接続文字列を渡して利用）
- マイグレーション: 本テンプレートでは未実施です（`drizzle.config.ts` は用意済み）。
- サンプルシード: `yarn workspace @packages/db seed-sample-tenants`

補足（Cloudflare × Postgres の実用上の注意）:

- 接続回数・タイムアウトを避けるため、複数の DB 呼び出しを必要最小限にまとめる、1 クエリで可能な範囲は `with` などでまとめる、などを推奨します。

## 名前を変えて使う（Safe Rename）

変更してよい箇所と注意点の例:

- Worker 名: `apps/client/wrangler.jsonc` の `name`
- Cloudflare アカウント: `account_id`
- Hyperdrive: `hyperdrive[0].id` と `localConnectionString`
- Binding 名を変える場合は、コード内参照（`HYPERDRIVE`）も合わせて更新してください（例: `app/lib/auth.server.ts` の `env.HYPERDRIVE`）。

その他、パッケージ名や UI 文字列などは自由に変更可能です。

## Lint / Format

[Biome](https://biomejs.dev/) でモノレポ全体の lint + format を一元管理しています。設定はルートの `biome.json` に集約しています。

```bash
# モノレポ全体の lint（エラーは失敗、警告は通過）
yarn lint

# 自動修正付き lint
yarn lint:fix

# フォーマットチェック（CI 向け）
yarn format:check

# フォーマット適用
yarn format
```

### Git Hooks（lefthook）

| フック | 内容 |
|--------|------|
| `pre-commit` | ステージ済みファイルの lint/format（自動修正 + 再ステージ） |
| `pre-push` | 全 workspace の typecheck（依存順 + 並列実行） |

フックは `yarn install` 時に自動セットアップされます。手動で再セットアップする場合は:

```bash
npx lefthook install
```

## スクリプト一覧（抜粋）

- ルート
  - `yarn dev`（`@apps/*` の `dev` を並列起動）
  - `yarn build` / `yarn test`（全 workspace を依存順で実行）
  - `yarn lint` / `yarn lint:fix` / `yarn format` / `yarn format:check`
  - `yarn typecheck`（全 workspace の型チェックを依存順で実行）
- `@apps/client`
  - `dev`（`5173` 固定 / 開発サーバ起動）
  - `build`（本番ビルド）
  - `deploy`（Wrangler で Workers デプロイ）
  - `preview`（`4173` 固定 / ビルド結果プレビュー）
  - `typecheck`（型生成 + TS）
  - `lint` / `lint:fix`
- `@packages/db`
  - `seed-sample-tenants`（サンプルのテナント/ユーザー投入）
  - `typecheck`（型チェック）
  - `lint` / `lint:fix`

### Workspace 運用メモ（スケール時）

- `apps/*` から `packages/*` を import する場合は、`dependencies` に `"workspace:*"` で明示してください。
- ルートの `foreach run` は script 未定義 workspace をスキップします。新規 workspace 作成時は `build` / `typecheck` など必要 script を忘れず追加してください。
- `@apps/*` を増やす場合、各 workspace の `dev` / `preview` は必ず固有ポート（`--port` + `--strictPort`）を設定してください。

## 環境変数まとめ（開発）

- `apps/client/.env`（Wrangler / Vite がローカルで読み込み。詳細は `ENVIRONMENT.md`）
  - `VITE_CLERK_PUBLISHABLE_KEY`: Clerk 公開キー
  - `CLERK_SECRET_KEY`: Clerk シークレットキー（サーバ側で使用）
- `packages/db`
  - `DATABASE_URL`: Postgres 接続文字列（シードや Drizzle Kit で使用）

## packages/db の環境変数

- 必須: `DATABASE_URL`
  - Drizzle Kit（`packages/db/drizzle.config.ts`）とシードスクリプトで使用します。
  - Cloudflare Workers 本番実行時は Hyperdrive の接続を使うため、`DATABASE_URL` は参照しません（ローカルや CI での CLI 実行時に使用）。

- 設定場所の選択肢
  - `packages/db/.env` に記述（Drizzle Kit が読み込み）
  - またはコマンド実行時に環境変数として付与

- 例: ローカル Postgres（Supabase ローカルなど）

```bash
# packages/db/.env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

- 例: Supabase Postgres（推奨: SSL を有効化）

```bash
# packages/db/.env
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<project-ref>.supabase.co:5432/postgres
```

- .env の雛形を使う場合（`.env.example` を用意している想定）

```bash
cp packages/db/.env.example packages/db/.env
# 値を書き換え
```

- シード実行（`DATABASE_URL` を同時に指定する場合）

```bash
DATABASE_URL=postgresql://... \
yarn workspace @packages/db seed-sample-tenants
```

- 備考
  - `packages/db/seeds/seed-sample-tenants.ts` は `DATABASE_URL` 未設定時、`postgresql://postgres:postgres@127.0.0.1:54322/postgres` にフォールバックします。
  - マイグレーションは未適用のサンプル構成です。必要に応じて Drizzle Kit のコマンド（generate/migrate）をプロジェクト方針に合わせて整備してください。

## よくある質問（FAQ）

- Q. ログインはできたが `/unauthorized` に飛ばされる
  - A. DB 側に該当 Clerk ユーザーのレコードが無い可能性があります。サンプルシードを投入するか、`users` に必要な行を作成してください。
- Q. 本番のシークレットはどこに置く？
  - A. Cloudflare の Secrets（`wrangler secret put ...`）を使って登録してください。公開して良い値は `vars`、秘匿値は `secret` を使います。

---

何か不明点があれば Issue や PR でフィードバックをお願いします。Enjoy!
