# HANDOFF — data-flow-unification

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

プロジェクト立ち上げ直後。Phase 1（差分特定）から着手する。

**判明した事実:**
- 旧経路（`useAutoLoadPrevYear`）で手動ロード後は前年データが正しく表示される
- 新経路（`useLoadComparisonData`）単独では一部のデータスライスが DuckDB に入らない
- カレンダーモーダル（旧経路）では5要素分解・時間帯比較が正常動作
- ダッシュボードウィジェット（新経路依存）では前年データが欠落

**修正済み:**
- `materializeSummary` の `force=true` 対応（前年データ追加後の再マテリアライズ）
- SQL エラー（`customers` 列不在、`b.total` 列不在、エイリアス不一致）
- 5要素分解の `hasQuantity=false` 時フォールバック
- 移動平均チャートの色重複
- スライダー分母固定バグ

## 2. 次にやること

### 最優先: 旧経路と新経路の差分特定

旧経路は廃止すべきだが、現在は動作している。新経路との**差分**を正確に特定し、
新経路に何が足りないかを明確にする。差分が分かれば修正は局所的になる。

### 中優先

- Phase 3: `loadMonth(prevYear, isPrevYear=true)` の網羅性を保証し、全テーブルに `is_prev_year=true` 行が入ることを検証する
- Phase 4: fingerprint キャッシュの前年データ対応を整理する

### 低優先

- Phase 5: ガードテスト追加、診断ログ除去、ドキュメント更新

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
