# ADR-002: 期間選択モデル刷新 — 月跨ぎ対応・自由日付範囲

**ステータス**: Accepted（採用済み）
**日付**: 2026-03-09
**影響範囲**: domain / application / infrastructure / presentation

---

## コンテキスト

現在のシステムは `targetYear`/`targetMonth` + `dataEndDay` + `ComparisonFrame` が散在し、
月単位に縛られている。月跨ぎの移動平均や自由な日付範囲での分析ができない。
これを統合し、DuckDB で任意日付範囲を取得 → JS で計算する設計に刷新する。

**これはシステムの核となる変更。** 保守性・パフォーマンス・イメージしやすさ・拡張性の
すべてにおいて理想を追求する。

---

## 意思決定記録

| # | 論点 | 決定 | 理由 |
|---|---|---|---|
| 1 | 月跨ぎ許可 | **許可** | DuckDB SQL で値を取得し JS が計算。直接生の値は使用しない |
| 2 | 期間-1 → 期間-2 連動 | **自由選択時は非連動、プリセット時のみ連動** | ショートカットであり、ユーザーが再指定可能 |
| 3 | dataEndDay / ComparisonFrame 移行 | **後方互換不要。消費側も修正** | 無駄なロジック整理とシンプルな実装のため |
| 4 | 個別期間指定の永続化 | **保持する** | ユーザーの選択を維持 |
| 5 | 4期間の取得タイミング | **前年同月±1ヶ月も事前取得** | 月跨ぎ移動平均で使用 |
| 6 | 比較ON/OFF 初期値 | **比較ON** | デフォルト体験として比較を有効にする |
| 7 | ウィジェット期間仕分け | **Contract パターン** | 個別がバラバラにならない。宣言的に管理 |
| 8 | JS日別チャートの月跨ぎ | **DateKey ベースに変換** | `Map<number, _>` → `Map<DateKey, _>`。正確な日付表示 |

---

## 設計

### 4つの期間

| 期間 | 説明 | 算出方法 |
|---|---|---|
| period1 (当期) | 分析対象期間 | ユーザー指定 |
| period2 (比較期) | 比較対象期間 | プリセット or ユーザー指定 |
| period1Adjacent | period1 の前後1ヶ月 | 自動算出（移動平均用） |
| period2Adjacent | period2 の前後1ヶ月 | 自動算出（移動平均用） |

### プリセット

| プリセット | 説明 | ラベル |
|---|---|---|
| `prevYearSameMonth` | 前年同月（デフォルト） | 前年同月 |
| `prevYearSameDow` | 前年同曜日合わせ | 前年同曜日 |
| `prevMonth` | 前月 | 前月 |
| `custom` | 自由指定 | カスタム |

### 連動ルール

- **period1 変更時**: `activePreset ≠ custom` なら period2 も再算出（プリセット連動）
- **period2 変更時**: `activePreset` を `custom` に切り替え（自由指定モード）
- **プリセット変更時**: period2 を自動算出
- **期間-1 スライダー操作時**: 自由選択モードでは期間-2 は連動しない

### PeriodContract — 期間要求の仕分け

既存の **ComparisonContract** パターン（設計原則 #12）を踏襲する。

| 既存 (`ComparisonContract.ts`) | 新規 (`PeriodContract.ts`) | 対応関係 |
|---|---|---|
| `ComparisonEntry<T>` | `PeriodEntry<T>` | 1つの期間のデータ + メタ情報 |
| `ComparisonResult<T>` | `PeriodResult<T>` | 複数期間をまとめた構造 |
| `AlignmentPolicy` | `ComparisonPreset` | モード識別 |
| `ALIGNMENT_LABELS` | `PRESET_LABELS` | i18n 対応ラベル |
| `createComparisonEntry()` | `createPeriodEntry()` | ヘルパー |

**Presentation 層は `PeriodResult.entries` をループし、個別の期間種別を知らずに描画する。**

#### PeriodNeed

ウィジェットが必要とする期間の種類を宣言する。

