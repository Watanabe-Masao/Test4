# checklist — aag-bidirectional-integrity

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: 計画 doc landing

- [x] `projects/aag-bidirectional-integrity/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 3 / governance-hardening / status active / requiresLegacyRetirement=true / breakingChange=true) を記録した
- [x] `plan.md` に Phase 0.5〜10 + 不可侵原則 + やってはいけないこと + 5 層 drill-down + 縦スライス matrix + 破壊的変更前提 + 検証層 + §8 確認・調査事項 を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order と 5 層 drill-down + 3 軸 (Meta/Core/Audit) を記録した
- [x] `HANDOFF.md` に現在地と次にやること（Phase 0.5〜10）とハマりポイントを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 3 / requiresLegacyRetirement=true / breakingChange=true) と nonGoals を記録した
- [x] `legacy-retirement.md` の skeleton を landing した (Phase 5 で実値を埋める)
- [x] `breaking-changes.md` を landing した (PZ-7 解消、6 カテゴリの破壊対象 + 移行方針 articulate)

## Phase 0.5: terminology / scope 整合性修正 (Phase 1 execution 前 prerequisite、完遂済)

> **目的**: PR review で identify された計画段階の不整合を解消。Phase 1 execution 前に必須。
>
> **完遂宣言** (改善 4 反映、再 open は新 PR review でのみ):
> 本 phase は **commit 91061ca + c66df31 + 本 commit で完遂**。全 checkbox は [x] 済。
> 後続 PR review で新たな不整合が identify された場合は、新 Phase 0.X を別 commit で立ち上げる
> (本 Phase 0.5 を再 open しない、混乱回避)。

- [x] AI_CONTEXT.md の scope contradiction を修正した (「含まない」から「既存 AR-NNN rule 振る舞い変更」を削除、`breakingChange=true` 側に整合 = breaking-changes.md §1.6 + plan §1.2 #10 と一致)
- [x] 4 層 / 5 層 の表記ゆれを全 project doc で解消した (旧 4 層 = 旧 Constitution/Schema/Execution/Operations を指す場合のみ「旧 4 層」明記、AAG architecture pattern は「5 層」に統一)
- [x] `breakingChange=true` と nonGoals の整合性を確認した (projectization.md / config/project.json / AI_CONTEXT.md / HANDOFF.md / breaking-changes.md / plan.md §5 やってはいけないこと が一貫)
- [x] Phase 3 audit 完了後の project split review checkbox を Phase 3 末尾に追加した (本 commit で hard gate 化)
- [x] Phase 2 schema 初期化方針を強化 (空配列 → status field: pending/not-applicable/bound、未対応と意図的不要を区別)
- [x] Phase 8 semantic articulation quality 強化 (hard fail = 禁止 keyword + 20 文字 minimum + 重複検出 + status 整合性 + path 実在 / warning = 意味品質 human review、本 commit で hard fail / warning 分離統合)
- [x] legacy-retirement archive 前 mapping 義務化 (旧 4 層 → 新 5 層 mapping を新 doc に必須、`aag-four-layer-architecture.md` archive 前の prerequisite)
- [x] **PR review Review 3 P0 #1 反映**: Phase 2 変更対象を `defaults.ts` から `types.ts` + `base-rules.ts` に修正、`guardCategoryMap.ts` は二重正本回避のため touch しない (本 commit + c66df31 で完遂)
- [x] **PR review Review 3 P1 #5 反映**: Phase 1 deliverable に Requirement ID namespace (`AAG-REQ-*`) を articulate (本 commit + c66df31)
- [x] **PR review Review 3 P1 #6 反映**: Phase 8 を MVP (4.2 + 4.4) に縮小、4.1/4.3/4.5 + selfHosting + metaRequirementBinding は follow-up project に逃がす (本 commit + c66df31)
- [x] **PR review Review 3 P2 #8 反映**: 物理削除 trigger に inbound 0 + 人間 deletion approval を articulate (本 commit、anti-ritual と orthogonal な安全装置)
- [x] **重大指摘 #6 反映**: observeForDays vs inbound 0 trigger 切り分け articulate (legacy doc 削除 = inbound 0 only / experimental rule 昇格・撤回 = observeForDays 許容 supplementary signal、本 commit)

## Phase 1: AAG Meta doc (`aag/meta.md`) の新規創出 (Layer 0+1)

> 着手前 prerequisite: plan §8.5 (registry / contract 系の現実 schema 確認) + §8.8 (命名規則 / ディレクトリ階層化整合性) + §8.9 (もう一押し候補の integrate 判断: A / C / E / F / G / J)

- [x] `references/01-principles/aag/meta.md` を新規 Create し、§1 目的 (Purpose、Layer 0、1-2 段落) を記述した
- [x] `aag/meta.md` §2 要件 (Requirements、Layer 1) を記述した — 不変条件 7 + 禁則 5 = 12 件 (`AAG-REQ-*` namespace)、各行に enforcing AR-rule + state-based 達成条件 + 達成 status + observeForDays 切り分け (§2.3) を articulate
- [x] `aag/meta.md` §3 AAG Core 構成要素 mapping (5 層 × 5 縦スライス matrix + Layer 4 audit framework = §8.10 判断 A 適用) を記述した
- [x] `aag/meta.md` §4 達成判定総括 (達成 6 件 / 未達成 6 件 + 解消責務 mapping + audit 履歴 table) を記述した
- [x] `references/01-principles/aag/README.md` を新規 Create した (aag/ ディレクトリ index、CLAUDE.md からの 1 link entry)
- [x] `docs/contracts/doc-registry.json` に新 doc 群 (`aag/meta.md` + `aag/README.md`) を登録した
- [x] CLAUDE.md AAG セクションに `aag/README.md` への 1 行索引 link を追加した (§8.13 判断 = B 適用は Phase 4 で実施、Phase 1 では index link のみ)
- [x] charter doc の人間 review を経て確定した (Constitution 改訂と同等の慎重さ) — **PR #1223 merged 後にユーザー承認 = 「Parse1 OK」articulation で確定 (2026-04-30)**

## Phase 2: AAG rule metadata 拡張 (semantic articulation 構造 + status field) — **migrated to Project B (`aag-rule-schema-meta-guard`、archived 2026-05-01)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project B Phase 1〜3 で完遂。SemanticTraceBinding
> 型 family 5 件 + RuleBinding 拡張 2 field を `aag-core-types.ts` / `architectureRules/types.ts` に landing。
> 166 rule 全 bound articulation 装着 (`pending` 0 件 / `bound` 332 件 = 166 × 2 fields)。

- [x] `architectureRules/types.ts` (or `aag-core-types.ts`) に **`SemanticTraceBinding<T>` 型 + `CanonicalDocTraceRef` / `MetaRequirementTraceRef`** を追加した — migrated to Project B Phase 1:
  ```typescript
  type TraceBindingStatus = 'pending' | 'not-applicable' | 'bound'
  interface SemanticTraceRef {
    readonly problemAddressed: string
    readonly resolutionContribution: string
  }
  interface CanonicalDocTraceRef extends SemanticTraceRef { readonly docPath: string }
  interface MetaRequirementTraceRef extends SemanticTraceRef { readonly requirementId: string }
  interface SemanticTraceBinding<TRef> {
    readonly status: TraceBindingStatus
    readonly justification?: string  // status='not-applicable' のとき必須
    readonly refs: readonly TRef[]
  }
  ```
- [x] **`RuleBinding` 型** (`architectureRules/types.ts`) に下記 field を追加した — migrated to Project B Phase 1 (`canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` + `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` 装着完遂)
- [x] `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` 全 rule に下記初期値を設定した — migrated to Project B Phase 2 (initial value 装着後、batch 1+2+3 で `pending` 0 件 / `bound` 332 件達成)
- [x] `architectureRules/defaults.ts` (execution overlay) は **触らない** ことを確認した — migrated to Project B (二重正本回避、touch せず完遂)
- [x] `guardCategoryMap.ts` は **触らない** ことを確認した — migrated to Project B (二重正本回避、category / layer / note のまま)
- [x] TypeScript 型定義の整合を確認した — migrated to Project B Phase 1 (build / lint PASS、`merged.ts` 経由で consumer から access 可能)

## Phase 3: AAG Core doc audit (5 層位置付け + 責務 + drill-down semantic + operation 判定)

> 着手前 prerequisite: plan §8.1 (8 doc + CLAUDE.md AAG セクションの実 inbound link 数 grep) + §8.3 (5 縦スライス整合性検証) + §8.4 (Layer 3 / Layer 4 境界 identify) + §8.7 (Layer 2 doc 状態確認)

各 AAG 関連 doc に対して:

- [x] **5 層位置付け** (Layer 0/1/2/3/4 / 境界 のどれか) を articulate した — aag-doc-audit-report.md §1.1〜§1.9 各 doc 冒頭で articulate
- [x] **責務** (1 doc 1 責務、C1 適用) を articulate した — §1 各 doc で C1 違反を identify (`adaptive-architecture-governance.md` 6 責務同居 + `aag-5-constitution.md` 3 責務同居)
- [x] **書くべきこと (write list)** + **書かないこと (non-write list)** を articulate した — §1 各 doc で write/non-write articulate
- [x] **drill-down pointer** (上位 back-pointer + 下位 drill-down) を articulate した — §1 各 doc で drill-down pointer articulate
- [x] **必要 operation** (Create / Split / Merge / Rename / Relocate / Rewrite / Archive のどれか、複数可) を判定した — §0.1 inventory + §1 各 doc で operation 判定
- [x] **影響範囲 inventory** (inbound link 数 / 索引 / registry / guard binding) を集約した — §0.1 inventory + §1 各 doc で inbound 数 (160+ file references) を集約
- [x] **migration order** (operation 間の依存 + commit 順序) を articulate した — §1 各 doc 末尾で migration order articulate

追加 deliverable:

- [x] AR-rule canonization mapping (人間語 → AR rule ID 候補) を作成した — §2.1 主要参照先 top 10 + §2.2 4 分類予測 + §2.3 AAG-REQ-* との binding 候補
- [x] gap 識別 / redundancy 識別 / staleness 識別を完了した — §3.1 staleness (2 doc 即 archive) + §3.2 redundancy (6 概念 集約方針) + §3.3 gap (5 件、Phase 1〜8 で解消責務 mapping)
- [x] 5 縦スライス境界の reshape 必要性を判定した — §4.2 結論 = **reshape 不要** (既存 5 スライスで十分、ルール件数分散 OK)
- [x] Layer 3 (実装) と Layer 4 (検証) に混在している guard を identify した — §5.1 混在 guard 5 件 (architectureRuleGuard / docRegistryGuard / docCodeConsistencyGuard / docStaticNumberGuard / health-rules) + §5.2 純 Layer 3 + §5.3 純 Layer 4
- [x] **新 5 層 (目的 / 要件 / 設計 / 実装 / 検証) と 既存 AAG 5.1.0 の旧 4 層 (Constitution/Schema/Execution/Operations) の mapping を確定した** (plan §8.11、`aag/architecture.md` Phase 4 の前提) — §6.1 mapping table + §6.2 rationale + §6.3 旧 4.x 4 層との 2 重 mapping
- [x] **AAG Audit (Layer 4) の home doc 必要性を判定した** (plan §8.10、A: aag/meta.md §3 で articulate / B: aag/audit.md 新規 / C: aag/architecture.md 内包 のいずれか) — Phase 1 で **A 確定** (aag/meta.md §3.2 に 5 sub-audit framework articulate 済)
- [x] audit 結果を `references/02-status/aag-doc-audit-report.md` に集約した — 本 commit で landing

### Phase 3 完了 → Phase 4〜10 split decision gate (HARD GATE、Phase 4 着手の必須前提)

> Phase 3 audit findings を踏まえ、Phase 4〜10 を単一 project 内で継続するか sub-project /
> follow-up project に分割するかの **hard gate decision** (PR review #3 + Review 3 P0 #3 反映)。
> 本 project は Level 3 だが実体は Level 4 寄り (106 checkbox + 横断 implementationScope) のため、
> 単なる review checkbox ではなく **明示的な決定 gate** として運用。Phase 4 着手は本 gate 通過が
> 必須前提。
>
> **default 推奨**: MVP = Phase 1〜3 / Follow-up = Phase 4〜10 を別 project 化 (Review 3 推奨)。
> 単一 project 継続は audit findings で正当化される場合のみ。

- [x] Phase 3 audit 完了後、Phase 4 doc refactor の所要 commit 数を見積もった (10+ commits 想定) — audit report §7.1 で operation 22 件 / commit 15-20 件 articulate (想定超過、Level 4 寄り)
- [x] **AI 推奨 articulate**: Phase 4〜10 を以下のどちらで進めるか AI が criteria を適用して **推奨 (default)** を決定した — **AI 推奨: B (sub-project / follow-up project に分割)**
  - **A. 単一 project 継続** (audit findings で「scope は管理可能」と正当化された場合のみ)
  - **B. sub-project / follow-up project に分割** (default、推奨分割例: Project A = AAG Meta + Core doc refactor / Project B = rule schema + meta-guard / Project C = DFR registry + display guards / Project D = legacy retirement) ← **AI 推奨**
- [x] **ユーザー確認 (= 人間判断 gate)**: Phase 3 hard gate は **高 blast radius** (= project 構造の不可逆判断 + 4 project bootstrap 計画) のため、`deferred-decision-pattern.md` §3.2 例外則 (構造的安全装置) を適用し、AI 推奨に対するユーザー判断を必須 gate として運用する — **判断確定: a) B 確定** (2026-04-30、ユーザー articulate 「Bでよろしくお願いします」) → Project A〜D 分割で進行、本 project は MVP 完遂で archive 候補へ migrate
- [x] 決定理由 (A or B) を `references/02-status/aag-doc-audit-report.md` の末尾に articulate した — §7.2 で B 推奨 rationale articulate 済 (scope 規模 evaluation: operation 22 件 / commit 15-20 件 / 既存 166 rule binding = Level 4 寄り)
- [x] **本 hard gate を通過するまで Phase 4 着手しない** ことを HANDOFF に明示した — HANDOFF §1.4 + §2 で articulate 済

## Phase 4: AAG Core doc content refactoring (新規書き起こし優先、4 sub-phase 構成) — **migrated to Project A (`aag-core-doc-refactor`、archived 2026-04-30)**

> §1.6 Phase 3 hard gate decision = B (Project A〜D 分割) 確定により、本 Phase は Project A
> (`aag-core-doc-refactor`) の Phase 1〜6 として実施・完遂。本 project では historical articulation
> として保持。詳細: `projects/completed/aag-core-doc-refactor/`。

### Phase 4.1. Create 段階 (新 path 新 doc Create)

- [x] `references/01-principles/aag/strategy.md` を新規 Create (戦略マスター、旧 adaptive-architecture-governance.md core を Split + Rewrite) — migrated to Project A Phase 1〜3
- [x] `references/01-principles/aag/architecture.md` を新規 Create (5 層構造定義 + 旧 4 層 → 新 5 層 mapping table、旧 aag-5-constitution.md を Rewrite + Relocate + Rename) — migrated to Project A Phase 1〜3
- [x] `references/01-principles/aag/evolution.md` を新規 Create (進化動学、旧 adaptive-governance-evolution.md を Rewrite + Relocate + Rename) — migrated to Project A Phase 1〜3
- [x] `references/01-principles/aag/operational-classification.md` を新規 Create (now/debt/review 区分、旧 aag-operational-classification.md を Rewrite + Relocate) — migrated to Project A Phase 1〜3
- [x] `references/01-principles/aag/source-of-truth.md` を新規 Create (正本/派生物/運用物、旧 aag-5-source-of-truth-policy.md を Rewrite + Relocate + Rename) — migrated to Project A Phase 1〜3
- [x] `references/01-principles/aag/layer-map.md` を新規 Create (5 層 マッピング、旧 aag-5-layer-map.md を Rewrite + Relocate + Rename) — migrated to Project A Phase 1〜3
- [x] 各 doc を独立 commit で landing (parallel comparison 期間を確保) — migrated to Project A Phase 1〜3

### Phase 4.2. Split / Merge 段階 (内容分割 / 統合)

- [x] `adaptive-architecture-governance.md` (戦略 + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table 同居) を Split (戦略マスター → `aag/strategy.md` / 文化論 → `aag/strategy.md` or `aag/meta.md` / 旧 4 層 → Archive / バージョン履歴 → per-doc 分散) — migrated to Project A Phase 2
- [x] 各 Split を独立 commit で履歴記録 — migrated to Project A Phase 2

### Phase 4.3. Rewrite 段階 (内容を新 path で完成)

- [x] 各新 doc に **5 層位置付け + drill-down pointer + semantic articulation** を装着 — migrated to Project A Phase 3
- [x] 各新 doc の `## Mechanism Enforcement` section を articulate (Phase 7 で fill する base 構造) — migrated to Project A Phase 3 (skeleton) + Project B Phase 4 (canonicalDocBackLinkGuard で fill)
- [x] Layer 3 (実装) と Layer 4 (検証) を明示分離 (混在 guard の責務再分離は Phase 8 + follow-up で実施、Rewrite 時に articulate のみ) — migrated to Project A Phase 3 (articulate)
- [x] **CLAUDE.md AAG セクション薄化** (§8.13 判断 = B 適用): 「AAG を背景にした思考」の core を `aag/meta.md` に逃がし、CLAUDE.md は 1 link 索引 + 鉄則 quote へ — migrated to Project A Phase 4 (67% 薄化完遂)

