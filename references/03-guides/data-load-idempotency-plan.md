# 引き継ぎ書 — データロード層の冪等化・重複防止

> 本文書は Phase 5-6 実装中に発見された構造的バグの根本解決計画を記述する。
> 暫定修正は適用済み（`MAX(customers)` + `loadMonth` 内自動 `deleteMonth`）。
> 本格対応は別スコープで計画的に実施する。

## 1. 発見された問題

### 症状

コンディションサマリーの「客数前年比」が `1.56e+17` と表示される。
点数客数GAP・金額客数GAPにも同じ値が伝播。

### 直接原因

`store_day_summary` VIEW 内の flowers サブクエリで `SUM(customers)` を使用。
花データの重複（リロード等）時に客数が二重計上されて膨張。

### 根本原因

`loadMonth` が **追記モード（INSERT のみ）** であり、冪等でない。
呼び出し元が `deleteMonth` を先行させる責任を持つ設計だが、
以下のケースで `deleteMonth` なしに `loadMonth` が呼ばれる可能性がある：

1. **recovery.ts の `rebuildFromIndexedDB`** — `resetTables` 直後なので通常は安全だが、
   部分失敗後の再試行で重複が発生する可能性
2. **Worker ハンドラの `executeLoadMonth`** — `deleteMonth` を内包していない。
   呼び出し元（`useDuckDB.ts`）が順序を保証するが、保証は構造的ではなく慣習的
3. **ユーザーが同じデータを複数回インポートした場合** — `special_sales` に同一
   store×day の重複行が蓄積

## 2. 適用済みの暫定修正

| コミット | ファイル | 修正内容 |
|---------|---------|---------|
| `591a543` | `schemas.ts` | `SUM(customers)` → `MAX(customers)` |
| `57ff0f2` | `dataLoader.ts` | `loadMonth` 内で自動 `deleteMonth` |

暫定修正の限界：
- `MAX(customers)` は重複があっても正しい値を返すが、重複レコード自体は残る
- `loadMonth` の自動 `deleteMonth` は `useDuckDB.ts` の既存 `deleteMonth` と二重実行になる（副作用なしだが非効率）

## 3. 根本解決の方針

### 3.1 設計原則

**データロードは冪等であるべき。** 同じデータを何回 INSERT しても結果が同じであること。

### 3.2 解決すべき問題

| # | 問題 | 影響範囲 |
|---|------|---------|
| 1 | `special_sales` に重複行が蓄積する | 客数・花売価・産直売価 |
| 2 | `loadMonth` と `deleteMonth` が別 API | 全テーブル |
| 3 | Worker メッセージが `loadMonth` と `deleteMonth` を分離 | Worker 経由の全操作 |
| 4 | リカバリ時の重複防止が構造的に保証されない | `rebuildFromIndexedDB` |
| 5 | `store_day_summary` VIEW が重複に対して脆弱 | 客数以外にも影響の可能性 |

### 3.3 推奨アプローチ

**A. `loadMonth` を冪等関数として再設計する**

```
loadMonth(conn, db, data, year, month, isPrevYear)
  ├── 1. DELETE WHERE year=? AND month=? [AND is_prev_year=?]
  ├── 2. INSERT (バルクロード)
  └── 3. VIEW 再マテリアライズ（必要に応じて）
```

これは暫定修正で部分的に実施済み。ただし：
- `useDuckDB.ts` の `deleteMonth` 呼び出しが冗長になる → 削除可能
- Worker の `executeDeleteMonth` が不要になる可能性

**B. `special_sales` テーブルに UNIQUE 制約を追加する**

```sql
CREATE TABLE special_sales (
  year INT, month INT, store_id VARCHAR, day INT, type VARCHAR,
  cost DOUBLE, price DOUBLE, customers DOUBLE,
  -- DuckDB WASM では UNIQUE 制約が限定的
  -- INSERT OR REPLACE は未サポート
);
```

DuckDB WASM の制約上、UNIQUE + UPSERT は使えない。
DELETE → INSERT のアプローチが現実的。

**C. VIEW の防御策を全カラムに拡張する**

```sql
-- 現在: customers のみ MAX
MAX(customers) AS customers

-- 拡張: cost/price も重複に対して安全にする
-- ただし金額は SUM が正しいケースもあるため慎重に
```

### 3.4 推奨優先順序

1. **まず A を完成させる** — `loadMonth` の冪等化は暫定修正で 80% 完了。
   `useDuckDB.ts` の冗長な `deleteMonth` を整理する
2. **B は DuckDB の制約上見送り** — UNIQUE 制約 + UPSERT が使えない
3. **C は A が完了していれば不要** — 重複が発生しなければ VIEW の防御は保険

## 4. 影響するファイル

| ファイル | 役割 | 変更の可能性 |
|---------|------|------------|
| `infrastructure/duckdb/dataLoader.ts` | 月次データ投入 | ✅ 暫定修正済み。冗長な外部 deleteMonth の整理 |
| `infrastructure/duckdb/deletePolicy.ts` | 削除ポリシー | API 整理の可能性 |
| `infrastructure/duckdb/schemas.ts` | VIEW 定義 | ✅ 暫定修正済み |
| `infrastructure/duckdb/recovery.ts` | DB リカバリ | `loadMonth` 冪等化で自動解決 |
| `infrastructure/duckdb/worker/workerHandlers.ts` | Worker ハンドラ | `executeDeleteMonth` の見直し |
| `infrastructure/duckdb/worker/duckdbWorkerClient.ts` | Worker クライアント | `deleteMonth` API の見直し |
| `application/runtime-adapters/useDuckDB.ts` | ロード統合 | 冗長な `deleteMonth` 呼び出し整理 |

