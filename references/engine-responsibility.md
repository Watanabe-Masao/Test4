# JS vs DuckDB エンジン責務マトリクス

本システムには2つの計算エンジンがあり、それぞれ排他的な責務を持つ。
同じ集約ロジックを両方に実装する「二重実装」は禁止。

## 責務割当

| 計算内容 | エンジン | 根拠 |
|---|---|---|
| シャープリー要因分解 | **JS** | 不変条件テストが JS で検証 |
| 在庫法/推定法 粗利計算 | **JS** | 数学的正確性の保証が JS テストに依存 |
| 予算達成率・消化率 | **JS** | StoreResult の確定値を使用 |
| 感度分析・回帰 | **JS** | domain/calculations の純粋関数 |
| 因果チェーン | **JS** | 複数計算の連鎖的依存 |
| 月跨ぎ時系列分析 | **DuckDB** | CTS インデックスは単月のみ保持 |
| 時間帯×曜日×カテゴリ集約 | **DuckDB** | SQL の GROUP BY が適切 |
| 店舗ベンチマーク | **DuckDB** | 大量レコード集約 |
| カテゴリドリルダウン | **DuckDB** | 多次元集約 |
| 異常検出（Zスコア） | **DuckDB** | 自由日付範囲での統計計算 |

## 判定フロー

```
この計算は…
├── StoreResult の確定値を消費するか？
│   └── Yes → JS（domain/calculations/ or application/usecases/）
├── 月跨ぎクエリか？
│   └── Yes → DuckDB（infrastructure/duckdb/queries/）
├── 多次元集約（GROUP BY 3変数以上）か？
│   └── Yes → DuckDB
├── 10万件超の走査が必要か？
│   └── Yes → DuckDB
└── 上記いずれでもない → JS が妥当（シンプルな計算は JS に寄せる）
```

## 出力の違い

| | JS 計算エンジン | DuckDB 探索エンジン |
|---|---|---|
| 出力 | `StoreResult` | SQL 集約結果（行配列） |
| スコープ | 単月確定値 | 任意日付範囲 |
| 定義場所 | `domain/calculations/` | `infrastructure/duckdb/queries/` |
| フック | `application/usecases/` | `application/hooks/duckdb/` |
| テスト | ユニットテスト + 不変条件テスト | integration テスト |
