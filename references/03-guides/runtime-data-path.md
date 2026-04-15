# 実行時データ経路ガイド

> 本ドキュメントは、データ取得から描画までの実装上の主経路を示す。
> 4 層の抽象アーキテクチャと、日常のコーディングを接続するために書かれている。

## 2 本の主経路

### 1. 正本 lane（業務値の意味を確定する経路）

値の意味が画面横断で安定しているものは、この経路で正本化する。

```
infra query
  → QueryHandler（acquisition orchestration）
  → pure builder（意味付け + Zod parse）
  → readModel / calculateModel
  → useWidgetDataOrchestrator → widget が消費
```

**具体例: 売上ファクト**

| ステップ | ファイル | 責務 |
|----------|---------|------|
| infra query | `infrastructure/duckdb/queries/` | SQL 実行 |
| handler | `application/readModels/salesFact/salesFactHandler.ts` | orchestration |
| builder | `application/readModels/salesFact/readSalesFact.ts` | `buildSalesFactReadModel()` — 集約 + Zod parse |
| 配布 | `useWidgetDataOrchestrator` | `UnifiedWidgetContext.readModels` 経由 |

**具体例: 自由期間ファクト（unify-period-analysis Phase 3 で明文化）**

自由期間分析系（売上 / 予算 / 部門 KPI）は chart 共通入力として
`FreePeriodReadModel` を正本とし、`ctx.freePeriodLane.bundle` 経由で
widget に配布される。

| ステップ | ファイル | 責務 |
|----------|---------|------|
| 入力契約 | `domain/models/buildFreePeriodFrame.ts` | `PeriodSelection → FreePeriodAnalysisFrame` adapter |
| infra query | `infrastructure/duckdb/queries/freePeriodFactQueries.ts` | `queryFreePeriodDaily()` — 日別×店舗 raw rows |
| handler | `application/queries/freePeriodHandler.ts` | orchestration（**唯一の caller**） |
| builder | `application/readModels/freePeriod/readFreePeriodFact.ts` | `buildFreePeriodReadModel()` + `computeFreePeriodSummary()` + Zod parse |
| bundle | `application/hooks/useFreePeriodAnalysisBundle.ts` | 1 frame → 3 readModel (fact / budget / deptKPI) |
| 配布 | `useUnifiedWidgetContext` | `ctx.freePeriodLane = { frame, bundle }` |
| 消費 | widget / chart | `FreePeriodReadModel` 1 オブジェクトを読む（raw rows を直接解釈しない） |

関連定義: `references/01-principles/free-period-analysis-definition.md`
関連ガード: `freePeriodPathGuard` / `freePeriodHandlerOnlyGuard`

**原則:**
- handler は取得手順を管理する。業務意味論を持ち込まない
- builder は pure function。infra への依存を持たない
- readModel に guard（`*PathGuard.test.ts`）と定義書（`references/01-principles/*-definition.md`）を対にする
- **自由期間系は `FreePeriodReadModel` が chart 共通入力**。`FreePeriodDailyRow[]`
  を presentation / chart に渡す経路を作らない

### 2. Screen Plan lane（画面固有の取得・比較を束ねる経路）

比較軸や階層条件が画面固有のものは、Screen Plan に留める。

```
Controller component
  → application hook（UI state + derivation）
  → Screen Plan（comparison routing + query orchestration）
  → useQueryWithHandler（debounce / cache / stale discard / profiling）
  → QueryHandler 群
  → View / OptionBuilder
```

**具体例: TimeSlotChart**

| ステップ | ファイル | 責務 |
|----------|---------|------|
| Controller | `presentation/components/charts/TimeSlotChart.tsx` | context 受領、controller state |
| hook | `application/hooks/useTimeSlotData.ts` | UI state, hierarchy, 派生値 |
| plan | `application/hooks/plans/useTimeSlotPlan.ts` | comparison routing, query input 構築 |
| query | `useQueryWithHandler.ts` | 標準 query access（cache, profiling） |
| View | `TimeSlotChartView.tsx` + `TimeSlotChartOptionBuilder.ts` | 描画のみ |

**原則:**
- component に acquisition logic を書かない（H4）
- comparison routing は plan に閉じる
- View は raw query 値を直接解釈しない（F7）
- 新規の複雑画面はこの構造を優先する

## presentation 側の共通入口

```
useUnifiedWidgetContext
  ├── useComparisonSlice    — 比較コンテキスト
  ├── useQuerySlice         — query 関連依存
  │   ├── useWidgetQueryContext     — QueryExecutor / DuckDB readiness
  │   └── useWidgetDataOrchestrator — 取得系 readModel 統合
  ├── useWeatherSlice       — 天気データ
  └── useChartInteractionSlice — チャート操作状態
```

## useQueryWithHandler の運用ル��ル

`useQueryWithHandler` は単なる wrapper ではなく、query 実行の標準運用基盤:

- **debounce**: query input 変更の burst を吸収
- **shared cache**: 同一 input の重複実行を回避
- **in-flight dedupe**: 同時リクエストを1つに束ねる
- **stale discard**: 古いレスポンスを自動破棄
- **profiler integration**: `queryProfiler` 経由で実行時間を記録

**原則:** query は useQueryWithHandler を通す。presentation が個別に非同期状態を持たない。

## どちらの経路を選ぶか

| 条件 | 選択 |
|------|------|
| 値の意味が画面横断で安定 | readModel に寄せる（正本 lane） |
| 他 widget / page でも再利用する | readModel に寄せる |
| definition / guard / canonicalization の対象にしたい | readModel に寄せる |
| 比較軸や階層条件が画面固有 | Screen Plan に留める |
| 補助系列や UI 補助データの束ねが中心 | Screen Plan に留める |
| drill / focus / weather routing が重要 | Screen Plan に留める |

## Composition Root

`AppProviders.tsx` が composition root として provider tree を管理する:

- RepositoryProvider — IndexedDB 永続化
- AdapterProvider — domain port の adapter 実装
- PersistenceProvider — UI 状態永続化
- AppLifecycleProvider — アプリ起動・回復

DI はここに集約する（A5）。provider を追加・変更する場合はこのファイルを起点に確認する。

## 現在値の参照先

prose 内に件数・残数を直書きしない。以下を正本とする:

- `references/02-status/generated/architecture-state-snapshot.md` / `.json`
- `test/allowlists/` — 許可リストの実体
- `test/guardTagRegistry.ts` — ガードタグの実体
