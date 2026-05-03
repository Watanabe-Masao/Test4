# ウィジェット連動アーキテクチャ

> 本ドキュメントは、ウィジェット間連動の理想図だけでなく、
> **現在の標準実装パターン** を示す。
>
> 特に以下を対象とする:
> - 共通 context の受け渡し
> - Screen Plan による query orchestration
> - Controller / View / OptionBuilder の責務分離
> - 連動イベントの標準化
>
> 実行時データ経路の全体像は `references/03-implementation/runtime-data-path.md` を参照。

## この文書でいう「標準」

現時点の標準パターンは 1 つではない。���の 2 系統を使い分ける。

1. **共通 readModel 配布系** — `useWidgetDataOrchestrator` が取得系 readModel を統合配布
2. **screen-specific plan 系** — `useXxxPlan` + `useQueryWithHandler` ��画面固有の query を束ねる

時間帯分析・包含型分析ユニットは、後者の標準実装である。

## 現在の標準化状況

### すでに標準化されているもの

| 仕組み | 位置 | 役割 |
|---|---|---|
| `useUnifiedWidgetContext` | presentation/hooks | presentation 側の共通入口 |
| `useQuerySlice` | presentation/hooks/slices | query 関連依存の局所化 |
| `useWidgetQueryContext` | application/hooks | QueryExecutor / DuckDB readiness |
| `useWidgetDataOrchestrator` | application/hooks | 取得系 readModel の統合配布 |
| `useQueryWithHandler` | application/hooks | 標準 query access（cache / profiling） |
| `useXxxPlan` | application/hooks/plans | Screen Plan（query orchestration） |
| `CrossChartSelectionContext` | presentation/components/charts | ウィジェット間 Focus 連動 |

### まだ併存しているもの

- 共通 readModel 配布で十分な系列と、Screen Plan で束ねる方が自然な系列が併存
- 一部のウィジェットは旧 props 互換を維持中（暫定互換 → 包含型コンテナ移行で段階的に解消）

### 標準実装リファレンス: TimeSlotChart

`TimeSlotChart` 系は、screen-specific plan パターンの代表実装である。

```
TimeSlotChart.tsx                  // Controller
  → useTimeSlotData.ts            // UI state + hierarchy state + derivation
  → useTimeSlotPlan.ts            // Screen Query Plan
  → useQueryWithHandler.ts        // 標準 query access
  → QueryHandler 群               // HourlyAggregation, DistinctDayCount, etc.
  → TimeSlotChartView.tsx         // View
  → TimeSlotChartOptionBuilder.ts // 表示構築
```

**原則:**
- component に acquisition logic を書かない
- comparison routing は plan に閉じる
- View は raw query 値を直接解釈しない
- 新規の複雑画面はこの構造を優先する

## 以下は元の設計仕様（更新中）

---

## 1. 連動状態モデル

グラフ間で共有する操作軸を以下の5層に分類する。

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Global Scope (settingsStore + uiStore) │
│   targetYear, targetMonth, selectedStoreIds     │
├─────────────────────────────────────────────────┤
│ Layer 2: Analysis Period (periodSelectionStore)  │
│   period1 (当期), period2 (比較期),             │
│   activePreset, comparisonEnabled               │
├─────────────────────────────────────────────────┤
│ Layer 3: Filter (filterStore)                    │
│   dayRange, selectedDows, aggregateMode,        │
│   hierarchy (dept/line/klass)                    │
├─────────────────────────────────────────────────┤
│ Layer 4: Focus (CrossChartSelectionContext)      │
│   focusedDay, focusedHour, focusedCategory,     │
│   focusedStore, drillPath                       │
├─────────────────────────────────────────────────┤
│ Layer 5: Widget-Local (useState)                 │
│   viewMode, lineMode, heatmapMetric,            │
│   detailView, rangeSlider                       │
└─────────────────────────────────────────────────┘
```

### 原則

- **Layer 1-3 の変更** → 全ウィジェットに波及（再クエリまたは再計算）
- **Layer 4 の変更** → 関連ウィジェットのみ反応（ハイライト・スクロール）
- **Layer 5 の変更** → 当該ウィジェット内で完結（再描画のみ）
- Layer 4 の状態を Layer 3 に昇格させる操作が **ドリルダウン**

### 連動状態の型定義案

```typescript
// ── Layer 4: Focus State（CrossChartSelectionContext の拡張） ──

