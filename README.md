# 仕入粗利管理ツール (shiire-arari)

小売業向けの仕入・粗利管理ダッシュボードアプリケーションです。Excel/CSV ファイルから仕入・売上・値引・予算・振替などのデータを取り込み、在庫法粗利・推計法棚卸・予算分析・予測などの KPI を自動計算し、ダッシュボードとチャートで可視化します。

## 主な機能

### データ管理
- **データ取り込み** -- Excel (.xlsx) / CSV ファイルのドラッグ＆ドロップによるインポート（仕入、売上、値引、予算、振替、消耗品、部門KPIなど）
- **オフライン動作** -- IndexedDB によるブラウザ完結型（サーバー不要、PWA 対応）
- **Undo/Redo** -- 操作の取り消し・やり直し対応
- **データエクスポート** -- CSV / レポート形式での計算結果の書き出し

### 計算エンジン（18 モジュール、全て純粋関数）
- **在庫法粗利** (`invMethod`) -- 期首/期末在庫から売上原価を逆算し、会計的に正確な実績粗利を算出
- **推定法** (`estMethod`) -- 値入率・売変率から理論在庫を推定し、在庫差異・異常を検出
- **予算分析** (`budgetAnalysis`) -- 予算達成率・消化率・経過率・月末予測・日別累計
- **売上予測** (`forecast`) -- 週単位集計、曜日別平均、Zスコアによる異常値検出
- **高度予測** (`advancedForecast`) -- 加重移動平均(WMA)、曜日パターン調整予測、95%信頼区間、線形回帰
- **要因分解** (`factorDecomposition`) -- シャープリー値ベースの売上変動要因分解（2/3/4変数、順序非依存・完全一致保証）
- **因果チェーン** (`causalChain`) -- 粗利率変動の段階的要因分解（原価率・売変率・原価算入率）
- **売変影響分析** (`discountImpact`) -- 値引による原価換算ロス額の算出
- **ピン止め区間** (`pinIntervals`) -- 期中棚卸日を基にした区間別在庫法粗利率
- **日別在庫推計** (`inventoryCalc`) -- 推定法ベースの日次推定在庫推移
- **感度分析** (`sensitivity`) -- パラメータ変動が粗利に与える影響シミュレーション（弾性値）
- **相関分析** (`correlation`) -- ピアソン相関係数、Min-Max正規化、乖離検出
- **トレンド分析** (`trendAnalysis`) -- 月次KPI推移、季節性パターン、前月比/前年同月比
- **曜日ギャップ分析** (`dowGapAnalysis`) -- 前年同月との曜日構成差による売上影響額推定
- **アラート** (`alertSystem`) -- カスタマイズ可能な閾値ルールベースの自動検出（critical/warning/info）
- **コンディション解決** (`conditionResolver`) -- 3層マージ閾値（registry → global → store override）
- **全店集計** (`aggregation`) -- 金額は単純合計、率は売上高加重平均
- **ユーティリティ** (`utils`) -- 安全除算、数値変換、通貨・パーセント・ポイント差フォーマット

### 可視化・分析
- **ダッシュボード** -- 10 種類のページ、50 チャート + 22 ダッシュボードウィジェット
- **多店舗対応** -- 店舗別・部門別・カテゴリ別の分析
- **時間帯分析** -- 時間帯別売上、ヒートマップ、前年比較
- **DuckDB-WASM 分析** -- ブラウザ内 SQL エンジンによる高速集計（任意日付範囲の探索・集約）
- **説明責任** -- 全主要指標に計算式・入力値・ドリルダウンを付与（L1: 一言 → L2: 式と入力 → L3: ドリルダウン）
- **Storybook** -- 22 ストーリーによるコンポーネントカタログ

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---|---|---|
| UI ライブラリ | React | 19.2 |
| ビルドツール | Vite | 7.3 |
| 言語 | TypeScript (strict) | 5.9 |
| スタイリング | styled-components | 6.3 |
| チャート | Recharts | 3.7 |
| Excel パーサ | SheetJS (xlsx) | 0.18.5 |
| テスト | Vitest + React Testing Library | 4.0 / 16.3 |
| E2E テスト | Playwright | 1.58 |
| リンター | ESLint (flat config) | 9.39 |
| 状態管理 | Zustand + Immer | 5.0 / 11.1 |
| SQL エンジン | DuckDB-WASM | 1.33 |
| バリデーション | Zod | 4.3 |
| テーブル | TanStack Table | 8.21 |
| 仮想スクロール | react-window | 2.2 |
| フォーマッタ | Prettier | 3.8 |
| コンポーネントカタログ | Storybook | 10.2 |

## ディレクトリ構成

