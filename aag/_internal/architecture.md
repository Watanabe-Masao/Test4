# AAG Architecture — 5 層構造定義 + 旧 4 層 → 新 5 層 mapping

> **位置付け**: AAG architecture pattern の **Layer 1+2** (= 要件 + 設計) の構造定義 doc。`meta.md` の §1 (Layer 0 目的) + §2 (Layer 1 要件) を realize する **構造の正本**。
>
> **役割**: AAG が 5 層 (目的 / 要件 / 設計 / 実装 / 検証) で articulate される構造を definitive に articulate し、旧 4 層 (Constitution / Schema / Execution / Operations) との mapping を提供する。
>
> **drill-down pointer**:
> - 上位 (back-pointer): [`meta.md`](./meta.md) §1 (目的) + §2 (要件、`AAG-REQ-LAYER-SEPARATION` 達成 trigger)
> - 下位 (drill-down): [`layer-map.md`](./layer-map.md) (各 file が住む層) / [`source-of-truth.md`](./source-of-truth.md) (Layer 2 正本ポリシー) / [`operational-classification.md`](./operational-classification.md) (Layer 4 運用区分)
>
> **5 層位置付け** (本 doc 自身): Layer 1+2 (要件 + 設計、構造定義 doc)
>
> **§1.5 archive 前 mapping 義務**: 旧 `aag-5-constitution.md` の archive 前提は本 doc に「旧 4 層 → 新 5 層 mapping」が landed 済 (= 本 doc §4.1 mapping table)。

## §1 5 層構造の articulate

AAG は次の 5 層で articulate される。各層は **orthogonal な責務** を持ち、上位層は下位層に依存しない。

| Layer | 名称 | 役割 | 機械検証可能性 | 主要 doc / 実装 |
|---|---|---|---|---|
| **Layer 0** | **目的** (Purpose) | AAG の why の正本。「動くが意図に反するコード」を早期検出し、コードベースの知能ある進化を保証する mechanism | 機械検証不可 (人間判断のみ) | `meta.md` §1 |
| **Layer 1** | **要件** (Requirements) | AAG が satisfy すべき不変条件 + 禁則。stable Requirement ID (`AAG-REQ-*`) で articulate、各要件に達成条件 (state-based) + 達成 status を持つ | state-based 機械検証 (達成 condition により) | `meta.md` §2 (12 AAG-REQ-*) |
| **Layer 2** | **設計** (Design) | 要件を realize する設計 doc 群。canonicalization / engine boundary / responsibility / governance ops の 5 縦スライスで articulate | 機械検証 (`docRegistryGuard` / `docCodeConsistencyGuard` / `manifestGuard` 等) | `aag/strategy.md` / `aag/architecture.md` (本 doc) / `aag/evolution.md` / `aag/source-of-truth.md` / `aag/operational-classification.md` / `aag/layer-map.md` ほか各 reference doc |
| **Layer 3** | **実装** (Implementation) | 設計を機械検証する実装。AR-rule + guard + collector + helper script | 機械検証 (test:guards / docs:check / pre-commit / pre-push) | `app/src/test/guards/` / `app/src/test/architectureRules/` / `app-domain/gross-profit/rule-catalog/base-rules.ts` / `tools/architecture-health/` |
| **Layer 4** | **検証** (Verification) | 外部監査視点で AAG 全体を audit。5 sub-audit (4.1〜4.5) で 境界 / 方向 / 波及 / 完備性 / 機能性 を評価 | 機械検証 (meta-guard) + 人間 review (Discovery Review) | `meta.md` §3.2 audit framework / Phase 8 MVP meta-guard 4 件 (Project B) / `health-rules.ts` / `certificate renderer` |

## §2 各層の責務 (positive 定義)

### §2.1 Layer 0 (目的)

