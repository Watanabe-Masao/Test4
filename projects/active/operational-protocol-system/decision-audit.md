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
| DA-α-004 | Phase M4 | M4 Task Class 5 protocol articulate 方針 | active |
| DA-α-005 | Phase M5 | M5 drawer `_seam` 統合 + guard 化判断 | active |

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

- judgementCommit: `2a5033f98` (= M3 landing commit、complexity-policy.md 拡張 + DA-α-003 entry + checklist + HANDOFF update)
- preJudgementCommit: `b619a505ed81ccffce555cc00933f4b270948857` (= M2 wrap-up commit、M3 直前 HEAD)
- judgementTag: `operational-protocol-system/DA-α-003-judgement` (= AI session infrastructure 制約で未 landing、SHA 直接参照)
- rollbackTag: `operational-protocol-system/DA-α-003-rollback-target` (= 同上、preJudgementCommit SHA で rollback 経路確保)
- implementationCommits:
  - `2a5033f98` — M3 landing (= complexity-policy.md §4 全面 refine + DA-α-003 entry)

### 振り返り (Phase M3 完了 / 2026-05-04)

- 観測点 1 (M3-1 肯定): ✅ **達成**。`complexity-policy.md` §4.1 で 10 件昇格 trigger articulated (= ≥ 6 件 を 4 件超過、各 trigger に P-番号 + 性質 + level 移行 + 該当例)
- 観測点 2 (M3-2 肯定): ✅ **達成**。§4.2 で 7 件降格 trigger articulated (= ≥ 4 件 を 3 件超過、各 trigger に D-番号)
- 観測点 3 (M3-3 肯定): ✅ **達成**。§4.3 (昇格時手順 = L1→L2 / L2→L3 / L1→L3 直接) + §4.4 (降格時手順) + §4.5 (articulation template) + §4.6 (AI judgement 範囲) で 3 transition path + AI judgement 境界 articulate
- 観測点 4 (M3-4 反証): ✅ **達成**。本 session の M2 → M3 着手で「L2 継続維持」判定が articulate されている (= 本 wrap-up 全体が L2 通常変更 で完遂、trigger §4.1 P5/P6 (multi-axis 拡張 / checklist 局所外) が観察されたが「同 protocol family 内」の articulate refine で吸収可能と判定 → L2 継続)。self-application instance として trace 可能
- **判定**: **正しい** (= 4 観測点すべて達成、scope 拡大なし、新 doc 追加なし、complexity-policy.md 単独拡張で完遂、drawer Pattern 5 scope discipline 整合、AAG-REQ-NON-PERFORMATIVE (= AI judgement に委ねる) 整合)
- 学習:
  - **trigger ID 化の有効性**: P1-P10 / D1-D7 の ID articulate により、user escalate 時の articulation template (§4.5) で「P5 trigger により L2 → L3 切替」のような precise reference が可能化 (= drawer Pattern 4 honest articulation 強化)
  - **昇格 / 降格の非対称性 articulate**: 昇格は新 artifact 起票必須 (= L2 で plan.md / L3 で decision-audit.md)、降格は既起票 artifact retire 不要 (= 既起票 = fact、削除すると lose)。M3 で初めて articulated、後続 M4-M5 でも同種非対称性 pattern 適用候補
  - **AI judgement 範囲 articulate の必要性**: 「自動判定 OK / NG」境界を §4.6 で明示することで、reader (= AI session) が AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 違反 risk を事前 articulate (= guard なしでも protocol 自体が boundary 機械化)
  - **self-application が再々度機能 (M1/M2 学習の確認)**: 本 session が L2 routing instance として M3 trigger を能動的に観察 (P5/P6) + 「L2 継続維持」判定 articulate に成立、後続 M4-M5 でも同様 self-test pattern 活用可
- retrospectiveCommit: 本 wrap-up commit (= DA-α-003 振り返り articulation を含む follow-up commit)
- retrospectiveTag: `operational-protocol-system/DA-α-003-retrospective` (= 同 infrastructure 制約で未 landing、SHA 直接参照)

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 判定 = "正しい" のため軌道修正なし、本 commit 単独で完遂)

---

