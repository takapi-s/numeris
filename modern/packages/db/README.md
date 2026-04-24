# common

共通のデータベーススキーマとスクリプトを含むパッケージです。

## 環境変数

以下の環境変数を設定してください：

```bash
# データベース接続
DATABASE_URL=your_database_url

# Google AI API（Gemini 2.5 Flash用）
GOOGLE_AI_API_KEY=your_google_ai_api_key

# OpenAI API（既存スクリプト用）
OPENAI_API_KEY=your_openai_api_key
```

## スクリプト

### 企業情報更新（Gemini 2.5 Flash使用）

```bash
npm run update-companies-with-llm
```

このスクリプトは、Gemini 2.5 Flashを使用して企業情報を自動更新します。

**特徴:**

- コストパフォーマンスに優れたGemini 2.5 Flashを使用
- **Tier 1高速処理**: 1,000 RPMの制限を活用した高速処理
- 推論能力により高精度な企業情報取得
- **構造化出力**によりJSONレスポンスの信頼性を向上

**構造化出力の利点:**

- JSONパースエラーを大幅に削減
- 期待される形式での一貫したレスポンス
- スキーマ定義による型安全性の向上
- データ品質の向上

**Tier 1高速処理設定:**

- バッチサイズ: 50件（高速処理対応）
- 同時実行数: 15件（1,000 RPM活用）
- 処理間隔: 0.1秒（高速処理）
- 1,000,000 TPM制限内での最適化

**パフォーマンス設定:**

- バッチサイズ: 100件
- 同時実行数: 5件
- チャンク間待機: 1秒
