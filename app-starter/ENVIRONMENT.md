### dotenvx による環境変数運用

このプロジェクトでは、`@apps/client` と `@packages/db` の環境変数を **dotenvx で暗号化して Git 共有** する運用とします。

暗号化キーは **リポジトリルートの `.env.keys` に集約** し、Git には絶対にコミットしません。

---

### ファイル構成

- ルート
  - `.env.keys`  
    - dotenvx が自動生成する **復号キー**。  
    - **Git 管理外**（`.gitignore` で無視）。

- `packages/db`
  - `.env.example`  
    - DB 接続用環境変数のサンプル。
  - `.env`  
    - 開発用の **平文 env**。ローカル専用、Git 管理外。  
    - 例:  
      ```text
      DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
      REMOTE_DATABASE_URL=
      ```
  - `.env.encrypt`  
    - `.env` を暗号化したファイル。  
    - Git 管理対象。

- `apps/client`
  - `.env.example`  
    - Client 用環境変数のサンプル（`packages/db/.env.example` と同様）。
  - `.env`  
    - 開発用の **平文 env**。ローカル専用、Git 管理外。  
    - Wrangler / Vite のローカル開発では **`.env` を読み込み**ます（[ドキュメント](https://developers.cloudflare.com/changelog/2025-08-08-dot-env-in-local-dev/)）。従来の `.dev.vars` と **どちらか一方**にしてください（両方あると `.dev.vars` が優先されます）。
  - `.env.local`（任意）  
    - マシン固有の上書き。Git 管理外。
  - `.env.encrypt`  
    - `.env` を暗号化したファイル。  
    - Git 管理対象。

**補足（dotenvx の鍵名）:** `packages/db/.env` と `apps/client/.env` はどちらもファイル名が `.env` のため、dotenvx 上は同じ **`DOTENV_PUBLIC_KEY` / `DOTENV_PRIVATE_KEY`**（ルートの `.env.keys` 内の 1 組）を共有します。以前 `.dev.vars` を使っていた場合は `DOTENV_PRIVATE_KEY_VARS` が `.env.keys` に残ることがありますが、`.env` に移行後は未使用なら削除して構いません。

---

### 暗号化フロー（開発環境）

すべて **リポジトリルート** で実行します（`.env.keys` をルートに集約するため）。

- **一括（DB + Client）**  
  1. 各パッケージの平文 `.env` を編集する。  
  2. 暗号化して `*.env.encrypt` を更新:
     ```bash
     yarn env:encrypt-all
     # または make env-encrypt-all
     ```
  - 対象ペアは **ルートの `Makefile` の `env-encrypt-all`** 内で追加・変更できます。平文 `.env` が無いパスはスキップされます。
  - **平文の `KEY=value` の集合が、既存 `*.env.encrypt` を復号した結果と同じなら、上書きしません**（dotenvx の暗号化は非決定のため、暗号ファイルのバイト列では比較しません）。

- **個別**
  - DB のみ: `yarn db:encrypt-env`（内部は `npx dotenvx encrypt -fk .env.keys -f packages/db/.env --stdout > packages/db/.env.encrypt`）
  - Client のみ: `yarn client:encrypt-env`（内部は `npx dotenvx encrypt -fk .env.keys -f apps/client/.env --stdout > apps/client/.env.encrypt`）

---

### 実行フロー

#### DB シード

暗号化済み `packages/db/.env.encrypt` と ルートの `.env.keys` を使って seed スクリプトを実行します。

- マスターデータ投入:

```bash
yarn db:seed-master-data
```

- サンプルテナント投入:

```bash
yarn db:seed-sample-tenants
```

これらのコマンドは内部的に:

```bash
npx dotenvx run -f packages/db/.env.encrypt -- yarn workspace @packages/db tsx ...
```

という形で **dotenvx が復号 → `process.env` に注入 → tsx 実行** という流れになっています。

#### Client 開発サーバー

暗号化済み `apps/client/.env.encrypt` と ルートの `.env.keys` を使って dev サーバーを起動します。

```bash
yarn client:dev:dotenvx
```

内部的には:

```bash
npx dotenvx run -f apps/client/.env.encrypt -- yarn workspace @apps/client dev
```

ローカルで自分だけ使う場合は、`.env.local` を置くか平文の `.env` のみ使い、暗号化せず `yarn workspace @apps/client dev` を直接実行しても構いません。

#### 平文 `.env` への一括復号（編集用）

暗号化ファイルはそのままにし、`packages/db/.env` と `apps/client/.env` をまとめて書き出します（**平文 `.env` を上書き**します。`.env.encrypt` は変更しません）。

```bash
yarn env:decrypt-all
# または
make env-decrypt-all
```

ルートの `.env.keys` が必要です。対象の「暗号化ファイル → 平文 `.env`」のペアは **ルートの `Makefile` の `env-decrypt-all` ターゲット内**で追加・変更できます（`KEYS=` で鍵ファイルのパスも上書き可能）。`npx dotenvx decrypt -f …/.env.encrypt` を **`--stdout` なしで**実行すると、**対象ファイルが in-place で平文化**されるため、平文だけ欲しいときはこのターゲットか `decrypt --stdout > …` を使ってください。

復号は **一時ファイルに書き終えてから `mv` で置き換え**（失敗時は既存 `.env` を壊さない）し、**`chmod 600`** を付けます。`Makefile` は **`pipefail`** により `dotenvx` の失敗を握りつぶしません（`bash` で実行）。

---

### Git / 共有ポリシー

- **コミットして良いもの**
  - `packages/db/.env.example`
  - `packages/db/.env.encrypt`
  - `apps/client/.env.example`
  - `apps/client/.env.encrypt`

- **コミットしてはいけないもの**
  - ルートの `.env.keys`
  - `packages/db/.env`
  - `apps/client/.env` / `apps/client/.env.local`

`.gitignore` には以下が設定されています（暗号化済み `*.encrypt` は Git 管理対象のため ignore していません）:

```text
.env.keys
**/.env
**/.env.local
**/.dev.vars
```

---

### 検証シナリオ

1. **DB シードの検証**
   - `packages/db/.env.local.development` に正しい `DATABASE_URL` を設定。
   - `yarn db:encrypt-env:development` を実行して `.env.development.encrypt` を生成。
   - `yarn db:seed-master-data` と `yarn db:seed-sample-tenants` を実行し、エラーなく完了することを確認。
   - 実際に DB を確認し、想定どおりデータが投入されていることを確認。

2. **Client 開発サーバーの検証**
   - `apps/client/.env` に必要な値を設定。
   - `yarn client:encrypt-env` を実行して `.env.encrypt` を生成。
   - `yarn client:dev:dotenvx` を実行し、開発サーバーが起動することを確認。
   - 必要であれば、環境変数を参照する簡易 UI を用意して、期待どおりの値が反映されているか確認。

---

### 新規メンバー向けチェックリスト

1. リポジトリを clone する。
2. チームから **ルートの `.env.keys` と各パッケージの平文 env の内容** を安全な経路（パスワードマネージャ等）で受け取る。
3. ルートに `.env.keys` を保存する。
4. `packages/db/.env` と `apps/client/.env` を作成（または受け取った内容で上書き）。
5. 必要に応じて（平文を暗号化してコミットする場合）:
   - まとめて: `yarn env:encrypt-all`
   - または個別: `yarn db:encrypt-env` / `yarn client:encrypt-env`
6. 開発環境を起動:
   - DB シード: `yarn db:seed-master-data` / `yarn db:seed-sample-tenants`
   - Client dev: `yarn client:dev:dotenvx`

