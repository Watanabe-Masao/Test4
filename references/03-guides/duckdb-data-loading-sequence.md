# DuckDB データロード順序と不変条件

## 目的

`useDuckDB.ts` の `loadData` 関数がどの順序でデータを投入し、
どの不変条件を満たす必要があるかを明文化する。

## ロード順序

### 初回ロード（`initialLoadDone === false`）

```
1. resetTables(conn)                          ← 全テーブルを空にする
2. loadMonth(conn, currentMonthData, year, month)
                                              ← 当月データ投入（isPrevYear=false）
3. if (prevYear)
     loadMonth(conn, prevYear, prevYear.origin.year/month, true)
                                              ← 前年データ投入（isPrevYear=true）
4. for (storedMonth of storedMonths)
     if (y === year && m === month) continue   ← 当月はスキップ
     loadMonth(conn, historicalData, y, m)     ← 歴史月投入（isPrevYear=false）
     if (y === year - 1)
       ★ prevYear で既にロード済みならスキップ ★
       loadMonth(conn, historicalData, y, m, true)
                                              ← 前年月投入（isPrevYear=true）
5. materializeSummary(conn)                   ← VIEW → TABLE 変換
6. dispatch(LOAD_SUCCESS)                     ← dataVersion++, isReady=true
```

### 差分ロード（`initialLoadDone === true`）

```
1. 当月フィンガープリント比較 → 変更あれば:
     deleteMonth + deletePrevYearMonth
     loadMonth(当月) + loadMonth(前年, true)
2. 不要月の削除
3. 新規月のロード（初回と同じロジック）
4. materializeSummary(conn)
5. dispatch(LOAD_SUCCESS)
```

## 不変条件

| ID | 不変条件 | 検証 |
|---|---|---|
| INV-LOAD-01 | 同一月は `isPrevYear` フラグごとに **1 回だけ** INSERT される | `dataIntegrityGuard.test.ts` Pattern 5 |
| INV-LOAD-02 | クエリは `LOAD_SUCCESS` 後にのみ実行される（`isReady` ガード） | `QueryPort.ts` + `useQueryWithHandler.ts` |
| INV-LOAD-03 | `materializeSummary` は全データ投入完了後に 1 回だけ実行される | `useDuckDB.ts` の `anyChanged` フラグ |
| INV-LOAD-04 | `resetTables` は初回ロード時のみ実行される | `initialLoadDone` フラグ |

## 関連ファイル

| ファイル | 責務 |
|---|---|
| `application/runtime-adapters/useDuckDB.ts` | ロード順序の正本 |
| `infrastructure/duckdb/dataLoader.ts` | `loadMonth()` — INSERT 実行 |
| `infrastructure/duckdb/deletePolicy.ts` | `deleteMonth()` / `deletePrevYearMonth()` |
| `infrastructure/duckdb/schemas.ts` | テーブル DDL + `store_day_summary` VIEW |
| `infrastructure/duckdb/queries/storeDaySummary.ts` | `materializeSummary()` |
| `test/guards/dataIntegrityGuard.test.ts` | INV-LOAD-01 のガード |

## 既知のバグと修正

- **#前年データ2倍バグ**: 歴史月ループで `prevYear` prop と同じ月を `isPrevYear=true` で二重投入。
  修正: `alreadyLoadedAsPrev` チェックを追加（INV-LOAD-01）。
