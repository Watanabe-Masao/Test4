# decision-audit — aag-self-hosting-completion

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §1 不可侵原則 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1 (Commit-bound Rollback) + Pattern 4 (Honest Articulation)。
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
| DA-α-004b | Phase R3b | `*.generated.md` 命名規約適用 + generator 出力先変更 判断 | in-progress |
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
  - 事実 2: drawer (= `references/05-aag-interface/drawer/decision-articulation-patterns.md`) Pattern 1 が一般 trigger と適用領域を articulate 済 (= 領域 agnostic、本 project でも reuse 可能)
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
| 2026-05-02 | **doc audit + 4 系統 lens articulation** (= user articulation 反映): R-phase 進行中に発見した doc 改善 candidate を **live tracking artifact** で accumulate、R3c で batch 解消する flow。整理 lens として **doc 4 系統 (ログ / メトリクス / 手順書 / チェックリスト)** articulate (= active project directory (`projects/<active>/` R6 後) は作業 lens + 進行に必要な最低限の状態のみ、メトリクス本体は references/04-tracking/、手順は references/05-aag-interface/ + plan.md、混同禁止) | forward-fix: `projects/aag-self-hosting-completion/doc-improvement-backlog.md` 新設 (= live tracking)、P1 (= 用語統一 + 旧構造前提 doc 最適化 + ハマりポイント refine) を R-phase 内吸収 (R2 + R3c + R6)、P2-P3 (= 構造化 + 重複削減 + reader taxonomy) は post-R7 別 program candidate。R3c deliverable に「doc-improvement-backlog 反映 (= P1 batch 解消)」追加 |

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

- judgementCommit: `45753b8` (= R0 articulate update commit、本 entry を含む実装 commit)
- preJudgementCommit: `2b98bb2` (= self-evaluation forward-fix commit、R0 着手前)
- judgementTag: `aag-self-hosting-completion/DA-α-001-judgement` (`45753b8` に annotated tag landing 済)
- rollbackTag: `aag-self-hosting-completion/DA-α-001-rollback-target` (`2b98bb2` に annotated tag landing 済)
- implementationCommits:
  - `45753b8` — R0 全実装 (= references README + aag README + projects README + CURRENT_PROJECT + CLAUDE.md update + DA-α-001 entry landing + DA-α-000 軌道修正 9th sub-event articulate + plan R5 refine)

### 振り返り (R0 完了直後 / 本 commit landing 直後 = TBD)

> R0 deliverable 全 [x] 完了 + verify 全 PASS 後に追記。

- 観測 R0-1〜R0-5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-002: R1 AAG sub-tree relocation 着手判断

**status**: active

### 判断時 (2026-05-02 / Phase R1)

- 候補:
  1. R1 + R2 を 1 commit にまとめる (= AAG sub-tree relocation + AAG public interface relocate を一括)
  2. **R1 を 1 commit で完結** (= aag/_internal/ + aag/_framework/ skeleton + 9 doc 移動 + 51 inbound update + guard / collector + doc-registry / manifest + aagBoundaryGuard 新設、全部 1 atomic commit)
  3. R1 を sub-phase 化 (= R1a: aag/ skeleton 新設 / R1b: 9 doc 移動 / R1c: inbound update / R1d: guard 新設)
- 採用案: 候補 2
- 判断根拠:
  - 事実 1: 実 inbound 数 = 51 件 (= plan 想定 101 より少ない、actual 値で articulate)、1 atomic commit で完結可能 scope
  - 事実 2: 不可侵原則 5 articulate「R-phase は必要なら sub-phase に分割」、ただし R1 の 51 inbound update は sub-phase 化不要 scope
  - 事実 3: 候補 1 は不可侵原則 5 違反 (= 1 commit に 2 phase まとめない)
  - 事実 4: 候補 3 は over-articulate (= scope 中で sub-phase 化は cognitive load 増、partial migration risk 増)
  - 推論: 候補 2 が scope-disciplined、1 atomic commit で R1 完結
- 想定リスク:
  - 最大被害: 51 inbound update が 1 atomic commit で broken link を残す (= partial update risk)。mitigation = grep + sed bulk rewrite + verify command で broken 0 件 verify
  - 二番目: aagBoundaryGuard で aag/_internal/ 外への配置検出 が false positive (= 例外 path 検出漏れ)。mitigation = synthetic violation test + archive-to-archive 例外 articulate
- 振り返り観測点 (5 点、machine-verifiable refine):
  - R1-1 (machine-verifiable): 9 doc が aag/_internal/ に物理移動 (= `ls aag/_internal/*.md | wc -l` = 9)
  - R1-2 (machine-verifiable): 51 inbound link が新 path 整合 (= `grep -rE "aag/_internal/" --include="*.md" --include="*.ts" --include="*.json" --include="*.mjs" --include="*.js" | grep -v "projects/completed\|99-archive" | wc -l` = 0)
  - R1-3 (machine-verifiable): 944 test + 新 guard PASS (= `npm run test:guards` PASS)
  - R1-4 (machine-verifiable): doc-registry.json + manifest.json で新 path 整合 (= `npm run docs:check` PASS)
  - R1-5 (反証): synthetic broken link 試験で test fail (= ratchet-down 動作確認、aagBoundaryGuard が新 path 外 doc を検出)

### 5 軸 articulation

- **製本** (canonical): aag/_internal/ 9 doc が canonical (= 物理 location 移動のみ、内容不変、不可侵原則 2a articulate)
- **依存方向**: 上位 = `plan.md` §3 R1 + R0 で landed の境界 articulate、下位 = R2 (= AAG public interface relocate) が R1 完了を前提に進行 — 一方向
- **意味**: 「AAG framework 内部 articulation を `aag/_internal/` に集約 + skeleton を `aag/_framework/` に新設、reader-別 structural separation 第一段」
- **責務**: 物理 location 移動 + skeleton 新設 + inbound update + guard 新設 (= 4 sub-task、1 atomic commit)。articulate 内容改変は **しない** (= 不可侵原則 2a)
- **境界**: 本 R1 の **内** = aag/ tree 形成 + aag-related path 全 update、**外** = AAG public interface (= R2) + references/ rename (= R3) + per-element (= R4) + protocols (= R5) + self-hosting closure (= R6) + 統合 guard (= R7)

### Commit Lineage

- judgementCommit: `32a1ea3` (= R1 全実装 commit、本 entry を含む実装)
- preJudgementCommit: `2ac8009` (= R0 完了 + DA-α-001 Lineage 実 sha update commit)
- judgementTag: `aag-self-hosting-completion/DA-α-002-judgement` (`32a1ea3` に annotated tag landing 済)
- rollbackTag: `aag-self-hosting-completion/DA-α-002-rollback-target` (`2ac8009` に annotated tag landing 済)
- implementationCommits:
  - `32a1ea3` — R1 全実装 (= aag/_internal/ + aag/_framework/ skeleton + 9 doc 物理移動 + 51 inbound update + guard / collector path + doc-registry / manifest + aagBoundaryGuard 新設 + DA-α-002 entry landing + guard-test-map.md update)

### 振り返り (R1 完了直後 / 本 commit landing 直後 = TBD)

- 観測 R1-1〜R1-5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-003: R2 AAG public interface relocate 着手判断

**status**: active

### 判断時 (2026-05-02 / Phase R2)

- 候補:
  1. R2 を 1 commit にまとめる (= 5 doc 移動 + inbound update + doc-registry / manifest + guard sub-invariant (b)+(c) active + P1-4 doc improvement 全部 1 atomic)
  2. R2 を sub-phase 化 (= R2a: 5 doc 移動 / R2b: doc improvement)
  3. **R2 を 1 commit で完結** (= 5 doc 移動 + 関連 update + P1-4 doc improvement + aagBoundaryGuard sub-invariant (b)+(c) active 全部 atomic、ただし doc improvement は移動と同 file への refine で natural batch)
- 採用案: 候補 3
- 判断根拠:
  - 事実 1: 5 doc 移動 = scope 中 (= R1 = 9 doc + 51 inbound と同等規模)
  - 事実 2: P1-4 doc improvement (= 冒頭 reader articulate refine) は **移動した同 file** に対する update、移動 phase で natural batch
  - 事実 3: aagBoundaryGuard sub-invariant (b)+(c) は R2 で active 化が articulate 済、本 commit で landing
  - 推論: 候補 3 が scope-disciplined
- 想定リスク:
  - 最大被害: aagBoundaryGuard sub-invariant (b) (= aag/ 配下 主アプリ改修者向け doc 検出) で false positive。mitigation = ALLOWLIST 経由
  - 二番目: 5 doc 冒頭 articulate refine が articulate 内容変更 risk (= 不可侵原則 3 違反 risk)。mitigation = **prepend** のみ (= 既存 articulate 改変なし、boundary 警告 + reader articulate を冒頭追加)
- 振り返り観測点 (5 点、machine-verifiable):
  - R2-1: 5 doc が references/05-aag-interface/ 配下に物理移動
  - R2-2: 該当 inbound 全 update (= 旧 path string 0 件)
  - R2-3: 944 + aagBoundaryGuard tests PASS
  - R2-4: doc-registry / manifest 整合 (docs:check PASS)
  - R2-5 (反証): synthetic で aag/ 配下に主アプリ改修者向け doc 配置試行 → fail