## 5. テスト計画

| テスト | 目的 |
|--------|------|
| `loadMonth` を同一データで 2 回呼んでも行数が変わらないこと | 冪等性検証 |
| `special_sales` に同一 store×day の重複がないこと | 重複防止検証 |
| `store_day_summary` の `customers` が正常値であること | 回帰検証 |
| リカバリ後にデータ整合性が保たれること | リカバリ検証 |
| 前年データの重複がないこと | `isPrevYear` パス検証 |

## 6. やってはいけないこと

1. `loadMonth` を呼ぶ前に `deleteMonth` を呼ぶ **運用ルール** で解決しない — 構造で保証する
2. VIEW の `MAX` だけで根本解決としない — 重複レコード自体が存在する状態は不健全
3. DuckDB WASM の制約を無視して UPSERT を使おうとしない — ランタイムエラーになる
4. `store_day_summary` VIEW 以外のクエリが重複に耐性があると仮定しない — 調査が必要

## 7. 現状（2026-04-12 追記）

Phase 1（契約明文化）/ Phase 2（呼び出し側 cleanup）/ Phase 3.b（冪等性テスト）/
Phase 3.a（前年 purge 修正）が landed 済み。本課題は主要スコープにおいて
クローズ。

**Phase 1（#993）:**

- `dataLoader.ts::loadMonth` の JSDoc を「追記モード」から **replace セマンティクス** に
  書き換えた。関数内部で対象スコープを先行削除し、INSERT 途中の失敗時も同じ削除を
  再実行する cleanup 経路を持つ。内部重複は `purgeLoadTarget` helper に一本化した。
- `useDuckDB.ts` 冒頭の責務コメントを現実（loadMonth が replace 正本）に合わせた。

**Phase 2（#994）:**

- `useDuckDB.ts` の変更月再ロード経路から caller-side `deleteMonth` を除去した。
- `deletePolicy.ts` / `workerHandlers.ts::executeDeleteMonth` /
  `duckdbWorkerClient.ts::deleteMonth` の JSDoc を explicit remove として整理。
- （初版で `deletePrevYearMonth` まで消してしまい前年 purge が効かなくなる
  回帰があったため、同 PR の fix commit で caller 側に戻し、原因である
  `purgeLoadTarget` の year-shift を Phase 3.a で修正する方針を確定した）

**Phase 3.b（#995）:**

- `dataLoaderPureFunctions.test.ts` に冪等性契約のテスト 4 本を追加。
  当年 head purge / 当年 2 回ロード / 失敗時 cleanup / 前年 purge の
  year-shift latent bug を固定した。前年 purge のテストは `.fails` で
  expected failure として記録し、Phase 3.a で外す運用とした。

**Phase 3.a:**

- `deletePolicy.ts` に `deletePrevYearRowsAt(year, month)` を新規導入。
  year-shift せずに `(year, month)` の前年スコープ（`is_prev_year=true` 行と
  `PREV_YEAR_INSERT_TABLES` の行）を直接削除する。
- `deletePrevYearMonth(year, month)` を `deletePrevYearRowsAt(year-1, month)` の
  thin wrapper に refactor。当年文脈の explicit remove という既存の意味論を
  保持しつつ、前年ロードの purge と表面実装を共有する。
- `dataLoader.ts::purgeLoadTarget` を `deletePrevYearRowsAt` 経由に変更し、
  `isPrevYear=true` 時の year-shift を解消。
- `useDuckDB.ts` の Phase 2 fix commit で残していた caller-side workaround
  `deletePrevYearMonth(state.conn, year, month)` を除去。当月再ロード経路は
  `loadMonth` のみで成立する状態になった。
- `dataLoaderPureFunctions.test.ts` の `.fails` を通常 `it` に戻し、
  year-shift への退行を明示的に検査する assertion（`year = 2023` を含まない）
  を追加。

これにより API 境界が最終形に収束した:

- **差し替えたい** → `loadMonth(...)`（当年・前年とも caller-free）
- **消したい** → `deleteMonth(...)` / `deletePrevYearMonth(...)`（explicit remove）

**Phase 3.c — read-path spot audit:**

`classified_sales` / `special_sales` / `transfers` を SUM している全 read-path
クエリを機械的に洗い出し、重複耐性の暗黙前提がないかを検査した。
詳細は [read-path-duplicate-audit.md](./read-path-duplicate-audit.md) を参照。

結果:

- **FRAGILE**: 6 クエリ（`purchaseComparison.ts` 5 件 + `freePeriodFactQueries.ts` 1 件）
- **PARTIAL**: 3 クエリ（`categoryDiscount.ts` 2 件 + `discountFactQueries.ts` 1 件）
- **SAFE**: `store_day_summary` VIEW 経由の全クエリ（VIEW 本体が source テーブルを
  subquery で事前集約 + `MAX(customers)` の防御集約を持つため下流は無影響）

idempotent load contract が main 上で機能している限り FRAGILE クエリは
silent に壊れない。逆に言えば、ロード境界が壊れたときに最初にダッシュボードで
異常値が出る経路として可視化された。**現時点で修正は不要**（refactor は
本 audit のスコープ外）。将来の追加防御を入れるなら優先順位は
「FRAGILE 6 件への回帰テスト追加 → `purchaseComparison.ts` の pre-aggregate
refactor → FRAGILE / PARTIAL クエリへの JSDoc 前提明示」の順。

以上で idempotent load contract の本体スコープは完全にクローズ。
