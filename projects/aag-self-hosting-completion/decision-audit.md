# decision-audit — aag-self-hosting-completion

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §1 不可侵原則 + `references/03-guides/decision-articulation-patterns.md` Pattern 1 (Commit-bound Rollback) + Pattern 4 (Honest Articulation)。
> 1 entry = 1 判断 = 1 振り返り。**観測なき articulation を禁ず**。

## 必須要件

### 判断時 (Phase / 軸 着手時)

- 候補 / 採用案 / 判断根拠 (事実 + 推論)
- 想定リスク (採用案外れ時の最大被害)
- 振り返り観測点 **最低 5 つ** (1 つ以上は反証可能、不可侵原則 6)
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
git tag -a "aag-self-hosting-completion/DA-α-NNN-rollback-target" -m "preJudgement" <preJudgementSha>
git tag -a "aag-self-hosting-completion/DA-α-NNN-judgement"      -m "judgement landing" <judgementSha>
git tag -a "aag-self-hosting-completion/DA-α-NNN-retrospective"  -m "retrospective"  <retrospectiveSha>
```

`git checkout aag-self-hosting-completion/DA-α-NNN-rollback-target` で判断前に物理的に戻れる。

---

## 判断 entry 一覧

| ID | Phase / 軸 | 判断対象 | status |
|---|---|---|---|
| DA-α-000 | Phase 0 | 本 program の進行モデル (drawer Pattern 1 application + AAG Pilot DA institution からの継承判断) | active |
| DA-α-001 | Phase R0 | 境界定義先行 着手判断 (= 構造変更前に 5 README + CURRENT_PROJECT.md + CLAUDE.md で 3 tree 境界 articulate) | active |
| DA-α-002 | Phase R1 | AAG sub-tree relocation 着手判断 (= 9 doc 物理移動 + 101 inbound update) | planned |
| DA-α-003 | Phase R2 | AAG public interface relocate 判断 (= references/05-aag-interface/ migrate) | planned |
| DA-α-004a | Phase R3a | 5 directory rename + 1,000+ inbound update 判断 | planned |
| DA-α-004b | Phase R3b | `*.generated.md` 命名規約適用 + generator 出力先変更 判断 | planned |
| DA-α-004c | Phase R3c | 旧 mention 撤退 (PR template / CLAUDE.md / .github/*) 判断 | planned |
| DA-α-004d | Phase R3d | guard / collector path + doc-registry / manifest + 新 guard landing 判断 | planned |
| DA-α-005 | Phase R4 | per-element directory + dashboard layer + element taxonomy 判断 | planned |
| DA-α-006 | Phase R5 | operational-protocol-system project resume + skeleton fill 判断 (= scope 縮小 articulated) | planned |
| DA-α-007 | Phase R6 | AAG self-hosting closure articulate update + projects/ split + template migrate 判断 | planned |
| DA-α-008 | Phase R7 | 統合 guard + verify + archive 判断 | planned |

---

## DA-α-000: 本 program の進行モデル決定

**status**: active

### 判断時 (2026-05-02 / Phase 0)

- 候補:
  1. 人間承認 gate モデル (3+ Gate)
  2. AI judgement only (履歴なし)
  3. AI judgement + retrospective verification
  4. **AI judgement + retrospective + commit-bound rollback** (= drawer Pattern 1 + AAG Pilot DA institution からの継承)
- 採用案: 候補 4
- 判断根拠:
  - 事実 1: AAG Pilot (= `projects/completed/aag-platformization/`) で同 institution が成立、19+ reframes に対し rollback 0 件で機能 verify 済 (= drawer Pattern 1 の application instance が実証)
  - 事実 2: drawer (= `references/03-guides/decision-articulation-patterns.md`) Pattern 1 が一般 trigger と適用領域を articulate 済 (= 領域 agnostic、本 project でも reuse 可能)
  - 事実 3: 不可侵原則 7「起動・archive 判断は user 領域、AI 単独で起動・archive しない」と整合 (= AI 単独進行 + 最終 archive 人間承認)
  - 事実 4: operational-protocol-system project でも同 institution で進行中 (= DA-α-000 = 進行モデル landing)、本 project も同 institution 採用で structural separation 整合
- 想定リスク:
  - 最大被害: judgementCommit / Tag 管理 overhead が R-phase 進行を鈍化、rollback tag が dead reference 化。mitigation = AAG Pilot で実証済 + operational-protocol-system bootstrap で適用済 (rollback 0 件でも DA institution は psychological safety + scope discipline として機能)
  - 二番目: tag prefix `aag-self-hosting-completion/DA-α-` が既存 prefix (= aag-platformization, operational-protocol-system) と区別されない混同 risk。mitigation = prefix 完全一致 + repo 内 tag list で区別可能
- 振り返り観測点 (5 点):
  - 1 (肯定): 全 R-phase の各 DA で commit lineage が漏れず記録される
  - 2 (肯定): 1 件以上の DA で判定 "間違い" or "部分的" + 軌道修正 entry が活用される (= AAG Pilot DA-α-005 で precedent)
  - 3 (反証): 全 R-phase で judgementCommit を amend した事故 0 件
  - 4 (反証): 「overhead」を理由に DA を skip した entry 0 件
  - 5 (反証): rollback tag が一度も使われずすべて "正しい" 判定だと dead weight (= AAG Pilot 後の本 project でも同様、Pattern 1 の psychological safety value を articulate)

### 5 軸 articulation

- **製本** (canonical): 本 program 内 `decision-audit.md` が canonical (派生先なし)
- **依存方向**: 上位 = `plan.md` §1 + drawer Pattern 1、下位 = なし。AAG Pilot + operational-protocol-system DA institution からの一方向継承
- **意味**: 「AI 判断履歴 + 物理 rollback 経路を持つ institution の articulation」(= AAG Pilot DA-α-000 + operational-protocol-system DA-α-000 の領域 agnostic 拡張)
- **責務**: institution の articulate + 1 entry のみ self-dogfood
- **境界**: 本 project 内のみ、横展開対象外 (= 横展開 = drawer Pattern 1 経由で各 program が自分で landing)

### Commit Lineage

- judgementCommit: `b19518c` (= bootstrap commit、本 entry を含む実装 commit)
- preJudgementCommit: `aa2c62d` (= bootstrap 直前、references/ light navigation improvement commit)
- judgementTag: `aag-self-hosting-completion/DA-α-000-judgement` (`b19518c` に annotated tag landing 済)
- rollbackTag: `aag-self-hosting-completion/DA-α-000-rollback-target` (`aa2c62d` に annotated tag landing 済)
- implementationCommits:
  - `b19518c` — bootstrap 全実装 (skeleton 6 doc + breaking-changes.md + DA-α-000 + open-issues 行追加 + operational-protocol-system pause articulate)

### 振り返り (本 program archive 直前 / TBD)

> R1-R7 完了 + 最終レビュー直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 — 構造案 refinement (= 本 session 中 sub-event、forward-fix)

| date | event | 対応 |
|---|---|---|
| 2026-05-02 | bootstrap 直後の構造案で `aag/interface/*` (= drawer / protocols / operations) を articulate、ただし「主アプリ改修者 not read」と articulate した aag/ 配下に「主アプリ改修者も使う」doc を配置 = 境界矛盾 (= 物理配置から AI 誤読 risk) を user 指摘で identify | forward-fix: `aag/interface/*` → `references/05-aag-interface/*` に articulate update、aag/ は framework 本体に純化 (`_internal/` + `_framework/`)。plan.md §3 R2 + §5 関連実装 path table 更新済 (本 commit) |
| 2026-05-02 | 「逆戻り防止 + 定着 mechanism」を user articulate、各 R-phase で landing する Hard guard を ratchet-down baseline=0 で 体系化 | forward-fix: plan.md §6 新設 (= 定着 mechanism + 逆戻り防止 guard、14 guard 一覧)、checklist.md 各 R-phase に guard checkpoint 追加 |
| 2026-05-02 | `*.generated.md` 命名規約を user articulate (= 手書き / 機械生成を file 名で明示) | forward-fix: plan.md §3 R3 articulate update、04-tracking/ 配下全 generated file に suffix 適用 (= R3) |
| 2026-05-02 | `element-taxonomy.md` で ID prefix (WID / CHART / ENG / PAGE / FLOW) 正本化 user articulate | forward-fix: plan.md §3 R4 articulate update + R4 deliverable 追加 |
| 2026-05-02 | `projects/` を active/ + completed/ split + `_template/` 新構造 migrate user articulate | forward-fix: plan.md §3 R6 articulate update + checklist.md R6 checkpoint 追加 |
| 2026-05-02 | `CURRENT_PROJECT.md` を pointer 限定 + 機械検証 guard 化 user articulate | forward-fix: plan.md §3 R6 articulate update + projectsStructureGuard 追加 |
| 2026-05-02 | **旧経路 / 旧制度 撤退プラン** を詰める user articulation (= 内容保持で物理 location 移動するが、旧 path / 旧 convention / 旧 mention の完全撤退は migration の通常範囲) | forward-fix: plan.md §7 新設 (= legacy retirement plan、撤退対象 4 種類 + per-R-phase timing + transitional period + archive exception + PR template / .github 撤退 articulate)、breaking-changes.md §5 拡充 (= 5.1-5.6 の 6 sub-section)。R-phase 完了 = その phase の撤退対象 0 件 articulate (= 撤退 verify 3 軸: 物理 / string / functional) |
| 2026-05-02 | **AI self-evaluation で 5 critical issue を自己 identify** (= R3 scope 過大 1 commit 不可能 / 観測点 formal-but-empty / Guard 14 件 maintenance overhead / AAG framework 構造変更境界曖昧 / operational-protocol-system project boundary 侵犯 risk)。drawer Pattern 4 honest articulation を self-application | forward-fix: 5 件全 reflect — (1) **不可侵原則 2 を 2a/2b に分解** (= 内容 vs 構造境界明示、原則計 8 件) / (2) **R3 を R3a-R3d に sub-phase 化** (= directory rename / naming convention / 旧 mention update / guard+registry 各 1 commit) / (3) **観測点 machine-verifiable refine** (= grep / test command articulate、subjective は honest skip) / (4) **Guard 14 → 7 集約** (= aagBoundary 4 sub-invariant 統合 / elementStructure 3 統合 / projectsStructure 3 統合 + generatedFileEdit / oldPathReference / selfHosting 拡張 / boundaryIntegrity) / (5) **R5 scope 縮小** (= operational-protocol-system project resume + skeleton fill のみ、M1-M5 deliverable は別 project 内で実施)。各 R-phase の self-consistency 強化 |
| 2026-05-02 | **cross-project ordering 確定** (= user articulation 反映): aag-self-hosting-completion R0-R7 先行完遂 → operational-protocol-system 新構造前提 plan refinement → M1-M5 実装 という flow | forward-fix: plan.md §3 R5 articulate update — flow articulation 4 step 明示 (= 本 program R7 完遂 → R5 trigger で resume → plan refinement → M1-M5 実装)、R5 deliverable に「plan refinement trigger articulate」追加、観測点 R5-4 (= HANDOFF.md plan refinement task articulate verify) 追加。並列 L3 program risk 回避 + structural foundation 完成後に operational layer 着手で順序整合最高 |

判定 (= 本 reframe 系列に対して): **部分的** — bootstrap 後の構造案に 1 件 境界矛盾 (= aag/interface/) があり、user 指摘で fix。本 articulation update で構造案 refinement 完了、R-phase 着手は本 commit 後の R0 から。

DA-α-000 自体は active のまま継続、judgement model (= AI judgement + retrospective + commit-bound rollback) は不変。

### scope 外 articulate — 後続 program candidate (= 本 program に統合しない)

| candidate | 内容 | trigger 条件 | 起動 timing |
|---|---|---|---|
| **CHANGELOG management mechanism** | 主アプリ CHANGELOG.md と AAG CHANGELOG.md を **分離** + 各 project (= `projects` 配下 `active/<id>`/) で per-project CHANGELOG を articulate + AAG mechanism (= guard / collector) で更新抜け検出 (= 古くなった CHANGELOG vs recent-changes.generated.md の drift 自動検出) | user articulation (= 本 session 反映)、aag-self-hosting-completion R3 完了で 04-tracking/ 構造確立後が適切 | aag-self-hosting-completion R3 完了後 user 判断で別 program bootstrap (= scope discipline、本 program に統合しない) |

CHANGELOG mechanism は本 program scope **外** (= 不可侵原則 1「主アプリ code touch しない」+ scope discipline = 1 program 1 focus)。本 program は **structural reorganization** に focus、CHANGELOG governance は **04-tracking/ 構造を前提** に別 program で実施するのが論理順序。

本 program 内では:
- R3 で `recent-changes.md` を `recent-changes.generated.md` に rename (= 機械生成化、CHANGELOG mechanism の前提整備)
- それ以外の CHANGELOG 関連は touch しない (= scope 外)

---

## DA-α-001: R0 境界定義先行 着手判断

**status**: active

### 判断時 (2026-05-02 / Phase R0)

- 候補:
  1. R0 を skip して R1 (= AAG sub-tree relocation) から物理移動 start
  2. R0 で 5 README + CLAUDE.md 同時 update (= 1 commit)
  3. **R0 で 5 README + CLAUDE.md を 1 commit で同時 articulate update** (= articulate のみ、物理移動なし)
  4. R0 を sub-phase 化 (= R0a references README + R0b aag README 等)
- 採用案: 候補 3
- 判断根拠:
  - 事実 1: plan.md §3 R0 で「物理変更前に 3 tree 境界 articulate を root README で確立」を articulate
  - 事実 2: R0 は articulate のみ (= 物理移動なし)、scope 小、1 commit で完結可能
  - 事実 3: 不可侵原則 5 articulate「R-phase は必要なら sub-phase に分割」、ただし R0 は scope 小で sub-phase 不要
  - 事実 4: R0 が landed すれば R1 以降の物理移動が始まっても AI / 人間が物理配置を見て「読む / 読まない」即判断可能 (= 後続 phase の判断 base 確立)
  - 事実 5: aag/README.md は **新設** (= 既存 directory にも README なし)、aag/_internal/ + aag/_framework/ は R1 で fill する skeleton 用 README を articulate
  - 推論: 候補 3 が最 simple で scope-disciplined、候補 4 は over-articulate (= scope 小に対し sub-phase 化は cognitive load 増)
- 想定リスク:
  - 最大被害: R0 articulate が後続 R-phase の物理移動 instruction と齟齬する (= R-phase 進行中に R0 articulate を後追い修正必要 risk)。mitigation = R0-5 反証可能観測 (= 後続 R-phase instruction と R0 articulate の齟齬 verify)
  - 二番目: aag/README.md 新設で「AAG framework 内部に新 doc 追加 = 不可侵原則 2a 違反」と誤読 risk。mitigation = 不可侵原則 2b articulate (= 構造変更は scope 内、新 directory に新 README は構造変更の一部)
- 振り返り観測点 (5 点):
  - R0-1 (machine-verifiable): 5 README + CLAUDE.md で 3 tree 境界 articulate (= grep で boundary keyword `主アプリ改修 AI` / `AAG framework` / `作業単位 lens` 各 ≥ 1 mention)
  - R0-2 (subjective、honest skip articulate): 「主アプリ改修者 read OK / not read」が file 名 / directory 名から判断可能 — **subjective で機械検証不能**、R6 selfHostingGuard 拡張で代替検証
  - R0-3 (machine-verifiable): `*.generated.md` 命名規約予告が `references/README.md` (or relevant) で articulate (= grep `*.generated.md` ≥ 1 mention)
  - R0-4 (machine-verifiable): `npm run test:guards` で 944 test 維持 (= 構造変更なし、breaking なし)
  - R0-5 (反証、machine-verifiable future): 後続 R-phase の物理移動 instruction が R0 articulate と齟齬する場合 verify fail (= R1 着手時に R0 articulate を re-read して整合 verify)

### 5 軸 articulation

- **製本** (canonical): 5 README + CLAUDE.md が canonical (= 各 doc の articulate 自身が canonical、derivation なし)
- **依存方向**: 上位 = `plan.md` §3 R0 + drawer Pattern 1-6、下位 = R1-R7 が R0 articulate を base に進行 (= 一方向)
- **意味**: 「3 tree (references / aag / projects) の境界を物理配置から判断可能にする articulation の確立」(= 後続 R-phase の判断 base)
- **責務**: articulate のみ (= 物理移動なし、不可侵原則 5 articulate)。各 doc の articulate を boundary lens で統一 (= 5 doc で 3 tree 境界 articulate 整合)
- **境界**: 本 R0 の **内** = 5 README + CLAUDE.md の boundary articulate、**外** = 物理移動 (= R1-R3) + per-element articulate (= R4) + protocols landing (= R5) + self-hosting closure update (= R6) + 統合 guard (= R7)

### Commit Lineage

- judgementCommit: `<本 commit sha>` (= R0 articulate update commit、本 entry landing 後に記入)
- preJudgementCommit: `2b98bb2` (= self-evaluation forward-fix commit、R0 着手前)
- judgementTag: `aag-self-hosting-completion/DA-α-001-judgement` (本 commit に annotated tag landing)
- rollbackTag: `aag-self-hosting-completion/DA-α-001-rollback-target` (`2b98bb2` に annotated tag landing 済)
- implementationCommits:
  - `<本 commit sha>` — R0 全実装 (= references/README.md update + aag/README.md 新設 + `projects/` root の README update + CURRENT_PROJECT.md update + CLAUDE.md update + DA-α-001 entry landing)

### 振り返り (R0 完了直後 / 本 commit landing 直後 = TBD)

> R0 deliverable 全 [x] 完了 + verify 全 PASS 後に追記。

- 観測 R0-1〜R0-5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD
