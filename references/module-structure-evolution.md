# モジュール構造の進化方針 — 横スライスから縦スライスへ

> 本ドキュメントは CLAUDE.md の設計思想セクションと `duckdb-architecture.md` を補完するものである。

## 現状: 層別構造（横スライス）

現在のプロジェクトは **技術層** で分割されている:

```
app/src/
├── domain/           # 全機能のビジネスロジック
├── application/      # 全機能のフック・ユースケース
├── infrastructure/   # 全機能のデータアクセス
└── presentation/     # 全機能のUI
```

これは **Presentation → Application → Domain ← Infrastructure** の依存ルールを
明確にし、アーキテクチャガードテスト（`architectureGuard.test.ts`）で機械的に検証するために
適切な出発点であった。

### 横スライスの限界

機能の増加に伴い、以下の問題が顕在化しつつある:

| 問題 | 現在の状態 |
|---|---|
| **ファイル密度** | `charts/DuckDB*.tsx` が 18 ファイル超、1ディレクトリに密集 |
| **変更の波及範囲** | 「カテゴリ分析を変更」→ 4層を横断して探索が必要 |
| **暗黙の機能境界** | 売上系・在庫系・カテゴリ系の区別がディレクトリ構造に現れない |
| **共通コードの重複** | 同種のチャートが styled-components・定数・型を個別に定義 |

## 目標: 機能別構造（縦スライス）

業務ドメインの境界で**縦に**分割し、各スライス内に4層を内包する:

```
features/
  sales/                    # 売上分析
    ├ presentation/         # 売上チャート、売上KPI
    ├ application/          # 売上フック
    ├ domain/               # 粗利計算、要因分解
    └ infrastructure/       # 売上SQL、売上VIEW

  inventory/                # 在庫分析
    ├ presentation/
    ├ application/
    ├ domain/
    └ infrastructure/

  category/                 # カテゴリ構造分析
    ├ presentation/         # PI-CVマップ、CV時系列、ベンチマーク
    ├ application/          # useDuckDBCategoryBenchmark 等
    ├ domain/               # CategoryBenchmarkScore 型定義
    └ infrastructure/       # advancedAnalytics.ts のカテゴリ系SQL

  customer/                 # 客数・客単価分析
  forecast/                 # 予測・予算分析

shared/                     # 複数機能が使う共通基盤
  ├ duckdb-engine/          # DuckDB 初期化、コネクション管理、queryRunner
  ├ ui-parts/               # ChartPanel, ToggleBtn 等の共通UIパーツ
  ├ calculation-core/       # 全機能共通の計算ユーティリティ
  └ types/                  # DateRange, StoreId, MetricId 等
```

### 縦スライスの原則

```
┌─ 縦の壁: 機能境界 ─────────────────────────────────┐
│                                                     │
│  sales/          category/         inventory/       │
│  ┌──────┐       ┌──────┐          ┌──────┐         │
│  │ A UI │       │ A UI │          │ A UI │         │
│  │ B App│       │ B App│          │ B App│         │
│  │ C Dom│       │ C Dom│          │ C Dom│         │
│  │ D Inf│       │ D Inf│          │ D Inf│         │
│  └──────┘       └──────┘          └──────┘         │
│      │               │                │             │
│      └───────────────┼────────────────┘             │
│                      ↓                              │
│                 shared/                             │
│            (共通基盤のみ)                            │
│                                                     │
└─ 横の壁: 層の依存ルール（従来通り維持）──────────────┘
```

**2つのルール:**

1. **縦の壁:** 機能間の直接依存は禁止。共通基盤は `shared/` 経由
2. **横の壁:** 各スライス内部の層間依存は従来通り（A → B → C ← D）

### 機能境界の判定基準

「何を1つの機能とするか」は以下の基準で判定する:

| 基準 | 説明 |
|---|---|
| **変更の同時性** | 一緒に変わるものは同じスライスに置く |
| **データの所有権** | そのデータの計算・SQL・表示を一貫して管理できる粒度 |
| **チームの認知境界** | 「売上の話」「カテゴリの話」と自然に呼べる単位 |

**判定に迷ったら:** 2つの機能が同じSQLテーブルの同じカラムを参照する場合、
それは1つの機能であるか、共通データを `shared/` に置くべきサインである。

### 想定する機能スライス

