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
既存 AR-NNN rule の振る舞い変更 / 縦スライス境界 reshape / 5 層構造の調整 / AAG framework 構造変更
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
  2. **AAG Core 8 doc の content refactoring** (Phase 3 + 4) — 5 層位置付け + 責務再定義 + drill-down semantic articulation + 階層化、新規書き起こし → 旧 doc 退役の段階パス
  3. **legacy 撤退** (Phase 5、inbound 0 trigger、期間 buffer なし)
  4. **forward / reverse meta-guard** (Phase 8、双方向 integrity + semantic articulation 検証の機械強制)
  5. **新規製本創出 (display-rule registry を含む)** (Phase 9) + DFR guards (Phase 10)
- **parent: なし** (`phased-content-specs-rollout` は独立に archive 進行)
- Level 3 / governance-hardening / requiresHumanApproval=true / **requiresLegacyRetirement=true**

## 1.4. 実装着手順序 (PR review Review 3 反映)

次セッション開始時の推奨実装順序:

| 順 | 内容 | 根拠 |
|---|---|---|
| **Step 0** | parent project (`phased-content-specs-rollout`) archive 8-step 再実行 | 前々セッション exec-NmXuS branch 削除予定、archive が main 未反映 (§1.5 詳細) |
| **Step 1** | Phase 0.5 完遂状態を確認 | 全 [x] 済 (本 commit + c66df31 で完遂)。再 open は新 PR review でのみ |
| **Step 2** | Phase 1 着手前の§8 確認・調査事項のうち判断項目を articulate | §8.10 (Audit home doc A/B/C) / §8.11 (mapping) / §8.13 (CLAUDE.md 薄化判断) / §8.14 (同期 = B 順序付き) — 詳細は plan §8 集約 table |
| **Step 3** | Phase 1 (`aag/meta.md` skeleton + `aag/README.md` Create + Requirement ID namespace + observeForDays 切り分け articulate) | Phase 1 deliverable 全件、aag/meta.md §2 で `AAG-REQ-*` stable ID list landing |
| **Step 4** | Phase 2 (BaseRule schema 拡張、defaults.ts は触らない) | `architectureRules/types.ts` + `base-rules.ts` で SemanticTraceBinding<T> + RuleBinding 拡張 |
| **Step 5** | Phase 3 audit (5 層位置付け + 責務 + write/non-write list + 影響範囲 + operation 判定) | findings 集約のみ、修正実行は Phase 4 以降 |
| **Step 6** | **Phase 3 完了 hard gate decision** | MVP=Phase 1〜3 / Follow-up=Phase 4〜10 別 project 化 default。単一継続は audit findings で正当化される場合のみ |
| **Step 7+** | Phase 4 着手 (hard gate 通過後のみ) | sub-phase 4.1 Create / 4.2 Split / 4.3 Rewrite / 4.4 Cleanup |

## 1.5. 次セッション着手前の Step 0 (parent project archive 8-step redo、PR review #8 反映)

**前々セッション** で `aag-bidirectional-integrity-exec-NmXuS` branch にて `phased-content-specs-rollout`
parent project の archive 8-step を実行した commit (`67d0f43` / `4564397`) が存在したが、本 branch
は **unmerged のまま削除予定**で、archive 8-step は **main に未反映**。

main 上の `projects/completed/phased-content-specs-rollout/checklist.md` line 158 が `[ ]` のままなら、
**次セッション開始時に Step 0 として archive 8-step を再実行**する必要あり:

1. line 158 を `[x]` flip (人間 review 完了 articulation)
2. mv `projects/completed/phased-content-specs-rollout/` → `projects/completed/phased-content-specs-rollout/`
3. `projects/completed/phased-content-specs-rollout/config/project.json`: `status="archived"`
4. `references/02-status/open-issues.md` の archived projects table を更新
5. `references/02-status/HANDOFF.md` 末尾に Archived line を追加 + 冒頭更新
6. `cd app && npm run docs:generate`
7. `docs/contracts/principles.json` の `$comment` を更新
8. `cd app && npm run docs:check` で Hard Gate PASS 確認 + 全テスト PASS 確認

Step 0 完了後、本 project の Phase 0.5 → Phase 1 に進む。

## 1.6. Phase 3 hard gate decision = B 確定 (AI 推奨 + ユーザー確認、2026-04-30)

**§8.14 順序付き 3 段階完遂後の Phase 3 hard gate decision**: AI 推奨 + ユーザー確認 hybrid (deferred-decision-pattern §3.1 + §3.2 例外則) で **B (Project A〜D 分割) を確定**。

| 項目 | 状態 |
|---|---|
| §8.14 第 1 段 (Phase 1 skeleton landing) | ✅ PR #1216-#1223 merged |
| §8.14 第 2 段 (Phase 3 audit landing) | ✅ commit `6762d39` |
| §8.14 第 3 段 (Phase 1 §3 fill cyclic refinement) | ✅ commit `477ef41` |
| Phase 3 hard gate (AI 推奨段階) | ✅ **B 推奨** (commit `5e6193f`、deferred-decision-pattern §3.1) |
| Phase 3 hard gate (ユーザー確認段階) | ✅ **B 確定** (本 commit、ユーザー articulate「Bでよろしくお願いします」、deferred-decision-pattern §3.2) |

**AI 推奨 rationale** (audit report §7.2): scope 規模 evaluation = operation 22 件 / commit 15-20 件 / 既存 166 rule binding = Level 4 寄り → 単一 project では重い → **default B (follow-up project 分割) を AI 推奨**。

**ユーザー確認**: ユーザー articulate「Bでよろしくお願いします」(2026-04-30) により Project A〜D 分割を確定。

### 本 project (`aag-bidirectional-integrity`) は **MVP 完遂状態** に到達

- **MVP scope (Phase 1 + Phase 3 + cyclic refinement)**: ✅ 全完遂
- **後続 Phase 4〜10**: Project A〜D (仮称) に移管。実 project entity の id は bootstrap session でユーザー判断により確定
- **本 project の status**: 次 session 以降で archive 候補に migrate (Project A〜D bootstrap 完了後、本 project は archive プロセスへ)

### Project A〜D 分割案 (audit report §7.2)

| Project | scope | size | bootstrap 予定 |
|---|---|---|---|
| **Project A** | AAG Core doc refactor (Phase 4 doc Create/Split/Rewrite/Rename/Relocate + Phase 5 legacy 撤退) | Level 3 | next session |
| **Project B** | rule schema + meta-guard (Phase 2 schema 拡張 + Phase 6 AR-rule binding + Phase 8 MVP = canonicalDocRefIntegrityGuard + canonicalDocBackLinkGuard + semanticArticulationQualityGuard + statusIntegrityGuard) | Level 3 | next session |
| **Project C** | DFR registry + display guards (Phase 9 DFR registry + Phase 10 DFR guards) | Level 2 | next session |
| **Project D** | legacy retirement (Phase 5 で完遂しない複雑な archive 案件、例: `adaptive-architecture-governance.md` Split + 部分 Archive) | Level 2 | next session |

各 project の bootstrap は **1 session = 1 project が clean** (project lifecycle の整合性を保つため)。

## 2. 次にやること (MVP 完遂後の next step、Project A〜D 移管)

> **本 project の MVP scope は完遂**: Phase 1 (charter landing) + Phase 3 (audit landing) + cyclic refinement (§8.14 第 3 段) で完了。Phase 4〜10 は **Project A〜D に分割移管** が default 採用済 (§1.6)。
>
> 以下の「Phase 1〜10 細部」は **historical articulation** として保持 (= 本 project が Phase 1〜10 を articulate していた時点での deliverable design)。実 execution は Project A〜D 各々で実施。

### 次 session で実施 (Project A〜D bootstrap)

各 project bootstrap は **1 session = 1 project**:

> **注**: 以下の Project A〜D は **仮称** (まだ project entity として未存在)。実 project entity の id / path は **bootstrap session でユーザー判断** により確定 (= 本 articulation は spawn 計画の sketch であり、project id を予約しない)。

- [x] **Project A bootstrap** (= `aag-core-doc-refactor`): bootstrap 完了 (commit `4dc88b6`、8 doc Create、project-health 登録済、test:guards 全 PASS)
- [x] **Project B bootstrap** (= `aag-rule-schema-meta-guard`): 本 commit で bootstrap 完了 (5 doc Create: AI_CONTEXT / HANDOFF / plan / checklist / projectization / config、Phase 2 + Phase 6 + Phase 8 MVP 移管)
- [x] **Project C bootstrap** (= `aag-display-rule-registry`): 本 commit で bootstrap 完了 (5 doc Create、Phase 9 + Phase 10 移管、Project B Phase 4 完了後に着手)
- [x] **Project D bootstrap** (= `aag-legacy-retirement`): 本 commit で bootstrap 完了 (7 doc Create: + breaking-changes + legacy-retirement、Project A Phase 5 拡張案件、Project A Phase 5 完了後に case A/B 判定で着手要否判定)

各 project の **依存関係**:
- Project A → Project B (= AAG Core doc refactor 完了後に rule schema 拡張、binding 記入対象が安定)
- Project A → Project D (= legacy retirement は Project A の Rewrite + Relocate 後の archive 移管)
- Project B → Project C (= rule schema + meta-guard 完了後に DFR registry の concrete instance 化)

### Future follow-up project 候補 (Project A〜D 完了後、user vision = 「判断 chain → 品質保証 + 間違い認識 + 修正機会、責任追及ではなく blame-free な system-level learning」を institutional 化)

> **背景** (2026-04-30 dialog、5 insight 統合 articulate):
>
> **Insight 1**: 人間判断をできる限り最小化、代わりに調査 / 検証 / 仮説 / 根拠 を元にどう判断したかの **traceability** を実装、後追いで past decision を検証可能に
> **Insight 2**: 人間判断する場合でも「**何を見るか / 何で判断するか**」が現状 articulate されておらず reviewer に丸投げ → view list + judgment criteria + approval record の必須化
> **Insight 3**: 判断の連続の先にあるものは「過去の判断は正しかったか」ではなく「**最終品質を向上させる判断であったか**」という **品質保証** につなげるべき (= outcome-based quality contribution evaluation)
> **Insight 4**: 「**間違った判断であったことを認め、修正する機会を提供すべき**」 — retrospective audit で negative 評価された decision に対して **mistake admission + correction opportunity** を構造的に提供する mechanism (`AAG-REQ-NO-PERFECTIONISM` の natural extension = 弱さを受容するなら、間違いを認める + 修正経路 mechanism が必要)
> **Insight 5**: 「**責任追及ではない点に注意**」 — mistake admission + correction opportunity は **構造的な改善 mechanism** であり、個別 decision-maker (AI session / 人間 reviewer) への blame ではない。retrospective audit は「**学習機会** として機能、責任追及として機能しない」。過去判断を非難せずに、**structural defect として捉え、修正 chain で次の品質向上に connect** する (= **blame-free culture** の institutionalization、`AAG-REQ-NO-PERFECTIONISM` の精神 = 弱さの受容を decision-level に extend)
> **Insight 6**: 「**人間の判断が正しいでもありません**」 — AI 判断 / 人間判断は **equal authority** で扱う。人間判断は authority (= 必ず正しい) ではなく、機械判定不可能な特定領域の **safety device**。両者とも retrospective audit の対象、両者とも品質貢献評価される。本 articulate で旧 "構造的安全装置として残す" の implicit な "human authority" 含意を removing し、**equal traceability + equal audit** に refine
> **Insight 7**: 人間判断には 2 つの **pragmatic function** があり、いずれも「正しい / 間違い」軸でも「authority」でもない:
>
> **(a) 答えが derive できない時の合意 formation** — Insight 6 の "両者とも間違える" articulation に implicit に残っていた **真理が存在し miss しうる** という epistemological 含意を完全に removing。「答えが derive できない時、関係者間の agreement を answer として擬制する pragmatic act」。AI judgment (evidence-based) / 人間 consensus (consensus-based) いずれも **provisional answer**、retrospective audit は「correctness 軸」ではなく「**usefulness 軸 = provisional answer が品質向上に有用だったか**」で評価。
>
> **(b) 破壊的変更の重要ステップの区切りでの announcement** — 「ここから先は不可逆、今から行いますよ」の **milestone acknowledgment**。validation of correctness ではなく、**irreversibility threshold での ceremonial acknowledgment** (= 心理的・運用的 commitment、bell ringing)。例: 物理削除 trigger (`humanDeletionApproved`) / 最終レビュー (archive process 移行) / Phase 5 archive 移管 — いずれも「正しいか」ではなく「**この不可逆ステップを今ここで踏みますね**」の announcement。
>
> 両 function とも: 真理を保証しない、authority ではない、AI judgment より優位ではない。**行動するための pragmatic mechanism**。`AAG-REQ-NO-PERFECTIONISM` (完璧主義禁止 = 弱さの受容) の natural extension = 「真理 derive できない場面 + 不可逆ステップで ceremonial commitment が必要な場面」を構造的に受容
> **Insight 8**: 「**重要な判断だが先に進めないといけない時、調査・検証を重ねた上で選択した judgment が後で間違いだったと認めた際、安全にロールバックできるよう戻る地点を commit として記録**」 — Insight 4 (mistake admission + correctionOpportunity) の rollback path を **構造的 safety mechanism** として institutional 化。重要 decision (= `reversibility !== 'irreversible'`) を enact する前に **rollback anchor commit** (= decision 前の state を named commit / tag として記録) を必ず作成。retrospective audit で negative 評価 + rollback 選択時、anchor commit に safe revert で戻れる。既存 AAG mechanism は既に implicit に implementing: archive 8-step (= `mv to projects/completed/`) は git revert で復活可能 / dual-run + parallel comparison (= 旧 doc は archive まで併存、本 project Phase 1-5 設計に integrate 済) は anchor として機能 / 物理削除のみ irreversible (anchor 不在、人間 milestone acknowledgment 必須)。本 insight は既存 implicit な原則を **decision-trace level の formal field** (`rollbackAnchor.anchorCommitSHA + anchorTag + anchorCreatedAt + rollbackProcedure`) として extend
> **Insight 9 (meta-principle)**: 「**AAG の役割は、AI が制度を利用しやすい / 判断しやすいように整備すること**」 — これは Insight 1〜8 の上に乗る **横断的 meta-principle**、AAG framework の存在目的そのものの再 articulate。AAG の primary role は (a) 機械的検出 (guard rails) + (b) 言語化制度 (canonical doc) **だけでなく**、(c) **AI utilization 整備** (= empowering infrastructure)。AAG-AI relationship が「**AAG enforces rules ON AI**」(従来含意) から「**AAG enables AI's good judgment**」(新 articulate) に shift。design 評価軸も「rule 準拠を強制できているか」だけでなく「**AI が utilize しやすいか / 判断しやすいか**」が並列。Insight 1〜8 全てに横断的に適用 (例: Insight 1 traceability は AI が trace 生成しやすい helper、Insight 2 view list は AI が集約しやすい discovery、Insight 8 rollback anchor は AI が anchor 自動生成しやすい helper)。前回 assessment で identify した **operational gap** (= AI-side mechanism の implementation path 未 articulate) を **first principle に elevate** した user articulation
>
> **4 insight 統合フレーム**:
>
> ```
> 判断 (Decision) — 連続 chain として品質保証に connect
> │
> ├─ AI 自主判断 (大多数、decision trace 完備で expand)
> │   ├─ 入力: investigation + verification + hypothesis (≥ 2 件) + evidence
> │   ├─ 出力: decision + rationale + alternatives
> │   ├─ 退路: reversibility + rollbackPath
> │   ├─ quality impact link: targetQualityMetric (health KPI ID) + expectedQualityChange + measuredQualityChange
> │   │
> │   └─ 後追い: retrospectiveAudit (Layer 4.6)
> │       ├─ 評価軸 = 「最終品質向上に貢献したか」(positive / neutral / negative / inconclusive)
> │       │
> │       └─ negative / partially-correct と判定された場合:
> │           ├─ admitMistake: 間違いを認める articulate (= 自己批判的記録、AI / 人間判断 共通)
> │           ├─ correctionOpportunity: 修正経路を articulate
> │           │   ├─ rollback: reversibility=reversible なら rollbackPath 実行
> │           │   ├─ supersede: 新 decision で superseded、旧 decision は historical context 保持
> │           │   └─ accept-as-debt: 修正不能なら accumulated-debt として articulate (将来 corrective action)
> │           └─ correctionExecuted: 修正 commit / 新 decision SHA を link (= 修正後の retrospective audit chain)
> │
> └─ 人間判断 (構造的安全装置のみ、厳格な少数派)
>     ├─ 入力: AI 事前集約 view list (具体 material 一覧)
>     ├─ 基準: AI articulate judgment criteria (承認/却下基準)
>     ├─ 出力: approval/reject + 承認 record (何を見たか / どう判断したか)
>     └─ 後追い: retrospectiveAudit (品質寄与評価 + 必要なら admitMistake + correctionOpportunity)
> ```
>
> 両 path 共通: **decision trace** が **品質保証 chain** (= ratchet-down history との双方向 link) として後追い audit に活用される。AAG-REQ-RATCHET-DOWN (改善は不可逆) と AAG-REQ-NO-PERFECTIONISM (弱さを受容) を **decision-level traceability + correction chain** で extend。

#### Project E (仮称 = AAG Decision Traceability + Quality Connection + Correction Chain、Level 3〜4、本 session で提案 articulate)

**scope**: 「判断 chain → 品質保証 + 間違い認識 + 修正機会、blame-free な system-level learning」の institutional 化。具体的に:

1. `references/03-guides/decision-trace-pattern.md` 新設 (Layer 4A System Operations) — DecisionTrace schema (investigation + verification + hypothesis ≥ 2 件 + evidence + decision + rationale + alternatives + reversibility + **rollbackAnchor (anchorCommitSHA + anchorTag + anchorCreatedAt + rollbackProcedure、Insight 8)** + **qualityImpact (targetQualityMetric + expectedQualityChange + measuredQualityChange)** + retrospectiveAudit + **correctionChain (admitMistake + correctionOpportunity + correctionExecuted)**) を articulate。**blame-free 原則** を冒頭で articulate (= 過去 decision-maker への責任追及禁止、structural defect として扱う)
2. `references/03-guides/human-review-specification.md` 新設 (Layer 4A System Operations) — 人間判断 gate の必須要素 (view list + judgment criteria + approval record) standard pattern
3. `aag/meta.md` §2 update — 新規 requirement 追加:
   - `AAG-REQ-DECISION-TRACEABILITY` (全 decision に full trace + retrospective audit 経路、AI / 人間問わず equal traceability)
   - `AAG-REQ-HUMAN-REVIEW-EXPLICITNESS` (人間判断 gate に view list + judgment criteria 必須)
   - `AAG-REQ-QUALITY-ORIENTED-JUDGMENT` (全 decision に target quality metric + expected change が articulate、retrospective audit で quality contribution 評価)
   - `AAG-REQ-MISTAKE-ADMISSION-AND-CORRECTION` (negative 評価 decision に admitMistake + correctionOpportunity 必須、修正経路の構造的提供、AI / 人間問わず equal correction)
   - `AAG-REQ-BLAME-FREE-LEARNING` (mistake admission は **system-level learning** であり責任追及ではない、過去 decision-maker への blame 禁止 = `AAG-REQ-NO-PERFECTIONISM` の decision-level extension)
   - **`AAG-REQ-CONSENSUS-AS-PROVISIONAL-ANSWER`** (新、Insight 7-a): 答えが derive できない時、合意を **provisional answer** として擬制する pragmatic act。「正しい / 間違い」軸ではなく、「**usefulness 軸 = 品質向上に有用だったか**」で評価。AI judgment (evidence-based) / 人間 consensus (consensus-based) いずれも provisional、retrospective audit で usefulness validation
   - **`AAG-REQ-MILESTONE-ACKNOWLEDGMENT`** (新、Insight 7-b): 破壊的変更 / 不可逆ステップの区切りでの **announcement-style acknowledgment** (= 「ここから先は不可逆、今から行いますよ」の ceremonial commitment、bell ringing)。validation of correctness ではない。例: 物理削除 trigger (`humanDeletionApproved`) / 最終レビュー (archive 移行) / Phase 5 archive 移管。判断 record の articulate 必須項目 = 「不可逆ステップ X を 今 commit Y で踏む」の announcement statement
   - **`AAG-REQ-ROLLBACK-ANCHOR-PRESERVATION`** (新、Insight 8): 重要 decision (= `reversibility !== 'irreversible'`) を enact する前に **rollback anchor commit** (= decision 前の state を named commit / tag として記録) を必ず作成。retrospective audit で negative 評価 + rollback 選択時、anchor commit に safe revert で戻れる。達成条件: DecisionTrace の `reversibility !== 'irreversible'` なら `rollbackAnchor` field 必須 + anchorCommitSHA が実在 commit を指す + anchorTag が articulate 済 + rollbackProcedure (= 安全な rollback 手順) が articulate 済。既存 archive 8-step / dual-run / parallel comparison は本 requirement の application instance、本 requirement で formal な field として institutional 化
   - **`AAG-REQ-AI-UTILIZATION-FRIENDLINESS`** (新、Insight 9 = meta-principle): 全 AAG mechanism は AI が utilize しやすい / 判断しやすい設計でなければならない (= AAG の役割は AI を empower する infrastructure)。達成条件 (state-based): 各 mechanism が以下を提供 — manifest.json discovery hint articulate (`byTopic` / `byExpertise` / `pathTriggers`) / AI-readable schema (= JSON / TypeScript 型 / structured doc) / AI-callable tool / hook (= CLI / claude command / git hook) / clear 判断 criteria (= what / why / decision criteria articulate)。Insight 1〜8 全 requirement に横断的に適用 (= 各 requirement の達成判定に "AI utilization friendliness" 観点も含まれる)
   - `AAG-REQ-NO-AI-HUMAN-SUBSTITUTION` を **Layer 0 + 答えが derive できない時の consensus formation (Insight 7-a) + 不可逆ステップでの milestone acknowledgment (Insight 7-b) のみ** に narrow (= 旧 "構造的安全装置として残す" の implicit "human authority" 含意 + "両者とも間違える" の implicit "真理が存在し miss しうる" 含意を両方 removing、人間判断の 2 pragmatic function に明確化)
4. `aag/meta.md` §3.2 audit framework に **4.6 Retrospective Audit sub-audit** 追加 — 評価軸 = 「**provisional answer が品質向上に有用だったか (usefulness 軸)**」(positive / neutral / negative / inconclusive、Insight 7 = correctness 軸ではなく usefulness 軸)、入力 = targetQualityMetric の baseline 推移 (ratchet-down history) + 関連 decision trace 群、出力 = usefulness 判定 + negative の場合 correctionOpportunity link、**blame-free 原則を audit framework に embed** (= 「provisional answer は当時の info で擬制した合意、後の品質結果で usefulness 確認」という framing で articulate、個別 decision-maker を責めない)
5. `_template/checklist.md` の最終レビュー checkbox を view list + judgment criteria + approval record 必須形式に extend
6. `references/03-guides/deferred-decision-pattern.md` §3.2 縮小 — 高 blast radius decision の「ユーザー確認必須 gate」を decision trace + quality impact link + retrospective audit + correction chain に置換 (人間判断必須は **物理削除 trigger + 最終レビュー** のみに narrow)
7. existing health KPI (`health-rules.ts`) + certificate + Layer 4.5 Functional Audit と decision trace の **双方向 link mechanism** (= 個別 decision が KPI 改善に貢献したかの自動 attribution)
8. **correction chain mechanism** (新): retrospective audit で negative / partially-correct 評価された decision に対する 3 種の修正経路 (rollback / supersede / accept-as-debt) と、修正実行時の新 decision との chain articulate。**rollback path は Insight 8 の rollbackAnchor を utilize** (= `git revert <anchorCommitSHA>` or `git reset --hard <anchorCommitSHA>` で安全 revert)、rollback 後に新 decision trace で別の選択肢 (= 仮説 ≥ 2 件で alternatives に articulate されていた hypothesis) を試行。supersede path は新 decision で旧 decision を historical context として保持 (= 旧 decision-trace.json を deprecated marker 付きで archive、新 decision trace で連鎖)。accept-as-debt path は accumulated-debt registry に articulate (将来 corrective action の input、`AAG-REQ-RATCHET-DOWN` で漸次返済)
9. **`tools/decision-trace-cli.ts` (or claude command) 新設** (Insight 9): AI session が判断する時、schema-conformant な decision trace を semi-automate 生成。input prompt: investigation source / hypothesis / evidence / decision / quality metric → output: decision-log.json entry (UUID + commit SHA + structured fields)
10. **`.claude/manifest.json` discovery 拡張** (Insight 9): decision-making / quality-assessment / correction / rollback の hint を `byTopic` / `byExpertise` / `pathTriggers` に embed。AI session 開始時に decision-trace-pattern.md / human-review-specification.md が discoverable
11. **`references/03-guides/ai-utilization-patterns.md` 新設** (Insight 9): AI が AAG を leverage する典型 pattern (= 新 project bootstrap / edit 前 obligation 確認 / judgment 時 decision-trace 生成 / mistake admission / rollback execution / milestone announcement / consensus formation)。各 pattern に concrete steps + tool / command / hook reference + sample output
12. **`aag/meta.md` §3.2 audit framework に 4.7 AI-Usability Audit 追加** (Insight 9 + extensible articulate 既存): 全 AAG mechanism が AI utilization friendliness を満たしているか機械検証 + 人間 review。trigger: 新 mechanism landing / 既存 revise / 入力: manifest discovery / schema / tool inventory / 判断 criteria articulation 状態 / 出力: AI-friendliness 評価 + 改善 corrective action

**着手 trigger**: Project A〜D 完了後 (本 project archive 直前 or 直後)、または本 project archive 後の独立 follow-up として spawn。

**急がない**: 既存 mechanism (deferred-decision-pattern §3.1 = AI 自主判断 + criteria + collection sources + decision log) が 部分的に integrate 済のため、現状の運用に致命的問題なし。**適切なタイミングで institutional 化** する candidate。

**retrospective 検証対象** (Project E vision で再評価する candidate):
- 本 session 冒頭の Phase 3 hard gate decision (ユーザー確認 = B 確定) を Layer 4.6 Retrospective Audit の **初 application instance** として検証 — 評価軸: 「Project A〜D 分割は AAG 全体の品質向上に貢献したか」(NOT 「正しかったか」)。具体 quality metric 候補: KPI 60 / project-health derivedStatus 全 in_progress→completed への到達速度 / `AAG-REQ-LAYER-SEPARATION` 等の達成 status flip 数 / health-rules.ts ratchet-down 件数

**追加 follow-up 候補 (2026-04-30 dialog で identify、参考)**:
- 「最も多い失敗」(`@deprecated` + sunsetCondition 不在) hard fail mechanism (architecture-debt-recovery §3.3 教訓) — Project B Phase 4 meta-guard 拡張 candidate
- C4 violation error message に「forward reference 仮称 articulation」 hint (本 session 冒頭で 30 分 friction)
- obligation 違反を pre-commit に移動 (本 session で 4 回連続 fail)
- inquiry doc に「仮説 ≥ 2 件」必須 section (architecture-debt-recovery §3.2 教訓)