**「AAG は何のために存在するか」の正本**。`meta.md` §1 の articulate を変更する場合は **Constitution 改訂と同等の慎重さ** で扱う (人間の明示的承認必須)。Layer 0 を機械検証 condition に変換しない (= `AAG-REQ-NO-AI-HUMAN-SUBSTITUTION` 適用)。

### §2.2 Layer 1 (要件)

**「AAG が何を保証するか」の正本**。不変条件 (Invariants、positive) + 禁則 (Non-goals、negative) を articulate。各要件は次の 3 要素を持つ:

- **stable Requirement ID** (`AAG-REQ-*`): 後任 AI が trace 可能な唯一識別子
- **達成条件 (state-based)**: 期間 buffer を使わず、現在 state で機械判定可能
- **達成 status**: 現在の達成度 (達成 / 未達成)

AR-rule の `metaRequirementRefs` field から本 Layer 1 の Requirement ID を pointer + semantic articulation (`problemAddressed` + `resolutionContribution`) で参照する (Project B Phase 1 schema)。

### §2.3 Layer 2 (設計)

**「要件をどう realize するか」の正本**。5 縦スライス (`layer-boundary` / `canonicalization` / `query-runtime` / `responsibility-separation` / `governance-ops`) で責務を articulate。各 doc は **1 doc 1 責務** (C1 適用) で構築。

新 doc 制作の bloat は禁止 (anti-bloat 原則、`AAG-REQ-ANTI-DUPLICATION` 適用)。重複 articulate 禁止、上位 content の copy 禁止、下位は pointer + 解決 articulation で参照。

### §2.4 Layer 3 (実装)

**「設計を機械的にどう検証するか」の層**。Layer 2 設計 doc が articulate した rule を Layer 3 実装が検証する。AR-rule (`base-rules.ts`) は宣言的仕様 + binding (`canonicalDocRef` + `metaRequirementRefs`) を持ち、guard (`*.test.ts`) は手続的検出ロジックを持つ。

### §2.5 Layer 4 (検証)

**「AAG 全体が claim 通り動くか」を外部監査する層**。AAG Core (Layer 2 + 3) を **評価対象として参照する** 視点で構成される。詳細は `meta.md` §3.2 audit framework (5 sub-audit、§8.10 判断 = A 適用)。

## §3 層間の依存ルール

```
Layer 0 (目的、人間判断のみ)
    ↓ realize
Layer 1 (要件、stable Requirement ID)
    ↓ design
Layer 2 (設計、5 縦スライス articulate)
    ↓ implement
Layer 3 (実装、AR-rule + guard で機械検証)
    ↓ audit (外部視点)
Layer 4 (検証、5 sub-audit で AAG 全体を評価)
```

**鉄則**:
- 上位層は下位層に依存しない (Layer 0 は Layer 1〜4 を知らない)
- Layer 1 → Layer 2 → Layer 3 は **realize / design / implement** で繋がる
- Layer 4 (検証) は **外部監査視点** で Layer 0〜3 を audit、それ自身は AAG Core の構造内部に住まない
- 各層の articulate は orthogonal、混ぜない (例: Layer 2 設計 doc に Layer 3 実装詳細を inline 記載しない)

## §4 旧 4 層 → 新 5 層 mapping (`AAG-REQ-LAYER-SEPARATION` 達成 trigger)

> **本 §4 が landing したことで `AAG-REQ-LAYER-SEPARATION` の達成 status が「未達成」→「達成」に flip 可能** (`meta.md` §4.4 audit 履歴 update 対象、Project A Phase 1 完了時)。

### §4.1 旧 4 層 (AAG 5.1.0 = Constitution / Schema / Execution / Operations) → 新 5 層 mapping

