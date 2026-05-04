# checklist — aag-self-hosting-completion

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 恒久ルールは plan.md §4 に書く。
> 各 item は **observable verification** が完了条件 (= drawer Pattern 4 適用)。
> 各 R-phase で landing する guard は **Hard fail / ratchet-down baseline=0 / pre-commit hook integration** (= drawer Pattern 1 + §6 定着 mechanism)。

## Phase 0: Bootstrap

- [x] `_template/` から `projects/completed/aag-self-hosting-completion/` 作成 + 必須セット 6 ファイル
- [x] config/project.json を AAG-COA Level 3 + architecture-refactor で articulate
- [x] `references/04-tracking/open-issues.md` に `aag-self-hosting-completion` 行追加
- [x] operational-protocol-system HANDOFF.md に ⏸ PAUSED articulation 追加 (= R5 完了で resume)
- [x] DA-α-000 (進行モデル) landing
- [x] breaking-changes.md landing (= breakingChange=true 必須、PZ-7 整合)
- [x] articulation update (= 軌道修正 reflect、本 commit、構造矛盾 fix + 14 guard 体系 + 命名規約 + 定着 mechanism)
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS (本 commit で実施)

## Phase R0: 境界定義先行 (= structural change 前の articulation update)

- [ ] DA-α-001 entry landing (= R0 着手判断、5 軸 + 観測点 + Lineage)
- [ ] `references/README.md` update (= 主アプリ改修 userの knowledge interface、3 tree 境界)
- [ ] `aag/README.md` 新設 (= AAG framework 本体、`_internal/` + `_framework/` skeleton)
- [ ] projects/ root の README.md update (= 作業単位 lens、active + completed 境界)
- [ ] `CURRENT_PROJECT.md` update (= active project pointer 限定)
- [ ] `CLAUDE.md` update (= 3 tree 境界 + reader-別 routing 1 section)
- [ ] **観測** R0-1: 5 README + CLAUDE.md で 3 tree 境界 articulated
- [ ] **観測** R0-2: 「主アプリ改修 user read OK / not read」が file 名 / directory 名から判断可能 articulated
- [ ] **観測** R0-3: `*.generated.md` 命名規約 articulate (= R3 以降適用予告)
- [ ] **観測** R0-4: 944 test 維持
- [ ] **観測** R0-5 (反証): 後続 R-phase の物理移動 instruction が R0 articulate と齟齬する場合 verify fail
- [ ] DA-α-001 振り返り判定

## Phase R1: AAG sub-tree relocation

- [ ] DA-α-002 entry landing
- [ ] `aag/_internal/` 新設 + `aag/_internal/` 9 doc 物理移動
- [ ] `aag/_framework/` skeleton 新設 (= rules / collectors / generators / schemas / fixtures + README)
- [ ] 101 inbound link 新 path に全 update
- [ ] guard / collector path constants 該当箇所 update (= aag-related guard 群)
- [ ] doc-registry.json + manifest.json reorganize entry
- [ ] **新 guard 1 件 landing**: `aagBoundaryGuard.test.ts` (= aag/_internal/ 外への AAG framework 内部 doc 配置検出、Hard fail、baseline=0)
- [ ] **観測** R1-1: 9 doc が aag/_internal/ に物理移動完了
- [ ] **観測** R1-2: 101 inbound link 新 path 整合 (= broken link 0 件)
- [ ] **観測** R1-3: guard / collector path 反映後 944 test + 新 guard PASS
- [ ] **観測** R1-4: doc-registry.json + manifest.json で新 path 整合
- [ ] **観測** R1-5 (反証): synthetic broken link / 配置違反試験で test fail (= ratchet-down 可能)
- [ ] DA-α-002 振り返り判定

## Phase R2: AAG public interface を references/05-aag-interface/ に relocate

- [ ] DA-α-003 entry landing
- [ ] `references/05-aag-interface/` 新設 + sub-directory (= drawer / protocols / operations / README)
- [ ] `references/05-aag-interface/drawer/` に decision-articulation-patterns.md 移動
- [ ] `references/05-aag-interface/operations/` に AAG 運用 guide 4 doc 移動 (= projectization-policy / project-checklist-governance / new-project-bootstrap-guide / deferred-decision-pattern)
- [ ] `references/05-aag-interface/protocols/` skeleton (= 空 README + .gitkeep、R5 で fill)
- [ ] aag/ 側に **stub なし** verify (= 境界矛盾防止)
- [ ] 該当 inbound 全 update + broken 0
- [ ] doc-registry.json + manifest.json 更新
- [ ] **新 guard 2 件 landing**:
  - `aagBoundaryGuard.test.ts` (= aag/ 配下に主アプリ改修 user向け doc 配置検出、Hard fail、baseline=0)
  - `aagBoundaryGuard.test.ts` (= references/05-aag-interface/ 外への AAG public interface doc 配置検出、Hard fail、baseline=0)
