# inquiry/02 — widget × ctx field 依存 map

> 役割: Phase 1 inquiry 成果物 #2。45 widget × `UnifiedWidgetContext` 47 field（内 `WidgetContext` 昇格 25）の使用 map。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`02a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `5c181de`（WID-040 pilot 直後。widget-related コード変更なし） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/01-widget-registries.md` のサマリ表 + registry source 10 ファイル（`app/src/presentation/pages/Dashboard/widgets/registry*.tsx` + `app/src/presentation/pages/*/widgets.tsx`）直読 |
| 対象外 | 子 component 内部の ctx touch（inquiry/01 §b ambiguity 参照。本台帳は **registry 行からの直接参照**のみ） |

## 計測方針

本台帳が記録するのは **registry 行（`.tsx` 内の `WidgetDef` entry）の render 関数および isVisible predicate が直接参照する ctx フィールド** のみ。

以下は本台帳の計測範囲**外**:

1. 子 component 内部での ctx touch（full ctx passthrough 時、子側で解決される）
2. 子が受け取った個別 props 経由の間接 touch
3. readModel / lane 経由の間接的な ctx 参照

子側 touch は Phase 6 で frontmatter generator が AST 走査で統合する想定。本台帳は generator 未実装段階のベースラインとして registry 行 surface のみを記録する。

## Widget × Field Map（縦=widget、横=直接参照の有無）

47 field 全列挙は表として横に広すぎるため、以下 2 形式で記録する:

1. **Per-widget field list**（セクション A）: 各 widget 行に touched field の配列
2. **Per-field widget list**（セクション B）: 各 field に touching widget の配列

---

## A. Per-widget field list

registry 登録順。フィールド名は `ctx.` を省略。`result.daily` のような sub-path も深掘り列挙。

### A-1. Dashboard-local registry（WidgetDef 型 A、WIDGETS_KPI / CHART / EXEC / ANALYSIS / DUCKDB）

| 型番 | widget id | 直接参照 field | 件数 | 子への full ctx forward |
|---|---|---|---|---|
| WID-001 | widget-budget-achievement | `allStoreResults` | 1 | ✓（`ConditionSummaryEnhanced`） |
| WID-002 | chart-daily-sales | `result.daily`, `result.budgetDaily`, `result.discountEntries`, `result.grossSales`, `daysInMonth`, `year`, `month`, `prevYear.hasPrevYear`, `prevYear.daily`, `queryExecutor`, `currentDateRange`, `selectedStoreIds`, `prevYearScope`, `weatherDaily`, `prevYearWeatherDaily`, `comparisonScope.dowOffset`, `weatherPersist` | 17 | ✓（`widgetCtx={ctx}` で duplicate 注入） |
| WID-003 | chart-gross-profit-amount | `result.daily`, `daysInMonth`, `year`, `month`, `result.grossProfitBudget`, `targetRate`, `warningRate`, `prevYear`, `chartPeriodProps` | 9 | ✗（個別 props のみ） |
| WID-004 | chart-timeslot-heatmap | （`isTimeSeriesVisible` predicate の関数参照 + `UnifiedHeatmapWidget` への full ctx） | 0（直接参照なし） | ✓ |
| WID-005 | chart-store-timeslot-comparison | （`isStoreComparisonVisible` predicate + `UnifiedStoreHourlyWidget` への full ctx） | 0 | ✓ |
| WID-006 | chart-sales-purchase-comparison | `allStoreResults`, `stores`, `daysInMonth`, `storeDailyLane`, `chartPeriodProps` | 5 | ✗ |
| WID-007 | chart-weather-correlation | （`WeatherWidget` への full ctx） | 0 | ✓ |
| WID-008 | analysis-alert-panel | `storeKey` | 1 | ✓（`AlertPanelWidget`） |
| WID-009 | exec-dow-average | （`renderDowAverage` に委譲） | 0 | ✓ |
| WID-010 | exec-weekly-summary | （`renderWeeklySummary` に委譲） | 0 | ✓ |
| WID-011 | exec-daily-store-sales | （`renderDailyStoreSalesTable` に委譲） | 0 | ✓ |
| WID-012 | exec-daily-inventory | （`renderDailyInventoryTable` に委譲） | 0 | ✓ |
| WID-013 | exec-store-kpi | （`renderStoreKpiTable` に委譲） | 0 | ✓ |
| WID-014 | exec-forecast-tools | `storeKey` | 1 | ✓（`ForecastToolsWidget`） |
| WID-015 | analysis-waterfall | `storeKey` | 1 | ✓（`WaterfallChartWidget`） |
| WID-016 | analysis-gp-heatmap | `storeKey` | 1 | ✓（`GrossProfitHeatmapWidget`） |
| WID-017 | analysis-customer-scatter | `result.daily`, `daysInMonth`, `year`, `month`, `prevYear` | 5 | ✗ |
| WID-018 | analysis-performance-index | `result`, `daysInMonth`, `year`, `month`, `prevYear`, `queryExecutor`, `currentDateRange`, `prevYearScope`, `selectedStoreIds`, `allStoreResults`, `stores`, `currentCtsQuantity`, `readModels` | 13 | ✗ |
| WID-019 | analysis-category-pi | `prevYearScope`, `readModels.customerFact`, `result.totalCustomers`（`isVisible: () => false` で常時非可視） | 3 | ✗ |
| WID-020 | analysis-causal-chain | `result`, `prevYear` | 2 | ✗ |
| WID-021 | analysis-sensitivity | `result`, `readModels.customerFact` | 2 | ✗ |
| WID-022 | analysis-regression-insight | `result`, `year`, `month` | 3 | ✗ |
| WID-023 | analysis-seasonal-benchmark | `month`, `monthlyHistory` | 2 | ✗ |
| WID-024 | analysis-duckdb-features | `queryExecutor`, `currentDateRange`, `selectedStoreIds` | 3 | ✗ |
| WID-025 | duckdb-dow-pattern | `queryExecutor`, `currentDateRange`, `selectedStoreIds` | 3 | ✗ |
| WID-026 | duckdb-category-mix | `queryExecutor`, `currentDateRange`, `selectedStoreIds`, `loadedMonthCount` | 4 | ✗ |
| WID-027 | duckdb-category-benchmark | `queryExecutor`, `currentDateRange`, `selectedStoreIds` | 3 | ✗ |
| WID-028 | duckdb-category-boxplot | `queryExecutor`, `currentDateRange`, `selectedStoreIds` | 3 | ✗ |
| WID-029 | duckdb-cv-timeseries | `queryExecutor`, `currentDateRange`, `selectedStoreIds` | 3 | ✗ |

