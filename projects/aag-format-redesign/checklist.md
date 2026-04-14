# checklist — aag-format-redesign

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: 痛点棚卸し

* [ ] `unify-period-analysis` bootstrap で発生した詰まり事象を `pain-points.md` に事実ベースで全件記録する
* [ ] 現行 `_template/` で実行可能粒度に届かなかった項目を `pain-points.md` に追記する
* [ ] `executionOverlayGuard` 全 140 ルール要件による初期化負荷の事実を `pain-points.md` に追記する
* [ ] 派生トピックの行き場がない問題のユースケースを `pain-points.md` に追記する
* [ ] 現行 AAG / project 文書体系の良い点を `strengths.md` に事実ベースで列挙する

## Phase 1: 現状調査

* [ ] `_template/` の構造と限界を `current-state-survey.md` に記録する
* [ ] `executionOverlayGuard` 要件と新 project 立ち上げへの影響を調査・記録する
* [ ] `project-resolver.ts` / `vite.config.ts` / `vitest.config.ts` の解決経路を図解する
* [ ] `project-health.json` collector の生成ロジックを調査・記録する
* [ ] `project-checklist-governance.md` §10 と実態の乖離を記録する

## Phase 2: 新フォーマット設計（project 文書側）

* [ ] 必須セットと派生セットの境界を `new-format-design.md` で定義する
* [ ] 派生セット（pr-breakdown / acceptance-suite / test-plan / inventory）の追加判断基準を定義する
* [ ] 新 project bootstrap チェックリスト（resolver / vite / docs:generate / test:guards 起動順）を定義する
* [ ] 既存 `_template/` を破壊しない配置方針を決める

## Phase 3: 新フォーマット設計（AAG overlay 側）

* [ ] overlay bootstrap 緩和の 3 案（defaults / inherits / optionalRuleIds）を `overlay-bootstrap-design.md` で比較する
* [ ] 採用案を 1 つ選び互換性影響を明示する
* [ ] `executionOverlayGuard` 影響範囲を分析する
* [ ] 既存 project が無変更で動き続けることを保証する設計を確定する

## Phase 4: サブプロジェクト機能設計（P1 — 親子リンクのみ）

* [ ] `config/project.json` schema に `parent` field を optional で追加する設計を `subproject-design.md` で定義する
* [ ] `project-health.json` collector の parent 表示拡張仕様を定義する
* [ ] 親子関係 guard 仕様（`parent` 指定先の実在検証）を定義する
* [ ] サブ project 側の運用ルール（Read Order に親 AI_CONTEXT 含める等）を定義する
* [ ] 既存 project に影響しないことを設計レベルで証明する

## Phase 5: 実装

* [ ] `_template/` または `_template-extended/` を additive に拡張する
* [ ] overlay bootstrap 緩和を実装する
* [ ] `parent` field schema を実装する
* [ ] `project-health` collector の parent 対応を実装する
* [ ] 親子関係 guard を追加する
* [ ] 新 project bootstrap チェックリストを `references/03-guides/` に追加する
* [ ] `npm run test:guards` が全 PASS する
* [ ] `npm run docs:check` が PASS する
* [ ] 既存 project（`pure-calculation-reorg` / `unify-period-analysis`）が無変更で動き続けることを確認する

## Phase 6: 移行ガイド作成

* [ ] 既存 project を新フォーマットに移行する手順書を `migration-guide.md` に作成する
* [ ] 既存 project ごとの影響範囲を表形式で示す
* [ ] 移行のトリガー条件（いつ移行すべきか / いつ移行しなくてよいか）を明示する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
