# plan — aag-platformization

> **Supreme principle (唯一の禁則)**: AAG を「あるべき」で終わらさず、**observable に機能** させる。
> articulation without functioning は本 program の最大の violation (`references/01-principles/aag/strategy.md` §2.1「抽象化の過剰」AI 本質的弱点)。
>
> **本フェーズの位置づけ**: 「Go 移行を前に進める」ではなく、**「Go 実装を前に進める条件を固定する」**。Go 移行を止める必要はないが、TS の揺れ (merge policy 等) を未解決のまま Go に持ち込むと **二度手間** になる。条件を固定してから Go 実装に入る。

---

## §1 不可侵原則

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 既存 AAG の振る舞いと思想を変えない (矛盾・潜在バグの修復は例外、DA entry に articulate 必須) | revert + redesign |
| 2 | 既存 9 integrity guard / 12 AAG-REQ を緩和しない (ratchet-down のみ許容) | revert |
| 3 | 派生 artifact を手編集しない (canonical → derived の一方向) | revert |
| 4 | 全 deliverable は **5 軸 design articulation** を持つ (製本 / 依存方向 / 意味 / 責務 / 境界) | scope 外 |
| 5 | 全 deliverable は **observable verification** を持つ。observation なき articulation は scope 外 | scope 外 |
| 6 | 判断は AI-driven、人間承認は archive 1 点のみ。各判断は `decision-audit.md` + commit lineage | scope 外 |
| 7 | **Phase 9 (Go 実装) は Phase 1-5 の Go 実装条件 (4 件) が全 met してからのみ着手**。条件未達で Go 着手は二度手間を招く | Phase 9 着手 block |

---

## §2 AAG が functioning している状態 (F1〜F7)

supreme principle の operational 形。**F1〜F7 が同時 observable な状態** が完了形。

| # | functioning | observation 方法 |
|---|---|---|
| **F1** | AI が **必要 context だけ** 取得し、無関係 context が surface しない | tool call precision |
| **F2** | AI が **意味のある info に素早く reach** できる | tool call 数 / time-to-meaningful-context |
| **F3** | doc / 実装 / rule の **drift が機械検出** される | guard の hard fail Y/N |
| **F4** | session 間で **判断履歴が継承** され、再 derivation 不要 | DA entry の re-build 必要性 |
| **F5** | 各 deliverable が **5 軸で grounded** されている | 5 軸 articulation 存在 + 整合 |
| **F6** | 新概念追加が **5 軸 review** を経る | review block / pass の Y/N |
| **F7** | 負債が滞留せず **ratchet-down** で減る | inbound 0 + archive 機能 |

---

## §3 Go 実装条件 (4 件、Phase 9 着手前提)

| # | 条件 | 該当 Phase | 充足判定 |
|---|---|---|---|
| C1 | **merge policy が一本化されている** | Phase 2 | bootstrap で空 overlay が動く + 三重定義 `RuleExecutionOverlayEntry` 解消 + merged.ts で resolvedBy 追跡 |
| C2 | **merged artifact が生成されている** | Phase 3 | `docs/generated/aag/merged-architecture-rules.<format>` 生成 + sync guard active |
| C3 | **AagResponse / detector result の contract が独立している** | Phase 4 | helper 駆動 → schema 駆動切替 + sync guard active |
| C4 | **RuleBinding の境界が guard 化されている** | Phase 5 | `ruleBindingBoundaryGuard.test.ts` active + 違反 hard fail |

**4 条件全 met → Phase 9 (Go 実装) 着手可**。1 つでも未達なら Phase 9 は block。

---

## §4 5 軸 design articulation (lens)

全 deliverable / 既存 audit / restructure 判断は以下を articulate:

| 軸 | 既存 articulate 場所 | 本 program での適用 |
|---|---|---|
| **製本** | `aag/source-of-truth.md` | canonical / derived / 何が 1 次正本か |
| **依存方向** | `aag/architecture.md` (5-layer drill-down) + `AAG-REQ-LAYER-SEPARATION` | 何 → 何、一方向か |
| **意味** | `aag/meta.md` (AAG-REQ-* + each rule's `what` / `why`) | 答える 1 問い |
| **責務** | `aag/strategy.md` §1.1.3「1 doc 1 責務」(C1) | single responsibility |
| **境界** | `aag/layer-map.md` + `aag/core/principles/core-boundary-policy.md` | 何の内 / 外 |

新概念追加は 5 軸を articulate してから build。既存 audit は 5 軸を lens に使う。

---

## §5 Phase 構造 (3 segment)

### Segment A: Pre-Go 条件確立 (Phase 1-5)

Go 実装に進む前に固定すべき構造。**Phase 9 着手の前提**。

#### Phase 0: Bootstrap (本 commit で完了)

`projects/_template` から複写 + 必須セット 6 ファイル + DA-α-000 (進行モデル) landing 済。

#### Phase 1: Authority 固定 + 5 軸 framework

**目的**: 何が正本かを固定 + 5 軸 articulate を全後続 deliverable に要件化。

**やること**:
- 各 layer の正本を articulate (既存 doc に back-link、新 doc 作らず):
  - **Core meaning** の正本: `aag-core-types.ts` の 4 type (RuleSemantics / Governance / OperationalState / DetectionSpec)
  - **App Profile** の正本: `architectureRules/types.ts` の RuleBinding + PrincipleId
  - **Project Overlay** の正本: `projects/<id>/aag/execution-overlay.ts`
  - **Derived result** の正本: `architectureRules/merged.ts` (Phase 3 で artifact 化)
- 既存 5 軸 articulate (source-of-truth / architecture / meta / strategy / layer-map) に gap 0 か verify
- DA entry テンプレに 5 軸 articulate 欄追加 (本 commit で済)

**5 軸 articulate** (本 Phase 自身):
- 製本: 既存 articulate を verify、本 Phase は articulate しない
- 依存方向: 既存 doc → 本 plan/decision-audit (一方向参照)
- 意味: 「正本構造を可視化 + 5 軸 lens を運用化」
- 責務: 確認 + framework 化のみ。新規 doc 作成しない
- 境界: 確認範囲は AAG core docs + 本 program 内

**観測**:
- 全 deliverable が 5 軸 articulate を持つ Y/N
- 4 layer の正本 articulate に曖昧 0 件 Y/N

**不機能時 rollback**: doc 編集のみ、git revert で復帰。

#### Phase 2: Merge policy 一本化 (= Go 条件 C1)

**目的**: bootstrap 破綻 (空 overlay → throw) + `RuleExecutionOverlayEntry` 三重定義を解消。`merged.ts` の merge policy を一本化。

**user 推奨採用案**:
- 当面: **defaults 補完を許す** (現状 merged.ts 実装と整合)
- ただし: merge result に **`resolvedBy`** field を追加 (project-overlay / defaults / stub の 3 値)
- 長期: overlay 明示率 100% を目標 (本 program scope 外、後続 program へ)

**やること**:
- `RuleExecutionOverlayEntry` を `aag-core-types.ts` に集約 (現 _template / pure-calculation-reorg / aag-platformization の 3 重定義)
- 各 project overlay の type import を集約版に切替
- `merged.ts` の merge result に `resolvedBy` field 追加
- 各 overlay file の冒頭 comment を採用案に揃える (特に `pure-calculation-reorg` の "default 補完しない" comment は stale)
- `references/03-guides/new-project-bootstrap-guide.md` Step 4 を採用案に整合
- 採用案 + 三重定義解消の根拠を `decision-audit.md` DA-α-002 に articulate

**5 軸 articulate**:
- 製本: `aag-core-types.ts` を `RuleExecutionOverlayEntry` の唯一正本に固定
- 依存方向: aag-core-types.ts → architectureRules/types.ts → 各 project overlay (一方向、逆 import 禁止)
- 意味: 「project overlay は何を必須提供し、何が defaults から補完されるか」
- 責務: type 集約 + merge policy + resolvedBy 追跡 (各々 single responsibility)
- 境界: type 集約 = Core / merge logic = App Domain / overlay = Project Overlay

**観測**:
- 空 `EXECUTION_OVERLAY = {}` で `merged.ts` が throw しない Y/N
- `pure-calculation-reorg` 既存 merge 結果が変わらない (golden test) Y/N
- `resolvedBy` field が全 rule で正しく articulate される Y/N

**不機能時 rollback**: revert + DA-α-002 軌道修正。

#### Phase 3: Merged artifact 生成 (= Go 条件 C2)

**目的**: runtime merge を build artifact に変える。Go 実装が「再設計」ではなく「実行基盤置換」になる前提。

**やること**:
- `tools/architecture-health/src/aag/merge-artifact-generator.ts` 新設
- `docs/generated/aag/merged-architecture-rules.<format>` 生成 (全 rule の merge 結果 + 各 field の `resolvedBy`)
- `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` 新設 (artifact ↔ runtime merge の byte-identity 検証)
- `npm run docs:generate` から呼び出し
- `format` 採用は DA-α-003 (JSON / CUE / YAML / TOML 等から AI 判断)

**5 軸 articulate**:
- 製本: 派生 (canonical = base-rules.ts + merged.ts logic)
- 依存方向: canonical → generator → artifact (一方向)
- 意味: 「merge 結果が build 時点で何だったか」
- 責務: merge 結果の materialize のみ
- 境界: 派生層、authoring 編集禁止 (sync guard で hard fail)

**観測**:
- artifact 生成可 Y/N
- runtime merge と byte-identical Y/N
- 試験 drift で sync guard hard fail Y/N

**不機能時 rollback**: artifact 削除 + revert。

#### Phase 4: Contract independence (= Go 条件 C3)

**目的**: AagResponse + detector result を helper 駆動から schema 駆動に切り替え、言語非依存の contract として独立。

**やること**:
- `docs/contracts/aag/aag-response.<format>` 新設 (Phase 3 採用 format に準拠)
- `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema からの型生成に切替
- helpers.ts は schema-backed re-export のみ (既存 `aagResponseFeedbackUnificationGuard` 維持)
- `docs/contracts/aag/detector-result.<format>` 新設 (ruleId / detectionType / sourceFile / evidence / actual / baseline / severity / messageSeed)
- 既存 guard の violation message 構築箇所を schema 準拠に揃える (最小スコープ、全 detector 統合は後続)
- sync guard 1 本: contract schema ↔ TS 型

**5 軸 articulate**:
- 製本: schema を 1 次正本 (TS 型は schema から生成)
- 依存方向: schema → codegen → TS 型 (一方向)
- 意味: AagResponse = 「AI への通知 contract」、detector-result = 「検出結果 contract」
- 責務: 各 contract に single responsibility
- 境界: contract 層、renderer / detector 実装とは boundary 異なる

**観測**:
- schema validation が AagResponse / detector output を通す Y/N
- 既存 text renderer 出力が schema 化前と byte-identical (golden test) Y/N
- 既存 `aagResponseFeedbackUnificationGuard` が引き続き機能 Y/N

**不機能時 rollback**: schema 削除 + revert。

#### Phase 5: RuleBinding 境界 guard (= Go 条件 C4)

**目的**: `RuleBinding` に意味系 field (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) が漏れないことを機械保証。

**やること**:
- `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` 新設
- 許可 5 field: doc / correctPattern / outdatedPattern / canonicalDocRef / metaRequirementRefs
- 禁止: 上記 7 field + 任意の `detection*` / `governance*` / `operationalState*` プレフィックス
- policy 内容は `architectureRules/types.ts` の RuleBinding interface コメント (現状 articulate 済) に back-link、新 doc 作らず

**5 軸 articulate**:
- 製本: `architectureRules/types.ts` の `RuleBinding` interface が 1 次正本
- 依存方向: aag-core-types.ts (Core 4 type) → architectureRules/types.ts (RuleBinding) (一方向)
- 意味: 「RuleBinding は app-specific concrete binding に限定される」
- 責務: 境界の機械保証のみ
- 境界: App Domain 層、Core / Project Overlay / Derived とは boundary 明示

**観測**:
- 違反コードを試験的に書くと guard hard fail Y/N
- 既存 RuleBinding (5 field のみ) は通る Y/N

**不機能時 rollback**: guard 削除 + revert。

---

### Segment B: AI Navigation + Audit (Phase 6-7)

Pre-Go 条件と並列で進めても良い、AI access enhancement と既存負債削減。

#### Phase 6: AI Navigation enhancements

**目的**: F1 (必要 context のみ) + F2 (素早く reach) を supports する drawer / 引き出し機構の追加。

**やること**:
- `docs/generated/aag/rules-by-path.<format>` (path prefix → AR-rule id 配列)
- `docs/generated/aag/rule-index.<format>` (軽量 index)
- `docs/generated/aag/rule-detail/<id>.<format>` (個別 rule on-demand)
- `docs/generated/aag/rule-by-topic.<format>` (manifest.json discovery 拡張)
- 各 sync guard

**5 軸 articulate**: 全 派生、canonical = base-rules.ts、一方向、各々 single responsibility (path / index / detail / topic)、派生層境界

**観測**:
- AI が `merged.ts` 編集 task で関連 rule subset に 1 read で reach Y/N
- 不要な context が surface しない Y/N
- guard 違反時に AI が rule-detail へ N step 以下で reach Y/N

**不機能時 rollback**: artifact 削除 + revert。

#### Phase 7: 5 軸 audit (既存 AAG + 本 project)

**目的**: F5 (grounded) + F7 (負債 ratchet-down)。

**やること**:
- CLAUDE.md / `aag/*` / `references/01-principles/aag/*` を 5 軸 audit
- 本 project (`aag-platformization`) を自己 audit (reframe 跡 articulate を含む)
- 違反箇所を分類: 製本重複 / 依存逆 / 責務集合 / 境界曖昧 / 意味曖昧
- per-violation で restructure 判断 (DA-α-007)
- 採用された restructure 実施 (新 doc 増設禁止、既存 doc 拡張のみ)

**観測**: 違反検出件数 / 解消件数 / 本 project 内 articulation 削減量

---

### Segment C: Verification + Implementation (Phase 8-10)

#### Phase 8: Simulation + 機能 verify

**目的**: F1〜F7 の comprehensive verification。**本 session 内 / state-based / scenario-driven** (calendar 観測なし、`AAG-REQ-NO-DATE-RITUAL` 整合)。

**Control Test Scenarios**:

| # | scenario | 関連 F |
|---|---|---|
| CT1 | path-triggered rule access (Phase 6 effect) | F1 |
| CT2 | irrelevant context surface しない (negative) | F1 |
| CT3 | rule detail rapid lookup (Phase 6 effect) | F2 |
| CT4 | topic discovery (Phase 6 effect) | F1 / F2 |
| CT5 | 試験 drift で sync guard hard fail (Phase 2-6 effect) | F3 |
| CT6 | session 間判断継承 (decision-audit re-derive 不要) | F4 |
| CT7 | 5 軸 articulate なき deliverable は review block (Phase 1 effect) | F5 / F6 |
| CT8 | merged artifact が runtime merge と byte-identical (Phase 3 effect) | F3 / Go 条件 C2 |
| CT9 | AagResponse + detector schema validation 通過 (Phase 4 effect) | Go 条件 C3 |
| CT10 | RuleBinding 違反 hard fail (Phase 5 effect) | Go 条件 C4 |

**観測** = simulation 結果が DA-α-008 entry の observation table に landing。

#### Phase 9: Go 実装 (conditional on Go 条件 C1-C4 全 met)

**目的**: 4 条件 (C1 merge policy unified / C2 merged artifact / C3 contract independent / C4 RuleBinding bounded) が全 met したら Go 実装に着手。

**着手 gate** (本 Phase は条件未達なら block):
- [ ] DA-α-002 振り返りが "正しい" (C1 met)
- [ ] DA-α-003 振り返りが "正しい" (C2 met)
- [ ] DA-α-004 振り返りが "正しい" (C3 met)
- [ ] DA-α-005 振り返りが "正しい" (C4 met)

**やること** (gate 通過後):
- 言語選定 (DA-α-009): **Go / Python / combo OK、Rust 除外** (本体 WASM/Rust と境界混線、AI が Rust を強く推奨する場合は人間確認 escalation)
- `tools/aag-{lang}/` 新設 (採用言語に応じて)
- 最小 PoC: validate (schema validation) + merge (defaults + project overlay merge、TS と byte-identical)
- CI に組み込まない (本 cutover は後続 program)

**観測**: PoC が手動実行で TS と同一結果を返す Y/N

**不機能時 rollback**: PoC 削除 + revert。

#### Phase 10: Archive + 後続 program charter

**目的**: 本 program 完了 + 後続 program への引き継ぎ。

**やること**:
- 不機能と判明した deliverable の revert
- Phase 7 audit で identify された負債の削減実施
- 後続 program (もし必要なら) charter を 1 doc で articulate (新規 doc or 既存 doc 拡張、判断は DA-α-010)
- `references/02-status/recent-changes.md` に本 program のサマリ追加
- archive 移行 (人間承認 = 唯一の人間 mandatory 点)

---

## §6 Decision Audit + 観測 protocol

詳細: `decision-audit.md`。各 Phase 着手時に DA entry (判断時 + 5 軸 articulate + commit lineage + 振り返り観測点) を landing、Phase 完了時に振り返り observation 実測。

主要 DA entry:

| ID | Phase | 判断対象 |
|---|---|---|
| DA-α-001 | Phase 1 | Authority 固定 + 5 軸 framework operational 化方針 |
| DA-α-002 | Phase 2 | Merge policy 採用案 (defaults 補完 + resolvedBy + 三重定義解消) |
| DA-α-003 | Phase 3 | merged artifact format 選定 + sync guard 設計 |
| DA-α-004 | Phase 4 | AagResponse + detector schema 化方針 |
| DA-α-005 | Phase 5 | RuleBinding boundary guard 設計 |
| DA-α-006 | Phase 6 | drawer artifact 群 granularity / 配置 |
| DA-α-007 | Phase 7 | 5 軸 audit per-violation restructure 判断 |
| DA-α-008 | Phase 8 | simulation 結果総括 + F1-F7 status |
| DA-α-009 | Phase 9 | Go 実装条件 met 確認 + 言語選定 (Rust 除外) |
| DA-α-010 | Phase 10 | archive / 後続 program charter 必要性 |

---

## §7 やってはいけないこと

| 禁止事項 | なぜ |
|---|---|
| Phase 1-5 (Go 条件 C1-C4) 未達で Phase 9 (Go 実装) を着手 | TS の揺れを Go に持ち込み二度手間 |
| 既存 AAG 振る舞い変更 (rule semantics / merge 結果 / response 出力 / detector message) | 不可侵原則 1 |
| 既存 9 integrity guard / 12 AAG-REQ の baseline 緩和 | 不可侵原則 2 |
| 派生 artifact 手編集 | 不可侵原則 3 |
| 5 軸 articulate なき deliverable 追加 | 不可侵原則 4 |
| observable verification なき articulation | 不可侵原則 5 + supreme principle |
| 単一 commit で 2 Phase 以上をまとめる | Phase 境界での観測ができなくなる |
| `base-rules.ts` (10,805 行) の TS authoring を JSON 化 | authoring 価値を毀損 |
| 新 doc を増やす (gap fill は既存 doc 拡張) | `strategy.md` §1.1「正本を増やさない」整合 |
| Rust を本 program runtime に使う | 本体 WASM/Rust と境界混線、AI 強推奨時は人間確認 escalation |

---

## §8 関連実装

### 触らない (既存資産は維持)

| パス | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` (10,805 行) | TS authoring canonical |
| `app/src/test/architectureRules.ts` | consumer facade |
| `tools/architecture-health/src/aag-response.ts` (実装側) | Phase 4 で schema 駆動化、本体 logic 維持 |
| `references/01-principles/aag/*` (9 doc, 1,538 行) | 整合参照のみ |
| 既存 9 integrity guard | F3 の現役機能、緩和禁止 |
| `manifest.json` | discovery / pathTriggers (Phase 6 で extend 可) |

### 修正する (Pre-Go 条件 = Go 実装条件 C1-C4)

| パス | Phase | 修正内容 |
|---|---|---|
| `app/src/test/aag-core-types.ts` | 2 | `RuleExecutionOverlayEntry` 集約 |
| `app/src/test/architectureRules/merged.ts` | 2 / 3 | bootstrap 修復 + `resolvedBy` 追加 |
| `app/src/test/architectureRules/defaults.ts` | 2 | reviewPolicy stub (採用案次第) |
| `_template/aag/execution-overlay.ts` | 2 | type import 集約版へ + comment 整合 |
| `pure-calculation-reorg/aag/execution-overlay.ts` | 2 | type import 集約版へ + comment 整合 |
| `aag-platformization/aag/execution-overlay.ts` | 2 | type import 集約版へ |
| `references/03-guides/new-project-bootstrap-guide.md` | 2 | Step 4 を採用案に整合 |

### 新設する (派生 artifact + sync guard)

| パス | Phase | 役割 |
|---|---|---|
| `tools/architecture-health/src/aag/merge-artifact-generator.ts` | 3 | merged artifact 生成器 |
| `docs/generated/aag/merged-architecture-rules.<format>` | 3 | merged artifact (resolvedBy 込み) |
| `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` | 3 | merged artifact ↔ runtime sync 検証 |
| `docs/contracts/aag/aag-response.<format>` | 4 | AagResponse contract schema |
| `docs/contracts/aag/detector-result.<format>` | 4 | detector-result contract schema |
| `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` | 4 | contract schema ↔ TS 型 sync 検証 |
| `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` | 5 | RuleBinding 境界 hard fail |
| `tools/architecture-health/src/aag/rules-by-path-generator.ts` | 6 | drawer 生成器 |
| `docs/generated/aag/rules-by-path.<format>` | 6 | path → rule id |
| `docs/generated/aag/rule-index.<format>` | 6 | 軽量 index |
| `docs/generated/aag/rule-detail/<id>.<format>` | 6 | on-demand drawer |
| `docs/generated/aag/rule-by-topic.<format>` | 6 | topic discovery |
| `app/src/test/guards/aag*SyncGuard.test.ts` (Phase 6) | 6 | drawer artifact sync |

### conditional 新設 (Phase 9、Go 実装条件 C1-C4 全 met 後)

| パス | Phase | 役割 |
|---|---|---|
| `tools/aag-{go|python}/` | 9 | reference runtime PoC (採用言語次第、Rust 除外) |