### 次 session で実施 (本 project archive)

Project A〜D bootstrap 完了後、本 project (`aag-bidirectional-integrity`) は archive プロセスへ:

- [ ] checklist 末尾「最終レビュー (人間承認)」 [x] flip
- [ ] 8-step archive: mv to `projects/completed/` + status=archived + open-issues update + HANDOFF Archived header + docs:generate + principles.json update + docs:check + tests PASS

### 旧 Phase 1〜10 articulation (historical、Project A〜D 移管後は不活性)

> **状態 (2026-04-30 plan refinement 完了)**: plan / AI_CONTEXT / checklist / legacy-retirement /
> projectization は経営階層 drill-down 視点で全面 refine 済、実 execution は次セッション以降。
> 計画段階の判断:
> - 5 層 drill-down (目的 / 要件 / 設計 / 実装 / 検証) を北極星に据え、AAG Meta = 目的、AAG Core = 対象、AAG Audit = 第三者監査 として位置付ける
> - AAG Core 8 doc は 5 層位置付け + 責務再定義 + drill-down semantic articulation で再構築 (Phase 3 audit + Phase 4 refactor)
> - 新規書き起こし優先 (edit-in-place 禁止)、ディレクトリ階層化 (`aag/`)、命名規則刷新
> - drill-down chain は重複と参照の切り分け + semantic articulation (problemAddressed + resolutionContribution) で機械管理
> - inbound 0 trigger のみ (期間 buffer なし、anti-ritual)
> - display-rule registry (DFR-NNN) は Phase 9 の最初の concrete instance として吸収
> - **Phase 1 と Phase 3 は並行 refine 可能** (Meta skeleton と Core audit が相互参照、最終確定は両者完了後)

### Phase 1: AAG Meta doc (`aag/meta.md`) の新規創出 (Layer 0+1)

- [ ] `references/01-principles/aag/meta.md` を新規 Create (4 section 構造):
  - §1 目的 (Purpose、Layer 0、1-2 段落、変わらない核心)
  - §2 要件 (Requirements、Layer 1、不変条件 + 禁則 table、各行に enforcing AR-rule + state-based 達成条件 + 達成 status)
  - §3 AAG Core 構成要素 mapping (Layer 2 doc + Layer 3 実装、5 層位置付け + 各 doc / 実装の forward pointer)
  - §4 達成判定総括 (全要件の達成度サマリ + 不達成項目の解消責務)
- [ ] `references/01-principles/aag/README.md` を新規 Create (aag/ ディレクトリ index、CLAUDE.md からの 1 link entry)
- [ ] `docs/contracts/doc-registry.json` に新 doc 登録
- [ ] CLAUDE.md AAG セクションに 1 行索引 link 追加 (詳細薄化は Phase 4)
- [ ] charter 人間 review (Constitution 改訂と同等の慎重さ)

### Phase 2: AAG rule metadata 拡張 (semantic articulation 構造 + status field、変更対象 = BaseRule 物理正本)

> **変更対象正本** (PR review Review 3 P0 #1 + P1 #4 反映):
> - 型定義: `app/src/test/architectureRules/types.ts` / `app/src/test/aag-core-types.ts`
> - 実データ: `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule 物理正本)
> - derived consumer: `app/src/test/architectureRules/merged.ts`
> - **触らない**: `defaults.ts` (execution overlay) / `guardCategoryMap.ts` (二重正本回避)

- [ ] `architectureRules/types.ts` (or `aag-core-types.ts`) に `SemanticTraceBinding<T>` 型 family + `CanonicalDocTraceRef` / `MetaRequirementTraceRef` を追加
- [ ] `RuleBinding` 型に下記 field を追加 (`RuleSemantics` でなく `RuleBinding`、docPath は App Domain 寄り):
  - `canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` (実装 → 設計 doc binding)
  - `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` (実装 → 要件 binding)
- [ ] `app-domain/gross-profit/rule-catalog/base-rules.ts` の全 rule に `{ status: 'pending', refs: [] }` で初期化 (空配列でなく status object、未対応 vs 適用外を区別)
- [ ] `defaults.ts` (execution overlay) と `guardCategoryMap.ts` は **触らない** ことを確認
- [ ] TypeScript 型定義の整合 (build / lint PASS、`merged.ts` 経由で consumer から canonicalDocRef + metaRequirementRefs にアクセス可能)

### Phase 3: AAG Core doc audit (5 層位置付け + 責務 + drill-down semantic + operation 判定)

各 AAG 関連 doc に対して:

- [ ] **5 層位置付け** (Layer 0/1/2/3/境界 のどれか)
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
- [ ] **Split / Merge / Rewrite 段階**: 旧 doc から内容を選別して新 doc に書き起こし、5 層位置付け + drill-down pointer + semantic articulation を装着
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

### Phase 8: Layer 4 sub-audit MVP 実装 (4.2 方向 + 4.4 完備性 のみ、PR review Review 3 P1 #6 反映)

> **MVP scope**: 5 sub-audit (4.1〜4.5) を一気に実装すると新たな governance debt 化のため、
> **MVP は 4.2 方向 + 4.4 完備性 のみ**。4.1 境界 / 4.3 波及 / 4.5 機能性 + selfHostingGuard +
> metaRequirementBindingGuard は **follow-up project に逃がす** (Phase 3 split decision gate で
> 別 project 化 default)。

#### 4.2 方向監査 (MVP)

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse): 各 AR rule の `canonicalDocRef.refs` の各 entry について docPath 実在 + rule ID 出現 + articulation non-empty
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward): canonical doc の `## Mechanism Enforcement` section の各 entry について AR ID + 要件 ID + articulation non-empty

#### 4.4 完備性監査 (MVP)

- [ ] `semanticArticulationQualityGuard.test.ts`: hard fail (禁止 keyword + 20 文字 minimum + 重複検出 + status 整合性 + path 実在) / warning (意味品質は human review)
- [ ] `statusIntegrityGuard.test.ts`: status field の整合性 (`bound` のとき `refs.length > 0` / `not-applicable` のとき `justification` 必須 / 新規 rule で `pending` 禁止)

#### 共通 (MVP)

- [ ] 例外 allowlist の baseline を機械管理 (ratchet-down のみ、増加禁止)
- [ ] 新 rule 追加 PR で immediate enforcement が hard fail することを synthetic 注入で確認

#### follow-up project に逃がす (Phase 8 MVP scope 外)

- ~~4.1 境界監査 / 4.3 波及監査 / 4.5 機能性監査~~ → follow-up project
- ~~`metaRequirementBindingGuard.test.ts` (Layer 1 ↔ Layer 3 binding 専用)~~ → follow-up project
- ~~`selfHostingGuard.test.ts` (aag/meta.md 自己整合)~~ → follow-up project

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
- [ ] DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule 物理正本) に登録 (`canonicalDocRef` + `metaRequirementRefs` の `SemanticTraceBinding<T>` 形式で semantic articulation 付き)。`defaults.ts` (overlay) と `guardCategoryMap.ts` には **置かない** (二重正本回避)
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

### 3.6. Phase 1 と Phase 3 は並行 refine 可能 (cyclic refinement、PR review #6 反映で同期方針確定)

aag/meta.md skeleton (Phase 1) と AAG Core doc audit (Phase 3) は相互参照で refine。Meta が
audit 結果を反映して update する cyclic refinement。最終確定は Phase 3 + Phase 4 完了後 (新
Core doc の path / 責務が確定したタイミング)。

**同期 commit 方針** (plan §8.14、推奨 = B 順序付き):

1. **Phase 1 skeleton landing** (aag/meta.md §1 目的 + §2 要件 skeleton + §3 Core mapping は仮の articulation で landing)
2. **Phase 3 audit landing** (aag-doc-audit-report.md に findings 集約)
3. **Phase 1 §3 fill** (Phase 3 audit 結果を踏まえ、aag/meta.md §3 Core mapping を確定 articulation に update)

各段階を独立 commit で実施、parallel comparison 期間を確保。同 PR / commit に bundling は混乱の元
なので避ける。

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
| `references/99-archive/adaptive-governance-evolution.md` | 旧進化動学 (Phase 4 で Rewrite + Relocate + Rename) |
| `projects/completed/phased-content-specs-rollout/HANDOFF.md` | parent dialog の経緯 |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 Layer 2 製本 |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 Layer 2 製本 |
| `references/03-guides/coding-conventions.md` | DFR-003/004 Layer 2 製本 |
| `references/04-design-system/docs/iconography.md` | DFR-005 Layer 2 製本 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
