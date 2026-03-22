# 仕入粗利管理ツール (shiire-arari)

小売業の仕入・売上・在庫データから粗利計算・予算分析・売上要因分解・需要予測を行う SPA。
Excel/CSV をインポートし、ブラウザ完結（サーバー不要）で動作する。

## システム規模

| 指標 | 数値 |
|---|---|
| ページ | 13（Dashboard, Daily, Category, Analysis, Forecast, Insight, CostDetail, Reports, Mobile, Admin, CustomPage, PurchaseAnalysis, StoreAnalysis） |
| チャート | 59 |
| ダッシュボードウィジェット | 91 ファイル |
| ドメインモデル | 51 |
| 計算モジュール | 38（全て純粋関数） |
| DuckDB クエリモジュール | 13 |
| カスタムフック | 76 |
| Storybook ストーリー | 21 |
| WASM モジュール | 4（factor-decomposition, gross-profit, budget-analysis, forecast） |

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---|---|---|
| UI ライブラリ | React | 19.2 |
| ビルドツール | Vite | 7.3 |
| 言語 | TypeScript (strict) / Rust (WASM) / SQL (DuckDB) | 5.9 / stable / — |
| スタイリング | styled-components | 6.3 |
| 状態管理 | Zustand | 5.0 |
| ルーティング | react-router-dom | 7.13 |
| チャート | ECharts | 6.0 |
| テーブル | TanStack Table | 8.21 |
| ポップオーバー/ツールチップ | @floating-ui/react | 0.27 |
| 日付選択 | react-day-picker | 9.14 |
| 日付計算 | date-fns | 4.1 |
| 数値フォーマット | d3-format | 3.1 |
| Excel パーサ | SheetJS (xlsx) | 0.18.5 |
| バリデーション | Zod | 4.3 |
| SQL エンジン | DuckDB-WASM | 1.33 |
| テスト | Vitest + React Testing Library | 4.0 |
| E2E テスト | Playwright | 1.58 |
| リンター | ESLint (flat config) | 9.39 |
| フォーマッタ | Prettier | 3.8 |
| コンポーネントカタログ | Storybook | 10.2 |

## アーキテクチャ

### 4 層構成

```
Presentation → Application → Domain ← Infrastructure
```

Domain 層はどの層にも依存しない（依存性逆転の原則）。

| 層 | 責務 | やらないこと |
|---|---|---|
| **Domain** | ビジネスモデル、計算ロジック。フレームワーク非依存の純粋関数 | UI 表示、データ取得、状態管理 |
| **Application** | 状態管理（Zustand）、フック、ユースケース、比較コンテキスト | 生データ走査、描画 |
| **Infrastructure** | IndexedDB 永続化、ファイル読込、DuckDB-WASM、i18n、PWA | ビジネスロジック |
| **Presentation** | React コンポーネント、ページ、チャート。描画のみ | 計算、データ取得、状態管理 |

### 天気データ基盤

気象庁 ETRN（電子閲覧室）から時間帯別気象データを取得し、売上との相関分析を行う。

| 項目 | 内容 |
|---|---|
| データ取得元 | 気象庁 ETRN（Cloudflare Worker プロキシ経由） |
| 観測所 | 気象台（s1）のみ使用。AMeDAS（a1）は仕組みで除外 |
| 永続化 | DuckDB `weather_hourly` テーブル |
| 表示 | 日別チャート天気アイコン、時間帯チャート気温/降水量折れ線、天気-売上相関パネル |
| 気温軸 | 準固定（5°C 刻み丸め + 温度帯バンド） |
| 降水量軸 | 固定（0-5mm 基本、段階拡張） |

詳細は [weather-architecture.md](./references/03-guides/weather-architecture.md) を参照。

### チャートライブラリ移行（Recharts → ECharts）

v1.4.0 で **Recharts → ECharts** に移行を開始。

#### 移行の意思決定

| 判断基準 | Recharts | ECharts（採用） |
|---|---|---|
| 大量データ描画 | SVG ベースで重い | Canvas ベースで軽量 |
| チャート種類 | 基本的な棒/線/円 | ヒートマップ・markArea・積み上げ面・温度帯バンド等の高度表現 |
| option 構築 | JSX 宣言的 | JSON option を純粋関数で構築 → Controller/View 分離と相性が良い |
| カスタマイズ性 | 限定的（ResponsiveContainer 問題等） | tooltip・凡例・軸ラベルの自由度が高い |
| Controller/View パターン | View 内で描画ロジック混在 | chartOption 純粋関数 + EChart ラッパーで描画は View に閉じる |

#### 移行の背景

包含型分析ユニット（日別→時間帯→部門別時間帯、カテゴリ→ドリルダウン）の実現にあたり、
チャートを「親が文脈を持ち、子が継承する」構造にする必要があった。
Recharts の JSX 宣言型では chartOption を外部で構築して注入するパターンが難しく、
ECharts の JSON option ベースが Controller/View/OptionBuilder 三層分離に適していた。

#### 現在の移行状態（v1.5.0 時点）

| チャート群 | ステータス | 備考 |
|---|---|---|
| 時間帯別チャート | **ECharts 移行完了** | Controller/View/OptionBuilder 分離済み |
| 日別売上チャート | **ECharts 移行完了** | DailySalesChartBody + 純粋関数 option |
| カテゴリトレンド | **ECharts 移行完了** | CategoryTrendChartLogic.ts |
| 部門別時間帯 | **ECharts 移行完了** | DeptHourlyChartLogic.ts |
| カテゴリヒートマップ | **ECharts 移行完了** | CategoryTimeHeatmap |
| 粗利推移チャート | 一部 Recharts 残存 | 改修時に移行予定 |
| 要因分解チャート | 一部 Recharts 残存 | 改修時に移行予定 |
| 相関分析チャート | 一部 Recharts 残存 | 改修時に移行予定 |

**移行方針:** 新規チャートは ECharts で実装。既存 Recharts チャートは改修タイミングで段階移行。
Recharts の完全除去は全チャート移行完了後に行う。

### 包含型分析ユニット（移行中）

v1.5.0 で、独立していたチャートを**分析文脈の継承ツリー**として再構成中。

#### 目指す構造

```
売上推移分析ユニット（IntegratedSalesChart — 正本コンテナ）
├── 日別売上推移（DailySalesChart — 常時表示）
│   └── 時間帯別 前年比較（TimeSlotChart — ドリル時）
│       └── 部門別時間帯パターン（DeptHourlyChart — 孫）
└── カテゴリ分析ユニット（IntegratedCategoryAnalysis — 正本コンテナ）
    ├── カテゴリ別売上推移（CategoryTrendChart）
    └── カテゴリードリルダウン分析（CategoryHierarchyExplorer）
```

#### 設計ルール

1. **比較文脈は親が決める。子は再計算しない** — `SalesAnalysisContext` は親コンテナが構築
2. **View は表示モデルしか受けない** — weatherCode 等の raw 値は View に渡さない
3. **親子孫のUI構造は文脈継承構造と一致させる** — 見た目だけのネスト禁止
4. **独立互換のために正本設計を汚さない** — `UnifiedTimeSlotWidget` は暫定互換

#### 現在の移行状態（v1.5.0 時点）

| コンポーネント | ステータス | 備考 |
|---|---|---|
| AnalysisNodeContext | **完了** | 型 + 純粋関数 + テスト16件 |
| TimeSlotChart Controller/View 分離 | **完了** | 598行 → Controller 200行 + View 408行 |
| TimeSlotChartVM + OptionBuilder | **完了** | 純粋関数化 |
| IntegratedSalesChart 包含UI化 | **完了** | 日別常時表示 + 時間帯・部門孫を包含 |
| IntegratedCategoryAnalysis | **完了** | カテゴリトレンド + ドリルダウンを包含 |
| ContainedAnalysisPanel | **完了** | role: child/grandchild で視覚階層統一 |
| ウィジェットレジストリ統合 | **完了** | 独立ウィジェットを包含に統合 |
| イベント連動強化 | 進行中 | CrossChartSelectionContext 経由 |
| 独立ウィジェット縮退 | 進行中 | @deprecated 付与、新規改善停止 |

### 3 つの Execution Engine

| Engine | 役割 | 実装 | 制約 |
|---|---|---|---|
| **Authoritative (JS/WASM)** | 正式な業務確定値の算出 | `domain/calculations/` | 純粋関数のみ、副作用禁止 |
| **Orchestration (TS)** | 取得・保存・状態管理・ViewModel | `application/`, `presentation/` | authoritative 計算を新規実装しない |
| **Exploration (DuckDB)** | 任意条件の探索・自由集計 | `infrastructure/duckdb/` | 正式値の唯一定義元にしない |

同じ集約ロジックの JS/SQL 二重実装は禁止。詳細は [engine-boundary-policy.md](./references/01-principles/engine-boundary-policy.md)、
責務分担は [engine-responsibility.md](./references/01-principles/engine-responsibility.md) を参照。

## ディレクトリ構成

```
Test4/
├── CLAUDE.md                  # AI 開発ルール（正本）
├── README.md                  # 本ファイル（仕様索引）
├── CONTRIBUTING.md             # コントリビューションガイド
├── CHANGELOG.md                # 変更履歴
├── plan.md                     # 課題・移行計画
├── roles/                     # ロール定義
│   ├── staff/                  #   pm-business, review-gate, documentation-steward
│   └── line/                   #   architecture, implementation, specialist/*
├── references/                # 運用仕様書（39ファイル）
│   ├── 01-principles/          #   設計原則・制約
│   ├── 02-status/              #   進捗・品質状態
│   ├── 03-guides/              #   実装ガイド・リファレンス
│   └── 99-archive/             #   アーカイブ
├── .github/workflows/         # CI/CD
└── app/                       # アプリケーション本体
    └── src/
        ├── domain/             #   モデル(51), 計算(38), 定数, スコープ解決
        ├── application/        #   フック(76), ストア, ユースケース, 比較, Worker
        ├── infrastructure/     #   DuckDB(35), IndexedDB, ファイル読込, i18n, PWA
        ├── presentation/       #   ページ(13), チャート(59), ウィジェット, テーマ
        ├── features/           #   縦スライス（sales, category, shared）
        ├── stories/            #   Storybook(21)
        └── test/               #   テストユーティリティ
```

