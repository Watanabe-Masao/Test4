# plan — integrity-framework-evolution

> **canonical 計画 doc** (2026-04-29 起草)。
> 前駆 project `canonicalization-domain-consolidation` の Phase A〜I 完遂で確立された
> 整合性 domain (14 primitive + 13 ペア + Hard Gate KPI) を基盤に、
> framework の構造的問題を解消する Phase R + horizontal expansion を行う Phase H +
> 制度化を仕上げる Phase I の 3 phase 構成。
>
> **status**: draft (Phase 0 bootstrap のみ完遂、Phase R 着手前)

## 0. 設計目標 (North Star)

> **「AAG protects the product / Meta-AAG protects AAG / Health validates both / Human review controls irreversible transitions」**

前駆 project は **進めながら整える** approach で 13 dimension の structural / institutional
gap を発見した。本 project は **整えてから進める** approach に転換し、framework reset
を先行させた上で horizontal expansion を行う。

ただし AAG framework 自身を改修する Phase R は、**それ自体が AAG 規模の変更操作**であり、
無防備に進めると新たな debt 源になる。したがって Phase R より前に **Phase Q
(Meta-Governance Foundation)** を導入し、**Meta-AAG layer = AAG を進化させるための AAG**
を先行整備する 4 phase 構成 (Q → R → H → I) に拡張した (2026-04-29 統合)。

### 4 layer model

```
Layer 1: AAG (architecture rules / guards / KPIs) — protects the product
Layer 2: Meta-AAG (Phase Q deliverables) — protects AAG
Layer 3: Health (architecture-health.json + collector) — validates both layers
Layer 4: Human review (irreversible transitions) — controls archive / promotion / constitutional change
```

### 設計判断の基準

迷ったら次の質問に戻る:

- これは **構造的問題 A/B/C** (双方向契約 / 時間軸 / mechanism-judgement 境界) のどれを解消するか?
- これは **制度的問題 D/E/F** (cross-domain disconnection / decision artifact / dogfooding) のどれを解消するか?
- これは **AAG 自身の劣化リスク** (肥大化 / 例外増 / 信用低下 / 目的化) を抑制する mechanism を伴っているか?
- これは **「進めながら整える」** に逆戻りしていないか? (= 暗黙的に構造を後回しにしていないか?)

4 つすべてに「解消対象を明示できる / institutional answer になっている / Meta-AAG で protect されている / 整えてから進めている」と答えられる変更だけを採用する。

## 1. 前駆 project からの継承

### 1.1 完成済 framework

`canonicalization-domain-consolidation` Phase A〜I で確立:

| 成果物 | 状態 |
|---|---|
| §P8 selection rule (G-1/G-2/G-3) | active |
| §P9 step 5 直接到達 default | active |
| 14 primitive (parsing 6 / detection 7 / reporting 1) | active |
| 13 pair COVERAGE_MAP | active (12 migrated + 1 deferred) |
| 4 KPI (violations / driftBudget / expiredExceptions / consolidationProgress) | active (Hard Gate 2 件) |
| AR-INTEGRITY-NO-RESURRECT | active |
| canonicalization-checklist.md | active |
| rejected[] archive | active (3 件: shapeSync / tokenInclusion / jsdocTag) |

### 1.2 13 dimension review で発見された gap

詳細は `derived/quality-review.md` (本 project Phase 0 bootstrap で landing) 参照。

**7 つの構造 pattern**:

1. 正本性の単方向化
2. 時間軸の構造的不在
3. judgement と mechanism の境界が降り切っていない
4. marker と state machine の混同
5. scope の暗黙化
6. cross-domain disconnection
7. 再帰性 (self-application) の不足

**3 つの構造的問題 (A/B/C)**:

A. 「正本」の概念が片肺 (宣言ではなく契約に格上げ要)
B. 「時間」が AAG の第 1 級概念ではない (history 制度化要)
C. 「mechanism と judgement の境界」が決まっていない (3-zone 制要)

**3 つの制度的問題 (D/E/F)**:

D. domain ごとの自治が強すぎる (cross-domain framework 共通化要)
E. judgement の artifact が標準化されていない (decision artifact standard 要)
F. introspection / dogfooding が義務化されていない (self-application mandate 要)

## 2. 不可侵原則

1. **前駆 project の §P8/§P9 を変更しない** (拡張は可、変更不可)
2. **drift 検出強度を弱めない** (Phase R で schema 変更は existing guard を保つ前提)
3. **13 pair の現 framework での運用を継続** (Phase Q/R 中も Hard Gate PASS を維持)
4. **business logic を変更しない** (Phase H の registry+guard 整備のみ、業務 logic 不変)
5. **active overlay の自動切替なし** (人間判断、Phase R 完了後に検討)
6. **「気をつける」 rule は作らない** (Phase R は mechanism / judgement / hybrid 3-zone で明示分類)
7. **第 5 の柱 (Project Lifecycle Governance) に踏み込まない** (本 project scope 外、後続 project)
8. **Phase R 以降の AAG 改修は Phase Q deliverable で必ず protect する** (Meta-AAG bypass 禁止、Phase Q が R/H/I の prerequisite)
9. **Phase Q 自身も Q deliverable で self-protect する** (Q-3 meta-guards が Q-1〜Q-10 の整合性を機械検証、再帰性確保)
10. **AAG 変更 PR は Q-1 AAG_CHANGE_IMPACT template + Q-8 governance review 二段階を必須化** (Phase Q-1 完了以降の全 PR)

## 3. Phase 構造

### Phase 0: 計画 doc landing (本 commit)

- bootstrap (plan / checklist / projectization / AI_CONTEXT / HANDOFF / config / breaking-changes / legacy-retirement / sub-project-map)
- `derived/quality-review.md` に 13 dimension review + Meta-AAG insight の ground truth を保存

### Phase Q: AAG Maturation (operational refinement + meta-governance)

> **AAG を進化させるための AAG = AAG を「強い品質ゲート」から「低認知負荷で、リスクに応じて、修正まで導く品質運用システム」へ進化させる layer。Phase R 以降の前提**

Phase Q は **2 軸 (operational + meta-governance)** を持つ。両軸は互いに補完し、Phase R 以降の AAG 改修を **使いやすく + 安全に** 進める institutional foundation を提供する。

#### Phase Q 設計の認識

現状の AAG は既に **Healthy / Hard Gate PASS / 57 KPI OK / WARN 0 / FAIL 0** で機械検証基盤として成熟している。Phase R 以降の課題は「強さの追加」ではなく **「運用の洗練」と「自己保護」** である。

- 認知負荷リスク: rule 163 件 / guard test file 117 件で、初見者が「どこから読めばよいか / 何が最重要か」を把握しにくい
- 自己保護リスク: AAG 改修が AAG 規模の変更操作であり、無防備に進めると新たな debt 源になる

Phase Q はこの両 risk を 2 軸で解消する。

#### Phase Q scope reduction (2026-04-29、anti-bloat self-test 結果)