```
Test4/
├── README.md                 # このファイル
├── CONTRIBUTING.md            # コントリビューションガイド
├── CHANGELOG.md               # 変更履歴
├── CLAUDE.md                  # AI 開発ルール
├── plan.md                    # 課題・移行計画メモ
├── roles/                    # ロール定義（マルチロール開発体制）
│   ├── staff/                 #   スタッフ部門（横断的支援）
│   │   ├── pm-business/       #     マネージャー兼要件の入口
│   │   ├── review-gate/       #     品質の出口
│   │   └── documentation-steward/ # 記録の出口
│   └── line/                  #   実務部門（直接的生産）
│       ├── architecture/      #     設計判断
│       ├── implementation/    #     コーディング
│       └── specialist/        #     専門技術（invariant-guardian, duckdb, explanation）
├── references/               # 共有参照資料（24 ファイル）
│   ├── design-principles.md   #   設計思想 10 原則
│   ├── data-flow.md           #   データフロー
│   ├── data-models.md         #   データモデル
│   ├── calculation-engine.md  #   計算エンジン仕様書
│   ├── record-store-architecture.md # v2 レコードストア設計書
│   ├── duckdb-architecture.md #   DuckDB アーキテクチャ
│   ├── explanation-architecture.md # Explanation アーキテクチャ
│   ├── engine-responsibility.md # JS vs DuckDB 責務マトリクス
│   ├── invariant-catalog.md   #   不変条件カタログ
│   ├── guard-test-map.md      #   ガードテスト対応表
│   ├── metric-id-registry.md  #   MetricId 一覧
│   ├── prohibition-quick-ref.md # 7 禁止事項クイックリファレンス
│   ├── extension-playbook.md  #   拡張プレイブック
│   ├── uiux-principles.md     #   UI/UX 4 原則
│   ├── api.md                 #   内部 API リファレンス
│   ├── ui-components.md       #   UI コンポーネント仕様書
│   ├── file-import-guide.md   #   ファイルインポートガイド
│   ├── operations.md          #   運用ガイド
│   ├── security.md            #   セキュリティ
│   ├── faq.md                 #   FAQ
│   ├── open-issues.md         #   未解決課題
│   ├── audits/                #   品質監査記録
│   └── decisions/             #   ADR（意思決定記録）
│       └── 001-duckdb-wasm-integration.md
├── .github/workflows/        # CI/CD
│   ├── ci.yml                 #   品質ゲート（lint, format, build, test, storybook, e2e）
│   └── deploy.yml             #   GitHub Pages デプロイ
└── app/                      # アプリケーション本体
    ├── package.json
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── playwright.config.ts
    ├── tsconfig.json / tsconfig.app.json
    ├── eslint.config.js
    ├── .prettierrc
    ├── index.html
    ├── public/               # 静的アセット
    ├── e2e/                  # E2E テスト（Playwright）
    │   ├── dashboard.spec.ts
    │   ├── import-flow.spec.ts
    │   └── visual-regression.spec.ts
    └── src/
        ├── domain/           # ドメイン層（フレームワーク非依存、純粋関数）
        │   ├── models/       #   28 モデルファイル（型定義・値オブジェクト）
        │   ├── calculations/ #   18 計算モジュール（粗利・予算・予測・要因分解）
        │   ├── scopeResolution/ # インポートスコープ解決（純粋関数）
        │   ├── repositories/ #   リポジトリインターフェース
        │   └── constants/    #   定数定義
        ├── application/      # アプリケーション層
        │   ├── hooks/        #   45 カスタムフック
        │   ├── stores/       #   Zustand ストア（data, settings, ui, analysisContext）
        │   ├── usecases/     #   ユースケース（計算・インポート・説明責任・エクスポート）
        │   ├── comparison/   #   比較コンテキスト
        │   ├── context/      #   React Context
        │   ├── ports/        #   ポートインターフェース
        │   ├── services/     #   計算キャッシュ・ハッシュ
        │   └── workers/      #   Web Worker
        ├── infrastructure/   # インフラ層
        │   ├── duckdb/       #   DuckDB-WASM（エンジン・9 クエリモジュール・マイグレーション）
        │   ├── storage/      #   IndexedDB 永続化
        │   ├── fileImport/   #   ファイル読み込み（Excel/CSV）
        │   ├── dataProcessing/ # 10 データプロセッサ
        │   ├── i18n/         #   国際化（メッセージカタログ）
        │   ├── pwa/          #   PWA サービスワーカー登録
        │   ├── export/       #   データエクスポート
        │   └── utilities/    #   ヘルパー
        ├── presentation/     # プレゼンテーション層
        │   ├── pages/        #   10 ページ（Dashboard, Daily, Category, Analysis, Forecast, Insight, CostDetail, Reports, Mobile, Admin）
        │   │   └── Dashboard/widgets/ # 22 ダッシュボードウィジェット
        │   ├── components/   #   UI コンポーネント
        │   │   ├── charts/   #     50 チャート + 7 ヘルパー
        │   │   ├── common/   #     共通 UI 部品
        │   │   └── Layout/   #     レイアウト（AppShell, NavBar, Sidebar）
        │   ├── hooks/        #   プレゼンテーション層フック
        │   ├── theme/        #   テーマ・スタイル定義（ダーク/ライト）
        │   └── DevTools/     #   開発ツール
        ├── stories/          # Storybook（22 ストーリー）
        └── test/             # テストユーティリティ
```

