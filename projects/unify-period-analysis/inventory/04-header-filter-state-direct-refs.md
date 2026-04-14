# inventory 04 — HeaderFilterState 直接参照 hook / component

> 対応 checklist: Phase 0 #4
> 剥がす Phase: Phase 1（入力契約統一）
> 完了条件: 全行が Phase 1 で `HeaderFilterState → FreePeriodAnalysisFrame`
> adapter 経由に置換されている

## 棚卸し対象

以下のパターンを対象とする:

- `useHeaderFilterState()` を component / hook / VM で直接呼んでいる
- `HeaderFilterState` 型を引数で受け取って query を組み立てている
- `dateFrom` / `dateTo` / `storeIds` / `comparison` を ad hoc に組み合わせている
- `header.filter.dateFrom` のような分割アクセス

## 検出方法

```
Grep: HeaderFilterState|useHeaderFilterState
  glob: app/src/**/*.{ts,tsx}
Grep: header\.filter\.|headerFilter\.
  glob: app/src/**/*.{ts,tsx}
```

`presentation/hooks/useHeaderFilterState.ts` 自体と、その正規 consumer
（adapter 1 箇所）は除外する。

## 棚卸し結果

| Path | Lines | 種別 | 用途 | メモ | Done |
|---|---|---|---|---|---|
| _未調査_ | | | | | |

## 集計

- 件数: _未集計_
- 影響ファイル数: _未集計_
- 種別内訳: _未集計_
