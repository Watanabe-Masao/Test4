# decision-audit — aag-platformization

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §4 + 不可侵原則 6。1 entry = 1 判断 = 1 振り返り。
> 観測なき articulation を禁ず (supreme principle)。

## 必須要件

### 判断時 (Phase / 軸 着手時)

- 候補 / 採用案 / 判断根拠 (事実 + 推論)
- 想定リスク (採用案外れ時の最大被害)
- 振り返り観測点 **最低 3 つ** (1 つ以上は反証可能)
- **5 軸 articulation** (製本 / 依存方向 / 意味 / 責務 / 境界、`plan.md` §4)
- **Commit Lineage** (judgementCommit / preJudgementCommit + annotated tag)
- judgementCommit を **amend / rebase / force push 禁止** (sha が rollback target)

### 振り返り (Phase / 軸 完了時)

- 観測点を **実測** (推測 / 主観禁止)
- 判定 = **3 値**: 正しい / 部分的 / 間違い (グラデーション禁止)
- 軌道修正 (判定が "部分的" / "間違い" の場合): rollback procedure or forward-fix plan + rollbackCommit + rollbackTag

### Commit Message Convention

```
Decision: DA-α-NNN ({judgement|implementation|retrospective|rollback})
```

`git log --grep="DA-α-NNN"` で判断系列を抽出可能。

### Tag Convention

```bash
git tag -a "aag-platformization/DA-α-NNN-rollback-target" -m "preJudgement" <preJudgementSha>
git tag -a "aag-platformization/DA-α-NNN-judgement"      -m "judgement landing" <judgementSha>
git tag -a "aag-platformization/DA-α-NNN-retrospective"  -m "retrospective"  <retrospectiveSha>
git push origin <tag>
```

`git checkout aag-platformization/DA-α-NNN-rollback-target` で判断前に物理的に戻れる。

---

## entry テンプレート

```markdown
## DA-α-NNN: <判断名>

**status**: active | superseded

### 判断時 (YYYY-MM-DD / Phase N or 軸 X)

- 候補: 1 / 2 / 3
- 採用案: <case>
- 判断根拠: 事実 + 推論 (file path : line / commit hash)
- 想定リスク: 最大被害 + 二番目に大きい外れ方
- 振り返り観測点 (≥3、≥1 反証可能):
  - 観測点 1 (肯定): ...
  - 観測点 2 (否定): ...
  - 観測点 3: ...

### 5 軸 articulation

- 製本: <canonical / derived>
- 依存方向: <X → Y、一方向 acyclic>
- 意味: <答える 1 問い>
- 責務: <single responsibility>
- 境界: <内 / 外>

### Commit Lineage

- judgementCommit: `<sha>`
- preJudgementCommit: `<sha>`
- judgementTag / rollbackTag: `aag-platformization/DA-α-NNN-{judgement,rollback-target}`
- implementationCommits (Phase 進行中追記):
  - `<sha>` — <概要>

### 振り返り (YYYY-MM-DD)

- 観測点 1: 実測 → 期待通り / でない
- 観測点 2: 実測 → 期待通り / でない
- 観測点 3: 実測 → 期待通り / でない
- 判定: 正しい / 部分的 / 間違い
- 学習: <何が効いた / 何を読み違えた>
- retrospectiveCommit / Tag: `<sha>` / `aag-platformization/DA-α-NNN-retrospective`

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- decision: 完全 revert / 部分 revert / forward-fix
- procedure (revert 系): `git checkout aag-platformization/DA-α-NNN-rollback-target`
- forward-fix plan: <Phase N の checklist 項目をどう変えるか>
- rollbackCommit / Tag
- 本 entry status を `superseded`、新 DA-X-NNN entry を起こす
```

---

## 判断 entry 一覧

| ID | Phase / 軸 | 判断対象 | status |
|---|---|---|---|
| DA-α-000 | Phase 0 | 本 program の進行モデル (AI-driven judgement + retrospective + commit-bound rollback) | active |
| DA-α-001 | Phase 1 / A1 | Authority articulation 方針 (4 layer 正本確認 + back-link) | planned |
| DA-α-002a | Phase 1 / A2a | merge policy canonical 単一点 (`aag/source-of-truth.md` "Merge Policy" section) + 実バグ修復方針 | planned |
| DA-α-002b | Phase 1 / A2b | merged artifact format (generated 系、A3 contract format とは独立) + sync guard 設計 | planned |
| DA-α-003 | Phase 1 / A3 | **contract format 先行確定** (schema 系、generated 系とは独立) + AagResponse + detector schema 化方針 | planned |
| DA-α-004 | Phase 1 / A4 | RuleBinding 境界 guard 設計 | planned |
| DA-α-005 | Phase 1 / A5 | **drawer format** (generated 系、A2b と相互整合、A3 とは独立) + drawer 4 種 granularity + 配置 | planned |
| DA-α-006 | Phase 2 | simulation CT1-CT5 結果総括 + F1〜F5 status | planned |
| DA-α-007 | Phase 3 | archive 判断 + **横展開可否判定条件** articulation + 後続 charter 必要性 | planned |

