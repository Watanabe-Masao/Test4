# inventory 03 — 自由期間系 SQL 内 rate 計算

> 対応 checklist: Phase 0 #3
> 剥がす Phase: Phase 4（率計算・集約責務整理）
> 完了条件: 全行が Phase 4 で domain/calculations 側に移管されている

## 棚卸し対象

以下のパターンを対象とする:

- `(price - cost) / price` のような gpRate 計算
- `discount / (sales + discount)` のような discountRate 計算
- `price / cost - 1` のような markupRate 計算
- `... / NULLIF(...)` を用いた率計算
- `CASE WHEN sales > 0 THEN ... / sales` のような率計算

## 検出方法

```
Grep: /\s*NULLIF|/\s*CASE\s+WHEN
  glob: app/src/**/*.ts
  glob: app/src/**/*.sql
Grep: discount\s*/|cost\s*/|sales\s*/
  glob: app/src/infrastructure/duckdb/**/*.ts
  glob: app/src/application/queries/**/*.ts
```

## 棚卸し結果

| Path | Lines | 計算式 | 出力カラム名 | メモ | Done |
|---|---|---|---|---|---|
| _未調査_ | | | | | |

## 集計

- 件数: _未集計_
- 影響ファイル数: _未集計_
- 種別内訳: _未集計_