## クイックスタート

```bash
cd app
npm install
npm run dev          # http://localhost:5173/Test4/
```

## コマンド

```bash
cd app
npm run lint          # ESLint（エラー0必須）
npm run format:check  # Prettier チェック
npm run build         # tsc -b + vite build
npm test              # vitest run
npm run test:coverage # カバレッジ付き
npm run test:e2e      # Playwright E2E
npm run storybook     # Storybook（ポート 6006）
```

## CI パイプライン（6 段階ゲート）

| # | ステージ | コマンド |
|---|---|---|
| 1 | ESLint | `npm run lint` |
| 2 | Prettier | `npm run format:check` |
| 3 | 型チェック + ビルド | `npm run build` |
| 4 | Storybook ビルド | `npm run build-storybook` |
| 5 | テスト + カバレッジ | `npx vitest run --coverage`（lines 55%） |
| 6 | E2E テスト | `npm run test:e2e` |

## 設計制約

- **19 設計原則** — 詳細は [CLAUDE.md](./CLAUDE.md) §設計思想、管理は architecture ロール
- **13 禁止事項** — 全て実際のバグに基づく制約。[prohibition-quick-ref.md](./references/01-principles/prohibition-quick-ref.md)
- **12 過剰複雑性防止ルール** — ガードテストで機械的に強制
- **UI/UX 4 原則** — [uiux-principles.md](./references/01-principles/uiux-principles.md)

## 参照資料（references/）

**設計原則・制約**（01-principles/）
- [設計思想 19 原則](./references/01-principles/design-principles.md)
- [データフロー](./references/01-principles/data-flow.md)
- [データパイプライン整合性](./references/01-principles/data-pipeline-integrity.md)
- [期間スコープの意味論](./references/01-principles/temporal-scope-semantics.md)
- [エンジン境界ポリシー](./references/01-principles/engine-boundary-policy.md)
- [エンジン責務マトリクス](./references/01-principles/engine-responsibility.md)
- [ドメイン率プリミティブ](./references/01-principles/domain-ratio-primitives.md)
- [観測期間仕様](./references/01-principles/observation-period-spec.md)
- [13 禁止事項](./references/01-principles/prohibition-quick-ref.md)
- [UI/UX 4 原則](./references/01-principles/uiux-principles.md)

**進捗・品質状態**（02-status/）
- [エンジン成熟度マトリクス](./references/02-status/engine-maturity-matrix.md)
- [エンジン昇格マトリクス](./references/02-status/engine-promotion-matrix.md)
- [昇格基準](./references/02-status/promotion-criteria.md)
- [観測評価ガイド](./references/02-status/observation-evaluation-guide.md)
- [品質監査レポート](./references/02-status/quality-audit-latest.md)
- [未解決課題](./references/02-status/open-issues.md)

**実装ガイド・リファレンス**（03-guides/）
- [計算エンジン仕様書](./references/03-guides/calculation-engine.md)
- [DuckDB アーキテクチャ](./references/03-guides/duckdb-architecture.md)
- [天気データ基盤](./references/03-guides/weather-architecture.md)
- [ウィジェット連携アーキテクチャ](./references/03-guides/widget-coordination-architecture.md)
- [Explanation アーキテクチャ](./references/03-guides/explanation-architecture.md)
- [MetricId 一覧](./references/03-guides/metric-id-registry.md)
- [内部 API リファレンス](./references/03-guides/api.md)
- [データモデル](./references/03-guides/data-models.md)
- [データモデル層](./references/03-guides/data-model-layers.md)
- [Authoritative 表示ルール](./references/03-guides/authoritative-display-rules.md)
- [Compare 共通規約](./references/03-guides/compare-conventions.md)
- [UI コンポーネント仕様書](./references/03-guides/ui-components.md)
- [拡張プレイブック](./references/03-guides/extension-playbook.md)
- [不変条件カタログ](./references/03-guides/invariant-catalog.md)
- [ガードテスト対応表](./references/03-guides/guard-test-map.md)
- [WASM デュアルラン手順書](./references/03-guides/wasm-dual-run-runbook.md)
- [ロールバックポリシー](./references/03-guides/rollback-policy.md)
- [Cloudflare Worker セットアップ](./references/03-guides/cloudflare-worker-setup.md)

**運用**
- [ファイルインポートガイド](./references/03-guides/file-import-guide.md)
- [運用ガイド](./references/03-guides/operations.md)
- [セキュリティ](./references/03-guides/security.md)
- [FAQ](./references/03-guides/faq.md)

## デプロイ

GitHub Pages: `https://<username>.github.io/Test4/`

## ライセンス

MIT License
