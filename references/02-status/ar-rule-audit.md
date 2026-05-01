# AR-rule binding 品質基準 protocol — Project B Phase 3 deliverable

> **役割**: Project B (`aag-rule-schema-meta-guard`) Phase 3 batch 1 で確定した、AR-rule の `canonicalDocRef` + `metaRequirementRefs` 記入時の **品質基準** を articulate。Phase 4 で実装される `semanticArticulationQualityGuard` が hard fail で機械検証する条件の正本。
>
> **正本**: 本 doc。`semanticArticulationQualityGuard` (Phase 4 実装) は本 doc の §2 criteria を実装する。
>
> **batch 1 sample**: 本 protocol を確定した 5 rule = AR-001 / AR-002 / AR-A1-DOMAIN / AR-G3-SUPPRESS / AR-005 (`app-domain/gross-profit/rule-catalog/base-rules.ts`)。

## §1 binding の意味と構造

`SemanticTraceBinding<TRef>` は drill-down chain (canonical doc / AAG-REQ ↔ AR-rule) の **重複と参照を切り分ける** mechanism。pointer (= 重複の指摘) ではなく **問題と解決の articulate** を必須対で要求する。

| field           | 役割                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `status`        | `'pending'` / `'not-applicable'` / `'bound'` の三値、空配列 (`refs: []`) との明示的差別化                          |
| `justification` | `status='not-applicable'` のとき必須 (該当しない理由を articulate)                                                 |
| `refs`          | `SemanticTraceRef` 派生 type の配列 — 各 ref は pointer + `problemAddressed` + `resolutionContribution` の三位一体 |

| `TRef` 派生 type          | 追加 field      | 用途                                                                   |
| ------------------------- | --------------- | ---------------------------------------------------------------------- |
| `CanonicalDocTraceRef`    | `docPath`       | rule が canonize する canonical doc への forward 参照 (実装 → 設計)    |
| `MetaRequirementTraceRef` | `requirementId` | rule が satisfy に貢献する `AAG-REQ-*` への reverse 参照 (実装 → 要件) |

## §2 品質基準 (semanticArticulationQualityGuard が hard fail で検証)

### §2.1 禁止 keyword (semantic vacuity の検出)

`problemAddressed` / `resolutionContribution` / `justification` 内に以下の keyword が出現したら hard fail:

| keyword                                | 拒否理由                                                     |
| -------------------------------------- | ------------------------------------------------------------ |
| `TBD` / `tbd`                          | semantic articulation が未完了 (placeholder のまま)          |
| `N/A` (本文中、status 値ではなく)      | not-applicable は `status` field で表現すべき                |
| `same as above` / `同上` / `same`      | 重複の articulate を回避している (drill-down chain の冗長化) |
| `see above` / `上記参照`               | pointer 単独に劣化している (semantic articulation 不在)      |
| `ditto` / 「同じ」                     | 重複検出回避の偽装                                           |
| `etc.` / `etc` / `など` (文末単独使用) | semantic content が完結していない                            |

> **rationale**: pointer 単独 (= keyword 一覧で迂回) を許すと、`problemAddressed` / `resolutionContribution` の必須対が崩れ AAG-REQ-ANTI-DUPLICATION の構造的強制が機能しなくなる。

### §2.2 文字数 minimum (placeholder 検出)

`problemAddressed` + `resolutionContribution` + `justification` の各文字列は **20 文字 minimum** (空白 trim 後) — placeholder / 一語回答を拒否。

> **rationale**: 「層境界違反」 (6 文字) のような短文は問題の articulate として不十分。canonical doc が articulate した課題を要約 + 本 rule の貢献を明示するには最低限の長さが必要。

### §2.3 重複検出 (semantic content の機械的同一性)

同一 `RuleBinding` 内 (= 同一 rule entry):

- `canonicalDocRef.refs[].problemAddressed` の同一文字列重複 → hard fail
- `metaRequirementRefs.refs[].problemAddressed` の同一文字列重複 → hard fail
- 1 rule の `canonicalDocRef.refs[*].resolutionContribution` 全要素が同一文字列 → hard fail (multi-ref の意味が消失)

> **rationale**: 1 rule が複数 doc / 複数 AAG-REQ に bound する場合、各 ref は **異なる課題** に対する **異なる貢献** を articulate するはず。同一文字列の重複は articulate の手抜きを示唆。

### §2.4 status 整合性 (構造的整合性)

| 違反パターン                                                    | hard fail                                  |
| --------------------------------------------------------------- | ------------------------------------------ |
| `status='pending'` なのに `refs.length > 0`                     | 矛盾 (pending は未対応 = 空配列のはず)     |
| `status='bound'` なのに `refs.length === 0`                     | 矛盾 (bound は記入済 = 1 件以上のはず)     |
| `status='not-applicable'` なのに `justification` 不在 or 空文字 | not-applicable は理由必須                  |
| `status='not-applicable'` なのに `refs.length > 0`              | 矛盾 (該当しないなら ref を持つはずがない) |

### §2.5 path 実在 (forward direction の参照健全性)

- `canonicalDocRef.refs[].docPath` が指す path は repository 内に **実在 file** であること (deleted file は hard fail)
- `metaRequirementRefs.refs[].requirementId` は `references/01-principles/aag/meta.md` §2 の `AAG-REQ-*` namespace に存在すること (Phase 4 の `canonicalDocBackLinkGuard` が逆引きで検証)

> **rationale**: 参照健全性が壊れた状態で `bound` を articulate すると、forward direction の trace が無効化される。`semanticArticulationQualityGuard` が path 実在を機械検証することで、refactor / archive 時の参照壊れを即座に gate severity で拒否する。

## §3 batch 1 articulation result (5 rule、protocol 確定例)

| rule id          | canonicalDocRef.docPath                                  | metaRequirementRefs.requirementId |
| ---------------- | -------------------------------------------------------- | --------------------------------- |
| `AR-001`         | `references/03-guides/safety-first-architecture-plan.md` | `AAG-REQ-RATCHET-DOWN`            |
| `AR-002`         | `references/01-principles/design-principles.md`          | `AAG-REQ-LAYER-SEPARATION`        |
| `AR-A1-DOMAIN`   | `references/01-principles/design-principles.md`          | `AAG-REQ-LAYER-SEPARATION`        |
| `AR-G3-SUPPRESS` | `references/03-guides/coding-conventions.md`             | `AAG-REQ-NON-PERFORMATIVE`        |
| `AR-005`         | `references/01-principles/modular-monolith-evolution.md` | `AAG-REQ-RATCHET-DOWN`            |

batch 1 で観察された pattern:

- **layer-boundary slice の rule は概ね `AAG-REQ-LAYER-SEPARATION` に bound** (Domain 純粋 / 4 層境界 / engine 境界の articulate 全てが層境界 mapping の起点)
- **ratchet-down 系 rule (退役シンボル禁止 / count baseline 凍結) は `AAG-REQ-RATCHET-DOWN` に bound** (改善の不可逆性を本 rule scope で担保する articulate が共通)
- **guard 迂回系 rule (eslint-disable / @ts-ignore 禁止) は `AAG-REQ-NON-PERFORMATIVE` に bound** (guard が canonical doc に裏打ちされ続ける状態の維持が articulate の核)

## §4 batch 2〜3 完遂結果 (2026-05-01、Phase 3 MVP 完遂)

batch 2〜3 で残 161 rule を全 bound articulate、`pending` 0 件達成。

### batch 2 (5 rule、人手 articulate、残 slice カバー)

| rule                       | slice                     | canonicalDoc                         | AAG-REQ                    |
| -------------------------- | ------------------------- | ------------------------------------ | -------------------------- |
| `AR-PATH-SALES`            | canonicalization          | sales-definition.md                  | `AAG-REQ-NON-PERFORMATIVE` |
| `AR-PATH-DISCOUNT`         | canonicalization          | discount-definition.md               | `AAG-REQ-NON-PERFORMATIVE` |
| `AR-G5-HOOK-MEMO`          | responsibility-separation | responsibility-separation-catalog.md | `AAG-REQ-RATCHET-DOWN`     |
| `AR-STRUCT-ANALYSIS-FRAME` | query-runtime             | safe-performance-principles.md       | `AAG-REQ-LAYER-SEPARATION` |
| `AR-A1-APP-INFRA`          | layer-boundary            | design-principles.md                 | `AAG-REQ-LAYER-SEPARATION` |

### batch 3 (156 rule、Python synthesizer 一括 bound)

batch 1+2 で確定した protocol §2 を機械適用。各 rule の `what` / `why` / `correctPattern` /
`outdatedPattern` field を inject して rule-specific な semantic content を保ちつつ、protocol
§2 (20 char minimum + 禁止 keyword 不在 + 内部重複 0 + status 整合) を機械的に保証。

**AAG-REQ heuristic mapping** (slice + principleRefs):

| slice                       | 条件                            | mapping 先 AAG-REQ         |
| --------------------------- | ------------------------------- | -------------------------- |
| `layer-boundary`            | —                               | `AAG-REQ-LAYER-SEPARATION` |
| `query-runtime`             | —                               | `AAG-REQ-LAYER-SEPARATION` |
| `canonicalization`          | —                               | `AAG-REQ-NON-PERFORMATIVE` |
| `responsibility-separation` | `count` detection               | `AAG-REQ-RATCHET-DOWN`     |
| `responsibility-separation` | otherwise                       | `AAG-REQ-LAYER-SEPARATION` |
| `governance-ops`            | principleRefs G3 / G4           | `AAG-REQ-NON-PERFORMATIVE` |
| `governance-ops`            | principleRefs G1 / G5 / G6 / G7 | `AAG-REQ-RATCHET-DOWN`     |
| `governance-ops`            | principleRefs F1-F3             | `AAG-REQ-ANTI-DUPLICATION` |
| `governance-ops`            | principleRefs H1-H6             | `AAG-REQ-LAYER-SEPARATION` |
| `governance-ops`            | principleRefs E1-E4             | `AAG-REQ-NON-PERFORMATIVE` |
| `governance-ops`            | principleRefs C1-C9             | `AAG-REQ-LAYER-SEPARATION` |
| `governance-ops`            | default                         | `AAG-REQ-RATCHET-DOWN`     |

**結果**: 全 166 rule が `status: 'bound'` 状態、`pending` 0 件。

### Discovery Review (人間レビュー、follow-up session で実施)

batch 3 の synthesizer は **protocol §2 機械検証 hard fail criteria** を保証するが、**意味の妥当性**
(= 適切な AAG-REQ mapping、articulation の質、refs[] の追加) は機械では判定不能。protocol §1 の
articulation 品質を高めるため、後続 session で人間レビュー (Discovery Review) を実施:

- 各 rule の AAG-REQ mapping が真に妥当か (heuristic は domain 特化の誤り得る)
- `problemAddressed` + `resolutionContribution` が rule 固有性を真に articulate しているか
- 複数 AAG-REQ に bound すべき rule の refs[] 拡張
- `not-applicable` justify が妥当な rule の identify (現状全 bound、true negative の articulate 候補)

`status='not-applicable'` の articulate 例 (Phase 3 では発生しなかった):

- AAG framework と orthogonal な domain rule (例: 業務計算式の禁止 import 等) → `metaRequirementRefs` を `not-applicable` で justify
- 各 rule に対して「対応する AAG-REQ がない」場合のみ not-applicable、安易な escape を避ける

Discovery Review が identify した not-applicable 候補は、follow-up commit で `status='bound'` →
`status='not-applicable'` + `justification` 装着に flip。

## §5 meta-guard 運用方針 (Phase 4 完遂、Phase 5 で fixed-mode 確定)

Project B Phase 4 で landing した 4 meta-guard (= protocol §2 の機械検証実装) は **fixed-mode**
で運用する (baseline=0 invariant、ratchet-down baseline 構造は不要)。

### fixed-mode 採用の rationale

ratchet-down は「許容違反数を漸次下げる」 mechanism (= 既存負債を許容しつつ新規発生を禁止)。
本 meta-guard 4 件は **drill-down chain の semantic management** という protocol §1 の構造的
強制を担うため、最初から **0 件 invariant** を保証する fixed-mode が適切:

- `canonicalDocRefIntegrityGuard`: forward direction の参照健全性は許容 0 件以外不可
- `canonicalDocBackLinkGuard`: orphan requirementId は許容 0 件以外不可 (false positive がない)
- `semanticArticulationQualityGuard`: protocol §2.1〜§2.3 違反は articulation の手抜きを示唆、許容不可
- `statusIntegrityGuard`: status ↔ refs ↔ justification の構造的矛盾は許容不可

実装 pattern: `expect(violations).toEqual([])` (= 0 件固定、許容範囲なし)。

### 違反発生時の対応経路

meta-guard が hard fail で違反を捕捉した場合:

1. **新規 rule 追加で違反**: rule の binding articulation を protocol §2 準拠に再記入
2. **既存 rule の docPath が破壊**: refactor / archive で参照壊れた canonical doc を修正
3. **AAG-REQ 名の変更**: aag/meta.md §2 と base-rules.ts の `requirementId` を co-update
4. **正当な理由で違反を保留したい場合**: `status='not-applicable'` に flip + `justification` 装着で
   articulate (= 構造的に許容範囲を articulate、安易な escape を避ける)

### 関連 commit

- Project B Phase 4 (`c2f6237` または amend 後 commit): 4 meta-guard 実装 + guard-test-map registration

## §6 follow-up sub-audit scope (Project B MVP 外、別 project candidate)

Project B Phase 8 MVP は **4 meta-guard のみ** (canonicalDocRefIntegrity / canonicalDocBackLink /
semanticArticulationQuality / statusIntegrity)。親 plan §3.1.5 で articulate された残 sub-audit
**5 件** は Project B scope 外、follow-up project candidate として articulate:

| sub-audit                                | scope                                                                                                                                                                                                              | 配置先                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **4.1 境界監査** (boundary audit)        | rule の `slice` field + `principleRefs` の境界整合性検証 (例: layer-boundary slice の rule が A1〜A6 以外を ref していないか、canonicalization slice の rule が B1/F8 を ref しているか)                           | follow-up project candidate (= AAG framework の整合性検証拡張、Project E 候補に統合可)        |
| **4.3 波及監査** (impact audit)          | rule の `relationships.dependsOn` / `relationships.enables` の整合性検証 (= 双方向 graph の cycle 検出 / orphan 検出 / dependency closure 検証)                                                                    | follow-up project candidate                                                                   |
| **4.5 機能性監査** (functionality audit) | 各 rule の `detection` 設定が `what` / `why` / `outdatedPattern` と semantically 一致するか検証 (= guard が rule の意図を実装しているか)                                                                           | follow-up project candidate (= AI 補助の human review が必要、機械検証だけでは不十分)         |
| **selfHostingGuard**                     | `AAG-REQ-SELF-HOSTING` の達成: aag/meta.md 自身が AR-rule に linked、meta-rule が自分自身を検証                                                                                                                    | **完遂** (2026-05-01 Phase 1 MVP、commit TBD) — `AR-AAG-META-SELF-HOSTING` rule + `app/src/test/guards/selfHostingGuard.test.ts` (3 tests: hard fail x2 [Test 1=AAG-REQ-SELF-HOSTING bound to ≥1 rule / Test 2=bound rule の canonicalDocRef back-references aag/meta.md] + warn-only orphan baseline=6) で self-reference closure を機械検証。12/12 AAG-REQ milestone 到達 |
| **metaRequirementBindingGuard**          | aag/meta.md §2 の各 `AAG-REQ-*` requirement に対して、bound している rule が **十分なカバレッジ** で存在することを検証 (= 本 project Phase 4 の `canonicalDocBackLinkGuard` は orphan 検出のみ、coverage 検証は別) | **部分達成** (2026-05-01) — selfHostingGuard.test.ts Test 3 が orphan 検出 + baseline=6 ratchet-down で漸次解消の入口を articulate。Phase 2 で各 orphan に対応 rule binding を追加して baseline=0 達成、または独立 metaRequirementBindingGuard として spawn (本 row scope) |

### follow-up project 配置方針

- Project E (DecisionTrace + AI utilization) candidate に統合する option がある (= AAG framework の
  decision traceability + AI 対応性が深まる方向で 5 sub-audit を吸収)
- または independent な「AAG framework integrity sub-audit」project を spawn する option もある
- Project A〜D 完了後 (Project B Phase 5 完遂時点で 3/4 完了、Project C は別途進行中) に
  follow-up project の spawn 判定 (本 project 5.5 文献での explicit articulation 不要、
  Project A〜D 完了後の judgment gate に逃がす)

## §7 関連 doc

| doc                                                  | 役割                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `projects/completed/aag-bidirectional-integrity/plan.md` §3.4  | SemanticTraceBinding 設計の正本 (型 schema 含む)                                |
| `references/01-principles/aag/meta.md` §2            | `AAG-REQ-*` requirement 12 件の供給元                                           |
| `app/src/test/aag-core-types.ts`                     | 型実装 (Project B Phase 1 で landing)                                           |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | binding 物理正本 (Project B Phase 2 で initial value 装着、Phase 3 で順次 flip) |
| `projects/completed/aag-rule-schema-meta-guard/`               | Project B 本体                                                                  |
