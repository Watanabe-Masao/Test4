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
| チャート | Recharts | 3.7 |
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
├── references/                # 運用仕様書（約38ファイル）
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

- **16 設計原則** — 詳細は [CLAUDE.md](./CLAUDE.md) §設計思想、管理は architecture ロール
- **9 禁止事項** — 全て実際のバグに基づく制約。[prohibition-quick-ref.md](./references/01-principles/prohibition-quick-ref.md)
- **12 過剰複雑性防止ルール** — ガードテストで機械的に強制
- **UI/UX 4 原則** — [uiux-principles.md](./references/01-principles/uiux-principles.md)

## 参照資料（references/）

**設計原則・制約**
- [設計思想 16 原則](./references/01-principles/design-principles.md)
- [データフロー](./references/01-principles/data-flow.md)
- [データパイプライン整合性](./references/01-principles/data-pipeline-integrity.md)
- [期間スコープの意味論](./references/01-principles/temporal-scope-semantics.md)
- [エンジン境界ポリシー](./references/01-principles/engine-boundary-policy.md)
- [エンジン責務マトリクス](./references/01-principles/engine-responsibility.md)
- [9 禁止事項](./references/01-principles/prohibition-quick-ref.md)
- [UI/UX 4 原則](./references/01-principles/uiux-principles.md)

**実装ガイド・リファレンス**
- [計算エンジン仕様書](./references/03-guides/calculation-engine.md)
- [DuckDB アーキテクチャ](./references/03-guides/duckdb-architecture.md)
- [Explanation アーキテクチャ](./references/03-guides/explanation-architecture.md)
- [MetricId 一覧](./references/03-guides/metric-id-registry.md)
- [内部 API リファレンス](./references/03-guides/api.md)
- [データモデル](./references/03-guides/data-models.md)
- [UI コンポーネント仕様書](./references/03-guides/ui-components.md)
- [拡張プレイブック](./references/03-guides/extension-playbook.md)
- [不変条件カタログ](./references/03-guides/invariant-catalog.md)
- [ガードテスト対応表](./references/03-guides/guard-test-map.md)

**運用**
- [ファイルインポートガイド](./references/03-guides/file-import-guide.md)
- [運用ガイド](./references/03-guides/operations.md)
- [セキュリティ](./references/03-guides/security.md)
- [FAQ](./references/03-guides/faq.md)
- [未解決課題](./references/02-status/open-issues.md)

## デプロイ

GitHub Pages: `https://<username>.github.io/Test4/`

## ライセンス

MIT License
