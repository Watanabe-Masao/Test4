# shiire-arari -- アプリケーション

仕入粗利管理ツールのフロントエンドアプリケーションです。React + TypeScript + Vite で構成されたシングルページアプリケーション（SPA）として動作し、ブラウザ上で完結するオフラインファーストの設計です。

## 概要

Excel/CSV ファイルから取り込んだ仕入・売上データをもとに、在庫法粗利・推計法棚卸・予算分析・売上予測などの KPI を算出し、ダッシュボードで可視化します。データはすべてブラウザの IndexedDB と localStorage に保存されるため、外部サーバーは不要です。

## npm スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | Vite 開発サーバーを起動（HMR 有効） |
| `npm run build` | TypeScript の型チェック後、Vite で本番ビルドを生成 |
| `npm run preview` | ビルド成果物をローカルでプレビュー |
| `npm run test` | Vitest でテストを一括実行 |
| `npm run test:watch` | Vitest をウォッチモードで実行 |
| `npm run test:coverage` | カバレッジレポート付きでテストを実行 |
| `npm run lint` | ESLint によるコード検査 |
| `npm run format` | Prettier でソースコードを整形 |
| `npm run format:check` | Prettier のフォーマット適合チェック（CI 向け） |

## 環境セットアップ

### 前提条件

- **Node.js** >= 22.x
- **npm** >= 10.x

### インストールと起動

```bash
npm install
npm run dev
```

開発サーバーが起動し、`http://localhost:5173/Test4/` でアクセスできます。

## パスエイリアス

`@/` が `src/` ディレクトリにマッピングされています。インポートパスを短く保つために活用してください。

```typescript
// 使用例
import { StoreResult } from '@/domain/models/StoreResult'
import { useCalculation } from '@/application/hooks/useCalculation'
```

この設定は以下の 3 ファイルで同期されています。

| ファイル | 設定項目 |
|---|---|
| `tsconfig.app.json` | `compilerOptions.paths` -- TypeScript の型解決 |
| `vite.config.ts` | `resolve.alias` -- Vite のバンドル解決 |
| `vitest.config.ts` | `resolve.alias` -- テスト実行時の解決 |

## テスト

テストフレームワークとして **Vitest** を、コンポーネントテストに **React Testing Library** を採用しています。

### 構成

| 項目 | 値 |
|---|---|
| テスト環境 | jsdom |
| セットアップファイル | `src/test/setup.ts` |
| テストファイルのパターン | `src/**/*.{test,spec}.{ts,tsx}` |
| IndexedDB モック | fake-indexeddb |
| グローバル API | 有効（`describe`, `it`, `expect` を import 不要で使用可能） |

### カバレッジ

カバレッジは V8 プロバイダで計測され、以下のディレクトリが対象です。

- `src/domain/**` -- ドメイン層（計算ロジック）
- `src/application/**` -- アプリケーション層（状態管理・フック）
- `src/infrastructure/**` -- インフラ層（永続化・ファイル I/O）

プレゼンテーション層（`src/presentation/`）はカバレッジ対象外ですが、チャートコンポーネントのテストは `src/presentation/components/charts/__tests__/` に配置されています。

### テストの実行

```bash
# 単発実行
npm run test

# ウォッチモード（ファイル変更時に自動再実行）
npm run test:watch

# カバレッジ付き
npm run test:coverage
```

## ビルド構成

### Vite 設定（`vite.config.ts`）

| 項目 | 値 | 説明 |
|---|---|---|
| `base` | `/Test4/` | GitHub Pages のデプロイパス |
| `plugins` | `@vitejs/plugin-react` | React Fast Refresh（Babel ベース） |
| `resolve.alias` | `@` → `src/` | パスエイリアス |
| `build.outDir` | `dist` | ビルド出力先 |
| `build.sourcemap` | `true` | ソースマップを生成 |

### TypeScript 設定（`tsconfig.app.json`）

| 項目 | 値 |
|---|---|
| `target` | ES2022 |
| `module` | ESNext |
| `moduleResolution` | bundler |
| `jsx` | react-jsx |
| `strict` | true |
| `lib` | ES2022, DOM, DOM.Iterable |

`strict` モードに加え、`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch` など厳格なリンティングオプションが有効です。

## ブラウザサポート

本アプリケーションは以下のブラウザ API に依存しています。

| API | 用途 |
|---|---|
| **IndexedDB** | 月次データの永続化（メインストレージ） |
| **localStorage** | 設定・UI 状態の保存 |
| **File API / Drag & Drop** | Excel/CSV ファイルの読み込み |
| **ES2022** | ビルドターゲット |

対応ブラウザの目安:

- Chrome / Edge >= 94
- Firefox >= 93
- Safari >= 15.4

Internet Explorer には対応していません。

## ディレクトリ構成

```
src/
├── domain/               # ドメイン層
│   ├── models/           #   データモデル（15 ファイル）
│   ├── calculations/     #   計算ロジック（粗利、棚卸、予算、予測など）
│   └── constants/        #   定数
├── application/          # アプリケーション層
│   ├── context/          #   AppStateContext（React Context + useReducer、14 アクション）
│   ├── hooks/            #   カスタムフック（13 フック）
│   └── services/         #   CalculationOrchestrator, FileImportService
├── infrastructure/       # インフラ層
│   ├── storage/          #   IndexedDBStore, diffCalculator
│   ├── fileImport/       #   ファイル読み込み処理
│   ├── dataProcessing/   #   データ変換・加工
│   └── export/           #   エクスポート処理
├── presentation/         # プレゼンテーション層
│   ├── pages/            #   ページコンポーネント（10 ページ）
│   │   ├── Dashboard/    #     メインダッシュボード
│   │   ├── Daily/        #     日次分析
│   │   ├── Category/     #     カテゴリ分析
│   │   ├── Analysis/     #     詳細分析
│   │   ├── Forecast/     #     売上予測
│   │   ├── Summary/      #     サマリー
│   │   ├── Reports/      #     レポート
│   │   ├── Transfer/     #     振替管理
│   │   ├── Consumable/   #     消耗品管理
│   │   └── Admin/        #     管理設定
│   ├── components/
│   │   ├── charts/       #     チャートコンポーネント（27 種）
│   │   ├── common/       #     共通 UI 部品（Button, Card, Modal, Toast など）
│   │   └── Layout/       #     レイアウト（AppShell, NavBar, Sidebar）
│   └── theme/            #   テーマ定義・デザイントークン
├── test/                 # テストセットアップ
├── App.tsx               # ルートコンポーネント
└── main.tsx              # エントリポイント
```