---

## DA-α-000: 本 program の進行モデル決定

**status**: active

### 判断時 (2026-05-01 / Phase 0)

- 候補:
  1. 人間承認 gate モデル (3+ Gate)
  2. AI judgement only (履歴なし)
  3. AI judgement + retrospective verification
  4. **AI judgement + retrospective + commit-bound rollback**
- 採用案: 候補 4
- 判断根拠:
  - 事実 1: user 指示「人間承認はとにかく減らす」「commit log 残す」「判断間違い時に commit に戻れる制度化」
  - 事実 2: `aag/core/principles/core-boundary-policy.md` 「邪魔だから」を理由にできない原則
  - 事実 3: 本 program は AAG self-application、自分自身を例外にできない
- 想定リスク: judgementCommit / Tag 管理 overhead が Phase 進行を鈍化、rollback tag が dead reference 化
- 振り返り観測点:
  - 1 (肯定): Phase 1 の各 DA で commit lineage が漏れず記録される
  - 2 (肯定): 1 件以上の DA で判定 "間違い" or "部分的" + 軌道修正 entry が活用される
  - 3 (反証): Phase 5 までに judgementCommit を amend した事故 0 件
  - 4 (反証): 「overhead」を理由に DA を skip した entry 0 件
  - 5 (反証): rollback tag が一度も使われず全 "正しい" 判定だと dead weight (本 program 完了時に最低 1 件は軌道修正期待)

### 5 軸 articulation

- 製本: 本 program 内 `decision-audit.md` が canonical (派生先なし)
- 依存方向: 上位 = `plan.md` §4 + `references/01-principles/aag/strategy.md`、下位 = なし
- 意味: 「AI 判断履歴 + 物理 rollback 経路を持つ institution の articulation」
- 責務: institution の articulate + 1 entry のみ self-dogfood
- 境界: 本 project 内のみ、横展開対象外

### Commit Lineage

- judgementCommit: `96a9521`
- preJudgementCommit: `d0b079f`
- judgementTag: `aag-platformization/DA-α-000-judgement` (push 済)
- rollbackTag: `aag-platformization/DA-α-000-rollback-target` (push 済)
- implementationCommits:
  - `96a9521` 〜 `<latest>` — 進行モデル articulation + reframe 履歴 + 本 commit clean rewrite

### 振り返り (本 program archive 直前 / TBD)

> Phase 3 完了時または archive 直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 — reframe 履歴 (本 session 中の sub-events、すべて forward-fix)

| date | event | 対応 |
|---|---|---|
| 2026-05-01 | rollback tag sanity check 中の unstaged 衝突 | forward-fix: HANDOFF §3.5 に「rollback 動作確認は worktree clean 時のみ」追加 |
| 2026-05-01 | scope clarification: 「振る舞いを変えない、分離が中心、矛盾・バグは修復」 | forward-fix: plan 不可侵原則 1 articulate |
| 2026-05-01 | format 中立化: JSON は仮置き | forward-fix: format 選定を DA-α-002 に articulate |
| 2026-05-01 | 5 実装品質基準追加 (Q1〜Q5) | forward-fix: 後 5 軸 articulation に統合済 |
| 2026-05-01 | 高品質 refactor (cut / 統合) | forward-fix: doc 数 6→2 cut |
| 2026-05-01 | Pre-Go 条件 4 件 (C1-C4) 復活 | forward-fix: Phase 1 内 A2-A4 に統合 |
| 2026-05-01 | Standard 昇格 (subsystem template + Pilot) | forward-fix: `references/01-principles/platformization-standard.md` 新設 |
| 2026-05-02 | drawer pattern → context provision control の reframe | forward-fix: A5 Generated として統合 |
| 2026-05-02 | 5 軸 + 8 軸 二段 lens | forward-fix: plan §4 articulate |
| 2026-05-02 | CLAUDE.md ≠ AAG entry の訂正 | forward-fix: HANDOFF §3.8 + plan §6「触らない」articulate |
| 2026-05-02 | 前提 collapse → clean rewrite (3 Phase + 1 Gate) | forward-fix: 本 commit |