### 5 軸 articulation

- **製本** (canonical): references/05-aag-interface/ 5 doc が canonical (= AAG public interface)
- **依存方向**: 上位 = `plan.md` §3 R2 + R0 境界 + R1 aag/ structure、下位 = R3 — 一方向
- **意味**: 「AAG public interface を reader-別 structural separation で配置、主アプリ改修 user が AAG framework 内部 (= aag/) を読まずに reach 可能な経路 articulate」
- **責務**: 5 doc 物理移動 + boundary articulate refine + aagBoundaryGuard sub-invariant (b)+(c) active 化 + P1-4 doc improvement (= 冒頭 prepend のみ、内容改変なし)
- **境界**: 本 R2 内 = AAG public interface 5 doc + 関連 boundary guard、外 = R3 以降

### Commit Lineage

- judgementCommit: `c408dbc` (= R2 全実装 commit、本 entry を含む実装)
- preJudgementCommit: `c9f60b8` (= R1 完了 + doc audit articulation commit)
- judgementTag: `aag-self-hosting-completion/DA-α-003-judgement` (= `c408dbc` に annotated tag landing 済)
- rollbackTag: `aag-self-hosting-completion/DA-α-003-rollback-target` (= `c9f60b8` に annotated tag landing 済)
- implementationCommits:
  - `c408dbc` — R2 全実装 (= 5 doc 移動 + 67 inbound update + 05-aag-interface/ 新設 + protocols/ skeleton + aagBoundaryGuard sub-invariant (b)+(c) active + P1-4 doc improvement + DA-α-003 entry landing + guard-test-map update)

### 振り返り (R2 完了直後 = TBD)

- 観測 R2-1〜R2-5: TBD
- 判定: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-004a: R3a 5 directory rename + 全 inbound update 着手判断

**status**: active

### 判断時 (2026-05-02 / Phase R3a)

- 候補:
  1. R3 (= R3a + R3b + R3c + R3d) を 1 commit にまとめる (= self-evaluation 反映前の元 plan、不可侵原則 5 違反、scope 過大)
  2. **R3 を 4 sub-phase に分割、R3a 単独 commit** (= self-evaluation 反映後の plan、本 commit で R3a のみ landing)
  3. R3a 内をさらに分割 (= 例: directory ごとに 1 commit)
- 採用案: 候補 2
- 判断根拠:
  - 事実 1: 実 inbound 数 = 247 + 109 + 9 + 186 + 29 = ~580 file (重複除く実数はもう少し少ない、大規模だが 1 atomic commit で扱える scope)
  - 事実 2: candidate 3 (= directory ごと分割) は **partial migration risk** (= 不可侵原則 5 違反: 同一 commit 内で完結が原則)、特に 02-status → 04-tracking + 05-contents → 04-tracking/elements の依存関係で sub-divide すると intermediate state が壊れる
  - 事実 3: R3a の deliverable は機械検証可能 (= grep で broken link 0 件)、回帰しやすい
  - 推論: 候補 2 が scope-disciplined、1 atomic commit で R3a 完結
- 想定リスク:
  - 最大被害: bulk sed による over-replacement (= 文字列が他 context にも match して誤 update)。mitigation = path string は十分 unique (= `references/01-foundation/` etc.) で誤 match risk 低、ただし verify で全 test PASS 確認
  - 二番目: 02-status → 04-tracking + 05-contents → 04-tracking/elements の order dependency。mitigation = order articulate (1) 02 → 04 rename, (2) 05 → 04/elements move
- 振り返り観測点 (5 点、machine-verifiable):
  - R3a-1: 5 旧 directory 不在 (= `for d in 01-principles 02-status 04-design-system 03-guides 05-contents; do test ! -d references/$d; done`)
  - R3a-2: 旧 path 文字列 reference 0 件 (= grep + archive 例外除く)
  - R3a-3: 944 + aagBoundaryGuard 6 test PASS = 950 維持
  - R3a-4: docs:check PASS (= doc-registry / manifest 整合)
  - R3a-5 (反証): synthetic 旧 path link 1 件追加で oldPathReferenceGuard fail (= R3d で landing 後の verify、本 R3a では guard なしのため deferred)

### 5 軸 articulation

- **製本** (canonical): 5 新 directory が canonical (= references/{01-foundation, 02-design-system, 03-implementation, 04-tracking, 04-tracking/elements} の各 doc)
- **依存方向**: 上位 = `plan.md` §3 R3a + R0 境界 articulate + R1 + R2 完了、下位 = R3b (= naming convention) が R3a 完了を前提に進行
- **意味**: 「主アプリ業務 doc / 動的 state / UI design system / 実装ガイド / element catalog の 5 領域を新 directory 名で reader-別 + lens-別 articulate」
- **責務**: 5 directory rename + 1 directory merge (= 05-contents → 04-tracking/elements) + ~580 inbound update + doc-registry / manifest update + guard / collector path constants update
- **境界**: 本 R3a 内 = 5 directory + inbound + meta、外 = naming convention (R3b) + 旧 mention 撤退 (R3c) + 新 guard landing (R3d) + per-element directory (R4)