| スライス | 含まれるもの | 主要データソース |
|---|---|---|
| **sales** | 日次売上、累積、前年比、売変分析、シャープリー分解 | `classified_sales`, `store_day_summary` |
| **inventory** | 在庫法粗利、推定法粗利、棚卸、原価分析 | `purchase`, `transfers`, `consumables` |
| **category** | PI-CVマップ、CV時系列、ベンチマーク、構成比、時間帯×カテゴリ | `category_time_sales`, `classified_sales` |
| **customer** | 客数、客単価、買上点数、要因分解 | `classified_sales` |
| **forecast** | 予算対実績、消化率、着地見込 | `budget`, `store_day_summary` |
| **shared** | DuckDBエンジン、共通型、共通UIパーツ、i18n | — |

## 移行戦略

### 原則: 新規は縦、既存は触るときに

既存コードを一括で移行する必要はない。以下の段階的アプローチを取る:

```
Phase 0（現在）
  shared/ に共通パーツを抽出する（DuckDBChartParts.ts が先行例）
  新規チャートは共通パーツを import して重複を防ぐ

Phase 1（次の新機能から）
  新しい機能は features/<name>/ 配下に縦スライスで作る
  既存コードからの import は許可（段階的移行のため）

Phase 2（既存機能の改修時）
  改修対象の機能を features/ に移動する
  元の場所にはバレル re-export を残す（設計原則 #7）

Phase 3（安定後）
  全機能が features/ に移行完了
  architectureGuard.test.ts を拡張して機能間依存を検証
```

### Phase 0 の具体的な作業（現在実施可能）

```
現在:
  charts/DuckDBChartParts.ts           ← 共通styled-components（抽出済み）
  charts/DuckDBCvTimeSeriesChart.tsx   ← DuckDBChartParts を import（実施済み）
  charts/DuckDBPiCvBubbleChart.tsx     ← DuckDBChartParts を import（実施済み）

次のステップ:
  既存の DuckDB チャート（DuckDBCategoryBenchmarkChart 等）も
  改修タイミングで DuckDBChartParts を import に切り替える
```

### バレル re-export による後方互換

移動時は必ず元パスにバレルを残し、既存の import を壊さない:

```typescript
// 移動前: presentation/components/charts/DuckDBPiCvBubbleChart.tsx
// 移動後: features/category/presentation/DuckDBPiCvBubbleChart.tsx

// 元の場所に残すバレル:
// presentation/components/charts/DuckDBPiCvBubbleChart.tsx
export { DuckDBPiCvBubbleChart } from '@/features/category/presentation/DuckDBPiCvBubbleChart'
```

## 縦スライスと既存設計原則の関係

| 設計原則 | 縦スライスでの適用 |
|---|---|
| #1 機械で守る | `architectureGuard.test.ts` に機能間依存検証を追加 |
| #4 変更頻度で分離 | 機能境界 = 変更が同時に起きる単位 |
| #6 DI はコンポジションルート | `shared/` が新しいコンポジションルートの一部になる |
| #7 バレルで後方互換 | 移動時のバレル re-export |
| #10 最小セレクタ | 機能スライスが状態の自然な境界を提供する |

## DuckDB クエリ層の進化方針

縦スライス化と並行して、DuckDB のクエリ実行効率も改善する:

### 第1層: VIEW マテリアライズ（即時実施可能）

`store_day_summary` VIEW は7テーブルJOINを毎回実行している。
`loadMonth()` 完了後に `materializeSummary()` を呼ぶことで物理テーブル化し、
全参照クエリが即座に高速化する。

```
loadMonth() → 全テーブルINSERT → materializeSummary() → store_day_summary_mat (物理テーブル)
                                                          ↑
                                                    全クエリがここを参照
```

### 第2層: クエリ結果キャッシュ（useAsyncQuery 改修）

同じ条件（期間・店舗・階層）のクエリが複数ウィジェットから独立に実行される問題を、
`useAsyncQuery` にキャッシュ層を追加して解決する。

```
Widget A ─┐
Widget B ─┼→ QueryCache(key = クエリパラメータのハッシュ)
Widget C ─┘        │
                   ├→ HIT  → キャッシュ返却（SQL実行なし）
                   └→ MISS → DuckDB実行 → 結果保存
```

キャッシュの無効化は `dataVersion` の変更時に一括クリア。

### 第3層: データ要求の取りまとめ（将来検討）

複数ウィジェットのデータ要求を分析し、最小限のSQL実行で全ウィジェットに
データを配信する。実装コストが高いため、第1層・第2層の効果を測定してから判断する。

## この方針が適用されない場合

以下の場合、縦スライスは過剰設計となる:

- 機能が5つ未満でファイル数が少ない（現状はこの境界にある）
- 1人で開発しており、全コードの所在を把握している
- 新機能の追加頻度が低い

**判断のトリガー:** 1ディレクトリ内のファイル数が20を超えた、
または「このファイルどこだっけ」と迷う頻度が増えた時点で Phase 1 を開始する。
