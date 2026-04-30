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

## Phase 0.5: terminology / scope 整合性修正 (Phase 1 execution 前 prerequisite)

> **目的**: PR review で identify された計画段階の不整合を解消。Phase 1 execution 前に必須。

- [x] AI_CONTEXT.md の scope contradiction を修正した (「含まない」から「既存 AR-NNN rule 振る舞い変更」を削除、`breakingChange=true` 側に整合 = breaking-changes.md §1.6 + plan §1.2 #10 と一致)
- [x] 4 層 / 5 層 の表記ゆれを全 project doc で解消した (旧 4 層 = 旧 Constitution/Schema/Execution/Operations を指す場合のみ「旧 4 層」明記、AAG architecture pattern は「5 層」に統一)
- [x] `breakingChange=true` と nonGoals の整合性を確認した (projectization.md / config/project.json / AI_CONTEXT.md / HANDOFF.md / breaking-changes.md / plan.md §5 やってはいけないこと が一貫)
- [x] Phase 3 audit 完了後の project split review checkbox を Phase 3 末尾に追加した
- [x] Phase 2 schema 初期化方針を強化 (空配列 → status field: pending/not-applicable/bound、未対応と意図的不要を区別)
- [x] Phase 8 semantic articulation quality 強化 (TBD/N/A/same/see above 等の禁止 + minimum 文字数 chacking)
- [x] legacy-retirement archive 前 mapping 義務化 (旧 4 層 → 新 5 層 mapping を新 doc に必須、`aag-four-layer-architecture.md` archive 前の prerequisite)

## Phase 1: AAG Meta doc (`aag/meta.md`) の新規創出 (Layer 0+1)

> 着手前 prerequisite: plan §8.5 (registry / contract 系の現実 schema 確認) + §8.8 (命名規則 / ディレクトリ階層化整合性) + §8.9 (もう一押し候補の integrate 判断: A / C / E / F / G / J)

- [ ] `references/01-principles/aag/meta.md` を新規 Create し、§1 目的 (Purpose、Layer 0、1-2 段落) を記述した
- [ ] `aag/meta.md` §2 要件 (Requirements、Layer 1) を記述した — 不変条件 + 禁則 table、各行に enforcing AR-rule + state-based 達成条件 + 達成 status (双方向 integrity / state-based / self-hosting / ratchet-down / non-performative 等)
- [ ] `aag/meta.md` §3 AAG Core 構成要素 mapping (5 層 × 5 縦スライス matrix) を記述した
- [ ] `aag/meta.md` §4 達成判定総括 (全要件の達成度サマリ + 不達成解消責務) を記述した
- [ ] `references/01-principles/aag/README.md` を新規 Create した (aag/ ディレクトリ index、CLAUDE.md からの 1 link entry)
- [ ] `docs/contracts/doc-registry.json` に新 doc 群 (`aag/meta.md` + `aag/README.md`) を登録した
- [ ] CLAUDE.md AAG セクションに `aag/README.md` への 1 行索引 link を追加した (詳細薄化は Phase 4)
- [ ] charter doc の人間 review を経て確定した (Constitution 改訂と同等の慎重さ)

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

- [ ] **5 層位置付け** (Layer 0/1/2/3/4 / 境界 のどれか) を articulate した
- [ ] **責務** (1 doc 1 責務、C1 適用) を articulate した
- [ ] **書くべきこと (write list)** + **書かないこと (non-write list)** を articulate した
- [ ] **drill-down pointer** (上位 back-pointer + 下位 drill-down) を articulate した
- [ ] **必要 operation** (Create / Split / Merge / Rename / Relocate / Rewrite / Archive のどれか、複数可) を判定した
- [ ] **影響範囲 inventory** (inbound link 数 / 索引 / registry / guard binding) を集約した
- [ ] **migration order** (operation 間の依存 + commit 順序) を articulate した

追加 deliverable:

- [ ] AR-rule canonization mapping (人間語 → AR rule ID 候補) を作成した
- [ ] gap 識別 / redundancy 識別 / staleness 識別を完了した
- [ ] 5 縦スライス境界の reshape 必要性を判定した
- [ ] Layer 3 (実装) と Layer 4 (検証) に混在している guard を identify した
- [ ] **新 5 層 (目的 / 要件 / 設計 / 実装 / 検証) と 既存 AAG 5.1.0 の旧 4 層 (Constitution/Schema/Execution/Operations) の mapping を確定した** (plan §8.11、`aag/architecture.md` Phase 4 の前提)
- [ ] **AAG Audit (Layer 4) の home doc 必要性を判定した** (plan §8.10、A: aag/meta.md §3 で articulate / B: aag/audit.md 新規 / C: aag/architecture.md 内包 のいずれか)
- [ ] audit 結果を `references/02-status/aag-doc-audit-report.md` に集約した

### Phase 3 完了 → Phase 4〜10 split decision gate (HARD GATE、Phase 4 着手の必須前提)

> Phase 3 audit findings を踏まえ、Phase 4〜10 を単一 project 内で継続するか sub-project /
> follow-up project に分割するかの **hard gate decision** (PR review #3 + Review 3 P0 #3 反映)。
> 本 project は Level 3 だが実体は Level 4 寄り (106 checkbox + 横断 implementationScope) のため、
> 単なる review checkbox ではなく **明示的な決定 gate** として運用。Phase 4 着手は本 gate 通過が
> 必須前提。
>
> **default 推奨**: MVP = Phase 1〜3 / Follow-up = Phase 4〜10 を別 project 化 (Review 3 推奨)。
> 単一 project 継続は audit findings で正当化される場合のみ。

- [ ] Phase 3 audit 完了後、Phase 4 doc refactor の所要 commit 数を見積もった (10+ commits 想定)
- [ ] **decision**: Phase 4〜10 を以下のどちらで進めるか人間判断 + 明示記録した:
  - **A. 単一 project 継続** (audit findings で「scope は管理可能」と正当化された場合のみ)
  - **B. sub-project / follow-up project に分割** (default、推奨分割例: Project A = AAG Meta + Core doc refactor / Project B = rule schema + meta-guard / Project C = DFR registry + display guards / Project D = legacy retirement)
- [ ] 分割 (B) の場合、対象 Phase 群を別 project に切り出した (本 project は MVP = Phase 1〜3 で完遂、status を archive 候補に)
- [ ] 単一 project 継続 (A) の場合、Phase 4 を sub-phase 化 (4.1 Create / 4.2 Split / 4.3 Rewrite / 4.4 Cleanup) するかを判断した
- [ ] 決定理由 (A or B) を `references/02-status/aag-doc-audit-report.md` の末尾に articulate した
- [ ] **本 hard gate を通過するまで Phase 4 着手しない** ことを HANDOFF に明示した

## Phase 4: AAG Core doc content refactoring (新規書き起こし優先)

> 着手前 prerequisite: Phase 3 audit 完了 + plan §8.8 (命名 / ディレクトリ整合性) + Phase 1 aag/meta.md skeleton 完了

operation 順序:

- [ ] **Create 段階**: 新 path に新 doc を直接 Create (`aag/strategy.md` / `aag/architecture.md` / `aag/evolution.md` / `aag/layer-map.md` / `aag/source-of-truth.md` / `aag/operational-classification.md`)
- [ ] **Split / Merge / Rewrite 段階**: 旧 doc から内容を選別して新 doc に書き起こし、5 層位置付け + drill-down pointer + semantic articulation を装着した
- [ ] Layer 3 (実装) と Layer 4 (検証) を明示分離した (混在 guard の責務再分離)
- [ ] **CLAUDE.md AAG セクション薄化**: 「AAG を背景にした思考」の core を `aag/meta.md` に逃がし、CLAUDE.md は `aag/README.md` への 1 link 索引のみにした
- [ ] **doc-registry.json + principles.json + manifest.json** を更新した (新 doc 登録、旧 doc は deprecation marker 段階)
- [ ] 各 operation 独立 commit で履歴を残した、parallel comparison 期間に entered

## Phase 5: legacy 撤退 (旧 doc archive、inbound 0 trigger)

> 着手前 prerequisite: Phase 4 完了 + 旧 path への inbound migration 完了

- [ ] `legacy-retirement.md` を実値で update した (Phase 3 audit の Archive 候補対象を埋める)
- [ ] 各旧 doc の **inbound 0 機械検証** を実施した (旧 path への参照を全 doc / 全 registry / 全 guard binding で grep)
- [ ] inbound 0 確認した旧 doc を `references/99-archive/` に移管した (migrationRecipe + 履歴付き)
- [ ] 99-archive 配下の旧 doc に対する inbound も 0 になった file を物理削除した (即時、buffer なし)
- [ ] doc-registry.json + principles.json + manifest.json の reflect を完了した

## Phase 6: 既存 AR-NNN rule の audit + binding (partial)

> 着手前 prerequisite: Phase 3 audit 完了 + Phase 4 refactor 完了 (新 path で binding 記入)

- [ ] Phase 3 mapping を input に既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit した
- [ ] 分類 A の rule に `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 付きで即時記入した
- [ ] 分類 D の rule の sunset trigger を確定した
- [ ] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示した
- [ ] audit 結果を `references/02-status/ar-rule-audit.md` に記録した

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
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録した (semantic articulation 付き)
- [ ] DFR-001 baseline 確定 (CHART-004 / CHART-005 の semantic 不使用)
- [ ] DFR-002 baseline 確定 (FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び)
- [ ] DFR-003 baseline 確定 (BudgetTrend / Seasonal 等の `Math.round(v * 100)`)
- [ ] DFR-004 baseline 確定 (survey 結果から)
- [ ] DFR-005 baseline 確定 (survey 結果から)
- [ ] 各 rule の migrationRecipe を記入した (fix 方法を機械生成可能に)
- [ ] Phase 8 reverse meta-guard が DFR-001〜005 全てに対して PASS した (双方向 integrity 成立)
- [ ] aag/meta.md §2 の **performative 防止 要件 status が「未達成」→「達成」に flip** した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (1〜10) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