判定 (本 reframe 系列に対して): **部分的** — articulation は accumulated patch から clean rewrite に restructure 完了、ただし implementation は 0 件。Phase 1 着手で functioning に転じる。

DA-α-000 自体は active のまま継続、judgement model (AI-driven + retrospective + commit-bound rollback) は不変。

---

## DA-α-002a: Merge Policy canonical 単一点化 + 実バグ 3 件修復

**status**: active

### 判断時 (2026-05-02 / Phase 1 / A2a)

- 候補:
  1. `MERGE_POLICY.md` 新設 (新 doc 増設、不可侵原則 4 違反の risk)
  2. `aag/source-of-truth.md` に Merge Policy section 追加 (既存 doc 拡張)
  3. `merged.ts` の冒頭 doc-comment を canonical 化 (= code-as-canonical)
- 採用案: 候補 2
- 判断根拠:
  - 事実 1: `references/01-principles/aag/strategy.md` §1.1「正本を増やさない」 — 新 doc 増設は最後手段
  - 事実 2: `aag/source-of-truth.md` は既に「正本 / 派生 / 運用物 区分ポリシー」を articulate (= merge policy = 派生生成 policy であり性質一致)
  - 事実 3: 既存 source-of-truth.md §3 派生物一覧の中に `ARCHITECTURE_RULES` を含めるべきだが現状未 articulate (gap)。本機会に gap fill
  - 事実 4: code-as-canonical (候補 3) は AI が doc 経由で reach する経路を阻害 (= AAG 5 軸「依存方向」逆転)
  - 推論: doc 拡張案 (候補 2) が最も既存 articulation 構造と整合 + AI navigation を阻害しない
- 想定リスク:
  - 最大被害: source-of-truth.md の責務肥大 (§4 追加で C1 違反 risk)。mitigate = §4 は merge policy 単一に絞る、他 derivation policy への拡張はしない
  - 二番目: §4 番号変更で他 doc の cross-reference 破綻。mitigate = grep で reference 確認、影響なし
- 振り返り観測点 (5 点):
  - 観測 1 (肯定): merged.ts / defaults.ts / 3 overlay / bootstrap-guide すべて §4 に back-link で reach 可能
  - 観測 2 (肯定): 空 `EXECUTION_OVERLAY = {}` で `merged.ts` が throw せず動く (bootstrap path 修復確認)
  - 観測 3 (反証): `pure-calculation-reorg` 既存 merge 結果が byte-identical (golden test、振る舞い変更なし不可侵原則 1 遵守)
  - 観測 4 (反証): 既存 9 integrity guard / 12 AAG-REQ 1 件も緩和されない
  - 観測 5 (反証): `RuleExecutionOverlayEntry` 型の重複定義が 0 件 (集約完了確認)

### 5 軸 articulation

- **製本** (canonical): `aag/source-of-truth.md` §4 (本判断 deliverable)。merged.ts / defaults.ts / 3 overlay / bootstrap-guide はすべて派生 (back-link)
- **依存方向**: source-of-truth.md §4 → merged.ts / defaults.ts / overlay / bootstrap-guide (一方向、上位 → 下位、逆参照禁止)
- **意味**: 「ARCHITECTURE_RULES の merge 解決順序 + reviewPolicy 契約 + resolvedBy 追跡 はどう articulate されるか」(canonical 1 問い)
- **責務**: merge policy の単一 articulate 点 (single responsibility = 派生生成 policy)。他 derivation policy への拡張禁止
- **境界**: source-of-truth.md §4 の内 = merge policy / 外 = 個別 rule の operational state (= 各 project overlay の内容)

### Commit Lineage

- judgementCommit: `<本 commit sha>` (本 entry landing 後に記入)
- preJudgementCommit: `2954e04` (前 commit、4 改訂反映後)
- judgementTag: `aag-platformization/DA-α-002a-judgement` (本 commit に annotated tag)
- rollbackTag: `aag-platformization/DA-α-002a-rollback-target` (`2954e04` に annotated tag)
- implementationCommits:
  - `<本 commit sha>` — A2a 全実装 (source-of-truth.md §4 + aag-core-types 集約 + merged.ts + defaults.ts + 3 overlay + bootstrap-guide + DA entry)

### 振り返り (Phase 1 / A2a 完了直後 / 本 commit landing 直後 = TBD)