| 旧 4 層 (AAG 5.1.0) | 新 5 層 (AAG 5.2.0、本 doc) | 関係 | 変化点 |
|---|---|---|---|
| **Layer 1: Constitution** (思想 / 用語 / 不可侵原則) | **Layer 0 目的** + **Layer 1 要件** に分離 | 「why の正本」と「what を保証するか」を orthogonal 軸に分離 | Layer 0 は人間判断のみ、Layer 1 は state-based Requirement ID で articulate (機械検証可能 condition 経路を持つ) |
| **Layer 2: Schema** (型契約 / 宣言的 rule 仕様 / レジストリ) | **Layer 2 設計** + **Layer 3 実装** に再配置 | 「宣言的仕様」(`architectureRules.ts`) は Layer 2 の AR-rule schema に、「型定義 + 物理正本」(`base-rules.ts` / `aag-core-types.ts`) は Layer 3 実装に分離 | Project B で `SemanticTraceBinding<T>` 型 family + `canonicalDocRef` / `metaRequirementRefs` field を Layer 2 schema 拡張として追加 |
| **Layer 3: Execution** (検出実装 / health 収集 / 自動導出) | **Layer 3 実装** に統合 | 「どう検出するか」の手続的実装は Layer 3 に集約 | guard / collector / health renderer が同一層に整列 |
| **Layer 4: Operations** (4A System Operations + 4B Project Operations) | **Layer 4 検証** + 別 axis (= System Operations / Project Operations) に再配置 | 「外部監査視点」(Layer 4 検証) と「運用区分」(now/debt/review、`operational-classification.md`) を分離 | Layer 4 検証は AAG Core を audit する独立 layer、運用区分は orthogonal axis として別 doc で articulate |

### §4.2 旧 旧 4 層 (AAG v4.x = Principles / Judgment / Detection / Response) → 新 5 層 mapping (2 重 mapping)

> 旧 `aag-four-layer-architecture.md` が記述する旧 旧 4 層 (= AAG v4.x) からの mapping (`§1.5 archive 前 mapping 義務` 適用、旧 doc archive 前に本 mapping が landed 済を確認)。

| 旧 旧 4 層 (AAG v4.x) | 旧 4 層 (AAG 5.1.0) | 新 5 層 (AAG 5.2.0、本 doc) |
|---|---|---|
| Principles (思想正本) | Constitution | Layer 0 目的 + Layer 1 要件 |
| Judgment (判断基準) | Schema (拡張: 型契約追加) | Layer 2 設計 (AR-rule schema) + Layer 3 実装 (型定義 + 物理正本) |
| Detection (検出実装) | Execution | Layer 3 実装 (統合) |
| Response (応答 / 運用) | Operations (拡張: 運用手順全体) | Layer 4 検証 (新規) + System / Project Operations axis (別 axis に分離) |

### §4.3 mapping rationale (なぜ 4 層 → 5 層に extend したか)

- **Layer 4 検証 (外部監査) の独立**: 旧 4 層の Operations に internal 検証 (health / certificate / Discovery Review) が混在していた → 「AAG が claim 通り動くか」を外部監査視点で独立 audit する Layer 4 を新設
- **目的 vs 要件 の分離**: 旧 Constitution に「why」(思想) と「what」(不可侵原則) が混在していた → Layer 0 (機械検証不可、人間判断のみ) と Layer 1 (state-based 機械判定可能) を orthogonal に分離
- **責務分離 (1 doc 1 責務、C1 適用)** が困難な多責務 doc を解体: 旧 `adaptive-architecture-governance.md` は戦略マスター + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table が同居 (6 責務同居 = C1 違反) → 各責務を Layer 2 配下の独立 doc に分散
- **bidirectional integrity の構造的実現**: 旧 4 層では forward (設計 → 機械検証) / reverse (AR-rule → 製本) の双方向 binding が articulate されていなかった → Layer 1 要件 (`AAG-REQ-BIDIRECTIONAL-INTEGRITY`) を Layer 4 検証 (Phase 8 MVP meta-guard) で realize する経路が確立

## §5 5 縦スライス (Layer 2 + 3 の責務軸)

Layer 2 (設計) + Layer 3 (実装) は 5 縦スライスで責務を articulate (`meta.md` §3.1 matrix と整合):

