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

### A2a Derivation (policy 単一点化 + 実バグ修復)

- [ ] DA-α-002a entry landing (canonical 配置判断 + 実バグ修復方針 + 5 軸 + 振り返り観測点 + commit lineage + tag)
- [ ] `references/01-principles/aag/source-of-truth.md` に "Merge Policy" section 追加 (= **merge policy canonical 単一点**、解決順序 / reviewPolicy 契約 / `resolvedBy` 必須 articulate)
- [ ] `app/src/test/aag-core-types.ts` に `RuleExecutionOverlayEntry` 集約定義
- [ ] `_template / pure-calculation-reorg / aag-platformization` の overlay type import を集約版に切替 + 冒頭 comment は source-of-truth.md "Merge Policy" section に back-link
- [ ] `app/src/test/architectureRules/merged.ts` に `resolvedBy` field 追加 + bootstrap 修復 + 冒頭 comment は canonical section に back-link
- [ ] `app/src/test/architectureRules/defaults.ts` の冒頭 comment を canonical section に back-link
- [ ] `references/03-guides/new-project-bootstrap-guide.md` Step 4 を canonical section に back-link 整合
- [ ] **観測 A2a**: 空 `EXECUTION_OVERLAY = {}` で `merged.ts` throw しない / `pure-calculation-reorg` 既存 merge 結果 byte-identical (golden test) / merged.ts / defaults.ts / 各 overlay comment が source-of-truth.md "Merge Policy" を **単一 canonical** として参照
- [ ] DA-α-002a 振り返り判定 (正しい / 部分的 / 間違い)
- [ ] `cd app && npm run test:guards && npm run lint && npm run build` PASS

### A2b Derivation (merged artifact + sync guard)

- [ ] DA-α-002b entry landing (artifact format 選定 + sync guard 設計 + 5 軸 + 振り返り観測点 + commit lineage + tag)
- [ ] **artifact format 選定** (generated 系、A3 contract format とは独立判断): JSON / TS-friendly 候補から AI 採用判断
- [ ] `tools/architecture-health/src/aag/merge-artifact-generator.ts` 新設
- [ ] `docs/generated/aag/merged-architecture-rules.<format>` 生成可
- [ ] `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` 新設
- [ ] `npm run docs:generate` から呼び出し
- [ ] **観測 A2b**: artifact runtime merge と byte-identical / 試験 drift (canonical 編集 + artifact 未生成) で sync guard hard fail / `resolvedBy` field が artifact 内に正しく articulate
- [ ] DA-α-002b 振り返り判定
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

### A3 Contract

- [ ] DA-α-003 entry landing (**contract format 先行確定**、generated 系 A2b/A5 とは独立判断 + 5 軸 + 観測点 + commit lineage + tag)
- [ ] **contract format 選定** (schema 系、言語非依存性が要件): JSON Schema / CUE / Protobuf 等から AI 採用判断
- [ ] `docs/contracts/aag/aag-response.<format>` 新設
- [ ] `docs/contracts/aag/detector-result.<format>` 新設
- [ ] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema 駆動化
- [ ] helpers.ts は schema-backed re-export (既存 `aagResponseFeedbackUnificationGuard` 維持)
- [ ] `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` 新設
- [ ] **観測**: schema validation 通過 / 既存 text renderer byte-identical (golden) / `aagResponseFeedbackUnificationGuard` 維持
- [ ] DA-α-003 振り返り判定
- [ ] `cd app && npm run test:guards` PASS

### A4 Binding