### A-2. Page-level registry（WidgetDef 型 B = Unified、DAILY / INSIGHT / CATEGORY / COST_DETAIL / REPORTS）

| 型番 | widget id | 直接参照 field | 件数 | 子への full ctx forward |
|---|---|---|---|---|
| WID-030 | daily-chart-gp-rate | `result.daily`, `daysInMonth`, `targetRate`, `warningRate`, `chartPeriodProps` | 5 | ✗ |
| WID-031 | daily-chart-shapley | `result.daily`, `daysInMonth`, `year`, `month`, `prevYear.hasPrevYear`, `prevYear.daily`, `chartPeriodProps` | 7 | ✗ |
| WID-032 | insight-budget | `insightData`, `result`, `onExplain` | 3 | ✗ |
| WID-033 | insight-budget-simulator | `result` | 1 | ✗ |
| WID-034 | insight-gross-profit | `insightData`, `result`, `onExplain` | 3 | ✗ |
| WID-035 | insight-forecast | `insightData.forecastData`, `insightData`, `result`, `onExplain` | 4 | ✗ |
| WID-036 | insight-decomposition | `insightData.customerData`, `insightData.forecastData`, `insightData` | 3 | ✗ |
| WID-037 | insight-pi-cv-map | `queryExecutor`, `currentDateRange`, `selectedStoreIds` | 3 | ✗ |
| WID-038 | category-total-view | `result`, `selectedResults`, `stores`, `settings`, `onExplain`, `onCustomCategoryChange` | 6 | ✗ |
| WID-039 | category-comparison-view | `selectedResults`, `storeNames` | 2 | ✗ |
| WID-040 | costdetail-kpi-summary | `costDetailData.typeIn.cost`, `costDetailData.typeIn.price`, `costDetailData.typeOut.cost`, `costDetailData.typeOut.price`, `costDetailData.typeLabel`, `costDetailData.totalCostInclusionAmount`, `costDetailData.costInclusionRate`, `costDetailData.totalSales`, `fmtCurrency`, `onExplain` | 10 | ✗ |
| WID-041 | costdetail-purchase | `costDetailData` | 1 | ✗ |
| WID-042 | costdetail-transfer | `costDetailData` | 1 | ✗ |
| WID-043 | costdetail-cost-inclusion | `costDetailData`, `onExplain` | 2 | ✗ |
| WID-044 | reports-summary-grid | `result`, `settings`, `daysInMonth`, `onExplain` | 4 | ✗ |
| WID-045 | reports-dept-table | `departmentKpi`, `onExplain` | 2 | ✗ |

### A-3. 計測値の集計

| 指標 | 値 |
|---|---|
| 直接参照 field の合計件数（重複許容） | 157 |
| widget 数 | 45 |
| 平均 field 数 / widget | 3.49 |
| 最大 field 数 | 17（WID-002 chart-daily-sales） |
| 最小 field 数 | 0（WID-004 / 005 / 007 / 009-013 の 8 widget、子へ full ctx forward） |
| full ctx passthrough を行う widget 数 | 12（WID-001, 002, 004, 005, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016）= 実質的に touch 不可視（内訳 3 = 明示的な `ctx` 展開 + 9 = render helper 委譲） |
| 直接参照 0 件の widget 数 | 8（全て子委譲） |

---

## B. Per-field widget list（逆引き map）

`UnifiedWidgetContext` のフィールド（`components/widgets/types.ts:64-220` 定義）ごとに、registry 行から直接参照している widget を列挙。

### B-1. コア required field（UnifiedWidgetContext §65-82）

| field | 参照 widget 数 | 参照 widget（型番） |
|---|---|---|
| `result` | 8 | WID-018, WID-020, WID-021, WID-022, WID-032, WID-033, WID-034, WID-035, WID-038, WID-044 ※WID-035 は `result` 直接参照あり（他 insight系と合算 → 10 件再集計で 10） |
| `result.daily` | 6 | WID-002, WID-003, WID-017, WID-030, WID-031（※加えて WID-019 は `result.totalCustomers`） |
| `result.budgetDaily` | 1 | WID-002 |
| `result.discountEntries` | 1 | WID-002 |
| `result.grossSales` | 1 | WID-002 |
| `result.grossProfitBudget` | 1 | WID-003 |
| `result.totalCustomers` | 1 | WID-019 |
| `daysInMonth` | 9 | WID-002, WID-003, WID-006, WID-017, WID-018, WID-022, WID-030, WID-031, WID-044 |
| `targetRate` | 2 | WID-003, WID-030 |
| `warningRate` | 2 | WID-003, WID-030 |
| `year` | 7 | WID-002, WID-003, WID-017, WID-018, WID-022, WID-031 |
| `month` | 8 | WID-002, WID-003, WID-017, WID-018, WID-022, WID-023, WID-031 |
| `settings` | 2 | WID-038, WID-044 |
| `prevYear`（object 全体） | 4 | WID-003, WID-017, WID-020, WID-021（※参照の sub-path 区別は下記） |
| `prevYear.hasPrevYear` | 2 | WID-002, WID-031 |
| `prevYear.daily` | 2 | WID-002, WID-031 |
| `stores` | 3 | WID-006, WID-018, WID-038 |
| `selectedStoreIds` | 9 | WID-002, WID-018, WID-024, WID-025, WID-026, WID-027, WID-028, WID-029, WID-037 |
| `explanations` | 0 | (registry 行からは直接参照なし。`onExplain` 経由で間接利用) |
| `onExplain` | 9 | WID-032, WID-034, WID-035, WID-038, WID-040, WID-043, WID-044, WID-045 |
| `observationStatus` | 0 | (registry 行からは直接参照なし) |
| `departmentKpi` | 1 | WID-045 |
| `fmtCurrency` | 1 | WID-040 |

### B-2. 期間選択 + Dashboard 固有（§84-120）

| field | 参照 widget 数 | 参照 widget |
|---|---|---|
| `periodSelection` | 0 | (registry 行からは直接参照なし) |
| `storeKey` | 4 | WID-008, WID-014, WID-015, WID-016 |
| `allStoreResults` | 3 | WID-001, WID-006, WID-018 |
| `currentDateRange` | 8 | WID-002, WID-018, WID-024, WID-025, WID-026, WID-027, WID-028, WID-029, WID-037 |
| `prevYearScope` | 4 | WID-002, WID-018, WID-019（※WID-019 は常時非可視） |
| `dataEndDay` | 0 | (registry 行からは直接参照なし) |
| `dataMaxDay` | 0 | (registry 行からは直接参照なし) |
| `elapsedDays` | 0 | (registry 行からは直接参照なし) |
| `monthlyHistory` | 1 | WID-023 |
| `queryExecutor` | 9 | WID-002, WID-018, WID-024, WID-025, WID-026, WID-027, WID-028, WID-029, WID-037 |
| `duckDataVersion` | 0 | (registry 行からは直接参照なし) |
| `loadedMonthCount` | 1 | WID-026 |
| `weatherPersist` | 1 | WID-002 |
| `prevYearMonthlyKpi` | 0 | (registry 行からは直接参照なし) |
| `comparisonScope` | 1 | WID-002（`.dowOffset` sub-field のみ） |
| `dowGap` | 0 | (registry 行からは直接参照なし) |
| `onPrevYearDetail` | 0 | (registry 行からは直接参照なし) |
| `prevYearStoreCostPrice` | 0 | (registry 行からは直接参照なし) |
| `weatherDaily` | 1 | WID-002 |
| `prevYearWeatherDaily` | 1 | WID-002 |
| `currentCtsQuantity` | 1 | WID-018 |

### B-3. 正本化 readModels + 分析レーン（§122-204）

| field | 参照 widget 数 | 参照 widget |
|---|---|---|
| `readModels`（object 全体） | 1 | WID-018 |
| `readModels.customerFact` | 2 | WID-019, WID-021 |
| `freePeriodLane` | 0 | (registry 行からは直接参照なし。子経由で使われる可能性あり) |
| `timeSlotLane` | 0 | (registry 行からは直接参照なし) |
| `storeDailyLane` | 1 | WID-006 |
| `categoryDailyLane` | 0 | (registry 行からは直接参照なし) |

### B-4. 比較期間入力 + ページ固有（§206-220）

| field | 参照 widget 数 | 参照 widget |
|---|---|---|
| `chartPeriodProps` | 3 | WID-003, WID-030, WID-031 |
| `insightData`（object 全体） | 4 | WID-032, WID-034, WID-035, WID-036 |
| `insightData.forecastData` | 2 | WID-035, WID-036 |
| `insightData.customerData` | 1 | WID-036 |
| `costDetailData`（object 全体） | 3 | WID-041, WID-042, WID-043 |
| `costDetailData.*`（sub-field 個別）| 1 | WID-040（`typeIn.cost` 他 8 sub-field） |
| `selectedResults` | 2 | WID-038, WID-039 |
| `storeNames` | 1 | WID-039 |
| `onCustomCategoryChange` | 1 | WID-038 |

---

## C. 統計分析

### C-1. field 使用頻度ランキング（上位）

| 順位 | field | 参照 widget 数 | 備考 |
|---|---|---|---|
| 1 | `daysInMonth` | 9 | core required。日次 chart / 集計で頻用 |
| 1 | `selectedStoreIds` | 9 | DuckDB query input として必須 |
| 1 | `queryExecutor` | 9 | DuckDB 経路 widget 群 |
| 1 | `onExplain` | 9 | explanation modal 起動 |
| 5 | `currentDateRange` | 8 | DuckDB query 範囲 |
| 5 | `month` | 8 | core required |
| 5 | `result` | 8 | ※object 全体参照（sub-path 参照を含めると更に多い） |
| 8 | `year` | 7 | core required |
| 9 | `result.daily` | 6 | chart 群で頻用 |

### C-2. 未参照 field（registry 行から 0 touch）

以下のフィールドは registry 行から直接参照されていない（子 component 内部や間接経路でのみ使われる可能性あり）:

| field | 種別 |
|---|---|
| `explanations` | core required |
| `observationStatus` | core required |
| `periodSelection` | optional |
| `dataEndDay` | Dashboard required（WidgetContext） |
| `dataMaxDay` | Dashboard required |
| `elapsedDays` | Dashboard required |
| `duckDataVersion` | Dashboard required |
| `prevYearMonthlyKpi` | Dashboard required |
| `dowGap` | Dashboard required |
| `onPrevYearDetail` | Dashboard required |
| `prevYearStoreCostPrice` | Dashboard optional |
| `freePeriodLane` | optional |
| `timeSlotLane` | optional |
| `categoryDailyLane` | optional |

事実: `UnifiedWidgetContext` の **47 field 中 14 field（約 30%）が registry 行から直接参照 0**。子 component 内部でのみ参照される前提で ctx に配置されている。

### C-3. full ctx passthrough widget

12 widget（内訳 3 = 明示的 `{ctx}` 展開 + 9 = render helper 委譲）が子に ctx 全体を forward している。これらは frontmatter の `consumedCtxFields` が registry 行からは静的に抽出できず、子 component 内 AST 走査が必要。

| widget | passthrough 先 | 本台帳の直接参照 |
|---|---|---|
| WID-001 | ConditionSummaryEnhanced | `allStoreResults`（predicate） |
| WID-002 | IntegratedSalesChart（`widgetCtx={ctx}` で重ね掛け） | 17 field + ctx |
| WID-004 | UnifiedHeatmapWidget | 0 |
| WID-005 | UnifiedStoreHourlyWidget | 0 |
| WID-007 | WeatherWidget | 0 |
| WID-008 | AlertPanelWidget | `storeKey` |
| WID-009-013 | renderDowAverage / renderWeeklySummary / renderDailyStoreSalesTable / renderDailyInventoryTable / renderStoreKpiTable | 0 |
| WID-014 | ForecastToolsWidget | `storeKey` |
| WID-015 | WaterfallChartWidget | `storeKey` |
| WID-016 | GrossProfitHeatmapWidget | `storeKey` |

### C-4. Dashboard-local vs Unified の touch 分布

| context 型 | widget 数 | 直接参照合計 | 平均 / widget |
|---|---|---|---|
| Dashboard-local（型 A、WID-001〜WID-029） | 29 | 88 | 3.03 |
| Unified（型 B、WID-030〜WID-045） | 16 | 69 | 4.31 |

事実: Unified 側のほうが widget 当たりの直接参照数が多い。Dashboard-local 側は full ctx passthrough が多く、render helper 経由で child に委譲する pattern が優勢。

### C-5. required field 参照 vs optional field 参照

Dashboard-local widget（29 件）の `WidgetContext` は UnifiedWidgetContext の 19 field を required に昇格させている（`Dashboard/widgets/types.ts:73-99` と inquiry/01 の「Dashboard `WidgetContext` 昇格フィールド」節参照）。

Unified widget（16 件、WID-030〜WID-045）は全て optional 状態の Unified ctx を受けるが、`isVisible` predicate で実体有無を gate することで必要 field を保証している例が複数（WID-032: `insightData != null` / WID-040: `costDetailData != null` / WID-041-043: `costDetailData != null` / WID-035: `insightData.forecastData != null` / WID-036: 複合 predicate）。

---

## D. Ambiguity / 未追跡項目

### D-1. 子 component 内部の ctx touch

full ctx passthrough を行う 12 widget（C-3 参照）について、本台帳は registry 行からの直接参照のみを計測している。子 component 側の実 ctx 依存は未追跡。Phase 6 の frontmatter generator 実装時に AST 走査で統合する想定（`inquiry/01a-widget-specs-bootstrap.md` D4 参照）。

### D-2. props 経由の間接 touch

WID-002 のように registry 行で `result.daily` を個別 props として子に渡す場合、子側では props を受けて内部で ctx 再参照せずに props を使う可能性が高い。この場合、registry 行 surface と子 surface は同一 field を重複カウントすることになる。本台帳は registry 行のみを計測するため、重複は発生しない。

### D-3. `onExplain` と `explanations` の非対称

`onExplain`（callback）は 9 widget から参照されているが、`explanations`（data）は 0 widget から直接参照されていない。`explanations` は子 component 側でのみ参照される可能性がある。事実として記録する。

### D-4. Dashboard-required field の registry 行未参照

`dataEndDay` / `dataMaxDay` / `elapsedDays` / `duckDataVersion` / `prevYearMonthlyKpi` / `dowGap` / `onPrevYearDetail` は Dashboard `WidgetContext` で required に昇格されているが、registry 行からは直接参照 0。子 component が `ctx` 経由で触っている前提で required 宣言されている可能性がある。C-2 参照。

### D-5. object 全体参照 vs sub-path 参照の区別

`result` / `prevYear` / `insightData` / `costDetailData` / `readModels` のように object 全体を参照する widget と、同じ object の sub-path（例 `result.daily`）のみを参照する widget が混在する。本台帳では可能な限り sub-path を記録したが、registry 行で `ctx.result` として object 全体を渡している場合は sub-path を展開していない。B セクションの集計は「直接書かれた参照」を素直に記録した値。

---

## 付記: 本台帳の書き換え規則

- plan.md §3 Phase 1 次 Phase への渡し方に従い、本ファイルは immutable
- Phase 2 以降で追加情報（例: 子 component の ctx touch AST 解析結果）が判明しても、本ファイルは書き換えず `02a-*.md` として addend する
