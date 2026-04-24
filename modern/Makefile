# dotenvx の一括暗号化 / 復号（リポジトリルートで実行）
#
#   make env-encrypt-all    平文 .env → *.env.encrypt（.env は変更しない。出力が既存と同一なら *.env.encrypt は触らない）
#   make env-decrypt-all    *.env.encrypt → 平文 .env（.env.encrypt は変更しない）
#
#   または yarn env:encrypt-all / yarn env:decrypt-all
#
# 鍵ファイル: KEYS=/path/to/.env.keys（省略時はリポジトリルートの .env.keys）
#
# pipefail / trap を使うため bash を明示（/bin/sh が dash の環境でも動かす）

SHELL := /bin/bash

ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
KEYS ?= $(ROOT).env.keys

.PHONY: env-encrypt-all env-decrypt-all

# 平文 → 暗号化（git に載せる *.env.encrypt を更新する用途）
# dotenvx の encrypt は非決定なので ciphertext の比較は不適切。
# 既存 *.env.encrypt を復号し、平文 .env の KEY=value 行（ソート後）と一致すれば上書きしない。
env-encrypt-all:
	@set -e; \
	set -o pipefail; \
	cd "$(ROOT)"; \
	for pair in "packages/db/.env:packages/db/.env.encrypt" "apps/client/.env:apps/client/.env.encrypt"; do \
		plain=$${pair%%:*}; enc=$${pair##*:}; \
		if [ ! -f "$$plain" ]; then echo "skip: $$plain が無いためスキップします" >&2; continue; fi; \
		if [ -f "$$enc" ]; then \
			tmp_d=$$(mktemp); tmp_n1=$$(mktemp); tmp_n2=$$(mktemp); \
			trap 'rm -f "$$tmp_d" "$$tmp_n1" "$$tmp_n2"' EXIT INT TERM HUP; \
			npx dotenvx decrypt -fk "$(KEYS)" -f "$$enc" --stdout | \
			  grep -v '^#/' | grep -v '^DOTENV_PUBLIC_KEY=' | grep -v '^# \.env$$' | grep -v '^[[:space:]]*#' > "$$tmp_d"; \
			grep -v '^#/' "$$plain" | grep -v '^DOTENV_PUBLIC_KEY=' | grep -v '^# \.env$$' | grep -v '^[[:space:]]*#' | \
			  grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' | sed 's/^[[:space:]]*//' | LC_ALL=C sort > "$$tmp_n1"; \
			grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=' "$$tmp_d" | sed 's/^[[:space:]]*//' | LC_ALL=C sort > "$$tmp_n2"; \
			if cmp -s "$$tmp_n1" "$$tmp_n2"; then \
				rm -f "$$tmp_d" "$$tmp_n1" "$$tmp_n2"; \
				trap - EXIT INT TERM HUP; \
				echo "unchanged: $$enc"; \
				continue; \
			fi; \
			rm -f "$$tmp_d" "$$tmp_n1" "$$tmp_n2"; \
			trap - EXIT INT TERM HUP; \
		fi; \
		tmp=$$(mktemp); \
		trap 'rm -f "$$tmp"' EXIT INT TERM HUP; \
		npx dotenvx encrypt -fk "$(KEYS)" -f "$$plain" --stdout > "$$tmp"; \
		chmod 600 "$$tmp"; \
		mv "$$tmp" "$$enc"; \
		trap - EXIT INT TERM HUP; \
		echo "wrote $$enc"; \
	done; \
	echo "done."

# 復号 → 平文（ローカル編集用）
# 失敗時は既存 .env を壊さないよう、一時ファイルへ書いてから chmod 600 で置換する。
env-decrypt-all:
	@test -f "$(KEYS)" || (echo "error: .env.keys が見つかりません: $(KEYS)" >&2 && exit 1)
	@set -e; \
	set -o pipefail; \
	cd "$(ROOT)"; \
	for pair in "packages/db/.env.encrypt:packages/db/.env" "apps/client/.env.encrypt:apps/client/.env"; do \
		enc=$${pair%%:*}; out=$${pair##*:}; \
		if [ ! -f "$$enc" ]; then echo "skip: $$enc が無いためスキップします" >&2; continue; fi; \
		tmp_out=$$(mktemp); \
		trap 'rm -f "$$tmp_out"' EXIT INT TERM HUP; \
		{ echo '# このファイルは Makefile の env-decrypt-all（yarn env:decrypt-all）が生成しました。'; \
		  echo '# .env.encrypt を編集したあと、再生成するか手で直してください。'; echo ''; \
		  npx dotenvx decrypt -fk "$(KEYS)" -f "$$enc" --stdout | \
		  grep -v '^#/' | grep -v '^DOTENV_PUBLIC_KEY=' | grep -v '^# \.env$$' | \
		  grep -Fvx '# このファイルは Makefile の env-decrypt-all（yarn env:decrypt-all）が生成しました。' | \
		  grep -Fvx '# .env.encrypt を編集したあと、再生成するか手で直してください。'; \
		} > "$$tmp_out"; \
		chmod 600 "$$tmp_out"; \
		mv "$$tmp_out" "$$out"; \
		trap - EXIT INT TERM HUP; \
		echo "wrote $$out"; \
	done; \
	echo "done."