### Phase 4.4. Cleanup 段階 (registry / contract update)

- [x] **`docs/contracts/doc-registry.json`** に新 doc 群を登録、旧 doc を deprecation marker 段階に置く — migrated to Project A Phase 5
- [x] **`docs/contracts/principles.json`** の reference を新 path に migrate — migrated to Project A Phase 5
- [x] **`.claude/manifest.json`** の `discovery.byTopic` / `byExpertise` / `pathTriggers` の path を新 path に migrate — migrated to Project A Phase 5
- [x] obligation map (`tools/architecture-health/src/collectors/obligation-collector.ts`) の path を新 path に migrate — migrated to Project A Phase 5
- [x] 各 operation 独立 commit で履歴を残し、parallel comparison 期間に entered — migrated to Project A Phase 5

## Phase 5: legacy 撤退 (旧 doc archive、inbound 0 trigger) — **migrated to Project A (`aag-core-doc-refactor`、archived 2026-04-30) + Project D (`aag-legacy-retirement`、archived 2026-04-30 case B early scope-out)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project A Phase 5 (8 旧 doc archive 移管完遂) +
> Project D Phase 1 (拡張案件 0 件 = case B early scope-out) で完遂。物理削除 (item 4) は人間 deletion
> approval 待ち、本 project archive scope 外。