/** グラフ間で共有する注目対象 */
interface ChartFocus {
  /** 選択中の日（日別チャート → 時間帯チャートの連動） */
  readonly day: number | null
  /** 選択中の時間帯 */
  readonly hour: number | null
  /** 選択中のカテゴリ（部門/ライン/クラス） */
  readonly category: CategoryFocus | null
  /** 選択中の店舗 */
  readonly storeId: string | null
  /** ドリルパス（操作履歴、← 戻る用） */
  readonly drillPath: readonly DrillStep[]
}

interface CategoryFocus {
  readonly level: 'department' | 'line' | 'klass'
  readonly code: string
  readonly name: string
}

interface DrillStep {
  readonly sourceWidgetId: string
  readonly targetWidgetId: string
  readonly filter: Partial<ChartFocus>
  readonly timestamp: number
}
```

---

## 2. グラフイベント標準

全グラフが実装すべきイベントインターフェース。

```typescript
/** グラフが外部に通知するイベント */
interface ChartEvents {
  /** 日を選択（クリック or ブラシ） */
  onSelectDay?: (day: number, endDay?: number) => void
  /** 時間帯を選択 */
  onSelectHour?: (hour: number) => void
  /** カテゴリを選択（部門/ライン/クラス） */
  onSelectCategory?: (focus: CategoryFocus) => void
  /** ドリルダウン要求（別ウィジェットへの遷移） */
  onDrillDown?: (target: DrillTarget) => void
  /** 選択解除 */
  onClearSelection?: () => void
}

interface DrillTarget {
  readonly widgetId: string
  readonly focus: Partial<ChartFocus>
}
```

### 現在のイベントとの対応

| 現在のイベント | 標準イベント | 備考 |
|---|---|---|
| `onDayRangeSelect(start, end)` | `onSelectDay(start, end)` | 名前統一 |
| `onClick(params)` | 各種 onSelect | params の型を統一 |
| `requestDrillThrough({widgetId, filter})` | `onDrillDown({widgetId, focus})` | filter → focus 型に統一 |
| `clearAll()` | `onClearSelection()` | そのまま |

### 移行方針

- 既存イベントを一度に全部変えない
- 新規ウィジェットは標準イベントで実装
- 既存ウィジェットは adapter パターンで段階移行

---

## 3. グラフ入力 ViewModel 標準

### 現状の入力パターン分類

| パターン | 例 | 問題 |
|---|---|---|
| **A: Raw DuckDB** | TimeSlotChart, HeatmapChart | グラフ内で DuckDB クエリ → ドメイン解釈 → VM 構築 |
| **B: Pre-computed maps** | DailySalesChartBody, CategoryPieChart | 親が計算済みデータを渡す → 描画のみ |
| **C: DuckDB + ctx** | FactorDecompositionPanel | ctx から conn を取得して内部でクエリ |

**目標**: パターン A を B に寄せる（パターン C は A の亜種）。

### ViewModel 化の方針

```
現在:
  Widget renders → useDuckDBXxx() → DuckDB query → raw rows → useMemo transform → ECharts option

目標:
  WidgetOrchestrator → useDuckDBXxx() → raw rows → VM transformer (pure fn) → ViewModel
  Widget renders → receives ViewModel → ECharts option（描画のみ）
```

### 各グラフの ViewModel 型案

```typescript
/** 時間帯チャート ViewModel */
interface TimeSlotChartVM {
  readonly hours: readonly string[]
  readonly series: {
    readonly currentAmount: readonly number[]
    readonly prevAmount: readonly number[]
    readonly currentQuantity: readonly number[]
    readonly prevQuantity: readonly number[]
  }
  readonly kpi: TimeSlotKpi
  readonly weather: readonly WeatherHourlyDisplay[]
  readonly prevWeather: readonly WeatherHourlyDisplay[]
  readonly insights: readonly string[]
  readonly compLabel: string
  readonly curLabel: string
}

/** 日別チャート ViewModel */
interface DailySalesChartVM {
  readonly days: readonly DayItem[]
  readonly budget: readonly number[]
  readonly hasPrev: boolean
  readonly weather: ReadonlyMap<number, DayWeatherInfo>
}

