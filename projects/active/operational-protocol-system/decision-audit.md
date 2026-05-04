# decision-audit — operational-protocol-system

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §1 不可侵原則 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1 (Commit-bound Rollback) + Pattern 4 (Honest Articulation)。
> 1 entry = 1 判断 = 1 振り返り。**観測なき articulation を禁ず**。

## 必須要件

### 判断時 (Phase / 軸 着手時)

- 候補 / 採用案 / 判断根拠 (事実 + 推論)
- 想定リスク (採用案外れ時の最大被害)
- 振り返り観測点 **最低 3 つ** (1 つ以上は反証可能)
- **5 軸 articulation** (製本 / 依存方向 / 意味 / 責務 / 境界、AAG component design lens)
- **Commit Lineage** (judgementCommit / preJudgementCommit + annotated tag)
- judgementCommit を **amend / rebase / force push 禁止** (= sha が rollback target)

### 振り返り (Phase / 軸 完了時)

- 観測点を **実測** (推測 / 主観禁止)
- 判定 = **3 値**: 正しい / 部分的 / 間違い (= drawer Pattern 4 適用、graduation 禁止)
- 軌道修正 (判定が "部分的" / "間違い" の場合): rollback procedure or forward-fix plan + rollbackCommit + rollbackTag

### Commit Message Convention

```
Decision: DA-α-NNN ({judgement|implementation|retrospective|rollback})
```

`git log --grep="DA-α-NNN"` で判断系列を抽出可能。

### Tag Convention

```bash
git tag -a "operational-protocol-system/DA-α-NNN-rollback-target" -m "preJudgement" <preJudgementSha>
git tag -a "operational-protocol-system/DA-α-NNN-judgement"      -m "judgement landing" <judgementSha>
git tag -a "operational-protocol-system/DA-α-NNN-retrospective"  -m "retrospective"  <retrospectiveSha>
```

`git checkout operational-protocol-system/DA-α-NNN-rollback-target` で判断前に物理的に戻れる。

---

## 判断 entry 一覧

| ID | Phase / 軸 | 判断対象 | status |
|---|---|---|---|
| DA-α-000 | Phase 0 | 本 program の進行モデル (drawer Pattern 1 application instance + AAG Pilot DA institution からの継承判断) | active |
| DA-α-001 | Phase M1 | M1 Task Protocol System 着手判断 (新 doc 4 件配置 + articulate 順序) | active |
| DA-α-002 | Phase M2 | M2 既存 5 文書 routing 固定方針 | active |
| DA-α-003 | Phase M3 | M3 動的昇格・降格ルール articulate 方針 | active |
| DA-α-004 | Phase M4 | M4 Task Class 5 protocol articulate 方針 | planned |
| DA-α-005 | Phase M5 | M5 drawer `_seam` 統合 + guard 化判断 | planned |

---

## DA-α-000: 本 program の進行モデル決定

**status**: active

### 判断時 (2026-05-02 / Phase 0)

- 候補:
  1. user 承認 gate モデル (3+ Gate)
  2. AI judgement only (履歴なし)
  3. AI judgement + retrospective verification
  4. **AI judgement + retrospective + commit-bound rollback** (= drawer Pattern 1 + AAG Pilot DA institution からの継承)
- 採用案: 候補 4
- 判断根拠:
  - 事実 1: AAG Pilot (= `projects/completed/aag-platformization/`) で同 institution が成立、19+ reframes に対し rollback 0 件で機能 verify 済 (= drawer Pattern 1 の application instance が実証)
  - 事実 2: drawer (= `references/05-aag-interface/drawer/decision-articulation-patterns.md`) Pattern 1 が一般 trigger と適用領域を articulate 済 (= 領域 agnostic、本 project でも reuse 可能)
  - 事実 3: 不可侵原則 6「起動・archive 判断は user 領域、AI 単独で起動・archive しない」と整合 (= AI 単独進行 + 最終 archive user 承認)
- 想定リスク:
  - 最大被害: judgementCommit / Tag 管理 overhead が Phase 進行を鈍化、rollback tag が dead reference 化。mitigation = AAG Pilot で実証済 (rollback 0 件でも DA institution は psychological safety + scope discipline として機能)
  - 二番目: tag prefix `operational-protocol-system/DA-α-` が AAG Pilot prefix と区別されない混同 risk。mitigation = prefix 完全一致 + repo 内 tag list で区別可能
