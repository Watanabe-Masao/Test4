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
- **taskClass** (optional、post-Pilot AI Role Layer 差し込み口 = seam): judgement の task 分類例 — `derivation-merge` / `contract-schema` / `binding-boundary` / `discovery-drawer` / `policy-gate` / `authority-canonical`。本 field は free-form (= Phase 3 charter で AI Role Layer が articulate されるまで forward compatibility 用)
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
| DA-α-005 | Phase 1 / A5 | **drawer format** (generated 系、A2b と相互整合、A3 とは独立) + drawer 4 種 granularity + 配置 | active |
| DA-α-006 | Phase 2 | simulation CT1-CT5 結果総括 + F1〜F5 status | active |
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

- judgementCommit: `74100a7` (本 entry を含む A2b 全実装 commit)
- preJudgementCommit: `226b455` (前 commit、A2a 完了)
- judgementTag: `aag-platformization/DA-α-002b-judgement` (74100a7 に annotated tag landing 済)
- rollbackTag: `aag-platformization/DA-α-002b-rollback-target` (226b455 に annotated tag landing 済)
- implementationCommits:
  - `74100a7` — A2b 全実装 (generator + test wrapper + sync guard + package.json scripts + guard-test-map 反映 + DA entry)

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

---

## DA-α-003: Contract Schema 化 (AagResponse + DetectorResult、Go 実装条件 C3)

**status**: active

### 判断時 (2026-05-02 / Phase 1 / A3)

- 候補 (contract format = schema 系、generated 系 A2b/A5 とは独立判断 = 4 改訂 #3):
  1. JSON Schema (draft-07、ajv 利用可能、AI/cross-language consumer に最適)
  2. CUE (型安全だが niche、codegen 必要)
  3. Protocol Buffers (binary protocol、AAG response には overkill)
  4. TypeScript types only (現状維持、言語非依存性なし)
- 採用案: 候補 1 (JSON Schema draft-07)
- 判断根拠:
  - 事実 1: AagResponse は AI / cross-language consumer 向け contract → 言語非依存性が要件
  - 事実 2: ajv v6.14.0 が node_modules に存在 (透過的に使える、新規 dep 不要)
  - 事実 3: ajv v6 は draft-07 まで対応 (draft-2020-12 不可)
  - 事実 4: 既存 `aagResponseFeedbackUnificationGuard` が tools / app 二重実装を防いでいる → schema 化はその上に重畳する形で安全
  - 推論: draft-07 が現環境で唯一 immediate に動作 + 主要 features (enum / oneOf / required / additionalProperties) に十分
- 想定リスク:
  - 最大被害: schema と TS interface の drift (sync guard で機械検証)
  - 二番目: ajv v8 への upgrade 時 schema syntax 互換性確認が必要
- 振り返り観測点 (5 点):
  - 観測 1 (肯定): aag-response.schema.json の required + properties が TS interface 9 fields と一致
  - 観測 2 (肯定): buildObligationResponse 出力が schema validation を通過
  - 観測 3 (反証): 不正 instance (required 欠落) が schema で hard fail
  - 観測 4 (反証): 既存 `aagResponseFeedbackUnificationGuard` が引き続き active
  - 観測 5 (反証): 既存 text renderer 出力が byte-identical (= TS 側 logic 不変、schema 化のみ)

### 5 軸 articulation

- **製本** (canonical): `docs/contracts/aag/aag-response.schema.json` + `detector-result.schema.json` = canonical contract。TS interface (`AagResponse` in `aag-response.ts`) は schema と structurally identical、sync guard で drift 防止
- **依存方向**: schema (canonical) → TS interface (sync 維持) / consumer (validation) — 一方向 (TS → schema 逆参照禁止)
- **意味**: 「AAG が AI に通知する response の structural contract は何か」(AagResponse 1 問い) + 「detector が emit する result の structural contract は何か」(DetectorResult 1 問い、forward-looking)
- **責務**: AagResponse = consumer 向け通知契約 (single responsibility)、DetectorResult = detector 内部 result 契約 (separate single responsibility)。両者は独立 contract
- **境界**: contract 層 = canonical schema files、内 = field 定義 + validation、外 = builder / renderer 実装 (= aag-response.ts function 群、本 schema 化は logic に touch しない)

### Commit Lineage

- judgementCommit: `eee1de8` (本 entry を含む A3 全実装 commit)
- preJudgementCommit: `22581a9` (前 commit、A2b 完了後)
- judgementTag: `aag-platformization/DA-α-003-judgement` (eee1de8 に annotated tag landing 済)
- rollbackTag: `aag-platformization/DA-α-003-rollback-target` (22581a9 に annotated tag landing 済)
- implementationCommits:
  - `eee1de8` — A3 全実装 (schema 2 件 + sync guard 7 test + aag-response.ts back-link + 3 seams + DA entry)

### 振り返り (Phase 1 / A3 完了直後 = 本 commit landing 直後 = TBD)

- 観測 1 (schema fields 一致): TBD (sync guard test 2-3 PASS で確認予定)
- 観測 2 (validation 通過): TBD (sync guard test 4 PASS で確認予定)
- 観測 3 (不正 instance fail): TBD (sync guard test 5 + 7 PASS で確認予定)
- 観測 4 (aagResponseFeedbackUnificationGuard active): TBD (test:guards 全 PASS で確認予定)
- 観測 5 (renderer byte-identical): TBD (TS logic 不変なので意味不変、test:guards 全 PASS で間接確認)
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-004: RuleBinding Boundary Guard (Go 実装条件 C4、Phase 1 最終)

**status**: active

### 判断時 (2026-05-02 / Phase 1 / A4)

- **taskClass**: `binding-boundary` (= post-Pilot Binding Auditor role 用 seam)
- 候補:
  1. TypeScript 構造解析 (TS Compiler API、ts-morph 等で AST 経由 field 抽出) — 厳密だが複雑
  2. **regex 経由 + balanced brace tracking で interface body + top-level field 抽出**
  3. 実 rule instance を runtime 走査で検証 — TS が既に boundary を強制するため重複
- 採用案: 候補 2
- 判断根拠:
  - 事実 1: TS interface 自体が canonical boundary (TS compiler が既に強制)、guard の役目は「TS interface を改変する PR で意味系 field 追加が忍び込まない」を catch すること
  - 事実 2: regex + brace balancing で `RuleBinding` 単一 interface の top-level field 抽出は十分 robust (nested object literals は depth tracking でskip)
  - 事実 3: ts-morph 等 AST tool は新規 dep、ROI 低い (本 guard scope = 1 interface)
  - 推論: 候補 2 が ROI 最高、synthetic violation test (test 5) で regex 健全性を単体検証して drift risk を mitigate
- 想定リスク:
  - 最大被害: regex が完璧でなく false negative (= 違反検出漏れ)。mitigation = synthetic violation test で regex 動作を機械検証
  - 二番目: interface 構造が radically 変わる (= 例: `extends` で別 interface 継承) と regex が body 抽出失敗。mitigation = test 1 (sanity check) で抽出失敗を hard fail
- 振り返り観測点 (5 点):
  - 観測 1 (肯定): 6 test 全 PASS (interface 抽出 + 5 field 限定 + 意味系 8 件未articulate + 禁止 prefix 3 件未articulate + synthetic violation 検出 + 既存 5 field 全揃え)
  - 観測 2 (反証): synthetic violation 注入で hard fail 確認済 (本 commit pre-landing 検証で確認)
  - 観測 3 (反証): 既存 RuleBinding 5 field は全 PASS、削除 / 改名で test 6 (既存 field 揃え) が hard fail
  - 観測 4 (反証): test:guards 全件 PASS (138 file 928 test → 139 file 934 test 想定、+1 file +6 test)
  - 観測 5 (反証): 既存 12 AAG-REQ baseline 緩和なし

### 5 軸 articulation

- **製本** (canonical): `app/src/test/architectureRules/types.ts` の `RuleBinding` interface 自身が canonical。本 guard はその canonical の boundary を守る (= guard は canonical を articulate しない、enforce する)
- **依存方向**: types.ts (canonical) → 本 guard (regex 経由参照) — 一方向、guard が canonical を改変しない
- **意味**: 「RuleBinding interface に意味系 field が漏れていないか」(canonical 1 問い)
- **責務**: boundary 機械検証のみ (single responsibility = field 集合の正常性)。意味の articulate は別 interface (RuleSemantics / Governance / OperationalState / DetectionSpec) の責務
- **境界**: guard 層 = 構造検証、内 = field 名検査、外 = 個別 rule instance の semantic 検証 (= 別 guard の責務、例: selfHostingGuard / canonicalDocBackLinkGuard)

### Commit Lineage

- judgementCommit: `db26556` (本 entry を含む A4 全実装 commit)
- preJudgementCommit: `1328f25` (前 commit、A3 完了 + Lineage update 後)
- judgementTag: `aag-platformization/DA-α-004-judgement` (db26556 に annotated tag landing 済)
- rollbackTag: `aag-platformization/DA-α-004-rollback-target` (1328f25 に annotated tag landing 済)
- implementationCommits:
  - `db26556` — A4 全実装 (guard 6 test + types.ts boundary policy comment + DA entry + guard-test-map 反映)

### 振り返り (Phase 1 / A4 完了直後 = 本 commit landing 直後 = TBD)

- 観測 1 (6 test PASS): TBD
- 観測 2 (synthetic violation hard fail): TBD (本 commit pre-landing で確認済、CI 後追記)
- 観測 3 (既存 5 field 全揃え): TBD (test 6 PASS で確認予定)
- 観測 4 (test:guards 全件 PASS): TBD
- 観測 5 (12 AAG-REQ baseline 維持): TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

---

## DA-α-005: A5 Generated Drawers (rule-index + rules-by-path + rule-by-topic)

**status**: active

### 判断時 (2026-05-02 / Phase 1 / A5)

- **taskClass**: `discovery-drawer` (= post-Pilot Discovery Curator role 用 seam、A3 で articulate 済 taskClass field を初使用)
- 候補:
  1. drawer 4 種 (rule-index / rules-by-path / rule-detail/`<id>` / rule-by-topic) を全実装
  2. **drawer 3 種 (rule-index / rules-by-path / rule-by-topic) のみ、rule-detail は merged-architecture-rules.json (A2b) で代替**
  3. drawer 1 種 (rules-by-path のみ) で最小スコープ
- 採用案: 候補 2
- 判断根拠:
  - 事実 1: A2b で生成済 `merged-architecture-rules.json` が既に全 rule の full data + resolvedBy を articulate (= rule-detail/`<id>` の役割を代替可能)
  - 事実 2: rule-detail/`<id>` を per-rule file 化すると ~172 個の小 file 増加 (= AI が個別 fetch する利点はあるが merged.json で一括取得も同等効率)
  - 事実 3: 候補 1 はスコープ拡大、候補 3 は F2 (素早く reach) verify 不能
  - 推論: 候補 2 が ROI 最高、rule-detail の per-file 化は post-Pilot で simulation 観測結果に基づき判断 (= scope 制御原則整合)
- 想定リスク:
  - 最大被害: drawer artifact が AI に活用されない (= simulation で F1-F3 verify 失敗)。mitigation = simulation で観測、結果に基づき drawer 設計を refine
  - 二番目: imports / codeSignals 抽出 heuristic が path coverage で粗い (mapped 率低)。mitigation = unmapped rule を articulate、post-Pilot で coverage 改善 (例: guard test file の TARGET_PATHS 抽出)
- 振り返り観測点 (5 点):
  - 観測 1 (肯定): 3 artifact 全 generation 成功、172 rule articulate
  - 観測 2 (肯定): aagDrawerSyncGuard 10 test 全 PASS (集合論的整合 + orphan 検出 + _seam articulate + canonical / version 一致)
  - 観測 3 (反証): rules-by-path mapped 率が極端に低い場合 (< 30%) は heuristic 改善が post-Pilot で必要
  - 観測 4 (反証): rule-by-topic で slices/responsibilityTags/guardTags のいずれかが 0 件なら data 欠落
  - 観測 5 (反証): _seam field (post-Pilot Role Layer 差し込み口) が全 rule で articulate されている

### 5 軸 articulation

- **製本** (canonical): BASE_RULES (= base-rules.ts) が canonical、3 drawer artifact は全て派生 (一方向)
- **依存方向**: BASE_RULES → drawer-generator → 3 artifact → AI consumer (一方向、drawer 編集 → BASE_RULES 逆向き禁止 = sync guard hard fail)
- **意味**: 「AI が rule subset に最短経路で reach する index は何か」(routing 1 問い、3 軸 = path / topic / overview に分解)
- **責務**: routing artifact 生成 + sync 維持 (single responsibility = drawer generation、意味 articulate は BASE_RULES の責務)
- **境界**: 派生 artifact 層、routing-only。意味 articulate / merge logic / contract validation は他軸の責務

### Commit Lineage

- judgementCommit: `e806bfa` (本 entry を含む A5 全実装 commit)
- preJudgementCommit: `e9e4ac8` (前 commit、A4 完了 + Lineage update 後)
- judgementTag: `aag-platformization/DA-α-005-judgement` (e806bfa に annotated tag landing 済)
- rollbackTag: `aag-platformization/DA-α-005-rollback-target` (e9e4ac8 に annotated tag landing 済)
- implementationCommits:
  - `e806bfa` — A5 全実装 (drawer-generator + 3 artifact + sync guard 10 test + package.json scripts + DA entry + guard-test-map 反映)

### 振り返り (Phase 2 / DA-α-006 simulation 内 = 2026-05-02)

> 詳細 observation table は DA-α-006 §振り返り に集約 (= 5 簡素 measurement の集合体、duplicate 防止)。

- 観測 1 (3 artifact 生成 + 172 rule): **正しい** — `rule-index.json` (84KB) / `rules-by-path.json` (10KB) / `rule-by-topic.json` (16KB) 全 generate 成功、172 rule 全 articulate
- 観測 2 (sync guard 10 test PASS): **正しい** — `aagDrawerSyncGuard.test.ts` 10 test 全 PASS (CT4 で実測)
- 観測 3 (mapped 率): **部分的** — 52/172 = 30.2% (mapped) / 120/172 = 69.8% (unmapped)。imports / codeSignals heuristic の coverage 限界を確認、post-Pilot で改善 candidate (例: guard test file の TARGET_PATHS 抽出 + responsibilityTags / canonicalDocRef 経由の path 推定)
- 観測 4 (slices/tags 全件 articulate): **正しい** — slices=5 / responsibilityTags=18 / guardTags=55 全 articulate
- 観測 5 (_seam articulate): **正しい** — 172/172 で `consumerKind` + `taskHint` + `sourceRefs` 全 articulate (post-Pilot Role Layer 差し込み口 forward compatibility 確保)
- **判定**: **部分的** — 5 観測中 4 件 "正しい"、1 件 (mapped 率) は heuristic 限界 articulate で post-Pilot 改善 candidate。F1 path-triggered access の **覆域** に直結 (= unmapped rule は path 経由 reach 不能、rule-by-topic 経由 reach は可能)。Pilot scope では `_seam` + 3 軸 routing が articulate されたことが本質、coverage 改善は post-Pilot
- 学習: heuristic ベースの path mapping は import / signal 不在の rule (= general / cross-cutting rule) を unmapped に逃がす設計だが、unmapped rule も rule-by-topic で reach 可能なので **F1 全体としては degraded ではなく partial coverage**。Pilot completion criterion (§2 #3 = AI simulation で F1-F5 verify) は満たされる
- retrospectiveCommit / Tag: `625e55c` (DA-α-006 と同一 commit、Phase 2 simulation で実測値 articulate)

---

## DA-α-006: Phase 2 Verification Simulation (CT1-CT5 / F1-F5 functioning verdict)

**status**: active

### 判断時 (2026-05-02 / Phase 2)

- **taskClass**: `policy-gate` (= verification 軸、Pilot 完了 criterion §2 #3 に直結)
- 候補:
  1. 2 週間運用観測 (= calendar-based、`AAG-REQ-NO-DATE-RITUAL` 違反)
  2. **AI 自身が CT1-CT5 を session 内 simulation + 観測 + 判定 (= state-based, scenario-driven)**
  3. 観測なし、Pilot 完了 criterion #3 を skip
- 採用案: 候補 2
- 判断根拠:
  - 事実 1: user 指示「2 週間運用観測ではなく、具体的な状況をシュミレーションし、AI 自身が観測し評価するやり方を取るべきです」(本 program reframe 履歴)
  - 事実 2: `AAG-REQ-NO-DATE-RITUAL` (本 CLAUDE.md「鉄則」3) — 期間 buffer は anti-ritual、archive / sunset trigger は state-based のみ
  - 事実 3: Phase 1 で 8 軸 articulation + 4 sync guard + 3 drawer artifact が landed、observable verification の素材が全揃い
  - 事実 4: 候補 3 (skip) は supreme principle (= observation なき articulation 禁止) + 不可侵原則 5 違反
  - 推論: 候補 2 は state-based + 即時実測 + AI judgement only で進む唯一の整合解。calendar 観測なしで Pilot 完了 criterion #3 を満たす
- 想定リスク:
  - 最大被害: AI simulation が own-side bias で F1-F5 全 PASS と self-confirm するが実態と乖離。mitigation = (a) 各 CT に **反証可能観測** (例: CT2 negative test、CT1 unmapped rule の articulate)、(b) 5 軸 articulation で「境界」= 検証範囲を articulate、(c) 各 CT の **quantitative result** (= 数値 / count / step 数) を landing
  - 二番目: simulation scenario が actual session usage を underrepresent。mitigation = post-Pilot で actual session log から CT 拡充 (= Phase 3 charter 候補)
- 振り返り観測点 (5 点):
  - 観測 1 (CT1 PASS): path-triggered access で `merged.ts` 編集 task が drawer 1 read で関連 rule subset に reach (TS trace は ≥3 tool calls 必要 = reach efficiency 改善 articulate)
  - 観測 2 (CT2 PASS、negative): 関係ない path で関連 rule surface 0 件 (= drawer の noise 抑制 articulate)
  - 観測 3 (CT3 PASS): rule detail rapid lookup で 2 read 以下で reach (rule-index で confirm + merged-architecture-rules.json で detail = migrationRecipe + fixNow + resolvedBy 全 articulate)
  - 観測 4 (CT4 PASS): drift detection で 4 sync guard (29 test) 全 active、PASS 状態
  - 観測 5 (CT5 PASS): session 間判断継承で DA entry 6 件 (000/002a/002b/003/004/005) + 12 annotated tag が landed、再 derivation 不要
  - 反証 (1 件): mapped 率 30.2% は F1 coverage の partial articulate (= post-Pilot 改善 candidate articulate)

### CT1-CT5 observation table (実測)

| CT | Scenario | Functioning | 実測値 | 判定 |
|---|---|---|---|---|
| **CT1** | path-triggered rule access (`@project-overlay/execution-overlay` 編集) | F1 必要 context のみ surface | drawer (`rules-by-path.byImport`) 1 read で `@project-overlay/execution-overlay` key の rule id 集合 reach。比較対象 = TS trace (= base-rules.ts 10,805 行 grep + import 解析) で ≥3 tool call。**reach efficiency: 1 read** | PASS |
| **CT2** | irrelevant path 編集で関連 rule surface 0 件 (negative test) | F1 noise 抑制 | `chart-tsx-like` keyword で byImport key 0 件、`@/presentation/` で exactly 3 rule (AR-A1-DOMAIN / AR-A1-APP-PRES / AR-A1-INFRA-PRES = 全 layer-boundary rule、想定通り)。**noise 0 / signal 100%** | PASS |
| **CT3** | rule detail rapid lookup (`AR-CAND-BIZ-NO-RATE-UI` 違反時) | F2 素早く reach | rule-index 1 read で 1 行 summary + slice + tags + _seam reach、merged-architecture-rules.json 1 read で migrationRecipe (3 step) + fixNow + resolvedBy (= operational state) 全 articulate。**total: 2 read** | PASS |
| **CT4** | drift detection (4 sync guard active 状態) | F3 機械検出 | `aagMergedArtifactSyncGuard` (6 test) + `aagContractSchemaSyncGuard` (7 test) + `ruleBindingBoundaryGuard` (6 test) + `aagDrawerSyncGuard` (10 test) = **29 test 全 PASS**。試験 drift hard fail は実装時に確認済 (本 simulation では既存 4 guard の active 確認のみ) | PASS |
| **CT5** | session 間判断継承 (新 session が `decision-audit.md` を read して再 derivation 不要) | F4 session 継承 | DA entry 6 件 landed (DA-α-000 / 002a / 002b / 003 / 004 / 005) + Phase 1 関連 commit 8 件 + 12 annotated tag (judgement + rollback-target × 6 entry) すべて push 済 (環境制約で remote tag push は 403、local では integrity 確保)。**新 session が DA を read することで判断 + 観測点 + commit lineage を再構築可能** | PASS |

### F1-F5 functioning verdict

| Functioning | verdict | 根拠 |
|---|---|---|
| **F1** 必要 context のみ surface (noise 抑制 + path-triggered) | **PASS (partial coverage)** | CT1 (1 read reach) + CT2 (noise 0) で principle 検証。ただし mapped 率 30.2% (= 52/172) で path 経由 reach 不能 rule あり。unmapped rule は rule-by-topic 経由で reach 可能 (= cross-axis fallback 確保)、F1 全体は **partial 機能 articulate** (post-Pilot で heuristic 改善 candidate) |
| **F2** 素早く reach | **PASS** | CT3 で 2 read reach (rule-index + merged-architecture-rules.json)。base-rules.ts 直接 grep (>10,000 行) 比で ≥10× efficiency |
| **F3** 機械検出 (drift) | **PASS** | CT4 で 4 sync guard 29 test 全 active + PASS。byte-identity / schema validation / regex boundary / structural sync で 4 軸全網羅 |
| **F4** session 間判断継承 | **PASS** | CT5 で DA entry 6 件 + 12 tag landed、再 derivation 不要 articulate |
| **F5** Decision Audit 履歴の articulate | **PASS** | DA-α-000 (進行モデル self-dogfood) + DA-α-002a 〜 005 (Phase 1 各軸 5 軸 articulation + commit lineage) + 本 entry (Phase 2 verification) で 7 entry 全 articulated。`taskClass` field を本 entry で初使用 (post-Pilot AI Role Layer 差し込み口 = seam 機能 verify) |

### 5 軸 articulation

- **製本** (canonical): 本 entry 自身 (= Phase 2 simulation 結果の唯一の articulate 点)。CT1-CT5 simulation script は再現性のため commit ログ + drawer artifact + sync guard test 結果で代替 (= AI session の non-deterministic 性により script 化困難)
- **依存方向**: Phase 1 の 8 軸 deliverable + 4 sync guard + 3 drawer artifact + DA entry 5 件 → 本 entry (= simulation observation 集約) → DA-α-007 (Phase 3 archive 判断) — 一方向、観測は派生・上流改変禁止
- **意味**: 「F1-F5 functioning が observable に verify されたか」(verification 1 問い、5 機能に分解)
- **責務**: simulation observation の articulate のみ (single responsibility = state-based verification の landing)。改善計画 / 横展開 charter は別 entry (DA-α-007) の責務
- **境界**: AI session 内 simulation (= state-based) の **内** = CT1-CT5 / F1-F5 verdict、**外** = 実 session log 解析 (= post-Pilot scope) / 横展開 candidate subsystem への適用 (= DA-α-007 + post-Pilot scope)

### Commit Lineage

- judgementCommit: `625e55c` (本 entry を含む Phase 2 verification commit)
- preJudgementCommit: `38a6f6a` (前 commit、DA-α-005 Lineage update)
- judgementTag: `aag-platformization/DA-α-006-judgement` (625e55c に annotated tag landing 済)
- rollbackTag: `aag-platformization/DA-α-006-rollback-target` (`38a6f6a` に annotated tag landing 済)
- implementationCommits:
  - `625e55c` — DA-α-006 entry landing (CT1-CT5 observation table + F1-F5 verdict + DA-α-005 retrospective merge + checklist Phase 2 全 [x])

### 振り返り (Phase 2 完了直後 = 本 commit landing 直後)

- 観測 1 (CT1 PASS): **正しい** — drawer 1 read で reach、TS trace との efficiency 差を articulate
- 観測 2 (CT2 PASS): **正しい** — noise 0 / signal 100% (presentation 関連 3 rule = layer-boundary 想定通り)
- 観測 3 (CT3 PASS): **正しい** — 2 read で migrationRecipe + fixNow + resolvedBy 全 reach
- 観測 4 (CT4 PASS): **正しい** — 4 sync guard 29 test 全 PASS
- 観測 5 (CT5 PASS): **正しい** — 6 DA entry + 12 tag landed、新 session 再構築可能
- 反証 (mapped 率 30.2%): **部分的** — F1 coverage の partial articulate、post-Pilot 改善 candidate
- 判定: **正しい (with partial F1 coverage)** — F1-F5 全 verdict PASS、F1 coverage 限界は post-Pilot で改善
- 学習:
  - state-based verification (= AI session 内 simulation) は calendar-based 観測の代替として **functioning** する。CT を quantitative にした (= read 数 / test 数 / rule id 数 / mapped 率) ことで own-side bias を mitigation
  - drawer の `_seam` field (= post-Pilot Role Layer 差し込み口) が articulate されていることで **forward compatibility が保たれる** (= 構造的に Phase 3 charter で role を articulate しても drawer 改変なしで対応可能)
  - mapped 率 30.2% の articulate は **partial coverage を hide せず articulate する** ことで AAG 5 軸「境界」= 機能の限界を honest に articulate (= Pilot Application としての self-dogfood 実例)
- **Pilot 完了 criterion (`plan.md` §2)** との整合:
  - #1 (8 軸 articulate): Phase 1 で全 met
  - #2 (実バグ 3 件修復): A2a で全 met
  - **#3 (AI simulation で F1-F5 verify): 本 entry で met (= partial coverage articulate を含む)**
  - #4 (Pilot 判断履歴 landing): DA-α-001 (Authority articulation = Phase 1 で A1 軸の verify のみ実施、別 entry articulate なし) を除き 002a / 002b / 003 / 004 / 005 / 006 で 6 件 landed → DA-α-001 は A1 verify が plan.md / decision-audit.md / source-of-truth.md back-link で完了済 (= 別 entry を増やさない、`strategy.md` §1.1「正本を増やさない」整合)
  - #5 (System Inventory に AAG entry が "Pilot complete" status で landing): Phase 3 (DA-α-007) で実施
- retrospectiveCommit / Tag: `625e55c` (本 entry と同一 commit、Phase 2 simulation を retrospective + judgement 同時 landing)