/** ヒートマップ ViewModel */
interface HeatmapChartVM {
  readonly matrix: readonly { hour: number; dow: number; value: number }[]
  readonly prevMatrix?: readonly { hour: number; dow: number; value: number }[]
  readonly metric: 'amount' | 'quantity'
}
```

### ViewModel 配置先

```
app/src/
├── application/
│   └── viewmodels/            ← 新設（純粋関数のみ）
│       ├── timeSlotChartVM.ts
│       ├── dailySalesChartVM.ts
│       ├── heatmapChartVM.ts
│       └── index.ts
```

**原則**:
- ViewModel 変換は純粋関数（React 非依存）
- 入力: DuckDB query result + Domain 型
- 出力: UI が描画するだけで済む型
- weatherCode 等のドメイン値解釈はここで完結

---

## 4. 再計算境界

操作ごとに **何が再実行される必要があるか** を定義する。

### 再計算コストの3段階

| レベル | コスト | 例 |
|---|---|---|
| **Re-query** | 高（DuckDB SQL 実行） | 期間・店舗・階層の変更 |
| **Re-compute** | 中（純粋関数の再計算） | 比較モード切替、VM 再構築 |
| **Re-render** | 低（React 再描画のみ） | ハイライト、ビューモード切替 |

### 操作 → 再計算マトリクス

| 操作 | Layer | 日別 | 時間帯 | ヒートマップ | 天気 | KPI |
|---|---|---|---|---|---|---|
| 年月変更 | L1 | Re-query | Re-query | Re-query | Re-query | Re-query |
| 店舗選択 | L1 | Re-query | Re-query | Re-query | Re-query | Re-query |
| 比較期間変更 | L2 | Re-query | Re-query | Re-query | Re-query | Re-compute |
| 日範囲フィルタ | L3 | Re-compute | - | - | - | Re-compute |
| 曜日フィルタ | L3 | Re-compute | Re-query | Re-query | - | Re-compute |
| 階層ドリル | L3 | - | Re-query | Re-query | - | - |
| 日を選択（Focus） | L4 | Re-render | Re-render | Re-render | - | - |
| 時間帯を選択 | L4 | - | Re-render | Re-render | - | - |
| ビューモード切替 | L5 | Re-render | Re-render | - | - | - |

### useMemo 依存配列の原則

```typescript
// Re-query: DuckDB hook の依存に含める
const { data } = useDuckDBHourly(conn, dataVersion, dateRange, storeIds)
//                                     ↑ L1       ↑ L2      ↑ L1

// Re-compute: useMemo の依存に含める
const vm = useMemo(() => buildTimeSlotVM(data, compData, weather), [data, compData, weather])
//                                                                  ↑ Re-query 結果

// Re-render: props/context の変化で自動
<TimeSlotChart vm={vm} focus={focus} />
//                      ↑ L4 → Re-render のみ
```

---

## 5. データ取得の上位集約

### 現状の取得責務

```
DashboardPage
  └─ useUnifiedWidgetContext()     ← JS計算 + 比較データ
       ├─ widget A (TimeSlotChart)
       │    └─ useDuckDBTimeSlotData()  ← 自前で DuckDB クエリ
       ├─ widget B (HeatmapChart)
       │    └─ useDuckDBHourDowMatrix() ← 自前で DuckDB クエリ
       └─ widget C (DailySalesChart)
            └─ props から受け取る       ← 上位が供給
```

### 目標の取得責務

```
DashboardPage
  └─ useUnifiedWidgetContext()     ← JS計算 + 比較データ
       └─ useWidgetDataOrchestrator() ← DuckDB クエリを集約（新設）
            ├─ timeSlotData = useDuckDBTimeSlot(...)
            ├─ heatmapData  = useDuckDBHeatmap(...)
            ├─ weatherData  = useDuckDBWeather(...)
            └─ return { timeSlotVM, heatmapVM, weatherVM, ... }
                ↓
            ├─ widget A (TimeSlotChart) ← VM を受け取るだけ
            ├─ widget B (HeatmapChart)  ← VM を受け取るだけ
            └─ widget C (DailySalesChart) ← VM を受け取るだけ
```

### 移行の段階

| フェーズ | 内容 | 影響範囲 |
|---|---|---|
| Phase 0 | 現状維持（各グラフが自前取得） | - |
| Phase 1 | ViewModel 型を定義。変換関数を application/viewmodels/ に配置 | 新規ファイルのみ |
| Phase 2 | 既存グラフを「VM 受取モード」に対応（props に VM を受ければ自前取得をスキップ） | 既存ファイル改修 |
| Phase 3 | Orchestrator hook を新設し、VM 供給を集約 | 上位 hook 新設 |
| Phase 4 | 各グラフから自前取得を除去（VM 受取のみに） | 既存ファイル改修 |

**原則**: Phase 1-2 は既存動作を壊さない。Phase 3-4 で初めて取得責務が移動する。

---

## 6. 連動シナリオ

### シナリオ A: 日別チャート → 時間帯チャート連動

```
ユーザーが日別チャートの3/15をクリック
  ↓
DailySalesChart.onSelectDay(15)
  ↓
CrossChartSelectionContext.setFocus({ day: 15 })
  ↓
TimeSlotChart は focus.day を受けて:
  - 3/15 の時間帯データにフィルタ
  - ヘッダに「3月15日の時間帯別売上」を表示
  ↓
HeatmapChart は focus.day を受けて:
  - 3/15 の行をハイライト
```

### シナリオ B: カテゴリヒートマップ → 日別チャート連動

```
ユーザーがヒートマップの「食品」×「14時」セルをクリック
  ↓
HeatmapChart.onSelectCategory({ level: 'department', code: '01', name: '食品' })
HeatmapChart.onSelectHour(14)
  ↓
CrossChartSelectionContext.setFocus({ category: {...}, hour: 14 })
  ↓
TimeSlotChart は focus.category を受けて:
  - 食品部門の時間帯売上に切替
DailySalesChart は focus.category を受けて:
  - 食品部門の日別推移を表示
```

### シナリオ C: 天気 → 売上相関

```
ユーザーが天気アイコンにホバー
  ↓
ツールチップ: 「14時: ☀️晴れ 22.3°C / 午前: ☀️晴れ 18.5°C / 午後: ☁️曇り 20.1°C」
  ↓
ユーザーが天気アイコンをクリック
  ↓
CrossChartSelectionContext.setFocus({ hour: 14 })
  ↓
日別チャート: 14時台の売上を右軸に表示
```

---

## 7. 実装ロードマップ

### 第1段階（契約定義）— 今週

- [ ] ChartFocus 型を `application/models/` に定義
- [ ] ChartEvents インターフェースを定義
- [ ] 既存 CrossChartSelectionContext を ChartFocus 型に align
- [ ] WeatherHourlyDisplay の責務分離（完了済み）

### 第2段階（ViewModel 化）— 今月

- [ ] `application/viewmodels/` ディレクトリ新設
- [ ] TimeSlotChart の ViewModel 型と変換関数を定義
- [ ] HeatmapChart の ViewModel 型と変換関数を定義
- [ ] 既存グラフに「VM 受取モード」を追加（後方互換）

### 第3段階（取得集約）— 中期

- [ ] `useWidgetDataOrchestrator` hook 新設
- [ ] DuckDB クエリの発行を Orchestrator に集約
- [ ] 各グラフから自前取得を除去
- [ ] useDuckDBTimeSlotData の分割（query / hierarchy / weather / KPI）

### 第4段階（連動強化）— 中期

- [ ] ドリルパス（操作履歴・← 戻る）の実装
- [ ] カテゴリ連動の双方向化
- [ ] 天気 ↔ 売上の相関ドリル
- [ ] フィルタ変更時のアニメーション遷移

---

## 代表天気の仕様

### 定義

「代表天気」とは、複数時間の天気コードから1つの代表値を選出する手続きである。

### Authoritative Engine（JS）の仕様

`aggregateOneDay()` が使用する選出ルール:

1. **頻度優先**: 最も多く出現した天気コードを代表とする
2. **深刻度タイブレーク**: 同数の場合、より深刻な天気を優先する
   - 深刻度順序: **雪 (3) > 雨 (2) > 曇り (1) > 晴れ (0)**
   - 例: 晴れ12h + 雨12h → 雨が代表
3. **初期値**: `records[0].weatherCode`（0 を初期値に使わない）

### Exploration Engine（DuckDB SQL）の仕様

`queryWeatherHourlyAvg()` は `MODE(weather_code)` を使用する。

- MODE は SQL の標準集約関数であり、タイブレーク時の挙動は非決定的
- **これは仕様上許容する**: Exploration Engine は探索用であり、正確な代表値は JS で算出する
- CQRS の二重実装禁止原則に従い、タイブレークロジックを SQL に移植しない

### 根拠

ユーザーの体感として「今日は雨だった」の判断は、降水のインパクトに引きずられる。
そのため、同頻度なら降水系の天気を優先する方がユーザー認知に合う。

---

## 設計判断の根拠

### なぜ「共通コンポーネント化」より「契約統一」が先か

1. **見た目を揃えても挙動が揃わない**: 同じ UI 部品でも、データ取得・フィルタ解釈・イベント発火が異なると連動は成立しない
2. **共通化は一方向**: 一度共通化すると個別最適に戻しにくい。契約統一なら個別実装のまま連動可能
3. **このアプリの思想との整合**: 4層分離 + 契約ベース設計は CLAUDE.md の「Contract で変更箇所を限定」（原則#12）と一致

### なぜ ViewModel 層を Application に置くか

- Domain: ドメイン値の意味（weatherCode → category）
- Application: 画面用の整形（category → icon + label + tooltip）
- Presentation: 描画（icon を `<td>` に配置）

ViewModel は「何を描画するか」を決める責務であり、「どう描画するか」ではない。
したがって Application 層が適切。Presentation に置くと、ドメイン値の解釈が再び漏れる。

---

## 売上推移分析ユニット — 標準実装リファレンス

日別売上チャート（overview）→ 時間帯別チャート（drilldown）の親子連動を
「包含型分析ユニット」として確立した標準実装。

### 設計原則

- **仕様継承**: DailySalesChart と TimeSlotChart は共通の `SalesAnalysisContext` を継承する派生ビュー
- **合成で実装**: React コンポーネント継承は使わない。親コンテナ + 共通文脈 + 派生 ViewModel
- **包含型ウィジェット**: ダッシュボードでは `IntegratedSalesChart` が1ウィジェット
- **文脈の一元管理**: 比較軸・店舗・階層・選択状態は親コンテナが持ち、子は受け取るだけ

### アーキテクチャ

```
IntegratedSalesChart（親コンテナ — 売上推移分析ユニット）
  ├─ SalesAnalysisContext を構築（buildSalesAnalysisContext）
  ├─ AnalysisViewEvents を CrossChartSelectionContext に伝播
  │
  ├─ DailySalesChart（overview ビュー）
  │   ├─ onDayRangeSelect → IntegratedSalesChart.selectedRange
  │   └─ DailySalesChartBody（描画）
  │
  ├─ TimeSlotChart（drilldown ビュー — context 経由で文脈を受領）
  │   ├─ useDuckDBTimeSlotData → buildTimeSlotChartOption → TimeSlotChartView
  │   └─ events.onSelectHour / onSelectCategory → 親に通知
  │
  └─ SubAnalysisPanel（連動パネル — 同じ analysisContext を使用）
      ├─ CategoryHeatmapPanel
      ├─ FactorDecompositionPanel
      ├─ DiscountAnalysisPanel
      └─ WeatherAnalysisPanel
