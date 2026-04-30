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

## §4 batch 2〜N (残 rule、protocol 適用) の運用

batch 2 以降の運用方針:

- 本 protocol §2 の品質基準を満たす articulation を 161 rule に適用
- 自然な domain mapping (slice / principleRefs / doc field) から canonical doc + AAG-REQ を導出
- 1 rule 1 doc + 1 rule 1 AAG-REQ を default、複数 ref が必要な場合のみ refs[] に追加
- Discovery Review (人間レビュー) で意味品質を補完 — protocol §2 は機械検証 hard fail criteria、意味の妥当性は人間判断

`status='not-applicable'` の articulate 例 (該当しない rule):

- AAG framework と orthogonal な domain rule (例: 業務計算式の禁止 import 等) → `metaRequirementRefs` を `not-applicable` で justify
- 各 rule に対して「対応する AAG-REQ がない」場合のみ not-applicable、安易な escape を避ける

## §5 関連 doc

| doc                                                  | 役割                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `projects/aag-bidirectional-integrity/plan.md` §3.4  | SemanticTraceBinding 設計の正本 (型 schema 含む)                                |
| `references/01-principles/aag/meta.md` §2            | `AAG-REQ-*` requirement 12 件の供給元                                           |
| `app/src/test/aag-core-types.ts`                     | 型実装 (Project B Phase 1 で landing)                                           |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | binding 物理正本 (Project B Phase 2 で initial value 装着、Phase 3 で順次 flip) |
| `projects/aag-rule-schema-meta-guard/`               | Project B 本体                                                                  |
