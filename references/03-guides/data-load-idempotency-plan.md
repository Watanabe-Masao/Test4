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

Phase 1（loadMonth の冪等化）は本ブランチで landed 済み。具体的には:

- `dataLoader.ts::loadMonth` の JSDoc を「追記モード」から **replace セマンティクス** に
  書き換えた。関数内部で `deleteMonth` / `deletePrevYearMonth` を先行実行し、
  INSERT 途中の失敗時も同じ削除を再実行する cleanup 経路を持つ。
- `useDuckDB.ts` 冒頭の責務コメントを「差分: deleteMonth → loadMonth → materializeSummary」
  から「loadMonth は replace セマンティクスで対象月を差し替える」に更新した。
  これにより本ファイルが削除順序の正本ではないことが読めるようになった。

次に閉じる残タスク:

1. **Phase 2（呼び出し側 cleanup）** — `useDuckDB.ts` 188-189 行目の
   `deleteMonth` + `deletePrevYearMonth` を削除する。`loadMonth` が内部で
   削除するため二重になっている。219-220 行目（obsolete-month 削除経路）は
   reload の前処理ではなく明示 remove なので残す。
2. **Phase 3（テストで固定）** — 同一月 2 回ロード・前年 2 回ロード・
   store_day_summary.customers 安定・失敗時 cleanup の 4 テストを追加する。
3. 他クエリの spot audit — `classified_sales` / `special_sales` / `transfers`
   を SUM している read-path クエリに重複耐性の暗黙前提がないかを洗い出す。
   refactor は別スコープ。
