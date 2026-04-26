# inquiry/04 — 型の非対称性 棚卸し

> 役割: Phase 1 inquiry 成果物 #4。`WidgetDef` 2 型並存 + `UnifiedWidgetContext` page-local optional の非対称を、型レベルで構造化して記録する。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`04a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `d606d24` |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `app/src/presentation/components/widgets/types.ts` / `app/src/presentation/pages/Dashboard/widgets/types.ts` 直読 + inquiry/01 の「WidgetDef の 2 型」「UnifiedWidgetContext フィールド棚卸し」「Dashboard WidgetContext 昇格フィールド」節 |

## A. WidgetDef 2 型並存

### A-1. 並存事実

同名の `WidgetDef` interface が **2 ファイルに独立定義**されている。

| 型番 | ファイル | 行番号 | ctx 引数型 |
|---|---|---|---|
| 型 A（Dashboard-local） | `app/src/presentation/pages/Dashboard/widgets/types.ts` | `:101-111` | `WidgetContext`（`:73-99`） |
| 型 B（Unified） | `app/src/presentation/components/widgets/types.ts` | `:225-235` | `UnifiedWidgetContext`（`:64-220`） |

### A-2. 構造差分

```typescript
// 型 A（Dashboard-local）
export interface WidgetDef {
  readonly id: WidgetId                              // literal union 型
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode
  readonly isVisible?: (ctx: WidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

// 型 B（Unified）
export interface WidgetDef {
  readonly id: string                                // literal union ではなく単なる string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: UnifiedWidgetContext) => ReactNode
  readonly isVisible?: (ctx: UnifiedWidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}
```

### A-3. 構造比較表

| フィールド | 型 A | 型 B | 差分 |
|---|---|---|---|
| `id` | `WidgetId` | `string` | 型 A は literal union 型で型レベル検証可能。型 B は runtime のみの id |
| `label` | `string` | `string` | 同 |
| `group` | `string` | `string` | 同 |
| `size` | `WidgetSize` | `WidgetSize` | 同（同一 type alias） |
| `render` | `(ctx: WidgetContext) => ReactNode` | `(ctx: UnifiedWidgetContext) => ReactNode` | ctx 型が異なる（A は required 多、B は optional 多） |
| `isVisible` | `(ctx: WidgetContext) => boolean` | `(ctx: UnifiedWidgetContext) => boolean` | 同 |
| `linkTo` | `{ view: ViewType; tab?: string }` | 同 | 同 |

### A-4. 使用 registry 対応

| registry | 使用 WidgetDef 型 | widget 数（inquiry/01 より） |
|---|---|---|
| `WIDGETS_KPI` | 型 A | 1 |
| `WIDGETS_CHART` | 型 A | 6 |
| `WIDGETS_EXEC` | 型 A | 7 |
| `WIDGETS_ANALYSIS` | 型 A | 10 |
| `WIDGETS_DUCKDB` | 型 A | 5 |
| `DAILY_WIDGETS` | 型 B | 2 |
| `INSIGHT_WIDGETS` | 型 B | 6 |
| `CATEGORY_WIDGETS` | 型 B | 2 |
| `COST_DETAIL_WIDGETS` | 型 B | 4 |
| `REPORTS_WIDGETS` | 型 B | 2 |

### A-5. 合成 registry の型

| 合成 registry | 合成 source | 合成対象型 |
|---|---|---|
| `WIDGET_REGISTRY`（`Dashboard/widgets/registry.tsx:21`） | 型 A 5 件の合算 | `readonly WidgetDef[]`（型 A） |
| `UNIFIED_WIDGET_REGISTRY`（`components/widgets/unifiedRegistry.ts:45`） | `WIDGET_REGISTRY` の adapter + 型 B 5 件 | `readonly WidgetDef[]`（型 B） |

事実: `WIDGET_REGISTRY`（型 A）が `UNIFIED_WIDGET_REGISTRY`（型 B）に組み込まれる際、型 A → 型 B の adapter が `unifiedRegistry.ts:46` で適用されている。

