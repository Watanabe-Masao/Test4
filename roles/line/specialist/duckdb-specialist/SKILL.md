# duckdb-specialist — スキル（手順書）

## SKILL-1: SQL クエリの追加

新しい分析クエリを DuckDB に追加する手順。

### 手順

1. `references/engine-responsibility.md` でエンジン選択を確認（DuckDB が適切か？）
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

テーブル定義の変更手順。

### 手順

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

クエリが遅い場合の調査・改善手順。

### 手順

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
