# checklist — aag-rule-schema-meta-guard

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `- [ ]` または `- [x]` の半角スペース。ネスト不可。

## Phase 1: SemanticTraceBinding 型 family 実装

- [x] `app/src/test/aag-core-types.ts` (or `architectureRules/types.ts`) に `TraceBindingStatus` 型 alias 追加 (`'pending' | 'not-applicable' | 'bound'`) — `aag-core-types.ts` (Core 層) に landing
- [x] `SemanticTraceRef` interface 追加 (`problemAddressed: string` + `resolutionContribution: string`) — `aag-core-types.ts` に landing、AAG-REQ-ANTI-DUPLICATION の必須対構造
- [x] `CanonicalDocTraceRef` interface 追加 (extends `SemanticTraceRef`、`docPath: string`) — `aag-core-types.ts` に landing
- [x] `MetaRequirementTraceRef` interface 追加 (extends `SemanticTraceRef`、`requirementId: string`) — `aag-core-types.ts` に landing
- [x] `SemanticTraceBinding<TRef>` interface 追加 (`status` + `justification?` + `refs: readonly TRef[]`) — `aag-core-types.ts` に landing、TRef は `SemanticTraceRef` 制約付き
- [x] `RuleBinding` 型に `canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` を optional 追加 — `architectureRules/types.ts` (App Domain 層) に landing
- [x] `RuleBinding` 型に `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` を optional 追加 — `architectureRules/types.ts` に landing
- [x] `merged.ts` 経由で consumer から型アクセス可能を確認 (sample import 1 件) — `architectureRules/index.ts` barrel 経由で 5 型 re-export + `architectureRulesMergeSmokeGuard.test.ts` に type-level smoke test 追加 (10 tests PASS)
- [x] tsc -b PASS + 既存全 guard PASS — build PASS / lint 0 errors / test:guards 130 file 894 test PASS / docs:check Hard Gate PASS

## Phase 2: 166 rule に initial value 装着

- [x] `app-domain/gross-profit/rule-catalog/base-rules.ts` の全 rule entry を grep + 件数確認 (= 166 件想定) — 確認済 (`grep -cE "^  \{" base-rules.ts` = 166)
- [x] 全 rule に `canonicalDocRef: { status: 'pending', refs: [] }` 装着 (batch script or AI 補助 edit) — Python regex script で 166 entry に bulk insert (`^  \},$` 直前に挿入)
- [x] 全 rule に `metaRequirementRefs: { status: 'pending', refs: [] }` 装着 — 同 script で同時 insert
- [x] tsc -b PASS + lint PASS + format:check PASS + 既存全 guard PASS — tsc -b clean / lint 0 errors / format:check PASS / test:guards 130 file 894 test PASS
- [x] 新 field 整合性確認 (空配列でなく明示的 `{ status: 'pending', refs: [] }` が articulate 済を grep で検証) — `grep -c "canonicalDocRef:" = 166` + `grep -c "metaRequirementRefs:" = 166`、空配列のみの状態は存在しない

## Phase 3: AR-rule binding 記入 (Project A 完了後 or 並行可能 batch)

- [ ] **Phase 3 着手前判断**: Project A の Phase 1〜2 完了状況を確認 (新 doc path 安定状態)
- [ ] batch 戦略確定: 5-10 rule で品質基準 protocol 確定 → 残 rule batch 適用
- [ ] **batch 1 (5-10 rule、protocol 確定 batch)**: 各 rule の `canonicalDocRef.status` を `bound` or `not-applicable` に flip + `refs[]` 記入 + `problemAddressed` + `resolutionContribution` articulate
- [ ] **batch 1 で品質基準 protocol を `references/02-status/ar-rule-audit.md` に articulate** (禁止 keyword + 20 文字 minimum + 重複検出 + status 整合性 + path 実在)
- [ ] **batch 2〜N (残 rule、batch protocol 適用)**: 全 166 rule の binding 記入を batch 適用、Discovery Review (人間レビュー) で意味品質補完
- [ ] 全 166 rule の `metaRequirementRefs` も同様に記入 (binding ID = aag/meta.md §2 の `AAG-REQ-*`)
- [ ] 全 rule の status 整合確認 (`pending` 0 件 = MVP 完遂条件 or 一部 `pending` を follow-up project に逃がす articulation)

## Phase 4: meta-guard MVP 4 件実装