### アーキテクチャ（4 層構成）

```
Presentation → Application → Domain ← Infrastructure
```

Domain 層はどの層にも依存しない（依存性逆転の原則）。各層の責務は以下の通りです。

| 層 | 責務 |
|---|---|
| **Domain** | ビジネスモデル、計算ロジック（在庫法粗利、推計法棚卸、予算分析、予測、要因分解）。フレームワーク非依存 |
| **Application** | 状態管理（Zustand ストア）、45 カスタムフック、ユースケース、Web Worker |
| **Infrastructure** | IndexedDB 永続化、ファイル読み込み/書き出し、データ変換、DuckDB-WASM、i18n、PWA |
| **Presentation** | React コンポーネント、10 ページ、50 チャート + 22 ウィジェット、テーマ（ダーク/ライト対応）。描画のみを担当 |

### 2 つの計算エンジン

| | JS 計算エンジン | DuckDB 探索エンジン |
|---|---|---|
| 役割 | 権威的な指標計算 | 自由範囲の探索・集約 |
| スコープ | 単月確定値 | 任意日付範囲 |
| 出力 | StoreResult | SQL 集約結果 |
| 例 | シャープリー分解、粗利計算 | 時間帯×曜日集約、月跨ぎ分析 |

設計思想の詳細（10 原則）は [CLAUDE.md](./CLAUDE.md) の「設計思想」セクション、
エンジン責務分担は [engine-responsibility.md](./references/engine-responsibility.md) を参照してください。

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
# ユニットテスト
cd app
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# E2E テスト（Playwright）
npm run test:e2e
```

### リント・フォーマット

```bash
cd app
npm run lint
npm run format
npm run format:check
```

### Storybook

```bash
cd app
npm run storybook          # 開発サーバー（ポート 6006）
npm run build-storybook    # 静的ビルド
```

## CI パイプライン（7 段階ゲート）

GitHub Actions（`.github/workflows/ci.yml`）で以下を自動実行します。

| # | ステージ | コマンド |
|---|---|---|
| 1 | セキュリティ監査 | `npm audit --audit-level=critical` |
| 2 | ESLint | `npm run lint` |
| 3 | Prettier | `npm run format:check` |
| 4 | 型チェック + ビルド | `npm run build` (tsc -b + vite build) |
| 5 | テスト + カバレッジ | `npx vitest run --coverage` |
| 6 | Storybook ビルド | `npm run build-storybook` |
| 7 | E2E テスト | `npm run test:e2e` (Playwright: chromium + mobile-chrome) |

## デプロイ

GitHub Pages にデプロイされます（`.github/workflows/deploy.yml`）。

- **URL**: `https://<username>.github.io/Test4/`
- **ベースパス**: `/Test4/`（`vite.config.ts` の `base` で設定）

## ブラウザ対応

| 規模 | 推奨環境 |
|---|---|
| 小規模（~5 店舗 × 12 ヶ月） | Chrome/Edge >= 94, Firefox >= 93, Safari >= 15.4 |
| 中規模（~20 店舗） | Chrome/Edge 推奨 |
| 大規模（50+ 店舗、1M+ 行） | Chrome/Edge 必須、8GB+ RAM |

## ドキュメント

詳細なドキュメントは [`references/`](./references/) ディレクトリと [`roles/`](./roles/) ディレクトリを参照してください。

### 参照資料（references/）

**アーキテクチャ・設計**
- [設計思想 10 原則](./references/design-principles.md)
- [データフロー](./references/data-flow.md)
- [データモデル](./references/data-models.md)
- [v2 レコードストア設計書](./references/record-store-architecture.md)
- [DuckDB アーキテクチャ](./references/duckdb-architecture.md)
- [Explanation アーキテクチャ](./references/explanation-architecture.md)
- [拡張プレイブック](./references/extension-playbook.md)
- [定数・メトリクス実装計画](./references/implementation-plan-constants-metrics.md)

**仕様・リファレンス**
- [計算エンジン仕様書](./references/calculation-engine.md)
- [JS vs DuckDB 責務マトリクス](./references/engine-responsibility.md)
- [内部 API リファレンス](./references/api.md)
- [UI コンポーネント仕様書](./references/ui-components.md)
- [MetricId 一覧](./references/metric-id-registry.md)
- [UI/UX 4 原則](./references/uiux-principles.md)

**品質・ガード**
- [不変条件カタログ](./references/invariant-catalog.md)
- [ガードテスト対応表](./references/guard-test-map.md)
- [7 禁止事項クイックリファレンス](./references/prohibition-quick-ref.md)

**運用**
- [ファイルインポートガイド](./references/file-import-guide.md)
- [運用ガイド](./references/operations.md)
- [セキュリティ](./references/security.md)
- [FAQ](./references/faq.md)
- [未解決課題](./references/open-issues.md)

**意思決定記録**
- [DuckDB-WASM 採用 ADR](./references/decisions/001-duckdb-wasm-integration.md)

## ライセンス

MIT License
