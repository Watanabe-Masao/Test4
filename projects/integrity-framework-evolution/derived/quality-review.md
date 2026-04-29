# quality-review — 13 dimension AAG framework review (ground truth)

> **本 doc の位置づけ**: 前駆 project `canonicalization-domain-consolidation` の Phase A〜I 完遂後の最終 review session で identified された structural / institutional gap の **machine-readable ground truth**。本 project (`integrity-framework-evolution`) Phase R/H/I の意思決定根拠として機能する。
>
> **更新規律**: review の本体 (problem identification) は immutable archive。Phase R で個別 gap を解消するたびに `resolution[]` に追記する形で運用。
>
> **生成日**: 2026-04-29

## 0. メタ情報

- review session: canonicalization-domain-consolidation Phase A〜I 完遂直後
- review 対象: AAG framework + 整合性 domain + KPI / collector / guard / doc 群
- review dimensions: 13 (Pre-Phase-H pre-merge audit)

## 1. 7 つの構造 pattern

### 傾向 1: 正本性の単方向化

「A は B の正本」と宣言される箇所は多いが、**B が A を逆参照する機械検証は薄い**。

**evidence**:
- `adoption-candidates.json` ↔ `app-domain/integrity/` 実装 — Phase E 振り返り fix #3 で発覚した primitive 名 drift (shapeSync / tokenInclusion / jsdocTag)
- `COVERAGE_MAP` (test) ↔ `integrity-collector.ts` (collector) 間の duplicate logic — Phase G で landing したが drift risk が残る
- `references/README.md` 索引 ↔ 実 file — 毎 phase で発生した obligation 違反
- `doc-registry.json` label ↔ 実 doc 内容 — label が stale 化する反復事例

**root cause**: 正本が「権威」として宣言されるだけで、「双方向に整合する mechanism」になっていない。

**resolution path**: 構造的問題 A → Phase R-① Bidirectional Canonical Contract schema

### 傾向 2: 時間軸の構造的不在

decision の trace (when / who / why / 反転条件) が schema 化されておらず散在。

**evidence**:
- `rejected[]` archive は Phase E 振り返りで schema 化、`accepted` 側は無い (採用判断 trace 喪失)
- Phase 内 judgment は commit log のみ、`legacy-retirement.md §7` / `recent-changes.md` / `taxonomy-origin-journal.md` で domain ごとに散在
- `@deprecated` は時間 marker (since / expiresAt) を持つが、新規採用は時間 marker を持たない (非対称)

**root cause**: AAG は present-state の検証に特化、history が制度化されていない。

**resolution path**: 構造的問題 B → Phase R-② Time-axis Decision Record schema

### 傾向 3: judgement と mechanism の境界が降り切っていない

機械化可能な部分が「気をつける」 prose に留まっている箇所。

**evidence**:
- §P9 step 5 直接到達条件: `caller >= 5 file` は機械判定可能、判断は prose
- selection rule G-1/G-2/G-3: 「subjective 語の混入禁止」は grep で機械可能、人間判断
- helper / adapter 命名規約: 文章記述のみ

**root cause**: mechanism に降りられる箇所まで降りていない。

**resolution path**: 構造的問題 C → Phase R-③ mechanism/judgement/hybrid 3-zone 制

### 傾向 4: marker と state machine の混同

Phase / lifecycle / 採用判断が section header (marker) で表現され、状態遷移 (state machine) になっていない。

**evidence**:
- contentSpec / taxonomy は 6 lifecycle states を持つ、整合性 domain は state 概念なし
- "deferred" が 3 つの異なる意味で使われる (pair migration deferred / candidate handoff / permanently rejected)
- Phase A〜I は marker、entry/exit criteria が state transition として定義されない

**root cause**: 状態を表現する共通 schema が domain ごとにバラバラ。

**resolution path**: Phase R-② の time-axis schema が state field を持つことで構造的解消

### 傾向 5: scope の暗黙化

「何が scope か」は判断時に明示されるが、変化が track されない。

**evidence**:
- Phase H tier1 narrowing (4→2) の trace は checklist 注記のみ
- Refactor PR の touch file allowlist は git diff で見るしかない
- `project.json implementationScope` は静的、Phase ごとの dynamic scope なし

**root cause**: scope creep / scope reduction が機械的に観測できない。

**resolution path**: Phase R-② の archive schema に `scope-changes[]` を追加

### 傾向 6: cross-domain disconnection