| PeriodNeed | 解決される期間 | 代表ウィジェット例 |
|---|---|---|
| `current` | period1 のみ | KPI（比較なし）、DuckDB 単期間チャート |
| `comparison` | period1 + period2 | 前年比 KPI、YoY チャート |
| `adjacent` | period1 + 前後1ヶ月 | 移動平均、季節性分析 |
| `comparisonFull` | period1 + period2 + 両方の隣接月 | 包括的比較分析（将来用） |

#### 型定義

```typescript
type PeriodNeed = 'current' | 'comparison' | 'adjacent' | 'comparisonFull'

interface PeriodEntry<T> {
  readonly key: 'current' | 'comparison'
  readonly period: DateRange
  readonly data: T
  readonly hasData: boolean
  readonly label: string
  readonly shortLabel: string
}

interface PeriodResult<T> {
  readonly current: PeriodEntry<T>
  readonly comparison?: PeriodEntry<T>
  readonly entries: readonly PeriodEntry<T>[]
  readonly selection: PeriodSelection
}

interface ResolvedPeriods {
  readonly period1: DateRange
  readonly period2?: DateRange
  readonly period1Adjacent?: AdjacentMonths
  readonly period2Adjacent?: AdjacentMonths
  readonly comparisonEnabled: boolean
  readonly selection: PeriodSelection
}
```

### パフォーマンス設計

| 方針 | 根拠 |
|---|---|
| period 変更は `dataVersion` をインクリメントしない | データ自体は変わらない。WHERE 句が変わるだけ |
| `useAsyncQuery` の既存 debounce (50ms) を活用 | 期間スライダー操作時のカスケード更新を抑制 |
| `useMemo` で queryFn を期間パラメータに依存 | 期間変更時のみ再クエリ |
| 隣接月データは `PeriodNeed: adjacent` 宣言時のみ取得 | 不要なクエリを抑制 |
| seqRef ベースのキャンセル | 古い結果が新しい結果を上書きしない |

### ゼロ値パターン

既存の `ComparisonContext` と同様、**null を返さない**:
- 比較 OFF: `PeriodResult.comparison = undefined` だが `entries` は current のみで populated
- データなし: `PeriodEntry.hasData = false` + ゼロ値メトリクス
- 消費側は `if (data)` チェック不要

---

## データフロー

### 現在（旧）

```
settingsStore.targetYear/Month + dataEndDay
  → filterStore.dayRange [1, endDay]
  → useFilterDateRange() → DateRange（月内のみ）
  → useComparisonFrame() → ComparisonFrame
  → usePrevYearData() → PrevYearData
  → WidgetContext に全部載せる
  → 各ウィジェットが暗黙的に必要なものを取る
```

### 新

```
periodSelectionStore (period1, period2, comparisonEnabled, activePreset)
  ↓
usePeriodResolver(widgetDef.periodRequirement)
  ↓ need に応じて必要な期間のみ解決
ResolvedPeriods { period1, period2?, adjacent? }
  ↓
DuckDB: queryStoreDaySummary(各期間) ← 並列取得
  ↓
JS: calculateAllPeriodMetrics() → PeriodMetrics
  ↓
PeriodResult<PeriodMetrics> { current, comparison?, entries[] }
  ↓
WidgetContext.periodResult
  ↓
各ウィジェットは entries.map() でモード非依存に描画
```

---

## 実装ファイル一覧

### Phase 1: Domain 層（完了）

| ファイル | 内容 | テスト |
|---|---|---|
| `domain/models/PeriodSelection.ts` | 型定義 + 算出関数 | 13件 PASS |
| `domain/patterns/period/PeriodContract.ts` | Contract パターン | 18件 PASS |
| `domain/patterns/period/index.ts` | バレル | — |
| `domain/models/calendar.ts` | バレル更新 | — |

### Phase 2: Application 層 — Store（完了）

| ファイル | 内容 | テスト |
|---|---|---|
| `application/stores/periodSelectionStore.ts` | Zustand + persist | 12件 PASS |

### Phase 3: Application 層 — Resolver（完了）

| ファイル | 内容 | テスト |
|---|---|---|
| `application/hooks/usePeriodResolver.ts` | PeriodNeed → ResolvedPeriods | 9件 PASS |

### Phase 4: 消費側の移行（未着手）

