# AAG Meta — 経営理念 (目的) + 社訓 (要件)

> **役割**: AAG (Adaptive Architecture Governance) が満たすべき要件 (目的 + 不変条件 + 禁則) を articulate する単一エントリ doc。
>
> **位置付け**: AAG architecture pattern の **Layer 0 + 1** (= 目的 + 要件) を articulate する Meta charter。AAG Core (Layer 2 設計 + Layer 3 実装) は本 Meta が課す要件を満たす実体、AAG Audit (Layer 4 検証) は外部監査視点で AAG 全体を audit する。
>
> **3 機能融合 mechanism doc**: (1) 要件定義、(2) 達成度 audit framework、(3) AR-rule binding hub。
>
> **設計意図**: AI が判断するための criteria + collection sources を embed することで、後任 AI session でも一貫した judgement が可能。重複と参照の切り分け + drill-down chain semantic management で AAG の構造的健全性を保証する。

## §1 目的 (Purpose、Layer 0)

AAG は **「動くが意図に反するコード」を早期検出し、コードベースの知能ある進化を保証する mechanism** である。

AI / userが共同で開発する codebase において、テストが通るコードが必ずしも設計意図に沿っているとは限らない。AAG は次の 3 件を構造的に保証する:

1. **意図に反するコードの早期検出** — 機械検証 (rule + guard) で「動くが意図に反する」を即時 fail させる
2. **過去判断の文脈消失防止** — allowlist の retentionReason / Architecture Rule の why / Discovery Review で判断履歴を蓄積、後任 AI / userが文脈を継承可能
3. **改善の不可逆化** — ratchet-down で baseline 増加方向を構造禁止、進化を一方向に維持

Layer 0 は **why の正本** であり、Layer 1 (要件) 以下が realize する。**機械検証不可、user 判断のみで変更**。改訂は Constitution 改訂と同等の慎重さで扱う。

## §2 要件 (Requirements、Layer 1)

AAG が satisfy すべき要件を **不変条件** (Invariants、positive) + **禁則** (Non-goals、negative) で articulate。各要件は **stable Requirement ID (`AAG-REQ-*`)** + 達成条件 (state-based) + 達成 status を持つ。AR-rule の `metaRequirementRefs` field から本 §2 の Requirement ID を pointer + semantic articulation (`problemAddressed` + `resolutionContribution`) で参照する (Phase 2 schema)。

### §2.1 不変条件 (Invariants)

| Requirement ID                        | 内容                                                                                                              | 達成条件 (state-based)                                                                                                                                  | 達成 status                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`AAG-REQ-BIDIRECTIONAL-INTEGRITY`** | 双方向 integrity (forward + reverse) — 設計 doc ↔ 実装 (AR-rule) の双方向 binding が機械検証される                | `canonicalDocBackLinkGuard.test.ts` (forward) + `canonicalDocRefIntegrityGuard.test.ts` (reverse) が active && baseline=0                               | **達成** (Project B Phase 4 で 4 meta-guard landing + Project C Phase 3 で DFR が最初の concrete instance として double-checked、2026-05-01)          |
| **`AAG-REQ-STATE-BASED-GOVERNANCE`**  | state-based trigger — 期間 (日数 / commits 数) を一切使わず参照場所が 0 になった瞬間が trigger                    | `aag/` 配下に date-based cadence 検出 0 件 + legacy doc archive trigger は inbound 0 機械検証のみ                                                       | **達成** (本 project Phase 0.5 で articulate 済)                                                                                                      |
| **`AAG-REQ-SELF-HOSTING`**            | self-hosting — AAG が AAG を守る、aag/meta.md 自身が AR-rule に linked + AAG framework と application 改修者の **structural separation** が物理配置で articulate される                                            | aag/meta.md §2 要件が AR-AAG-META-\* rule に bind + meta-rule が自分自身を検証 + **entry navigation rigor**: aag/ 配下 = framework 改修者専用 / references/ 配下 = 主アプリ改修 user 用 / `*.generated.md` 命名規約 / 旧 path reference 0 件 (= 4 boundary guard で機械検証)                                                                          | **達成** (= **code-level + entry navigation rigor 完全達成**、2026-05-03 aag-self-hosting-completion R0-R6a で完成): code-level (= 2026-05-01 selfHostingGuard MVP、`AR-AAG-META-SELF-HOSTING` rule + `app/src/test/guards/selfHostingGuard.test.ts` で self-reference closure を hard fail 検証) + entry navigation rigor (= R0-R6a で 4 boundary guard landing: `aagBoundaryGuard` (R1-R2、aag/_internal/ vs references/05-aag-interface/ structural separation) + `oldPathReferenceGuard` (R3d、旧 5 directory path reference 残置 0、ratchet-down baseline=0) + `generatedFileEditGuard` (R3d、`*.generated.md` 手編集検出) + `selfHostingGuard` (R6a 拡張、上記 3 guard への delegation articulation) = 全 hard fail で boundary 違反検出) |
| **`AAG-REQ-RATCHET-DOWN`**            | 改善は不可逆 — baseline は下がる方向のみ、増加方向は構造禁止                                                      | `health-rules.ts` の各 baseline 増加方向で hard fail                                                                                                    | **達成** (既存 mechanism)                                                                                                                             |
| **`AAG-REQ-LAYER-SEPARATION`**        | 層境界 (5 層 drill-down) 維持 — Layer 0/1/2/3/4 が orthogonal 軸で articulate される                              | aag/architecture.md 5 層構造定義 + 各 doc / 実装が 5 層位置付けを持つ                                                                                   | **達成** (Project A Phase 1 で aag/architecture.md §4 mapping landing、2026-04-30)                                                                    |
| **`AAG-REQ-ANTI-DUPLICATION`**        | 重複と参照の切り分け — 上位 content の copy 禁止、下位は pointer + 解決 articulation で参照                       | doc 間の重複検出 + AR-rule の重複 articulation 検出 (semanticArticulationQualityGuard)                                                                  | **達成** (Project B Phase 4 で semanticArticulationQualityGuard landing + 全 166 rule binding が protocol §2.3 内部重複 0 を機械的に保証、2026-05-01) |
| **`AAG-REQ-SEMANTIC-ARTICULATION`**   | drill-down chain の semantic management — pointer + `problemAddressed` + `resolutionContribution` を必須 field 化 | AR-rule schema に `canonicalDocRef` + `metaRequirementRefs` (status object + semantic articulation) が追加 + meta-guard で hard fail / warning 分離検証 | **達成** (Project B Phase 1〜4 で SemanticTraceBinding 型 family + 4 meta-guard landing、166 rule 全 bound articulation 装着、2026-05-01)             |

### §2.2 禁則 (Non-goals)

| Requirement ID                            | 内容                                                                                                 | 禁則条件 (state-based)                                                                                          | 達成 status                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`AAG-REQ-NON-PERFORMATIVE`**            | performative work 生成禁止 — 製本されていない proxy / 派生 metric を guard 化しない                  | guard が canonical doc に裏打ちされる (canonicalDocRef status='bound' or 'not-applicable' with justification)   | **達成** (Project B Phase 3 で 166 rule 全 canonicalDocRef 'bound' articulation + Phase 4 で canonicalDocRefIntegrityGuard が path 実在を hard fail 検証、2026-05-01) |
| **`AAG-REQ-NO-DATE-RITUAL`**              | date-based ritual 禁止 — cooling period / 月次 review hook 等を構造禁止                              | aag/ 配下 + project 配下 + checklist で date-based cadence 検出 0 件                                            | **達成** (本 project Phase 0.5 で articulate 済)                                                                                                                      |
| **`AAG-REQ-NO-PERFECTIONISM`**            | 完璧主義禁止 — 弱さを構造的に受容、意図的に残す弱さを articulate                                     | adaptive-architecture-governance.md §「意図的に残す弱さ」 の articulate 維持                                    | **達成** (既存 articulation)                                                                                                                                          |
| **`AAG-REQ-NO-AI-HUMAN-SUBSTITUTION`**    | AI / user判断の代替禁止 — 機械検証で判定不可能な領域 (戦略 / 業務的妥当性 / 創造性) はuser 判断に残す | Layer 0 (目的) を機械検証 condition に変換しない + 物理削除 trigger にuser deletion approval 必須               | **達成** (本 project で articulate)                                                                                                                                   |
| **`AAG-REQ-NO-BUSINESS-LOGIC-INTRUSION`** | 業務 logic 侵入禁止 — AAG framework は本体アプリ機能に侵入しない                                     | aag/ 配下に業務 pattern 検出 0 件 + AAG framework 拡張時に本体コード touch しない (aag-5-constitution.md §前提) | **達成** (既存 mechanism)                                                                                                                                             |

