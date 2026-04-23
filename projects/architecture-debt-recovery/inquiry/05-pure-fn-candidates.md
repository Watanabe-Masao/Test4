# inquiry/05 — hook / component 内に埋没している pure 関数候補

> 役割: Phase 1 inquiry 成果物 #5。`useMemo` / `useCallback` / inline reducer / 無名 map などに埋没している **pure 計算**（deterministic + 副作用なし + 非自明な arithmetic / aggregation / transformation）を、改修候補として列挙する。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`05a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `bf58c7c` |
| branch | `claude/budget-simulator-review-dJr9C` |
| scan scope | `presentation/pages/*/widgets/*.tsx`、`presentation/pages/*/widgets.tsx`、`features/*/ui/**/*.tsx`、`application/hooks/**/*.ts(x)`、`presentation/pages/*/hooks/**/*.ts`、`features/*/application/**/*.ts`（ただし `features/*/application/pure/*` 除外） |
| 除外 | `domain/calculations/` 配下、`application/readModels/*Builder.ts`、simple field access、formatting、単純 1-field map |
| 採取方法 | Explore agent による AST / grep 走査（全 scope 代表サンプル） |

## 候補の定義

本台帳が記録する「pure 関数候補」とは:

- deterministic（same inputs → same outputs）
- no side effects（no I/O / no store mutation / no DOM touch）
- 非自明な arithmetic / aggregation / transformation / derivation
- 以下のいずれかに埋没:
  - `useMemo` / `useCallback` の本体
  - inline function（component render 内 / `.reduce` / `.map` / `.filter` 等の callback）
  - hook / component ファイル内の module-local helper

本台帳に含まれない:
- simple field access（`ctx.result.daily`）/ prop forwarding
- formatting call（`formatCurrency(x)`）
- single-field pure mapping（`arr.map(x => x.field)`）
- 既に `domain/calculations/` / `features/*/application/pure/` 配下にある pure fn
- readModel builder（`application/readModels/*Builder.ts`）

## パターン分類

| ID | パターン | 定義 |
|---|---|---|
| P-AGG | aggregation | 配列全体の sum / count / average |
| P-DERIV | derivation | ratio / delta / rate / offset 導出 |
| P-TRANS | transformation | 形状変換 / reshape / flatten |
| P-FILTER | filter + aggregate | 絞り込み + 集計の複合 |
| P-REDUCE | non-trivial reducer | state-machine 的な reducer（running total + 条件分岐） |
| P-SORT | sort w/ calc comparator | 比較関数内に計算 |
| P-DATE | date / period | yyyy-mm 解析、日付 offset |
| P-CLASSIFY | classification | 閾値 / bucket 判定 |
| P-MAP | simple map | （候補としては弱い、参考記録） |

---

## A. 候補一覧（領域別）