- [ ] **観測** R2-1: 5 doc が references/05-aag-interface/ 配下に物理移動
- [ ] **観測** R2-2: inbound 全 update + broken 0
- [ ] **観測** R2-3: doc-registry / manifest 整合
- [ ] **観測** R2-4: 944 test + 新 guard 2 件 PASS
- [ ] **観測** R2-5 (反証): aag/ 配下に主アプリ改修 user向け doc 0 件 machine 検証 (= synthetic 違反 test で fail)
- [ ] DA-α-003 振り返り判定

## Phase R3: references/ directory rename + `*.generated.md` 命名規約適用 (= sub-phase 化、self-evaluation 反映)

### R3a: 5 directory rename + 1,000+ inbound update

- [ ] DA-α-004a entry landing
- [ ] 5 directory rename (`git mv`):
  - `references/01-foundation/` → `references/01-foundation/`
  - `references/04-tracking/` → `references/04-tracking/`
  - `references/02-design-system/` → `references/02-design-system/`
  - `references/03-implementation/` → `references/03-implementation/`
  - `references/04-tracking/elements/` → `references/04-tracking/elements/`
- [ ] 1,000+ inbound link 全 update (= 同一 commit 内で完結)
- [ ] **観測** R3a-1: 5 旧 directory 不在 (= machine-verifiable: `for d in 01-principles 02-status 04-design-system 03-guides 05-contents; do test ! -d references/$d; done`)
- [ ] **観測** R3a-2: broken link 0 (= grep で旧 path 文字列 0 件、archive 例外除く)
- [ ] **観測** R3a-3: 944 test PASS
- [ ] **観測** R3a-4 (反証): synthetic 旧 path link 1 件追加で test fail
- [ ] **観測** R3a-5: docs:check PASS
- [ ] DA-α-004a 振り返り判定

### R3b: `*.generated.md` 命名規約適用 + generator 出力先変更

- [ ] DA-α-004b entry landing
- [ ] `recent-changes.md` → `recent-changes.generated.md`
- [ ] 既存 `04-tracking/generated/*.md` (= 19 file) → `*.generated.md` suffix
- [ ] generator 出力先 path constants update
- [ ] inbound link を `*.generated.md` に update
- [ ] **観測** R3b-1: `find references/04-tracking -name "*.md" -not -name "*.generated.md" -not -name "README.md"` で 手書き対象のみ
- [ ] **観測** R3b-2: `04-tracking/generated/` 配下全件に suffix
- [ ] **観測** R3b-3: generator 再 run で出力 file が `.generated.md` で生成
- [ ] **観測** R3b-4 (反証): synthetic で `*.generated.md` 手編集 → R3d landing 後の `generatedFileEditGuard` で fail
- [ ] **観測** R3b-5: docs:check PASS
- [ ] DA-α-004b 振り返り判定

### R3c: 旧 mention 撤退 (= PR template / CLAUDE.md / .github/* update)

