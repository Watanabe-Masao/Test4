# duckdb-specialist — スキル（論理構造 + 方法論）

## SKILL-1: SQL クエリの追加

### 論理構造（なぜこの手順か）

- エンジン選択を確認しないと → JS で既に実装済みの集約を DuckDB でも実装してしまう → 二重実装禁止違反
- Branded Type を使わないと → 検証されていない文字列が SQL に到達する → SQL インジェクションリスク
- バレルに re-export しないと → 他のフックから新クエリが利用できない → 後方互換が壊れる

### 方法論（手順）

1. `references/01-foundation/engine-responsibility.md` でエンジン選択を確認（DuckDB が適切か？）
2. 対応する `infrastructure/duckdb/queries/` モジュールにクエリ関数を追加
3. `queryParams.ts` でパラメータバリデーションを追加（Branded Type 使用）
4. `application/hooks/duckdb/` に対応するフックを追加（`useAsyncQuery` ベース）
5. `hooks/duckdb/index.ts` バレルに re-export を追加
6. テストを追加し、`npm test` で通ること

### クエリ関数テンプレート

```typescript
export async function queryNewAnalysis(
  conn: AsyncDuckDBConnection,
  dateRange: ValidatedDateRange,
  storeFilter: ValidatedStoreFilter,
): Promise<NewAnalysisRow[]> {
  const sql = `
    SELECT ...
    FROM store_day_summary
    WHERE date_key BETWEEN ? AND ?
      AND (? = '' OR store_id IN (?))
    GROUP BY ...
    ORDER BY ...
  `
  return runQuery<NewAnalysisRow>(conn, sql, [
    dateRange.start,
    dateRange.end,
    storeFilter.raw,
    storeFilter.ids,
  ])
}
```

## SKILL-2: スキーマ変更

### 論理構造（なぜこの手順か）

- `SCHEMA_VERSION` をインクリメントしないと → 旧スキーマが残りデータ投入が失敗する → サイレントエラー
- マイグレーションが冪等でないと → 2回実行するとデータが壊れる → ユーザーデータ消失リスク
- `dataLoader.ts` を更新しないと → 新カラムにデータが投入されない → クエリが空結果を返す

### 方法論（手順）

1. `schemas.ts` の対象テーブル DDL を修正
2. `SCHEMA_VERSION` をインクリメント
3. `migrations/` にマイグレーションスクリプトを追加
4. `dataLoader.ts` のデータ投入ロジックを更新（必要な場合）
5. `npm test` と `npm run build` で通ること

### マイグレーション規則

- マイグレーションは冪等（`IF NOT EXISTS`, `IF EXISTS` を使う）
- `schema_meta` テーブルの `version` と `updated_at` を更新する
- 既存データの変換が必要な場合は `ALTER TABLE` + `UPDATE` で対応

## SKILL-3: パフォーマンス最適化

### 論理構造（なぜこの手順か）

- `store_day_summary` は6テーブルの LEFT JOIN → クエリのたびに結合処理が走る → 大量データで遅延する
- `materializeSummary()` で事前計算すると → JOIN コストがなくなる → ただしデータ更新時に再実行が必要
- `date_key` フィルタを早期適用しないと → 全期間のデータを JOIN してからフィルタする → 無駄な処理が発生する

### 方法論（手順）

1. `queryProfiler.ts` でクエリ実行時間を計測
2. `EXPLAIN` で実行計画を確認
3. 以下の最適化を検討:
   - `date_key` フィルタの早期適用
   - 不要な JOIN の除去
   - `GROUP BY` の粒度見直し
   - `materializeSummary()` によるVIEW実体化
4. 最適化前後の実行時間を比較・記録

### パフォーマンス目標

| クエリタイプ | 目標応答時間 |
|---|---|
| 単純集約（1テーブル） | < 50ms |
| JOIN 集約（store_day_summary VIEW） | < 200ms |
| 月跨ぎ大量データ（10万行超） | < 500ms |
