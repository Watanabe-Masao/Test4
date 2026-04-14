# inventory 02 — readFreePeriodFact() 以外の自由期間取得経路

> 対応 checklist: Phase 0 #2
> 剥がす Phase: Phase 3（自由期間データレーン完成）
> 完了条件: 全行が Phase 3 で `freePeriodHandler` 経由に置換されている

## 棚卸し対象

以下のパターンを対象とする:

- `useDuckDB` / `executeQuery` を自由期間文脈で直接呼んでいる
- `freePeriodHandler` を経由せず `readFreePeriodFact` を呼んでいる
- 自由期間範囲を ad hoc な SQL で取得している
- `useFreePeriodAnalysis` 以外の hook で自由期間データを抱えている

## 検出方法

```
Grep: readFreePeriodFact|freePeriodHandler
  glob: app/src/**/*.{ts,tsx}
Grep: SELECT.*FROM\s+(classified_sales|sales_fact)
  glob: app/src/**/*.ts
```

`presentation/` から直接呼んでいる箇所は `freePeriodPathGuard.test.ts` で
既にブロックされているはずなので、本棚卸しの対象は主に
`application/` / `features/` / `infrastructure/` 層になる。

## 棚卸し結果

| Path | Lines | 種別 | メモ | Done |
|---|---|---|---|---|
| — | — | — | **該当 0 件** | — |

## 集計

- 件数: 0
- 影響ファイル数: 0
- 種別内訳: 該当なし

## 観察

自由期間データの取得経路は既に 1 本に収束している:

- **canonical handler 3 本** — `app/src/application/queries/`
  - `freePeriodHandler.ts` → `queryFreePeriodDaily`（本体）
  - `freePeriodBudgetHandler.ts` → `queryFreePeriodBudget`（paired）
  - `freePeriodDeptKPIHandler.ts` → `queryFreePeriodDeptKPI`（paired）
- **canonical read model 3 本** — `app/src/application/readModels/freePeriod/`
  - `readFreePeriodFact.ts`
  - `readFreePeriodBudgetFact.ts`
  - `readFreePeriodDeptKPI.ts`
- **canonical entry hook** — `app/src/application/hooks/useFreePeriodAnalysisBundle.ts`
- **infrastructure query 3 本** — `app/src/infrastructure/duckdb/queries/`
  - `freePeriodFactQueries.ts`
  - `freePeriodBudget.ts`
  - `freePeriodDeptKPI.ts`

上記以外で `executeQuery` / `useDuckDB` が範囲 (`dateFrom..dateTo`) の自由期間相当データを取得している経路は検出されなかった。これは `freePeriodPathGuard.test.ts` + `canonicalizationSystemGuard.test.ts` が既に機能している結果と考えられる。

## Phase 3 での扱い

棚卸し対象 0 件のため、Phase 3 checklist の 4 項目（handler / readFact / summary / readModel を唯一経路として固定する）は **既に実態として満たされている**。Phase 3 の実作業は「新規のガード追加（G3）」と「読み物として状態を固定する明文ルール」のみとなる。`checklist.md` Phase 3 の残作業は実装ではなくガード整備に再解釈してよい。