| 縦スライス | 責務 | 主要 Layer 2 doc | 主要 Layer 3 実装 |
|---|---|---|---|
| **layer-boundary** | 4 層依存方向 / Layer 境界違反禁止 | `aag/strategy.md` §層境界 | `layerBoundaryGuard` / `topologyGuard` |
| **canonicalization** | readModel 経路 / 双方向 integrity | `canonicalization-principles.md` / `canonical-input-sets.md` | `calculationCanonGuard` / `canonicalizationSystemGuard` / `*PathGuard` 群 |
| **query-runtime** | pair/bundle 契約 / alignment-aware | `engine-boundary-policy.md` / `engine-responsibility.md` | `queryPatternGuard` / `analysisFrameGuard` / `comparisonScopeGuard` |
| **responsibility-separation** | 1 doc 1 責務 (C1) / 責務分離 | `responsibility-taxonomy-schema.md` / `design-principles.md` | `responsibilitySeparationGuard` / `responsibilityTagGuard` / `sizeGuard` |
| **governance-ops** | ratchet-down / state-based / self-hosting | `aag/operational-classification.md` / `aag/source-of-truth.md` / `aag/evolution.md` | `architectureRuleGuard` / `docRegistryGuard` / `docCodeConsistencyGuard` |

5 縦スライスは Phase 3 audit で **reshape 不要** と判定 (`aag-doc-audit-report.md` §4.2)。境界の過密 / 空きセルが発生した場合は将来 reshape 候補。

## §6 非目的 (Non-goals)

本 doc は次を **articulate しない** (= 別 doc の責務):

- **戦略 / 文化論 / 意図的に残す弱さ** → `aag/strategy.md`
- **進化動学 (Discovery / Accumulation / Evaluation)** → `aag/evolution.md`
- **ファイル別 5 層マッピング** (具体 file 配置) → `aag/layer-map.md`
- **正本 / 派生物 / 運用物 区分ポリシー** → `aag/source-of-truth.md`
- **now / debt / review 運用区分** → `aag/operational-classification.md`
- **Layer 4 audit framework 詳細** (5 sub-audit articulate) → `meta.md` §3.2 (§8.10 判断 = A 適用)
- **AR-rule schema (`SemanticTraceBinding<T>` 型 family)** → Project B 所掌 (`aag-core-types.ts` / `architectureRules/types.ts`)
- **DFR (Display-Focused Rule) registry** → Project C 所掌 (`aag/display-rule-registry.md`、Phase 9 で landing)

## §7 関連 doc

| doc | 役割 |
|---|---|
| [`meta.md`](./meta.md) | AAG Meta charter (Layer 0 目的 + Layer 1 要件) — 本 doc の上位 |
| [`README.md`](./README.md) | aag/ ディレクトリ index |
| [`strategy.md`](./strategy.md) | 戦略マスター (Layer 0+1) — 本 doc の sibling、文化論 + 意図的に残す弱さ |
| [`evolution.md`](./evolution.md) | 進化動学 (Layer 1+2) — 本 doc が定義した構造を進化させる mechanism |
| [`layer-map.md`](./layer-map.md) | ファイル別 5 層マッピング (Layer 2 reference) — 本 doc 5 層を具体 file に展開 |
| [`source-of-truth.md`](./source-of-truth.md) | 正本/派生物/運用物 (Layer 2) — Layer 2 + 3 配下の正本ポリシー |
| [`operational-classification.md`](./operational-classification.md) | now/debt/review 区分 (Layer 2) — orthogonal axis での運用区分 |
| `references/04-tracking/aag-doc-audit-report.md` | Phase 3 audit findings (本 doc の 5 縦スライス reshape 判定 + 旧 doc operation 判定の根拠) |
| `projects/completed/aag-bidirectional-integrity/plan.md` | 親 project の正本 (5 層 articulation の元) |
| `projects/completed/aag-core-doc-refactor/plan.md` | 本 doc を landing する project の plan |


