# checklist — data-flow-unification

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: 診断・整理

* [x] `useAutoLoadPrevYear` と `useLoadComparisonData` の責務範囲・呼び出し元・対象テーブルを棚卸しし結果を `HANDOFF.md` に記録する
* [x] DuckDB 上で `is_prev_year=true` 行が欠落しているテーブルを特定し一覧化する
* [x] `is_prev_year=true` データに依存する全 consumer（SQL クエリ・hook・widget）を棚卸しする
* [x] `useAutoLoadPrevYear` が引き続き必要か、除去可能かを判定し結論を `plan.md` に記録する
* [x] 診断ログを追加し、データフロー（IndexedDB → dataStore → DuckDB）の各段階で前年データの有無を確認できるようにする

## Phase 2: Auto-Load 統合

* [x] `useAutoLoadPrevYear` と `useLoadComparisonData` を単一の前年データロード機構に統合する
* [x] 統合後のローダーが全データスライス（classifiedSales, categoryTimeSales, flowers, purchase, transfers）を前年分ロードすることを確認する
* [x] 統合後のローダーが `ComparisonScope`（新システム）と連携して動作することを確認する
* [x] 旧 auto-load 機構の呼び出し元を全て統合後の機構に切り替える

## Phase 3: DuckDB ロード保証

* [x] `loadMonth(prevYear, isPrevYear=true)` が全対象テーブルをカバーしていることを検証する
* [x] `time_slots` テーブルに `is_prev_year=true` 行が正しく挿入されることを検証する
* [x] `store_day_summary` マテリアライゼーションが前年データを含むことを検証する（基礎テーブルへのロード経由）
* [x] ロード完了後に `is_prev_year=true` 行数を検証するデータ整合性チェックを追加する

## Phase 4: キャッシュ戦略

* [x] fingerprint ベースのキャッシュ無効化が前年データの変更を検知することを検証する
* [x] 前年データ変更時に適切なリロードがトリガーされることを確認する
* [x] エッジケース（部分データ・stale キャッシュ・並行ロード）の処理方針を確定し実装する

## Phase 5: 検証・ガード

* [x] データフロー整合性を保証するガードテストを追加する（`is_prev_year=true` 行の存在・テーブル網羅性）
* [x] 全比較チャート widget が前年データを正しく表示することを E2E または手動で検証する
* [x] Phase 1 で追加した診断ログを除去する
* [x] 関連ドキュメント（`runtime-data-path.md` / `data-pipeline-integrity.md`）を更新する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
