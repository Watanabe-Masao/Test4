# checklist — aag-self-hosting-completion

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 恒久ルールは plan.md §4 に書く。
> 各 item は **observable verification** が完了条件 (= drawer Pattern 4 適用)。

## Phase 0: Bootstrap

- [x] `_template/` から `projects/aag-self-hosting-completion/` 作成 + 必須セット 6 ファイル
- [x] config/project.json を AAG-COA Level 3 + architecture-refactor で articulate
- [x] `references/02-status/open-issues.md` に `aag-self-hosting-completion` 行追加
- [x] `docs/contracts/doc-registry.json` に project entry 追加
- [x] operational-protocol-system HANDOFF.md §3.6 に pause articulation 追加 (= R5 完了後再開)
- [ ] DA-α-000 (進行モデル) landing
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## Phase R1: AAG sub-tree relocation

- [ ] DA-α-001 entry landing (= R1 着手判断、5 軸 + 観測点 + Lineage)
- [ ] `aag/_internal/` ディレクトリ新設
- [ ] `references/01-principles/aag/` 9 doc を `aag/_internal/` に物理 移動
- [ ] `aag/interface/` ディレクトリ skeleton (= R2 用、空 README + .gitkeep)
- [ ] 101 inbound link を新 path (= aag/_internal/) に全 update
- [ ] guard / collector の path constants 該当箇所 update (= aag-related guard 群)
- [ ] doc-registry.json + manifest.json reorganize entry
- [ ] **観測** R1-1: 9 doc が aag/_internal/ に物理移動完了
- [ ] **観測** R1-2: 101 inbound link 新 path 整合 (= broken link 0 件)
- [ ] **観測** R1-3: guard / collector path 更新後 944 test 全 PASS
- [ ] **観測** R1-4: doc-registry.json + manifest.json で新 path 整合
- [ ] **観測** R1-5 (反証): synthetic broken link 試験で test fail (= ratchet-down 可能)
- [ ] DA-α-001 振り返り判定 (正しい / 部分的 / 間違い)
- [ ] `cd app && npm run test:guards && npm run docs:check && npm run lint && npm run build` PASS

## Phase R2: drawer + protocols + operations relocate

- [ ] DA-α-002 entry landing
- [ ] `aag/interface/drawer/` 新設 + `decision-articulation-patterns.md` 移動
- [ ] `aag/interface/operations/` 新設 + 4 doc 移動 (= projectization-policy / project-checklist-governance / new-project-bootstrap-guide / deferred-decision-pattern)
- [ ] `aag/interface/protocols/` skeleton (= 空 README + .gitkeep、R5 で fill)
- [ ] 該当 inbound 全 update (= 5 doc 計、各 doc の inbound 数次第で数十-数百件)
- [ ] doc-registry.json + manifest.json 更新
- [ ] **観測** R2-1: 5 doc が aag/interface/ 配下に物理移動
- [ ] **観測** R2-2: inbound 全 update + broken 0
- [ ] **観測** R2-3: doc-registry / manifest 整合
- [ ] **観測** R2-4: 944 test 維持
- [ ] **観測** R2-5 (反証): synthetic 旧 path reference 試験で test fail
- [ ] DA-α-002 振り返り判定

## Phase R3: references/ directory rename

- [ ] DA-α-003 entry landing
- [ ] `references/01-principles/` → `references/01-foundation/` rename
- [ ] `references/02-status/` → `references/04-tracking/` rename
- [ ] `references/04-design-system/` → `references/02-design-system/` rename
- [ ] `references/03-guides/` → `references/03-implementation/` rename (= AAG-related は R2 で migrate 済)
- [ ] `references/05-contents/*` → `references/04-tracking/elements/*` merge
- [ ] 1,000+ inbound link 全 update
- [ ] guard / collector path constants update (= 138 file 該当箇所)
- [ ] doc-registry / manifest update
- [ ] **観測** R3-1: 5 directory rename 完了
- [ ] **観測** R3-2: 1,000+ inbound link broken 0
- [ ] **観測** R3-3: 138 guard / collector path update + 944 test PASS
- [ ] **観測** R3-4: doc-registry / manifest 整合
- [ ] **観測** R3-5 (反証): 旧 path reference 試験で test fail
- [ ] DA-α-003 振り返り判定

## Phase R4: per-element directory + dashboard layer