## DA-α-004: M4 Task Class 5 protocol articulate 方針

**status**: active

### 判断時 (2026-05-04 / Phase M4)

- 候補:
  1. task-class-catalog.md 単独拡張 (= M2/M3 と同 pattern、catalog 内に 5 protocol section 追加)
  2. **5 sub-doc 別 file 化** (= `protocols/<class>-protocol.md` 5 file 新設、catalog は index)
  3. session-protocol.md 拡張 (= 5 protocol を session lifecycle 内に articulate)
- **採用案: 候補 2** (= 5 sub-doc 別 file 化、ただし TC-5 Incident Discovery は scope 外、TC-6 Handoff は session-protocol.md §4 で代替)
- 判断根拠:
  - 事実 1: M4 plan §deliverable で「各 sub-doc」が articulate hint 済 (= 「`task-class-catalog.md` 配下 or 各 sub-doc」と articulate、後者を採用)
  - 事実 2: 5 protocol は **Task Class 別の独立 concern** (= Planning ≠ Refactor ≠ Bug Fix ≠ New Capability ≠ Handoff)。catalog 単独拡張は doc が 800+ 行に肥大化 risk + reader navigation cost (= drawer Pattern 4 honest articulation)
  - 事実 3: M1 precedent (= 4 別 doc 新設) と整合。protocols/ directory が 4 doc → 8 doc へ articulate refine、index = task-class-catalog.md は維持
  - 事実 4: 候補 3 (session-protocol.md 拡張) は scope mixing (= session lifecycle vs task class) で reader 困惑 risk
  - 事実 5: TC-6 Handoff は既 session-protocol.md §4 で articulate 済、別 file 不要 (= AAG-REQ-ANTI-DUPLICATION 整合)。**4 protocol を新 file 化**、Handoff は session-protocol.md §4 を refine。TC-5 Incident Discovery は drawer Pattern 5 (意図的 skip + rationale): incident discovery は TC-3/TC-2/TC-4 への分岐 task で独立 protocol 不要
- 想定リスク:
  - 最大被害: 4 新 file 追加で doc-registry / README index update 漏れ (= M1 で発生した push fail と同種)。mitigation = M1 学習 (= doc-registry 事前確認) を活用、本 PR で 4 file landing と doc-registry update を 1 commit に統合
  - 二番目: 各 protocol が浅く articulate されて self-application instance hint が不足。mitigation = 各 protocol §4 で drawer Pattern 1-6 application instance hint + §5 で Complexity Policy (M3) との対応 articulate
- 振り返り観測点 (3 点 = M4 観測点 3 件と同期):
  - 1 (M4-1 肯定): 4 protocol articulated (= planning / refactor / bug-fix / new-capability) + Handoff Protocol が session-protocol.md §4 articulate で代替確認、計 5 protocol articulate
  - 2 (M4-2 肯定): 各 protocol に drawer Pattern 1-6 application instance hint articulated
  - 3 (M4-3 肯定): 各 protocol に Complexity Policy (M3) との対応 (= 該当 P-trigger / D-trigger / typical complexity range) articulated

### 5 軸 articulation

- **製本** (canonical):
  - `references/05-aag-interface/protocols/planning-protocol.md` (= TC-1 canonical)
  - `references/05-aag-interface/protocols/refactor-protocol.md` (= TC-2 canonical)
  - `references/05-aag-interface/protocols/bug-fix-protocol.md` (= TC-3 canonical)
  - `references/05-aag-interface/protocols/new-capability-protocol.md` (= TC-4 canonical)
  - TC-6 Handoff = `session-protocol.md` §4 (= 既 canonical)
  - TC-5 Incident Discovery = task-class-catalog.md §6 のみ (= drawer Pattern 5 意図的 skip + rationale)
- **依存方向**: 上位 = M1/M2/M3 で landed した protocol family + drawer Pattern 1-6、下位 = 主アプリ改修 user の day-to-day task execution
- **意味**: 「Task Class 別の standardized 手順 articulate、catalog から sub-doc に深掘り経路を提供」
- **責務**: 4 sub-doc + Handoff section refine、TC-5 Incident Discovery は scope 外明示
- **境界**: M4 は 4 protocol sub-doc + Handoff refine のみ、M5 (= drawer `_seam`) は別 Phase

