# HANDOFF — aag-bidirectional-integrity

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**plan refinement 中（2026-04-29 spawn、2026-04-30 経営階層 drill-down 視点で 0 ベース re-derivation
+ plan/AI_CONTEXT/checklist/legacy-retirement/projectization/config 5 doc を全面 refine）**。
実 execution は次セッション以降。

`phased-content-specs-rollout` 末セッション dialog で発見された **AAG の構造的弱点**
(双方向 integrity 不在 + AAG Meta articulation 不在 + drill-down chain semantic 管理不在) の
根本対策として、本 project が独立 active project で spawn。

### spawn の trigger

`phased-content-specs-rollout` で次の 2 件を撤回した経験:

| 撤回 | 理由（reverse 方向の弱点） |
|---|---|
| visual evidence selection rule (consumer 数 / 365d commits / severity color / optionBuilder) | 製本されていない proxy metric を guard 化していた |
| Phase L spawn (PIPE / QH / PROJ) | spec 化されるべき実 drift / risk が validate されていない状態で spec authoring を guard 化しようとしていた |

これらは AAG rule が製本（canonical doc）に紐付かず、**guard が performative になる構造的余地**
が AAG 自体に内包されていることを示す。

### 設計の核心 (2026-04-30 0 ベース re-derivation)

#### 5 層 drill-down 構造 + 5 縦スライス (AAG architecture pattern)

AAG は **5 層 (横軸) × 5 縦スライス (縦軸)** の matrix で articulate (本プロジェクト本体側
modular monolith evolution と parallel)。経営階層 metaphor (経営理念 → 社訓 → 経営戦略 → 戦術
→ 監査) は横軸の概念伝達 image、正式用語が下表:

**横軸 (5 層 drill-down)**:

| Layer | 用語 | metaphor | 性質 |
|---|---|---|---|
| 0 | **目的** (Purpose) | 経営理念 | AAG の存在意義、人間判断、機械検証不可 |
| 1 | **要件** (Requirements) | 社訓 | 不変条件 + 禁則、機械検証可能 |
| 2 | **設計** (Design) | 経営戦略 | AAG の構造方針 |
| 3 | **実装** (Implementation) | 戦術 | AAG が能動的に行うこと (rule / guard / allowlist) |
| 4 | **検証** (Verification) | 外部監査 | AAG が claim と actual を受動的に照合すること、5 sub-audit に細分 (4.1 境界 / 4.2 方向 / 4.3 波及 / 4.4 完備性 / 4.5 機能性、initial set / extensible、詳細: plan §3.1.5) |

**縦軸 (5 縦スライス、AAG 既存)**: layer-boundary / canonicalization / query-runtime /
responsibility-separation / governance-ops。各セルに「縦スライスの特定層に住む doc / 実装」が
articulate される (詳細: plan §3.1.3 matrix view)。

**3 軸の役割分担**:
- **AAG Meta** = Layer 0 + 1 (`aag/meta.md` を新規 Create で articulate、4 section: 目的 / 要件 / Core mapping / 達成判定総括)
- **AAG Core** = Layer 2 + 3 (設計 doc 群 + 実装 = 8 doc + rule + guard + allowlist)
- **AAG Audit** = Layer 4 (外部監査視点で AAG 全体を audit、health-rules / Discovery Review / meta-guard / certificate)
- AAG Meta は **目的 (= 評価基準を規定する側)**、AAG Core は **対象 (= 評価される側)**、AAG Audit は **第三者監査 (= claim と actual を照合)**

#### 破壊的変更前提

本 project は AAG の根本的整理を行うため、**追加コスト / 変更コストを考慮せず必要な変更を遂行**:
既存 AR-NNN rule の振る舞い変更 / 縦スライス境界 reshape / 4 層構造の調整 / AAG framework 構造変更
等を許容 (本体アプリの機能変更 + parent project archive 干渉は依然として禁止)。Phase 3 audit で
breaking change を identify、Phase 4-6 で順次実施。

#### drill-down chain の semantic management

各層間の binding は **重複と参照の切り分け** + **semantic articulation**:

- **重複** (上位 content の copy) は禁止
- **参照** は pointer + `problemAddressed` (上位の何を課題として) + `resolutionContribution` (何を解決) を mandate
- AR-rule schema (Phase 2 拡張): `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 構造で追加
- meta-guard (Phase 8) が articulation field の non-empty を機械検証

#### doc operation taxonomy

AAG Core 8 doc の整理は 7 operation で articulate (Create / Split / Merge / Rename / Relocate /
Rewrite / Archive)。**新規書き起こし優先** (edit-in-place 禁止)、操作順序原則に従い段階実行。
**期間 buffer (日数 / commits 数) を一切使わず inbound 0 trigger** のみで物理削除。

#### ディレクトリ階層化

`references/01-principles/aag/` 集約で関係性を visual articulate。`aag-5-` / `adaptive-` prefix 撤廃。

### 本 project の特徴

- **scope 内に 5 つの concrete deliverable**:
  1. **AAG Meta doc (`aag/meta.md`) の新規 Create** (Phase 1) — Layer 0+1 を articulate する単一エントリ doc、要件定義 + audit framework + AR-rule binding hub の 3 機能融合 mechanism doc
  2. **AAG Core 8 doc の content refactoring** (Phase 3 + 4) — 4 層位置付け + 責務再定義 + drill-down semantic articulation + 階層化、新規書き起こし → 旧 doc 退役の段階パス
  3. **legacy 撤退** (Phase 5、inbound 0 trigger、期間 buffer なし)
  4. **forward / reverse meta-guard** (Phase 8、双方向 integrity + semantic articulation 検証の機械強制)
  5. **新規製本創出 (display-rule registry を含む)** (Phase 9) + DFR guards (Phase 10)
- **parent: なし** (`phased-content-specs-rollout` は独立に archive 進行)
- Level 3 / governance-hardening / requiresHumanApproval=true / **requiresLegacyRetirement=true**

## 2. 次にやること

> **状態 (2026-04-30 plan refinement 完了)**: plan / AI_CONTEXT / checklist / legacy-retirement /
> projectization は経営階層 drill-down 視点で全面 refine 済、実 execution は次セッション以降。
> 計画段階の判断:
> - 4 層 drill-down (目的 / 要件 / 設計 / 実装) を北極星に据え、AAG Meta = 目的、AAG Core = 対象 として位置付ける
> - AAG Core 8 doc は 4 層位置付け + 責務再定義 + drill-down semantic articulation で再構築 (Phase 3 audit + Phase 4 refactor)
> - 新規書き起こし優先 (edit-in-place 禁止)、ディレクトリ階層化 (`aag/`)、命名規則刷新
> - drill-down chain は重複と参照の切り分け + semantic articulation (problemAddressed + resolutionContribution) で機械管理
> - inbound 0 trigger のみ (期間 buffer なし、anti-ritual)
> - display-rule registry (DFR-NNN) は Phase 9 の最初の concrete instance として吸収
> - **Phase 1 と Phase 3 は並行 refine 可能** (Meta skeleton と Core audit が相互参照、最終確定は両者完了後)

### Phase 1: AAG Meta doc (`aag/meta.md`) の新規創出 (Layer 0+1)

- [ ] `references/01-principles/aag/meta.md` を新規 Create (4 section 構造):
  - §1 目的 (Purpose、Layer 0、1-2 段落、変わらない核心)
  - §2 要件 (Requirements、Layer 1、不変条件 + 禁則 table、各行に enforcing AR-rule + state-based 達成条件 + 達成 status)
  - §3 AAG Core 構成要素 mapping (Layer 2 doc + Layer 3 実装、4 層位置付け + 各 doc / 実装の forward pointer)
  - §4 達成判定総括 (全要件の達成度サマリ + 不達成項目の解消責務)
- [ ] `references/01-principles/aag/README.md` を新規 Create (aag/ ディレクトリ index、CLAUDE.md からの 1 link entry)
- [ ] `docs/contracts/doc-registry.json` に新 doc 登録
- [ ] CLAUDE.md AAG セクションに 1 行索引 link 追加 (詳細薄化は Phase 4)
- [ ] charter 人間 review (Constitution 改訂と同等の慎重さ)

### Phase 2: AAG rule metadata 拡張 (semantic articulation 構造)

- [ ] `architectureRules/defaults.ts` schema 拡張:
  - `canonicalDocRef: Array<{ docPath, problemAddressed, resolutionContribution }>` (実装 → 設計 doc binding)
  - `metaRequirementRefs: Array<{ requirementId, problemAddressed, resolutionContribution }>` (実装 → 要件 binding)
- [ ] `guardCategoryMap.ts` の対応 field を追加 (または schema 統合)
- [ ] 既存全 AR-NNN rule に `canonicalDocRef: []` + `metaRequirementRefs: []` 空 array で初期化
- [ ] TypeScript 型定義の整合 (build / lint PASS)

### Phase 3: AAG Core doc audit (4 層位置付け + 責務 + drill-down semantic + operation 判定)

各 AAG 関連 doc に対して:

- [ ] **4 層位置付け** (Layer 0/1/2/3/境界 のどれか)
- [ ] **責務** (1 doc 1 責務、C1 適用)
- [ ] **書くべきこと (write list)** + **書かないこと (non-write list)**
- [ ] **drill-down pointer** (上位 back-pointer + 下位 drill-down)
- [ ] **必要 operation** (Create / Split / Merge / Rename / Relocate / Rewrite / Archive のどれか、複数可)
- [ ] **影響範囲 inventory** (inbound link 数 / 索引 / registry / guard binding)
- [ ] **migration order** (operation 間の依存 + commit 順序)

追加 deliverable:
- [ ] AR-rule canonization mapping (人間語 → AR rule ID 候補)
- [ ] gap 識別 / redundancy 識別 / staleness 識別
- [ ] audit 結果を `references/02-status/aag-doc-audit-report.md` に集約

### Phase 4: AAG Core doc content refactoring (新規書き起こし優先)

operation 順序:

- [ ] **Create 段階**: 新 path に新 doc を直接 Create (`aag/strategy.md` / `aag/architecture.md` / `aag/evolution.md` / `aag/layer-map.md` / `aag/source-of-truth.md` / `aag/operational-classification.md`)
- [ ] **Split / Merge / Rewrite 段階**: 旧 doc から内容を選別して新 doc に書き起こし、4 層位置付け + drill-down pointer + semantic articulation を装着
- [ ] **CLAUDE.md AAG セクション薄化**: 「AAG を背景にした思考」の core を `aag/meta.md` に逃がし、CLAUDE.md は `aag/README.md` への 1 link 索引のみに
- [ ] **doc-registry.json + principles.json + manifest.json** 更新 (新 doc 登録、旧 doc は deprecation marker 段階)
- [ ] 各 operation 独立 commit、parallel comparison 期間を確保 (旧 doc remain 状態で新 doc が validate される)

### Phase 5: legacy 撤退 (旧 doc archive、inbound 0 trigger)

- [ ] `legacy-retirement.md` を実値で update
- [ ] 各旧 doc の **inbound 0 機械検証** (旧 path への参照を全 doc / 全 registry / 全 guard binding で grep)
- [ ] inbound 0 確認した旧 doc を `references/99-archive/` に移管 (migrationRecipe + 履歴付き)
- [ ] 99-archive 配下の旧 doc に対する inbound も 0 になった file は物理削除 (即時、buffer なし)
- [ ] doc-registry.json + principles.json + manifest.json の reflect

### Phase 6: 既存 AR-NNN rule の audit + binding

- [ ] Phase 3 mapping を input に既存 100+ AR-NNN rule を A/B/C/D 4 分類で audit
- [ ] 分類 A の `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 付きで即時記入
- [ ] 分類 D の sunset trigger を確定
- [ ] 分類 B/C は後続 sprint で漸次対応する旨を HANDOFF に明示
- [ ] audit 結果を `references/02-status/ar-rule-audit.md` に記録

