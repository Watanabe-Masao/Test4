# 拡張プレイブック

本ドキュメントは KPI 追加・DuckDB クエリ追加の手順を「型」として定義する。
漏れ防止のためのチェックリストであり、PR テンプレートからも参照される。

---

## A. KPI（MetricId）追加手順

新しい指標を追加するときは、以下の順序で作業する。

### 1. Domain 層 — 計算ロジック

- [ ] `domain/calculations/` に計算関数を追加（純粋関数、副作用なし）
- [ ] ゼロ除算・null・NaN のガードを実装
- [ ] 不変条件テストを追加（`*.test.ts` — 実装ではなく制約をテスト）

### 2. MetricId 登録

- [ ] `domain/models/Explanation.ts` の MetricId ユニオン型に新 ID を追加
- [ ] MetricMeta（label / unit / tokens）を定義
- [ ] `references/metric-id-registry.md` に登録（ID・ラベル・計算式・ソース）

### 3. Explanation（説明責任 L1/L2/L3）

- [ ] `application/usecases/explanation/ExplanationService.ts` にビルダーを追加
  - L1: 一言サマリー（例: 「前年比 +5.2%」）
  - L2: 計算式と入力値（例: `当月売上 / 前年売上 - 1`）
  - L3: ドリルダウン先の指定
- [ ] StoreResult の既存値をそのまま使う（計算の再実行禁止）

### 4. Application 層 — ユースケース接続

- [ ] 計算結果を StoreResult または該当インデックスに接続
- [ ] 必要なら hooks を追加（最小セレクタ原則を遵守）

### 5. Presentation 層 — UI 表示

- [ ] コンポーネントに指標を追加（描画のみ、計算禁止）
- [ ] テーマトークン経由のスタイリング（実績=緑系 / 推定=オレンジ系）
- [ ] Storybook ストーリーを追加

### 6. テスト・検証

- [ ] ユニットテスト: 計算ロジック + エッジケース
- [ ] 不変条件テスト: 数学的制約の検証
- [ ] ビルド通過: `npm run build`（型エラー 0）
- [ ] lint 通過: `npm run lint`（エラー 0）
- [ ] カバレッジ: 追加コードのカバレッジを確認

### 7. ドキュメント

- [ ] `references/metric-id-registry.md` を更新
- [ ] 必要なら `references/calculation-engine.md` を更新

---

## B. DuckDB クエリ追加手順

DuckDB-WASM で新しい探索クエリを追加するときは、以下の順序で作業する。

### 1. 責務マトリクス確認

- [ ] `references/engine-responsibility.md` を確認
- [ ] JS 計算エンジンと責務が重複しないことを確認（二重実装禁止）
- [ ] 責務マトリクスに新クエリを追記

### 2. SQL / Runner 実装

- [ ] `infrastructure/duckdb/queries/` にクエリモジュールを追加
- [ ] パラメータ化された SQL（SQL インジェクション防止）
- [ ] 型安全な結果型を定義

### 3. Application 層 — フック接続

- [ ] `application/hooks/` に useDuckDBQuery ベースのフックを追加
- [ ] フィルタパラメータ（店舗・日付範囲等）を型安全に受け渡し

### 4. Presentation 層 — チャート表示

- [ ] チャートコンポーネントを `presentation/components/charts/` に追加
- [ ] ローディング / エラー / 空データ状態のハンドリング
- [ ] Storybook ストーリーを追加

### 5. テスト・検証

- [ ] クエリロジックのユニットテスト
- [ ] ビルド通過: `npm run build`
- [ ] lint 通過: `npm run lint`

### 6. パフォーマンス計測

- [ ] 大量データ（1万行以上）でのクエリ実行時間を計測
- [ ] 必要に応じてインデックスや集約の最適化

### 7. ドキュメント

- [ ] `references/engine-responsibility.md` を更新
- [ ] `references/duckdb-architecture.md` に追記（必要な場合）

---

## 判断基準: JS vs DuckDB どちらに実装するか

| 基準 | JS 計算エンジン | DuckDB 探索エンジン |
|---|---|---|
| スコープ | 単月確定値 | 任意日付範囲 |
| データソース | StoreResult | 生レコード（SQL テーブル） |
| 出力 | StoreResult のフィールド | SQL 集約結果 |
| 典型例 | 粗利率、予算達成率 | 時間帯ヒートマップ、月跨ぎトレンド |
