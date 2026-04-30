# checklist — aag-display-rule-registry

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: DFR registry doc 制作 (Layer 2 新規製本、Project B Phase 4 完了後)

- [ ] **着手前判断**: Project B Phase 4 (meta-guard MVP 4 件 全 PASS) 完了状況を確認 (循環 fail 防止)
- [ ] **着手前判断**: anti-bloat 適用 — Phase 9 で識別された他 gap 候補のうち本 project に含めるものを judge
- [ ] `references/01-principles/aag/display-rule-registry.md` 新設 (Layer 2 新規製本、`aag/` ディレクトリ整合)
- [ ] DFR-001 chart semantic color の rule entry articulate (実績 = 緑 / 推定 = オレンジ + Layer 1 source link + Layer 2 doc link + bypass pattern + 適用 path + migrationRecipe + metaRequirementRefs)
- [ ] DFR-002 axis formatter via useAxisFormatter の rule entry articulate
- [ ] DFR-003 percent via formatPercent の rule entry articulate (小数第 2 位、認可)
- [ ] DFR-004 currency via formatCurrency の rule entry articulate (thousands separator 明文化)
- [ ] DFR-005 icon via pageRegistry / emoji canonical の rule entry articulate
- [ ] `references/03-guides/content-and-voice.md` の "thousands-separator convention is not enforced" 記述更新
- [ ] `docs/contracts/doc-registry.json` への display-rule-registry 登録
- [ ] docRegistryGuard / docCodeConsistencyGuard 全 PASS

## Phase 2: DFR-NNN を base-rules.ts に登録

- [ ] DFR-001 を `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` に rule entry 追加 (`canonicalDocRef.status = 'bound'` + `refs[].docPath = 'references/01-principles/aag/display-rule-registry.md'` + `problemAddressed` + `resolutionContribution` 記入)
- [ ] DFR-001 に `metaRequirementRefs` 記入 (= aag/meta.md §2 の対応 `AAG-REQ-*` ID、status `'bound'`)
- [ ] DFR-002 〜 DFR-005 同様に登録 (5 rule entry 全数)
- [ ] 各 rule の Layer 3 detection logic articulation (実装側で何を機械検証するか)
- [ ] 各 rule の baseline 設定 (CHART-004 / 005 / FactorDecomp / BudgetVsActual.builders / BudgetTrend / Seasonal の observed drift を baseline 化)
- [ ] migrationRecipe の各 rule への記入
- [ ] tsc -b PASS + lint PASS + format:check PASS + 既存全 guard PASS
- [ ] Project B Phase 4 meta-guard 4 件 全 PASS (= forward / reverse direction integrity 成立)

## Phase 3: displayRuleGuard 実装

- [ ] `app/src/test/guards/displayRuleGuard.test.ts` 新規実装 (DFR-NNN の baseline + forward direction 検証 framework)
- [ ] DFR-001〜005 の baseline で displayRuleGuard 全 PASS
- [ ] 新規 drift は immediate fail に articulate (ratchet-down 設計)
- [ ] `architectureRules.ts` への displayRuleGuard 登録 (rule ID 採番 + slice assignment)
- [ ] test:guards 全 PASS (既存 130 + 1 = 131 file 想定、Project B の 4 meta-guard と合わせて 135 file 想定)

## Phase 4: aag/meta.md §2 / §4 達成判定 update

- [ ] **着手前判断**: Project B Phase 4 完了 + 本 project Phase 3 完了 = bidirectional integrity の最初の concrete instance 成立を確認
- [ ] aag/meta.md §2 の対応 requirement (例: AAG-REQ-NON-PERFORMATIVE / AAG-REQ-BIDIRECTIONAL-INTEGRITY) の status flip を articulate (= 「未達成」→「達成 (DFR registry で初の concrete instance 成立)」)
- [ ] aag/meta.md §4 達成判定総括の update
- [ ] 親 project HANDOFF / `references/02-status/aag-doc-audit-report.md` への通知 update
- [ ] 本 project の archive 候補 articulate (Project A〜D 全完了で親 project の archive プロセス着手)

## 途中判断 (decision gates、AI 自主判断 + judgement criteria)

> `references/03-guides/deferred-decision-pattern.md` 適用。

### Phase 1 着手前判断

- [ ] **Project B Phase 4 完了状況確認** (循環 fail 防止)
  - **判断基準**: Project B checklist Phase 4 全 [x] / 4 meta-guard 全 PASS
  - **判断材料**: Project B checklist 状態 + test:guards 結果 grep
- [ ] **anti-bloat 適用**: Phase 9 で識別された他 gap 候補のうち本 project に含めるものを判定
  - **判断基準**: 必要性 (現実観測 drift 有無) / scope creep risk / 親 plan §3.4.2 anti-duplication 原則
  - **判断材料**: 親 plan §Phase 9 articulation / observed drift inventory

### Phase 2 着手前判断

- [ ] **各 DFR rule の Layer 3 detection logic 確定**
  - **判断基準**: 機械検証可能な抽象度 / 既存 guard pattern との整合
  - **判断材料**: 既存 guard 実装 / chart 実装 (ChartCard / formatPercent / formatCurrency 等) の現状

### Phase 3 着手前判断

- [ ] **baseline 設定方針** (observed drift を baseline か、即時 0 化を試みるか)
  - **判断基準**: 親 plan #10 (baseline 採用が default) / 即時 0 化の工数見積もり / Phase 3 完了条件
  - **判断材料**: observed drift 件数 / 修正工数 / 親 plan articulation

### Phase 4 着手前判断

- [ ] **status flip 対象 requirement の確定** (aag/meta.md §2 のどの requirement を「未達成」→「達成」に flip するか)
  - **判断基準**: Project B Phase 4 + 本 project Phase 3 完了で satisfy される requirement の判定
  - **判断材料**: aag/meta.md §2 の 12 requirement articulation / Project B Phase 4 完遂状態

## Future follow-up project candidate consideration (必ず触れる原則、user articulate 2026-04-30)

> **趣旨**: AI / 人間は checklist に沿って作業する。checklist にないものは触れられない。Future follow-up project candidate (= Project E + F、AAG Decision Traceability + AI Utilization、9 insight 統合) を本 project の作業中に **必ず触れる** mechanism として articulate (= 「いつ考えるか / どう brush up するか」は別問題、必ず engage することのみ義務化)。
>
> **正本 articulation**: `projects/aag-bidirectional-integrity/HANDOFF.md` §2 + `projects/aag-bidirectional-integrity/checklist.md` の「Future follow-up = Project E」section。
>
> **本 project との特別 relevance**: 本 project は DFR registry (= bidirectional integrity の最初の concrete instance) を実装。これは Project E の **AAG-REQ-QUALITY-ORIENTED-JUDGMENT + AAG-REQ-AI-UTILIZATION-FRIENDLINESS** の application instance precursor (= DFR rule articulation 自体が AI が leverage しやすい registry pattern として function)。本 project Phase 1 で DFR registry を articulate する際、Project E AI utilization patterns との整合性を考慮。

- [ ] 本 project の各 Phase 着手前 / 完了時に **Project E + F candidate を一読** + 本 project の context で **新たな insight / 反証 / brush up があれば articulate** (= 親 HANDOFF §2 に追記 or 本 checklist の note に articulate、決定的な action は不要、engage のみ義務)
- [ ] 本 project Phase 1 (DFR registry doc 制作) 時に Project E AI utilization patterns との整合性 articulate (= DFR registry 自体が AI utilization friendliness 模範 candidate)
- [ ] 本 project archive 前に Project E candidate spawn 着手 trigger を確認

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