- [x] `legacy-retirement.md` を実値で update した (Phase 3 audit の Archive 候補対象を埋める) — migrated to Project A Phase 5 + Project D Phase 1
- [x] 各旧 doc の **inbound 0 機械検証** を実施した (旧 path への参照を全 doc / 全 registry / 全 guard binding で grep) — migrated to Project A Phase 5 (149+ inbound migrate 後 inbound=0 達成)
- [x] inbound 0 確認した旧 doc を `references/99-archive/` に移管した (migrationRecipe + 履歴付き) — migrated to Project A Phase 5 (8 旧 AAG Core doc 全 archive 移管完遂)
- [x] 99-archive 配下の旧 doc に対する inbound も 0 になった file を物理削除した (即時、buffer なし) — N/A (人間 deletion approval 必須、本 project archive scope 外。Project D Phase 4 の case A 対象だったが case B 確定で scope out)
- [x] doc-registry.json + principles.json + manifest.json の reflect を完了した — migrated to Project A Phase 5

## Phase 6: 既存 AR-NNN rule の audit + binding (partial、初期 batch 別出し) — **migrated to Project B (`aag-rule-schema-meta-guard`、archived 2026-05-01)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project B Phase 2〜3 で完遂。166 rule 全 bound
> articulation 装着 (batch 1+2 人手 + batch 3 Python synthesizer 一括 bound、`pending` 0 件 / `bound` 332 件 = 166 × 2 fields)。

### Phase 6.1. 初期 batch (articulation draft 生成 protocol 確定)

- [x] 既存 rule から **分類 A 候補 (自明な既製本) を 5-10 rule** 選定した — migrated to Project B Phase 2 (batch 1+2 人手 articulate、protocol §2 確定)
- [x] 各 rule の `note` / `what` / `why` field から **AI 補助で初期 draft 生成** — migrated to Project B Phase 2 (batch 1+2 人手) + Phase 3 (batch 3 synthesizer)
- [x] draft を **人間 review** で validate — migrated to Project B Phase 2 (batch 1+2 人手 validation)
- [x] **articulation draft 生成 protocol** を `references/02-status/ar-rule-audit.md` 冒頭に articulate — migrated to Project B (ar-rule-audit.md §2 = protocol 正本)
- [x] 5-10 rule の `canonicalDocRef` + `metaRequirementRefs` を `status: 'bound'` で記入完了 — migrated to Project B Phase 2

### Phase 6.2. 残 rule の漸次対応 (ratchet-down)

- [x] Phase 3 mapping を input に既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit した — migrated to Project B Phase 2 (audit + initial value 装着)
- [x] 分類 A の rule に Phase 6.1 protocol で `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 付きで漸次記入 — migrated to Project B Phase 2〜3 (一括 bound 完遂、`pending` 0 件達成)
- [x] 分類 D (proxy / performative) の rule の sunset trigger を確定した — migrated to Project B Phase 3 (canonicalDocRefIntegrityGuard で path 実在 hard fail = performative 防止)
- [x] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示した — N/A (Project B Phase 3 で全 166 rule 一括 bound 完遂、漸次対応は不要)
- [x] audit 結果を `references/02-status/ar-rule-audit.md` に記録した — migrated to Project B Phase 2〜5
- [x] Phase 8 status='pending' baseline を確定 (ratchet-down 起点) — migrated to Project B Phase 4 (statusIntegrityGuard fixed-mode、baseline=0 invariant)

## Phase 7: Layer 2 doc に back link section + drill-down semantic 装着 — **migrated to Project B (`aag-rule-schema-meta-guard`、archived 2026-05-01)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project B Phase 4 (canonicalDocBackLinkGuard
> 実装 = forward 方向検証) で構造的に保証。canonical doc の `## Mechanism Enforcement` section の各
> entry に AR ID + 要件 ID + articulation non-empty を hard fail 検証。

- [x] `04-design-system/docs/` 関連 doc に `## Mechanism Enforcement` section を追加した — migrated to Project B Phase 4 (canonicalDocBackLinkGuard fixed-mode で structurally enforced)
- [x] `01-principles/` 関連 doc (rule 定義系) に同 section を追加した — migrated to Project B Phase 4
- [x] `03-guides/` 関連 doc (数値表示ルール / coding-conventions 等) に同 section を追加した — migrated to Project B Phase 4
- [x] 各 section の各 entry が **3 要素を保持** (AR rule ID + 要件 ID + architect 寄与 articulation) を確認した — migrated to Project B Phase 4 (canonicalDocBackLinkGuard が AR ID + 要件 ID + articulation non-empty を hard fail 検証)

## Phase 8: Layer 4 sub-audit MVP 実装 (4.2 方向 + 4.4 完備性 のみ) — **migrated to Project B (`aag-rule-schema-meta-guard`、archived 2026-05-01)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project B Phase 4 で完遂。4 meta-guard
> (canonicalDocRefIntegrity + canonicalDocBackLink + semanticArticulationQuality + statusIntegrity)
> を fixed-mode (baseline=0 invariant) で実装、134 file 901 test PASS。

### Phase 8.2. 4.2 方向監査 (Direction Audit) sub-audit (MVP)

- [x] `canonicalDocRefIntegrityGuard.test.ts` (reverse) を新設 — migrated to Project B Phase 4 (path 実在 + articulation non-empty hard fail、fixed-mode baseline=0)
- [x] `canonicalDocBackLinkGuard.test.ts` (forward) を新設 — migrated to Project B Phase 4 (canonical doc `## Mechanism Enforcement` section AR ID + 要件 ID + articulation non-empty hard fail、fixed-mode baseline=0)
- [x] 5 層依存原則の AAG 内部適用を検証した — migrated to Project B Phase 4 (4 meta-guard が Layer 1 ↔ Layer 2 ↔ Layer 3 binding を機械検証)

### Phase 8.4. 4.4 完備性監査 (Completeness Audit) sub-audit (MVP)

- [x] `semanticArticulationQualityGuard.test.ts` を新設した — migrated to Project B Phase 4 (禁止 keyword + 20 文字 minimum + 重複検出 hard fail、protocol §2.3 内部重複 0 を機械的に保証)
- [x] `statusIntegrityGuard.test.ts` を新設した — migrated to Project B Phase 4 (status='bound' refs.length>0 / 'not-applicable' justification 必須 / 新規 rule 'pending' 禁止、fixed-mode baseline=0)
- [x] 既存 `docRegistryGuard.test.ts` / `docCodeConsistencyGuard.test.ts` / Discovery Review が 4.4 完備性に分類されることを確認した (実装は touch しない、分類 articulation のみ) — migrated to Project B Phase 4

### Phase 8.6. 共通 (MVP)

- [x] 各 sub-audit に **個別 baseline + 個別 fixNow** を持たせた — migrated to Project B Phase 4 (4 meta-guard 各々独立 baseline)
- [x] 例外 allowlist の baseline を機械管理した — migrated to Project B Phase 4 (fixed-mode = ratchet-down のみ、増加方向 hard fail)
- [x] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認した — migrated to Project B Phase 4
- [x] aag/meta.md §2 の **双方向 integrity 要件 status が「未達成」→「達成」に flip** した — migrated to Project B Phase 4 + Project C Phase 4 (5 AAG-REQ status flip = LAYER-SEPARATION + SEMANTIC-ARTICULATION + ANTI-DUPLICATION + NON-PERFORMATIVE + BIDIRECTIONAL-INTEGRITY、達成 6→11 件)

### follow-up project に逃がす項目 (Phase 8 MVP scope 外、PR review Review 3 P1 #6 反映)

> Phase 3 split decision gate で別 project 化 (例: Project B = rule schema + meta-guard) を
> default とする。本 project の Phase 8 では MVP (4.2 方向 + 4.4 完備性) のみ実装。

- ~~4.1 境界監査 (Boundary Audit) — 目的 / 要件混同検出、Layer 境界違反検出~~ → follow-up project (`architectureRuleGuard.test.ts` の Layer 3 / Layer 4 分離も follow-up)
- ~~4.3 波及監査 (Impact Audit) — cross-cutting impact 検出、obligation map trigger 漏れ検出~~ → follow-up project
- ~~4.5 機能性監査 (Functional Audit) — claim vs actual 全数照合~~ → follow-up project (既存 `health-rules.ts` / Hard Gate / `docStaticNumberGuard.test.ts` / `certificate renderer` が部分的に既 cover)
- ~~`metaRequirementBindingGuard.test.ts` (Layer 1 ↔ Layer 3 binding 専用 guard)~~ → follow-up project (4.2 方向監査の forward / reverse で部分的に cover、独立 guard 化は別途)
- ~~`selfHostingGuard.test.ts` (aag/meta.md 自身の自己整合 hard check)~~ → follow-up project

