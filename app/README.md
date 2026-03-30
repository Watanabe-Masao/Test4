# shiire-arari -- アプリケーション

仕入粗利管理ツールのフロントエンドアプリケーションです。React + TypeScript + Vite で構成されたシングルページアプリケーション（SPA）として動作し、ブラウザ上で完結するオフラインファーストの設計です。

## 概要

Excel/CSV ファイルから取り込んだ仕入・売上データをもとに、在庫法粗利・推計法棚卸・予算分析・売上予測などの KPI を算出し、ダッシュボードで可視化します。データはすべてブラウザの IndexedDB と localStorage に保存されるため、外部サーバーは不要です。

## npm スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | Vite 開発サーバーを起動（HMR 有効） |
| `npm run build` | TypeScript の型チェック（tsc -b）後、Vite で本番ビルドを生成 |
| `npm run preview` | ビルド成果物をローカルでプレビュー |
| `npm run test` | Vitest でテストを一括実行 |
| `npm run test:watch` | Vitest をウォッチモードで実行 |
| `npm run test:coverage` | カバレッジレポート付きでテストを実行（lines 55% 閾値） |
| `npm run test:guards` | 構造制約ガードテスト（~9秒、CI fast-gate） |
| `npm run test:observation` | 観測テスト（WASM 二重実行検証） |
| `npm run test:e2e` | Playwright E2E テスト |
| `npm run test:e2e:ui` | Playwright UI モード |
| `npm run test:visual` | ビジュアルリグレッションテスト |
| `npm run build:wasm` | WASM モジュールビルド（Rust → wasm-pack） |
| `npm run build-storybook` | Storybook ビルド |
| `npm run storybook` | Storybook 開発サーバー |
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

## アーキテクチャ

4層モデル: `Presentation → Application → Domain ← Infrastructure`

### 正本化体系（Canonicalization）

全ての業務値は `application/readModels/` に正本化されており、Zod runtime 契約で保護されています。

| 正本 | 関数 | 種類 |
|------|------|------|
| 仕入原価 | `readPurchaseCost()` | 取得 |
| 粗利 | `calculateGrossProfit()` | 計算 |
| 売上 | `readSalesFact()` | 取得 |
| 値引き | `readDiscountFact()` | 計算 |
| 要因分解 | `calculateFactorDecomposition()` | 計算 |

`useWidgetDataOrchestrator` が取得系3正本を統合し、`UnifiedWidgetContext.readModels` 経由で全 widget に配布します。

詳細は `CLAUDE.md` の「正本化体系（readModels）」セクションおよび `references/01-principles/canonicalization-principles.md` を参照。

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

カバレッジ閾値は `lines: 55%` に設定されています。WASM モジュールは型付きモック alias でテスト時に差し替えられます。

### 実行時ブートストラップ（`main.tsx`）

- **本番（production）**: Service Worker を登録（PWA オフライン対応）
- **開発（development）**: WASM 初期化 + dual-run 観測ハンドラ + 観測用グローバル関数を有効化

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
| `plugins` | `@vitejs/plugin-react`, `vite-plugin-wasm`, `vite-plugin-top-level-await`, sw-version | React Fast Refresh + WASM + SW ビルド |
| `resolve.alias` | `@` → `src/` | パスエイリアス |
| `build.outDir` | `dist` | ビルド出力先 |
| `build.sourcemap` | `true` | ソースマップを生成 |
| `build.rollupOptions` | `manualChunks` | ECharts / styled-components 等の分割最適化 |
| `optimizeDeps.exclude` | `@duckdb/duckdb-wasm` | DuckDB-WASM を事前最適化から除外 |
| `worker.rollupOptions` | Worker ビルド設定 | DuckDB Worker の分離ビルド |
| `server.proxy` | `/jma-data/*` → JMA | 開発時の気象庁 API プロキシ |

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

> **DuckDB Worker に関する注意**: Chrome/Edge では DuckDB-WASM がネストされた Web Worker で動作しますが、
> Firefox/Safari ではネストされた Worker がサポートされないため、メインスレッドにフォールバックします。
> 大量データの集計・探索クエリを多用する場合は Chrome/Edge を推奨します。

### 推奨データ量の目安

