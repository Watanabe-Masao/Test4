# 仕入粗利管理ツール (shiire-arari)

小売業向けの仕入・粗利管理ダッシュボードアプリケーションです。Excel/CSV ファイルから仕入・売上・値引・予算・振替などのデータを取り込み、在庫法粗利・推計法棚卸・予算分析・予測などの KPI を自動計算し、ダッシュボードとチャートで可視化します。

## 主な機能

- **データ取り込み** -- Excel (.xlsx) / CSV ファイルのドラッグ＆ドロップによるインポート（仕入、売上、値引、予算、振替、消耗品など）
- **粗利計算** -- 在庫法（棚卸法）粗利、推計法棚卸高の自動算出
- **予算分析** -- 予算実績対比、予算差異トレンド分析
- **売上予測** -- 過去データに基づく売上・粗利のフォーキャスト
- **多店舗対応** -- 店舗別・部門別・カテゴリ別の分析
- **時間帯分析** -- 時間帯別売上、ヒートマップ、前年比較
- **要因分解** -- シャープリー値ベースの売上変動要因分解（客数・点数・価格・構成比の4変数）
- **DuckDB-WASM 分析** -- ブラウザ内 SQL エンジンによる高速集計（23 クエリ関数、15 チャート）
- **説明責任** -- 全主要指標に計算式・入力値・ドリルダウンを付与（Explanation アーキテクチャ）
- **ダッシュボード** -- 10 種類のページ、42+ 種類のチャートコンポーネント（従来 27 種 + DuckDB 15 種）
- **オフライン動作** -- IndexedDB / localStorage によるブラウザ完結型（サーバー不要）
- **Undo/Redo** -- 操作の取り消し・やり直し対応
- **データエクスポート** -- 計算結果の書き出し

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---|---|---|
| UI ライブラリ | React | 19.2 |
| ビルドツール | Vite | 7.3 |
| 言語 | TypeScript | 5.9 |
| スタイリング | styled-components | 6.3 |
| チャート | Recharts | 3.7 |
| Excel パーサ | SheetJS (xlsx) | 0.18.5 |
| テスト | Vitest + React Testing Library | 4.0 / 16.3 |
| リンター | ESLint | 9.39 |
| 状態管理 | Zustand | 5.x |
| SQL エンジン | DuckDB-WASM | 1.33 |
| フォーマッタ | Prettier | 3.8 |

## ディレクトリ構成

```
Test4/
├── README.md                 # このファイル
├── CONTRIBUTING.md            # コントリビューションガイド
├── CHANGELOG.md               # 変更履歴
├── CLAUDE.md                  # AI 開発ルール
├── docs/                     # 詳細ドキュメント
│   ├── architecture.md        #   アーキテクチャ設計書
│   ├── api.md                 #   内部 API リファレンス
│   ├── calculation-engine.md  #   計算エンジン仕様書
│   ├── calculation-guide.md   #   計算式ユーザー解説
│   ├── data-models.md         #   データモデル
│   ├── ui-components.md       #   UI コンポーネント仕様書
│   ├── development-guide.md   #   開発ガイド
│   ├── file-import-guide.md   #   ファイルインポートガイド
│   ├── operations.md          #   運用ガイド
│   ├── security.md            #   セキュリティ
│   ├── faq.md                 #   FAQ
│   └── decisions/             #   ADR（意思決定記録）
│       └── 001-duckdb-wasm-integration.md
├── app/                      # アプリケーション本体
│   ├── README.md             # 開発者向け README
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/               # 静的アセット
│   └── src/
│       ├── domain/           # ドメイン層（モデル・計算ロジック）
│       │   ├── models/       #   エンティティ・値オブジェクト
│       │   ├── calculations/ #   粗利計算・予算分析・予測・要因分解
│       │   ├── repositories/ #   リポジトリインターフェース
│       │   └── constants/    #   定数定義
│       ├── application/      # アプリケーション層（状態管理・ユースケース）
│       │   ├── context/      #   React Context（レガシー互換）
│       │   ├── hooks/        #   カスタムフック（useDuckDBQuery 含む）
│       │   ├── stores/       #   Zustand ストア（data, settings, ui）
│       │   ├── usecases/     #   ユースケース（計算・インポート・説明責任・エクスポート）
│       │   ├── ports/        #   ポートインターフェース（ExportPort）
│       │   ├── services/     #   計算キャッシュ・ハッシュ
│       │   └── workers/      #   Web Worker（計算の非同期実行）
│       ├── infrastructure/   # インフラ層（外部 I/O）
│       │   ├── duckdb/       #   DuckDB-WASM（SQL エンジン・クエリモジュール）
│       │   ├── storage/      #   IndexedDB・差分計算
│       │   ├── fileImport/   #   ファイル読み込み
│       │   ├── dataProcessing/ # データ変換・加工
│       │   ├── i18n/         #   国際化（メッセージカタログ）
│       │   ├── pwa/          #   PWA サービスワーカー登録
│       │   └── export/       #   データエクスポート
│       └── presentation/     # プレゼンテーション層（UI）
│           ├── pages/        #   ページコンポーネント（10 ページ）
│           ├── components/   #   UI コンポーネント
│           │   ├── charts/   #     チャート（従来 27 種 + DuckDB 15 種）
│           │   ├── common/   #     共通 UI 部品
│           │   └── Layout/   #     レイアウト（AppShell, NavBar, Sidebar）
│           ├── hooks/        #   プレゼンテーション層フック
│           └── theme/        #   テーマ・スタイル定義
```