## Phase 9: DFR registry (Layer 2 新規製本) — **migrated to Project C (`aag-display-rule-registry`、archived 2026-05-01)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project C Phase 1 で完遂。

- [x] `references/01-principles/aag/display-rule-registry.md` を新設した — migrated to Project C Phase 1
- [x] DFR-001 chart semantic color を rule entry として登録した — migrated to Project C Phase 1
- [x] DFR-002 axis formatter via useAxisFormatter を登録した — migrated to Project C Phase 1
- [x] DFR-003 percent via formatPercent を登録した — migrated to Project C Phase 1
- [x] DFR-004 currency via formatCurrency を登録した (thousands separator 明文化) — migrated to Project C Phase 1
- [x] DFR-005 icon via pageRegistry / emoji canonical を登録した — migrated to Project C Phase 1
- [x] Phase 3 で gap 判定された他 rule に対する新規 doc を必要なものに限定して新設した (anti-bloat 適用) — migrated to Project C Phase 1 (DFR-001〜005 の 5 件で MVP scope、他 rule は anti-bloat で scope out)
- [x] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新した — migrated to Project C Phase 1
- [x] `doc-registry.json` に新規 doc を登録した — migrated to Project C Phase 1

## Phase 10: 表示 rule guards 実装 (Layer 4 検証層 instances) — **migrated to Project C (`aag-display-rule-registry`、archived 2026-05-01)**

> §1.6 Phase 3 hard gate decision = B により本 Phase は Project C Phase 2〜3 で完遂。displayRuleGuard
> 5 test (DFR-001=7 / 002=4 / 003=1 / 004=0 fixed / 005=20)、135 file 906 test PASS。