---

## B. UnifiedWidgetContext の page-local optional field

### B-1. 構造的非対称

`UnifiedWidgetContext`（`components/widgets/types.ts:64-220`）は「全ページの全ウィジェットが参照しうるデータの上位集合」とソース注記される（`:58-63`）。しかし構造上、特定ページ固有のデータが optional field として配置されている。

ソース内セクションコメント（`:88`）:
> `// ── Dashboard 固有（他ページではオプション） ──`

ソース内セクションコメント（`:210`）:
> `// ── Insight 固有 ──`

ソース内セクションコメント（`:213`）:
> `// ── CostDetail 固有 ──`

ソース内セクションコメント（`:216`）:
> `// ── Category 固有 ──`

### B-2. page-local field 列挙

| field | 所属ページ | 型 | ソース行 | 参照 widget（inquiry/02 §B より） |
|---|---|---|---|---|
| `insightData` | Insight | `InsightData` | `:211` | WID-032, WID-034, WID-035, WID-036 |
| `insightData.forecastData` | Insight | sub-field | `:211` | WID-035, WID-036 |
| `insightData.customerData` | Insight | sub-field | `:211` | WID-036 |
| `costDetailData` | CostDetail | `CostDetailData` | `:214` | WID-041, WID-042, WID-043 |
| `costDetailData.*` | CostDetail | sub-fields | `:214` | WID-040（8 sub-field） |
| `selectedResults` | Category | `readonly StoreResult[]` | `:217` | WID-038, WID-039 |
| `storeNames` | Category | `ReadonlyMap<string, string>` | `:218` | WID-039 |
| `onCustomCategoryChange` | Category | callback | `:219` | WID-038 |

計: **page-local optional field 5 個**（insightData / costDetailData / selectedResults / storeNames / onCustomCategoryChange）が Unified ctx に配置されている。

### B-3. Dashboard 固有の optional field（他ページでは undefined）

`:88` の「Dashboard 固有（他ページではオプション）」セクションには **20 field** が optional 配置されている（inquiry/01 のコア + Dashboard 固有 optional セクション参照）:

`storeKey` / `allStoreResults` / `currentDateRange` / `prevYearScope` / `dataEndDay` / `dataMaxDay` / `elapsedDays` / `monthlyHistory` / `queryExecutor` / `duckDataVersion` / `loadedMonthCount` / `weatherPersist` / `prevYearMonthlyKpi` / `comparisonScope` / `dowGap` / `onPrevYearDetail` / `prevYearStoreCostPrice` / `weatherDaily` / `prevYearWeatherDaily` / `currentCtsQuantity`

事実: 20 個の「Dashboard 固有」field が Unified ctx に optional として同居している。

### B-4. page-local field の参照 widget は page-level registry 限定か

page-level registry（型 B）の widget は該当ページの page-local field を isVisible / render で参照する想定だが、事実確認:

| page-local field | 参照 widget の registry 所属 |
|---|---|
| `insightData` 系 | WID-032〜WID-036（全て `INSIGHT_WIDGETS`） ✓ |
| `costDetailData` 系 | WID-040〜WID-043（全て `COST_DETAIL_WIDGETS`） ✓ |
| `selectedResults` | WID-038 / WID-039（全て `CATEGORY_WIDGETS`） ✓ |
| `storeNames` | WID-039（`CATEGORY_WIDGETS`） ✓ |
| `onCustomCategoryChange` | WID-038（`CATEGORY_WIDGETS`） ✓ |

事実: 現時点で page-local field を参照する widget は全て「該当 page の registry」に属する。クロスページ参照は 0 件。

### B-5. Dashboard 固有 field を Unified widget が参照する事例

逆方向（Unified widget が Dashboard 固有 optional field を touch する事例）:

| Unified widget | 参照する Dashboard 固有 field |
|---|---|
| WID-037（`insight-pi-cv-map`、`INSIGHT_WIDGETS`） | `queryExecutor`, `currentDateRange`, `selectedStoreIds` |