### アーキテクチャ（4 層構成）

```
Presentation → Application → Domain ← Infrastructure
```

Domain 層はどの層にも依存しない（依存性逆転の原則）。各層の責務は以下の通りです。

| 層 | 責務 |
|---|---|
| **Domain** | ビジネスモデル、計算ロジック（在庫法粗利、推計法棚卸、予算分析、予測、要因分解）。フレームワーク非依存 |
| **Application** | 状態管理（Zustand ストア）、カスタムフック、ユースケース、Web Worker |
| **Infrastructure** | IndexedDB 永続化、ファイル読み込み/書き出し、データ変換、DuckDB-WASM、i18n |
| **Presentation** | React コンポーネント、ページ、チャート、テーマ。描画のみを担当 |

設計思想の詳細（10 原則）は [CLAUDE.md](./CLAUDE.md) の「設計思想」セクションを参照してください。

## クイックスタート

### 前提条件

- **Node.js** >= 22.x
- **npm** >= 10.x

### インストール

```bash
cd app
npm install
```

### 開発サーバーの起動

```bash
cd app
npm run dev
```

ブラウザで `http://localhost:5173/Test4/` を開きます。

### ビルド

```bash
cd app
npm run build
```

ビルド成果物は `app/dist/` に出力されます。

### テスト

```bash
# テスト実行
cd app
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage
```

### リント・フォーマット

```bash
cd app
npm run lint
npm run format
npm run format:check
```

## デプロイ

GitHub Pages にデプロイされます。

- **URL**: `https://<username>.github.io/Test4/`
- **ベースパス**: `/Test4/`（`vite.config.ts` の `base` で設定）

`app/dist/` ディレクトリの内容を GitHub Pages に配信してください。

## ドキュメント

詳細なドキュメントは [`docs/`](./docs/) ディレクトリを参照してください。

- [アーキテクチャ設計書](./docs/architecture.md)
- [内部 API リファレンス](./docs/api.md)
- [計算エンジン仕様書](./docs/calculation-engine.md)
- [計算式ユーザー解説](./docs/calculation-guide.md)
- [UI コンポーネント仕様書](./docs/ui-components.md)
- [運用ガイド](./docs/operations.md)
- [セキュリティ](./docs/security.md)
- [FAQ](./docs/faq.md)
- [開発ガイド](./docs/development-guide.md)
- [ファイルインポートガイド](./docs/file-import-guide.md)
- [データモデル](./docs/data-models.md)
- [DuckDB-WASM 採用 ADR](./docs/decisions/001-duckdb-wasm-integration.md)

## ライセンス

MIT License
