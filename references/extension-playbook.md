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

## C. カバレッジ閾値ロードマップ

全体閾値は lines 55% を維持しつつ、変更リスクが高い領域だけ先行して引き上げる。

### 現在の層別閾値（`vitest.config.ts`）

| 対象 | 閾値 | 実績（2026-03-04） | 理由 |
|---|---|---|---|
| 全体（domain + application + infrastructure） | 55% | 54.45% | 既存ベースライン |
| `domain/calculations/**` | **80%** | 99.02% | 数学的不変条件を持つ計算ロジック。回帰リスク最大 |
| `application/usecases/explanation/**` | **70%** | 89.01% | StoreResult 参照の正確性が監査対象 |

### 引き上げ履歴と今後のスケジュール

| 時期 | 全体 | domain/calculations | explanation | 備考 |
|---|---|---|---|---|
| 初期設定 | 55% | 70% | 60% | 2026-03-04 導入 |
| ~~+1ヶ月~~ → 即時 | 55% | **80%** | **70%** | 実績が大幅超過のため前倒し |
| 次回見直し | 60% | 80% | 70% | 全体の実績が 60% を超えたら引き上げ |
| 最終目標 | 65% | 85% | 75% | — |

**原則:** 閾値を上げる前に、既存テストが安定していることを確認する。
カバレッジのために無意味なテストを書かない — 不変条件テストを優先する。

---

## よくある落とし穴

### KPI 追加時

| 落とし穴 | 正しいやり方 |
|---|---|
| Explanation で計算を再実行する | StoreResult の既存値をそのまま参照する |
| MetricId を追加したが MetricMeta を定義し忘れる | ID と Meta は必ずセットで追加する |
| UI コンポーネント内でフィルタや集約を書く | hooks / usecases で処理し、UI は描画のみ |
| テストで「実装の戻り値」だけ検証する | 不変条件（制約）をテストする |

### DuckDB クエリ追加時

| 落とし穴 | 正しいやり方 |
|---|---|
| JS 計算エンジンと同じ集約を SQL で再実装する | 責務マトリクスで排他性を確認（二重実装禁止） |
| SQL 文字列をテンプレートリテラルで組み立てる | パラメータ化 SQL を使う |
| 大量データでのパフォーマンスを計測しない | 1 万行以上で実行時間を計測する |

---

## 判断基準: JS vs DuckDB どちらに実装するか

| 基準 | JS 計算エンジン | DuckDB 探索エンジン |
|---|---|---|
| スコープ | 単月確定値 | 任意日付範囲 |
| データソース | StoreResult | 生レコード（SQL テーブル） |
| 出力 | StoreResult のフィールド | SQL 集約結果 |
| 典型例 | 粗利率、予算達成率 | 時間帯ヒートマップ、月跨ぎトレンド |