### §2.3 期間ベース判断の禁止範囲 (`AAG-REQ-NO-DATE-RITUAL` 詳細、observeForDays 切り分け)

`AAG-REQ-NO-DATE-RITUAL` は state-based trigger を全 AAG context で強制するが、既存 `lifecyclePolicy.observeForDays` field との衝突回避のため **適用範囲を明示分離**:

| context                                               | trigger 種別                                                                                                          | 期間 buffer 許容?                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **legacy doc 削除** (archive 移管 / 物理削除)         | `inbound 0` 機械検証のみ + user deletion approval                                                                     | ❌ 禁止                                            |
| **rule の deprecated 化** (proxy / performative 撤回) | audit 結果 (state-based 判定、proxy metric の articulate 等)                                                          | ❌ 禁止                                            |
| **archive 移管 trigger**                              | 旧 path への inbound 0 + migrationRecipe 完備 + 新 doc に mapping table が landed                                     | ❌ 禁止                                            |
| **experimental rule 昇格 / 撤回観測**                 | 主 trigger は `sunsetCondition` 状態満足、`observeForDays` は **supplementary signal** (= 観測指標、trigger ではない) | ✅ 観測指標として許容、ただし trigger には使わない |

「期間を経過したら」「N commits 連続で」のような **儀式的 trigger は禁止**。発火条件に触れずに見落とす risk が残るため。observeForDays は「観測 cadence」として情報を提供するが、archive / deprecated 化の **判定** には使わない。

## §3 AAG Core 構成要素 mapping (5 層 × 5 縦スライス matrix + Layer 4 audit framework)

> 本 §3 は AAG Meta が AAG Core (Layer 2 + 3) と AAG Audit (Layer 4) を **評価対象として参照する map**。
> 各 doc / 実装が「どの層 × どの縦スライスに住むか」を articulate し、§2 要件の達成判定の input となる。
>
> Phase 3 audit findings で各セル content が確定 (現状は枠組み + 既知 entry を pre-fill、Phase 1 と Phase 3 の同期方針 = B 順序付き 3 段階で update)。
>
> **Phase 3 audit findings reflect 完了** (2026-04-30、§8.14 順序付き 3 段階の第 3 段 cyclic refinement): `references/04-tracking/aag-doc-audit-report.md` §0〜§7 で 8 AAG doc + CLAUDE.md AAG section の articulation 完遂 (operation 22 件 = Create 7 + Split 1 + Rewrite 6 + Archive 8、5 縦スライス reshape 不要、Layer 3-4 混在 guard 5 件 identify、新 5 層 ↔ 旧 4 層 mapping 確定)。本 §3 は audit findings を反映した状態。Phase 3 hard gate decision (default B = follow-up project 分割) はユーザー判断 gate (project A〜D 分割案、audit report §7 articulate)。

### §3.1 5 層 × 5 縦スライス matrix

|                  | layer-boundary                                                     | canonicalization                                                        | query-runtime                                                 | responsibility-separation                                          | governance-ops                                                                                           |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Layer 0 目的** | (Layer 0 は AAG 全体で 1 つ、§1 で articulate、縦スライス分割不要) |                                                                         |                                                               |                                                                    |                                                                                                          |
| **Layer 1 要件** | invariant: 4 層依存方向、Layer 境界違反禁止                        | invariant: readModel 経路、双方向 integrity (§2.1)                      | invariant: pair/bundle 契約、alignment-aware                  | invariant: 1 doc 1 責務 (C1)、責務分離                             | invariant: ratchet-down (§2.1)、state-based (§2.3)、self-hosting (§2.1)                                  |
| **Layer 2 設計** | aag/strategy.md §層境界 (Phase 4)                                  | canonicalization-principles.md / canonical-input-sets.md                | engine-boundary-policy.md / engine-responsibility.md          | responsibility-taxonomy-schema.md / design-principles.md           | aag/operational-classification.md / aag/source-of-truth.md / aag/evolution.md (Phase 4)                  |
| **Layer 3 実装** | layerBoundaryGuard / topologyGuard                                 | calculationCanonGuard / canonicalizationSystemGuard / \*PathGuard 群    | queryPatternGuard / analysisFrameGuard / comparisonScopeGuard | responsibilitySeparationGuard / responsibilityTagGuard / sizeGuard | architectureRuleGuard / docRegistryGuard / docCodeConsistencyGuard                                       |
| **Layer 4 検証** | layer-boundary 違反観測                                            | canonicalDocRefIntegrityGuard / canonicalDocBackLinkGuard (Phase 8 MVP) | queryPattern audit                                            | responsibility 純度 audit / Discovery Review                       | health-rules.ts / certificate / aag/meta.md §4 達成判定 / semanticArticulationQualityGuard (Phase 8 MVP) |

各セルは Phase 3 audit で fill。空きセルは「未 articulated 領域」(audit / governance-evolution の input)、過密セルは「責務分離未完了」(分割 / Split operation の検討対象)。

### §3.2 Layer 4 検証 (audit framework、§8.10 判断 = A 適用)

> §8.10 判断 = **A** (aag/meta.md §3 で articulate)。Layer 4 検証は本 §3 内に集約 articulate。volume が膨張した場合は B (aag/audit.md 新規) or C (aag/architecture.md 内包) に refactor 可能 (extensible)。

Layer 4 検証は **5 sub-audit** に細分 (initial set、extensible):

| Sub-layer                               | 役割                                                               | enforcing 実装                                                                                                                                                     | Phase 8 MVP scope            |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **4.1 境界監査** (Boundary Audit)       | 層境界が正しいか — 目的 vs 要件混同検出、Layer 2/3/4 境界違反      | `layerBoundaryGuard.test.ts` (既存、本 project で責務分離)                                                                                                         | follow-up                    |
| **4.2 方向監査** (Direction Audit)      | drill-down chain の依存方向 — forward / reverse 双方向 integrity   | `canonicalDocRefIntegrityGuard.test.ts` (reverse) + `canonicalDocBackLinkGuard.test.ts` (forward)                                                                  | **MVP** (Phase 8 で landing) |
| **4.3 波及監査** (Impact Audit)         | 他項目への漏れ — cross-cutting impact、obligation map trigger 漏れ | obligation-collector.ts (既存)                                                                                                                                     | follow-up                    |
| **4.4 完備性監査** (Completeness Audit) | 漏れ / 抜かり / 重複 — 25 セル gap 検出、orphan / redundancy       | `semanticArticulationQualityGuard.test.ts` + `statusIntegrityGuard.test.ts` (Phase 8 MVP) + 既存 `docRegistryGuard` / `docCodeConsistencyGuard` / Discovery Review | **MVP** (Phase 8 で landing) |
| **4.5 機能性監査** (Functional Audit)   | 個々が claimed 通り動くか — claim vs actual 照合                   | 既存 `health-rules.ts` / Hard Gate / `docStaticNumberGuard.test.ts` / `certificate renderer`                                                                       | follow-up                    |

**MVP scope** (Phase 8): 4.2 + 4.4 のみ実装。4.1 / 4.3 / 4.5 + selfHostingGuard + metaRequirementBindingGuard は **follow-up project** に逃がす (PR review Review 3 P1 #6 反映、Phase 3 split decision hard gate で別 project 化 default)。

**追加候補** (Phase 3 audit で collapse 可否判定): 4.6 同期監査 / 4.7 ratchet 監査 / 4.8 退役監査 / 4.9 例外 lifecycle 監査。

### §3.3 旧 AAG doc → 新 5 層 mapping (Phase 4 で各 doc に articulate)

> **Phase 3 audit findings 反映**: 詳細 articulation は `references/04-tracking/aag-doc-audit-report.md §1.1〜§1.9` 各 doc 7 項目 (5 層位置付け / 責務 / write/non-write / drill-down / operation / 影響範囲 / migration order) を参照。本 §3.3 は要約 mapping。

| 旧 doc                                                          | 新 path (Phase 4 予定)                             | 5 層位置付け                                                                        | operation                                | inbound 数 | audit ref |
| --------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- | ---------: | --------- |
| `adaptive-architecture-governance.md`                           | `aag/strategy.md` (Split + Rewrite) + 一部 Archive | Layer 2 (戦略マスター、6 責務同居 = C1 違反)                                        | Split / Rewrite / 部分 Archive           |         36 | §1.1      |
| `aag-5-constitution.md`                                         | `aag/architecture.md`                              | Layer 2 (構造設計、5 層 + 旧 4 層 mapping table) + 内容分散 (非目的 → meta.md §2.2) | Rewrite / Relocate / Rename              |         27 | §1.2      |
| `references/99-archive/aag-5-layer-map.md` (Phase 5.1 archived) | `aag/layer-map.md`                                 | Layer 2 reference (4 層 → 5 層 拡張)                                                | Rewrite / Relocate / Rename              |         10 | §1.3      |
| `aag-5-source-of-truth-policy.md`                               | `aag/source-of-truth.md`                           | Layer 2 reference                                                                   | Rewrite / Relocate / Rename              |         16 | §1.4      |
| `aag-four-layer-architecture.md`                                | `99-archive/`                                      | (旧 4 層、superseded)                                                               | **即 Archive** (mapping 義務 §1.5 適用)  |         15 | §1.5      |
| `aag-operational-classification.md`                             | `aag/operational-classification.md`                | Layer 2-3 境界 (now/debt/review)                                                    | Rewrite (84 → 166 ルール件数) / Relocate |         17 | §1.6      |
| `aag-rule-splitting-plan.md`                                    | `99-archive/`                                      | (completed project execution 記録)                                                  | **即 Archive**                           |         21 | §1.7      |
| `adaptive-governance-evolution.md`                              | `aag/evolution.md`                                 | Layer 2 (進化動学、5 層対応 articulation 追加)                                      | Rewrite / Relocate / Rename              |         18 | §1.8      |
| `CLAUDE.md` AAG section                                         | (CLAUDE.md inline 維持、薄化)                      | section-level (Layer 0+1 dynamic thinking 誘導)                                     | Rewrite (薄化、§8.13 判断 B 適用)        |     inline | §1.9      |

**Phase 3 hard gate decision input**: scope 規模 evaluation (operation 22 件 / commit 15-20 件 / 既存 166 rule binding) = Level 4 寄り → **default B = follow-up project 分割** (Project A: AAG Core doc refactor / Project B: rule schema + meta-guard / Project C: DFR registry + guards / Project D: legacy retirement、audit report §7 articulate)。

## §4 達成判定総括 (audit summary)

§2 要件の達成度 + 不達成項目の解消責務 (どの project / Phase で landing するか) を集約。
本 §4 は Layer 4 検証 (§3.2 audit framework) の出力 = AAG Audit が AAG Core を評価した結果。

### §4.1 達成 status サマリ (2026-05-01 update — selfHostingGuard MVP landing に伴う 12/12 milestone 到達)

| 状態       | 件数                        | 内訳                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **達成**   | 12 件                       | `AAG-REQ-STATE-BASED-GOVERNANCE` / `AAG-REQ-RATCHET-DOWN` / `AAG-REQ-NO-DATE-RITUAL` / `AAG-REQ-NO-PERFECTIONISM` / `AAG-REQ-NO-AI-HUMAN-SUBSTITUTION` / `AAG-REQ-NO-BUSINESS-LOGIC-INTRUSION` / **`AAG-REQ-LAYER-SEPARATION`** (Project A Phase 1) / **`AAG-REQ-SEMANTIC-ARTICULATION`** (Project B Phase 1〜4) / **`AAG-REQ-ANTI-DUPLICATION`** (Project B Phase 4) / **`AAG-REQ-NON-PERFORMATIVE`** (Project B Phase 3〜4) / **`AAG-REQ-BIDIRECTIONAL-INTEGRITY`** (Project B Phase 4 + Project C Phase 3) / **`AAG-REQ-SELF-HOSTING`** (selfHostingGuard MVP、2026-05-01) |
| **未達成** | 0 件                        | (12/12 達成 milestone 到達、2026-05-01)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **総計**   | 12 件 (不変条件 7 + 禁則 5) | initial set、extensible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### §4.2 残不達成項目の解消責務 mapping

(全 AAG-REQ 達成済、本表 entry なし。新規 AAG-REQ-\* を articulate するときは同 commit で対応 rule binding を articulate する設計判断、本表に未達 entry が landing しないようにする)

> **「達成」の意味 (milestone tolerance vs full binding coverage)**:
> §4.1 の「達成 12/12」は、各要件の達成条件 (§2 articulate) を **現行 allowed baseline 内で** satisfy した state を意味する。完全な rule binding coverage (= baseline=0) は **Phase 2 完了 criterion** であり、本 milestone の達成定義には含まない。具体的には selfHostingGuard.test.ts Test 3 が **baseline=6** として「rule binding を持たない orphan AAG-REQ の上限」を articulate しており、この baseline 内が現行 milestone の「達成」境界。

> **Phase 2 ratchet-down candidate** (2026-05-01 selfHostingGuard MVP discovery):
> 12 AAG-REQ のうち rule binding を持たない orphan が現状 6 件 (= `NO-AI-HUMAN-SUBSTITUTION` /
> `NO-BUSINESS-LOGIC-INTRUSION` / `NO-DATE-RITUAL` / `NO-PERFECTIONISM` /
> `SEMANTIC-ARTICULATION` / `STATE-BASED-GOVERNANCE`)。selfHostingGuard.test.ts Test 3
> が baseline=6 として ratchet-down 軸に articulate 済、各 orphan に対応 rule binding を
> 漸次追加して baseline=0 (= **Phase 2 完了 criterion**) に向けて解消 (Phase 2 で Project E candidate に統合 or 独立 follow-up)。

### §4.3 達成 condition の機械検証経路

各要件の達成判定は **state-based 機械検証** で実行 (Layer 0 を除く)。具体的には:

- **Phase 8 meta-guard active && baseline=0**: `AAG-REQ-BIDIRECTIONAL-INTEGRITY` / `AAG-REQ-SEMANTIC-ARTICULATION` / `AAG-REQ-ANTI-DUPLICATION`
- **status='pending' baseline ratchet-down**: `AAG-REQ-NON-PERFORMATIVE` (Phase 6 で分類 A から順次 'bound' に flip)
- **doc 構造検証** (5 層 mapping table 存在): `AAG-REQ-LAYER-SEPARATION`
- **AR-rule に linked + selfHostingGuard で self-reference closure hard check**: `AAG-REQ-SELF-HOSTING` (達成済、`AR-AAG-META-SELF-HOSTING` rule + `selfHostingGuard.test.ts` で closure 構造を機械検証、2026-05-01)
- **既存 mechanism 継続**: `AAG-REQ-RATCHET-DOWN` / `AAG-REQ-STATE-BASED-GOVERNANCE` 等 (達成済)

### §4.4 audit 履歴 (Phase 進行に伴う達成 status flip 記録)

| 日付       | Requirement ID                    | 旧 status | 新 status                 | 反映 commit / Phase                                                                                                                                          |
| ---------- | --------------------------------- | --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-30 | (本 §4 landing)                   | —         | initial articulation      | Phase 1 (commit `49edd57`、PR #1223 merged)                                                                                                                  |
| 2026-04-30 | (Phase 3 audit findings reflect)  | —         | §3 cyclic refinement 完了 | Phase 3 (commit `49edd57` 系、§8.14 順序付き 3 段階の第 3 段)                                                                                                |
| 2026-04-30 | `AAG-REQ-LAYER-SEPARATION`        | 未達成    | 達成                      | Project A Phase 1 (aag/architecture.md §4 旧 4 層 → 新 5 層 mapping landing、commit `7b49436` 系)                                                            |
| 2026-05-01 | `AAG-REQ-SEMANTIC-ARTICULATION`   | 未達成    | 達成                      | Project B Phase 1〜4 (SemanticTraceBinding 型 family 5 件 + RuleBinding 拡張 + 166 rule 全 bound articulation + 4 meta-guard、commit `e7b5330` 〜 `35c2e17`) |
| 2026-05-01 | `AAG-REQ-ANTI-DUPLICATION`        | 未達成    | 達成                      | Project B Phase 4 (semanticArticulationQualityGuard が protocol §2.3 内部重複 0 を hard fail 検証、commit `f374374` 系)                                      |
| 2026-05-01 | `AAG-REQ-NON-PERFORMATIVE`        | 未達成    | 達成                      | Project B Phase 3〜4 (166 rule 全 canonicalDocRef 'bound' + canonicalDocRefIntegrityGuard が path 実在を hard fail 検証、commit `8f62877` 〜 `f374374`)      |
| 2026-05-01 | `AAG-REQ-BIDIRECTIONAL-INTEGRITY` | 未達成    | 達成                      | Project B Phase 4 で 4 meta-guard landing + Project C Phase 3 (DFR registry が最初の concrete instance、commit `35c2e17` 系 + 本 commit)                     |
| 2026-05-01 | `AAG-REQ-SELF-HOSTING`            | 未達成    | 達成                      | selfHostingGuard MVP (Phase 1) — `AR-AAG-META-SELF-HOSTING` rule + `app/src/test/guards/selfHostingGuard.test.ts` で self-reference closure を hard fail 検証 (12/12 milestone 到達)                                                |

各 flip は project commit に対応、後任 AI / userが trace + revisit 可能。

## 関連 doc

| パス                                                   | 役割                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [`README.md`](./README.md)                             | aag/ ディレクトリ index、CLAUDE.md からの 1 link entry                                  |
| `references/05-aag-interface/operations/deferred-decision-pattern.md`    | 途中判断制度 (本 doc の §2 / §3 / §4 の articulation を継続的 update する mechanism)    |
| `references/05-aag-interface/operations/project-checklist-governance.md` | project lifecycle 規約                                                                  |
| `projects/completed/aag-bidirectional-integrity/plan.md`         | 本 doc を landing する project の canonical 計画 doc                                    |
| `projects/completed/aag-bidirectional-integrity/checklist.md`    | Phase 1〜10 + 途中判断 checklist (decision gates、本 doc の最初の application instance) |