- 振り返り観測点 (5 点):
  - 1 (肯定): 全 Phase の各 DA で commit lineage が漏れず記録される
  - 2 (肯定): 1 件以上の DA で判定 "間違い" or "部分的" + 軌道修正 entry が活用される (= AAG Pilot DA-α-005 で precedent)
  - 3 (反証): 全 Phase でjudgementCommit を amend した事故 0 件
  - 4 (反証): 「overhead」を理由に DA を skip した entry 0 件
  - 5 (反証): rollback tag が一度も使われずすべて "正しい" 判定だと dead weight (= AAG Pilot 後の本 project でも同様、Pattern 1 の psychological safety value を articulate)

### 5 軸 articulation

- **製本** (canonical): 本 program 内 `decision-audit.md` が canonical (派生先なし)
- **依存方向**: 上位 = `plan.md` §1 + drawer Pattern 1、下位 = なし。AAG Pilot DA institution からの一方向継承
- **意味**: 「AI 判断履歴 + 物理 rollback 経路を持つ institution の articulation」(= AAG Pilot DA-α-000 の領域 agnostic 拡張)
- **責務**: institution の articulate + 1 entry のみ self-dogfood
- **境界**: 本 project 内のみ、横展開対象外 (= 横展開 = drawer Pattern 1 経由で各 program が自分で landing)

### Commit Lineage

- judgementCommit: `8283b4b` (= bootstrap commit、本 entry を含む実装 commit)
- preJudgementCommit: `653882b` (= bootstrap 直前、charter draft commit + references/README + doc-registry index 反映)
- judgementTag: `operational-protocol-system/DA-α-000-judgement` (`8283b4b` に annotated tag landing 済)
- rollbackTag: `operational-protocol-system/DA-α-000-rollback-target` (`653882b` に annotated tag landing 済)
- implementationCommits:
  - `8283b4b` — bootstrap 全実装 (skeleton 6 doc + DA-α-000 + open-issues 行追加 + charter draft 削除 + doc-registry / README 更新)

### 振り返り (本 program archive 直前 / TBD)

> Phase M1-M5 完了 + 最終レビュー直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 起票時点で軌道修正なし、Phase 進行中に sub-events articulate 必要時に追記)

---

## DA-α-001: M1 Task Protocol System 着手判断

**status**: active

### 判断時 (2026-05-04 / Phase M1)

- 候補:
  1. 4 doc 一括 landing (= 1 commit で 4 doc + DA + checklist update)
  2. doc 別 PR 分割 (= 4 commit で 4 doc を逐次 landing)
  3. doc 一括 + DA / checklist update 別 PR
- **採用案: 候補 1** (= 4 doc 一括 landing)
- 判断根拠:
  - 事実 1: 4 doc は **相互参照** が必須 (= task-protocol-system は他 3 doc を index、catalog ↔ session-protocol ↔ complexity-policy で cross-link)。逐次 landing だと中間状態で broken link が発生
  - 事実 2: M1 観測点 (= 4 doc 全 landing で `docs:check` PASS) は 4 doc 同時 landing を前提
  - 事実 3: archive-v2 program PR 6 / 6 として scope discipline 整合 (= drawer Pattern 2、本 PR を逸脱しない)
  - 事実 4: AAG Pilot DA-α-005 で同種「複数 generated drawer 一括 landing」が成立済 (= precedent)
- 想定リスク:
  - 最大被害: 4 doc の articulate quality に drift がある場合、後続 M2-M5 で全 doc を再 update する rework 発生。mitigation = M1 scope は articulate のみ、M2-M5 で routing / 動的ルール / 5 protocol / drawer `_seam` の各層で順次 refine する pattern を articulate 済 (= drawer Pattern 4 honest articulation で「完成度を分割段階で漸進」)
  - 二番目: docs:check が KPI drift で fail し commit blocked。mitigation = 4 doc landing 後に `docs:generate` 実行、generated section + KPI drift 解消