複数 domain で同じ pattern を再発明。

**evidence**:
- collector と guard が同 logic を duplicate (integrity)
- Promote Ceremony は spec 専用、taxonomy / integrity は別 ceremony
- Origin Journal は taxonomy のみ、integrity は半分だけ (rejected[] のみ)
- 各 domain の `APP_DOMAIN_INDEX.md` 充実度がバラバラ

**root cause**: domain 間の bridge が制度化されていない。

**resolution path**: 制度的問題 D → Phase R-④ Cross-domain Framework Layer

### 傾向 7: 再帰性 (self-application) の不足

AAG が AAG 自身を守っていない箇所。

**evidence**:
- AAG framework 自身は #14 pair として inventory 化されていない
- `integrityDomainCoverageGuard` 自身が integrity domain primitive を使っていない (dogfooding 未達)
- Phase は `project-checklist-governance` で守られるが、Phase 内の Phase rule (entry/exit) は守られない

**root cause**: 仕組みが自分自身に適用されないと、framework の信頼性が証明されない。

**resolution path**: 制度的問題 F → Phase R-⑥ Dogfooding Mandate

## 2. 構造的問題 (A/B/C)

### 問題 A: 「正本」の概念が片肺

> 現在の AAG: 「A は正本である」と宣言する
> 不足している: 「A と B の整合は双方向に強制される」

これが傾向 1 / 6 の根。**正本は宣言ではなく契約 (bidirectional contract)** であるべき。

### 問題 B: 「時間」が AAG の第 1 級概念ではない

> 現在の AAG: 「現在の状態が正しいか」を検証する
> 不足している: 「いつ / 誰が / なぜ / どう変わるか」を schema として持つ

これが傾向 2 / 4 / 5 の根。**時間は file system / runtime と並ぶ第 1 級観測対象**にすべき。

### 問題 C: 「mechanism と judgement の境界」が決まっていない

> 現在の AAG: 「気をつける」と「機械検証する」が混在し、降りられる範囲が一律でない
> 不足している: 「ここまで mechanism、ここから judgement、その境界で何を要求するか」が制度化されていない

これが傾向 3 / 7 の根。**mechanism / judgement / hybrid の 3 領域を明示し、各領域で要求する artifact を schema 化**すべき。

## 3. 制度的問題 (D/E/F)

### 問題 D: domain ごとの自治が強すぎる

各 domain (taxonomy / contentSpec / integrity) が独自に schema / ceremony / index を持つため、共通 pattern が再発明される。**domain は subject の specialization、framework は cross-domain に共通**であるべき。

### 問題 E: judgement の artifact が標準化されていない

judgement (採用 / 撤退 / refactor / scope 変更) ごとに要求される artifact が domain ごとにバラバラ。「judgement は必ずこの artifact が必要」という standard が無い。

### 問題 F: introspection / dogfooding が義務化されていない

AAG が自分自身を守る義務が無い。**「framework の自己適用」が optional な culture** に留まっている。

## 4. 13 dimension review summary table

