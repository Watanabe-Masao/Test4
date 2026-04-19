# HANDOFF — day-detail-modal-prev-year-investigation

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**未着手。** 先行セッション (2026-04-19) で 3 症状
(要因分解 2-factor のみ / 時間帯分析「データなし」 / ドリルダウン非表示) を
観測し、以下を切り分け済み:

- Phase 1 (category-leaf-daily-entry-shape-break) は無関係 (型 alias 置換のみ)
- Worker timeout (`useCalculation`) は別の処理系 (main dashboard 用) で、
  DayDetailModal の CTS/time_slots クエリとは独立

残る候補: **データ or クエリ or インジェスト** の 3 択 (`AI_CONTEXT.md` §Why 参照)。

## 2. 次にやること

詳細は `checklist.md` を参照。**最初の 10 分で原因層を絞り込む**調査から着手する。

### 高優先 (Phase 1: runtime 観測で原因層を絞る)

- **DevTools の React component tree で DayDetailModal を開いた状態で `dayLeafBundle.currentSeries.entries[0]` の内容を確認**
  - `timeSlots: []` なら time_slots JOIN が空 → **B 候補**
  - `totalQuantity === 0` なら data ingest の集計不整合 → **C 候補**
  - entries 自体が `[]` なら query 側が 0 行返却 → **A 候補**
- **DuckDB console で直接 SQL を投げて prev year CTS records の存在を確認**
  ```sql
  SELECT COUNT(*) FROM category_time_sales WHERE is_prev_year = TRUE;
  SELECT COUNT(*) FROM time_slots WHERE is_prev_year = TRUE;
  ```
  0 件なら **A / C 候補確定** (ingest 層の問題)
- `meta.provenance.usedComparisonFallback` が `true` か確認 (bundle の fallback
  発火有無)

### 中優先 (Phase 2: 原因確定)

- 上記で原因層が**データ側**と判明した場合:
  - データインジェストパス (xlsx import 等) の `is_prev_year` flag 設定漏れを確認
  - time_slots table のインデックス投入漏れを確認
- **コード側**と判明した場合:
  - JOIN 条件 `cts.is_prev_year = ts.is_prev_year` が意図通りか
  - `buildCtsConditions` の `params.isPrevYear ?? false` のデフォルト挙動

### 低優先 (Phase 3: fix 方針決定)

- 修正が 1-3 ファイルで済む: `quick-fixes` に task 追加
- 複数層に跨る修正: 専用 fix project を起票
- データ再整備が必要: 運用手順書を別 doc に整理

## 3. ハマりポイント

### 3.1. 集計カード値は表示されている

前年 1,411,635 / 当年 1,552,468 等のカード値は `StoreResult` (budget +
summary) 経由で表示されているため、**per-record の CTS データが空でもカード
は表示される**。「一部は動く = 全部動く」の誤認を避ける。

### 3.2. Worker timeout は同時発生しているが別原因

console log に `[useCalculation] Worker 計算失敗、同期フォールバック` が出る
が、これは `calculateAllStores` (main dashboard 用) の timeout。
DayDetailModal の DuckDB query は独立しており、この timeout の影響を直接は
受けない。ただし同じ**データサイズで主スレッド処理が重い**症状の表れである
可能性はある (低優先の調査観点)。

### 3.3. bundle fallback は発火するが fallback 側も空なら意味がない

`useCategoryLeafDailyBundle` は prev year primary が空なら same-date current
year fallback を実行する。**ただし fallback も 0 行 or timeSlots 空なら症状
は改善しない**。fallback が発火したかは `meta.provenance.usedComparisonFallback`
で観測できる。

### 3.4. 「前年」の意味の揺れ

UI 上の「前年」は 3 系統ある:
- StoreResult の prev-year amount (budget / summary 経由)
- `isPrevYear=true` の category_time_sales record (DuckDB)
- 前年同日付の current-year record (fallback 時)

どの系統が空かを切り分けないと原因を誤認する。

### 3.5. 調査 scope と fix scope の分離

本 project は**調査のみ**。原因層が確定したら別 project / quick-fixes で fix
する。調査 scope で fix を始めると完了基準がぶれる。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | DayDetailModal の Screen Plan (データ取得の起点) |
| `app/src/application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts` | bundle + fallback ロジック (L183-230 が provenance 組み立て) |
| `app/src/infrastructure/duckdb/queries/ctsHierarchyQueries.ts` | `queryCategoryTimeRecords` の CTS + time_slots LEFT JOIN |
| `app/src/infrastructure/duckdb/queries/categoryTimeSales.ts` | `buildCtsConditions` (`is_prev_year` WHERE 条件) |
| `projects/category-leaf-daily-entry-shape-break/HANDOFF.md` | 関連先行 project (データ取得経路の context) |