- [ ] DA-α-004 entry landing (5 軸 + 観測点 + commit lineage + tag)
- [ ] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` 新設 (許可 5 field / 禁止意味系 7+ field)
- [ ] policy back-link を `architectureRules/types.ts` の RuleBinding interface コメントに記載 (新 doc 作らず)
- [ ] **観測**: 違反コード試験で hard fail / 既存 RuleBinding (5 field) は通る
- [ ] `cd app && npm run test:guards` PASS

### A5 Generated

- [ ] DA-α-005 entry landing (**drawer format = generated 系、A2b と相互整合、A3 contract format とは独立判断** + drawer 4 種 granularity + 配置判断 + 5 軸 + 観測点 + commit lineage + tag)
- [ ] **drawer format 選定** (index / lookup 用途、軽量性が要件): JSON / YAML / TOML 等から AI 採用判断 (A2b と相互整合確認)
- [ ] `tools/architecture-health/src/aag/drawer-generator.ts` 新設
- [ ] `docs/generated/aag/rules-by-path.<format>` 生成
- [ ] `docs/generated/aag/rule-index.<format>` 生成
- [ ] `docs/generated/aag/rule-detail/<id>.<format>` 生成
- [ ] `docs/generated/aag/rule-by-topic.<format>` 生成
- [ ] `app/src/test/guards/aagDrawerSyncGuard.test.ts` 新設
- [ ] **観測**: AI が `merged.ts` 編集 task で関連 rule subset に 1 read で reach Y/N / 不要 rule surface 0 件 Y/N / 試験 drift で hard fail Y/N
- [ ] DA-α-005 振り返り判定
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

### A6 Facade / A7 Policy / A8 Gate

- [ ] A6: `architectureRules.ts` の consumer import が変わらない (no-op verify)
- [ ] A7: 全 deliverable に 5 軸 articulation 存在 (DA entry 内 verify)
- [ ] A8: 全 sync guard active + 既存 9 integrity guard 維持 + Phase 完了 gate PASS

## Phase 2: Verification (AI simulation)

- [x] DA-α-006 entry landing (simulation suite scope + observation protocol)
- [x] CT1 path-triggered rule access (A5 effect、F1) — drawer 1 read で reach 確認
- [x] CT2 irrelevant context surface しない (negative、F1) — chart-tsx 0 件 / presentation 3 件 (想定通り)
- [x] CT3 rule detail rapid lookup (A5 effect、F2) — 2 read で migrationRecipe + fixNow + resolvedBy reach
- [x] CT4 drift detection (A2 / A3 / A5 sync guard、F3) — 4 guard 29 test PASS
- [x] CT5 session 間判断継承 (decision-audit re-derive 不要、F4) — 6 DA entry + 12 tag landed
- [x] 各 CT 結果を DA-α-006 observation table に landing
- [x] F1〜F5 の機能 status を articulate (F1=PASS partial / F2-F5=PASS)
- [x] DA-α-006 振り返り判定 (= 正しい with partial F1 coverage)

## Phase 3: Archive + 横展開可否判定条件 articulation

- [ ] DA-α-007 entry landing (archive + 横展開可否判定条件 + 後続 charter 必要性判断 + 5 軸)
- [ ] System Inventory (Standard §3) に AAG entry を "Pilot complete" status で landing
- [ ] **横展開可否判定条件** (`plan.md` §3 Phase 3) を articulate:
  - [ ] 展開可条件 5 件 (Pilot 完了 criterion 全 met / Inventory landed / Standard §9 boundary 違反 0 / 候補 subsystem の 8 軸 application 可能性 verify / Pilot learning 引き継ぎ可能) を明文化
  - [ ] 展開禁止条件 (既存 guard / AAG-REQ baseline 緩和 / Pilot 負債未解消 / 8 軸未 articulate 軸あり / candidate owner unclear) を明文化
- [ ] 横展開そのものは **本 program scope 外維持** (= 不可侵原則 7、判定条件のみ articulate)
- [ ] 後続 program (もし必要なら) charter を 1 doc articulate (新規 or 既存拡張、判断 = DA-α-007 内)
- [ ] `references/02-status/recent-changes.md` にサマリ追加
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## 最終 archive レビュー (人間承認、唯一の人間 mandatory 点)

> `plan.md` 不可侵原則 6。judgement の正しさを担保しない、責任の引受。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-000〜007) を read
- [ ] F1〜F5 + Pilot 完了 criterion 5 件 (`plan.md` §2) の observation 結果を確認
- [ ] archive プロセスへの移行を承認
