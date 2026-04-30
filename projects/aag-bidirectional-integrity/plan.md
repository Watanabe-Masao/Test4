# plan — aag-bidirectional-integrity

> **canonical 計画 doc**（2026-04-29 spawn、2026-04-30 経営階層 drill-down 視点で再 derive）。
> AAG 双方向 integrity の機械化 + AAG Meta (経営理念 + 社訓) 確立 + AAG Core doc 群の責務再定義 + 表示 rule 製本化の段階展開計画。
> **status**: active（plan refinement 中、execution は次セッション以降）。

## 1. 経緯と現在地

### 1.1. spawn の trigger

`phased-content-specs-rollout` 末セッションの dialog（2026-04-29）で次の構造的問題が
表面化した:

| 問題 | 構造的弱点 |
|---|---|
| visual evidence selection rule が proxy metric (consumer 数 / 365d commits) で guard 化されていた | reverse: AAG → 製本 が不在、guard が performative になる余地 |
| Phase L spawn (PIPE / QH / PROJ) が drift validation 抜きで spec authoring 計画されていた | reverse: AAG → 製本 が不在、guard が「あるかもしれない」を guard 化する余地 |

これらは AAG の旧 4 層構造（Constitution / Schema / Execution / Operations、本 project で
Layer 4 検証を追加して 5 層モデルに拡張予定、§3.1 参照）には組み込まれていない、より深層の
**製本 ↔ AAG binding** の不在を示す。

### 1.2. 0 ベース re-derivation (2026-04-30、本 plan refinement の起点)

dialog で次の本質要件が articulate された:

1. **AAG Meta は包括概念であり、既存 doc 群と同じ平面で重複しない** (層が違う)
2. **AAG Meta は持つ課題 / 役割を達成する mechanism doc であるべき** (単なる articulation ではない)
3. **AAG Meta = 目的、AAG Core = 対象** (Meta が Core を評価・規定する立場)
4. **drill-down 構造は経営階層 metaphor**: 経営理念 → 社訓 → 経営戦略 → 戦術 → 監査 (5 層、双方向 trace chain。§1.2 #11 で Layer 4 検証 = 外部監査を追加)
5. **既存 AAG Core 8 doc は内容を定義し直し、整理し直す必要がある** (sprawl + 重複 + 5 層位置付け不適合)
6. **edit-in-place ではなく新規書き起こし** で旧 doc を退役パスに乗せる方が clean
7. **doc operation taxonomy** (Create / Split / Merge / Rename / Relocate / Rewrite / Archive) で操作を articulate
8. **ディレクトリ階層化** (`references/01-principles/aag/` 集約) で関係性を visual に articulate
9. **5 層アーキテクチャ + 縦スライス** (本プロジェクト本体側 modular monolith evolution の 4 層 × 縦スライスと parallel、AAG では Layer 4 検証を追加して 5 層) を AAG architecture pattern として確立。詳細: §3.1
10. **破壊的変更前提**: 本 project は AAG の根本的整理を行うため、追加コスト / 変更コストを考慮せず必要な変更を遂行する。既存 AR-NNN rule の振る舞い変更 / 縦スライス境界の reshape / 5 層構造の調整 / AAG framework 構造変更 等を許容 (本体アプリの機能変更は scope 外)
11. **検証層 (Layer 4) を外部監査として追加**: AAG が能動的に行うこと (実装 = Layer 3) と、AAG が claim と actual を受動的に照合すること (検証 = Layer 4) を分離。検証層は内部 governance とは独立した第三者視点で AAG 全体を audit する。詳細: §3.1.1 + §3.2

本 project は AAG Meta charter doc の創出 + AAG Core doc 群の責務再定義 + 双方向 integrity の機械化
を統合した独立 active project として再 design された。display rule registry (DFR-NNN) は AAG Meta
が課す不変条件 (双方向 integrity) の最初の concrete application として吸収。

### 1.3. 関連既存資産

- **AAG Core 8 doc** (本 project の整理対象、§3.5 で op 別判定):
  - `adaptive-architecture-governance.md` (戦略マスター + 文化論 + 設計原則 8 + バージョン履歴 が同居、Split 候補)
  - `aag-5-constitution.md` (旧 4 層構造定義 + 非目的、Rename + Relocate + 5 層への内容再定義候補)
  - `aag-5-layer-map.md` (Layer マッピング reference)
  - `aag-5-source-of-truth-policy.md` (正本ポリシー reference)
  - `aag-four-layer-architecture.md` (旧 4 層、aag-5-constitution.md で superseded、Archive 候補)
  - `aag-operational-classification.md` (now/debt/review 運用区分)
  - `aag-rule-splitting-plan.md` (completed project execution 記録、Archive 候補)
  - `adaptive-governance-evolution.md` (進化動学、Rename + Relocate 候補)
- **CLAUDE.md AAG セクション** (「AAG を背景にした思考」が事実上の charter、Meta 確立後に薄化)
- **rule registry**:
  - BaseRule 物理正本: `app-domain/gross-profit/rule-catalog/base-rules.ts` (本 project が `canonicalDocRef` + `metaRequirementRefs` を `SemanticTraceBinding<T>` 形式で追加)
  - 型定義: `app/src/test/architectureRules/types.ts` / `app/src/test/aag-core-types.ts`
  - derived consumer: `app/src/test/architectureRules/merged.ts`
  - `app/src/test/architectureRules/defaults.ts` は execution overlay (運用状態のみ、semantic binding は置かない)
  - `app/src/test/guardCategoryMap.ts` は category / layer / note の補助 metadata のみ (semantic binding は置かない、二重正本回避)
- **CHART semantic 実 drift 観測**: CHART-004 / CHART-005 (Phase 10 baseline)
- **axis formatter 実 drift**: FactorDecomp / BudgetVsActual.builders (Phase 10 baseline)
- **formatPercent 実 drift**: BudgetTrend / Seasonal (Phase 10 baseline)

## 2. 不可侵原則

1. **「やらないこと」ではなく「順番を後にすること」として明記する**。Phase 2〜10 を放棄しない
2. 各 Phase は **依存 Phase が完了基準を満たしてから着手** する（Wave 構造）
3. **AAG Core 既存 doc の edit-in-place 禁止**。内容再定義は新規書き起こし (新名 doc) → 旧 doc 退役 の段階パス
4. **doc operation 順序原則** (§3.6): Create 先行 → Split / Merge / Rewrite 中段 → Rename / Relocate / Archive 後段。各 operation 独立 commit
5. Phase 3（網羅的 doc audit）は **findings 集約 + operation 判定 + 影響範囲 inventory のみ**。実行は Phase 4 以降
6. Phase 4（doc content refactoring）は **新規書き起こし優先**。旧 doc は parallel comparison 期間後に退役
7. Phase 5（legacy 撤退）は **migrationRecipe + 履歴付きで段階削除**。段階遷移の trigger は **期間 (日数 / commits 数 等) を一切使わず、参照場所が 0 になった瞬間** (inbound 0 が機械検証で確認された commit 直後) のみ。期間 buffer は儀式の再生産であり、発火条件に触れずに見落とす risk が残る。Phase K Option 1 の anti-ritual 思想を厳格に継承。即時物理削除を遡及的に行わない
8. Phase 6（既存 rule audit）は **ratchet-down で漸次対応**。一括 100% 製本化は scope creep
9. Phase 9（新規製本創出）は **Phase 8 meta-guard が landing してから**着手（順序遵守、循環 fail 防止）
10. Phase 10（DFR guards）は **observed drift を baseline として ratchet-down 起点に**。即時 0 化を試みない
11. **破壊的変更前提** (§1.2 #10): AAG の根本的整理に必要なら既存 AR-NNN rule の振る舞い変更 / 縦スライス境界 reshape / 5 層構造の調整 / AAG framework 構造変更 / 5 縦スライス → 別構造 等を許容。Layer 0 を除き、AAG 内のあらゆる構造は変更可能
12. **Layer 0 (目的) は機械検証不可能** な context として人間 review でのみ変更
13. **本体アプリ (粗利管理ツール) の機能変更は scope 外** (AAG governance の対象は AAG 自身、業務 logic は別 project)
14. ratchet-down baseline を増加方向に戻さない (改善は不可逆、ただし破壊的変更時の baseline 再設定は許容)
15. parent project (`phased-content-specs-rollout`) の archive process に干渉しない（独立進行）

## 3. 設計思想

### 3.1. 5 層 drill-down 構造 + 縦スライス (AAG architecture pattern)

AAG は **5 層 (横軸) × 縦スライス (縦軸)** の matrix で articulate される。これはプログラミング
原則の **4 層アーキテクチャ + 縦スライス** (modular monolith evolution / clean architecture /
hexagonal、本プロジェクト本体側で既確立) を AAG 自身に適用、さらに **Layer 4 検証 (= 外部監査) を
追加して 5 層に拡張** した構造。経営階層 metaphor (経営理念 → 社訓 → 経営戦略 → 戦術 → 監査) は
横軸の概念伝達 image であり、本 plan では正式用語を使用する。

#### 3.1.1. 5 層 drill-down (横軸)

| Layer | 正式用語 | metaphor (image) | AAG での実体 | 性質 |
|---|---|---|---|---|
| 0 | **目的** (Purpose) | 経営理念 | AAG の存在意義 (動くが意図に反するコードの早期検出 / 知能ある進化の保証) | 究極の why、人間判断、機械検証不可 |
| 1 | **要件** (Requirements) | 社訓 | 不変条件 (Invariants, positive) + 禁則 (Non-goals, negative) — 双方向 integrity / 改善不可逆 / state-based / self-hosting / non-performative 等 | 普遍的価値、機械検証可能な状態条件で表現 |
| 2 | **設計** (Design) | 経営戦略 | AAG の構造方針 (5 層構造 / 製本-rule binding / 3 層サイクル / now/debt/review 運用区分) | 中期方針、how (structural) |
| 3 | **実装** (Implementation) | 戦術 | 個別 rule / guard / allowlist / health 閾値 / migrationRecipe | 具体施策、how (instance)、AAG が能動的に行うこと |
| 4 | **検証** (Verification) | 外部監査 | 5 sub-audit に細分 (§3.1.5 参照): 境界 / 方向 / 波及 / 完備性 / 機能性 | 第三者視点の audit、AAG が claim と actual を受動的に照合すること |

drill-down は **双方向の trace chain**:

- 上位 → 下位 (how chain): 目的が要件として articulate され、要件が設計として realize され、設計が実装として instantiate され、実装が検証で audit される
- 下位 → 上位 (why chain): 各 layer が「どの上位 layer を realize / audit しているか」を pointer で示せる

各層が **上位への pointer + 下位への drill-down** を持って初めて層が valid。これは canonicalDocRef
(現行: 実装 → 設計 doc の 1 段 binding) を **多段化** したもの。

**Layer 3 (実装) と Layer 4 (検証) の分離**:
- 実装 = AAG が **能動的に違反を防ぐ** (rule / guard で hard fail)
- 検証 = AAG が **行ったことを受動的に評価する** (claim と actual を照合、KPI / certificate / Discovery Review)
- 役割が違うため独立 layer として articulate。現状の AAG では両者が混在している (例: `architectureRuleGuard.test.ts` が rule schema 整合性 = Layer 3 + claim/actual 照合 = Layer 4 を両方担っている) が、本 project で responsibility 分離を進める

#### 3.1.2. 縦スライス (縦軸、AAG 既存 5 縦スライス)

AAG は責務領域別に 5 縦スライスを持つ (既存 architectureRules で確立):

| 縦スライス | 関心領域 |
|---|---|
| `layer-boundary` | 4 層依存方向、描画専用原則 |
| `canonicalization` | 正本経路、readModel、Zod、path guard |
| `query-runtime` | QueryHandler、AnalysisFrame、ComparisonScope |
| `responsibility-separation` | size / hook complexity / responsibility tags |
| `governance-ops` | allowlist、health、obligation、conventions |

縦スライス境界は **本 project スコープの破壊的変更対象**。Phase 3 audit + Phase 4 refactor で必要に
応じて分割 / merge / 新スライス追加 を許容 (詳細: §3.1.4 縦スライス進化原則)。

#### 3.1.3. 5 層 × 縦スライス matrix view

各セルに「縦スライスの特定層に住む doc / 実装」が articulate される。aag/meta.md §3 (Core mapping)
は本 matrix view を正本として保持 (Phase 3 audit で各セル content を確定):

| | layer-boundary | canonicalization | query-runtime | responsibility-separation | governance-ops |
|---|---|---|---|---|---|
| Layer 0 目的 | (Layer 0 は AAG 全体で 1 つ、縦スライス分割不要) | | | | |
| Layer 1 要件 | invariant: 4 層依存方向 | invariant: readModel 経路、双方向 integrity | invariant: pair/bundle 契約、alignment-aware | invariant: 1 doc 1 責務、責務分離 | invariant: ratchet-down、state-based、self-hosting |
| Layer 2 設計 | aag/strategy.md §層境界節 | canonicalization-principles.md / canonical-input-sets.md | engine-boundary-policy.md / engine-responsibility.md | responsibility-taxonomy-schema.md / design-principles.md | aag/operational-classification.md / aag/source-of-truth.md / adaptive-governance-evolution.md |
| Layer 3 実装 | layerBoundaryGuard / topologyGuard | calculationCanonGuard / canonicalizationSystemGuard / *PathGuard 群 | queryPatternGuard / analysisFrameGuard / comparisonScopeGuard | responsibilitySeparationGuard / responsibilityTagGuard / sizeGuard | architectureRuleGuard / docRegistryGuard / docCodeConsistencyGuard |
| Layer 4 検証 | layer-boundary 違反観測 / certificate KPI | canonicalDocRefIntegrityGuard / canonicalDocBackLinkGuard (Phase 8) / 製本 KPI | queryPattern audit / health KPI | responsibility 純度 audit / Discovery Review (responsibility) | health-rules.ts / certificate renderer / Discovery Review / aag/meta.md §4 達成判定 / PR comment renderer |

**読み方**: 空きセルは「未 articulated な領域」(audit / governance-evolution の input)、過密セル
は「責務分離未完了」(分割 / Split operation の検討対象)。matrix は本 project の破壊的変更で reshape
される可能性あり。

**Layer 3 と Layer 4 の境界 (現状の混在 → 整理対象)**:
- 現状 `architectureRuleGuard.test.ts` 等が「実装の整合性 check」と「実装の audit」両方を担っている (Layer 3 と Layer 4 の混在)
- Phase 3 audit + Phase 4 refactor で responsibility 分離 (例: rule schema 整合性 = Layer 3、claim / actual 照合 = Layer 4)
- meta-guard (Phase 8 で landing 予定の canonicalDocRefIntegrityGuard 等) は **Layer 4 検証** に分類される (forward / reverse 双方向 integrity の audit)

#### 3.1.4. 縦スライス進化原則 (modular monolith evolution と parallel)

本プロジェクト本体側で確立した modular monolith evolution の **「縦の壁 / 横の壁」** 思想を AAG
に適用。**本 project は破壊的変更前提**で縦スライス境界の見直しを許容:

- **縦の壁**: 縦スライス間の cross-reference は最小化 (shared/AAG 共通 doc / mechanism のみ経由)
- **横の壁**: 各縦スライス内部の 4 層は drill-down chain で結合、層境界を厳格に維持
- **新縦スライスの追加**: 既存 5 スライスでカバーされない AAG 責務領域が出現したとき (例: doc-governance を別出しする等)
- **既存縦スライスの分割**: 単一スライス内の責務が膨張して 1 doc 1 責務 (C1) を破る場合
- **縦スライス間 merge**: 重複が顕在化した場合
- **縦スライス境界の breaking change**: 本 project は AAG architecture pattern の破壊的変更を許容、Phase 3 audit + Phase 4 refactor で reshape を実施
- 縦スライス境界の変更は AAG 自身の進化 = aag/meta.md §2 要件として articulate (= 「縦スライス境界の維持 + 進化」要件)

#### 3.1.5. 監査 (Layer 4) の sub-categorization

Layer 4 検証は **単一機能ではなく複数の audit 軸** を持つため、内部で 5 つの sub-audit role に
分けて実装する。各 sub-audit は **独立した責務** を持ち、独立した guard / mechanism として実装される
(C1 適用、1 sub-audit 1 責務):

| Sub-layer | 役割 | 機械検証対象 |
|---|---|---|
| **4.1 境界監査** (Boundary Audit) | 層境界が正しいか | 目的 vs 要件の混同検出 (機械検証可能 condition が Layer 0 にないか)、Layer 2 vs Layer 3 vs Layer 4 の境界違反、各 layer の articulation が正しい層に住むか |
| **4.2 方向監査** (Direction Audit) | drill-down chain の依存方向が正しいか | forward (上位 → 下位 = how chain) と reverse (下位 → 上位 = why chain) の双方向 integrity、4 層依存原則 (本体側 layer-boundary 縦スライスと同型) の AAG 内部適用、逆流検出 |
| **4.3 波及監査** (Impact Audit) | 他項目への漏れがないか | cross-cutting impact 検出、ある rule / doc 変更が他の縦スライス / 層へ与える未 articulated な影響、obligation map の trigger 漏れ |
| **4.4 完備性監査** (Completeness Audit) | 漏れ / 抜かり / 重複が無いか | 5 層 × 5 縦スライスの 25 セル gap 検出、orphan implementation (要件なき実装) / orphan requirement (実装なき要件) / redundancy (重複 articulation = anti-duplication 違反) |
| **4.5 機能性監査** (Functional Audit) | 個々が claimed 通り動くか | claim vs actual 照合、health KPI 閾値、Hard Gate、rule schema 整合性、aag/meta.md self-hosting の機能正常性 |

**既存 AAG 実装の sub-audit 分類 (Phase 3 audit で確定)**:

| 既存実装 | sub-audit (仮判定) |
|---|---|
| `docRegistryGuard.test.ts` | **4.4 完備性** (registry ↔ ファイル ↔ README の整合性) |
| `docCodeConsistencyGuard.test.ts` | **4.4 完備性** (定義書 ↔ 実装 双方向リンク、orphan 検出) |
| `docStaticNumberGuard.test.ts` | **4.5 機能性** (claim vs actual: ハードコード数値 drift) |
| `health-rules.ts` / Hard Gate | **4.5 機能性** (KPI 閾値) |
| `certificate renderer` | **4.5 機能性** (公式 audit report) |
| `architectureRuleGuard.test.ts` | 4.1 境界 + 4.5 機能性 (混在、Phase 4 で分離) |
| Discovery Review | **4.4 完備性** (人間判断による gap 発見) |
| `canonicalDocBackLinkGuard.test.ts` (Phase 8) | **4.2 方向** (forward 方向) |
| `canonicalDocRefIntegrityGuard.test.ts` (Phase 8) | **4.2 方向** (reverse 方向) |
| `metaRequirementBindingGuard.test.ts` (Phase 8 option) | **4.2 方向** (Layer 1 ↔ Layer 3 binding) |
| `selfHostingGuard.test.ts` (Phase 8 option) | **4.5 機能性** (aag/meta.md 自己整合) |
| `layerBoundaryGuard.test.ts` | 4.1 境界 (本体側 4 層、AAG 内部の Layer 適用は Phase 4 で確定) |

**役割分離原則** (各 sub-audit は独立して実装):

- 1 guard = 1 sub-audit (C1 適用、混在検出は Phase 4 refactor 対象)
- 各 sub-audit は **個別 baseline + 個別 fixNow** を持つ (混在 baseline は責務分離違反)
- sub-audit 間の依存は明示 (例: 4.4 完備性が 4.2 方向の前提として実行される、等)
- aag/meta.md §2 要件は **どの sub-audit が enforcement しているか** を articulate
- AAG architecture pattern 内で Layer 4 の責務分離が sub-categorize で確立 → AAG Audit が「single audit」ではなく「複数役割の集合」として articulated

**sub-audit list は extensible (initial set、non-exhaustive)**:

上記 5 sub-audit (4.1〜4.5) は **initial articulation** であり、Phase 3 audit + 実装セッション +
Discovery Review で **追加 sub-audit が identify される可能性** がある。追加候補例 (5 sub-audit に
collapse 可能か独立か は Phase 3 で判定):

- **4.6 同期監査** (Synchronization Audit): 派生物 vs 正本の sync 状態 (例: `docs/contracts/principles.json` と CLAUDE.md / references の sync) — 4.4 完備性に collapse 可能性
- **4.7 ratchet 監査** (Ratchet Audit): baseline 増加方向への drift 検出 — 4.5 機能性に collapse 可能性
- **4.8 退役監査** (Sunset Audit): legacy doc の inbound 0 状態の継続検証 (本 project Phase 5 で active) — 4.4 完備性に collapse 可能性
- **4.9 例外 lifecycle 監査** (Allowlist Lifecycle Audit): allowlist の retentionReason / 卒業条件 audit
- **4.10 (Phase 3 audit で identify される他軸)**

aag/meta.md §2 要件として **「Layer 4 sub-categorization の進化」** を articulate (新 sub-audit
追加 / 既存 sub-audit の merge / split 等は AAG 自身の進化として制度化、Constitution 改訂レベル
の人間 review 必要)。

### 3.2. AAG Meta と AAG Core の関係 (目的 / 対象)

| | 役割 | 立場 |
|---|---|---|
| **AAG Meta** = Layer 0 + 1 (目的 + 要件) | AAG が満たすべき要件を articulate + 達成度を判定する mechanism | 評価する側 / 規定する側 |
| **AAG Core** = Layer 2 + 3 (設計 + 実装) | Meta の要件を満たすべき実体 (8 doc 群 + rule + guard + allowlist + health) | 評価される側 / 規定される側 |

aag-meta.md は **AAG Meta を articulate する単一エントリ doc**。Charter (内容詳述) ではなく
**要件定義 + 達成 audit framework + AR-rule binding hub** の 3 機能を兼ねる mechanism doc。

### 3.3. aag-meta.md の構造

aag-meta.md (新 path 案: `references/01-principles/aag/meta.md`、§3.7 命名規則を参照) は次の 4
section で構成。前回案の 7 section (identity / goals / limits / invariants / non-goals /
boundaries / 他 doc 境界) は AAG Core 側 doc に articulate を委ね、aag-meta.md は要件定義 + audit
に集中する:

| section | 内容 | 性質 |
|---|---|---|
| §1 目的 (Purpose) | AAG が存在する根本理由 (1-2 段落、変わらない核心) | Layer 0、人間判断 |
| §2 要件 (Requirements) | 不変条件 + 禁則の table。各行は (a) 目的への back-pointer + (b) 設計 (Layer 2 doc) への drill-down + (c) 実装 (AR-rule) への enforcing reference + (d) state-based 達成条件 + (e) 達成 status を持つ | Layer 1、機械検証可能 |
| §3 AAG Core 構成要素 mapping | Layer 2 設計 doc 群 + Layer 3 実装 entry-point (rule / guard / allowlist / health) を 4 層位置付けで整理。各 doc / 実装が「どの要件を realize しているか」 forward pointer | reference |
| §4 達成判定総括 | 全要件の達成度サマリ (達成 / 部分達成 / 未達成) + 不達成項目の解消責務 (どの project / Phase で landing するか) | audit |

### 3.4. 双方向 integrity と drill-down chain の semantic management

要件 §2 の中で最重要の不変条件の 1 つ。本 project の発端であり、Phase 8 の meta-guard で機械強制。

#### 3.4.1. 双方向 integrity の機械検証

```
forward: 設計 (Layer 2 doc) → 実装 (AR-rule)
  「設計 doc で定義された rule は、必ず enforcing AR-rule を持つ」
  違反例: doc に "X すべき" と書いてあるが guard が無い → 装飾化
  検出: canonicalDocBackLinkGuard が doc の Mechanism Enforcement section を parse、
        指す AR ID が architectureRules.ts に存在することを検証

reverse: 実装 (AR-rule) → 設計 (Layer 2 doc)
  「AR-rule は、必ず設計 doc で articulate された要件を enforcing する」
  違反例: rule の意図が設計 doc に存在しない proxy / 派生 metric → performative
  検出: canonicalDocRefIntegrityGuard が各 rule の canonicalDocRef を parse、
        path 実在 + doc 内に rule ID が出現することを検証
```

#### 3.4.2. 重複と参照の切り分け (anti-duplication 原則)

drill-down chain は **意味のある関係** であり、各 doc / 実装は唯一の正本を持つ。

- **重複 (禁止)**: 上位 doc の content を下位 doc が copy する。同じ articulation が 2 箇所に存在すれば drift と staleness の温床
- **参照 (必須)**: 下位 doc は上位 doc を **pointer + 解決 articulation** で連結する。content は上位の正本に集約、下位は pointer のみ持つ
- 各 doc の write list / non-write list (§3.6) はこの切り分けに従う

#### 3.4.3. drill-down chain の semantic management (管理対象)

下位 → 上位の binding は **単なる pointer ではなく**、次の 2 つを必須 field として保持:

- **problemAddressed**: 下位が上位の **何を課題として** 認識しているか
- **resolutionContribution**: 下位が **何を解決 / realize** しているか

これにより drill-down chain は semantic chain として成立し、機械検証で維持される。各層間で同型に適用:

| binding 方向 | 必須 articulation |
|---|---|
| Layer 3 (実装) → Layer 2 (設計 doc) | `canonicalDocRef` + problemAddressed + resolutionContribution |
| Layer 3 (実装) → Layer 1 (要件) | `metaRequirementRefs` + problemAddressed + resolutionContribution |
| Layer 2 (設計) → Layer 1 (要件) | 設計 doc 内 `## Mechanism Enforcement` section の forward pointer + 該当要件の architect 寄与 |
| Layer 1 (要件) → Layer 0 (目的) | aag/meta.md §2 行内の forward pointer + 該当目的のどの課題を解決するか |

#### 3.4.4. AR-rule schema の構造化 (Phase 2 で実装)

drill-down chain の多段拡張: AR-rule schema に下記 field を追加。**status field を必ず持たせ、空配列
(未対応) と意図的不要 (適用外) を区別する** (PR review で指摘、Phase 0.5 で要件確定):

```typescript
canonicalDocRef: {
  status: 'pending' | 'not-applicable' | 'bound',
  // status='bound' のとき refs は non-empty
  // status='not-applicable' のとき justification 必須 (純粋 mechanism rule 等、§3.9 例外カテゴリ)
  // status='pending' は新 rule 追加直後の暫定状態 (Phase 8 meta-guard で baseline 化、ratchet-down で漸次解消)
  justification?: string,           // status='not-applicable' のとき必須
  refs: Array<{
    docPath: string,                  // 例: "references/01-principles/aag/strategy.md"
    problemAddressed: string,         // 例: "design 規範 X が実装で realize されていない gap"
    resolutionContribution: string,   // 例: "Y pattern による直接 enforcement"
  }>
}

metaRequirementRefs: {
  status: 'pending' | 'not-applicable' | 'bound',
  justification?: string,
  refs: Array<{
    requirementId: string,            // 例: "REQ-DOUBLE-BINDING"
    problemAddressed: string,         // 例: "performative work の構造的混入余地"
    resolutionContribution: string,   // 例: "reverse direction binding (実装 → 設計 doc) を機械検証"
  }>
}
```

これらは:
- **機械検証 + 維持される field** として確立 (Phase 8 meta-guard が articulation 必須化 + status 整合性 hard check)
- 各要件が「どの実装で realize されているか」が逆引きできる (Layer 1 → Layer 3 の reverse query)
- self-hosting: aag/meta.md 自身も AR-rule に linked、自分自身を要件 §2 で守る
- **status='pending' の rule 数** は Phase 8 で baseline 化、ratchet-down で漸次解消 (空配列が無秩序に増殖するのを防ぐ)

既存 `principleRefs` (rule → 設計原則 50 個の 1 段 pointer) と同型の構造を **semantic 化** する
拡張に相当 (pointer のみ → pointer + problem + resolution + status)。

**配置原則** (PR review Review 3 P1 #3 + P1 #4 反映):
- **正本は `RuleBinding` 側**: docPath を持つ canonicalDocRef はリポジトリ固有具体値、metaRequirementRefs も AAG requirement ID で同様に App Domain 寄り。`RuleSemantics` 側は touch しない (Core 純粋型の境界を維持)
- **正本は BaseRule (= `app-domain/gross-profit/rule-catalog/base-rules.ts`)**: `defaults.ts` (execution overlay) と `guardCategoryMap.ts` には semantic binding を **置かない**。二重正本回避、derived metadata のみ guardCategoryMap で扱う場合は「BaseRule から読む」設計に
- **将来の Core 昇格**: 本当に AAG Core 汎用型へ昇格できると判断した時点で `RuleSemantics` 側へ移す

#### 3.4.5. semantic articulation の品質基準 (Phase 8 で機械検証、hard fail / warning 分離)

`problemAddressed` / `resolutionContribution` / `justification` の non-empty だけでは不十分
(`TBD` / `N/A` / `same` / `see above` 等の実質空文を防げない、PR review #5 で指摘)。一方、20 文字
以上の文字数チェックでも「それっぽい空文」(例: 「該当する」「対応する」のみ) は通る (PR review
Review 3 P1 #7 で指摘)。両指摘を統合し、**hard fail (構文整合) と warning (意味品質) を分離**。

Phase 8 で **`semanticArticulationQualityGuard.test.ts`** (4.4 完備性監査) を実装:

##### hard fail (構文整合、機械検証で確実に防げるもの)

| 検証項目 | 内容 |
|---|---|
| **禁止 keyword** | `TBD` / `N/A` / `same` / `see above` / `misc` / `various` / `-` / `unknown` / `to be determined` / `same as above` 等の正規表現マッチで hard fail |
| **最小文字数** | `problemAddressed` / `resolutionContribution` 各 **20 文字以上** |
| **重複検出** | 同 rule 内で `problemAddressed` と `resolutionContribution` が完全一致は禁止 |
| **status 整合性** | `status='bound'` のとき `refs.length > 0` / `status='not-applicable'` のとき `justification` 必須 + 上記基準を適用 / `status='pending'` は新規 rule では禁止 (既存 rule の baseline は ratchet-down) |
| **path 実在 / ID 実在** | `docPath` 実在 / `requirementId` が aag/meta.md §2 に存在 |
| **doc backlink 一致** | doc 側 `## Mechanism Enforcement` section と rule 側 `canonicalDocRef` が双方向一致 |

##### warning (意味品質、機械検証では防ぎきれないもの、human review で扱う)

| 検証項目 | 対応 |
|---|---|
| **「それっぽい空文」** (20 文字以上だが実質意味希薄、例: 「該当する」「対応する」のみ) | sample audit + Discovery Review で human review、hard fail にしない |
| **意味の乖離** (problemAddressed と resolutionContribution の論理整合) | human review、Phase 6 binding 記入時に PR review で確認 |
| **抽象度の妥当性** (rule の context に対して articulation が抽象すぎ / 具体的すぎ) | human review |

##### 設計原則

機械検証で防ぐべきなのは **「articulation を書かない」 / 「実質空文で書く」** という構造的回避
であり、**「articulation の意味的妥当性」は機械では判定しない** (false positive で正当な articulation
を block する risk が大きい)。後者は human review + sample audit + Discovery Review で扱う。

本品質基準は Phase 0.5 + 本 commit で確定 (PR review #5 + Review 3 P1 #7 統合反映)。

### 3.5. doc operation taxonomy + 操作順序原則

AAG Core 8 doc の整理は単純な「追加 / 退役」ではなく、7 operation で articulate する:

| operation | 説明 | 主な影響範囲 |
|---|---|---|
| **C (Create)** | 新規 doc 創出 | doc-registry.json 追加、CLAUDE.md 索引追加 |
| **Split** | 1 doc を複数に分割 (1 doc 1 責務原則 C1 適用) | inbound link 分散、registry 複数追加 |
| **Merge** | 複数 doc を 1 つに統合 (重複 articulation の集約) | inbound link 統合、archive 候補発生 |
| **Rename** | doc 名変更 (命名規則の刷新) | inbound link 全 update、registry 名変更 |
| **Relocate** | doc を別 directory に移動 (階層化) | inbound link 全 update、registry path 変更 |
| **Rewrite** | 内容を新規書き起こし (edit-in-place ではなく新名 doc 創出 → 旧退役) | parallel comparison 期間、旧 doc 退役パス |
| **Archive** | 99-archive 移管 → 段階削除 | inbound 0 確認、redirect 整備、3 段階削除 |

**操作順序原則**:

1. **Create 先行** (新 path に直接 Create、Relocate を不要にする)
2. **Split / Merge / Rewrite** 中段 (新 doc 群を完成)
3. **Rename / Relocate / Archive** 後段 (旧 doc が validate されてから path 変更 / 退役)
4. **各 operation 独立 commit** (履歴が追える、parallel comparison 期間を確保)
5. Archive は legacy-retirement.md §2 の 3 段階削除 (deprecation marker → archive 移管 → 物理削除) を厳格適用。各段階の trigger は **期間 (日数 / commits 数) を一切使わず、参照場所が 0 になった瞬間 (inbound 0 機械検証)** のみ:
   - deprecation marker → archive 移管 = **旧 path への inbound 0 + migrationRecipe 完備**
   - archive → 物理削除 = **archive 配下 file への inbound 0** (99-archive 内 reference も all clear)
   - 期間 buffer (例: 「30 commits 待つ」) は儀式の再生産、禁止

### 3.6. 各 doc の write / non-write articulation + 影響範囲評価 framework

Phase 3 audit の deliverable として、各 AAG Core doc に対して以下を articulate する:

| 項目 | 内容 |
|---|---|
| **書くべきこと (write list)** | 新 doc 責務に integrate する内容 (現存 / 新規 / 他 doc から移動) |
| **書かないこと (non-write list)** | 他 doc に逃がす内容 / 削除する内容 / archive 移管する内容 |
| **責務 (1 doc 1 責務、C1 適用)** | doc が backing する Layer (0/1/2/3) + 単一の articulation 軸 |
| **drill-down pointer** | 上位 (back-pointer) + 下位 (drill-down) の reference list |
| **必要 operation** | C / Split / Merge / Rename / Relocate / Rewrite / Archive のどれか (複数可) |
| **影響範囲 inventory** | inbound link 数 + 索引 (CLAUDE.md / README / manifest.json) + registry (doc-registry / principles.json) + guard binding (canonicalDocRef + metaRequirementRefs) |
| **migration order** | operation 間の依存 + commit 順序 |

これにより Phase 4 refactor は **mechanical な execution** になる (audit 結果の operation 順序通りに実行)。

### 3.7. 命名規則の刷新 + ディレクトリ階層化

現状の AAG 関連 doc は flat 構造 + 不揃いな prefix (`aag-5-` / `aag-` / `adaptive-`) で sprawl が
発生している。階層化と命名整理で Layer 関係性を visual に articulate する。

**ディレクトリ階層化案** (本 project scope は AAG 関連 doc のみ、他系は別 project):

```
references/01-principles/
├── aag/                          ← 新ディレクトリ
│   ├── README.md                 (aag/ index、CLAUDE.md からの 1 link entry)
│   ├── meta.md                   (Layer 0+1: 目的 + 要件、新規 Create)
│   ├── strategy.md               (Layer 2: 戦略マスター、文化論、設計原則 8 を含む)
│   ├── architecture.md           (Layer 2: 4 層構造定義 + 旧 4 層との関係)
│   ├── evolution.md              (Layer 2: 進化動学 = Discovery/Accumulation/Evaluation)
│   ├── operational-classification.md (Layer 2-3 境界: now/debt/review 運用区分)
│   ├── source-of-truth.md        (Layer 2 reference: 正本 / 派生物 / 運用物)
│   └── layer-map.md              (Layer 2 reference: 既存 file の 4 層マッピング)
└── (他 doc は不変、別 project の scope)
```

**命名原則**:
- `aag-5-` / `adaptive-` prefix は撤廃 (5.x marker は historical、ディレクトリで階層性が表現されるため prefix 不要)
- 短縮名 (`meta` / `strategy` / `architecture` / `evolution` / `operational-classification` / `source-of-truth` / `layer-map`) で責務を直接 articulate
- 旧 doc は段階的に Archive (legacy-retirement.md §2 の 3 段階)

### 3.8. 既存 8 doc への operation 仮判定 (Phase 3 audit で確定)

仮判定 (Phase 3 で精緻化):

| 旧 doc | 仮 operation | 新 path / 状態 (案) | 備考 |
|---|---|---|---|
| `adaptive-architecture-governance.md` | Split + Rewrite + Relocate + Archive (旧) | `aag/strategy.md` (戦略マスター) + `aag/evolution.md` (進化動学、別途 merge 候補) + バージョン履歴は per-doc に分散 | 戦略 + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table が同居しているため Split 必須。旧 4 層は Archive。「AAG の本質」「AAG が防ぐ AI の本質的弱点」「意図的に残す弱さ」は aag/meta.md または aag/strategy.md に振り分け |
| `aag-5-constitution.md` | Rewrite + Relocate + Rename | `aag/architecture.md` | 4 層構造定義 + 非目的 + 前提が同居。非目的は aag/meta.md §2.2 (要件 / 禁則) に移動、4 層構造定義のみ残して Rewrite |
| `aag-5-layer-map.md` | Rewrite + Relocate + Rename | `aag/layer-map.md` | reference として維持、prefix 撤廃 |
| `aag-5-source-of-truth-policy.md` | Rewrite + Relocate + Rename | `aag/source-of-truth.md` | reference として維持、prefix 撤廃 |
| `aag-four-layer-architecture.md` | **Archive** | `99-archive/` | 旧 4 層 (Principles/Judgment/Detection/Response)、aag-5-constitution.md で superseded 済、historical 参照のみ |
| `aag-operational-classification.md` | Rewrite + Relocate | `aag/operational-classification.md` | 運用区分 reference として維持 |
| `aag-rule-splitting-plan.md` | **Archive** | `99-archive/` | completed project (2026-04-13) の execution 記録、doc 自身が冒頭で完了宣言済 |
| `adaptive-governance-evolution.md` | Rewrite + Relocate + Rename | `aag/evolution.md` | 進化動学、prefix 撤廃 |

**新規 Create**:
- `aag/meta.md` (Layer 0+1: AAG Meta charter)
- `aag/README.md` (aag/ ディレクトリ index)
- `aag/display-rule-registry.md` (Phase 9 で創出、DFR-001〜005 registry)

**CLAUDE.md AAG セクション**: 「AAG を背景にした思考」が事実上の charter になっている core 内容を
aag/meta.md に逃がし、CLAUDE.md は aag/README.md への 1 link 索引のみに薄化 (Phase 4 で実施)。

### 3.9. 要件 (Layer 1) の例外 — 純粋 mechanism rule

次のような rule は製本不要で許容される (Phase 8 meta-guard の allowlist で管理)。allowlist は
**PR-gated + justification 必須 + ratchet-down baseline 増加禁止** の構造的設計 (aag/meta.md §2
要件の 1 つとして明文化):

- **suppress directive 規律** (例: `AR-G3-SUPPRESS-RATIONALE`) — コード品質 hygiene
- **size guard** (例: `AR-FILE-SIZE-LIMIT`) — 純粋 mechanism、業務 rule 不在
- **lint / format 連携 rule** — 外部 tool との binding

例外判定の軸: 「rule が無くてもプロダクトの **業務的意味** が壊れない」「pure mechanism として
完結する」「人間の意思決定でなく数値閾値 / pattern matching で完結する」。

例外追加 / 削除の trigger は **PR-gated state-based** で完結 (date-based cadence 禁止 =
aag/meta.md §2 禁則で構造禁止)。Discovery Review (月 1) には hook しない (date-based 儀式の
再生産防止)。

### 3.10. display rule (DFR) を本 project に吸収する理由

- 双方向 integrity (要件 §2 の最重要不変条件) の **最初の concrete application** として実証価値が高い
- DFR は新規 rule であり、Phase 8 meta-guard の **forward 方向** を初日から強制適用できる
- dialog で発見された CHART-004/005 の実 drift がそのまま baseline として活用可能
- 別 project に切り出すと「概念実証なき meta-rule」になり、abstract 化 risk

## 4. Phase 構造

> **2026-04-30 status update**: 本 project は **MVP 完遂** (Phase 1 + Phase 3 + cyclic refinement)。
> Phase 3 hard gate decision で **B (sub-project / follow-up project 分割) を確定** (HANDOFF §1.6)。
>
> **Phase 4〜10 は Project A〜D に移管予定** (next session で各 project bootstrap):
>
> | Project | scope (移管 Phase) | size |
> |---|---|---|
> | **Project A** | Phase 4 (doc refactor) + Phase 5 (legacy 撤退) | Level 3 |
> | **Project B** | Phase 2 (schema 拡張) + Phase 6 (AR-rule binding) + Phase 8 MVP (4.2 + 4.4 meta-guard) | Level 3 |
> | **Project C** | Phase 9 (DFR registry) + Phase 10 (DFR guards) | Level 2 |
> | **Project D** | Phase 5 で完遂しない複雑 archive 案件 | Level 2 |
>
> 以下の Phase 1〜10 articulation は **historical** として保持 (= 本 project が Phase 1〜10 を articulate していた時点での deliverable design、Project A〜D bootstrap 時の input として参照)。

### Phase 1: AAG Meta doc (`aag/meta.md`) の新規創出 + Requirement ID namespace 確定

**目的**: AAG が満たすべき要件 (目的 + 不変条件 + 禁則) を articulate する単一エントリ doc を
新規 Create。前回案の 7 section charter ではなく、§3.3 の **4 section 構造** (要件定義 + audit
framework + AR-rule binding hub の 3 機能融合 mechanism doc) で確立する。**Requirement ID
namespace を本 Phase で固定** (PR review Review 3 P1 #5 反映、Phase 6 の metaRequirementRefs 自由
記述化を防ぐ)。

**deliverable**:
- `references/01-principles/aag/meta.md` 新規 Create (新 path、ディレクトリ階層化、§3.7 命名規則)
  - §1 目的 (Purpose、1-2 段落、Layer 0)
  - §2 要件 (Requirements、不変条件 + 禁則 table、各行に **stable Requirement ID (`AAG-REQ-*`)** + enforcing AR-rule + state-based 達成条件 + 達成 status)
  - §3 AAG Core 構成要素 mapping (Layer 2 doc + Layer 3 実装 を 5 層位置付けで整理)
  - §4 達成判定総括 (全要件の達成度サマリ + 不達成項目の解消責務)
- **Requirement ID namespace 確定** (aag/meta.md §2 で landing、stable ID として今後 metaRequirementRefs から参照):
  ```
  AAG-REQ-BIDIRECTIONAL-INTEGRITY      # 双方向 integrity (forward + reverse)
  AAG-REQ-STATE-BASED-GOVERNANCE        # state-based trigger (期間 buffer 不使用)
  AAG-REQ-SELF-HOSTING                  # AAG が AAG を守る self-hosting
  AAG-REQ-RATCHET-DOWN                  # 改善は不可逆 (baseline 増加禁止)
  AAG-REQ-NON-PERFORMATIVE              # performative work 生成禁止 (proxy metric 防止)
  AAG-REQ-NO-DATE-RITUAL                # date-based ritual 禁止 (cooling period / 月次 review hook 等)
  AAG-REQ-LAYER-SEPARATION              # 層境界 (5 層 drill-down) 維持
  AAG-REQ-ANTI-DUPLICATION              # 重複と参照の切り分け (上位 content の copy 禁止)
  AAG-REQ-SEMANTIC-ARTICULATION         # drill-down chain semantic management (problem + resolution 必須)
  ```
  (initial set、Phase 3 audit + 実装で extensible)
- **observeForDays vs inbound 0 trigger 切り分け** を aag/meta.md §2 に明記 (PR review Review 1 #6 + Review 3 P2 #8 反映):
  - **legacy doc 削除** (Phase 5 archive / 物理削除): `AAG-REQ-NO-DATE-RITUAL` 適用、inbound 0 機械検証のみ trigger、期間 buffer 禁止
  - **experimental rule 昇格 / 撤回**: 既存 `lifecyclePolicy.observeForDays` を **supplementary signal** として許容 (trigger ではなく観測指標)。これは `AAG-REQ-NO-DATE-RITUAL` の例外として明示 articulate
  - 「期間ベース判断の禁止範囲」(legacy doc 削除のみ) を `AAG-REQ-NO-DATE-RITUAL` の説明欄に明記
- `references/01-principles/aag/README.md` 新規 Create (aag/ ディレクトリ index、CLAUDE.md からの 1 link entry)
- `docs/contracts/doc-registry.json` に新 doc 登録 (aag/meta.md + aag/README.md)
- CLAUDE.md AAG セクションに 1 行索引 link 追加 (詳細薄化は Phase 4)

**完了条件**: aag/meta.md skeleton landing + Requirement ID namespace landing + observeForDays
切り分け articulate + 人間 review 通過 (Constitution 改訂と同等の慎重さ) + doc-registry 登録 +
既存 guard 全 PASS。**Phase 1 と Phase 3 audit は並行 refine 可能** (Meta が audit 結果を反映して
update する cyclic refinement、最終確定は Phase 3-4 完了後、§8.14 順序付き)。

### Phase 2: AAG rule metadata 拡張 (semantic articulation 構造 + status field、変更対象正本 = BaseRule)

**目的**: rule entry に semantic articulation 構造を持つ binding field を追加 (§3.4.4 schema、
**status field 必須**)。drill-down chain の重複と参照の切り分け + 「下位が上位の何を課題として /
何を解決しているか」を管理対象として確立。

**変更対象正本** (PR review Review 3 P0 #1 + P1 #4 反映、defaults.ts は execution overlay = 運用状態
のため対象外、guardCategoryMap.ts は二重正本回避のため touch しない):

| 種別 | 正本 path |
|---|---|
| 型定義 | `app/src/test/aag-core-types.ts` または `app/src/test/architectureRules/types.ts` |
| 実データ | `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule の物理正本、`ARCHITECTURE_RULES` 配列) |
| derived consumer | `app/src/test/architectureRules/merged.ts` (consumer は merged.ts 経由のみアクセス) |
| **触らない** | `app/src/test/architectureRules/defaults.ts` (execution overlay、fixNow / executionPlan / lifecyclePolicy 限定) |
| **触らない** | `app/src/test/guardCategoryMap.ts` (二重正本回避、category / layer / note のまま、semantic binding は持たせない) |

**deliverable**:
- `architectureRules/types.ts` (or `aag-core-types.ts`) に **`SemanticTraceBinding<T>` 型 family** を追加 (§3.4.4 構造):
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
- **`RuleBinding` 型** に下記 field を追加 (PR review Review 3 P1 #3 反映、`RuleSemantics` でなく `RuleBinding` 側に置く理由は docPath がリポジトリ固有具体値のため):
  - `canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` (実装 → 設計 doc binding)
  - `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` (実装 → 要件 binding)
- `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` 全 rule に **`{ status: 'pending', refs: [] }`** で初期化 (空配列でなく明示的な「未対応」状態、後続 Phase で `'bound'` に flip or `'not-applicable'` で justify)
- TypeScript 型定義の整合 (`merged.ts` 経由で consumer から canonicalDocRef + metaRequirementRefs にアクセス可能)
- (option) 既存 `principleRefs` の semantic 化検討 (pointer のみ → pointer + problem + resolution + status)、本 project に含めるか別 sprint かは Phase 0.5 で判断

**完了条件**: 既存全 rule が `{ status: 'pending', refs: [] }` で初期化、build / lint / 既存 guard
全て PASS。schema は semantic articulation 必須 field + status による「未対応 vs 適用外」区別 を
表現可能。defaults.ts (overlay) と guardCategoryMap.ts は **不変** (semantic binding は BaseRule のみが正本)。

### Phase 3: AAG Core doc audit (4 層位置付け + 責務定義 + drill-down chain)

**目的**: AAG 関連 doc 群 (`references/01-principles/` 配下 8 doc + CLAUDE.md AAG セクション) の
**4 層位置付け + 責務 + write/non-write list + 影響範囲 + 必要 operation** を articulate。Phase 4
refactor + Phase 6 AR rule binding の input を産出する集約 phase。

**deliverable** (各 doc に対して):
- **4 層位置付け** (Layer 0/1/2/3/境界 のどれか)
- **責務** (1 doc 1 責務、C1 適用)
- **書くべきこと (write list)** + **書かないこと (non-write list)** (§3.6 framework)
- **drill-down pointer** (上位 back-pointer + 下位 drill-down)
- **必要 operation** (Create / Split / Merge / Rename / Relocate / Rewrite / Archive)
- **影響範囲 inventory** (inbound link 数 / 索引 / registry / guard binding)
- **migration order** (operation 間の依存 + commit 順序)

**追加 deliverable**:
- AR-rule canonization mapping (各 rule-defining doc が canonize している rule、人間語 → AR rule ID 候補)
- gap 識別 (慣習として確立しているが doc 化されていない rule の候補)
- redundancy 識別 (同一概念を複数 doc が説明、conflict があれば flag)
- staleness 識別 (archived / superseded / 内容が古い doc)
- audit 結果を `references/02-status/aag-doc-audit-report.md` に集約

**完了条件**: 全 AAG 関連 doc に対して上記 7 項目が articulate、Phase 4 refactor / Phase 5 legacy 撤退
/ Phase 6 AR rule binding への hand-off が可能。

### Phase 4: AAG Core doc content refactoring (新規書き起こし優先)

**目的**: Phase 3 audit で derive された operation を **§3.5 操作順序原則** に従い段階実行。
**edit-in-place 禁止**、新規書き起こし → 旧 doc 退役の段階パスで AAG Core 8 doc を再構築。

**deliverable** (operation 順序):

1. **Create 段階**: 新 path に新 doc を直接 Create (§3.7 階層化案、aag/strategy.md / aag/architecture.md / aag/evolution.md / aag/layer-map.md / aag/source-of-truth.md / aag/operational-classification.md)
2. **Split / Merge / Rewrite 段階**: 旧 doc から内容を選別して新 doc に書き起こし、4 層位置付け + drill-down pointer を装着
3. **CLAUDE.md AAG セクション薄化**: 「AAG を背景にした思考」の core 内容を aag/meta.md に逃がし、CLAUDE.md は aag/README.md への 1 link 索引のみに
4. **doc-registry.json + principles.json + manifest.json** 更新 (新 doc 登録、旧 doc は deprecation marker 段階に置く、Phase 5 で archive)
5. 各 operation 独立 commit、parallel comparison 期間を確保 (旧 doc remain の状態で新 doc が validate される)

**完了条件**: Phase 3 で derive された operation が全件 execute、新 doc 群が landing、parallel
comparison 期間に entered (旧 doc は deprecation marker のみ、まだ archive 移管前)。

### Phase 5: legacy 撤退 (旧 doc archive、inbound 0 trigger)

**目的**: Phase 4 で deprecation marker 段階に置かれた旧 doc を、§3.5 操作順序原則 5 + §2 不可侵原則 #7
に従い段階的に archive 移管 + 物理削除。**期間 (日数 / commits 数) を一切使わず、参照場所が 0 になった瞬間** が唯一 trigger。

**deliverable**:
- `legacy-retirement.md` を実値で update (Phase 3 audit の Archive 候補対象を埋める)
- 各旧 doc の **inbound 0 機械検証** (旧 path への参照を全 doc / 全 registry / 全 guard binding で grep)
- inbound 0 確認した旧 doc を `references/99-archive/` に移管 (migrationRecipe + 履歴付き)
- 99-archive 配下の旧 doc に対する inbound も 0 になった file は物理削除 (即時、buffer なし)
- doc-registry.json + principles.json + manifest.json の reflect

**完了条件**: 全 Archive 候補 doc が archive 移管または物理削除済、inbound 0 状態が機械検証で
確認、`legacy-retirement.md` に各 operation の commit + migrationRecipe 履歴が記録。

### Phase 6: 既存 AR-NNN rule の audit + binding (partial)

**目的**: Phase 3 の rule mapping を input に、既存 100+ AR rule を 4 分類で binding (`canonicalDocRef`
+ `metaRequirementRefs`)。自明な既製本 rule (分類 A) を即時 binding、B/C/D は後続 sprint。

**deliverable**:
- 既存 100+ rule を A/B/C/D 4 分類に audit
  - **A. 既製本済**: Phase 3 mapping で対応 doc が確定
  - **B. 半製本**: doc に rule の意図はあるが正本確定が必要
  - **C. 製本されていない**: 純粋 mechanism rule (要件の例外、§3.9) or 撤回検討
  - **D. 撤回判定**: proxy / performative
- 分類 A の `canonicalDocRef` 即時記入 + `metaRequirementRefs` (該当する aag/meta.md §2 要件への pointer) 記入
- 分類 D の sunset 計画
- audit 結果を `references/02-status/ar-rule-audit.md` に記録

**完了条件**: 分類 A の binding 100%、分類 D の sunset trigger 確定。

### Phase 7: Layer 2 doc に back link section + drill-down semantic 装着

**目的**: AAG Core 戦略 doc 群 (Phase 4 で再構築済) + 他系 canonical doc 群に
`## Mechanism Enforcement` section を追加、双方向 binding を semantic chain として構築。
§3.4.3 の semantic management 原則を Layer 2 → Layer 1 binding にも適用。

**deliverable**:
- `04-design-system/docs/` の関連 doc に section 追加
- `01-principles/` / `03-guides/` の rule 定義 doc に section 追加
- 各 section の各 entry は **3 要素を保持** (semantic management 原則):
  - 対応 AR rule ID (forward pointer to Layer 3)
  - aag/meta.md §2 要件 ID (forward pointer to Layer 1)
  - 該当要件の architect 寄与 (problemAddressed + resolutionContribution、Layer 2 として何を課題として認識し何を解決しているか)
- 重複は禁止 (上位 content を copy せず、pointer + 解決 articulation のみ持つ)

**完了条件**: Phase 6 分類 A の rule が、Layer 2 doc 側からも back link で見える状態 + 各 doc が
aag/meta.md §2 のどの要件を realize しているか forward pointer + 解決 articulation を持つ状態。

### Phase 8: Layer 4 sub-audit 実装 (forward / reverse meta-guard + semantic quality)

**目的**: 双方向 integrity (要件 §2 の最重要不変条件) を機械検証する meta-guard を landing。
§3.4.3 semantic management の articulation field (problemAddressed + resolutionContribution) +
§3.4.5 semantic articulation 品質基準 (禁止 keyword + 20 文字 minimum + 重複検出) も検証対象。

**deliverable**:
- `canonicalDocRefIntegrityGuard.test.ts` (reverse、4.2 方向): 各 AR rule の `canonicalDocRef.refs` の各 entry に対して:
  - `docPath` 実在
  - 参照先 doc 内に rule ID 出現
  - `problemAddressed` / `resolutionContribution` non-empty (semantic 妥当性は人間 review)
- `canonicalDocBackLinkGuard.test.ts` (forward、4.2 方向): canonical doc の `## Mechanism Enforcement` section の各 entry に対して:
  - 対応 AR ID が実在
  - 要件 ID が aag/meta.md §2 に実在
  - architect 寄与 articulation non-empty
- `metaRequirementBindingGuard.test.ts` (4.2 方向): 各 rule の `metaRequirementRefs.refs` の各 entry に対して:
  - `requirementId` が aag/meta.md §2 に実在
  - `problemAddressed` / `resolutionContribution` non-empty
- **`semanticArticulationQualityGuard.test.ts`** (新規、4.4 完備性 + 4.5 機能性) — §3.4.5 品質基準:
  - 禁止 keyword (TBD / N/A / same / see above / misc / various / `-` / unknown 等) のマッチ検出 hard fail
  - `problemAddressed` / `resolutionContribution` 各 20 文字以上 (英数字 + 日本語)
  - 同 rule 内で `problemAddressed` と `resolutionContribution` 完全一致は禁止
  - `status='not-applicable'` の `justification` も同基準
- **`statusIntegrityGuard.test.ts`** (新規、4.4 完備性) — `status` field の整合性:
  - `status='bound'` のとき `refs` は non-empty
  - `status='not-applicable'` のとき `justification` 必須
  - `status='pending'` の rule 数を baseline 化、ratchet-down で漸次解消
- **`selfHostingGuard.test.ts`** (新規、4.5 機能性) — aag/meta.md self-hosting:
  - aag/meta.md §2 要件が `AR-AAG-META-*` rule に linked
  - aag/meta.md 自身が `metaRequirementRefs` を持つ (= 自分が realize する課題を articulate)
  - meta-rule の更新に対して内部整合性が hard fail check
- 例外 allowlist の機械管理 (baseline、§3.9 純粋 mechanism rule = `status='not-applicable'` で justify)
- 新 rule 追加時の immediate enforcement (baseline 増加方向は禁止、ratchet-down のみ)

**完了条件**: 既存 baseline で PASS、新 rule 追加 PR で immediate enforcement、循環 fail なし。
**aag/meta.md §2 の双方向 integrity 要件 status が「未達成」→「達成」に flip**。semantic articulation
field が全 binding で non-empty + 品質基準 PASS。`status='pending'` baseline は ratchet-down で
漸次減少。

### Phase 9: DFR registry (Layer 2 新規製本)

**目的**: Phase 3 で識別された display-rule gap に対応する新規 canonical doc を作成。
display-rule registry は双方向 integrity の最初の concrete instance。

**deliverable**:
- `references/01-principles/aag/display-rule-registry.md` 新設 (新 path、aag/ ディレクトリ配下)
  - DFR-001 chart semantic color
  - DFR-002 axis formatter via useAxisFormatter
  - DFR-003 percent via formatPercent
  - DFR-004 currency via formatCurrency (thousands separator 明文化)
  - DFR-005 icon via pageRegistry / emoji canonical
- Phase 3 で gap 判定された他 rule に対する新規 doc (必要なものに限定、anti-bloat 適用)
- `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新
- doc-registry.json への registry 登録

**完了条件**: 新規製本対象 doc 全件が rule entry として完全 (Layer 1 source link / Layer 2 doc link
/ bypass pattern / 適用 path / migrationRecipe / metaRequirementRefs)、Phase 8 forward meta-guard
で integrity 成立。

### Phase 10: 表示 rule guards 実装 (Phase 9 instances を Layer 3 で機械検証)

**目的**: DFR-001〜005 + Phase 9 で創出した他新規 rule を Layer 3 (実装) で機械検証、observed
drift を baseline 化。

**deliverable**:
- `displayRuleGuard.test.ts` 新設 (rule registry framework)
- DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule 物理正本) に登録 (`canonicalDocRef` + `metaRequirementRefs` を `SemanticTraceBinding<T>` 形式で含む)。`defaults.ts` (overlay) と `guardCategoryMap.ts` には semantic binding を **置かない** (二重正本回避)。category 補助のみ必要なら `guardCategoryMap.ts` に entry 追加可
- 各 rule の baseline 確定 (観測済 drift を ratchet-down 起点に)
- migrationRecipe の各 rule への記入
- 各 rule に `canonicalDocRef` + `metaRequirementRefs` 記入

**完了条件**: 全 DFR rule が active、baseline で PASS、新規 drift は immediate fail、Phase 8
reverse meta-guard で全 DFR rule の binding 整合成立。**aag/meta.md §2 の performative 防止
要件 status が「未達成」→「達成」に flip**。

## 5. やってはいけないこと

> **方針 (§1.2 #10 + §2 #11)**: 本 project は破壊的変更前提。既存 AAG 構造の変更は積極的に
> 許容される。以下の制約は依然として absolute:

### 5.1. Scope 関連

- **本体アプリ (粗利管理ツール) の機能変更** (AAG governance の対象は AAG 自身、業務 logic は別 project)
- **parent project (`phased-content-specs-rollout`) の archive process への干渉** (parent は独立進行)
- **Layer 0 (目的) の機械検証可能 condition への変換試行** (Layer 0 は人間判断のみ)

### 5.2. Phase 順序関連

- **Phase 9 を Phase 8 より先にやる** (循環 fail、meta-guard が registry を hard fail させる)
- **Phase 4 doc refactor を Phase 3 audit より先にやる** (operation 判定なしの refactor は意図不明な change を生む)
- **Phase 5 legacy 撤退を Phase 4 refactor より先にやる** (新 doc が landing する前に旧 doc を archive すると inbound migration 不能)
- **dialog で観測された drift の即時修正** (Phase 10 まで開けない、順序遵守)
- **Phase 3 audit の段階で sunset / refactor / 修正を実行する** (audit は findings 集約 + operation 判定 + 影響範囲 inventory のみ、実行は Phase 4 / 5 / 6 / 9 で別 wave)

### 5.3. Doc operation 関連

- **AAG Core 既存 doc の edit-in-place で意味改変** (Phase 4 doc refactor は新規書き起こし → 旧 doc 退役 の段階パスのみ)
- **重複 articulation の生成** (上位 content を下位 doc で copy しない、§3.4.2 anti-duplication 原則)
- **pointer のみの binding** (semantic articulation = problemAddressed + resolutionContribution が必須、§3.4.3 semantic management)
- **doc operation 順序原則の violation** (§3.5: Create を最後にやる / Archive を Create 前にやる 等)
- **Phase 5 で sunset 判定された doc の遡及的物理削除** (migrationRecipe + 履歴付きで段階削除、後任が経緯を追える状態を維持)
- **inbound 0 確認なしの物理削除** (機械検証で旧 path への参照 0 を確認してから移管)
- **期間 buffer (日数 / commits 数) を trigger に使う** (anti-ritual、§2 不可侵原則 #7)

### 5.4. Layer / 抽象化関連

- **Layer 0 / Layer 1 を contradicting 形で update する** (Constitution 改訂と同等の慎重さ、人間 review 必須)
- **下位 doc に上位 content を copy する形での「説明強化」** (§3.4.2、参照で済ませる)

## 6. 関連実装

> **path 列の `(仮)` 表記**: Phase 3 audit + Phase 4 refactor で確定する仮 path。確定 path は
> Phase 3 deliverable で articulate される。

### 6.1. AAG Meta + AAG Core (Layer 0/1/2 doc 群、新 path 仮)

| パス (仮) | Layer | 役割 | 主要 Phase |
|---|---|---|---|
| `references/01-principles/aag/meta.md` | 0 + 1 | **AAG Meta** = 目的 + 要件 (Phase 1 新規 Create) | Phase 1 |
| `references/01-principles/aag/README.md` | — | aag/ ディレクトリ index、CLAUDE.md からの 1 link entry | Phase 1 |
| `references/01-principles/aag/strategy.md` | 2 | 戦略マスター (旧 adaptive-architecture-governance.md core を Split + Rewrite) | Phase 4 |
| `references/01-principles/aag/architecture.md` | 2 | 4 層構造定義 (旧 aag-5-constitution.md を Rewrite + Relocate + Rename) | Phase 4 |
| `references/01-principles/aag/evolution.md` | 2 | 進化動学 (旧 adaptive-governance-evolution.md を Rewrite + Relocate + Rename) | Phase 4 |
| `references/01-principles/aag/operational-classification.md` | 2-3 境界 | now/debt/review 運用区分 (旧 aag-operational-classification.md を Rewrite + Relocate) | Phase 4 |
| `references/01-principles/aag/source-of-truth.md` | 2 reference | 正本 / 派生物 / 運用物 (旧 aag-5-source-of-truth-policy.md を Rewrite + Relocate + Rename) | Phase 4 |
| `references/01-principles/aag/layer-map.md` | 2 reference | ファイルの 4 層マッピング (旧 aag-5-layer-map.md を Rewrite + Relocate + Rename) | Phase 4 |
| `references/01-principles/aag/display-rule-registry.md` | 2 | DFR-NNN registry (Phase 9 新規 Create) | Phase 9 |

### 6.2. 旧 AAG Core doc (deprecation marker → archive 候補)

| 旧パス | operation | 移管先 |
|---|---|---|
| `references/01-principles/adaptive-architecture-governance.md` | Split + Rewrite + Archive | `aag/strategy.md` + バージョン履歴は per-doc 分散 + 旧 4 層は Archive |
| `references/01-principles/aag-5-constitution.md` | Rewrite + Relocate + Rename | `aag/architecture.md` (退役後 Archive) |
| `references/99-archive/aag-5-layer-map.md` | Rewrite + Relocate + Rename | `aag/layer-map.md` (退役後 Archive) |
| `references/99-archive/aag-5-source-of-truth-policy.md` | Rewrite + Relocate + Rename | `aag/source-of-truth.md` (退役後 Archive) |
| `references/99-archive/aag-four-layer-architecture.md` | **即 Archive** | `99-archive/` (旧 4 層、superseded) |
| `references/99-archive/aag-operational-classification.md` | Rewrite + Relocate | `aag/operational-classification.md` (退役後 Archive) |
| `references/99-archive/aag-rule-splitting-plan.md` | **即 Archive** | `99-archive/` (completed project execution 記録) |
| `references/99-archive/adaptive-governance-evolution.md` | Rewrite + Relocate + Rename | `aag/evolution.md` (退役後 Archive) |

### 6.3. CLAUDE.md AAG セクション

| パス | 役割 | Phase |
|---|---|---|
| `CLAUDE.md` § AAG を背景にした思考 | core 内容を aag/meta.md に逃がし、CLAUDE.md は aag/README.md への 1 link 索引のみに薄化 | Phase 4 |

### 6.4. Audit / 集約 doc

| パス (仮) | 役割 | Phase |
|---|---|---|
| `references/02-status/aag-doc-audit-report.md` | Phase 3 AAG Core doc audit findings (4 層 + 責務 + write/non-write + 影響範囲 + operation) | Phase 3 |
| `references/02-status/ar-rule-audit.md` | Phase 6 既存 AR rule audit 結果 + binding 進捗 | Phase 6 |

### 6.5. Layer 2 既存 canonical doc (Phase 7 で back link 追加)

| パス | 役割 |
|---|---|
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 Layer 2 製本 (Phase 7 で back link + drill-down 装着) |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 Layer 2 製本 (同上) |
| `references/04-design-system/docs/iconography.md` | DFR-005 Layer 2 製本 (同上) |
| `references/04-design-system/docs/content-and-voice.md` | thousands-separator 記述更新 (Phase 9) |
| `references/03-guides/coding-conventions.md` §数値表示ルール | DFR-003/004 Layer 2 製本 (Phase 7) |

### 6.6. Schema / Guard / Allowlist (Layer 3 実装)

| パス | 役割 | Phase |
|---|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | **BaseRule 物理正本** (Phase 2 で `canonicalDocRef` + `metaRequirementRefs` を `SemanticTraceBinding<T>` 形式で追加、Phase 6/10 で entry 追加) | Phase 2 / 6 / 10 |
| `app/src/test/architectureRules/types.ts` / `app/src/test/aag-core-types.ts` | BaseRule / RuleBinding 型定義 (Phase 2 で `SemanticTraceBinding<T>` / `CanonicalDocTraceRef` / `MetaRequirementTraceRef` 型追加) | Phase 2 |
| `app/src/test/architectureRules/merged.ts` | derived consumer (consumer は merged.ts 経由のみアクセス) | Phase 2 |
| `app/src/test/architectureRules/defaults.ts` | execution overlay (運用状態 = fixNow / executionPlan / lifecyclePolicy 限定)。**semantic binding は置かない、本 project では touch しない** | (touch しない) |
| `app/src/test/guardCategoryMap.ts` | category / layer / note の補助 metadata。**semantic binding は置かない** (二重正本回避、本 project では touch しない) | (touch しない) |
| `app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts` | Phase 8 reverse meta-guard (semantic articulation 検証含む) | Phase 8 |
| `app/src/test/guards/canonicalDocBackLinkGuard.test.ts` | Phase 8 forward meta-guard (semantic articulation 検証含む) | Phase 8 |
| `app/src/test/guards/metaRequirementBindingGuard.test.ts` | Phase 8 option (Layer 1 ↔ Layer 3 binding 検証) | Phase 8 |
| `app/src/test/guards/displayRuleGuard.test.ts` | Phase 10 DFR guards | Phase 10 |

### 6.7. Project 内 deliverable

| パス | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/legacy-retirement.md` | Phase 5 sunset / archive / migrationRecipe 履歴 (state-based trigger、inbound 0 検証) |
| `references/99-archive/` | Phase 5 archive 移管先 |

## 7. 成功判定

### 7.1. AAG Meta (Layer 0+1) 確立

- **`aag/meta.md` が landing** (§1 目的 / §2 要件 (不変条件 + 禁則) / §3 AAG Core mapping / §4 達成判定総括 の 4 section 完備)
- §2 要件 table の各行が **AR-rule に linked** + **state-based 達成条件** + **達成 status** を持つ (semantic articulation 完備)
- aag/README.md が aag/ ディレクトリ index として機能、CLAUDE.md AAG セクションは 1 link 索引のみに薄化
- Layer 0 (目的) は人間判断のみで管理、Layer 1 (要件) 以下が機械検証可能

### 7.2. AAG Core (Layer 2+3) re-articulation

- AAG 関連 8 doc の content が **新規書き起こし** で aag/ ディレクトリ内に再構築 (旧 doc は inbound 0 trigger で archive 移管または物理削除済)
- 各 doc が **1 doc 1 責務** (C1) で articulated、4 層位置付け + drill-down pointer + semantic articulation を持つ
- **重複 articulation がゼロ** (上位 content の copy なし、参照は pointer + 解決 articulation のみ)
- 旧 4 層 doc (`aag-four-layer-architecture.md`) + completed project doc (`aag-rule-splitting-plan.md`) は archive 移管済

### 7.3. drill-down chain の semantic management

- AR-rule schema に `canonicalDocRef` (実装 → 設計) + `metaRequirementRefs` (実装 → 要件) が追加
- 各 binding entry が `problemAddressed` + `resolutionContribution` を non-empty で保持
- Layer 2 doc の `## Mechanism Enforcement` section が AR ID + 要件 ID + architect 寄与を articulate
- meta-guard (forward + reverse) が semantic articulation field の non-empty を機械検証

### 7.4. 双方向 integrity の機械強制

- 既存 AR-NNN rule のうち分類 A (自明な既製本) が 100% binding 済 (semantic articulation 完備)
- forward / reverse meta-guard が active で違反 0
- 新規 AR rule 追加時、`canonicalDocRef` + `metaRequirementRefs` 必須化が機械強制 (PR 経路で hard fail)
- aag/meta.md §2 の **双方向 integrity / performative 防止 要件 status が「未達成」→「達成」に flip**

### 7.5. DFR (Display Rule) instance 確立

- DFR-001〜005 が registry に登録、各 baseline で PASS
- DFR rule が `canonicalDocRef` + `metaRequirementRefs` の semantic articulation を完備
- 観測済 drift (CHART-004/005 / FactorDecomp / BudgetTrend / Seasonal 等) が ratchet-down 起点として記録

### 7.6. Project governance

- parent project (`phased-content-specs-rollout`) の archive 進行に干渉なし (独立進行)
- Phase 5 legacy 撤退で全 Archive 候補 doc が **inbound 0 trigger** で archive 移管または物理削除済
- Phase 順序遵守 (Phase 4 doc refactor → Phase 5 legacy 撤退 → Phase 6 rule binding → Phase 8 meta-guard → Phase 9 DFR registry → Phase 10 DFR guards)
- 期間 buffer 不使用 (anti-ritual)

## 8. 実装セッションで確認・調査が必要な事項

> **本セッション (構造と計画) → 実装セッションへの handoff**: 実装着手前に以下を調査・確認する。
> 各項目は「どの Phase で必要か」を articulate。

### 8.0. Phase 別 prerequisite 集約 view (改善 1 反映、粒度補正)

§8.1〜§8.14 を Phase 別に集約 (各 Phase 着手前に確認すべき項目):

| Phase | 着手前 prerequisite | 詳細 § |
|---|---|---|
| Phase 1 (aag/meta.md skeleton + Requirement ID + observeForDays) | §8.5 registry / contract 系現実 schema、§8.8 命名 / 階層化整合性、§8.10 Audit home doc 判断 (A/B/C)、§8.13 CLAUDE.md 薄化判断 (A/B)、§8.14 同期方針 (B 推奨) | §8.5 / §8.8 / §8.10 / §8.13 / §8.14 |
| Phase 2 (BaseRule schema 拡張) | §8.2 BaseRule schema 確認、§8.9 principleRefs semantic 化検討 | §8.2 / §8.9 |
| Phase 3 (AAG Core doc audit) | §8.1 doc inventory grep、§8.3 縦スライス整合性、§8.4 Layer 3-4 境界、§8.7 Layer 2 doc 状態、§8.11 旧 4 層 → 新 5 層 mapping | §8.1 / §8.3 / §8.4 / §8.7 / §8.11 |
| Phase 4 (doc content refactoring) | Phase 3 audit 完了 + Phase 3 split hard gate 通過、§8.8 命名 / 階層化、§8.13 CLAUDE.md 薄化 | §8.8 / §8.13 |
| Phase 5 (legacy 撤退) | Phase 4 完了 + inbound migration 完了 | (Phase 5 自体が機械検証) |
| Phase 6 (既存 AR rule audit + binding) | Phase 3 mapping、§8.2 schema、§8.12 articulation draft 生成 protocol | §8.2 / §8.12 |
| Phase 7 (Layer 2 back link section) | §8.7 Layer 2 doc 状態、Phase 6 binding 完了 | §8.7 |
| Phase 8 (MVP meta-guard 4.2 + 4.4) | Phase 2 schema 拡張完了、Phase 6/7 binding 完了、§8.4.1 sub-audit list 確定 | §8.4.1 |
| Phase 9 (DFR registry) | Phase 8 meta-guard landing 完了、§8.6 DFR baseline survey | §8.6 |
| Phase 10 (DFR guards) | Phase 8 + Phase 9 完了 | (Phase 10 自体が実装) |

### 8.1. AAG Core 既存 doc の実 inventory (Phase 3 audit の入力)

- [ ] 既存 8 doc + CLAUDE.md AAG セクションの **実 inbound link 数** を grep で確認
  - 対象 grep: `references/` 配下 + `CLAUDE.md` + `app/src/test/` + `tools/architecture-health/` + `docs/contracts/` + `projects/` 配下
  - 各 doc がどこから参照されているかの完全 inventory
- [ ] 各 doc の **現状 content responsibility** を articulate (1 doc 1 責務 C1 違反を identify)
- [ ] 各 doc の **正本性 status** (authoritative / candidate / stale / superseded) を判定
- [ ] **CLAUDE.md AAG セクションの行レベル分析** (どの行を残し、どの行を aag/meta.md に逃がすか)

### 8.2. AAG rule registry の現実 schema (Phase 2 + Phase 6 の入力)

- [ ] `app/src/test/architectureRules.ts` の rule entry **current schema** を確認 (current fields: id / what / why / detection / fixNow / slice / principleRefs / migrationRecipe / ...)
- [ ] Phase 2 で追加する `canonicalDocRef` + `metaRequirementRefs` の **正確な position** + 既存 field との依存関係
- [ ] 既存 100+ rule の **slice assignment 状態** (5 縦スライス未割当 rule の有無)
- [ ] 既存 `principleRefs` の **semantic 化検討** (pointer のみ → pointer + problem + resolution 同型化、本 project に含めるか別 sprint か)

### 8.3. 5 縦スライスの整合性検証 (Phase 3 audit の入力)

- [ ] 既存 5 縦スライス (`layer-boundary` / `canonicalization` / `query-runtime` / `responsibility-separation` / `governance-ops`) は **十分か** ? doc-governance 等の新スライスが必要か?
- [ ] 各スライスの **ルール件数** (過密 / 空きの確認)
- [ ] スライス境界の **reshape 必要性** (破壊的変更前提で許容、§3.1.4)
- [ ] 本体側 modular monolith evolution の縦スライスとの **terminology / 思想 match / mismatch**

### 8.4. Layer 3 と Layer 4 の境界 + Layer 4 sub-categorization (Phase 3 audit + Phase 4 refactor の入力)

- [ ] 既存 guard / health-rules / certificate / Discovery Review が **Layer 3 (実装) / Layer 4 (検証) のどちらに属するか** identify
- [ ] **混在している guard** の identify (例: `architectureRuleGuard.test.ts` が rule schema 整合性 = Layer 3 + claim/actual 照合 = Layer 4 を両方担っているか確認)
- [ ] meta-guard (Phase 8 で landing 予定) が Layer 4 に分類されることの確認

#### 8.4.1. Layer 4 sub-audit list の確定 (initial 5 + 追加候補の判定)

§3.1.5 で initial articulate した 5 sub-audit (4.1 境界 / 4.2 方向 / 4.3 波及 / 4.4 完備性 /
4.5 機能性) で十分か検証 + 追加候補の判定:

- [ ] 5 initial sub-audit が **すべての Layer 4 責務をカバー** するか確認 (Phase 3 audit findings に基づく)
- [ ] 追加候補 (4.6 同期 / 4.7 ratchet / 4.8 退役 / 4.9 例外 lifecycle) の **collapse 可否を判定** (5 initial に collapse 可能か、独立 sub-audit として articulate するか)
- [ ] 既存 guard の sub-audit 分類を完了 (1 guard = 1 sub-audit、混在 guard は Phase 4 で分離対象)
- [ ] 新 sub-audit を追加する場合の **判定基準** を articulate (responsibility 純度、C1 適用、既存 sub-audit との overlap)
- [ ] aag/meta.md §2 要件として **「Layer 4 sub-categorization の進化」** を articulate (新 sub-audit 追加 / merge / split は Constitution 改訂レベル人間 review)

### 8.5. registry / contract 系の構造 (Phase 1 + Phase 4 + Phase 5 の入力)

- [ ] `docs/contracts/principles.json` の **current schema** (新 doc 追加時の field)
- [ ] `docs/contracts/doc-registry.json` の **current schema** (新 doc 追加時の field)
- [ ] `.claude/manifest.json` の **current schema** (新 doc 追加時の field、obligation map との連携)
- [ ] **obligation map の triggering rules** (`tools/architecture-health/src/collectors/obligation-collector.ts`) — 新 doc 追加 / 旧 doc 退役 時の自動義務
- [ ] **pre-commit / pre-push hook の現状** (`tools/git-hooks/`) — 新 meta-guard 追加時の hook 統合

### 8.6. DFR-001〜005 の実 baseline survey (Phase 9 + Phase 10 の入力)

- [ ] DFR-001 (chart semantic color): CHART-004 / CHART-005 の semantic 不使用 (2 件) — 本 plan で確認済
- [ ] DFR-002 (axis formatter): FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び — **実 path 完全列挙 + count 確認** (≥5 件想定)
- [ ] DFR-003 (percent): BudgetTrend / Seasonal 等の `Math.round(v * 100)` — **実 path 完全列挙 + count 確認** (≥3 件想定)
- [ ] DFR-004 (currency thousands separator): **survey 未実施** — 全 chart / table component の formatCurrency 利用 vs 直接 `Intl.NumberFormat` / 自前 formatter 利用を grep
- [ ] DFR-005 (icon canonical): **survey 未実施** — pageRegistry / emoji canonical を経由しない icon 利用を grep

### 8.7. 既存 Layer 2 canonical doc の状態 (Phase 7 の入力)

- [ ] `04-design-system/docs/` 配下の **rule 定義 doc 一覧** + 各 doc が canonize している rule
- [ ] `01-principles/` 配下の **設計系 doc** (design-principles.md / engine-boundary-policy.md 等) が canonize している rule
- [ ] `03-guides/coding-conventions.md` §数値表示ルール の **正確な articulation 範囲** (DFR-003/004 との接続点)
- [ ] 各 doc に **`## Mechanism Enforcement` section が必要か** を判定 (rule を述べる doc には必須)
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述の **正確な location** + 撤回タイミング (Phase 9 で更新)

### 8.8. 命名規則 / ディレクトリ階層化の整合性 (Phase 4 の入力)

- [ ] `references/01-principles/aag/` ディレクトリ作成時の **既存 ディレクトリ命名規則** との整合性 (他 sub-directory 例: `aag/` に対応する canonical path 表現)
- [ ] **manifest discovery** の更新範囲 (`.claude/manifest.json` の `discovery.byTopic` / `byExpertise` / `pathTriggers` で aag/ ディレクトリ全体を扱う方法)
- [ ] **doc-registry.json の path 変更** が他 guard / tool に与える影響 (例: `docRegistryGuard.test.ts` 等)

### 8.9. 「もう一押し」候補の integrate 判断 (Phase 1 + Phase 8 への影響)

本 plan では下記を **integrate 候補**として articulate するが、実装着手前に最終 integrate 判断:

- [ ] **A. Layer 0-2 schema 化** (`docs/contracts/aag-meta-schema.json`) — drill-down chain を機械操作可能 graph に
- [ ] **B. 5 層 × 縦スライス matrix view** — 既 integrate 済 (§3.1.3)
- [ ] **C. self-hosting 厳密化** (AR-AAG-META-SELF-HOSTING rule + meta-guard で aag/meta.md 自己整合性 hard check)
- [ ] **D. Layer 2-3 境界 (interface layer)** — Layer 2.5 を明示するか、Layer 2 内で sub-category にするか
- [ ] **E. Layer 1 (要件) lifecycle 管理** (`addedAt` / `deprecatedAt` / `sunsetCondition` / `reviewPolicy`)
- [ ] **F. Layer 0 (目的) articulation 最小化** (1 文 statement に集約、anti-bloat)
- [ ] **G. AAG out of scope section** (aag/meta.md §2.3 として境界の明示)
- [ ] **H. CLAUDE.md AAG セクション ≠ AAG Meta** の役割境界明示
- [ ] **I. drill-down chain の Mermaid diagram 自動生成** — 別 project (tool 整備) に分離検討
- [ ] **J. aag/meta.md = Constitution 改訂 procedure 制度化** — 改訂耐性、人間 review trigger 明示

### 8.10. AAG Audit (Layer 4) の home doc 必要性 (PR review #1 反映)

Meta = `aag/meta.md` / Core = 8 doc に明示先がある一方、**AAG Audit (Layer 4) は doc としてどこに住むか** が articulate されていない。Phase 1 着手前に判断:

- [ ] **A. `aag/meta.md` §3 (Core mapping) に audit framework を articulate** + 個別 sub-audit は guard test / health collector / Discovery Review に分散 (現行案)
- [ ] **B. `aag/audit.md` を新規 Create** (Layer 4 overview doc、5 sub-audit 責務境界 + topology を articulate)
- [ ] **C. `aag/architecture.md` 内に Layer 4 章として包含** (新 5 層構造の articulation 内に audit 章)

判断基準: 「境界 (4.1) と方向 (4.2) が overlap した時に判定軸が無くなるか?」「sub-audit 増加時の articulation home が必要か?」B が最も extensible だが doc 数増加。C が最小工数。

### 8.11. 新 5 層 と 既存 AAG 5.1.0 の 4 層 (Constitution/Schema/Execution/Operations) の関係 (PR review #2 反映)

`aag-5-constitution.md` (旧 AAG 5.1.0) は 4 層 (Constitution/Schema/Execution/Operations) を定義済。
本 project の **新 5 層** (目的 / 要件 / 設計 / 実装 / 検証) との **mapping を Phase 3 audit で確定**:

- [ ] 仮 mapping: 目的 = Constitution 上層 / 要件 = Constitution / 設計 = Schema / 実装 = Execution / 検証 = Operations + α — を検証
- [ ] **Layer 4 検証 = 外部監査** が Operations の運用概念とは異なる lens であることを articulate (検証 ⊃ Operations の audit subset、ただし完全一致ではない)
- [ ] mapping table を `aag/architecture.md` (Phase 4 で Create) に landing
- [ ] mapping が Phase 4 doc refactor の前提として確定していること

### 8.12. AR rule articulation draft 生成 protocol (PR review #4 反映)

Phase 6 で 100+ AR rule に `problemAddressed` + `resolutionContribution` を記入する作業量が大きい。
着手前に protocol 確定:

- [ ] 各 rule の `note` / `what` / `why` field から AI 補助で初期 draft 生成 → 人間 review が現実的か検証
- [ ] §8.5 (registry / contract 系の現実 schema 確認) で 抽出経路 articulate
- [ ] 分類 A (自明な既製本) で先に 5-10 rule 程度 manual articulate → protocol 確定
- [ ] §3.4.5 品質基準 (禁止 keyword + 20 文字 minimum + 重複検出) を draft 生成 prompt に embed

### 8.13. CLAUDE.md AAG セクション薄化判断 (PR review #5 反映)

Phase 4 「CLAUDE.md AAG セクション薄化」の deliverable で **何を残し何を逃がすか** の判断基準を明示:

- [ ] **A. 完全 1 link** (`aag/README.md` への索引のみ、3-5 行)
- [ ] **B. 最低限の鉄則 quote + link** (3-5 行の鉄則 [例: 「製本されないものを guard 化しない」「期間 buffer は anti-ritual」「重複と参照を切り分ける」] を inline + 詳細は `aag/meta.md` link)

判断基準: 「AI session 開始時、CLAUDE.md だけ読んで AAG context が最低限維持されるか?」「manifest discovery hint で `aag/` を引けるなら鉄則 quote は冗長か?」

### 8.14. Phase 1 と Phase 3 並行運用の同期 commit 方針 (PR review #6 反映)

Phase 1 (Meta articulation) と Phase 3 (Core audit) は相互参照する cyclic refinement。並行作業の
同期方針を articulate:

- [ ] **A. 同 commit / PR に bundling** (Phase 1 skeleton + Phase 3 audit を 1 PR で完遂)
- [ ] **B. 順序付き** (Phase 1 skeleton landing → Phase 3 audit landing → Phase 1 §3 fill = Core mapping を audit 結果で完成)
- [ ] **C. parallel branches** (Phase 1 / Phase 3 別 branch、最終 merge で同期)

判断基準: B (順序付き) が最も整合性高い。skeleton を先 landing して audit が parallel comparison できる。

### 8.15. 確認・調査の出力先

各調査結果は **対応 Phase の deliverable** に integrated:

| 調査対象 | 出力先 |
|---|---|
| §8.1 doc inventory | `references/02-status/aag-doc-audit-report.md` (Phase 3) |
| §8.2 rule registry schema | `references/02-status/ar-rule-audit.md` (Phase 6) + Phase 2 implementation note |
| §8.3 縦スライス整合性 | `references/02-status/aag-doc-audit-report.md` (Phase 3) |
| §8.4 Layer 3-4 境界 + sub-audit list | `references/02-status/aag-doc-audit-report.md` (Phase 3) + Phase 4 refactor note |
| §8.5 registry / contract / hook | Phase 1 / Phase 4 / Phase 5 の implementation note |
| §8.6 DFR baseline survey | Phase 9 / Phase 10 の implementation note + `architectureRules/defaults.ts` baseline |
| §8.7 Layer 2 doc 状態 | Phase 7 の implementation note |
| §8.8 命名 / ディレクトリ整合性 | Phase 4 の implementation note |
| §8.9 もう一押し候補 | Phase 1 / Phase 8 の implementation 着手前判断 |
| §8.10 AAG Audit home doc | Phase 1 着手前判断 (本 plan に decision 記録) |
| §8.11 新 5 層 ↔ 旧 4 層 mapping | `aag/architecture.md` (Phase 4) + Phase 3 audit |
| §8.12 articulation draft protocol | Phase 6 着手前判断 (本 plan に decision 記録) |
| §8.13 CLAUDE.md 薄化判断 | Phase 4 deliverable note |
| §8.14 Phase 1+3 並行同期 | Phase 1 着手前判断 (推奨 = B 順序付き) |