- [ ] DA-α-004c entry landing
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` 内 旧 path 約 9 箇所 update
- [ ] `CLAUDE.md` 内 旧 section path update
- [ ] `.github/workflows/*.yml` 旧 path 依存 update (該当ある場合)
- [ ] **観測** R3c-1: `grep -nE "references/(01-principles|02-status|04-design-system|03-guides|05-contents)/" .github/ CLAUDE.md` = 0 件
- [ ] **観測** R3c-2: PR template 9 箇所 articulate 通り update
- [ ] **観測** R3c-3: `.github/workflows/*.yml` 旧 path 0 件
- [ ] **観測** R3c-4 (反証): 旧 path 再追加で `oldPathReferenceGuard` (R3d) で fail
- [ ] **観測** R3c-5: docs:check + lint PASS
- [ ] DA-α-004c 振り返り判定

### R3d: guard / collector path + doc-registry / manifest + decisions/ 新設 + 新 guard landing

- [ ] DA-α-004d entry landing
- [ ] 138 guard / collector の path constants update
- [ ] `docs/contracts/doc-registry.json` 全 entry path update
- [ ] `.claude/manifest.json` discovery 内 path update
- [ ] `references/01-foundation/decisions/` 新設
- [ ] **新 guard 2 件 landing** (集約後):
  - `generatedFileEditGuard.test.ts` (= `*.generated.md` 手編集検出、Hard fail、baseline=0)
  - `oldPathReferenceGuard.test.ts` (= 旧 path reference 残置検出、Hard fail、baseline=0、archive-to-archive 例外 whitelist)
- [ ] **観測** R3d-1: 138 guard / collector 全 path update + 944 test + 新 guard 2 件 PASS
- [ ] **観測** R3d-2: doc-registry.json 全 entry path 整合 (= node script で 0 broken)
- [ ] **観測** R3d-3: manifest.json discovery 整合
- [ ] **観測** R3d-4: `references/01-foundation/decisions/` 存在
- [ ] **観測** R3d-5 (反証): synthetic 旧 path / 手編集試験で 2 新 guard fail
- [ ] DA-α-004d 振り返り判定

## Phase R4: per-element directory + dashboard layer + element taxonomy

- [ ] DA-α-005 entry landing
- [ ] `references/04-tracking/elements/element-taxonomy.md` 新設 (= ID prefix 正本: WID/CHART/ENG/PAGE/FLOW)
- [ ] `references/04-tracking/elements/element-index.generated.md` 新設 (= 全 element 索引、機械生成)
- [ ] `references/04-tracking/dashboards/` 新設 + 機械生成 dashboard 4 件 (= `quality-dashboard.generated.md` / `migration-progress.generated.md` / `element-coverage.generated.md` / `boundary-health.generated.md`)
- [ ] **pilot subset** = `references/04-tracking/elements/charts/<id>/` per-element directory 化 (= 5 chart element)
- [ ] 各 chart に 4 doc:
  - `README.md` (手書き、overview + 1 行定義 + upstream pointer)
  - `implementation-ledger.md` (手書き、改修履歴 / commit lineage / 変更 rationale)
  - `quality-status.generated.md` (機械生成、test coverage / health metrics)
  - `open-issues.generated.md` (機械生成、guard / collector からの active issue surface)
- [ ] 既存 single-file spec を per-element directory `README.md` に migrate (= pilot subset 範囲)
- [ ] quality-status / open-issues 機械生成 mechanism 動作確認
- [ ] **新 guard 3 件 landing**:
  - `elementStructureGuard.test.ts` (= element ID prefix 違反検出、Hard fail、baseline=0)
  - `elementStructureGuard.test.ts` (= per-element directory 4 doc 整合、Hard fail、baseline=0)
  - `elementStructureGuard.test.ts` (= dashboards/ 配下の手書き file 配置検出、Hard fail、baseline=0)
- [ ] **観測** R4-1: pilot subset (= charts/ 5 element) per-element directory 完成
- [ ] **観測** R4-2: dashboard layer 4 doc skeleton (= 全 `.generated.md` suffix) landed
- [ ] **観測** R4-3: 機械生成 mechanism 動作 (= quality-status / open-issues 自動 fill)
- [ ] **観測** R4-4: `element-taxonomy.md` で ID prefix 5 種類 articulated
- [ ] **観測** R4-5: 944 test + 新 guard 3 件 PASS
- [ ] **観測** R4-6 (反証): pilot subset で AI が context 構築 simulation で reach efficiency verify (= 1 element directory 1 read で 4 doc 全 reach)
- [ ] DA-α-005 振り返り判定

## Phase R5: operational-protocol-system M1-M5 deliverable landing

- [ ] DA-α-006 entry landing
- [ ] operational-protocol-system project resume (= HANDOFF.md ⏸ PAUSED articulation 解除)
- [ ] M1 deliverable (= task-protocol-system / task-class-catalog / session-protocol / complexity-policy) を `references/05-aag-interface/protocols/` に landing
- [ ] M2-M5 deliverable も同 location に articulate (= operational-protocol-system project 内で進行)
- [ ] operational-protocol-system project archive 判断は user 承認後
- [ ] **新 guard 1 件 landing**: `aagBoundaryGuard.test.ts` (= references/05-aag-interface/protocols/ 外への M1-M5 deliverable 配置検出、Hard fail、baseline=0)
- [ ] **観測** R5-1: operational-protocol-system pause 解除
- [ ] **観測** R5-2: M1-M5 deliverable が **references/05-aag-interface/protocols/** に landing (= 旧案 aag/interface/protocols/ ではない)
- [ ] **観測** R5-3: structural foundation 上に articulation 整合
- [ ] **観測** R5-4: 944 test + 新 guard PASS
- [ ] **観測** R5-5 (反証): protocols 配置先が誤って aag/ 配下になった場合 boundary guard で fail (= R2 guard で逆戻り防止)
- [ ] DA-α-006 振り返り判定

## Phase R6: AAG self-hosting closure articulate update + projects/ split + template migrate

- [ ] DA-α-007 entry landing
- [ ] `aag/_internal/meta.md` §2.1 で AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update
- [ ] self-hosting closure 達成根拠 articulate (= R1-R5 の structural separation + 各 R-phase guard 一覧)
- [ ] `selfHostingGuard.test.ts` 拡張 (= entry navigation rigor 検証 4 boundary):
  - aag/ 配下に主アプリ改修 user向け doc 0 件
  - references/ 配下に AAG framework 内部 doc 0 件
  - `*.generated.md` 手編集 0 件
  - element ID prefix 違反 0 件
- [ ] `projects/` split: 全 active project を `projects` 配下 `active/<id>` directory へ移動 + inbound update
- [ ] `projects/_template/` 新構造前提に migrate (= 新規 bootstrap 強制)
- [ ] `CURRENT_PROJECT.md` pointer-only fix (= R0 で articulate 済の機械検証 guard 化)
- [ ] **新 guard 3 件 landing**:
  - `projectsStructureGuard.test.ts` (= projects/ root 直下の project 配置検出、Hard fail、baseline=0)
  - `projectsStructureGuard.test.ts` (= CURRENT_PROJECT.md inline state 検出、Hard fail、baseline=0)
  - `projectsStructureGuard.test.ts` (= `projects` 配下 `active/<id>`/ 内正本定義配置検出、Hard fail、baseline=0)
- [ ] **観測** R6-1: meta.md §2.1 articulate update + self-hosting closure 達成根拠 articulated
- [ ] **観測** R6-2: selfHostingGuard 拡張 (= 4 boundary 検証) + PASS
- [ ] **観測** R6-3: projects/ split 完了 + 全 active project 物理移動 + inbound update
- [ ] **観測** R6-4: _template/ 新構造 migrate (= 新規 bootstrap で旧構造 file 生成不能)
- [ ] **観測** R6-5: CURRENT_PROJECT.md pointer-only guard 動作 (= inline 試験で fail)
- [ ] **観測** R6-6: 944 test + 新 guard 3 件 PASS
- [ ] **観測** R6-7 (反証): AAG framework 内部正直化 articulate (= drawer Pattern 4 application、self-hosting failure 復帰試験で fail)
- [ ] DA-α-007 振り返り判定

## Phase R7: 統合 guard 完成 + verify + archive

- [ ] DA-α-008 entry landing
- [ ] **統合 guard landing**: `boundaryIntegrityGuard.test.ts` (= R1-R6 で landing した 13 guard を 1 集約 entry point に統合)
- [ ] `tools/git-hooks/pre-commit` に boundaryIntegrityGuard 統合 (= 早期検出)
- [ ] 全 verify command PASS (= 944 test + 14 新 guard + docs:check + lint + build)
- [ ] AAG self-hosting at entry level の self-test PASS
- [ ] broken link 0 件 maximum verify (= 全 inbound link sweep)
- [ ] 138 guard / collector path 整合 verify
- [ ] 機能 loss 0 件 verify (= 主アプリ動作確認、E2E + storybook build)
- [ ] `references/04-tracking/recent-changes.generated.md` にサマリ landing
- [ ] **観測** R7-1: 全 verify PASS (= 944 test + 14 新 guard + docs:check + lint + build)
- [ ] **観測** R7-2: self-test PASS (= boundaryIntegrityGuard で R1-R6 全 boundary verify)
- [ ] **観測** R7-3: broken link / 機能 loss 0 件
- [ ] **観測** R7-4: pre-commit hook で boundary 違反早期検出可能 articulated
- [ ] **観測** R7-5: archive 完遂
- [ ] DA-α-008 振り返り判定

## 完了 criterion verify (= `plan.md` §2)

- [ ] R0-R7 全 deliverable landed
- [ ] 3 tree (= references / aag / projects) の境界 articulated + 5 README + CURRENT_PROJECT.md + CLAUDE.md 機械可読
- [ ] 1,000+ inbound link 全 update + broken link 0 件
- [ ] 138 guard / collector path constants update + 944 test 全 PASS 維持
- [ ] **14 新 guard 全 active** (= R1-R7 で landing する Hard guard、boundary 違反 ratchet-down baseline=0)
- [ ] AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update (R6)
- [ ] AAG framework / Standard / drawer / 5 文書 template / 主アプリ code に **内容変更 0 件** (= R6 例外を除く)
- [ ] operational-protocol-system R5 で再開、M1 deliverable が `references/05-aag-interface/protocols/` に landing
- [ ] `*.generated.md` 命名規約適用 (= references/04-tracking/ 配下全件 suffix)
- [ ] `projects/` split 完了 + `_template/` 新構造 migrate
- [ ] `CURRENT_PROJECT.md` pointer-only 固定 + 機械検証 guard 動作
- [ ] pre-commit hook で boundary 違反早期検出 (= R7)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact / 14 新 guard) をuser がレビューし、archive プロセスへの移行を承認する