- 振り返り観測点 (5 点 = M1 観測点 5 件と同期):
  - 1 (M1-1 肯定): 6 Task Class が `task-class-catalog.md` で articulate されている (= TC-1〜TC-6、各々に scope + 入口/出口条件 + complexity range + antipattern)
  - 2 (M1-2 肯定): Session Protocol が L1/L2/L3 別に `session-protocol.md` §3.2/§3.3/§3.4 で articulate されている
  - 3 (M1-3 肯定): L1/L2/L3 と既存 5 文書の使い分けが `complexity-policy.md` §1 + §5 table で articulate されている
  - 4 (M1-4 反証): 4 doc 全 landing で `docs:check` PASS (= 機械検証可能観測)
  - 5 (M1-5 反証): synthetic session scenario で各 level の routing が verify 可能 (= `session-protocol.md` §3.2/§3.3/§3.4 を読んで AI が即 routing 可能、本 session が初の self-application instance)

### 5 軸 articulation

- **製本** (canonical):
  - `references/05-aag-interface/protocols/task-protocol-system.md` (= 上位 index、canonical)
  - `references/05-aag-interface/protocols/task-class-catalog.md` (= Task 軸 canonical)
  - `references/05-aag-interface/protocols/session-protocol.md` (= Session 軸 canonical)
  - `references/05-aag-interface/protocols/complexity-policy.md` (= Complexity 軸 canonical)
  - 派生先なし (= 5 文書 / drawer / AAG-COA は本 protocol の **input** として参照、派生関係なし)
- **依存方向**: 上位 = AAG framework (= aag/_internal/ + drawer + AAG-COA、改変しない)、下位 = 主アプリ改修 user の day-to-day workflow。一方向参照
- **意味**: 「AAG framework を使う側の操作 protocol articulate」(= over-ritual / under-ritual 回避 + session ad-hoc 解消 + AI context 最短到達)
- **責務**: 運用 layer の articulate のみ、AAG framework / 主アプリ code は touch しない (= 不可侵原則 1)
- **境界**: M1 は 4 doc articulate のみ、M2 (= routing 固定) / M3 (= 動的ルール) / M4 (= 5 protocol) / M5 (= drawer `_seam`) は別 Phase

### Commit Lineage

- judgementCommit: `9d106564649fac499cc96285cf8c08d64d8315eb` (= M1 landing commit、4 doc 新設 + DA-α-001 entry + checklist update + HANDOFF update を含む)
- preJudgementCommit: `5c29bb54971c8ca97042360bacebc23953f20d54` (= M1 直前 = archive-v2 PR 5 = aag-platformization Pilot 圧縮 commit)
- judgementTag: `operational-protocol-system/DA-α-001-judgement` (= **未 landing**、AI session infrastructure (= localhost git proxy) で新規 tag 作成が HTTP 403 で阻止される既知制約。aag-self-hosting-completion DA-α-007/008 でも同様、SHA 直接参照で代替 articulate 済)
- rollbackTag: `operational-protocol-system/DA-α-001-rollback-target` (= 同上、未 landing。preJudgementCommit SHA 直接参照で rollback 経路確保)
- implementationCommits:
  - `9d106564649fac499cc96285cf8c08d64d8315eb` — M1 全実装 (= 4 doc 新設 + DA-α-001 entry + checklist update + HANDOFF update)
  - `d6935e2150e4e8f0cb38299d384eede749777bce` — M1 後 docs:generate 反映 (= M1-4 [x] flip 反映 + KPI sync)
  - `f4acd1ac7` — doc-registry.json 4 doc entry 追加 (= push fix follow-up)

### 振り返り (Phase M1 完了 / 2026-05-04)