| # | dimension | 主要 gap | resolution path |
|---|---|---|---|
| 1 | 整合性品質 | 機械検証は強い (Hard 化済) | Phase R で contract schema 適用、cross-domain 拡大 |
| 2 | 機械的保証品質 | 「気をつける」 prose 依存箇所が 7 件 | Phase R-③ 3-zone 制で構造解消 |
| 3 | 運用品質 | health regen trigger 多重化、Hard Gate fail の対処経路非 KPI specific | 個別 fix (deferred to 第 5 の柱) |
| 4 | フィードバック品質 | assertion message quality バラつき、KPI に diagnostic[] 不在 | 個別 fix (deferred) |
| 5 | コンテキスト動線品質 | 7+ doc 散在、APP_DOMAIN_INDEX.md 未活用 | Phase R-④ で integrity index 整備 |
| 6 | 再発防止品質 | hardcode stale (skeleton fix #1 と同種)、retrospective ad-hoc | Phase R-① contract schema + 第 5 の柱で retrospective 制度化 |
| 7 | プロジェクト管理品質 | project.json status stale、cross-project dependency なし | 第 5 の柱 (project lifecycle governance) に handoff |
| 8 | プロジェクト進行品質 | Phase prerequisite 後付け、scope creep trace 不在 | 第 5 の柱に handoff |
| 9 | 問題検知品質 | silent fail risk (collector regex)、複合違反見落とし | Phase R-① contract pattern + 個別 sanity check |
| 10 | 課題検知品質 | leading indicator 不在、stale risk 検知薄い | 第 5 の柱に handoff |
| 11 | 新規実装品質 | primitive 仕様書なし、KPI 追加 review 経路なし | Phase R-⑤ Decision Artifact Standard |
| 12 | リファクタリング品質 | やりすぎ防止 mechanism なし、refactor scope creep | Phase R-⑤ + 第 5 の柱 |
| 13 | 旧制度撤退品質 | §P9 判定の機械化弱い、撤退判断 trace 薄い、retired[] archive 不在 | Phase R-② time-axis schema + retired[] 追加 |

## 5. 本 project scope と handoff の境界

### 本 project (`integrity-framework-evolution`) で扱う

- 構造的問題 A/B/C → Phase R-①/②/③
- 制度的問題 D/E/F → Phase R-④/⑤/⑥
- horizontal expansion (wasm + charts + hooks) → Phase H
- 整合性 domain への 3-zone 適用 → Phase I

### 第 5 の柱 (Project Lifecycle Governance、未起案) に handoff

- dimension 7 (PM): project lifecycle KPI / dependency graph / archive transition
- dimension 8 (PP): Phase Progression State Machine / scope log / rollback strategy
- dimension 10 (課題検知): leading indicator / warnAt threshold / stale risk
- dimension 12 (リファクタリング): Refactoring Audit Bundle (caller fan-out / behavior snapshot)
- AR rule `mechanicalSignal` field 全件追加
- Mandatory Retrospective trigger
- KPI に `failHint / diagnostic[]` 全件

## 6. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。前駆 project 最終 review session の 13 dimension findings を ground truth として保存。本 project (integrity-framework-evolution) の Phase R/H/I の意思決定根拠 |

## 7. Meta-AAG insight (2026-04-29 統合、外部レビューより)

13 dimension review の **傾向 7 (再帰性 / self-application 不足)** をさらに深堀りする外部レビューにより、本 project に **Meta-Governance layer** が必要であることが判明した。

### 7.1 4 layer model

```
Layer 1: AAG (architecture rules / guards / KPIs) — protects the product
Layer 2: Meta-AAG (Phase Q deliverables) — protects AAG
Layer 3: Health (architecture-health.json + collector) — validates both layers
Layer 4: Human review (irreversible transitions) — controls archive / promotion / constitutional change
```

### 7.2 Phase R 単独の risk

Phase R は AAG 自身を変更する操作。Meta-AAG なしに進めると次の anti-pattern を引き起こす:

```
品質を守る仕組みが肥大化する
  ↓
理解不能になる
  ↓
例外が増える
  ↓
guard が信用されなくなる
  ↓
AAG が目的化する
  ↓
本体開発の速度と品質を下げる
```

13 dimension review の傾向 7 がこの risk の片鱗を捉えていたが、institutional answer (Meta-Governance Pack) として体系化されていなかった。

### 7.3 Meta-Governance Pack (10 要素)

外部レビューで提示された 10 要素を本 project Phase Q として institutionalize:

| # | 要素 | 解消する dimension |
|---|---|---|
| Q-1 | AAG_CHANGE_IMPACT template | dimension 4 (フィードバック) / 11 (新規実装) |
| Q-2 | AAG invariant list (8 hard invariants) | dimension 1 (整合性) / 6 (再発防止) / Meta-Governance 全般 |
| Q-3 | AAG meta-guards (8 件) | dimension 2 (機械的保証) / 9 (問題検知) / 13 (旧制度撤退) |
| Q-4 | AAG degradation KPIs (10 件) | dimension 4 (フィードバック) / 10 (課題検知) |
| Q-5 | AAG promotion gate (L0-L7) | dimension 11 (新規実装) / 12 (リファクタリング) |
| Q-6 | Canary rollout policy (Phase 0-4) | dimension 8 (進行) / 12 (リファクタリング) |
| Q-7 | AAG rollback policy | dimension 8 (進行) / 13 (撤退) |
| Q-8 | Governance review checklist | dimension 7 (PM) / 11 (新規実装) |
| Q-9 | Guard failure playbook | dimension 4 (フィードバック) / 6 (再発防止) |
| Q-10 | AAG overview / critical rule view | dimension 5 (動線) |

### 7.4 AAG 5.2 の先行例

Meta-Governance pattern は完全に新しい概念ではない。AAG 5.2 で既に部分実装されている:

- `project-checklist-collector` の実装と governance 規約の非対称を発見
- collector の heading 抑制ロジックを削除
- `checklistGovernanceSymmetryGuard.test.ts` で再発防止

これは **AAG 自身の不整合を AAG の対象として扱った最初の実例**。Phase Q-3 はこの pattern を 8 件に generic 化する。

### 7.5 (Review 1) 結論

本 project の North Star を以下に書き換え:

> **AAG protects the product / Meta-AAG protects AAG / Health validates both / Human review controls irreversible transitions**

これにより本 project は単なる「整合性 framework の進化」ではなく、**「AAG を進化させるための AAG」 = Meta-AAG を初実装する canary project** として位置づけられる。

## 8. Operational Refinement insight (2026-04-29 統合、外部レビュー 2 より)

Review 1 (Meta-AAG) と相補的な、**運用洗練軸** の外部レビューが提示された。本 project Phase Q を 2 軸構造に再編する根拠となる。

### 8.1 Review 2 の central thesis

> **AAG を一段上げる政策は『さらに rule を増やす』ではなく、『強い仕組みを、迷わず・軽く・成果に接続して使える状態にする』**

現状の AAG は既に成熟 (Healthy / Hard Gate PASS / 53 KPI OK)。次の課題は強さの追加ではなく **運用の洗練** = onboarding / navigation / triage / efficacy。

### 8.2 認知負荷リスク

- rule 162 件 / guard test file 114 件 → 初見者が「どこから読めばよいか / 何が最重要か」把握不能
- 全 rule 同列運用 → 危険度が見えない
- guard failure message が検出止まり → 修理経路が見えない
- KPI が「量」中心 → 効果が見えない

### 8.3 Review 2 の 9 政策 → Phase Q operational axis に統合

| Review 2 政策 | 本 project 統合先 |
|---|---|
| 1. 「AAG を増やす」から「AAG を使いやすくする」へ | Phase Q 全体の framing 軸 |
| 2. Risk tiering (Tier 0-3) | Q.O-2 |
| 3. Efficacy KPIs (preventedRegression / meanTimeToFix 等) | Q.O-6 (Q.M-4 と同 collector の efficacy vue) |
| 4. Content Spec L4 化 | **本 project scope 外** (別 project: phased-content-specs-rollout、archive 候補) |
| 5. Project governance 一覧性 | Q.O-5 (projects 直下 README) |
| 6. Guard failure → remediation | Q.O-4 (Repair-style guard messages) |
| 7. AAG 自体の RFC / impact report | Q.M-1 (AAG_CHANGE_IMPACT、Review 1 と統合) |
| 8. Change classification (Micro/Local/System/Constitutional) | Q.O-3 |
| 9. AAG の目的化防止 (anti-bloat) | Q.M-2 (invariant list 9 番目として追加) |

### 8.4 2 軸構造 (Review 1 + Review 2 統合)

Phase Q の re-framing:

```
                    Phase Q: AAG Maturation
                    ┌──────────────────────────────┐
                    │  operational axis (Review 2) │
                    │  Q.O-1〜Q.O-6                 │
                    │  認知負荷削減 + 効果測定      │
                    │                                │
                    │  meta-governance axis (Review 1)│
                    │  Q.M-1〜Q.M-8                 │
                    │  AAG 自己保護                 │
                    └──────────────────────────────┘
                              ↓
                    Phase R を 2 軸で protect
```

### 8.5 anti-bloat invariant の特殊な位置づけ

Review 2 の 9 番目政策「AAG の目的化を防ぐ」は、**他の全 invariant の前提条件**として機能する。具体的には:

> 新 rule / doc / project を追加する前に、次の質問に答える:
> 1. この rule は何の事故を防ぐのか?
> 2. 既存 guard では防げないのか?
> 3. 発火時に修正可能か?
> 4. false positive はどの程度か?
> 5. 誰が読むのか?
> 6. 運用コストは増えるか?
>
> 答えられない rule / doc / project は追加しない。

本 invariant は Q.M-2 invariant list の 9 番目として入るが、運用上は **すべての AAG 改修 PR の冒頭 review** に位置づけられる (Q.M-1 AAG_CHANGE_IMPACT template の冒頭 section)。

### 8.6 結論

Review 1 (defensive Meta-AAG) と Review 2 (offensive Operational refinement) は補完的。両者を統合した本 project の最終 thesis:

> **AAG を「強い品質ゲート」から、「低認知負荷で、リスクに応じて、修正まで導く、自己劣化を防ぎながら進化する品質運用 OS」へ進化させる**

これが Phase Q (2 軸 14 要素) → Phase R (6 reform) → Phase H (3 候補) → Phase I (institutionalization) の 4 phase 構造で実現される設計。

## 9. resolution log (Phase Q/R 進行に応じて追記)

(空 — Phase Q.O-1 着手 PR で AAG_OVERVIEW.md の resolution を追記する)

## 10. Phase Q scope reduction (2026-04-29、anti-bloat self-test 結果)

§7 (Meta-AAG insight) + §8 (Operational Refinement insight) で提示された 14 要素 (Q.O-1〜Q.O-6 + Q.M-1〜Q.M-8) を **anti-bloat invariant (Q.M-2 #9 で提示された self-test)** に対して照合した結果、**14 要素中 4 要素のみを採用**、2 要素を保留 (採用後に再評価)、8 要素を cut (Phase R で実害 evidence が出た時のみ additive 追加) と判定した。

### 10.1 self-test の照合結果

anti-bloat invariant が要求する 6 質問 (§8.5):

1. この rule は何の事故を防ぐのか?
2. 既存 guard では防げないのか?
3. 発火時に修正可能か?
4. false positive はどの程度か?
5. 誰が読むのか?
6. 運用コストは増えるか?

これに対する evidence:

- **AAG の現状**: Healthy / Hard Gate PASS / 57 KPIs OK / 0 WARN / 0 FAIL — bloat の **実害 evidence なし**
- **前駆 project の実績**: canonicalization-domain-consolidation Phase A〜I を Meta-AAG **不在で成功**
- **13 dim review の input source**: 前駆 project の "進めながら整える" 実績そのもの = 構造的 gap が **可視化されたのは進めながら整えた結果**
- **規模**: 1 人 dev project、onboarding cognitive load の対処 evidence が薄い
- **external review の audit 性**: review 1 / 2 の原文が project に保存されておらず、justification chain が検証不能

### 10.2 採用判定 4 件

| ID | 採用理由 |
|---|---|
| Q.O-1 (3 入口 doc) | onboarding は low-cost / low-risk、削除も容易、AAG 自身の文書整合性に貢献 |
| Q.O-2 (Tier 0-3) | rule importance 差別化は実利あり、Tier 0 最小指定で初期コスト削減 |
| Q.O-4 (Repair-style messages) | actionable error は universal good、AagResponse の延長 |
| Q.M-1 (CHANGE_IMPACT template) | PR checklist は cheap、AAG 変更 PR review 質向上 |

### 10.3 保留判定 2 件 (採用 4 件 landing 後に再評価)

- **Q.O-3 (Change classification)**: projectization Level 1-4 + Q.M-1 CHANGE_IMPACT template が PR 入口判定をどこまで吸収できるか観察してから判断
- **Q.O-5 (auto-generated README)**: Q.O-1 AAG_OVERVIEW.md が project navigation も兼ねられるか観察してから判断

### 10.4 cut 判定 8 件

| ID | cut 理由 |
|---|---|
| Q.O-6 / Q.M-4 (14 efficacy KPIs) | speculative、Phase R で measurement gap が出てから additive 追加 |
| Q.M-2 (9 invariants doc) | anti-bloat / no-resurrect は既存 AAG 第 7 / 第 8 原則に内包 |
| Q.M-3 (8 meta-guards) | speculative、drift 事例が出てから ratchet で追加 |
| Q.M-5 (promotion gate L0-L7) | 1 人 project で過剰 ceremony |
| Q.M-6 (canary rollout) | 同上 |
| Q.M-7 (rollback policy) | 既存の git revert + allowlist 機構で代替可能 |
| Q.M-8 (2 段 review) | 1 人 project で過剰 |

### 10.5 cut 要素の復活経路

cut した要素は **Phase R 進行中に実害 evidence が出た時のみ additive 追加** (YAGNI)。anti-bloat invariant が cut した要素自身を抑制する。復活時は §10 に evidence を追記する。

### 10.6 §7 / §8 との関係

§7 Meta-AAG insight + §8 Operational Refinement insight は **観察と提案として保存**するが、提案 14 要素全てを採用する義務はない。external review の **思想は input**、**採用判断は project が行う** (canonicalization-principles.md 第 8 原則と同型)。本 §10 は採用判断の trace。