```

### ファイル構成

| ファイル | 責務 | 行数 |
|---|---|---|
| `IntegratedSalesChart.tsx` | 親コンテナ。SalesAnalysisContext 構築、ドリル状態管理、イベント伝播 | ~250 |
| `DailySalesChart.tsx` | overview Controller。view/rightAxis/dow 状態管理 | ~198 |
| `DailySalesChartBody.tsx` | overview View。描画のみ | ~570 |
| `TimeSlotChart.tsx` | drilldown Controller。context or 従来 props からデータ取得 | ~170 |
| `TimeSlotChartView.tsx` | drilldown View。描画のみ（weatherCode を含まない） | ~410 |
| `TimeSlotChartOptionBuilder.ts` | ECharts option の純粋関数構築 | ~230 |
| `SubAnalysisPanel.tsx` | 右軸モード連動サブパネル | ~128 |

### 型定義

| 型 | 配置 | 用途 |
|---|---|---|
| `SalesAnalysisContext` | `application/models/` | 分析ユニットの共通文脈（UI/分析の文脈） |
| `AnalysisViewEvents` | `application/models/` | 子→親のインタラクション契約 |
| `CategoryFocus` | `application/models/` | カテゴリ選択のフォーカス対象 |
| `HierarchySelection` | `application/models/` | カテゴリ階層の選択状態 |

### 横展開テンプレート

他の分析ユニット（カテゴリ分析、予算分析等）を追加する場合:

1. `XxxAnalysisContext`（必要なら `SalesAnalysisContext` を拡張）を Application 層に定義
2. 親コンテナ `IntegratedXxxChart` を作成し、context を構築
3. overview ビュー `XxxOverviewChart` + drilldown ビュー `XxxDrillChart` を配下に配置
4. 子→親イベントは `AnalysisViewEvents` を共通で使用（必要なら拡張）
5. `CrossChartSelectionContext` 経由で他ユニットと連動

### 暫定互換

`UnifiedTimeSlotWidget`（ダッシュボード独立ウィジェット）は従来 props で動作する暫定互換。
新規改善は `IntegratedSalesChart` 側に寄せる。最終的に独立ウィジェットは縮退予定。