### A-1. Dashboard widgets（`presentation/pages/Dashboard/widgets/`）

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 45-62 | `AlertPanel.tsx:useMemo` | P-DERIV | DateKey-keyed 前年日次 sales を day-number-keyed map に変換（alert 評価用） | 18 |
| 77-80 | `CategoryFactorBreakdown.tsx:useMemo` | P-CLASSIFY | drill path / level 位置の record に下位カテゴリが存在するか判定 | 4 |
| 86-98 | `CategoryFactorBreakdown.tsx:useMemo` | P-TRANS | 指定 level（2/3/5 factor）で factor items を decomposition | 13 |
| 86-107 | `CategoryFactorBreakdown.tsx:useMemo` | P-TRANS | drill path と level でカテゴリレコードを filter + reshape | 12 |
| 101-104 | `CategoryFactorBreakdown.tsx:useMemo` | P-TRANS | factor items から waterfall item ranges を構築 | 4 |
| 109-115 | `ConditionMatrixTable.tsx:useMemo` | P-TRANS | 日数を DateRange 型に変換 | 5 |
| 128-131 | `ConditionMatrixTable.tsx:useMemo` | P-TRANS | 生レコードから trend 計算つきで condition matrix を構築 | 4 |
| 59-69 | `ConditionSummary.tsx:useMemo` | P-TRANS | 店舗 override を merge した effective config を導出 | 11 |
| 86-110 | `ConditionSummaryBudgetDrill.tsx:useMemo` | P-TRANS | drill context と result から row input を構築 | 25 |
| 110-111 | `ConditionSummaryBudgetDrill.tsx:useMemo` | P-TRANS | budget drill rows 構築 + totals 計算 | 2 |
| 92-130 | `ConditionSummaryEnhanced.tsx:useMemo` | P-TRANS | 複数店舗集計つきで全 condition cards を算出 | 39 |
| 76-98 | `GrossProfitHeatmap.tsx:useMemo` | P-TRANS | readModels or StoreResult から GP rates を構築 + budget merge | 23 |
| 77-91 | `DrillCalendar.tsx:useMemo` | P-TRANS | leading padding + row break 付き calendar grid layout 計算 | 15 |
| 98-111 | `DrillCalendar.tsx:useMemo` | P-AGG | in-range 週 totals + YoY ratio 算出 | 14 |
| 114-131 | `DrillCalendar.tsx:useMemo` | P-AGG | 曜日平均 + count + YoY の集計 | 18 |
| 134-147 | `DrillCalendar.tsx:useMemo` | P-AGG | in-range daily + comparison から overall 平均を算出 | 14 |
| 121-142 | `HourlyYoYSummary.tsx:useMemo` | P-FILTER+AGG | actual data を filter、時間帯ごとの YoY ratio + diff を計算 | 21 |
| 146-161 | `HourlyYoYSummary.tsx:useMemo` | P-AGG | max/min 気温 / 降水 / dominant weather code で weather summary を算出 | 16 |
| 97-127 | `HourlyWeatherModal.tsx:useMemo` | P-TRANS | actual / forecast / prev を統合した時間帯 chart data | 31 |
| 148-156 | `HourlyChart.tsx:useMemo` | P-TRANS | padded data から cumulative data + total amount を構築 | 9 |
| 154-196 | `PrevYearBudgetDetailPanel.tsx:useMemo` | P-AGG | base rows からの週次 totals 集計 | 13 |
| 49-64 | `WeatherSummaryRow.tsx:useMemo` | P-AGG | 前年週次の max/min 気温 / 降水 / dominant code を集計 | 16 |

### A-2. Budget feature（`features/budget/ui/`）

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 44-70 | `DowAverageRow.tsx:useMemo` | P-AGG | 曜日統計（budget / ly / actual / count）を daily から集計 | 27 |
| 72-86 | `DowAverageRow.tsx:useMemo` | P-AGG | elapsed range 内の daily budget / ly / actual 合計 | 15 |
| 77-90 | `DrillCalendar.tsx:useMemo` | P-TRANS | day cells + rows + leading/trailing padding で calendar grid 構築 | 14 |
| 98-111 | `DrillCalendar.tsx:useMemo` | P-AGG | day data から週次 totals を合算、YoY 算出 | 14 |
| 114-131 | `DrillCalendar.tsx:useMemo` | P-AGG | day data から曜日平均 + counts + YoY を集計 | 18 |
| 134-147 | `DrillCalendar.tsx:useMemo` | P-AGG | daily + comparison から月平均を算出 | 14 |
| 78-86 | `DayCalendarInput.tsx:useMemo` | P-TRANS | day cells を含む calendar grid rows を構築 | 9 |
| 137-145 | `DailyBarChart.tsx:useMemo` | P-FILTER | start/end range に data を slice | 9 |
| 145-165 | `DailyBarChart.tsx:useMemo` | P-TRANS | actual / budget / ly series の ECharts bar chart option を構築 | 21 |

### A-3. Category feature（`features/category/ui/`）

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 37-55 | `CategoryCharts.tsx:useMemo` | P-TRANS | 日次 category data を pie chart 用に reshape | 19 |
| 62-97 | `CategoryCharts.tsx:useMemo` | P-TRANS | categories + values で ECharts pie option 構築 | 36 |
| 27-51 | `CategoryComparisonCharts.tsx:useMemo` | P-TRANS | 2 つの data set から category 比較 series を構築 | 25 |
| 52-120 | `CategoryComparisonCharts.tsx:useMemo` | P-TRANS | ECharts bar 比較 option を構築 | 69 |

### A-4. Purchase feature（`features/purchase/ui/`）

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 123-127 | `PurchaseDailyPivot.tsx:useMemo` | P-MAP | column list から key array へ map | 1 |
| 123-127 | `PurchaseDailyPivot.tsx:useMemo` | P-REDUCE | accumulator state-machine で週次 subtotals を計算 | 35 |
| 152-169 | `PurchaseDailyPivot.tsx:useMemo` | P-REDUCE | row-by-row の cumulative cost/price totals 計算 | 18 |
| 69-69 | `PurchaseVsSalesChart.tsx:useMemo` | P-TRANS | 売上 vs 原価の日次比較 data 構築 | 1 |
| 71-137 | `PurchaseVsSalesChart.tsx:useMemo` | P-TRANS | 売上/原価 main ECharts option | 67 |
| 138-195 | `PurchaseVsSalesChart.tsx:useMemo` | P-TRANS | 原価/売上 ratio ECharts option | 58 |

