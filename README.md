# 仕入粗利管理ツール (shiire-arari)

小売業向けの仕入・粗利管理ダッシュボードアプリケーションです。Excel/CSV ファイルから仕入・売上・値引・予算・振替などのデータを取り込み、在庫法粗利・推計法棚卸・予算分析・予測などの KPI を自動計算し、ダッシュボードとチャートで可視化します。

## 主な機能

- **データ取り込み** -- Excel (.xlsx) / CSV ファイルのドラッグ＆ドロップによるインポート（仕入、売上、値引、予算、振替、消耗品など）
- **粗利計算** -- 在庫法（棚卸法）粗利、推計法棚卸高の自動算出
- **予算分析** -- 予算実績対比、予算差異トレンド分析
- **売上予測** -- 過去データに基づく売上・粗利のフォーキャスト
- **多店舗対応** -- 店舗別・部門別・カテゴリ別の分析
- **時間帯分析** -- 時間帯別売上、ヒートマップ、前年比較
- **ダッシュボード** -- 10 種類のページ、27 種類のチャートコンポーネント
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
| フォーマッタ | Prettier | 3.8 |

## ディレクトリ構成

```
Test4/
├── README.md                 # このファイル
├── docs/                     # 詳細ドキュメント
│   └── requirements.md       # 要件定義
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
│       │   ├── calculations/ #   粗利計算・予算分析・予測
│       │   └── constants/    #   定数定義
│       ├── application/      # アプリケーション層（状態管理・ユースケース）
│       │   ├── context/      #   React Context + useReducer（14 アクション）
│       │   ├── hooks/        #   カスタムフック
│       │   └── services/     #   計算オーケストレーション・ファイルインポート
│       ├── infrastructure/   # インフラ層（外部 I/O）
│       │   ├── storage/      #   IndexedDB・差分計算
│       │   ├── fileImport/   #   ファイル読み込み
│       │   ├── dataProcessing/ # データ変換・加工
│       │   └── export/       #   データエクスポート
│       └── presentation/     # プレゼンテーション層（UI）
│           ├── pages/        #   ページコンポーネント（10 ページ）
│           ├── components/   #   UI コンポーネント
│           │   ├── charts/   #     チャートコンポーネント（27 種）
│           │   ├── common/   #     共通 UI 部品
│           │   └── Layout/   #     レイアウト（AppShell, NavBar, Sidebar）
│           └── theme/        #   テーマ・スタイル定義
```

### アーキテクチャ（4 層構成）

```
Domain（ドメイン） → Application（アプリケーション） → Infrastructure（インフラ） → Presentation（プレゼンテーション）
```

依存の方向は内側（Domain）から外側（Presentation）へ。各層の責務は以下の通りです。

| 層 | 責務 |
|---|---|
| **Domain** | ビジネスモデル、計算ロジック（在庫法粗利、推計法棚卸、予算分析、予測） |
| **Application** | 状態管理（Context + useReducer）、カスタムフック、サービスオーケストレーション |
| **Infrastructure** | IndexedDB 永続化、ファイル読み込み/書き出し、データ変換 |
| **Presentation** | React コンポーネント、ページ、チャート、テーマ |

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

- [要件定義](./docs/requirements.md)

## ライセンス

MIT License
