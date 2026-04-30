# plan — aag-display-rule-registry

> **正本**: 親 project (`projects/aag-bidirectional-integrity/plan.md`) の §Phase 9 + §Phase 10 + §3.10
> articulation を継承。本 plan は Project C scope に絞った operational plan。

## 不可侵原則

1. **Phase 順序遵守 (循環 fail 防止)**: 本 project Phase 1 (DFR registry 制作) は **Project B Phase 4
   (meta-guard MVP) 完了後** にのみ着手。Phase 8 meta-guard が registry を hard fail させる循環を防ぐ
   (親 plan §5.2 Phase 順序関連)。
2. **observed drift = baseline、即時 0 化禁止**: Phase 2 (DFR-NNN guards 実装) では現在観測されている drift
   (CHART-004 / 005 / FactorDecomp / BudgetVsActual.builders / BudgetTrend / Seasonal) を **baseline** に
   articulate。即時 0 化を試みず、ratchet-down で漸次対応 (親 plan #10 / §5.2)。
3. **anti-bloat = 必要なものに限定**: Phase 9 で識別された gap 候補のうち、新規 doc 制作の bloat が
   発生する候補は **本 project に含めない**。DFR-001〜005 + 親 plan §Phase 9 articulation の必要 rule に
   限定 (親 plan §3.4.2 anti-duplication 原則)。
4. **正本 = `app-domain/gross-profit/rule-catalog/base-rules.ts`**: DFR rule の登録先は `base-rules.ts` のみ。
   `defaults.ts` (execution overlay) と `guardCategoryMap.ts` には semantic binding を持たせない (二重正本
   回避、Project B 不可侵原則 1 と同一)。category 補助のみ必要なら `guardCategoryMap.ts` に entry 追加可。
5. **forward direction の即時適用**: DFR は新規 rule であり、Phase 8 meta-guard
   (`canonicalDocRefIntegrityGuard`) の forward 方向を **初日から強制適用** できる。Phase 9 で landing
   する各 rule は `canonicalDocRef.refs[].docPath` が `aag/display-rule-registry.md` を指す状態で landing。
6. **scope 越境禁止**: AAG Core doc content refactor / AR-rule schema 拡張 / meta-guard 実装 / 複雑 legacy
   archive 案件は Project A / B / D 所掌、本 project では touch しない。
7. **Project B 完了 dependence**: 本 project は Project B (Phase 1〜4 完了 = SemanticTraceBinding 型 family +
   166 rule initial value + meta-guard 4 件) を utilize する設計。Project B 未完了の段階で本 project を進めると
   schema 不整合 + meta-guard 未 PASS で hard fail。

## Phase 構造

### Phase 1: DFR registry doc 制作 (Layer 2 新規製本)

**目的**: 親 plan §Phase 9 を実行。display 領域の DFR-001〜005 を articulate する canonical doc を新設。

**deliverable**:
- `references/01-principles/aag/display-rule-registry.md` 新設 (Layer 2 新規製本、Project A の `aag/` 階層に整合)
  - DFR-001 chart semantic color (実績 = 緑 / 推定 = オレンジ、ChartCard semantic color の不変条件)
  - DFR-002 axis formatter via useAxisFormatter (chart axis 統一)
  - DFR-003 percent via formatPercent (小数第 2 位、認可)
  - DFR-004 currency via formatCurrency (thousands separator 明文化)
  - DFR-005 icon via pageRegistry / emoji canonical
- 各 rule entry の articulation 構造 (Layer 1 source link + Layer 2 doc link + bypass pattern + 適用 path
  + migrationRecipe + metaRequirementRefs articulate)
- `references/03-guides/content-and-voice.md` の "thousands-separator convention is not enforced" 記述更新
- `docs/contracts/doc-registry.json` への registry 登録

**完了条件**: 新 doc landing、各 rule entry の articulation 構造完備、Project B Phase 8 forward meta-guard
(`canonicalDocRefIntegrityGuard`) で integrity 成立。

### Phase 2: DFR-NNN を base-rules.ts に登録

**目的**: 親 plan §Phase 10 を実行。DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` の
`ARCHITECTURE_RULES` 配列に rule entry として登録。

**deliverable**:
- DFR-001〜005 の rule entry 追加 (各 rule に `canonicalDocRef: SemanticTraceBinding<CanonicalDocTraceRef>` +
  `metaRequirementRefs: SemanticTraceBinding<MetaRequirementTraceRef>` を `'bound'` status で記入、
  Project B Phase 1 で実装される型を utilize)
- 各 rule の Layer 3 detection logic articulation (実装側で何を機械検証するか)
- 各 rule の baseline 設定 (observed drift を baseline に articulate)
- migrationRecipe の各 rule への記入

**完了条件**: 5 DFR rule が `base-rules.ts` に landed、`merged.ts` 経由で consumer access 可能、tsc -b PASS、
Project B Phase 4 meta-guard 4 件 全 PASS (= forward / reverse direction integrity 成立)。

### Phase 3: displayRuleGuard 実装

**目的**: 親 plan §Phase 10 (DFR guards) を実行。rule registry framework を Layer 3 で機械検証する guard
を新規実装。

**deliverable**:
- `app/src/test/guards/displayRuleGuard.test.ts` 新規実装 (DFR-NNN の baseline + forward direction 検証
  framework)
- 各 DFR rule の baseline 確定 (CHART-004 / 005 / FactorDecomp / BudgetVsActual.builders / BudgetTrend /
  Seasonal の現在 drift = baseline)
- 新規 drift は immediate fail (ratchet-down で漸次対応)

**完了条件**: `displayRuleGuard.test.ts` 全 PASS (baseline で PASS、新規 drift は fail)、test:guards 全 PASS。

### Phase 4: aag/meta.md §2 達成判定 update

**目的**: Project B Phase 4 完了 + 本 project Phase 3 完了で **AAG bidirectional integrity の最初の concrete
instance** が成立。aag/meta.md §2 の 12 AAG-REQ-* requirement のうち performative 防止系の status を
「未達成」→「達成」に flip。

**deliverable**:
- aag/meta.md §2 の対応 requirement (例: AAG-REQ-NON-PERFORMATIVE / AAG-REQ-BIDIRECTIONAL-INTEGRITY) status flip
- aag/meta.md §4 達成判定総括の update
- 親 project HANDOFF / `aag-doc-audit-report.md` への通知 update
- 本 project の archive 候補 articulate

**完了条件**: aag/meta.md §2 / §4 update 済、親 project 状態整合、test-contract guard 全 PASS。

### Phase 5: 最終レビュー (人間承認)

**目的**: 全 deliverable の人間 review 通過、archive プロセスへの移行 gate。

**deliverable**:
- 全 Phase 1〜4 の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビュー
- 親 project (`aag-bidirectional-integrity`) との archive 連動を articulate (Project A〜D 全完了で親 archive)

**完了条件**: 人間 review 通過、checklist 末尾「最終レビュー (人間承認)」 [x] flip。

## やってはいけないこと

- **Phase 1 を Project B Phase 4 完了前に着手** → 循環 fail (meta-guard が registry を hard fail させる、不可侵原則 1)
- **observed drift を即時 0 化** → 親 plan #10 違反、ratchet-down で漸次対応 (不可侵原則 2)
- **anti-bloat 違反 = 必要以上の新規 doc 制作** → §3.4.2 anti-duplication 原則違反 (不可侵原則 3)
- **`defaults.ts` / `guardCategoryMap.ts` に DFR rule semantic binding を追加** → 二重正本回避 (不可侵原則 4)
- **Project B 未完了で着手** → schema 不整合 + meta-guard 未 PASS (不可侵原則 7)
- **AAG Core doc を直接 edit / 新 doc を Create (display-rule-registry.md 以外)** → Project A 所掌の越境 (不可侵原則 6)
- **AR-rule schema 拡張 / meta-guard 実装** → Project B 所掌の越境 (不可侵原則 6)

## 途中判断 (decision gates)

> `references/03-guides/deferred-decision-pattern.md` 適用。詳細は checklist.md を参照。

主要な途中判断:
- **Phase 1 着手前**: Project B Phase 4 meta-guard MVP 完了状況を確認 (循環 fail 防止)
- **Phase 1 着手前**: anti-bloat 適用 — Phase 9 で識別された他 gap 候補のうち本 project に含めるものを判定
- **Phase 2 着手前**: 各 DFR rule の Layer 3 detection logic 確定 (機械検証可能な抽象度に articulate)
- **Phase 3 着手前**: baseline 設定方針 (observed drift を baseline か、即時 0 化を試みるか) — 親 plan #10 で baseline 採用が default
- **Phase 4 着手前**: aag/meta.md §2 のどの requirement の status を flip するか確定 (Project B Phase 4 完了で flip 対象 requirement を識別)

## 関連実装

| パス | 役割 |
|---|---|
| `references/01-principles/aag/display-rule-registry.md` | Phase 1 で新規 Create (Layer 2 新規製本、DFR-001〜005 registry) |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (Phase 2 で DFR-001〜005 登録) |
| `app/src/test/architectureRules/defaults.ts` | execution overlay (**touch 禁止**、不可侵原則 4) |
| `app/src/test/guardCategoryMap.ts` | category map (semantic binding は持たせない、不可侵原則 4。category 補助のみ必要なら entry 追加可) |
| `app/src/test/guards/displayRuleGuard.test.ts` | Phase 3 で新規実装 (rule registry framework) |
| `references/03-guides/content-and-voice.md` | content + voice convention (Phase 1 で thousands-separator 記述更新) |
| `docs/contracts/doc-registry.json` | Phase 1 で registry 登録 |
| `references/01-principles/aag/meta.md` | Phase 4 で §2 / §4 status flip |
| `projects/aag-rule-schema-meta-guard/plan.md` | Project B 正本 (本 project の前提) |
| `projects/completed/aag-core-doc-refactor/plan.md` | Project A 正本 (`aag/` 階層整備の前提) |