### A-5. Application hooks（`application/hooks/`）

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 142-166 | `useDailySalesData.ts:useMemo` | P-TRANS | DuckDB quantity merge つきで base day items + waterfall data | 24 |
| 169-174 | `useDailySalesData.ts:useMemo` | P-FILTER | selected dows から day-of-week filter function 作成 | 5 |
| 176-184 | `useDailySalesData.ts:useMemo` | P-FILTER | range + dow で data を filter、waterfall or base を選択 | 9 |
| 38-47 | `useDrillDateRange.ts:useMemo` | P-TRANS | drill context から DateRange 構築 | 10 |
| 47-54 | `useDrillDateRange.ts:useMemo` | P-TRANS | drill + prevYear から PrevYearScope 導出 | 8 |
| 53-60 | `useClipExport.ts:useMemo` | P-TRANS | period selection から current + prev DateRange 導出 | 8 |
| 42-48 | `useComparisonModule.ts:useMemo` | P-CLASSIFY | 店舗 / 期間 selection から ComparisonScope 判定 | 7 |
| 80-92 | `useDailyPageData.ts:useMemo` | P-TRANS | daily records を chart / table data に transform + aggregate | 13 |
| 68-83 | `useDataSummary.ts:useMemo` | P-AGG | 条件付き（budget / actual / variance）の KPI sum | 16 |
| 22-22 | `useDeptKpiView.ts:useMemo` | P-TRANS | flat record list から department KPI index 構築 | 1 |
| 38-60 | `useDowGapAnalysis.ts:useMemo` | P-AGG | daily actual vs budget の曜日別分散計算 | 23 |

### A-6. Weather feature（`features/weather/`）

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 31-49 | `usePrevYearWeather.ts:useMemo` | P-TRANS | 前年 weather 参照用の months 導出 | 19 |
| 51-64 | `usePrevYearWeather.ts:useMemo` | P-TRANS | etrnDaily から前年 weather daily map 構築 | 14 |
| 80-88 | `WeatherPage.tsx:useMemo` | P-MAP | store map から ID → name array 構築 | 9 |
| 166-173 | `WeatherPage.tsx:useMemo` | P-TRANS | selection + prevYearMonths から前年 data 導出 | 8 |
| 175-175 | `WeatherPage.tsx:useMemo` | P-TRANS | 月次 weather summary 計算 | 1 |
| 181-193 | `WeatherPage.tsx:useMemo` | P-TRANS | 選択日の weather summary 計算 | 13 |
| 194-207 | `WeatherPage.tsx:useMemo` | P-TRANS | 前年対応日の weather summary 計算 | 14 |
| 59-63 | `WeatherTemperatureChart.tsx:useMemo` | P-MAP | 前年 temp data を day-keyed lookup へ map | 5 |

### A-7. Reports / Admin pages

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 160-186 | `RawDataTab.tsx:useMemo` | P-TRANS | 生 records から day list + pivoted table rows を構築 | 27 |
| 187-206 | `RawDataTab.tsx:useMemo` | P-AGG | table rows から店舗 totals 集計 | 20 |
| 53-60 | `PurchaseAnalysisPage.tsx:useMemo` | P-TRANS | user category ID → label map 構築 | 8 |
| 62-68 | `PurchaseAnalysisPage.tsx:useMemo` | P-TRANS | store ID → name map 構築 | 7 |
| 70-73 | `PurchaseAnalysisPage.tsx:useMemo` | P-DERIV | period + preset から曜日 offset 導出 | 4 |
| 75-75 | `PurchaseAnalysisPage.tsx:useMemo` | P-DERIV | selection から effective period 2 を導出 | 1 |

### A-8. Forecast feature

| 行 | 所在 | パターン | 概要 | 行数 |
|---|---|---|---|---|
| 45-45 | `ForecastChartsCustomer.tsx:useMemo` | P-TRANS | forecast data から dow customer ECharts option 構築 | 1 |
| 164-164 | `ForecastChartsCustomer.tsx:useMemo` | P-TRANS | customer sales ECharts option 構築 | 1 |
| 203-203 | `ForecastChartsCustomer.tsx:useMemo` | P-TRANS | same-dow ECharts option 構築 | 1 |