- [ ] `app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts` 実装 (forward direction: 各 rule の `canonicalDocRef.refs[].docPath` が実在 doc を指すか検証)
- [ ] `app/src/test/guards/canonicalDocBackLinkGuard.test.ts` 実装 (reverse direction: 各 canonical doc が refer されている rule を逆引き、orphan canonical doc を検出)
- [ ] `app/src/test/guards/semanticArticulationQualityGuard.test.ts` 実装 (hard fail 基準: 禁止 keyword + 20 文字 minimum + 重複検出 + status 整合性 + path 実在)
- [ ] `app/src/test/guards/statusIntegrityGuard.test.ts` 実装 (status 値の整合性 + `not-applicable` 時 justification 必須)
- [ ] 4 meta-guard を `architectureRules.ts` に登録 (rule ID 採番 + slice assignment)
- [ ] 4 meta-guard 全 PASS (= 全 166 rule binding が品質基準と direction 整合性を satisfy)
- [ ] test:guards 全 PASS (130+4 = 134 file 想定)

## Phase 5: ratchet-down 整備 + follow-up scope articulate

- [ ] meta-guard 4 件の baseline を `architectureRules.ts` に articulate (ratchet-down で進化可能)
- [ ] 残 sub-audit (4.1 境界 / 4.3 波及 / 4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard) の follow-up 配置先 articulate (新 project spawn or 既存 follow-up に追加)
- [ ] follow-up project の articulation を `projects/aag-bidirectional-integrity/HANDOFF.md` または新 follow-up project 内に landing
- [ ] Phase 8 MVP 完遂を親 project HANDOFF / `aag-doc-audit-report.md` に通知 update
- [ ] 本 project の archive 候補 articulate

## 途中判断 (decision gates、AI 自主判断 + judgement criteria)

> `references/03-guides/deferred-decision-pattern.md` 適用。

### Phase 1 着手前判断

- [ ] **`principleRefs` の semantic 化を本 project に含めるか別 sprint か** (親 plan §8.9)
  - **判断基準**: schema 拡張 scope の追加可否 / 既存 92+ rule の `principleRefs` migration コスト
  - **判断材料**: `principleRefs` の現在 articulation / Phase 1 type addition の commit 数見積もり

### Phase 3 着手前判断

- [ ] **batch 戦略の確定** (5-10 rule で protocol 確定 → 残 batch 適用)
  - **判断基準**: 親 plan §6.1 articulation 踏襲 / Project A 完了状況 / 品質基準 hard fail 検証可能性
  - **判断材料**: Project A Phase 1〜2 完了状態 / 既存 binding 状態 / hard fail criteria
- [ ] **Project A 完了状況に応じて binding 記入の対象 doc path 確定**
  - **判断基準**: Project A の Phase 1〜2 が完了済 / 新 doc が安定状態
  - **判断材料**: Project A checklist Phase 1 / Phase 2 完遂状態

### Phase 4 着手前判断

- [ ] **meta-guard 4 件の baseline 設定** (既存 binding 状態を baseline、ratchet-down で進化)
  - **判断基準**: Phase 3 binding 完了状態 / pending rule の許容数
  - **判断材料**: Phase 3 完遂後の rule binding 状態 grep

### Phase 5 着手前判断

- [ ] **follow-up scope (残 sub-audit) の配置先**
  - **判断基準**: 残 sub-audit の責務 orthogonal 度 / 既存 follow-up project の有無
  - **判断材料**: 親 plan §3.1.5 sub-audit 一覧 / Project C / Project D の現在 scope

## Future follow-up project candidate consideration (必ず触れる原則、user articulate 2026-04-30)

> **趣旨**: AI / 人間は checklist に沿って作業する。checklist にないものは触れられない。Future follow-up project candidate (= Project E + F、AAG Decision Traceability + AI Utilization、9 insight 統合) を本 project の作業中に **必ず触れる** mechanism として articulate (= 「いつ考えるか / どう brush up するか」は別問題、必ず engage することのみ義務化)。
>
> **正本 articulation**: `projects/aag-bidirectional-integrity/HANDOFF.md` §2 + `projects/aag-bidirectional-integrity/checklist.md` の「Future follow-up = Project E」section。
>
> **本 project との特別 relevance**: 本 project は SemanticTraceBinding 型 family + meta-guard 4 件 を実装する。これは Project E の DecisionTrace schema (= investigation + verification + hypothesis + evidence + decision + rationale + alternatives + reversibility + rollbackAnchor + qualityImpact + retrospectiveAudit + correctionChain) の **直系 precursor**。本 project Phase 1 (型定義) で SemanticTraceBinding を実装する際、Project E DecisionTrace schema との extensibility を articulate (= 共通 base type / shared field / extension path) すべき。

- [ ] 本 project の各 Phase 着手前 / 完了時に **Project E + F candidate を一読** + 本 project の context で **新たな insight / 反証 / brush up があれば articulate** (= 親 HANDOFF §2 に追記 or 本 checklist の note に articulate、決定的な action は不要、engage のみ義務)
- [ ] 本 project Phase 1 (SemanticTraceBinding 型 family 実装) 着手時に Project E DecisionTrace schema との extensibility を articulate (共通 base type / shared field / extension path)
- [ ] 本 project archive 前に Project E candidate spawn 着手 trigger を確認

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
