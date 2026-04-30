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

## Phase 2: AAG rule metadata 拡張 (semantic articulation 構造 + status field)

> 着手前 prerequisite: plan §8.2 (BaseRule schema 確認) + §8.9 (`principleRefs` semantic 化検討)
>
> **変更対象正本** (PR review #2 反映、defaults.ts は execution overlay = 運用状態のため対象外):
> - 型定義: `app/src/test/aag-core-types.ts` または `app/src/test/architectureRules/types.ts`
> - 実データ: `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule の物理正本、`ARCHITECTURE_RULES` 配列)
> - derived consumer: `app/src/test/architectureRules/merged.ts`
> - **`guardCategoryMap.ts` は touch しない** (PR review #4 反映、二重正本回避: BaseRule のみが semantic binding 正本)

- [ ] `architectureRules/types.ts` (or `aag-core-types.ts`) に **`SemanticTraceBinding<T>` 型 + `CanonicalDocTraceRef` / `MetaRequirementTraceRef`** を追加した:
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
- [ ] **`RuleBinding` 型** (`architectureRules/types.ts`) に下記 field を追加した (PR review #3 反映、`RuleSemantics` ではなく `RuleBinding` 側に置く理由は docPath がリポジトリ固有具体値のため):
  - `canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` (実装 → 設計 doc binding)
  - `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` (実装 → 要件 binding)
- [ ] `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` 全 rule に下記初期値を設定した (PR review #2 #4 反映、空配列でなく status object で「未対応」と「意図的不要」を区別):
  - `canonicalDocRef: { status: 'pending', refs: [] }`
  - `metaRequirementRefs: { status: 'pending', refs: [] }`
- [ ] `architectureRules/defaults.ts` (execution overlay) は **触らない** ことを確認した (semantic binding は運用状態でなく rule 正本側に置く)
- [ ] `guardCategoryMap.ts` は **触らない** ことを確認した (二重正本回避、category / layer / note のまま)
- [ ] TypeScript 型定義の整合を確認した (build / lint PASS、`merged.ts` 経由で consumer から canonicalDocRef + metaRequirementRefs にアクセス可能)

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

## Phase 4: AAG Core doc content refactoring (新規書き起こし優先、4 sub-phase 構成)

> 着手前 prerequisite: Phase 3 audit 完了 + Phase 3 split hard gate 通過 + plan §8.8 (命名 / ディレクトリ整合性) + Phase 1 aag/meta.md skeleton 完了
>
> **sub-phase 構成** (改善 2 反映、Phase 4 単体で 10+ commits 想定のため事前 articulation。Phase 3
> hard gate で「単一 project 継続」判定の場合に本 sub-phase 構成を適用、「分割」判定の場合は
> Project A = AAG Meta + Core doc refactor の Phase 構造として適用):

### Phase 4.1. Create 段階 (新 path 新 doc Create)

- [ ] `references/01-principles/aag/strategy.md` を新規 Create (戦略マスター、旧 adaptive-architecture-governance.md core を Split + Rewrite)
- [ ] `references/01-principles/aag/architecture.md` を新規 Create (5 層構造定義 + 旧 4 層 → 新 5 層 mapping table、旧 aag-5-constitution.md を Rewrite + Relocate + Rename)
- [ ] `references/01-principles/aag/evolution.md` を新規 Create (進化動学、旧 adaptive-governance-evolution.md を Rewrite + Relocate + Rename)
- [ ] `references/01-principles/aag/operational-classification.md` を新規 Create (now/debt/review 区分、旧 aag-operational-classification.md を Rewrite + Relocate)
- [ ] `references/01-principles/aag/source-of-truth.md` を新規 Create (正本/派生物/運用物、旧 aag-5-source-of-truth-policy.md を Rewrite + Relocate + Rename)
- [ ] `references/01-principles/aag/layer-map.md` を新規 Create (5 層 マッピング、旧 aag-5-layer-map.md を Rewrite + Relocate + Rename)
- [ ] 各 doc を独立 commit で landing (parallel comparison 期間を確保)

### Phase 4.2. Split / Merge 段階 (内容分割 / 統合)

- [ ] `adaptive-architecture-governance.md` (戦略 + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table 同居) を Split:
  - 戦略マスター → `aag/strategy.md`
  - 文化論 + 「AAG が防ぐ AI の本質的弱点」+ 「意図的に残す弱さ」 → `aag/strategy.md` or `aag/meta.md` 振り分け
  - 旧 4 層 → Archive (`99-archive/`)
  - バージョン履歴 → per-doc 分散
- [ ] 各 Split を独立 commit で履歴記録

### Phase 4.3. Rewrite 段階 (内容を新 path で完成)

- [ ] 各新 doc に **5 層位置付け + drill-down pointer + semantic articulation** を装着
- [ ] 各新 doc の `## Mechanism Enforcement` section を articulate (Phase 7 で fill する base 構造)
- [ ] Layer 3 (実装) と Layer 4 (検証) を明示分離 (混在 guard の責務再分離は Phase 8 + follow-up で実施、Rewrite 時に articulate のみ)
- [ ] **CLAUDE.md AAG セクション薄化** (Phase 4.3 で実施、§8.13 判断 A or B を反映): 「AAG を背景にした思考」の core を `aag/meta.md` に逃がし、CLAUDE.md は `aag/README.md` への 1 link 索引のみに

### Phase 4.4. Cleanup 段階 (registry / contract update)

- [ ] **`docs/contracts/doc-registry.json`** に新 doc 群を登録、旧 doc を deprecation marker 段階に置く (まだ archive しない、Phase 5 で対応)
- [ ] **`docs/contracts/principles.json`** の reference を新 path に migrate
- [ ] **`.claude/manifest.json`** の `discovery.byTopic` / `byExpertise` / `pathTriggers` の path を新 path に migrate
- [ ] obligation map (`tools/architecture-health/src/collectors/obligation-collector.ts`) の path を新 path に migrate
- [ ] 各 operation 独立 commit で履歴を残し、parallel comparison 期間に entered (Phase 5 archive 移管 trigger = 旧 path への inbound 0 機械検証を待つ)

## Phase 5: legacy 撤退 (旧 doc archive、inbound 0 trigger)

> 着手前 prerequisite: Phase 4 完了 + 旧 path への inbound migration 完了

- [ ] `legacy-retirement.md` を実値で update した (Phase 3 audit の Archive 候補対象を埋める)
- [ ] 各旧 doc の **inbound 0 機械検証** を実施した (旧 path への参照を全 doc / 全 registry / 全 guard binding で grep)
- [ ] inbound 0 確認した旧 doc を `references/99-archive/` に移管した (migrationRecipe + 履歴付き)
- [ ] 99-archive 配下の旧 doc に対する inbound も 0 になった file を物理削除した (即時、buffer なし)
- [ ] doc-registry.json + principles.json + manifest.json の reflect を完了した

## Phase 6: 既存 AR-NNN rule の audit + binding (partial、初期 batch 別出し)

> 着手前 prerequisite: Phase 3 audit 完了 + Phase 4 refactor 完了 (新 path で binding 記入) + plan §8.12 articulation draft 生成 protocol

### Phase 6.1. 初期 batch (articulation draft 生成 protocol 確定、改善 3 反映)

> **目的** (改善 3 = PR review #4 反映): 100+ rule への一括 articulation 記入は無理がある。
> 最初に 5-10 rule で **articulation draft 生成 protocol** を確定し、scaling 可能な手順を articulate
> してから漸次対応に進む。

- [ ] 既存 rule から **分類 A 候補 (自明な既製本) を 5-10 rule** 選定した (例: AR-PATH-SALES, AR-PATH-DISCOUNT 等の path guard 群)
- [ ] 各 rule の `note` / `what` / `why` field から **AI 補助で初期 draft 生成** (problemAddressed + resolutionContribution の draft)
- [ ] draft を **人間 review** で validate (品質基準 = §3.4.5 hard fail 通過 + 意味的妥当性確認)
- [ ] **articulation draft 生成 protocol** を `references/02-status/ar-rule-audit.md` 冒頭に articulate (今後の rule binding 作業で参照する標準 procedure)
- [ ] 5-10 rule の `canonicalDocRef` + `metaRequirementRefs` を `status: 'bound'` で記入完了 (本 phase の MVP 完遂条件)

### Phase 6.2. 残 rule の漸次対応 (ratchet-down)

- [ ] Phase 3 mapping を input に既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit した
- [ ] 分類 A の rule に Phase 6.1 protocol で `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 付きで漸次記入 (一括ではなく ratchet-down で `status: 'pending'` baseline 減少)
- [ ] 分類 D (proxy / performative) の rule の sunset trigger を確定した
- [ ] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示した
- [ ] audit 結果を `references/02-status/ar-rule-audit.md` に記録した
- [ ] Phase 8 status='pending' baseline を確定 (ratchet-down 起点)

## Phase 7: Layer 2 doc に back link section + drill-down semantic 装着

> 着手前 prerequisite: plan §8.7 (Layer 2 doc の rule canonization 状態確認) + Phase 6 binding 完了

- [ ] `04-design-system/docs/` 関連 doc に `## Mechanism Enforcement` section を追加した
- [ ] `01-principles/` 関連 doc (rule 定義系) に同 section を追加した
- [ ] `03-guides/` 関連 doc (数値表示ルール / coding-conventions 等) に同 section を追加した
- [ ] 各 section の各 entry が **3 要素を保持** (AR rule ID + 要件 ID + architect 寄与 articulation) を確認した

## Phase 8: Layer 4 sub-audit MVP 実装 (4.2 方向 + 4.4 完備性 のみ)

> 着手前 prerequisite: Phase 2 schema 拡張完了 + Phase 6 / Phase 7 binding 完了 + plan §8.4.1 (Layer 4 sub-audit list 確定)
>
> **MVP scope** (PR review #5 + Review 3 P1 #6 反映): 5 sub-audit (4.1〜4.5) を一気に実装すると
> 新たな governance debt 化のため、**MVP は 4.2 方向 + 4.4 完備性 のみ**。4.1 境界 / 4.3 波及 /
> 4.5 機能性 + selfHostingGuard + metaRequirementBindingGuard は **follow-up project に逃がす**
> (Phase 3 split decision gate で別 project 化 default)。

### Phase 8.2. 4.2 方向監査 (Direction Audit) sub-audit (MVP)

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse) を新設し、各 AR rule の `canonicalDocRef.refs` の各 entry について docPath 実在 + rule ID 出現 + articulation non-empty を検証した
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward) を新設し、canonical doc の `## Mechanism Enforcement` section の各 entry について AR ID + 要件 ID + articulation non-empty を検証した
- [ ] 5 層依存原則 (本体側 layer-boundary 縦スライスの 4 層依存原則と同型) の AAG 内部適用を検証した

### Phase 8.4. 4.4 完備性監査 (Completeness Audit) sub-audit (MVP)

- [ ] `semanticArticulationQualityGuard.test.ts` を新設した (PR review #5 + Review 3 P1 #7 反映、構文整合 hard fail / 意味品質 warning):
  - **hard fail**: 禁止 keyword (TBD/N/A/same/see above/misc/various/`-`/unknown 等) のマッチ
  - **hard fail**: `problemAddressed` / `resolutionContribution` / `justification` 各 20 文字以上
  - **hard fail**: 同 rule 内で `problemAddressed` と `resolutionContribution` 完全一致禁止
  - **warning** (sample audit + Discovery Review、hard fail にしない): 意味的に「それっぽい空文」(例: 「該当する」「対応する」のみ) — human review でのみ判定
- [ ] `statusIntegrityGuard.test.ts` を新設した (status field の整合性、binding wrapper の正しさ):
  - `status='bound'` のとき `refs.length > 0` を hard check
  - `status='not-applicable'` のとき `justification` 必須 + 上記品質基準を適用
  - `status='pending'` の rule 数を baseline 化、ratchet-down で漸次解消 (新規 rule では `status='pending'` を hard fail で禁止)
- [ ] 既存 `docRegistryGuard.test.ts` / `docCodeConsistencyGuard.test.ts` / Discovery Review が 4.4 完備性に分類されることを確認した (実装は touch しない、分類 articulation のみ)

### Phase 8.6. 共通 (MVP)

- [ ] 各 sub-audit に **個別 baseline + 個別 fixNow** を持たせた (混在 baseline は責務分離違反、C1 適用)
- [ ] 例外 allowlist の baseline を機械管理した (ratchet-down のみ、増加禁止)
- [ ] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認した
- [ ] aag/meta.md §2 の **双方向 integrity 要件 status が「未達成」→「達成」に flip** した

### follow-up project に逃がす項目 (Phase 8 MVP scope 外、PR review Review 3 P1 #6 反映)

> Phase 3 split decision gate で別 project 化 (例: Project B = rule schema + meta-guard) を
> default とする。本 project の Phase 8 では MVP (4.2 方向 + 4.4 完備性) のみ実装。

- ~~4.1 境界監査 (Boundary Audit) — 目的 / 要件混同検出、Layer 境界違反検出~~ → follow-up project (`architectureRuleGuard.test.ts` の Layer 3 / Layer 4 分離も follow-up)
- ~~4.3 波及監査 (Impact Audit) — cross-cutting impact 検出、obligation map trigger 漏れ検出~~ → follow-up project
- ~~4.5 機能性監査 (Functional Audit) — claim vs actual 全数照合~~ → follow-up project (既存 `health-rules.ts` / Hard Gate / `docStaticNumberGuard.test.ts` / `certificate renderer` が部分的に既 cover)
- ~~`metaRequirementBindingGuard.test.ts` (Layer 1 ↔ Layer 3 binding 専用 guard)~~ → follow-up project (4.2 方向監査の forward / reverse で部分的に cover、独立 guard 化は別途)
- ~~`selfHostingGuard.test.ts` (aag/meta.md 自身の自己整合 hard check)~~ → follow-up project

## Phase 9: DFR registry (Layer 2 新規製本)

> 着手前 prerequisite: Phase 8 meta-guard landing 完了 + plan §8.6 DFR-001〜005 の実 baseline survey 完了

- [ ] `references/01-principles/aag/display-rule-registry.md` を新設した
- [ ] DFR-001 chart semantic color を rule entry として登録した (Layer 1 source link / Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe / metaRequirementRefs semantic 付き)
- [ ] DFR-002 axis formatter via useAxisFormatter を登録した
- [ ] DFR-003 percent via formatPercent を登録した
- [ ] DFR-004 currency via formatCurrency を登録した (thousands separator 明文化)
- [ ] DFR-005 icon via pageRegistry / emoji canonical を登録した
- [ ] Phase 3 で gap 判定された他 rule に対する新規 doc を必要なものに限定して新設した (anti-bloat 適用)
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新した
- [ ] `doc-registry.json` に新規 doc を登録した

## Phase 10: 表示 rule guards 実装 (Layer 4 検証層 instances)

> 着手前 prerequisite: Phase 8 meta-guard landing 完了 + Phase 9 DFR registry landing 完了

- [ ] `displayRuleGuard.test.ts` を rule registry framework として新設した
- [ ] DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule 物理正本) に登録した (`canonicalDocRef` + `metaRequirementRefs` を `SemanticTraceBinding<T>` 形式で semantic articulation 付き)。`defaults.ts` (overlay) と `guardCategoryMap.ts` には **置かない** (二重正本回避)
- [ ] DFR-001 baseline 確定 (CHART-004 / CHART-005 の semantic 不使用)
- [ ] DFR-002 baseline 確定 (FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び)
- [ ] DFR-003 baseline 確定 (BudgetTrend / Seasonal 等の `Math.round(v * 100)`)
- [ ] DFR-004 baseline 確定 (survey 結果から)
- [ ] DFR-005 baseline 確定 (survey 結果から)
- [ ] 各 rule の migrationRecipe を記入した (fix 方法を機械生成可能に)
- [ ] Phase 8 reverse meta-guard が DFR-001〜005 全てに対して PASS した (双方向 integrity 成立)
- [ ] aag/meta.md §2 の **performative 防止 要件 status が「未達成」→「達成」に flip** した

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

### Phase 3 完了時判断 (HARD GATE、AI 自主判断、Phase 4 着手必須前提、3 件)

- [ ] **Phase 3 audit 完了確認**: 全 AAG 関連 doc に対して 5 層位置付け / 責務 / write/non-write list / drill-down pointer / operation / 影響範囲 / migration order が articulate された
  - **判断基準**: `references/02-status/aag-doc-audit-report.md` の各 doc entry が 7 項目全て fill されている
  - **判断材料の収集元**: aag-doc-audit-report.md の各 entry 完成度 (grep / line count)
  - **AI action**: 未完了 doc を identify → audit 完遂後に本 checkbox flip
- [ ] **Phase 4〜10 split decision** (A: 単一 project 継続 / B: sub-project / follow-up project 分割)
  - **判断基準**:
    - **A 推奨**: Phase 3 audit findings で「scope は管理可能」と正当化される (= AAG Core doc 数が想定通り 8 doc 以下、operation 数が想定通り 7 種類以下、影響範囲が project 内で完結)
    - **B 推奨 (default)**: audit findings で「scope が想定超過」(= doc 数 > 8、operation 数 > 7、影響範囲が project 横断) → follow-up project 分割 (Project A: AAG Meta + Core doc / Project B: rule schema + meta-guard / Project C: DFR registry + guards / Project D: legacy retirement)
  - **判断材料の収集元**: aag-doc-audit-report.md findings (doc 数 / operation 数 / 影響範囲) / project-health.json の checklist 件数 (現状 100+ 想定、超過なら B)
  - **AI action**: criteria 適用 → decision 確定 → `aag-doc-audit-report.md` 末尾に rationale articulate → commit message + decision log に記録
- [ ] **decision に応じた次工程準備**
  - A 選択時: Phase 4 sub-phase 化 (4.1 Create / 4.2 Split / 4.3 Rewrite / 4.4 Cleanup) の必要性を判断 + 着手準備
  - B 選択時: 対象 Phase 群 (Project A〜D) の別 project metadata (config/project.json + AI_CONTEXT + HANDOFF + plan + checklist) を準備、本 project は MVP=Phase 1〜3 で archive 候補に migrate

### Phase 4 着手前判断 (AI 自主判断、2 件)

- [ ] **§8.13 CLAUDE.md 薄化実施方式の最終確認**: Phase 1 で確定した A or B を Phase 4 で実施
  - **判断基準**: Phase 1 判断時点と現在 (Phase 4 着手時) で、AAG context の articulate 量に変化があるか確認 (大きな変化なら踏襲、変化大なら revisit)
  - **判断材料の収集元**: Phase 1 decision log の rationale / aag/meta.md §1 §2 の current articulation / CLAUDE.md AAG セクション current 内容
  - **AI action**: Phase 1 判断 踏襲 / revisit を decision log に追記
- [ ] **doc operation 順序原則の遵守 commit 計画 articulate**
  - **判断基準**: plan §3.5 (Create 先行 → Split / Merge / Rewrite 中段 → Rename / Relocate / Archive 後段) に従う commit 順序を Phase 4.1〜4.4 別に articulate
  - **判断材料の収集元**: Phase 3 audit findings の operation 判定 (各 doc に対する Create / Split / Merge / Rewrite / Rename / Relocate / Archive)
  - **AI action**: commit 順序 plan を `aag-doc-audit-report.md` または HANDOFF に articulate

### Phase 5 進行中判断 (各 archive 移管時、毎 doc ごと、3 件)

- [ ] **旧 path への inbound 0 機械検証** PASS (各 doc ごと、AI 自主判断)
  - **判断基準**: 旧 path への inbound 参照が grep で 0 件
  - **判断材料の収集元**: `git grep "<旧 path>"` 全 doc / registry / guard binding 横断 / `docRegistryGuard.test.ts` PASS
  - **AI action**: 0 件確認後に archive 移管 commit
- [ ] **§1.5 archive 前 mapping 義務** PASS (AI 自主判断)
  - **判断基準**: 新 doc に「旧概念 → 新概念 mapping table」が landed
  - **判断材料の収集元**: `aag/architecture.md` の §4.1 mapping table grep / 各新 doc の mapping section 確認
  - **AI action**: mapping landing 後に archive 移管に進む
- [ ] **物理削除 trigger** (anti-ritual と orthogonal な安全装置、**人間判断必須、AI 判断しない**)
  - **trigger 条件**: archive 配下 file への inbound 0 機械検証 + **人間 deletion approval** (frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit`)
  - **判断者**: 人間レビューア (AI でなく)
  - **AI action**: archive 移管後の物理削除は AI が独自判断で実行しない、人間 approval を待つ

### Phase 6 着手前判断 (AI 自主判断、2 件)

- [ ] **§8.12 articulation draft 生成 protocol 確定**
  - **判断基準**: Phase 6.1 で 5-10 rule (分類 A 候補、自明な既製本) で AI 補助 draft → AI 自主 review (§3.4.5 hard fail PASS) で protocol を確定し `ar-rule-audit.md` 冒頭に articulate
  - **判断材料の収集元**: 既存 100+ AR rule の `note` / `what` / `why` field、Phase 3 audit の rule canonization mapping、§3.4.5 hard fail criteria
  - **AI action**: 5-10 rule で protocol 確定 → ar-rule-audit.md に articulate → decision log に「protocol confirmed at: <commit SHA>」記録
- [ ] **AI 補助 draft の品質基準確認**
  - **判断基準**: §3.4.5 hard fail (禁止 keyword + 20 文字 minimum + 重複検出 + status 整合性 + path 実在) PASS を draft 生成 prompt に embed
  - **判断材料の収集元**: plan §3.4.5 articulation
  - **AI action**: draft 生成 prompt に hard fail criteria を embed、自動 PASS check

### Phase 8 着手前判断 (AI 自主判断、2 件)

- [ ] **§8.4.1 Layer 4 sub-audit list 確定**
  - **判断基準**: initial 5 (4.1 境界 / 4.2 方向 / 4.3 波及 / 4.4 完備性 / 4.5 機能性) + 追加候補 (4.6 同期 / 4.7 ratchet / 4.8 退役 / 4.9 例外 lifecycle) の collapse 可否を Phase 3 audit findings に基づき確定:
    - **collapse 可**: 追加候補が initial 5 の範疇に収まる場合 (例: 4.6 同期 → 4.4 完備性に collapse)
    - **独立 articulate 必要**: 追加候補が initial 5 と orthogonal な責務を持つ場合
  - **判断材料の収集元**: Phase 3 audit findings の sub-audit responsibility 分析 / 既存 guard の sub-audit 分類 (plan §3.1.5)
  - **AI action**: collapse / 独立 を decision log に articulate
- [ ] **follow-up project に逃がす項目の確定** (Phase 8 MVP scope 外)
  - **判断基準**: 4.1 境界 / 4.3 波及 / 4.5 機能性 + selfHostingGuard + metaRequirementBindingGuard を follow-up project (Project B: rule schema + meta-guard) に逃がす確認
  - **判断材料の収集元**: Phase 3 split decision (A 単一継続なら本 project の Phase 8 follow-up section に逃がす / B 分割なら Project B に逃がす) / plan §3.1.5 + checklist Phase 8 MVP scope
  - **AI action**: follow-up 配置先を decision log に確定

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

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (1〜10) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
- [ ] 全 decision gates ([途中判断 checklist] section) が [x] flip 済 + decision log に記録済