### Phase 7: Layer 2 doc に back link section + drill-down semantic 装着

- [ ] `04-design-system/docs/` 関連 doc に `## Mechanism Enforcement` section を追加
- [ ] `01-principles/` 関連 doc (rule 定義系) に同 section を追加
- [ ] `03-guides/` 関連 doc (数値表示ルール / coding-conventions 等) に同 section を追加
- [ ] 各 section の各 entry は **3 要素を保持**: AR rule ID + 要件 ID + architect 寄与 articulation

### Phase 8: forward / reverse meta-guard 実装 (semantic articulation 検証)

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse): 各 AR rule の `canonicalDocRef` の各 entry について docPath 実在 + rule ID 出現 + articulation non-empty
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward): canonical doc の Mechanism Enforcement section の各 entry について AR ID + 要件 ID + articulation non-empty
- [ ] (option) `metaRequirementBindingGuard.test.ts`: Layer 1 ↔ Layer 3 binding 検証
- [ ] 例外 allowlist の baseline を機械管理 (ratchet-down のみ、増加禁止)
- [ ] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認

### Phase 9: DFR registry (Layer 2 新規製本)

- [ ] `references/01-principles/aag/display-rule-registry.md` を新設
- [ ] DFR-001 chart semantic color を rule entry として登録 (Layer 1 source link / Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe / metaRequirementRefs semantic 付き)
- [ ] DFR-002 axis formatter via useAxisFormatter を登録
- [ ] DFR-003 percent via formatPercent を登録
- [ ] DFR-004 currency via formatCurrency を登録 (thousands separator 明文化)
- [ ] DFR-005 icon via pageRegistry / emoji canonical を登録
- [ ] Phase 3 で gap 判定された他 rule に対する新規 doc (anti-bloat 適用)
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新

### Phase 10: 表示 rule guards 実装

- [ ] `displayRuleGuard.test.ts` を rule registry framework として新設
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録 (semantic articulation 付き)
- [ ] DFR-001 baseline 確定 (CHART-004 / CHART-005 の semantic 不使用)
- [ ] DFR-002 baseline 確定 (FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び)
- [ ] DFR-003 baseline 確定 (BudgetTrend / Seasonal 等の `Math.round(v * 100)`)
- [ ] DFR-004 / DFR-005 baseline 確定 (survey 結果から)
- [ ] 各 rule の migrationRecipe を記入
- [ ] Phase 8 reverse meta-guard が DFR-001〜005 全てに対して PASS (双方向 integrity 成立)

### 最終 review + archive 承認

- [ ] 全 Phase (1〜10) の成果物を人間がレビュー → archive プロセスへ移行承認

## 3. ハマりポイント

### 3.1. AAG Meta は包括概念であり、既存 doc と同じ平面で重複しない

ユーザー指摘 (2026-04-30): AAG Meta は **目的 (Layer 0+1)** を articulate する mechanism doc で、
AAG Core (Layer 2+3) は **対象 (評価される側)**。重複ではなく階層が違う。

aag/meta.md は **要件定義 + audit framework + AR-rule binding hub** の 3 機能融合 doc。前回案
の 7 section charter (identity / goals / limits / invariants / non-goals / boundaries / 他 doc 境界)
ではなく、**4 section** (§1 目的 / §2 要件 / §3 Core mapping / §4 達成判定総括) で薄く articulate
し、内容は AAG Core 側 doc を pointer 引用する。

### 3.2. AAG Core 既存 doc の edit-in-place 禁止 (新規書き起こし優先)

ユーザー指摘 (2026-04-30): edit-in-place で書き換えるのではなく、**新規書き起こし** で旧 doc を
退役パスに乗せる。理由は:

- parallel comparison が可能 (旧 doc remain の状態で新 doc が validate される)
- archive 移管が clean (旧 doc を 99-archive に移すだけ)
- inbound reference の migration を段階的に実施できる

operation 順序原則 (§3.5 plan): Create 先行 → Split / Merge / Rewrite 中段 → Rename / Relocate /
Archive 後段。各 operation 独立 commit。

### 3.3. 重複と参照の切り分け + drill-down chain の semantic management

ユーザー指摘 (2026-04-30): drill-down chain は単なる pointer graph ではなく **semantic chain**。

- **重複 (上位 content の copy) は禁止**
- **参照は pointer + `problemAddressed` + `resolutionContribution` を必須**
- AR-rule schema (Phase 2 拡張) は `canonicalDocRef` + `metaRequirementRefs` を semantic articulation 構造で持つ
- meta-guard (Phase 8) が articulation field の non-empty を機械検証

各 doc の write list / non-write list (§3.6 plan) はこの切り分けに従う。

### 3.4. ディレクトリ階層化 + 命名規則刷新

ユーザー指摘 (2026-04-30): `references/01-principles/aag/` 集約で関係性を visual articulate。
`aag-5-` / `adaptive-` prefix は撤廃 (ディレクトリで階層性が表現されるため、prefix 不要)。

仮 path (Phase 3 audit で確定):
- `aag/meta.md` (Layer 0+1、新規 Create)
- `aag/strategy.md` (旧 adaptive-architecture-governance.md core を Split + Rewrite)
- `aag/architecture.md` (旧 aag-5-constitution.md を Rewrite + Relocate + Rename)
- `aag/evolution.md` (旧 adaptive-governance-evolution.md を Rewrite + Relocate + Rename)
- `aag/operational-classification.md` / `aag/source-of-truth.md` / `aag/layer-map.md` (Rewrite + Relocate)
- `aag/display-rule-registry.md` (Phase 9 で新規 Create)
- `aag/README.md` (aag/ ディレクトリ index)

### 3.5. 期間 buffer 不使用 (anti-ritual)

ユーザー指摘 (2026-04-30): **30 commits 連続 / 30 日経過 等の期間縛りは儀式の再生産**。物理削除
trigger は「**参照場所が 0 になった瞬間**」(inbound 0 機械検証) のみ。

- archive 移管 = 旧 path への inbound 0 + migrationRecipe 完備
- 物理削除 = archive 配下 file への inbound 0 (99-archive 内 reference も all clear)
- buffer 期間は安全に見えて発火条件に触れずに見落とす risk が残る、禁止

### 3.6. Phase 1 と Phase 3 は並行 refine 可能 (cyclic refinement)

aag/meta.md skeleton (Phase 1) と AAG Core doc audit (Phase 3) は相互参照で refine。Meta が
audit 結果を反映して update する cyclic refinement。最終確定は Phase 3 + Phase 4 完了後 (新
Core doc の path / 責務が確定したタイミング)。

### 3.7. 既存 100+ AR rule の audit は ratchet-down で漸次対応

Phase 6 で全 rule を一気に分類しようとすると Level 3 project が膨張。次の戦略:

- **新 rule 追加時のみ `canonicalDocRef` + `metaRequirementRefs` 必須化** を Phase 8 meta-guard で hard fail
- 既存 rule は baseline で許容 (空 array でも違反なし)
- Phase 6 では分類 A (自明な既製本) のみ即時 binding、B/C/D は後続 sprint で漸次対応

### 3.8. display rule (DFR) は Phase 9 まで開けない (循環 fail 防止)

dialog で観測された drift (CHART-004 semantic.customers 不使用 等) を即修正したくなるが、
**meta-rule (Phase 8) が landing する前に DFR rule を guard 化すると Phase 8 meta-guard で循環的
に hard fail する**。順序遵守: Meta articulation → audit → refactor → cleaning → rule binding →
back link → meta-guard → DFR registry → DFR guards。

### 3.9. parent project (phased-content-specs-rollout) の archive process と独立

本 project の spawn は parent project の archive を妨げない。parent は人間 review + archive
承認 gate のみで進行。本 project の Phase 進捗は parent の status に影響しない設計。

### 3.10. content-and-voice.md の "not enforced" 記述

`04-design-system/docs/content-and-voice.md` に「thousands-separator convention is not
enforced」と明記されている。Phase 9 で DFR-004 を登録する際、この記述を **撤回** する
必要がある (「明文化されていない事実の記述」→「明文化された rule への back link」)。

### 3.11. 要件 (Layer 1) の例外 — 純粋 mechanism rule の境界

「製本されていない rule = performative」と単純化すると、純粋に mechanism として動作する rule
(例: `AR-G3-SUPPRESS-RATIONALE` のような suppress directive 規律) が誤って撤回判定される。
aag/meta.md §2 で **例外カテゴリ** を明示、Phase 8 meta-guard では allowlist で扱う。

### 3.12. Layer 0 (目的) は機械検証不可能

Layer 0 (経営理念に対応する目的) は **why の正本** だが機械検証不可能。aag/meta.md §1 で薄く
articulate し、人間 review でのみ変更。Layer 1 (要件) 以下が state-based 判定で機械検証成立。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / read order |
| **`plan.md`** | **canonical 計画 doc — Phase 1〜10、§3.4 semantic management 必読** |
| `checklist.md` | Phase 1〜10 completion 条件 |
| `legacy-retirement.md` | Phase 5 sunset / archive / migrationRecipe (inbound 0 trigger、requiresLegacyRetirement=true) |
| `projectization.md` | AAG-COA 判定 (Level 3 / governance-hardening) |
| `config/project.json` | project manifest (`status: "active"` / parent なし) |
| `aag/execution-overlay.ts` | rule overlay (initial 空) |
| `references/01-principles/adaptive-architecture-governance.md` | 旧 AAG マスター (Phase 4 で Split + Rewrite + Relocate) |
| `references/01-principles/aag-5-constitution.md` | 旧 4 層構造定義 (Phase 4 で Rewrite + Relocate + Rename) |
| `references/01-principles/adaptive-governance-evolution.md` | 旧進化動学 (Phase 4 で Rewrite + Relocate + Rename) |
| `projects/phased-content-specs-rollout/HANDOFF.md` | parent dialog の経緯 |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 Layer 2 製本 |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 Layer 2 製本 |
| `references/03-guides/coding-conventions.md` | DFR-003/004 Layer 2 製本 |
| `references/04-design-system/docs/iconography.md` | DFR-005 Layer 2 製本 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