> A2a checklist 全 [x] 完了 + golden test 通過 + 全 guard PASS 後に追記。

- 観測 1 (back-link reach): TBD
- 観測 2 (空 overlay throw しない): TBD
- 観測 3 (golden test byte-identical): TBD
- 観測 4 (既存 guard / AAG-REQ 緩和なし): TBD
- 観測 5 (型重複定義 0 件): TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-002b: Merged Artifact Generator + Sync Guard (Go 実装条件 C2)

**status**: active

### 判断時 (2026-05-02 / Phase 1 / A2b)

- 候補:
  1. artifact format = JSON (TS/Node native、AI 直読、jq queryable、language-agnostic)
  2. artifact format = YAML (人間可読、comment 可、ただし parser overhead)
  3. artifact format = TS module (TS consumer 型安全、ただし AI 直読不可、language-agnostic 性失う)
  4. artifact format = CUE / TOML (overkill for current scope)
- 採用案: 候補 1 (JSON)
- 判断根拠:
  - 事実 1: artifact 用途 = AI 直読 + cross-language consumer (Go / Python 等の reference runtime PoC) + jq による defaults 補完率 / overlay 明示率 観測 → JSON が最適
  - 事実 2: A2 = generated 系 format、A3 contract = schema 系 format で **独立判断** (DA refactor 4 改訂 #3)
  - 事実 3: existing `docs/generated/` 配下の他 artifact (architecture-health.json / project-health.json 等) も JSON、整合性 + tooling 共通化
  - 推論: JSON が generated 系 artifact format として現状最適、現時点で他候補に決定的優位なし
- 想定リスク:
  - 最大被害: artifact size 肥大 (172 rule × 詳細 field = ~676KB)。git diff のノイズ + `docs:generate` 時間増加
  - 二番目: comment が書けないため articulation は別 doc (= source-of-truth.md §4) に依存
- 振り返り観測点 (5 点):
  - 観測 1 (肯定): artifact が runtime ARCHITECTURE_RULES と byte-identical (sync guard で機械検証)
  - 観測 2 (肯定): 試験 drift で sync guard が hard fail
  - 観測 3 (反証): pure-calculation-reorg 既存 merge 結果が変わらない (golden test 含む)
  - 観測 4 (反証): 既存 9 + 新 1 = 10 integrity guard 全件 PASS、12 AAG-REQ baseline 緩和なし
  - 観測 5 (反証): docs:generate 時間が極端に増加しない (現状 ~30 秒以内維持)

### 5 軸 articulation

- **製本** (canonical / derived): 派生 artifact (canonical = `merged.ts` runtime、本 artifact は同一 merge logic を別 entry point から再実行した結果)
- **依存方向**: BASE_RULES + EXECUTION_OVERLAY + DEFAULT_EXECUTION_OVERLAY + DEFAULT_REVIEW_POLICY_STUB → generator → artifact (一方向、artifact から canonical への逆向き禁止 = sync guard で hard fail)
- **意味**: 「現在の merge 結果は何か + 各 field がどこから解決されたか (resolvedBy)」(canonical 1 問い)
- **責務**: merge 結果の materialize + resolvedBy 統計 (single responsibility = 派生生成 + transparency tracking)
- **境界**: 派生 artifact 層 (= source-of-truth.md §3 派生物一覧)、authoring 編集禁止、sync guard が境界違反を hard fail で防ぐ

### Commit Lineage

- judgementCommit: `<本 commit sha>` (本 entry landing 後に記入)
- preJudgementCommit: `226b455` (前 commit、A2a 完了)
- judgementTag: `aag-platformization/DA-α-002b-judgement` (本 commit に annotated tag)
- rollbackTag: `aag-platformization/DA-α-002b-rollback-target` (`226b455` に annotated tag)
- implementationCommits:
  - `<本 commit sha>` — A2b 全実装 (generator + test wrapper + sync guard + package.json scripts + guard-test-map 反映 + DA entry)

### 振り返り (Phase 1 / A2b 完了直後 = 本 commit landing 直後 = TBD)

> 本 commit landing 直後に追記。

- 観測 1 (byte-identical): TBD (新 sync guard 6 test 全 PASS で確認済予定)
- 観測 2 (試験 drift hard fail): TBD (sed で artifact 改竄して guard fail 確認)
- 観測 3 (pure-calc-reorg merge 不変): TBD (既存 test:guards 全 PASS で確認済予定)
- 観測 4 (12 AAG-REQ baseline 緩和なし): TBD
- 観測 5 (docs:generate 時間): TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD
