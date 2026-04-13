# checklist — aag-collector-purification

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: pure-calculation-reorg/checklist.md の純化

* [x] `pure-calculation-reorg/checklist.md` の各 Phase 内 「やってはいけないこと」 セクションの全 checkbox を `pure-calculation-reorg/plan.md` の不可侵原則 / 禁止事項テーブルに移動する
* [x] 「やってはいけないこと」 セクションの見出しを `pure-calculation-reorg/checklist.md` から削除する
* [x] ファイル末尾の 「常時チェック」 セクションの 6 checkbox を `references/03-guides/coding-conventions.md` または CONTRIBUTING.md の開発フローに移動する
* [x] 「常時チェック」 セクションの見出しを `pure-calculation-reorg/checklist.md` から削除する
* [x] ファイル末尾の 「4つだけ毎回見る最重要項目」 セクションの 4 checkbox を `pure-calculation-reorg/plan.md` の Phase 11 完了後の確認項目に移動する
* [x] 「最重要項目」 セクションの見出しを `pure-calculation-reorg/checklist.md` から削除する
* [x] 純化後の `pure-calculation-reorg/checklist.md` に Phase 0-11 の達成条件 checkbox だけが残っていることを目視確認する
* [x] 純化後に `npm run docs:generate` を実行し project-health の `pure-calculation-reorg` 進捗が純化前と同じ数字 (88/132) であることを確認する
* [x] pure-calculation-reorg の Phase 0-11 の checkbox 状態 (`[x]` / `[ ]`) が変更されていないことを diff で確認する

## Phase 2: format guard の strict 化

* [x] `app/src/test/guards/checklistFormatGuard.test.ts` の `FORMAT_EXEMPT_PROJECT_IDS` から `'pure-calculation-reorg'` を削除する
* [x] `npm run test:guards` で `checklistFormatGuard` が PASS することを確認する
* [x] もし F3-F5 違反が出たら Phase 1 に戻り該当箇所を純化する

## Phase 3: collector の heading 抑制ロジック削除 + 対称性 guard 追加

* [x] `tools/architecture-health/src/collectors/project-checklist-collector.ts::countCheckboxes` から「やってはいけないこと / 常時チェック / 最重要項目」セクション抑制 if 文を削除する
* [x] `npm run docs:generate` で project-health の数字に regression がないことを確認する
* [x] `quick-fixes` collection の動作 (`derivedStatus = collection`) に regression がないことを確認する
* [x] `app/src/test/guards/checklistGovernanceSymmetryGuard.test.ts` を新規追加する
* [x] symmetry guard が「『やってはいけないこと』『常時チェック』『最重要項目』見出しが全 live project の checklist.md に存在しないこと」を検証する
* [x] `npm run test:guards` で symmetry guard が PASS することを確認する
* [x] symmetry guard の error message に修正手順 (plan.md / coding-conventions.md への移動) を含める

## Phase 4: 文書同期 + archive

* [x] `references/03-guides/project-checklist-governance.md` §3 に「symmetry guard で機械検証されている」旨を追記する
* [x] `references/03-guides/project-checklist-governance.md` §8 関連実装表に symmetry guard を追加する
* [x] `references/01-principles/aag-5-constitution.md` Layer 3 Execution 一覧に symmetry guard を追加する
* [x] `references/02-status/recent-changes.md` および CHANGELOG.md に AAG 5.2 として本 project の成果を記載する
* [x] バージョン bump (1.9.0 → 1.10.0 / AAG 5.1 → 5.2) を `version sync registry` 経由で 4 ペア同期させる
* [x] 本 project の HANDOFF.md 末尾に `Archived: YYYY-MM-DD` を追記する
* [x] `mv projects/aag-collector-purification projects/completed/aag-collector-purification` で archive する
* [x] `references/02-status/open-issues.md` の active project 索引から外し、archived projects テーブルに 1 行追加する
* [x] `npm run docs:generate` で `derivedStatus = archived` になることを確認する