---

## B. 集計

### B-1. パターン別件数

| パターン | 件数 |
|---|---|
| P-TRANS（transformation / reshape） | 44 |
| P-AGG（aggregation） | 22 |
| P-MAP（simple map、参考記録） | 5 |
| P-FILTER（filter + aggregate） | 5 |
| P-DERIV（derivation） | 4 |
| P-CLASSIFY（classification） | 3 |
| P-REDUCE（non-trivial reducer） | 2 |
| **合計** | **95** |

### B-2. 領域別の density

| 領域 | 候補数 | 備考 |
|---|---|---|
| `presentation/pages/Dashboard/widgets/` | 25 | Dashboard widget tree に最大濃度 |
| `application/hooks/` | 15 | page / feature 境界を跨ぐ hook 群 |
| `presentation/pages/*`（Forecast / Weather / Purchase 他） | 25 | 各 page 直下の hook / component |
| `features/budget/ui/` | 9 | Budget Simulator の UI |
| `features/category/ui/` | 4 | chart option 構築 |
| `features/purchase/ui/` | 4 | pivot / chart |
| その他 features | 13 | weather / forecast / reports 等 |

### B-3. 行数分布

- 最大: 69 行（`CategoryComparisonCharts.tsx` の ECharts option builder）
- 最小: 1 行（single-line useMemo wrap。既に pure fn に delegate しているケースも含む）
- 平均: 約 12 行

### B-4. 既に部分的に抽出されているパターン

事実として、以下のパターンでは既に `@/domain/calculations/` や `@/features/*/application/pure/` への抽出が部分的に進んでいる（本台帳は抽出候補 95 件に「未抽出」の状態を記録しているが、抽出済みの例を参照として記録）:

- `buildBudgetSimulatorScenario` — `features/budget/application/pure/`
- `buildCausalSteps` — `features/causal/application/pure/`
- `buildForecastInput` / `buildDailyDecomposition` 他 — `pages/Forecast/ForecastPage.helpers`（presentation 層だが pure）

事実: 抽出済みの helper が `presentation/pages/*/helpers` に置かれているケース（ForecastPage.helpers）と、`features/*/application/pure/` に置かれているケースが並存している。抽出先の**一貫性に揺れ**がある。

---

## C. Ambiguity / 未追跡項目

### C-1. 1 行 useMemo の分類

single-line `useMemo(() => buildX(...), [...])` は、既に pure fn（`buildX`）に delegate しているケースも多く、本台帳では「参考記録」として P-MAP / P-TRANS に含めているが、実質的には「抽出済み」の状態。P-MAP / P-TRANS の 1 行件数は抽出候補としての強度が弱い。

### C-2. ECharts option builder の扱い

`.option.ts` や chart component 内で構築される ECharts option は、しばしば 50+ 行の巨大 P-TRANS として検出される（`CategoryComparisonCharts` 69 行、`PurchaseVsSalesChart` 67 + 58 行、`HourlyWeatherModal` 31 行 等）。これらは単純な pure だが、ECharts 契約に依存する。本台帳は pattern としては P-TRANS に分類するが、改修候補としての扱い（domain/calculations/ 向きか、chart-specific helper 向きか）は Phase 2 以降の判断に委ねる。

### C-3. scope 外の抽出済み pure fn

本台帳は抽出**候補**のみを列挙しており、既に抽出済みの pure fn（`domain/calculations/*` / `features/*/application/pure/*` / `application/readModels/*Builder.ts` 等）はカウントしていない。Phase 1 の時点で抽出済み / 未抽出の比率は未計測。

### C-4. useCallback 本体の分類

本台帳は主に `useMemo` 内の pure を列挙している。`useCallback` 本体が pure calculation である事例は件数少で、個別列挙せず。

### C-5. 95 件という数の性質

95 件は Explore agent による**代表サンプル**であり、scope 全域の完全列挙ではない。取り切れていない候補が追加で存在する可能性がある（agent 出力内に "representative samples" と明記）。

---

## 付記

- 本台帳は immutable。Phase 2 以降の追加情報は `05a-*.md` として addend する
- Phase 2 真因分析で「なぜ pure が埋没しているか」の仮説化、Phase 4 改修計画で「どの候補をどう抽出するか」の計画、Phase 6 で実装
- 関連: `inquiry/06-data-pipeline-map.md`（pure builder の既存配置パターン）、`inquiry/07-complexity-hotspots.md`（行数 / useMemo 数の hotspot 予定）