Phase Q 自身が anti-bloat invariant (Q.M-2 #9 = 「product value / risk reduction に接続できる場合のみ追加」) に対する self-test を通過するか審査した結果、**14 要素中 4 要素のみを landing し、他は defer / cut** に再設計した。

**現状の evidence**:
- AAG は Healthy / 0 WARN / 0 FAIL — bloat の **実害 evidence なし**
- 前駆 project (canonicalization-domain-consolidation) が Meta-AAG 不在で Phase A〜I を成功させた実績
- 13 dimension review の **input は前駆 project の "進めながら整える" 実績** = 構造的 gap が **可視化されたのは進めながら整えた結果**
- 1 人 dev project で onboarding cognitive load の対処課題 evidence が薄い
- external review 1 / 2 の原文が project に保存されておらず、justification chain が audit 不能

**再設計の判断**:

| 元 14 要素 | 判定 | 理由 |
|---|---|---|
| Q.O-1（3 入口 doc） | **採用** | onboarding は low-cost / low-risk、削除も容易 |
| Q.O-2（Tier 0-3） | **採用** | rule importance 差別化は実利あり、Tier 0 を最小限指定 |
| Q.O-4（Repair-style messages） | **採用** | actionable error は universal good、AagResponse 延長 |
| Q.M-1（CHANGE_IMPACT template） | **採用** | PR checklist は cheap、AAG 変更 PR review 質向上 |
| Q.O-3（Change classification） | **cut** | 採用 4 件 landing 後に再評価 → Q.M-1 `AAG_CHANGE_IMPACT` の Affected layer + Risk + Anti-bloat self-test と projectization Level 0-4 が Q.O-3 提案分類を richer に cover。第 3 の分類軸は overlap |
| Q.O-5（auto-generated README） | **defer** | 採用 4 件 landing 後に再評価 → 現状 project 数 ≈ 8 で manual maintenance 可能。auto-generation は additive value、harm prevention にならない。復活 trigger: project 数 ≥ 15 or onboarding 事故 |
| Q.O-6 / Q.M-4（14 efficacy KPIs） | **cut** | speculative、Phase R で測定問題が出てから addit ive 追加 |
| Q.M-2（9 invariants doc） | **cut** | anti-bloat / no-resurrect は既存 AAG 第 7 / 第 8 原則に内包 |
| Q.M-3（8 meta-guards） | **cut** | speculative、drift 事例が出てから ratchet で追加 |
| Q.M-5（promotion gate L0-L7） | **cut** | 1 人 project で過剰 ceremony |
| Q.M-6（canary rollout） | **cut** | 同上 |
| Q.M-7（rollback policy） | **cut** | 既存の git revert + allowlist 機構で代替可能 |
| Q.M-8（2 段 review） | **cut** | 1 人 project で過剰 |

**運用原則**: cut した要素は Phase R 進行中に **実害 evidence が出た時のみ追加**（YAGNI）。anti-bloat invariant が cut した要素自身を抑制する。

### Phase Q operational axis (Q.O-1〜Q.O-6) — 認知負荷削減 + 効果測定

> external review 2 (2026-04-29) より: 「強さの追加」ではなく「使いやすさの洗練」。

#### Q.O-1: AAG 入口整備 (overview + critical rules)

- `references/AAG_OVERVIEW.md` (新設): AAG 全体の一枚サマリ
- `references/AAG_CRITICAL_RULES.md` (新設): 絶対に踏んではいけない最重要 rule 一覧 (Tier 0)
- `references/03-guides/aag-onboarding-path.md` (新設): 初見者の必読 path 最小化

→ dimension 5 (動線) を構造的に解消。

#### Q.O-2: Risk tiering (Tier 0-3 rule classification)

各 rule に `tier: 0 | 1 | 2 | 3` を必須化:

| Tier | 対象 | 扱い |
|---|---|---|
| Tier 0 | data corruption / financial correctness / layer inversion | 即 fail、例外原則禁止 |
| Tier 1 | architecture drift / source-of-truth drift / stale docs | 原則 fail、短期 allowlist 可 |
| Tier 2 | complexity / ergonomics / migration debt | ratchet 管理 |
| Tier 3 | review-only / observation | report と review 対象 |

`base-rules.ts` の `BaseRule` schema 拡張、`architectureRuleGuard` で全 rule に tier 必須化。

#### Q.O-3: Change classification (Micro / Local / System / Constitutional)

PR を 4 種に分類し、それぞれ手続きを明確化:

| 種類 | 例 | 手続き |
|---|---|---|
| Micro | typo、コメント、軽微 rename | quick-fixes (project 化不要) |
| Local | 1 feature 内 refactor | checklist 最小 |
| System | guard / registry / query path / wasm | project 化 (Level 3+) |
| Constitutional | principle / taxonomy / AAG core | human review + impact report 必須 |

PR template に `changeClassification` field 必須化、projectizationPolicyGuard 拡張で機械検証。

#### Q.O-4: Repair-style guard messages

各重要 guard の failure message を **検出 → 修理ナビゲーション** に格上げ:

```
FAIL: AR-XXX
Reason: ...
Likely cause: ...
Fix:
  1. ...
  2. ...
Run:
  npm run test:guards
Read:
  references/...
```

各 guard に `violationCode / why / commonCause / fixPath / command / escalation` を必須化。Q.O-1 の `guard-failure-playbook.md` と連動。

#### Q.O-5: projects 直下 README (project navigation)

各 active project に対し以下を一覧表示:

- project id / 一言説明 / status / owner / human reviewer / 現在 phase / 次の action / 関連 AAG scope / 危険度 / 読む順番

projectChecklistCollector 拡張で auto-generate、手書き禁止。

#### Q.O-6: AAG operational KPIs (efficacy + degradation 統合)

KPI を「量」から「効果」+「負荷」に再定義:

**Efficacy 系 (review 2)**:
- `aag.guard.preventedRegression.count` — guard が実際に検出した再発件数
- `aag.drift.detectedBeforeMerge.count` — merge 前に検出できた drift
- `aag.guard.meanTimeToFix.seconds` — guard failure から修正までの平均時間
- `aag.project.reopen.count` — completed / archived 後に再オープン相当になった件数

**Degradation 系 (review 1)**:
- `aag.rule.totalGrowthRate` — rule 数の増加速度
- `aag.guard.noiseRate` — guard 発火のうち false positive / low value 割合
- `aag.allowlist.age.p95` — allowlist の長期滞留
- `aag.hardGate.count` — hard gate の増加
- `aag.generatedDrift.count` — generated artifact の stale
- `aag.project.completedNotArchived` — completed なのに archive されていない project
- `aag.sourceOfTruth.duplicates` — 正本の二重化
- `aag.docTaskLeak.count` — references に live task が戻っていないか
- `aag.rule.withoutProtectedHarm` — 害を説明できない rule
- `aag.onboardingPath.length` — 初見者が必要情報に到達するまでの文書数

→ AAG の成熟度を coverage ではなく **efficacy** で測る。

### Phase Q meta-governance axis (Q.M-1〜Q.M-8) — AAG 自己保護

> external review 1 (2026-04-29) より: AAG 変更の安全保証 = Meta-AAG。

#### Q.M-1: AAG_CHANGE_IMPACT template

AAG 変更 PR で必須 section:

```
AAG Change Impact
Affected layer: [Constitution / Schema / Execution / Operations]
Affected artifacts: [architectureRules / guard tests / health metrics / generated docs / project lifecycle / content specs / taxonomy]
Risk: [new hard gate? / new human approval? / new generated artifact? / new source of truth? / migration needed?]
```

guard で PR description の同 section 必須化を機械検証 (PZ pattern 拡張)。

#### Q.M-2: AAG invariant list (9 hard invariants)

AAG 自身の不変条件:

| invariant | 意味 |
|---|---|
| 正本を増やしすぎない | 同じ truth を複数箇所に置かない |
| 派生物は手編集しない | generated report / generated section の drift 防止 |
| rule と guard を分離する | 「何を守るか」と「どう検出するか」を混ぜない |
| checklist は completion truth のみ | task と説明文書を混ぜない |
| AAG 変更は app behavior を勝手に変えない | governance 変更と本体機能変更を混ぜない |
| new rule には protected harm が必要 | 何の事故を防ぐか説明できない rule を追加しない |
| hard gate 追加には migration path が必要 | いきなり開発不能にしない |
| AI は自己承認しない | promote / archive / constitutional change には人間承認 |
| **anti-bloat** (review 2) | rule / doc / project は product value / risk reduction に接続できる場合のみ追加 |

各 invariant に対応 guard を整備 (Q.M-3 と連動)。anti-bloat invariant は AAG の目的化を防ぐ最重要原則。

#### Q.M-3: AAG meta-guards

AAG 自身の構造違反を検出する guard set:

- meta-governance guard: AAG 構造違反検出
- source-of-truth guard: 正本 / 派生 / 運用物の混線検出
- collector symmetry guard: collector と規約の非対称検出 (AAG 5.2 の checklistGovernanceSymmetryGuard を generic 化)
- health schema compatibility test: health JSON の破壊的変更検出
- project lifecycle simulation: completed / archived / active 遷移の整合検証
- generated artifact drift test: docs:generate 後の差分検出
- rule metadata completeness test: rule に owner / reviewPolicy / protectedHarm があるか検証
- guard noise test: allowlist / false positive 圧の増加検出

#### Q.M-4: AAG operational KPIs collector

Q.O-6 で定義した efficacy + degradation KPIs を集約する collector を実装。`aag.*` 名前空間で `architecture-health.json` に出力。Phase Q-4 と Phase Q.O-6 は **同 collector の 2 vue** (実装は 1 つ、概念は efficacy + degradation の 2 軸)。

#### Q.M-5: AAG promotion gate (L0-L7)

new AAG rule の成熟度 gate:

```
L0: idea
L1: documented
L2: schema defined
L3: guard implemented
L4: health integrated
L5: migration path exists
L6: failure playbook exists
L7: observed without excessive noise
```

new rule は最低 L4 まで required。

#### Q.M-6: Canary rollout policy (Phase 0-4)

new AAG policy の段階導入:

```
Phase 0: document only
Phase 1: warn mode
Phase 2: canary project only
Phase 3: active projects
Phase 4: whole repo hard gate
```

Phase R の各 reform 自体もこの canary policy に従う。

#### Q.M-7: AAG rollback policy

failure 時の安全な降格経路:

| 状況 | 対応 |
|---|---|
| 新 guard が高ノイズ | warn mode に戻す |
| hard gate が開発不能にする | hard gate から health-only に降格 |
| generated schema が壊れる | 前バージョン schema を一時許容 |
| checklist collector が誤判定 | collector rollback + generated project-health 再生成 |
| rule の意味が曖昧 | rule を review-only に降格 |
| migration path 不足 | gate を延期し、plan/checklist に戻す |

#### Q.M-8: Governance review checklist

AAG 変更 PR は **二段階 review** 必須:

1. Technical review: guard が正しく検出するか / false positive 少ないか / generated artifact 壊れないか
2. Governance review: その rule は本当に必要か / protected harm 明確か / 運用負荷妥当か / human approval 必要か / 小変更を重くしすぎないか

> **Q.O-1 (入口整備) と Q.O-4 (Repair-style guard messages) が前 Phase Q draft の Q-9 / Q-10 を吸収している**。本 Phase Q は operational axis (Q.O-1〜Q.O-6) + meta-governance axis (Q.M-1〜Q.M-8) = **計 14 要素** の 2 軸構造。

### Phase R: Framework Reset

> **structural answer to A/B/C, institutional answer to D/E/F**

#### R-① Bidirectional Canonical Contract schema

正本を「宣言」ではなく「双方向契約」に格上げ:

```
canonical contract = {
  authority:    A
  derivation:   B is derived from A
  bidirection:  A→B 整合 + B→A 整合 が両方機械検証
  drift detector: 不整合検出経路
}
```

- `app-domain/integrity/types.ts` (or 新 `lifecycle.ts`) に schema 定義
- 13 pair を contract schema で再分類
- COVERAGE_MAP と integrity-collector の duplicate logic を **同 contract の 2 endpoints** として認識
- 解消する gap: 傾向 1 (単方向化) / 6 (cross-domain) / 7 (再帰性)

#### R-② Time-axis Decision Record schema

decision に共通 schema を適用:

```
decision record = {
  when, who, why, evidence, reversal, state
}
```

- 全 archive (accepted[] / rejected[] / deferred[] / retired[] / scope-changes[]) で同 schema 共有
- taxonomy origin journal も同 schema で reframe (cross-domain 適用)
- 解消する gap: 傾向 2 (時間軸) / 4 (state machine) / 5 (scope)

#### R-③ mechanism / judgement / hybrid 3-zone 制

各 invariant に zone tag を必須化:

| zone | 要求 artifact |
|---|---|
| mechanism | guard test / Hard Gate / ratchet-down |
| judgement | rationale prose (decision record schema、最小文字数) |
| hybrid | 機械部分 + 判断部分を artifact で繋ぐ |

- §P8/§P9 / selection rule / 撤退規律を 3-zone 分類で書き直し
- 解消する gap: 傾向 3 (judgement) / 7 (再帰性)

#### R-④ Cross-domain Framework Layer

各 domain (taxonomy / contentSpec / integrity) が共通 schema (R-① / R-② / R-③) **を実装する義務**を持つ:

- `APP_DOMAIN_INDEX.md` を統一 template 化
- domain ごとの subject specialization を明記
- cross-domain bridge 明示
- 解消する gap: 制度的問題 D

#### R-⑤ Decision Artifact Standard

採用 / 撤退 / refactor / scope 変更の **artifact template 共通化**:

- PR description template の必須 section (decision record schema 適用)
- post-PR の archive 義務 (accepted[] / deferred[] / rejected[] / retired[] / scope-changes[])
- guard で artifact 整合性検証
- 解消する gap: 制度的問題 E

#### R-⑥ Dogfooding Mandate

各 domain の coverage guard が **自分の domain primitive で書かれているか** を機械検証:

- AAG framework 自身を #14 pair として inventory 化
- integrity domain の coverage guard が integrity primitive で書き直される
- 解消する gap: 制度的問題 F、傾向 7

### Phase H: Horizontal Expansion

> **Phase R で整えた framework の最初の正規利用**

#### H-α: hooks (H-1) re-evaluation

- selection rule 3-zone (R-③) で再判定
- accepted[] entry に判断 trace
- 採否決定: `accepted` / `out-of-scope` / `pending`

#### H-β: charts (H-2) 採用

- registry: chart input/option builder pair 対応表
- guard: `chartPairCanonicalGuard.test.ts` 新設 or `chartInputBuilderGuard` 拡張
- COVERAGE_MAP に entry 追加
- decision artifact (R-⑤) を archive に
- 既存 14 primitive で表現可能か検証 (R-① contract 適用)

#### H-γ: wasm (H-7) 採用

- registry: wasm module + bridge 対応表
- 新 primitive 必要性検証 (例: `wasmModuleGraph`)、必要なら primitive 単独追加 PR を先行
- guard: `wasmRegistryGuard.test.ts` 新設
- COVERAGE_MAP に entry 追加
- decision artifact (R-⑤) を archive に

#### H-δ: COVERAGE_MAP 拡張 + Phase F audit 昇格

- 13 → 15〜16 pair に拡張
- adapter shape baseline を新 guard で設定
- KPI 自動追従確認

### Phase I: Institutionalization (拡張)

- 前駆 project の Phase I で institutionalize 済の §P8/§P9 / canonicalization-checklist.md を **R-① / R-② / R-③ schema** で再構造化
- archive transition (前駆 project と本 project の status 同期更新)
- 後続 project (第 5 の柱: Project Lifecycle Governance) に handoff

## 4. やってはいけないこと

- 前駆 project の Phase A〜I 成果を破壊する変更
- Phase R の 6 reform を「進めながら」分散させる (一度に整える)
- Phase H で Phase R framework を bypass した shortcut migration
- §P8/§P9 を Phase R で「修正」する (拡張は可、変更不可)
- 13 dimension review の deferred 項目を本 project scope に持ち込む (第 5 の柱に handoff)

## 5. 関連実装

| パス | 役割 |
|---|---|
| `app-domain/integrity/` | 前駆 project から継承、Phase R で types schema 拡張 |
| `app/src/test/guards/integrityDomain*Guard.test.ts` | 既存 3 guard、Phase R で dogfooding refactor |
| `tools/architecture-health/src/collectors/integrity-collector.ts` | 既存 collector、Phase R で contract pattern 適用 |
| `references/01-principles/canonicalization-principles.md §P8/§P9` | 不変 (前駆 project 確定)、本 project は 3-zone tag を追加 |
| `references/03-guides/canonicalization-checklist.md` | 本 project Phase R で 3-zone 化 |
| `derived/quality-review.md` | 13 dimension review ground truth |

## 6. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。前駆 project canonicalization-domain-consolidation の Phase A〜I 完遂 + 13 dimension review を input として、Phase R (Framework Reset) + Phase H (Horizontal Expansion) + Phase I (Institutionalization) の 3 phase 構成で立ち上げ。status=draft、Phase 0 bootstrap のみ完遂 |
| 2026-04-29 | Phase Q scope reduction (anti-bloat self-test): 14 要素 → 4 要素 (Q.O-1 / Q.O-2 / Q.O-4 / Q.M-1) + 保留 2 件 (Q.O-3 / Q.O-5) + cut 8 件。理由: AAG は現在 Healthy で bloat 実害なし、Meta-AAG 不在で前駆 project が成功した実績、external review が audit 不能、1 人 project で過剰 ceremony 化リスク。cut 要素は Phase R で実害 evidence 出た時のみ additive 追加 (YAGNI) |
| 2026-04-29 | Phase Q 採用 4 件 landing 後の 保留 2 件 final disposition。Q.O-3 → cut (Q.M-1 + projectization で代替済み、第 3 分類軸は overlap)、Q.O-5 → defer (project 数 8 で manual 可能、復活 trigger は project 数 ≥ 15 or onboarding 事故)。Phase Q 最終確定: 採用 4 件 + cut 10 件 |
