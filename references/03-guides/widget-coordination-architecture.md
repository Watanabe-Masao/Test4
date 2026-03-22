# ウィジェット連動アーキテクチャ

> 本ドキュメントは、個別最適で作られたグラフ群を連動させるための
> **契約・状態モデル・イベント標準・再計算境界** を定義する。
>
> 前提: グラフの見た目やライブラリを共通化するのではなく、
> **連動の入力契約を先に揃える** ことが目的。

## 現状分析

### 既にある土台

| 仕組み | 位置 | 役割 |
|---|---|---|
| `useUnifiedWidgetContext` | presentation/hooks | 全ウィジェットへの共通データ供給 |
| `CrossChartSelectionContext` | presentation/components/charts | ウィジェット間選択・ドリルスルー |
| Zustand stores (5個) | application/stores | グローバル状態管理 |
| `useComparisonModule` | application/hooks | 比較データの唯一の供給元 |
| architectureGuard | test | 重複取得・境界違反の抑止 |

### 現状の問題

1. **データ取得がグラフ内に分散**: TimeSlotChart, HeatmapChart 等は内部で DuckDB を直接クエリ
2. **状態解釈がグラフ内に分散**: 各グラフが `compMode`, `hierarchy`, `viewMode` を独自管理
3. **ViewModel 変換が未統一**: 天気・カテゴリ等のドメイン値解釈が UI に漏れていた
4. **連動イベントの粒度が粗い**: `CrossChartSelectionContext` は highlight/drillThrough のみ

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
