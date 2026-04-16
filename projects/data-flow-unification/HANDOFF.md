# HANDOFF — data-flow-unification

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

Phase 1 診断ほぼ完了。障害位置は **read path（consumer の query 呼び出し）** に絞り込まれた。

### 確定した事実（診断ログで実証済み）

| 段階 | 状態 | 根拠 |
|---|---|---|
| IndexedDB → dataStore | ✓ 正常 | `loaded {cs: 16649, cts: 18680, flowers: 150, purchase: 150}` |
| dataStore → useDuckDB | ✓ 正常 | `hasPrevYear: true, prevYearCtsRecords: 18680` |
| DuckDB loadMonth | ✓ 正常 | `time_slots: 98930, classified_sales: 16649` |
| store_day_summary VIEW | ✓ 前年行あり | `total: 1100, prevYear: 295` |
| **consumer read path** | **✗ 疑い** | 画面に前年データが表示されない |

### 最有力仮説

`storeDaySummary.ts` の `summaryWhereClause()` はデフォルトで `is_prev_year = FALSE` を
WHERE に入れる。呼び出し側が `isPrevYear: true` を渡し忘れると、前年行は黙って除外される。
時間帯ヒートマップと `categoryDailyLane` の比較クエリがこのパターンに該当する可能性が高い。

### 修正済み

- `loadComparisonDataAsync` に欠落4スライス追加（purchase, directProduce, interStoreIn, interStoreOut）
- `comparisonResultToMonthlyData` の変換完全化
- `useAutoLoadPrevYear` 削除（dead code）
- `materializeSummary` の `force=true` 対応
- SQL エラー修正（customers 列、b.total 列、totalCustomers エイリアス）
- 5要素分解フォールバック / MA色重複 / スライダー分母固定

## 2. 次にやること

### 最優先: read path の isPrevYear 追跡

1. `queryStoreDaySummary` 系の呼び出し元で `isPrevYear` の渡し方を確認
2. 時間帯ヒートマップ（`hourlyAggregationHandler` → `ctsHourlyQueries`）の前年クエリを確認
3. `categoryDailyLane.bundle` の比較クエリ（`categoryTimeRecordsPairHandler`）を確認
4. 移動平均の前年クエリ（`movingAverageHandler`）を確認

## 3. ハマりポイント

### 3.1. 2 つの auto-load 機構の混在

`useAutoLoadPrevYear` は legacy パスで `dataStore` から直接前年データを取得する。
`useLoadComparisonData` は新しい `ComparisonScope` 対応の仕組み。
両方が部分的に動いているため、片方を除去すると一部のデータスライスが欠落する
可能性がある。統合前に必ず全 consumer の棚卸しを完了すること。

### 3.2. `deletePrevYearMonth` の year-shift 設計

`data-load-idempotency-hardening` で文書化済み。`deletePrevYearMonth(conn, year, month)`
は引数として **当年** を受け取り、内部で `prevYear = year - 1` してから削除する。
絶対位置で消したい場合は `deletePrevYearRowsAt(year, month)` を使う。

### 3.3. `store_day_summary` マテリアライゼーションのタイミング

`store_day_summary` は VIEW であり、基礎テーブル（`classified_sales`, `flowers` 等）に
前年データが入っていなければ前年行は出現しない。前年データの欠落は
`store_day_summary` 側ではなく、基礎テーブルへのロードで解決する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md` | 冪等性保証の先行 project |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性 |
| `references/03-guides/runtime-data-path.md` | 実行時データ経路 |