### Commit Lineage

- judgementCommit: `921740167` (= M4 landing commit、4 sub-doc + catalog refine + doc-registry/README index update)
- preJudgementCommit: `27a444bf438a5d1f3e1fa971add284ccc7c39a81` (= M3 wrap-up commit、M4 直前 HEAD)
- judgementTag: `operational-protocol-system/DA-α-004-judgement` (= AI session infrastructure 制約で未 landing、SHA 直接参照)
- rollbackTag: `operational-protocol-system/DA-α-004-rollback-target` (= 同上、preJudgementCommit SHA で rollback 経路確保)
- implementationCommits:
  - `921740167` — M4 landing (= 4 sub-doc 新設 + task-class-catalog refine + doc-registry + README index + DA-α-004 entry + checklist + HANDOFF update を atomic 1 commit で完遂)

### 振り返り (Phase M4 完了 / 2026-05-04)

- 観測点 1 (M4-1 肯定): ✅ **達成**。4 sub-doc landed (planning / refactor / bug-fix / new-capability) + TC-6 Handoff = session-protocol.md §4 既 articulate 確認、計 5 protocol articulate。TC-5 Incident Discovery は drawer Pattern 5 (意図的 skip + rationale) で task-class-catalog §6 articulate
- 観測点 2 (M4-2 肯定): ✅ **達成**。各 protocol §3 で drawer Pattern 1-6 application instance hint articulated (= table 形式、6 pattern × 4 protocol = 24 application hint)
- 観測点 3 (M4-3 肯定): ✅ **達成**。各 protocol §4 で complexity-policy (M3) との対応 articulated (= 該当 P-trigger / D-trigger / typical complexity range、4 protocol × 3 sub-section = 12 articulation)
- **判定**: **正しい** (= 3 観測点すべて達成、scope 拡大なし、4 sub-doc 別 file 化 + TC-5 scope 外 articulate + TC-6 既存活用 で完遂、drawer Pattern 2/4/5 整合、AAG-REQ-ANTI-DUPLICATION 整合)
- 学習:
  - **M1 学習の適用成功**: doc-registry + README index update を **本 commit に統合** することで、M1 で発生した push fail × 2 を回避。pre-flight check (= 新 references/ doc 追加時に doc-registry / README 同 commit 内 update) が pattern として成立
  - **TC 別の独立 doc 化基準**: 5 protocol のうち 4 は独立 sub-doc が妥当、1 (TC-5) は task-class-catalog §6 内 articulate で十分と判定。判定基準 = 「task として完結するか、別 task に分岐するか」(= 後者は独立 doc 不要)
  - **既存 articulate との重複回避**: TC-6 Handoff は M2 で session-protocol §4 articulate 済、別 file 化は AAG-REQ-ANTI-DUPLICATION 違反 risk と判定。本 PR では既存 articulate を canonical 維持、catalog §1 + §7 で pointer のみ articulate
  - **self-application が四度目機能 (M1/M2/M3 学習の確認)**: 本 session が L2 routing instance として、Step 1-4 (構想 → 調査 → 比較検討 → 採用) を session 内で trace 可能 (= TC-1 Planning protocol § 2 を本 PR の DA-α-004 articulate 自体が application instance、再帰的 self-application 成立)
- retrospectiveCommit: 本 wrap-up commit (= DA-α-004 振り返り articulation を含む follow-up commit)
- retrospectiveTag: `operational-protocol-system/DA-α-004-retrospective` (= 同 infrastructure 制約で未 landing、SHA 直接参照)

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 判定 = "正しい" のため軌道修正なし、本 commit 単独で完遂)

---

## DA-α-005: M5 drawer `_seam` 最小統合 + guard 化判断 方針

**status**: active

### 判断時 (2026-05-04 / Phase M5)

- 候補:
  1. **新 doc `seam-integration.md` 化** (= taskHint / consumerKind / sourceRefs articulate + Task Class × drawer routing matrix + guard 化判断 を独立 doc 化)
  2. task-protocol-system.md 拡張 (= 上位 index doc 内に section 追加)
  3. 4 protocol sub-doc に分散 articulate (= 各 sub-doc に該当 drawer routing 追記)
- **採用案: 候補 1** (= 新 doc `seam-integration.md` 化)
- 判断根拠:
  - 事実 1: M5 deliverable 3 件 (= seam articulate / routing matrix / guard 化判断) は **cross-cutting concern** (= 複数 Task Class × drawer 軸の交差)、独立 doc が reader navigation 整合
  - 事実 2: 候補 2 (task-protocol-system.md 拡張) は上位 index の責務範囲を超える (= index は pointer 役割、cross-cutting 詳細は別 doc に分離)
  - 事実 3: 候補 3 (4 protocol 分散) は同 articulate を 4 doc に重複 risk (= AAG-REQ-ANTI-DUPLICATION 違反)
  - 事実 4: M4 で TC-5 を独立 doc 化せず drawer Pattern 5 (skip + rationale) で catalog §6 articulate 済の precedent あり、本 M5 でも drawer Pattern 5 を guard 化判断 articulate に適用可能
  - 事実 5: AAG drawer (= `docs/generated/aag/rule-index.json`) で `_seam` の 3 field (taskHint / consumerKind / sourceRefs) は既 articulate 済、本 M5 は **既存 articulate を Task Class lens で再 articulate** する scope (= 不可侵原則 1 整合、AAG framework 改変なし)
- 想定リスク:
  - 最大被害: routing matrix の articulate が空疎 (= 「Refactor → byImport drawer 優先」程度の薄い articulate)。mitigation = 各 routing entry に **rationale + use-case example** を articulate (= drawer Pattern 4)
  - 二番目: guard 化判断が「TBD」articulate のままで未確定。mitigation = §4 で **value > cost 評価 + Yes/No 結論 + 再起動 trigger** を articulate (= drawer Pattern 4 + Pattern 5)
- 振り返り観測点 (3 点 = M5 観測点 3 件と同期):
  - 1 (M5-1 肯定): taskHint / consumerKind / sourceRefs の意味が articulate されている (= 既存 8/4/array 値を Task Class lens で articulate)
  - 2 (M5-2 肯定): 5 Task Class × drawer 軸 (= taskHint × consumerKind の crossover) routing matrix articulated
  - 3 (M5-3 肯定): guard 化判断が articulated (Yes/No + rationale、drawer Pattern 4 適用)

### 5 軸 articulation

- **製本** (canonical): `references/05-aag-interface/protocols/seam-integration.md` (= 新 doc canonical)
- **依存方向**: 上位 = AAG drawer `_seam` (= 既 articulate 済、改変なし) + M1-M4 で landed した protocol family、下位 = 主アプリ改修 user の day-to-day drawer reach
- **意味**: 「AAG drawer `_seam` を Task / Session / Complexity protocol lens で再 articulate、reader が Task Class から drawer reach する経路 articulate」
- **責務**: routing matrix articulate + guard 化判断、AAG drawer 自身の改変なし (= 不可侵原則 1)
- **境界**: M5 は seam-integration.md 単独 + task-protocol-system.md §7 pointer のみ、AAG drawer 改変は scope 外

### Commit Lineage

- judgementCommit: TBD (= M5 landing commit)
- preJudgementCommit: TBD (= M4 wrap-up commit、M5 直前 HEAD)
- judgementTag: `operational-protocol-system/DA-α-005-judgement` (= AI session infrastructure 制約で未 landing、SHA 直接参照で代替)
- rollbackTag: `operational-protocol-system/DA-α-005-rollback-target` (= 同上、preJudgementCommit SHA で rollback 経路確保)
- implementationCommits:
  - TBD — M5 全実装 (= seam-integration.md 新設 + doc-registry + README index update + task-protocol-system.md §7 pointer + DA-α-005 entry + checklist + HANDOFF update)

### 振り返り (Phase M5 完了 / TBD)

> Phase M5 完了直前に追記、observation 3 件すべて実測。

- 観測点 1〜3: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 起票時点で軌道修正なし、Phase 進行中に sub-events articulate 必要時に追記)