- [x] `displayRuleGuard.test.ts` を rule registry framework として新設した — migrated to Project C Phase 3
- [x] DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` に登録した — migrated to Project C Phase 2 (canonicalDocRef + metaRequirementRefs 'bound')
- [x] DFR-001 baseline 確定 (CHART-004 / CHART-005 の semantic 不使用) — migrated to Project C Phase 3 (baseline=7)
- [x] DFR-002 baseline 確定 (FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び) — migrated to Project C Phase 3 (baseline=4)
- [x] DFR-003 baseline 確定 (BudgetTrend / Seasonal 等の `Math.round(v * 100)`) — migrated to Project C Phase 3 (baseline=1)
- [x] DFR-004 baseline 確定 (survey 結果から) — migrated to Project C Phase 3 (baseline=0 fixed)
- [x] DFR-005 baseline 確定 (survey 結果から) — migrated to Project C Phase 3 (baseline=20)
- [x] 各 rule の migrationRecipe を記入した — migrated to Project C Phase 2
- [x] Phase 8 reverse meta-guard が DFR-001〜005 全てに対して PASS した (双方向 integrity 成立) — migrated to Project C Phase 3 (canonicalDocRefIntegrity + canonicalDocBackLink が DFR-001〜005 全てで PASS = AAG bidirectional integrity の最初の concrete instance 成立)
- [x] aag/meta.md §2 の **performative 防止 要件 status が「未達成」→「達成」に flip** した — migrated to Project C Phase 4 (5 AAG-REQ status flip 完遂、AAG-REQ-NON-PERFORMATIVE を含む)

## 途中判断 checklist (decision gates、AI 自主判断 + judgement criteria 集約)

> **本 section は `references/03-guides/deferred-decision-pattern.md` の最初の application instance**。
> 同 doc は AAG Layer 4A System Operations の制度 doc であり、本 project 固有でなく **AAG 全
> project で再利用可能な deferred decision 制度** を articulate。新規 project spawn 時は同 doc
> を参照して decision gates section を articulate。
>
> 各 Phase 着手前 / 進行中に **AI session が自主的に判断する項目**。判断基準 (criteria) と
> 判断材料の収集元 (collection sources) を doc に embed し、AI が material を収集 → criteria を
> 適用 → decision を log + commit message に記録する。
>
> **設計意図** (`deferred-decision-pattern.md` §1.3 の application):
> AI が判断するための **criteria と collection sources** を doc に articulate しておくことで、
> 後任 AI session でも一貫した judgement が可能。判断結果は本 section 末尾の decision log に
> 追記し、後任が trace + revisit 可能。
>
> **人間判断のまま残す例外** (`deferred-decision-pattern.md` §3.2 適用、構造的安全装置 / 規約):
> - **Phase 5 物理削除 trigger の人間 deletion approval** (legacy-retirement §2、anti-ritual と orthogonal な安全装置、AI が判断しない)
> - **最終レビュー** (project-checklist-governance §3.1 規約、archive obligation の発火 gate、人間承認必須)
>
> 詳細: plan §8.10〜§8.14 / 各 Phase の着手前 prerequisite。
>
> **運用原則**: 各 Phase の checkbox を flip する前に、本 section の対応 decision gate が [x]
> になっていることを確認する (= decision gates が pre-check として機能)。

### Phase 1 着手前判断 (AI 自主判断、4 件)

- [x] **Step 0** (parent project `phased-content-specs-rollout` archive 8-step) 完了確認 — **PR #1222 で main 反映済 (commit `fac575d`、2026-04-30)**
  - **判断基準**: main 上の `projects/completed/phased-content-specs-rollout/checklist.md` line 158 が `[x]` か / `projects/completed/phased-content-specs-rollout/` が `projects/completed/` に移管済か
  - **判断材料の収集元**: `git ls-files projects/completed/phased-content-specs-rollout/` + line 158 状態確認 + `projects/completed/phased-content-specs-rollout/config/project.json` の status field
  - **AI action**: ✅ **完了** (PR #1222 merged、status=archived 確認済)
- [x] **§8.10 AAG Audit home doc 判断** (A: aag/meta.md §3 で articulate / B: aag/audit.md 新規 Create / C: aag/architecture.md 内包) — **decision: A** (本 commit で aag/meta.md §3.2 として landing)
  - **判断基準**:
    - **A 推奨**: AAG Audit の articulate volume が 1 section (50 行以下) で済み、aag/meta.md §3 内に納まる場合
    - **B 推奨**: sub-audit (4.1〜4.5 + 追加候補 4.6〜4.9) が将来増える可能性が高く、独立 doc として責務分離が必要な場合
    - **C 推奨**: AAG architecture (5 層構造) と Audit が structural に一体化していて、aag/architecture.md 内に Layer 4 章として包含する方が clean な場合
  - **判断材料の収集元**: aag/meta.md §3 Core mapping articulation 量見積もり / 追加候補 sub-audit (plan §3.1.5 末尾) の数 / aag/architecture.md の section 構成案 (Phase 4 で確定予定)
  - **AI action**: criteria 適用 → decision (A/B/C) 確定 → commit message + decision log に `decision: <A/B/C>, rationale: <reason>` を記録
- [x] **§8.13 CLAUDE.md 薄化方式判断** (A: 完全 1 link 索引のみ / B: 鉄則 quote (3-5 行) + 詳細 link) — **decision: B** (Phase 4 で実施、Phase 1 では index link のみ追加)
  - **判断基準**:
    - **A 推奨**: `.claude/manifest.json` discovery hint で `aag/` を引ければ AI session 開始時に AAG context を取得可能と判定できる場合
    - **B 推奨**: AI session 開始時の AAG context を最低限維持するため、3-5 行の鉄則 (例: 「製本されないものを guard 化しない」「期間 buffer は anti-ritual」「重複と参照を切り分ける」) を CLAUDE.md inline で残す方が安全と判定する場合
  - **判断材料の収集元**: `.claude/manifest.json` discovery 機能 (`byTopic` / `byExpertise` / `pathTriggers` の articulation 量) / CLAUDE.md AAG セクション現状 core 内容 / Phase 1 で確定する aag/meta.md §1 / §2 の articulate 量
  - **AI action**: criteria 適用 → decision 確定 → commit message + decision log に記録
- [x] **§8.14 Phase 1+3 同期方針判断** (A: 同 PR bundling / B: 順序付き 3 段階 / C: parallel branches) — **decision: B** (推奨 default 通り、Phase 1 skeleton landing → Phase 3 audit landing → Phase 1 §3 fill)
  - **判断基準**:
    - **A 推奨**: Phase 1 deliverable の commit 数 ≤ 3 + Phase 3 audit findings の量 ≤ 5 entry で、相互参照が少なく単一 PR で完結可能な場合
    - **B 推奨 (default)**: skeleton landing → audit landing → §3 fill の 3 段階で parallel comparison が必要、Phase 1 §3 Core mapping を audit 結果で update する設計
    - **C 推奨**: branch 並行運用で最終 merge を行う必要がある場合 (希少)
  - **判断材料の収集元**: Phase 1 deliverable の commit 数見積もり (4 section + Requirement ID + observeForDays = 5+ commits) / Phase 3 audit findings の entry 数 (AAG 関連 8 doc + CLAUDE.md = 9 entry)
  - **AI action**: criteria 適用 → decision 確定 (推奨 = B) → 記録

### Phase 3 完了時判断 (HARD GATE、AI 自主判断、Phase 4 着手必須前提、3 件) — **完了 (§1.6 + decision log で articulate 済)**

- [x] **Phase 3 audit 完了確認** — `references/02-status/aag-doc-audit-report.md` §0〜§8 で全 13 deliverable articulate 完了 (8 doc + CLAUDE.md AAG section、inbound 160+ file references、operation 22 件)
- [x] **Phase 4〜10 split decision** (A: 単一 project 継続 / B: sub-project 分割) — **B 確定** (§1.6 + decision log entry: 2026-04-30 ユーザー articulate「Bでよろしくお願いします」)
- [x] **decision に応じた次工程準備** — B 選択により Project A〜D 4 project bootstrap 完遂 + 各 project archived (Project A: 2026-04-30 / Project B: 2026-05-01 / Project C: 2026-05-01 / Project D: 2026-04-30 case B)、本 project は MVP=Phase 1+3+cyclic refinement で archive 候補に migrate (本 commit)

### Phase 4 着手前判断 (AI 自主判断、2 件) — **migrated to Project A (`aag-core-doc-refactor`、archived 2026-04-30)**

- [x] **§8.13 CLAUDE.md 薄化実施方式の最終確認** — migrated to Project A Phase 4 (B 適用 = 67% 薄化 + 鉄則 quote + 1 link 索引完遂)
- [x] **doc operation 順序原則の遵守 commit 計画 articulate** — migrated to Project A (Phase 1〜6 で Create 先行 → Split/Rewrite → Relocate/Archive 順序で実施)

### Phase 5 進行中判断 (各 archive 移管時、毎 doc ごと、3 件) — **migrated to Project A + Project D**

- [x] **旧 path への inbound 0 機械検証** PASS — migrated to Project A Phase 5 (149+ inbound migrate 完了後 inbound=0 達成、8 旧 doc 全件)
- [x] **§1.5 archive 前 mapping 義務** PASS — migrated to Project A Phase 1〜3 (`aag/architecture.md` §4 旧 4 層 → 新 5 層 mapping table landing 済)
- [x] **物理削除 trigger** (人間判断必須) — N/A (archive 移管段階で停止、人間 deletion approval 未発火、本 project archive scope 外。Project D Phase 4 = case B scope-out)

### Phase 6 着手前判断 (AI 自主判断、2 件) — **migrated to Project B (`aag-rule-schema-meta-guard`、archived 2026-05-01)**

- [x] **§8.12 articulation draft 生成 protocol 確定** — migrated to Project B (ar-rule-audit.md §2 = protocol 正本、batch 1+2 人手 + batch 3 synthesizer で 166 rule 全 bound 完遂)
- [x] **AI 補助 draft の品質基準確認** — migrated to Project B Phase 4 (semanticArticulationQualityGuard が hard fail criteria を機械検証、protocol §2.3 内部重複 0 を機械的に保証)

### Phase 8 着手前判断 (AI 自主判断、2 件) — **migrated to Project B**

- [x] **§8.4.1 Layer 4 sub-audit list 確定** — migrated to Project B Phase 4 (4 meta-guard MVP 実装 = 4.2 方向 + 4.4 完備性、ar-rule-audit.md §6 で 5 follow-up sub-audit articulate 済 = 4.1 境界 / 4.3 波及 / 4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard)
- [x] **follow-up project に逃がす項目の確定** (Phase 8 MVP scope 外) — migrated to Project B Phase 5 (5 follow-up sub-audit を `ar-rule-audit.md §6` に articulate 済、Project E candidate or independent project spawn を judgment gate に逃がす)

### 判断履歴 (decision log、AI 自主判断 + 人間判断の両方を追記)

各 [x] flip 時に「判断者 (AI session ID / 人間)」「判断 trigger」「決定 (A/B/C)」「rationale」「commit SHA」を追記。後任 AI が本 log を読んで一貫した judgement を継承可能。

| 判断 trigger | 判断項目 | 判断者 | 選択 (A/B/C) | rationale (collection sources + criteria 適用) | commit SHA |
|---|---|---|---|---|---|
| Phase 1 着手前 | Step 0 (parent archive) 完了確認 | 人間 + AI | ✅ 完了 | PR #1222 で main 反映済、`projects/completed/phased-content-specs-rollout/` に移管 + status=archived 確認 | `fac575d` (Step 0 archive 8-step) |
| Phase 1 着手前 | §8.10 AAG Audit home doc | AI 自主 | **A** (aag/meta.md §3 で articulate) | aag/meta.md §3 Core mapping 量見積もり = 1 doc 内で管理可能 (50-100 行) / 追加候補 sub-audit (4.6〜4.9) は extensible として Phase 3 audit で確定 / structural 一体化は不要 (Layer 4 = 評価 lens、AAG 構造内部でない) → A 推奨条件 (volume 1 section で済む) を満たす + B/C は将来 sub-audit 拡張時に refactor 可能 | (本 commit) |
| Phase 1 着手前 | §8.13 CLAUDE.md 薄化方式 | AI 自主 | **B** (鉄則 quote + link) | manifest discovery hint は補助、AI session 開始時の dynamic thinking trigger には鉄則 inline が必要 / CLAUDE.md AAG セクション現状の dynamic thinking 誘導 articulation は維持価値あり / Phase 1 では index link のみ追加、Phase 4 で薄化実施 (鉄則 quote 確定) | (本 commit + Phase 4 で実施) |
| Phase 1 着手前 | §8.14 Phase 1+3 同期方針 | AI 自主 | **B** (順序付き 3 段階、推奨通り) | Phase 1 deliverable 5+ commits / Phase 3 audit findings 9 entry → A bundling は単一 PR scope 大きすぎる、C parallel branches は necessity 低い / B 3 段階 (skeleton → audit → §3 fill) は parallel comparison + cyclic refinement 可能 | (本 commit) |
| Phase 3 audit (本 phase の deliverable) | 全 7 項目 + 6 追加 deliverable articulate 完了 | AI 自主 | ✅ 完了 | aag-doc-audit-report.md §0〜§8 で全 13 deliverable articulate (8 doc + CLAUDE.md AAG section、inbound 160+ file references、operation 22 件 = Create 7 + Split 1 + Rewrite 6 + Archive 8) | (Phase 3 audit commit、本 commit 後) |
| Phase 3 完了時 (HARD GATE) | Phase 4〜10 split decision | AI 自主推奨 → **人間判断 gate** (default B) | **B 推奨** (sub-project / follow-up project に分割) | aag-doc-audit-report.md §7.2 rationale: Phase 4 operation 22 件 + commit 15-20 件 + Phase 6 既存 166 rule binding は単一 project の Phase で重い、Level 4 寄り。推奨分割案: Project A (AAG Core doc refactor) + Project B (rule schema + meta-guard) + Project C (DFR registry + guards) + Project D (legacy retirement)。本 project MVP scope = Phase 1 (完了) + Phase 3 (本 commit で完了) | (Phase 3 audit commit + ユーザー判断 = next session) |
| Phase 3 hard gate (AI 推奨段階) | Phase 4〜10 split decision の AI 推奨 articulate | AI 自主推奨 (deferred-decision-pattern §3.1) | **AI 推奨 = B** (default、未確定) | criteria 適用 (audit report §7.2): scope 規模 = operation 22 件 / commit 15-20 件 / 既存 166 rule binding = Level 4 寄り → 単一 project 継続 (A) は scope 過大、分割 (B) が default。但し本 hard gate は **高 blast radius** (project 構造の不可逆判断) のため deferred-decision-pattern §3.2 例外則を適用し、ユーザー確認を必須 gate として運用する (= AI 単独で確定しない) | (本 commit、AI 推奨段階のみ) |
| Phase 3 hard gate (ユーザー確認段階) | Phase 4〜10 split decision の確定 | **人間判断 (ユーザー)** | **B 確定** (= AI 推奨採用) | ユーザー articulate「Bでよろしくお願いします」(2026-04-30) により Project A〜D 分割を確定。本 project は MVP scope (Phase 1 + Phase 3 + cyclic refinement) で完遂、Phase 4〜10 は別 project (仮称 Project A〜D) に移管、本 project は次 session 以降で archive プロセスへ migrate | (本 commit) |

## Future follow-up = Project E (仮称 = AAG Decision Traceability + Quality Connection + Correction Chain + AI Utilization、9 insight 統合)

> **背景**: 2026-04-30 dialog で user articulate された 9 insight (HANDOFF.md §2 で詳細 articulate)。本 section は Project A〜D 完了後に institutional 化する候補を checklist 化、急がない (user articulate)、適切なタイミングで spawn。
>
> **着手 trigger**: Project A〜D 完了後 (本 project archive 直前 or 直後)、または本 project archive 後の独立 follow-up として spawn。

### Project E spawn 前 prerequisite — **完了 (Project A〜D 全 archived)**

- [x] Project A 完了 — ✅ archived 2026-04-30 (`projects/completed/aag-core-doc-refactor/`、commit `cf8d995`)
- [x] Project B 完了 — ✅ archived 2026-05-01 (`projects/completed/aag-rule-schema-meta-guard/`、commit `35c2e17`)
- [x] Project C 完了 — ✅ archived 2026-05-01 (`projects/completed/aag-display-rule-registry/`、commit `d18dd3e`)
- [x] Project D 必要性 re-evaluate 完了 — ✅ archived 2026-04-30 case B early scope-out (`projects/completed/aag-legacy-retirement/`、commit `aaffaf7`)

### Project E MVP-1 (Level 2、即効可能、concept doc landing) — **N/A (本 project scope 外、follow-up Project E candidate に articulate 済、HANDOFF.md §2 + §「Future follow-up」section)**

- [x] `references/03-guides/decision-trace-pattern.md` 新設 — N/A (Project E spawn 待ち、本 project archive 後に judgment gate で spawn 着手)
- [x] `references/03-guides/human-review-specification.md` 新設 — N/A (Project E candidate)
- [x] `references/03-guides/ai-utilization-patterns.md` 新設 — N/A (Project E candidate、Insight 9 = AI utilization friendliness)
- [x] `docs/contracts/doc-registry.json` に 3 新 doc 登録 — N/A (Project E)
- [x] `references/README.md` 索引に 3 新 doc articulate — N/A (Project E)

### Project E MVP-2 (Level 2、retrospective retrofit) — **N/A (本 project scope 外、Project E candidate)**

- [x] 本 project の Phase 3 hard gate decision を decision-trace-pattern.md schema 化 — N/A (Project E candidate、retrospective retrofit application instance として articulate 済)
- [x] Project A〜D の各 Phase 完了 decision を decision-trace 化 — N/A (Project E candidate)
- [x] decision-log.json 形式の sample articulate — N/A (Project E candidate)

### Project E Full (Level 3、AAG-REQ-* 拡張 + meta-guard + correction chain) — **N/A (本 project scope 外、Project E candidate)**

- [x] `aag/meta.md` §2 update — 9 新 AAG-REQ-* 追加 — N/A (Project E candidate、9 insight 統合)
- [x] `AAG-REQ-NO-AI-HUMAN-SUBSTITUTION` を最終 narrow — N/A (Project E candidate、Insight 7-a + 7-b)
- [x] `aag/meta.md` §3.2 audit framework に新 sub-audit 追加 (4.6 Retrospective Audit + 4.7 AI-Usability Audit) — N/A (Project E candidate)
- [x] DecisionTrace schema 実装 — N/A (Project E candidate)
- [x] `_template/checklist.md` 最終レビュー checkbox を view list + judgment criteria + approval record 必須形式に extend — N/A (Project E candidate)
- [x] `references/03-guides/deferred-decision-pattern.md` §3.2 縮小 — N/A (Project E candidate)
- [x] correction chain mechanism 実装 (rollback / supersede / accept-as-debt 3 経路) — N/A (Project E candidate、Insight 4 + 8)
- [x] health KPI + certificate + Layer 4.5 Functional Audit と decision trace の双方向 link mechanism — N/A (Project E candidate)
- [x] meta-guard 実装: `decisionTraceSchemaGuard` / `rollbackAnchorPreservationGuard` / `qualityImpactLinkGuard` / `aiUtilizationFriendlinessGuard` — N/A (Project E candidate)

### Project F (仮称 = AI Utilization Tooling、Project E の延長 candidate) — **N/A (本 project scope 外、Project F candidate)**

- [x] `tools/decision-trace-cli.ts` (or claude command) 新設 — N/A (Project F candidate、Insight 9 AI utilization tooling)
- [x] `.claude/manifest.json` discovery 拡張 — N/A (Project F candidate)
- [x] retrospective audit の trigger 自動化 — N/A (Project F candidate)
- [x] umbrella requirement への集約検討 (9 件 AAG-REQ-* → `AAG-REQ-DECISION-LIFECYCLE` umbrella) — N/A (Project F candidate)

### Project E + F 着手前判断 (decision gates、AI 自主判断 + 適切なタイミング) — **N/A (本 project archive 後、Project E spawn judgment gate で実施)**

- [x] **着手 trigger 確認**: Project A〜D 完了済 — ✅ 全 4 project archived (本 project archive で MVP scope 完了 milestone 到達)、Project E spawn judgment gate に進む準備完了
- [x] **MVP-1 / MVP-2 / Full / Project F 分割の確定** — N/A (Project E spawn judgment gate で実施)
- [x] **品質 foundation 議論** (Tension A) — N/A (Project E spawn judgment gate)
- [x] **rollback blast radius 判定基準** (Tension C) — N/A (Project E spawn judgment gate)
- [x] **supersede vs rollback 使い分け基準** (Tension D) — N/A (Project E spawn judgment gate)
- [x] **AAG-REQ-* expansion vs umbrella 集約判断** (Tension E) — N/A (Project E spawn judgment gate)

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [x] 全 Phase (1〜10) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する — **2026-05-01 ユーザー承認** (本 commit、Insight 7-b milestone acknowledgment、Project A〜D 4 project 全 MVP scope 完了 milestone を踏まえて archive プロセスへの移行を承認)
- [x] 全 decision gates ([途中判断 checklist] section) が [x] flip 済 + decision log に記録済 — ✅ 全 decision gates flip 済 (Phase 1 着手前 4 件 + Phase 3 hard gate 3 件 + Phase 4 着手前 2 件 + Phase 5 進行中 3 件 + Phase 6 着手前 2 件 + Phase 8 着手前 2 件、decision log §「判断履歴」に AI 推奨 + ユーザー確認 = B 確定 articulate 済)
- [x] Future follow-up Project E (+ Project F) の articulation を人間レビューし、spawn 着手 trigger を確認 (実 spawn は本 project archive 後) — ✅ Project E + F articulation 完備 (HANDOFF.md §2「Future follow-up project 候補」+ 本 checklist §「Future follow-up = Project E」+ 9 insight 統合)、本 project archive 完遂 = Project A〜D 全 MVP 完了 milestone を trigger として Project E spawn judgment gate に逃がす

### Approval Record (Insight 7-b milestone acknowledgment)

> **承認 trigger**: Project A〜D 4 project 全 MVP scope 完了 milestone (2026-05-01) + 親 project MVP scope (Phase 1 + Phase 3 + cyclic refinement) 完遂 + AAG framework MVP scope 達成度 11/12 (達成 = `AAG-REQ-BIDIRECTIONAL-INTEGRITY` 含む 11 件、未達成 = `AAG-REQ-SELF-HOSTING` 1 件のみ、follow-up に articulate 済)。
>
> **判断 view list** (人間がレビューした素材):
>
> 1. Project A archive (`projects/completed/aag-core-doc-refactor/`、commit `cf8d995`、2026-04-30) — AAG Core 6 新 doc + 8 旧 doc archive 移管、CLAUDE.md 67% 薄化、AAG-REQ-LAYER-SEPARATION 達成
> 2. Project D archive (`projects/completed/aag-legacy-retirement/`、commit `aaffaf7`、2026-04-30) — case B early scope-out (拡張案件 0 件)
> 3. Project B archive (`projects/completed/aag-rule-schema-meta-guard/`、commit `35c2e17`、2026-05-01) — SemanticTraceBinding 型 family + 166 rule 全 bound + 4 meta-guard MVP、AAG-REQ-SEMANTIC-ARTICULATION + ANTI-DUPLICATION + NON-PERFORMATIVE 達成
> 4. Project C archive (`projects/completed/aag-display-rule-registry/`、commit `d18dd3e`、2026-05-01) — DFR registry + DFR-001〜005 + displayRuleGuard、AAG-REQ-BIDIRECTIONAL-INTEGRITY 達成 (AAG bidirectional integrity の最初の concrete instance 成立)
> 5. `references/01-principles/aag/meta.md` §4 達成判定総括 — 達成 11 件 / 未達成 1 件 (`AAG-REQ-SELF-HOSTING`、follow-up に articulate 済)
> 6. test:guards 135 file 906 test PASS / docs:check Hard Gate PASS (Project C archive 時点)
>
> **judgment criteria** (承認の根拠):
>
> 1. MVP scope (Phase 1 + Phase 3 + cyclic refinement) 完遂 — Phase 1 charter doc landing + Phase 3 audit landing + §3 Core mapping cyclic refinement 全完遂
> 2. Phase 4〜10 split decision = B 確定後の Project A〜D 全 archive 完遂 — 4/4 archived
> 3. AAG framework MVP scope 達成度 11/12 — 残 1 件 (`AAG-REQ-SELF-HOSTING`) は follow-up project candidate に articulate 済
> 4. Insight 7-b milestone acknowledgment — 「ここから先は不可逆、今から行いますよ」の ceremonial commitment、本 archive は AAG framework MVP scope 全揃いの milestone を踏み越える不可逆ステップ
>
> **承認**: 上記 view list + judgment criteria に基づき、**2026-05-01 ユーザー承認** で archive プロセスへの移行を承認 (本 commit)。
