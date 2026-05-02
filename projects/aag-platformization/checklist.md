# checklist — aag-platformization

> 役割: completion 判定の入力 (機械検証可能な checkbox 集合)。
> 各 Phase は **observable verification** が完了条件 (supreme principle)。
> 各 Phase 完了時に DA entry に 5 軸 articulate + 振り返り observation + Commit Lineage を landing。
>
> **Phase segment**:
> - Segment A (Phase 1-5): Pre-Go 条件確立 (= Go 実装条件 C1-C4)
> - Segment B (Phase 6-7): AI Navigation + Audit
> - Segment C (Phase 8-10): Verification + Implementation + Archive

## Phase 0: Bootstrap

- [x] `_template/` をコピーして `projects/aag-platformization/` を作成した
- [x] `config/project.json` を実値で埋めた
- [x] `projectization.md` に AAG-COA 判定 (Level 3) を記録した
- [x] `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md` を埋めた
- [x] `aag/execution-overlay.ts` を空のまま (本 program は本体 merge に参加しない)
- [x] `breaking-changes.md` を派生セットから足した
- [x] `decision-audit.md` scaffold + DA-α-000 (進行モデル) landing 済
- [x] DA entry テンプレに 5 軸 articulation 欄追加
- [x] plan を supreme principle + F1-F7 + Go 実装条件 C1-C4 + 10 Phase に再構築
- [ ] `references/02-status/open-issues.md` に `aag-platformization` 行を追加
- [ ] `CURRENT_PROJECT.md` を `aag-platformization` に切替
- [ ] `cd app && npm run verify:project && npm run test:guards && npm run docs:generate && npm run docs:check && npm run lint && npm run build` 全 PASS

---

## Segment A: Pre-Go 条件確立

### Phase 1: Authority 固定 + 5 軸 framework

- [ ] DA-α-001 entry を landing (5 軸 articulate + 振り返り観測点)
- [ ] DA-α-001 の Commit Lineage + annotated tag 記録 + push
- [ ] 4 layer の正本 articulate (Core meaning / App Profile / Project Overlay / Derived) を確認、本 plan と decision-audit に back-link 記載
- [ ] 既存 5 軸 articulate (source-of-truth / architecture / meta / strategy / layer-map) を verify、gap 0 確認
- [ ] **観測**: 全 deliverable の 5 軸 articulate Y/N + 4 layer 正本 articulate 曖昧 0 件 Y/N
- [ ] DA-α-001 振り返り判定 (正しい / 部分的 / 間違い)

### Phase 2: Merge policy 一本化 (= Go 条件 C1)

- [ ] DA-α-002 entry を landing (採用案 = defaults 補完 + resolvedBy + 三重定義解消、5 軸 articulate)
- [ ] DA-α-002 の Commit Lineage + tag
- [ ] `app/src/test/aag-core-types.ts` に `RuleExecutionOverlayEntry` 集約定義
- [ ] `_template/aag/execution-overlay.ts` の type import を集約版に切替 + 冒頭 comment 整合
- [ ] `pure-calculation-reorg/aag/execution-overlay.ts` の type import を集約版に切替 + stale comment 整合
- [ ] `aag-platformization/aag/execution-overlay.ts` の type import を集約版に切替
- [ ] `app/src/test/architectureRules/merged.ts` に `resolvedBy` field 追加 (project-overlay / defaults / stub)
- [ ] `references/03-guides/new-project-bootstrap-guide.md` Step 4 を採用案に整合
- [ ] **観測 C1**:
  - [ ] 空 `EXECUTION_OVERLAY = {}` で `merged.ts` が throw しない Y/N
  - [ ] `pure-calculation-reorg` 既存 merge 結果が変わらない (golden test) Y/N
  - [ ] `resolvedBy` field が全 rule で正しく articulate される Y/N
- [ ] DA-α-002 振り返り判定 + Q1〜Q5 self-check
- [ ] `cd app && npm run test:guards && npm run lint && npm run build` PASS
- [ ] **C1 達成 mark** (Phase 9 着手 gate)

### Phase 3: Merged artifact 生成 (= Go 条件 C2)

- [ ] DA-α-003 entry を landing (format 選定 + sync guard 設計、5 軸 articulate)
- [ ] DA-α-003 の Commit Lineage + tag
- [ ] format 選定: JSON / CUE / YAML / TOML 等から AI が事実根拠で 1 つ採用
- [ ] `tools/architecture-health/src/aag/merge-artifact-generator.ts` 新設
- [ ] `docs/generated/aag/merged-architecture-rules.<format>` 生成可
- [ ] `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` 新設 (artifact ↔ runtime byte-identity)
- [ ] `npm run docs:generate` から呼び出し
- [ ] **観測 C2**:
  - [ ] artifact 生成可 Y/N
  - [ ] artifact が runtime merge と byte-identical Y/N
  - [ ] 試験 drift で sync guard hard fail Y/N
- [ ] DA-α-003 振り返り判定 + Q1〜Q5 self-check
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS
- [ ] **C2 達成 mark**

### Phase 4: Contract independence (= Go 条件 C3)

- [ ] DA-α-004 entry を landing (AagResponse + detector schema 化方針、5 軸 articulate)
- [ ] DA-α-004 の Commit Lineage + tag
- [ ] `docs/contracts/aag/aag-response.<format>` 新設
- [ ] `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema 駆動に切替
- [ ] helpers.ts は schema-backed re-export のみ (既存 `aagResponseFeedbackUnificationGuard` 維持確認)
- [ ] `docs/contracts/aag/detector-result.<format>` 新設
- [ ] 既存 guard の violation message 構築箇所を schema 準拠に揃える (最小スコープ)
- [ ] `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` 新設
- [ ] **観測 C3**:
  - [ ] schema validation が AagResponse / detector output を通す Y/N
  - [ ] 既存 text renderer 出力が schema 化前と byte-identical (golden) Y/N
  - [ ] `aagResponseFeedbackUnificationGuard` 引き続き機能 Y/N
- [ ] DA-α-004 振り返り判定 + Q1〜Q5 self-check
- [ ] `cd app && npm run test:guards` PASS
- [ ] **C3 達成 mark**

### Phase 5: RuleBinding 境界 guard (= Go 条件 C4)

- [ ] DA-α-005 entry を landing (許可 / 禁止 field articulate、5 軸)
- [ ] DA-α-005 の Commit Lineage + tag
- [ ] `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` 新設
- [ ] guard が許可 5 field のみ通す
- [ ] guard が禁止 7+ field を hard fail する
- [ ] policy back-link を `architectureRules/types.ts` の RuleBinding interface コメントに記載 (新 doc 作らず)
- [ ] **観測 C4**:
  - [ ] 違反コード試験で hard fail Y/N
  - [ ] 既存 RuleBinding (5 field のみ) は通る Y/N
- [ ] DA-α-005 振り返り判定 + Q1〜Q5 self-check
- [ ] `cd app && npm run test:guards` PASS
- [ ] **C4 達成 mark**

---

## Segment B: AI Navigation + Audit (並列着手可)

### Phase 6: AI Navigation enhancements

- [ ] DA-α-006 entry を landing (drawer artifact 群 granularity 判断、5 軸)
- [ ] DA-α-006 の Commit Lineage + tag
- [ ] `tools/architecture-health/src/aag/rules-by-path-generator.ts` 新設
- [ ] `docs/generated/aag/rules-by-path.<format>` 生成
- [ ] `docs/generated/aag/rule-index.<format>` 軽量 index 生成
- [ ] `docs/generated/aag/rule-detail/<id>.<format>` on-demand 生成
- [ ] `docs/generated/aag/rule-by-topic.<format>` 生成 (manifest.json discovery 拡張または並列)
- [ ] sync guard 各々 (rules-by-path / rule-index / rule-detail / rule-by-topic と canonical の sync)
- [ ] **観測** (本 session 内 simulation):
  - [ ] AI が `merged.ts` 編集 task で関連 rule subset に 1 read で reach Y/N
  - [ ] 不要 context が surface しない (negative test) Y/N
  - [ ] guard 違反時 rule-detail へ N step 以下で reach Y/N
  - [ ] topic 起点で rule subset hit Y/N
- [ ] DA-α-006 振り返り判定 + Q1〜Q5 self-check
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

### Phase 7: 5 軸 audit (既存 AAG + 本 project)

- [ ] DA-α-007 entry を landing (audit scope + per-violation restructure 判断 protocol)
- [ ] CLAUDE.md / `aag/*` / `references/01-principles/aag/*` を 5 軸 audit
- [ ] 本 project (`aag-platformization`) を自己 audit (reframe 跡 articulation 含む)
- [ ] 違反箇所を分類: 製本重複 / 依存逆 / 責務集合 / 境界曖昧 / 意味曖昧
- [ ] per-violation で restructure 判断 (実施 / 据置 / 後続) を DA entry に articulate
- [ ] 採用された restructure を実施 (新 doc 増設禁止、既存 doc 拡張のみ)
- [ ] **観測**: 違反検出件数 + 解消件数 + 本 project 内 articulation 削減量
- [ ] DA-α-007 振り返り判定
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

---

## Segment C: Verification + Implementation + Archive

### Phase 8: Simulation + 機能 verify

- [ ] DA-α-008 entry を landing (simulation suite scope + observation protocol)
- [ ] CT1 path-triggered rule access (Phase 6 effect、F1)
- [ ] CT2 irrelevant context surface しない (negative、F1)
- [ ] CT3 rule detail rapid lookup (Phase 6 effect、F2)
- [ ] CT4 topic discovery (Phase 6 effect、F1 / F2)
- [ ] CT5 試験 drift で sync guard hard fail (Phase 2-6 effect、F3)
- [ ] CT6 session 間判断継承 (decision-audit re-derive 不要、F4)
- [ ] CT7 5 軸 articulate なき deliverable は review block (Phase 1 effect、F5 / F6)
- [ ] CT8 merged artifact が runtime merge と byte-identical (Phase 3 effect、F3 / Go 条件 C2)
- [ ] CT9 AagResponse + detector schema validation 通過 (Phase 4 effect、Go 条件 C3)
- [ ] CT10 RuleBinding 違反 hard fail (Phase 5 effect、Go 条件 C4)
- [ ] 各 CT 結果を DA-α-008 observation table に landing
- [ ] F1〜F7 の機能 status を articulate
- [ ] DA-α-008 振り返り判定

### Phase 9: Go 実装 (条件 C1-C4 全 met 時のみ)

- [ ] **着手 gate** (全 [x] が必須):
  - [ ] DA-α-002 振り返りが "正しい" (C1 met)
  - [ ] DA-α-003 振り返りが "正しい" (C2 met)
  - [ ] DA-α-004 振り返りが "正しい" (C3 met)
  - [ ] DA-α-005 振り返りが "正しい" (C4 met)
- [ ] DA-α-009 entry を landing (言語選定: Go / Python / combo、Rust 除外。AI Rust 強推奨時は人間確認 escalation)
- [ ] DA-α-009 の Commit Lineage + tag
- [ ] `tools/aag-{lang}/` 新設 (採用言語次第)
- [ ] validate (schema validation) PoC が動作
- [ ] merge (TS と byte-identical) PoC が動作
- [ ] CI に組み込まない (本 cutover は後続 program)
- [ ] DA-α-009 振り返り判定 + Q1〜Q5 self-check

### Phase 10: Archive + 後続 program charter

- [ ] DA-α-010 entry を landing (archive 判断 + 後続 program charter 必要性)
- [ ] 不機能と判明した deliverable の revert 完了
- [ ] Phase 7 audit で identify された負債の削減実施
- [ ] 後続 program (もし必要なら) charter 1 doc articulate (新規 or 既存拡張、判断は DA-α-010)
- [ ] `references/02-status/recent-changes.md` に本 program のサマリ追加
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## 最終 archive レビュー (人間承認、唯一の人間 mandatory 点)

> `plan.md` 不可侵原則 6。judgement の正しさを担保しない、責任の引受。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-000〜010) を read
- [ ] 全 F1-F7 + Go 条件 C1-C4 の observation 結果を確認
- [ ] archive プロセスへの移行を承認
