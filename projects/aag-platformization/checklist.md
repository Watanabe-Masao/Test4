# checklist — aag-platformization

> 各 item は **observable verification** が完了条件 (supreme principle)。
> 各 Phase 完了時に DA entry に articulation + commit lineage + 振り返り observation を landing。

## Phase 0: Bootstrap

- [x] `_template/` から `projects/aag-platformization/` 作成 + 必須セット 6 ファイル
- [x] `decision-audit.md` scaffold + DA-α-000 (進行モデル) landing
- [x] `references/01-principles/platformization-standard.md` 新設 (本 project = Pilot Application)
- [x] plan を 3 Phase + 1 Gate に clean rewrite
- [x] `references/02-status/open-issues.md` に `aag-platformization` 行追加 — 本 commit で landing
- [ ] **`CURRENT_PROJECT.md` を `aag-platformization` に切替** — **意図的に保留**: 現在 active = `pure-calculation-reorg` (= 別 program 進行中)、CURRENT_PROJECT.md は vite alias `@project-overlay/execution-overlay` の resolution に直結する runtime artifact。本 Pilot は AAG 自身の制度基盤化が scope であり、active project 切替は含まない (= 不可侵原則 1「振る舞いを変えない」整合)。Phase 3 archive 時に切替判断を user に escalate
- [x] `cd app && npm run test:guards && npm run docs:generate && npm run docs:check && npm run lint && npm run build` 全 PASS — verify:project は CURRENT_PROJECT.md 切替保留により skip。残り 5 command は本 commit で実測 PASS (944 test / 60 KPI / lint 0 error / build 28s)

## Phase 1: Pilot Fill (8 軸 × 実バグ修復)

### A1 Authority

- [x] **DA-α-001 entry は意図的に別 entry 化せず** — A1 verify は `references/01-principles/aag/source-of-truth.md` §1 (4 layer 正本 articulate) + `plan.md` §6 (触らない / 修正 / 新設 / 拡張 表) + DA-α-002a 5 軸 articulation で完了済 (= `strategy.md` §1.1「正本を増やさない」整合、新 doc / entry 増設は最後手段)。DA-α-006 §振り返り Pilot 完了 criterion #4 で本判断を articulate
- [x] 4 layer 正本 articulate を verify — source-of-truth.md §1 で Core 型 / App Domain / Project Overlay / Derived / Facade が articulate、Standard §A1 から back-link 済
- [x] **観測**: 4 layer 正本 articulate 曖昧 0 件 — verify 済 (= source-of-truth.md §1 で全 4 layer articulate)

### A2a Derivation (policy 単一点化 + 実バグ修復)

- [x] DA-α-002a entry landing (5 軸 + 観測点 + Lineage `226b455`、judgement + rollback-target tag landed)
- [x] `references/01-principles/aag/source-of-truth.md` に §4 "Merge Policy" section 追加 (解決順序 / reviewPolicy 契約 / `resolvedBy` 必須 articulate、commit `226b455`)
- [x] `app/src/test/aag-core-types.ts` に `RuleExecutionOverlayEntry` 集約定義 (三重定義 → 単一 canonical)
- [x] `_template / pure-calculation-reorg / aag-platformization` の overlay type import を集約版に切替 + 冒頭 comment back-link
- [x] `app/src/test/architectureRules/merged.ts` に `resolvedBy` field 追加 + bootstrap 修復 (DEFAULT_REVIEW_POLICY_STUB) + 冒頭 comment back-link
- [x] `app/src/test/architectureRules/defaults.ts` の冒頭 comment を canonical section に back-link
- [x] `references/03-guides/new-project-bootstrap-guide.md` Step 4 を canonical section に back-link 整合
- [x] **観測 A2a**: 空 `EXECUTION_OVERLAY = {}` で `merged.ts` throw しない / `pure-calculation-reorg` 既存 merge 結果 byte-identical / 全 comment が "Merge Policy" 単一 canonical を参照 — 全 PASS
- [x] DA-α-002a 振り返り判定 — DA-α-006 §振り返り で集約観測 (Phase 2 simulation で merge byte-identity 確認)
- [x] `cd app && npm run test:guards && npm run lint && npm run build` PASS — 944 test / 0 error / build OK (本 commit 時実測)

### A2b Derivation (merged artifact + sync guard)

- [x] DA-α-002b entry landing (5 軸 + 観測点 + Lineage `74100a7`、judgement + rollback-target tag landed)
- [x] **artifact format 選定**: JSON 採用 (理由: TS から re-import 可 + ajv schema validation 互換、A3 と format 一致は強制せず独立判断)
- [x] `app/src/test/architectureRules/merge-artifact-generator.ts` 新設 (vitest runner via `AAG_GENERATE_ARTIFACT=1`)
- [x] `docs/generated/aag/merged-architecture-rules.json` 生成可 (676KB / 172 rule + resolvedBy + summary)
- [x] `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` 新設 (6 test)
- [x] `npm run generate:merged-artifact` + `npm run docs:generate` から呼び出し
- [x] **観測 A2b**: artifact runtime merge と byte-identical / 試験 drift で sync guard hard fail / `resolvedBy` 全 172 rule articulate — 全 PASS
- [x] DA-α-002b 振り返り判定 — DA-α-006 §振り返り で集約観測
- [x] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

### A3 Contract

- [x] DA-α-003 entry landing (5 軸 + 観測点 + Lineage `eee1de8`、judgement + rollback-target tag landed)
- [x] **contract format 選定**: JSON Schema draft-07 採用 (理由: ajv v6.14.0 互換 + 言語非依存 + 既存 tooling 親和、A2b/A5 と独立判断)
- [x] `docs/contracts/aag/aag-response.schema.json` 新設 (9 required field)
- [x] `docs/contracts/aag/detector-result.schema.json` 新設 (forward-looking schema)
- [x] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型は schema と 1:1 整合 (本体 logic 維持、型は schema-backed)
- [x] helpers.ts は schema-backed (既存 `aagResponseFeedbackUnificationGuard` 維持確認)
- [x] `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` 新設 (7 test)
- [x] **観測**: schema validation 通過 / 既存 text renderer byte-identical / `aagResponseFeedbackUnificationGuard` 維持 — 全 PASS
- [x] DA-α-003 振り返り判定 — DA-α-006 §振り返り で集約観測
- [x] `cd app && npm run test:guards` PASS

### A4 Binding

- [x] DA-α-004 entry landing (5 軸 + 観測点 + Lineage `db26556`、judgement + rollback-target tag landed)
- [x] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` 新設 (6 test、許可 5 field / 禁止意味系 8 / 禁止 prefix 3)
- [x] policy back-link を `architectureRules/types.ts` の `RuleBinding` interface コメントに記載 (新 doc 作らず)
- [x] **観測**: 違反コード試験で hard fail (synthetic violation test) / 既存 RuleBinding 5 field は PASS — 全 確認
- [x] `cd app && npm run test:guards` PASS

### A5 Generated

- [x] DA-α-005 entry landing (5 軸 + 観測点 + Lineage `e806bfa`、judgement + rollback-target tag landed)
- [x] **drawer format 選定**: JSON 採用 (A2b との相互整合 + AI 直読互換 + jq 処理性、A3 と独立判断)
- [x] `app/src/test/architectureRules/drawer-generator.ts` 新設 (3 builder + _seam routing metadata)
- [x] `docs/generated/aag/rules-by-path.json` 生成 (10KB / byImport 24 + bySignal 61 + unmapped 120)
- [x] `docs/generated/aag/rule-index.json` 生成 (84KB / 172 rule + _seam)
- [x] **drawer 4 種目 = `rule-detail/<id>.json` は意図的に skip** — A2b の `merged-architecture-rules.json` (676KB / 172 rule full data) で代替済 (per-rule file 化は ROI 低、post-Pilot で simulation 観測結果に基づき判断、DA-α-005 §判断時に articulate)
- [x] `docs/generated/aag/rule-by-topic.json` 生成 (16KB / bySlice 5 + byResponsibilityTag 18 + byGuardTag 55)
- [x] `app/src/test/guards/aagDrawerSyncGuard.test.ts` 新設 (10 test)
- [x] **観測**: AI が `@project-overlay/execution-overlay` 編集 task で関連 rule subset に drawer 1 read で reach (CT1) / 不要 rule surface 0 件 (CT2) / 試験 drift で hard fail (CT4) — 全 PASS、ただし mapped 率 30.2% は post-Pilot 改善 candidate (DA-α-006 で articulate)
- [x] DA-α-005 振り返り判定 — `部分的` (mapped 率 30.2% で F1 partial coverage articulate、Pilot scope は完了)
- [x] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

### A6 Facade / A7 Policy / A8 Gate

- [x] A6: `architectureRules.ts` の consumer import が変わらない (= base-rules / merged-rules re-export 経路維持、no-op verify by 944 test PASS)
- [x] A7: 全 deliverable に 5 軸 articulation 存在 — DA-α-002a / 002b / 003 / 004 / 005 / 006 全 entry で articulated
- [x] A8: 全 sync guard active (4 guard / 29 test) + 既存 9 integrity guard 維持 + Phase 完了 gate PASS (= 944 test / lint 0 error / build OK / docs:check PASS)

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

- [x] DA-α-007 entry landing (archive + 横展開可否判定条件 + 後続 charter 必要性判断 + 5 軸)
- [x] System Inventory (Standard §3.1) に AAG entry を "Pilot complete" status で landing
- [x] **横展開可否判定条件** (`plan.md` §3 Phase 3) を articulate:
  - [x] 展開可条件 5 件 (Pilot 完了 criterion 全 met / Inventory landed / Standard §9 boundary 違反 0 / 候補 subsystem の 8 軸 application 可能性 verify / Pilot learning 引き継ぎ可能) を明文化 — DA-α-007 §3.1
  - [x] 展開禁止条件 5 件 (既存 guard / AAG-REQ baseline 緩和 / Pilot 負債未解消 / 8 軸未 articulate 軸あり / candidate owner unclear / retrofit 強制) を明文化 — DA-α-007 §3.2
- [x] 横展開そのものは **本 program scope 外維持** (= 不可侵原則 7、判定条件のみ articulate) — DA-α-007 §3 冒頭で articulate
- [x] 後続 program charter は **判断時点で必要性なし** と articulate (DA-α-007 §4、trigger 発生時に PROD-X 起動 + 本 entry §3 参照、charter 先行作成 anti-pattern)
- [x] `references/02-status/recent-changes.md` にサマリ追加
- [x] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## 最終 archive レビュー (人間承認、唯一の人間 mandatory 点)

> `plan.md` 不可侵原則 6。judgement の正しさを担保しない、責任の引受。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-000〜007) を read
- [ ] F1〜F5 + Pilot 完了 criterion 5 件 (`plan.md` §2) の observation 結果を確認
- [ ] archive プロセスへの移行を承認