- 観測点 1 (M1-1 肯定): ✅ **達成**。`task-class-catalog.md` で 6 Task Class (TC-1 Planning / TC-2 Refactor / TC-3 Bug Fix / TC-4 New Capability / TC-5 Incident Discovery / TC-6 Handoff) を §1 summary table + §2-§7 詳細で articulate。各 class に scope + 入口/出口条件 + typical complexity range + 主な antipattern を articulate
- 観測点 2 (M1-2 肯定): ✅ **達成**。`session-protocol.md` §3.2 (L1 軽修正 routing) / §3.3 (L2 通常変更 routing) / §3.4 (L3 重変更 routing) で L 別 articulate 完成
- 観測点 3 (M1-3 肯定): ✅ **達成**。`complexity-policy.md` §1 summary table + §5 use-case mapping table で L1/L2/L3 と既存 5 文書の使い分けを articulate (= 各文書の触る/触らない/update articulation)
- 観測点 4 (M1-4 反証): ✅ **達成**。4 doc 全 landing 後 `docs:check` PASS (= 60 KPI all OK / Hard Gate PASS、本 commit 後 verify)
- 観測点 5 (M1-5 反証): ✅ **達成**。本 session 自体が synthetic session scenario の 1 instance (= self-application)。session-protocol.md §1 開始 (= context 復元 + Task Class TC-4 New Capability 判定 + Complexity L2 通常変更 判定) → §3.3 L2 routing → §4 終了 articulation の trace が verify 可能。drawer Pattern 1 (Commit-bound Rollback) + Pattern 2 (Scope Discipline) + Pattern 4 (Honest Articulation) を本 PR 6 全体で application instance として articulate
- **判定**: **正しい** (= 5 観測点すべて達成、scope 拡大なし、PR 6 単独 commit + 1 push fix follow-up commit で完遂)
- 学習:
  - **doc-registry obligation の事前確認**: 新 references/ doc を追加する PR では doc-registry.json update を pre-flight check に articulate 必要 (= 本 PR で push fail → fix commit が follow-up したが、事前 check で 1 commit に統合可能だった)
  - **4 doc 一括 landing の判断は正しかった**: 相互参照が必須な protocol family は逐次 landing で broken link risk があり、一括 landing が最適 (= 候補 1 採用根拠の retroactive verification)
  - **self-application の possibility**: 本 session が session-protocol の synthetic test scenario として機能 (= M1-5 観測点が retroactively self-applicable な構造、後続 M2-M5 でも同様の self-test 可能)
- retrospectiveCommit: 本 wrap-up commit (= 振り返り articulation を含む follow-up commit)
- retrospectiveTag: `operational-protocol-system/DA-α-001-retrospective` (= 同 infrastructure 制約で未 landing、SHA 直接参照で articulate)

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 判定 = "正しい" のため軌道修正なし、本 PR 6 単独 + push fix follow-up で完遂)

---

## DA-α-002: M2 既存 5 文書 routing 固定方針

**status**: active

### 判断時 (2026-05-04 / Phase M2)

- 候補:
  1. session-protocol.md 単独拡張 (= 既存 doc に M2 deliverable を articulate refine)
  2. 新 doc 追加 (= per-level routing を別 doc 化、e.g. `routing-policy.md`)
  3. 既存 5 文書 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit) 自体に articulate 追加
- **採用案: 候補 1** (= session-protocol.md 単独拡張)
- 判断根拠:
  - 事実 1: M1 で session-protocol.md §3 (実行中) + §4 (終了・引き継ぎ) + §7 (5 文書 routing) を既に articulate 済 (= L1/L2/L3 別の skeleton landed)。M2 は **既存 articulate を refine** する scope であり、新 doc 追加は AAG-REQ-ANTI-DUPLICATION 違反 risk
  - 事実 2: M2 plan §scope 外で「各 file の articulate 内容そのものは改変しない (= 既存内容維持、使い方だけ articulate)」と明示。既存 5 文書自体を改変する候補 3 は scope 違反
  - 事実 3: 候補 2 (新 doc) は M2 plan の deliverable list (= session-protocol.md 拡張のみ) と整合せず、M2 scope を超える
  - 事実 4: M1 の self-application observation で「session-protocol.md が L1/L2/L3 routing の canonical」と確立済 (= drawer Pattern 4 honest articulation)
- 想定リスク:
  - 最大被害: session-protocol.md が肥大化し reader (= AI session) が必要 section に reach できない。mitigation = §1-§8 の structure を維持、L 別 routing は §3 既存 + §4 既存 を refine、新 section 追加は最小化
  - 二番目: Session 終了 / 引き継ぎ protocol の L 別 articulate が冗長で読みにくい。mitigation = table 形式で per-level required artifacts を articulate (= 散文より dense)
- 振り返り観測点 (4 点 = M2 観測点 4 件と同期):
  - 1 (M2-1 肯定): 3 routing pattern (L1/L2/L3) が articulate されている (= session-protocol.md §1.1 + §3.2/§3.3/§3.4 で table 形式)
  - 2 (M2-2 肯定): Session 終了 protocol が 3 level 全件 articulate されている (= §4.1 が L 別 required artifacts table)
  - 3 (M2-3 肯定): 引き継ぎ protocol が双方向 articulate されている (= §4.2 引き継ぐ側 + §4.4 引き継がれる側)
  - 4 (M2-4 反証): synthetic scenario で全 routing が再現可能 (= M1-5 と同様 self-application、本 session 自体が L2 routing instance)

### 5 軸 articulation

