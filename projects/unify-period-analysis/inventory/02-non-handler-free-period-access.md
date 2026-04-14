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
| _未調査_ | | | | |

## 集計

- 件数: _未集計_
- 影響ファイル数: _未集計_
- 種別内訳: _未集計_
