# AI_CONTEXT — day-detail-modal-prev-year-investigation

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

DayDetailModal 前年データ空表示バグ調査 — 3/5-factor / 時間帯分析 / ドリルダウンが表示されない原因の特定（day-detail-modal-prev-year-investigation）

## Purpose

DayDetailModal で以下の 3 症状が同時発生する:

1. 前年比較ウォーターフォールが 2-factor (客数効果 / 客単価効果) のみ表示 — 3/5-factor が出ない
2. 時間帯分析タブが「データなし」表示
3. カテゴリドリルダウン (CategoryFactorBreakdown) が非表示

本 project は 3 症状の根本原因を**調査で特定**し、fix 方針を確定させる。実装は
scope 外 (別 project で実施)。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（調査の現在地と次の手順）
3. `plan.md`（不可侵原則と調査 Phase 構造）
4. `checklist.md`（completion 判定の入力）
5. 関連先行調査: 本 project bootstrap 時点の診断履歴 (本セッション内)

## Why this project exists

3 症状はいずれも「`CategoryLeafDailyEntry[]` が空 or `totalQuantity=0` or
`timeSlots=[]`」で説明できる。既に本セッション内で以下を切り分け済み:

- **Phase 1 (category-leaf-daily-entry-shape-break) は無関係** — 型参照の置換のみで動作不変、かつ PR merge 前に症状あり
- **Worker timeout は別問題** — `useCalculation` の `calculateAllStores` (main dashboard 用) は DayDetailModal の CTS/time_slots クエリとは別処理系

残る候補 (本 project の調査対象):

| 候補 | 仮説 |
|---|---|
| A | `category_time_sales` table に prev year records (is_prev_year=true) がそもそも無く、bundle fallback も current year を返すだけで timeSlots が空 |
| B | `time_slots` の LEFT JOIN が NULL を返し、`timeSlots=[]` だが `totalQuantity` は保持 |
| C | データ整備 (ingest) レベルで prev year CTS + time_slots が欠けている |

## Scope

含む:
- 3 症状の根本原因層を特定する調査
- DevTools / SQL / Network tab 等を用いた runtime 観測
- 原因層が**データ側**か**コード側**かを確定
- fix 方針 (quick-fix / 専用 project / データ再整備) の決定

含まない:
- 実際の fix 実装 (原因確定後に別 project / quick-fixes で対応)
- `useCalculation` Worker timeout の profiling (別 project)
- `category-leaf-daily-entry-shape-break` Phase 2 以降の作業

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | DayDetailModal のデータ取得経路 |
| `app/src/application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts` | bundle + fallback ロジック |
| `app/src/infrastructure/duckdb/queries/ctsHierarchyQueries.ts` | CTS JOIN クエリ |
| `app/src/infrastructure/duckdb/queries/categoryTimeSales.ts` | `is_prev_year` WHERE 条件 |
| `app/src/application/workers/useWorkerCalculation.ts` | Worker timeout 参照 (別問題だが並発生) |