| 規模 | 店舗数 × 月数 | 目安レコード数 | 備考 |
|---|---|---|---|
| 小規模 | 〜5 店舗 × 12 ヶ月 | 〜10 万行 | すべてのブラウザで快適 |
| 中規模 | 〜20 店舗 × 12 ヶ月 | 〜50 万行 | Chrome/Edge 推奨 |
| 大規模 | 50 店舗以上 | 100 万行〜 | Chrome/Edge 必須、メモリ 8GB 以上推奨 |

- IndexedDB の容量上限はブラウザ設定に依存します（一般的に 50MB〜数 GB）
- OPFS（Origin Private File System）対応ブラウザではパーケットキャッシュにより再起動が高速化されます

## ディレクトリ構成

```
src/
├── domain/               # ドメイン層（フレームワーク非依存）
│   ├── models/           #   データモデル・型定義
│   ├── calculations/     #   計算ロジック（粗利、棚卸、予算、予測、要因分解など）
│   ├── repositories/     #   リポジトリインターフェース
│   └── constants/        #   定数
├── application/          # アプリケーション層
│   ├── context/          #   React Context（レガシー互換）
│   ├── hooks/            #   カスタムフック（useDuckDBQuery 含む 20+ フック）
│   ├── stores/           #   Zustand ストア（dataStore, settingsStore, uiStore）
│   ├── readModels/       #   正本化 ReadModels（purchaseCost, grossProfit, salesFact, discountFact, factorDecomposition）
│   ├── usecases/         #   ユースケース
│   │   ├── calculation/  #     計算パイプライン（dailyBuilder, storeAssembler）
│   │   ├── explanation/  #     説明責任（ExplanationService）
│   │   ├── import/       #     ファイルインポート（FileImportService）
│   │   ├── export/       #     データエクスポート
│   │   ├── categoryTimeSales/ # カテゴリ時間帯集約
│   │   └── departmentKpi/ #    部門 KPI インデックス
│   ├── ports/            #   ポートインターフェース（ExportPort）
│   ├── services/         #   計算キャッシュ・ハッシュ
│   └── workers/          #   Web Worker（計算の非同期実行）
├── infrastructure/       # インフラ層
│   ├── duckdb/           #   DuckDB-WASM（SQL エンジン・クエリモジュール）
│   ├── storage/          #   IndexedDB 永続化・差分計算
│   ├── fileImport/       #   ファイル読み込み処理
│   ├── dataProcessing/   #   データ変換・加工（10 プロセッサ）
│   ├── i18n/             #   国際化（メッセージカタログ）
│   ├── pwa/              #   PWA サービスワーカー登録
│   └── export/           #   エクスポート処理
├── presentation/         # プレゼンテーション層
│   ├── pages/            #   ページコンポーネント（11 アクティブ + 2 孤立）
│   │   ├── Dashboard/    #     メインダッシュボード（基点ページ）
│   │   ├── Daily/        #     日次分析（運用ページ）
│   │   ├── Insight/      #     統合分析（Analysis/Forecast/Summary を統合）
│   │   ├── Category/     #     カテゴリ分析
│   │   ├── CostDetail/   #     費用詳細（Transfer/Consumable を統合）
│   │   ├── StoreAnalysis/ #    店舗分析
│   │   ├── PurchaseAnalysis/ #  購買分析
│   │   ├── Reports/      #     レポート出力
│   │   ├── Admin/        #     管理設定
│   │   ├── CustomPage/   #     カスタムページ（ユーザー作成）
│   │   ├── Mobile/       #     モバイルダッシュボード（AppShell 外描画）
│   │   ├── Analysis/     #     （孤立: Insight に統合済み）
│   │   └── Forecast/     #     （孤立: Insight に統合済み）
│   ├── components/
│   │   ├── charts/       #     チャート（従来 27 種 + DuckDB 15 種）
│   │   ├── common/       #     共通 UI 部品（Button, Card, Modal, Toast など）
│   │   └── Layout/       #     レイアウト（AppShell, NavBar, Sidebar）
│   ├── hooks/            #   プレゼンテーション層フック
│   └── theme/            #   テーマ定義・デザイントークン
├── test/                 # ガードテスト・共有インフラ（22ファイル / 213テスト）
├── App.tsx               # ルートコンポーネント（コンポジションルート）
└── main.tsx              # エントリポイント
```