- **製本** (canonical): `session-protocol.md` が canonical (= 既存 doc の refine、新 doc 追加なし)
- **依存方向**: 上位 = M1 で landed した protocol family (task-protocol-system / task-class-catalog / complexity-policy)、下位 = 主アプリ改修 user の day-to-day session lifecycle
- **意味**: 「既存 5 文書 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit) を level 別にどう使うか の prescriptive routing articulate」
- **責務**: 既存 5 文書の **使い方** articulate のみ、各文書の articulate 内容は触らない (= M2 plan §scope 外整合)
- **境界**: M2 は session-protocol.md 拡張のみ、M3 (= 動的昇格・降格) / M4 (= 5 protocol) / M5 (= drawer `_seam`) は別 Phase

### Commit Lineage

- judgementCommit: `8c041ecf9` (= M2 landing commit、session-protocol.md 拡張 + DA-α-002 entry + checklist + HANDOFF update)
- preJudgementCommit: `f1286ace4b83fff79cc84e2bd34e1c551182971d` (= M1 wrap-up regen、M2 直前 HEAD)
- judgementTag: `operational-protocol-system/DA-α-002-judgement` (= AI session infrastructure 制約で未 landing、SHA 直接参照で代替)
- rollbackTag: `operational-protocol-system/DA-α-002-rollback-target` (= 同上、preJudgementCommit SHA で rollback 経路確保)
- implementationCommits:
  - `8c041ecf9` — M2 landing (= session-protocol.md §1.1 + §1.2 + §4.1 + §4.2 + §4.3 + §4.4 拡張、DA-α-002 entry、checklist + HANDOFF update)

### 振り返り (Phase M2 完了 / 2026-05-04)

- 観測点 1 (M2-1 肯定): ✅ **達成**。`session-protocol.md` §1.1 で L1/L2/L3 別 read order が table 形式で articulate (= 各 level の rationale 含む)、§3.2/§3.3/§3.4 で routing 詳細
- 観測点 2 (M2-2 肯定): ✅ **達成**。§4.1 で L 別 required artifacts table articulated (= L1: checklist+push / L2: +HANDOFF / L3: +decision-audit + DA Lineage update)
- 観測点 3 (M2-3 肯定): ✅ **達成**。§4.3.1 (引き継ぐ側 = HANDOFF 3 fields + 必須 check 5 件) + §4.3.2 (引き継がれる側 = L 別 read item table + 必須 check 4 件) で双方向 articulated
- 観測点 4 (M2-4 反証): ✅ **達成**。本 session 自体が L2 routing instance の synthetic scenario として self-applicable (= TC-4 New Capability + L2 通常変更 で session-protocol §1.1 L2 read → §3.3 L2 routing → §4.1 L2 required artifacts → §4.3.1 引き継ぐ側 の trace を実 commit lineage で verify 可能)
- **判定**: **正しい** (= 4 観測点すべて達成、scope 拡大なし、新 doc 追加なし、session-protocol.md 単独拡張で完遂、drawer Pattern 5 scope discipline 整合)
- 学習:
  - **既存 doc refine の有効性**: M1 で landed した session-protocol.md を refine する pattern が AAG-REQ-ANTI-DUPLICATION 整合 + reader cognitive load 抑制で機能 (= 候補 1 採用根拠の retroactive verification)
  - **per-level required artifacts の table 化**: L 別の articulate を散文ではなく table で articulate することで「読み比べ」が容易化、reader (= AI session) が own level に reach しやすい
  - **双方向 articulate の必要性**: 引き継ぐ側だけでなく **引き継がれる側** の必須 check を articulate することで、handoff の lose を「次 session 側の責任」としても articulate 可能 (= ad-hoc handoff 解消の本質的 mechanism)
  - **self-application が retroactively 機能 (M1 学習の確認)**: 本 session が L2 routing instance として synthetic test に成り、後続 M3-M5 でも同様の self-test pattern 活用可
- retrospectiveCommit: 本 wrap-up commit (= DA-α-002 振り返り articulation を含む follow-up commit)
- retrospectiveTag: `operational-protocol-system/DA-α-002-retrospective` (= 同 infrastructure 制約で未 landing、SHA 直接参照で articulate)

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 判定 = "正しい" のため軌道修正なし、本 commit 単独で完遂)

---

## DA-α-003: M3 動的昇格・降格ルール articulate 方針

**status**: active

### 判断時 (2026-05-04 / Phase M3)