- [ ] DA-α-004 entry landing
- [ ] `04-tracking/dashboards/` 新設 + 4 機械生成 dashboard skeleton (= quality-dashboard / migration-progress / element-coverage / boundary-health)
- [ ] dashboard 機械生成 mechanism 実装 (= collector / generator)
- [ ] **pilot subset** = `04-tracking/elements/charts/<id>/` per-element directory 化 (= 5 chart element)
- [ ] 各 chart に 4 doc (README.md + implementation-ledger.md + quality-status.md + open-issues.md)
- [ ] 既存 single-file spec を per-element README.md に migrate
- [ ] quality-status / open-issues の機械生成 mechanism 動作確認
- [ ] **観測** R4-1: pilot subset (= charts/ 5 element) per-element directory 完成
- [ ] **観測** R4-2: dashboard layer 4 doc skeleton landed
- [ ] **観測** R4-3: 機械生成 mechanism 動作 (= quality-status / open-issues 自動 fill)
- [ ] **観測** R4-4: 944 test 維持
- [ ] **観測** R4-5 (反証): pilot subset で AI が context 構築 simulation で reach efficiency verify (= drawer Pattern 6)
- [ ] DA-α-004 振り返り判定

## Phase R5: operational-protocol-system M1-M5 deliverable landing

- [ ] DA-α-005 entry landing
- [ ] operational-protocol-system project resume (= HANDOFF.md §3.6 pause articulation 解除)
- [ ] M1 deliverable (= task-protocol-system.md / task-class-catalog.md / session-protocol.md / complexity-policy.md) を `aag/interface/protocols/` に landing
- [ ] M2-M5 deliverable も同 location に articulate (= operational-protocol-system project 内で進行)
- [ ] operational-protocol-system project archive 判断は user 承認後
- [ ] **観測** R5-1: operational-protocol-system pause 解除
- [ ] **観測** R5-2: M1-M5 deliverable が aag/interface/protocols/ に landing
- [ ] **観測** R5-3: structural foundation 上に articulation 整合
- [ ] **観測** R5-4: 944 test 維持
- [ ] **観測** R5-5 (反証): operational-protocol-system pause 解除前に M1 着手した場合 verify fail (= 順序整合 articulate)
- [ ] DA-α-005 振り返り判定

## Phase R6: AAG self-hosting closure articulate update

- [ ] DA-α-006 entry landing
- [ ] `aag/_internal/meta.md` §2.1 で AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update
- [ ] self-hosting closure 達成根拠 articulate (= R1-R5 の structural separation + reader-domain boundary structural articulation)
- [ ] `app/src/test/guards/selfHostingGuard.test.ts` に entry navigation rigor 検証項目追加
- [ ] selfHostingGuard.test.ts 拡張後 PASS
- [ ] **観測** R6-1: meta.md §2.1 articulate update 完了
- [ ] **観測** R6-2: selfHostingGuard.test.ts 拡張 + PASS
- [ ] **観測** R6-3: self-hosting closure 達成根拠 articulated
- [ ] **観測** R6-4: AAG framework 内部正直化 articulate (= drawer Pattern 4 application)
- [ ] **観測** R6-5 (反証): synthetic boundary violation 試験で selfHostingGuard fail
- [ ] DA-α-006 振り返り判定

## Phase R7: verify + archive

- [ ] DA-α-007 entry landing
- [ ] 全 verify command PASS (= 944 test + docs:check + lint + build)
- [ ] AAG self-hosting at entry level の self-test PASS
- [ ] broken link 0 件 maximum verify (= 全 inbound link sweep)
- [ ] 138 guard / collector path 整合 verify
- [ ] 機能 loss 0 件 verify (= 主アプリ動作確認、E2E + storybook build)
- [ ] `references/02-status/recent-changes.md` (= R3 後は `04-tracking/recent-changes.md`) にサマリ landing
- [ ] **観測** R7-1: 全 verify PASS
- [ ] **観測** R7-2: self-test PASS
- [ ] **観測** R7-3: broken link / 機能 loss 0 件
- [ ] **観測** R7-4: AAG-REQ-SELF-HOSTING completion verified
- [ ] **観測** R7-5 (反証): synthetic 機能 loss 試験で verify fail
- [ ] DA-α-007 振り返り判定

## 完了 criterion verify (= `plan.md` §2)

- [ ] R1-R7 全 deliverable landed
- [ ] 1,000+ inbound link 全 update + broken link 0 件
- [ ] 138 guard / collector path constants update + 944 test 全 PASS 維持
- [ ] AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update (R6)
- [ ] AAG framework / Standard / drawer / 5 文書 template / 主アプリ code に **内容変更 0 件**
- [ ] operational-protocol-system R5 で再開、M1 deliverable が aag/interface/protocols/ に landing

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