#### 4-a: WidgetDef + WidgetContext

| ファイル | 変更 |
|---|---|
| `widgets/types.ts` | `periodRequirement` 追加、period1/period2 追加、旧フィールド削除 |
| `useUnifiedWidgetContext.ts` | periodSelectionStore 読み取り |
| 全レジストリ (5個) | `periodRequirement` 設定 |

#### 4-b: ComparisonFrame → period2（8ファイル）

| ファイル | 変更 |
|---|---|
| `useComparisonFrame.ts` | 削除 |
| `resolveComparisonFrame.ts` | `applyPreset()` に統合済み |
| `usePrevYearData.ts` | period2 DateRange でマッピング |
| `usePrevYearMonthlyKpi.ts` | 同上 |
| `useYoyQueries.ts` | `period2: DateRange` |
| `useJsAggregationQueries.ts` | 同上 |
| `DuckDBYoYChart.tsx` | `period2` prop |
| `DayDetailModal.tsx/.vm.ts` | period2 |

#### 4-c: dataEndDay → period1（9ファイル）

| ファイル | 変更 |
|---|---|
| `DataEndDaySlider.tsx` | period1.to 操作 |
| `useDayRange.ts` | periodSelectionStore.period1 |
| `filterStore.ts` | リセットロジック変更 |
| `calculationCache.ts` | period1 キー |
| `CalculationOrchestrator.ts` | period1 有効範囲 |
| `ExecSummaryBarWidget.tsx` | ctx.period1.to |
| `registryKpiWidgets.tsx` | 同上 |
| `StoreKpiTableInner.tsx` | 同上 |
| `advancedForecast.ts` | period1.to |

#### 4-d: JS日別チャート DateKey 化（8ウィジェット + データ生成元）

`DailySalesChart.tsx`, `GrossProfitAmountChart.tsx`, `DiscountTrendChart.tsx`,
`CustomerScatterChart.tsx`, `MultiKpiSparklines.tsx`, `PerformanceIndexChart.tsx`,
`RevenueStructureChart.tsx`, `IntegratedTimeline.tsx`
+ `usePrevYearData.ts` を DateKey ベース Map に変更

#### 4-e: Admin UI + 月切替

| ファイル | 変更 |
|---|---|
| `PrevYearMappingTab.tsx` | プリセット選択 + period2 編集 UI |
| `useMonthSwitcher.ts` | `periodSelectionStore.resetToMonth()` 追加 |

### Phase 5: Settings モデル整理

`AppSettings` から削除: `dataEndDay`, `prevYearSourceYear/Month`, `prevYearDowOffset`, `alignmentPolicy`

---

## PeriodNeed × ウィジェット分類

| PeriodNeed | 数 | 代表例 |
|---|---|---|
| `current` | ~32 | KPI（比較なし）、DuckDB 単期間チャート |
| `comparison` | ~15 | 前年比 KPI、YoY チャート、DuckDB+比較 |
| `adjacent` | ~2 | 移動平均、季節性分析 |
| `comparisonFull` | ~1 | 包括的比較分析（将来用） |

---

## 検証方法

1. `npm run lint` — ESLint エラー 0
2. `npm run build` — tsc + vite build 通過
3. `npm test` — 全テスト通過（52件の新規テスト含む）
4. `npm run format:check` — Prettier 準拠

---

## 却下した選択肢

### 月跨ぎ禁止

月単位に制限すれば実装は簡単だが、移動平均・季節性分析・自由範囲分析が不可能。
DuckDB がある現在、月制限は不要な制約。

### 期間-1 → 期間-2 常時連動

ユーザーが自由に期間-2 を指定したいケースがある。
プリセット使用時のみ連動が、ショートカットと自由度の最適なバランス。

### WidgetDef に期間ロジックを分散

各ウィジェットが独自に期間を管理すると、一貫性が失われる。
Contract パターンで宣言的に管理し、仕分けの責務を `usePeriodResolver` に集約。

### Map<number, _> の維持

日番号ベースの Map は月跨ぎ時にキーが衝突する。
DateKey (`YYYYMMDD`) ベースに変換することで、任意日付範囲を正確に扱える。
