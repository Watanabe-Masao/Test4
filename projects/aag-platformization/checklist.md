# checklist — aag-platformization

> 各 item は **observable verification** が完了条件 (supreme principle)。
> 各 Phase 完了時に DA entry に articulation + commit lineage + 振り返り observation を landing。

## Phase 0: Bootstrap

- [x] `_template/` から `projects/aag-platformization/` 作成 + 必須セット 6 ファイル
- [x] `decision-audit.md` scaffold + DA-α-000 (進行モデル) landing
- [x] `references/01-principles/platformization-standard.md` 新設 (本 project = Pilot Application)
- [x] plan を 3 Phase + 1 Gate に clean rewrite
- [ ] `references/02-status/open-issues.md` に `aag-platformization` 行追加
- [ ] `CURRENT_PROJECT.md` を `aag-platformization` に切替
- [ ] `cd app && npm run verify:project && npm run test:guards && npm run docs:generate && npm run docs:check && npm run lint && npm run build` 全 PASS

## Phase 1: Pilot Fill (8 軸 × 実バグ修復)

### A1 Authority

- [ ] DA-α-001 entry landing (5 軸 articulation + 振り返り観測点 + commit lineage + tag)
- [ ] 4 layer 正本 articulate を verify (Core 型 / App Domain / Project Overlay / Derived / Facade) + Standard §A1 への back-link 整理
- [ ] **観測**: 4 layer 正本 articulate 曖昧 0 件 Y/N

### A2 Derivation (= 実バグ修復)

- [ ] DA-α-002 entry landing (採用案 + format 選定根拠 + 5 軸 + 振り返り観測点 + commit lineage + tag)
- [ ] `app/src/test/aag-core-types.ts` に `RuleExecutionOverlayEntry` 集約定義
- [ ] `_template / pure-calculation-reorg / aag-platformization` の overlay type import を集約版に切替 + 冒頭 comment 整合
- [ ] `app/src/test/architectureRules/merged.ts` に `resolvedBy` field 追加 + bootstrap 修復
- [ ] `references/03-guides/new-project-bootstrap-guide.md` Step 4 整合
- [ ] `tools/architecture-health/src/aag/merge-artifact-generator.ts` 新設
- [ ] `docs/generated/aag/merged-architecture-rules.<format>` 生成可
- [ ] `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` 新設
- [ ] **観測**: 空 `EXECUTION_OVERLAY = {}` で `merged.ts` throw しない / `pure-calculation-reorg` 既存 merge 結果 byte-identical (golden test) / artifact runtime と byte-identical / 試験 drift で sync guard hard fail
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` PASS

### A3 Contract

- [ ] DA-α-003 entry landing (5 軸 + 観測点 + commit lineage + tag)
- [ ] `docs/contracts/aag/aag-response.<format>` 新設
- [ ] `docs/contracts/aag/detector-result.<format>` 新設
- [ ] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema 駆動化
- [ ] helpers.ts は schema-backed re-export (既存 `aagResponseFeedbackUnificationGuard` 維持)
- [ ] `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` 新設
- [ ] **観測**: schema validation 通過 / 既存 text renderer byte-identical (golden) / `aagResponseFeedbackUnificationGuard` 維持
- [ ] `cd app && npm run test:guards` PASS

### A4 Binding

- [ ] DA-α-004 entry landing (5 軸 + 観測点 + commit lineage + tag)
- [ ] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` 新設 (許可 5 field / 禁止意味系 7+ field)
- [ ] policy back-link を `architectureRules/types.ts` の RuleBinding interface コメントに記載 (新 doc 作らず)
- [ ] **観測**: 違反コード試験で hard fail / 既存 RuleBinding (5 field) は通る
- [ ] `cd app && npm run test:guards` PASS

### A5 Generated

- [ ] DA-α-005 entry landing (drawer 4 種 granularity + 配置判断 + 5 軸 + 観測点 + commit lineage + tag)
- [ ] `tools/architecture-health/src/aag/drawer-generator.ts` 新設
- [ ] `docs/generated/aag/rules-by-path.<format>` 生成
- [ ] `docs/generated/aag/rule-index.<format>` 生成
- [ ] `docs/generated/aag/rule-detail/<id>.<format>` 生成
- [ ] `docs/generated/aag/rule-by-topic.<format>` 生成
- [ ] `app/src/test/guards/aagDrawerSyncGuard.test.ts` 新設
- [ ] **観測**: AI が `merged.ts` 編集 task で関連 rule subset に 1 read で reach Y/N / 不要 rule surface 0 件 Y/N / 試験 drift で hard fail Y/N
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

### A6 Facade / A7 Policy / A8 Gate

- [ ] A6: `architectureRules.ts` の consumer import が変わらない (no-op verify)
- [ ] A7: 全 deliverable に 5 軸 articulation 存在 (DA entry 内 verify)
- [ ] A8: 全 sync guard active + 既存 9 integrity guard 維持 + Phase 完了 gate PASS

## Phase 2: Verification (AI simulation)

- [ ] DA-α-006 entry landing (simulation suite scope + observation protocol)
- [ ] CT1 path-triggered rule access (A5 effect、F1)
- [ ] CT2 irrelevant context surface しない (negative、F1)
- [ ] CT3 rule detail rapid lookup (A5 effect、F2)
- [ ] CT4 drift detection (A2 / A3 / A5 sync guard、F3)
- [ ] CT5 session 間判断継承 (decision-audit re-derive 不要、F4)
- [ ] 各 CT 結果を DA-α-006 observation table に landing
- [ ] F1〜F5 の機能 status を articulate
- [ ] DA-α-006 振り返り判定

## Phase 3: Archive + 横展開 charter

- [ ] DA-α-007 entry landing (archive + 横展開 charter 必要性判断)
- [ ] System Inventory (Standard §3) に AAG entry を "Pilot complete" status で landing
- [ ] 後続 program (もし必要なら) charter を 1 doc articulate (新規 or 既存拡張)
- [ ] `references/02-status/recent-changes.md` にサマリ追加
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## 最終 archive レビュー (人間承認、唯一の人間 mandatory 点)

> `plan.md` 不可侵原則 6。judgement の正しさを担保しない、責任の引受。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-000〜007) を read
- [ ] F1〜F5 + Pilot 完了 criterion 5 件 (`plan.md` §2) の observation 結果を確認
- [ ] archive プロセスへの移行を承認