### Commit Lineage

- judgementCommit: `c544ff5` (= R3a 全実装 commit、本 entry を含む実装)
- preJudgementCommit: `21bd4ad` (= R2 完了 + DA-α-003 Lineage update commit) (= R2 完了 + DA-α-003 Lineage update commit)
- judgementTag: `aag-self-hosting-completion/DA-α-004a-judgement` (= `c544ff5` に annotated tag landing 済)
- rollbackTag: `aag-self-hosting-completion/DA-α-004a-rollback-target` (= `21bd4ad` に annotated tag landing 済)
- implementationCommits:
  - `c544ff5` — R3a 全実装 (= 5 directory rename + 05-contents → 04-tracking/elements merge + ~580 inbound update + doc-registry / manifest / guard / collector path constants update + DA-α-004a entry landing)

### 振り返り (R3a 完了直後 = TBD)

- 観測 R3a-1〜R3a-5: TBD
- 判定: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-004b: R3b *.generated.md 命名規約適用 + generator 出力先変更 着手判断

**status**: active

### 判断時 (2026-05-02 / Phase R3b)

- 候補:
  1. R3b を 1 commit で完結 (= recent-changes.md rename + 9 .md generated rename + generator path update + inbound update)
  2. R3b を sub-phase 化 (= rename と generator path update を 別 commit)
- 採用案: 候補 1
- 判断根拠:
  - 事実 1: 04-tracking/generated/ 配下の `.md` file 9 件 + recent-changes.md = 10 file rename
  - 事実 2: generator 出力先 path constants は section-updater + main.ts 等で限定箇所、scope 小
  - 事実 3: rename と generator path は **partial migration 禁止** (= 同一 commit で完結が原則、不可侵原則 5)
  - 推論: 候補 1 が scope-disciplined
- 想定リスク:
  - 最大被害: generator 出力先 path 不整合で次回 docs:generate 時 file が新 location に書かれず、stale state。mitigation = 本 commit 内で path update + regen + verify
  - 二番目: inbound link が `.md` のまま残り broken。mitigation = bulk sed + grep 0 件 verify
- 振り返り観測点 (5 点、machine-verifiable):
  - R3b-1 (machine-verifiable): `find references/04-tracking -maxdepth 2 -name "*.md" -not -name "*.generated.md" -not -name "README.md"` で **手書き対象のみ** (= recent-changes.generated.md など機械生成は suffix)
  - R3b-2 (machine-verifiable): `04-tracking/generated/*.md` 全件に `.generated.md` suffix (= 9 file)
  - R3b-3 (machine-verifiable): `npm run docs:generate` で `*.generated.md` に出力
  - R3b-4 (machine-verifiable): `npm run test:guards` 950 + 関連 PASS
  - R3b-5 (反証 deferred): `*.generated.md` 手編集試験で R3d の `generatedFileEditGuard` で fail (= R3d 後に machine 化)

### 5 軸 articulation

- **製本** (canonical): generator が出力する `.generated.md` 自身が canonical (= 機械生成、手編集禁止)
- **依存方向**: 上位 = `plan.md` §3 R3b + R3a 完了、下位 = R3c (= 旧 mention 撤退) が R3b 完了を前提
- **意味**: 「機械生成 doc を file 名 suffix で明示 (= 手編集禁止 articulate を file 名で structural articulate)」
- **責務**: 10 file rename + generator output path update + inbound update。articulate 内容変更なし
- **境界**: 本 R3b 内 = `*.generated.md` 命名規約のみ、外 = guard 化 (= R3d で `generatedFileEditGuard` landing)

### Commit Lineage

- judgementCommit: `2040228`
- preJudgementCommit: `cb87360` (= R3a 完了 + DA-α-004a Lineage update commit)
- judgementTag: `aag-self-hosting-completion/DA-α-004b-judgement` (= `2040228` に landing 済)
- rollbackTag: `aag-self-hosting-completion/DA-α-004b-rollback-target` (= `cb87360` に landing 済)
- implementationCommits:
  - `2040228` — R3b 全実装 (= 8 file rename + ~30 inbound update + generator output paths + entry README update)

### 振り返り (R3b 完了直後 = TBD)

- 観測 R3b-1〜R3b-5: TBD
- 判定: TBD
- retrospectiveCommit / Tag: TBD
