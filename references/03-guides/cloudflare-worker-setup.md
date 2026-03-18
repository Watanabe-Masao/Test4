# Cloudflare Worker セットアップガイド

## なぜ必要か

このアプリは気象庁のAPI（`www.jma.go.jp` / `www.data.jma.go.jp`）からデータを取得する。
しかし気象庁APIには **CORS ヘッダーがない** ため、ブラウザから直接アクセスすると
セキュリティポリシーでブロックされる（404エラーの原因）。

**解決策:** Cloudflare Worker を中継サーバー（プロキシ）として間に置く。

```
ブラウザ → Cloudflare Worker（CORS ヘッダー付与）→ 気象庁API
         ↑ ここを自分で用意する
```

## 全体像

| 要素 | 役割 |
|---|---|
| `workers/jma-proxy/` | プロキシのソースコード |
| `.github/workflows/deploy-worker.yml` | main にマージされたら自動デプロイ |
| GitHub Secrets | Cloudflare の認証情報（トークン・アカウントID） |
| `VITE_JMA_PROXY_URL` | アプリがプロキシの URL を知るための環境変数 |

## セットアップ手順

### ステップ 1: Cloudflare アカウント作成（無料）

1. https://dash.cloudflare.com/sign-up を開く
2. メールアドレスとパスワードで登録

### ステップ 2: API トークンを発行

API トークン = Cloudflare に「GitHub Actions からのデプロイを許可する」ための鍵。

1. https://dash.cloudflare.com/profile/api-tokens を開く
2. 「Create Token」をクリック
3. **「Edit Cloudflare Workers」** テンプレートの「Use template」をクリック
4. Account Resources → **Include** → 自分のアカウントを選択
5. Zone Resources → **Include** → **All zones**
6. 「Continue to summary」→「Create Token」
7. **表示されたトークンをコピーして安全な場所に保存**
   - ⚠️ このトークンは一度しか表示されない
   - 紛失したら再発行が必要

### ステップ 3: Account ID を確認

Account ID = 自分の Cloudflare アカウントを識別する32文字の英数字。

1. https://dash.cloudflare.com を開く
2. 左メニューの「Workers & Pages」をクリック
3. ページ右側（またはスクロール下部）に **Account ID** が表示される
4. コピーする

> **ヒント:** ダッシュボードの URL が `dash.cloudflare.com/xxxxxxxx.../` の形式になっている場合、
> `xxxxxxxx...` の部分が Account ID。

### ステップ 4: GitHub Secrets に登録

GitHub Secrets = リポジトリに安全に保存される秘密の値。コードには書かない。

1. GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
2. 「New repository secret」で以下を登録:

| Name | Value | 説明 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ステップ2のトークン | デプロイ認証用 |
| `CLOUDFLARE_ACCOUNT_ID` | ステップ3のAccount ID | アカウント識別用 |

### ステップ 5: PR をマージしてデプロイ

1. `claude/fix-weather-api-404-*` ブランチの PR を **Merge** する
2. GitHub Actions が自動で Cloudflare Worker をデプロイする
3. Actions タブでデプロイログを確認

### ステップ 6: Worker URL を登録

初回デプロイ後、Cloudflare が Worker の URL を発行する。

1. https://dash.cloudflare.com → Workers & Pages → `jma-proxy` をクリック
2. Worker の URL を確認（例: `https://jma-proxy.xxxxx.workers.dev`）
3. GitHub Secrets に追加:

| Name | Value |
|---|---|
| `VITE_JMA_PROXY_URL` | `https://jma-proxy.xxxxx.workers.dev` |

> この URL はアプリのビルド時に埋め込まれ、気象庁APIへのリクエストが
> この Worker 経由で行われるようになる。

## プロキシの仕組み

`workers/jma-proxy/src/index.ts` が中継ロジックの本体。

### ルーティング

| リクエストパス | 転送先 | 用途 |
|---|---|---|
| `/bosai/amedas/*` | `www.jma.go.jp` | AMeDAS（気温・降水量など） |
| `/bosai/forecast/*` | `www.jma.go.jp` | 天気予報 |
| `/bosai/common/*` | `www.jma.go.jp` | マスタデータ |
| `/stats/etrn/*` | `www.data.jma.go.jp` | 過去の気象データ |

### 処理フロー

```
1. ブラウザからリクエストを受け取る
2. パスからルーティング先を決定（上記テーブル）
3. 気象庁APIにリクエストを転送
4. レスポンスに CORS ヘッダーを付与して返す
5. キャッシュ制御: 予報=5分、過去データ=1時間
```

### セキュリティ

- GET リクエストのみ許可（POST 等は 405 で拒否）
- 許可されたパスプレフィックス以外は 403 で拒否
- CORS preflight（OPTIONS）に対応

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| Actions でデプロイ失敗 | Secrets の値が間違っている | `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を再確認 |
| アプリで気象データが取得できない | `VITE_JMA_PROXY_URL` 未設定 | ステップ6を実行 |
| Worker URL にアクセスすると 403 | パスが許可リストにない | `/bosai/` または `/stats/etrn/` から始まるパスでアクセス |
| API トークンを紛失した | 表示は一度きり | Cloudflare で新しいトークンを再発行し、GitHub Secrets を更新 |

## 費用

Cloudflare Workers の無料プラン:
- **10万リクエスト/日** まで無料
- このアプリの用途では十分（気象データの取得は1日数十〜数百リクエスト程度）