事実: WID-037 が `INSIGHT_WIDGETS`（型 B、page-local registry）でありながら Dashboard 固有 optional の `queryExecutor` 等を参照している。`isVisible: (ctx) => ctx.queryExecutor?.isReady === true` で optional safety を確保。

---

## C. Dashboard `WidgetContext` の昇格

### C-1. 概要

`Dashboard/widgets/types.ts:73-99` の `WidgetContext` は `UnifiedWidgetContext` を `extends` し、以下を optional → required に昇格させる。

### C-2. 昇格 field 表（optional → required）

inquiry/01 の「Dashboard WidgetContext 昇格フィールド」節を根拠として再掲:

| # | field | Unified 側 | Dashboard 側 |
|---|---|---|---|
| 1 | `storeKey` | optional (`types.ts:89`) | required (`:74`) |
| 2 | `allStoreResults` | optional (`:90`) | required (`:75`) |
| 3 | `currentDateRange` | optional (`:91`) | required (`:76`) |
| 4 | `prevYearScope` | optional (`:92`) | required (`:77`、型は `PrevYearScope \| undefined`) |
| 5 | `selectedStoreIds` | required (`:75`) | required 再宣言 (`:78`) |
| 6 | `dataEndDay` | optional (`:93`) | required (`:79`) |
| 7 | `dataMaxDay` | optional (`:94`) | required (`:80`) |
| 8 | `elapsedDays` | optional (`:95`) | required (`:81`、型は `number \| undefined`) |
| 9 | `departmentKpi` | required (`:80`) | required 再宣言 (`:82`) |
| 10 | `explanations` | required (`:76`) | required 再宣言 (`:83`) |
| 11 | `onExplain` | required (`:77`) | required 再宣言 (`:84`) |
| 12 | `monthlyHistory` | optional (`:96`) | required (`:85`) |
| 13 | `queryExecutor` | `QueryExecutor \| null` optional (`:98`) | `QueryExecutor` 非 null required (`:86`) |
| 14 | `duckDataVersion` | optional (`:100`) | required (`:87`) |
| 15 | `loadedMonthCount` | optional (`:102`) | required (`:88`) |
| 16 | `weatherPersist` | optional (`:104`) | required (`:89`、null 許容) |
| 17 | `prevYearMonthlyKpi` | optional (`:105`) | required (`:90`) |
| 18 | `comparisonScope` | optional (`:106`) | required (`:91`、null 許容) |
| 19 | `dowGap` | optional (`:107`) | required (`:92`) |
| 20 | `onPrevYearDetail` | optional (`:108`) | required (`:93`) |
| 21 | `fmtCurrency` | required (`:82`) | required 再宣言 (`:94`) |
| 22 | `prevYearStoreCostPrice` | optional (`:110`) | optional 継続 (`:95`) |
| 23 | `weatherDaily` | optional (`:112`) | optional 継続 (`:96`) |
| 24 | `prevYearWeatherDaily` | optional (`:114`) | optional 継続 (`:97`) |
| 25 | `currentCtsQuantity` | optional (`:120`) | required (`:98`) |

### C-3. 昇格数の分類

- **optional → required に昇格**: 19 field（#1-4, #6-8, #12-20, #25）
- **required 再宣言**（型 A での明示確認）: 5 field（#5, #9, #10, #11, #21）
- **optional 継続**: 3 field（#22, #23, #24 — `prevYearStoreCostPrice` / `weatherDaily` / `prevYearWeatherDaily`）

ソースコメント（`Dashboard/widgets/types.ts:70-71`）:
> `// Dashboard が保証するフィールドを required に昇格する。`
> `// useUnifiedWidgetContext が全フィールドを設定するため、ランタイムでは常に全フィールドが存在する。`

事実: ソース側では runtime 保証を明言している（`useUnifiedWidgetContext` が全フィールドを設定）が、型レベルでは Unified 側で optional のままであり、型 A と型 B で runtime 実態と型表現が異なる。

---

## D. isVisible predicate による optional field の gate 事例

事実として、**型 B の widget が optional field を isVisible で null check して gate** している事例:

| widget | isVisible predicate | gate される field |
|---|---|---|
| WID-032 insight-budget | `(ctx) => ctx.insightData != null` | `insightData` |
| WID-033 insight-budget-simulator | `(ctx) => ctx.result != null` | `result`（Unified core required だが null check） |
| WID-034 insight-gross-profit | `(ctx) => ctx.insightData != null` | `insightData` |
| WID-035 insight-forecast | `(ctx) => ctx.insightData?.forecastData != null` | `insightData.forecastData` |
| WID-036 insight-decomposition | 複合 | `insightData.customerData` + `insightData.forecastData` |
| WID-037 insight-pi-cv-map | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` |
| WID-039 category-comparison-view | `(ctx) => (ctx.selectedResults?.length ?? 0) > 1` | `selectedResults` |
| WID-040 costdetail-kpi-summary | `(ctx) => ctx.costDetailData != null` | `costDetailData` |
| WID-041 costdetail-purchase | `(ctx) => ctx.costDetailData != null` | `costDetailData` |
| WID-042 costdetail-transfer | `(ctx) => ctx.costDetailData != null` | `costDetailData` |
| WID-043 costdetail-cost-inclusion | `(ctx) => ctx.costDetailData != null` | `costDetailData` |
| WID-024 analysis-duckdb-features | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` |
| WID-025 duckdb-dow-pattern | 同上 | `queryExecutor` |
| WID-026 duckdb-category-mix | `(ctx) => ctx.queryExecutor?.isReady === true && ctx.loadedMonthCount >= 2` | `queryExecutor` + `loadedMonthCount` |
| WID-027 duckdb-category-benchmark | 同 WID-025 | `queryExecutor` |
| WID-028 duckdb-category-boxplot | 同 WID-025 | `queryExecutor` |
| WID-029 duckdb-cv-timeseries | 同 WID-025 | `queryExecutor` |

計 17 widget が optional field を isVisible で gate している。

特筆: WID-033 は Unified ctx で**核 required**である `result` を null check している。runtime で `result != null` が常に成立する前提でも、型 B（Unified）側で `result: StoreResult` として required 定義（`:66`）されているにもかかわらず、widget 側で null check が書かれている事実。

---

## E. 集約: 非対称の形

### E-1. 3 種の型レベル非対称

| # | 非対称 | 所在 |
|---|---|---|
| 1 | `WidgetDef` 同名 2 型並存 | `Dashboard/widgets/types.ts:101` vs `components/widgets/types.ts:225` |
| 2 | UnifiedWidgetContext の page-local optional 5 field | `components/widgets/types.ts:210-219` |
| 3 | UnifiedWidgetContext の Dashboard 固有 optional 20 field | `components/widgets/types.ts:88-120` |

### E-2. 3 種の runtime 対策

型レベルの非対称を runtime で埋めるために、以下の 3 種の対策が同居:

| # | 対策 | 実施場所 |
|---|---|---|
| 1 | 型拡張（extends）で required 昇格 | `Dashboard/widgets/types.ts:73` の `interface WidgetContext extends UnifiedWidgetContext` |
| 2 | runtime の全 field 設定（ソース注記） | `useUnifiedWidgetContext`（ソース未走査、ソース注記より） |
| 3 | widget 側 isVisible predicate での null check | 17 widget（D 節参照） |

事実: 同一の「field が確実に存在する」保証に対し、**型・runtime 設定・widget 側 gate** の 3 階層で重ねて防御が行われている。

---

## 付記

- 本台帳は immutable。Phase 2 以降の追加情報は `04a-*.md` として addend する
- 関連: `inquiry/01-widget-registries.md` §「WidgetDef の 2 型」「UnifiedWidgetContext フィールド棚卸し」「Dashboard `WidgetContext` 昇格フィールド」、`inquiry/02-widget-ctx-dependency.md` §B