- 候補:
  1. complexity-policy.md 単独拡張 (= 既存 §4 を refine、昇格・降格 trigger + 手順を complexity-policy 内に articulate)
  2. session-protocol.md と complexity-policy.md 両方拡張 (= 昇格手順を session lifecycle に組み込む)
  3. 新 doc 追加 (= `level-transition-policy.md` 等の dynamic transition 専門 doc)
- **採用案: 候補 1** (= complexity-policy.md 単独拡張)
- 判断根拠:
  - 事実 1: M2 で session-protocol.md を拡張する pattern が成功 (= 既存 doc refine、新 doc 追加なし、AAG-REQ-ANTI-DUPLICATION 整合)。M3 でも同 pattern を適用 = complexity-policy.md 単独拡張
  - 事実 2: 昇格・降格 trigger は **complexity の判定軸** に直接 belong (= L1/L2/L3 transition が complexity-policy の核心 scope)。session-protocol に置くと「何をするか」と「どの重さか」が混在 risk
  - 事実 3: M3 plan §scope 外で「自動昇格判定 (= AI が機械的に昇格判断) は本 Phase scope 外、AI judgement に委ねる」と明示。articulate のみが scope、guard 化 / 自動化は M5 以降の judgement
  - 事実 4: 候補 3 (新 doc) は AAG-REQ-ANTI-DUPLICATION 違反 risk + drawer Pattern 5 (意図的 skip + rationale) を articulate せず追加することは scope discipline 違反
- 想定リスク:
  - 最大被害: complexity-policy.md §4 が肥大化し reader が trigger 一覧に reach できない。mitigation = 昇格 / 降格 / 手順を §4.1/§4.2/§4.3 に分節、table 形式で articulate
  - 二番目: trigger の自動判定 expectation が読み手に発生 (= AI が機械判定すると誤読)。mitigation = 各 trigger に「AI judgement」articulate + scope 外明示
- 振り返り観測点 (4 点 = M3 観測点 4 件と同期):
  - 1 (M3-1 肯定): 昇格 trigger ≥ 6 件 articulate (= complexity-policy.md §4.1 で 6+ 件 list、各々の trigger 例 + 該当 level 移行の articulate)
  - 2 (M3-2 肯定): 降格 trigger ≥ 4 件 articulate (= §4.2 で 4+ 件 list、各々の trigger 例 + 該当 level 移行)
  - 3 (M3-3 肯定): 昇格時手順 articulate (= §4.3 で「途中で plan.md / decision-audit を起こす経路」を step 化)
  - 4 (M3-4 反証): synthetic task で trigger 該当 → 手順実行が verify 可能 (= 本 session の M2 → M3 着手時に L2 を継続維持の判定が trigger 観点で trace 可能、self-application instance)

### 5 軸 articulation

- **製本** (canonical): `complexity-policy.md` が canonical (= 既存 doc refine、新 doc 追加なし)
- **依存方向**: 上位 = M1/M2 で landed した protocol family、下位 = 主アプリ改修 user の level transition 判断
- **意味**: 「complexity level が **session 中に変わる** ことを institutionalize、昇格 / 降格 trigger + 昇格手順 articulate」
- **責務**: trigger articulate + 手順 articulate のみ、自動判定 / guard 化は scope 外 (= M3 plan §scope 外整合、AI judgement)
- **境界**: M3 は complexity-policy.md 拡張のみ、M4 (= 5 protocol) / M5 (= drawer `_seam`) は別 Phase

### Commit Lineage

- judgementCommit: TBD (= M3 landing commit、commit 後に実 sha update)
- preJudgementCommit: TBD (= M2 wrap-up regen の HEAD = `b619a505e`)
- judgementTag: `operational-protocol-system/DA-α-003-judgement` (= AI session infrastructure 制約で未 landing、SHA 直接参照で代替)
- rollbackTag: `operational-protocol-system/DA-α-003-rollback-target` (= 同上、preJudgementCommit SHA で rollback 経路確保)
- implementationCommits:
  - TBD — M3 全実装 (= complexity-policy.md 拡張 + DA-α-003 entry + checklist update + HANDOFF update)

### 振り返り (Phase M3 完了 / TBD)

> Phase M3 完了直前に追記、observation 4 件すべて実測。

- 観測点 1〜4: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 起票時点で軌道修正なし、Phase 進行中に sub-events articulate 必要時に追記)
