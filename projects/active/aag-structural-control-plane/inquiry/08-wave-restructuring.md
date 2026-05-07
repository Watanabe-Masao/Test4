# inquiry/08 — Wave Restructuring 棚卸し

> **役割**: plan.md の Phase 0〜10 を **keep / defer / separate-program / 中止候補** に分類し、Wave 1 / Wave 2 / Wave 3 / 別 program candidate へ再配置するための棚卸し view。
>
> **trigger**: user review (#1283 後) で「現計画は方向性は妥当だが、現在の repo state（architecture-health 全面グリーン、reposteward 97% 進行）に対して一段重い」と articulate された。
>
> **scope**: 本 inquiry は **棚卸し** のみ。実 plan.md refactor は本 inquiry の結論を user 判断後に別 commit で実施する。
>
> **規約**: ADR-SCP-001〜015 は維持。Wave 構造への refactor はこの後の ADR-SCP-016 で articulate する候補。

## 0. 現状の active project 状況（2026-05-07 時点）

`references/04-tracking/generated/project-health.generated.md` から:

| project | progress | status |
|---|---|---|
| **aag-structural-control-plane**（本 program） | **0/42 (0%)** | in_progress |
| reposteward-ai-ops-platform | 204/211 (97%) | in_progress（archive 直前） |
| pure-calculation-reorg | 87/119 (73%) | in_progress |
| taxonomy-v2 | 50/60 (83%) | in_progress |
| presentation-quality-hardening | 13/21 (62%) | in_progress |
| quick-fixes | 12/13 (92%) | collection |

判断材料:

- **本 program は最低進捗**（0/42）であり、計画の重さに対し実装は始まっていない
- **reposteward が archive 直前**（97%）であり、本 program が Phase 8a/8b/8c で扱う obligation migration は reposteward の Premise Contract（Wave 5）と責務重複の可能性
- **既存 architecture-health は全面 PASS**（Hard Gate PASS / 60 KPIs OK）であり、「壊れた governance を直す」状態ではなく、「強い governance を更に拡張すべきか」の判断が必要
- 本 program が肥大化すると他 active program（特に pure-calculation-reorg / presentation-quality-hardening / reposteward archive 後）の review / merge / ratchet-down に影響

## 1. 棚卸し原則

各 Phase を以下 4 分類:

| 分類 | 意味 | 該当判定 |
|---|---|---|
| **KEEP-WAVE-1** | 本 program 内 Wave 1 で実施。価値検証 critical path | 軽い + 価値検証可能 + 既存 governance で carry できない |
| **DEFER-WAVE-2** | 本 program 内 Wave 2 へ後ろ倒し。Wave 1 結果を見て着手判断 | 重い OR Wave 1 入力待ち OR 価値検証後の判断 |
| **DEFER-WAVE-3** | 本 program 内 Wave 3 へ後ろ倒し。Wave 2 結果を見て着手判断 | Wave 2 後の付加価値、必須でない |
| **SEPARATE-PROGRAM** | 本 program scope 外、別 program candidate へ移譲 | 本 program responsibility 外 OR 既存 program と責務重複 |

判定基準:

- **価値検証**: 「これがないと本 program の核心価値（structural control plane）が立たないか?」
- **重さ**: 実装 cost / 文書 cost / 運用 cost / review cost
- **既存 program との関係**: reposteward / 既存 governance との責務境界が曖昧でないか
- **Wave 1 exit criteria**: managed zone ≤ 4、追加 schema ≤ 5、新 checker ≤ 3、誤検知未解決 == 0、new-only gate 未導入

## 2. Phase 0〜10 棚卸し表

### Phase 0: ADR + Existing Asset Mapping

- **現状**: 完了 in flight（本セッションで articulate、36 acceptance checkbox）
- **分類**: **COMPLETE**（Wave 構造の前提）
- **判断**: 本 program 開始時の foundation。Wave 1〜3 すべての前提となる ADR-SCP-001〜015 を articulate。**そのまま維持**

### Phase 1: Schema MVP（5〜6 PR）

- **現状**: 5 schema（aag-finding / tree-contracts / doc-kind-registry / document-contracts / temporal-scope-policy）
- **分類**: **KEEP-WAVE-1**（縮小）
- **Wave 1 narrowing**: 最小 3 schema のみ（`aag-finding.schema.json` + `tree-contracts.schema.json` + `doc-kind-registry.schema.json`）。`document-contracts.schema.json` + `temporal-scope-policy.schema.json` は Wave 2 へ
- **判断**: schema は inventory + shadow の前提、Wave 1 で必須。ただし最小 3 件で start、必要性に応じて拡張
- **rationale**: schema を全 5 件 landing しても、Phase 4 / 5 が defer なら使われない schema が残る → 価値検証後に追加

### Phase 2: Inventory（3〜4 PR）

- **現状**: repo-topology / markdown-inventory / yaml-inventory / generated-artifact-inventory
- **分類**: **KEEP-WAVE-1**（縮小）
- **Wave 1 narrowing**: managed zone 4 つに限定:
  - `top-level tree`
  - `projects/`
  - `references/04-tracking/`
  - `docs/contracts/`
- **判断**: 価値検証の前提、これがないと shadow check できない。ただし全 zone は Wave 2 へ
- **rationale**: references/01-foundation 等は Reading Pass が hot zone から始まる前提、最初から inventory する必要なし

### Phase 2.5: Existing Documentation Reading Pass（zone 単位、複数 PR）

- **現状**: 12 zone を読む計画（references/README → aag/ → projects/ → docs/contracts/ 等）
- **分類**: **DEFER-WAVE-2**（hot zone 限定で start）
- **Wave 1 → Wave 2 narrowing**: Wave 1 では実施せず、Wave 2 で **hot zone 4 つ限定**:
  - `references/04-tracking/`
  - `projects/active/`
  - `CLAUDE.md`
  - `docs/contracts/`
- **判断**: 全 zone Reading Pass は人手負荷が過大、価値検証前に過剰投資のリスク
- **rationale**: 「全部読む」より「checker と結びつく場所を先に読む」（user review #1283 §2 整合）。`references/01-foundation/` / `aag/_internal/` は Wave 3 以降または別 program 候補

### Phase 3: Tree Contract Shadow（2〜3 PR）

- **現状**: 主要 layer + references zone を Tree Contract 対象
- **分類**: **KEEP-WAVE-1**（縮小）
- **Wave 1 narrowing**: top-level tree のみ（`references/` / `aag/` / `aag-engine/` / `projects/` / `docs/contracts/` / `app/` / `tools/` / `wasm/`）。`app/src/{domain,application,infrastructure,presentation,features}` 等の中間階層は Wave 2 へ
- **判断**: parse-free で軽い、価値検証しやすい
- **rationale**: top-level だけでも `unmanaged-but-tolerated` 状態が articulate でき、Wave 1 の核心価値（構造可視化）が立つ

### Phase 4: Document Kind + Temporal Scope Shadow（2〜3 PR）

- **現状**: doc-kind-registry / temporal-scope-policy の shadow check
- **分類**: **DEFER-WAVE-2**
- **判断**: Reading Pass の結果待ちで動く部分が多い、Wave 1 では着手しない
- **rationale**: temporal-scope checker は誤検知率が読めず、価値検証前の作り込みは過剰。Wave 2 で hot zone Reading Pass の結果を入力にして start

### Phase 5: Document Contract Declaration + Rewrite/Move/Archive PRs（多数 PR、15〜25 想定）

- **現状**: 全文書一斉適用
- **分類**: **DEFER-WAVE-2**（hot zone 限定）
- **Wave 2 narrowing**: hot zone 4 つ限定で zone × disposition の Finding group PR を start。想定 PR 数 5〜8（15〜25 から大幅縮小）
- **判断**: 全文書一斉適用は重すぎる、価値検証後に start
- **rationale**: ADR-SCP-012 の zone × disposition partition は維持しつつ、scope を hot zone に絞る

### Phase 6: AI Instruction Pack（2〜3 PR）

- **現状**: `aag docs instruction <doc-id>` + post-write validation
- **分類**: **DEFER-WAVE-3** または **SEPARATE-PROGRAM 候補**
- **判断**: doc-kind-registry の精度が出てから判断、本 program 必須ではない
- **rationale**: user review #1283 §3「Instruction Pack は JSON 生成より、まず既存 doc-registry 拡張の実運用で必要性を確認」と整合。Wave 2 で document contract の実運用を経てから「本当に Instruction Pack が必要か」を判断

### Phase 7: Required Docs Matrix（2 PR）

- **現状**: repo 構造から必要 doc 導出
- **分類**: **DEFER-WAVE-3**
- **判断**: 上位 phase が安定してから着手
- **rationale**: feature-slice / wasm-module / active-project の必要 doc 検出は、現在 `projectDocStructureGuard`（既存）でカバー済みの部分が多い。**追加価値の検証必要**

### Phase 8a/8b/8c: Obligation / Required Reads 3 段階 Shadow Migration

- **現状**: OBLIGATION_MAP / PATH_TO_REQUIRED_READS の YAML authoring source 化
- **分類**: **SEPARATE-PROGRAM 候補**
- **判断**: reposteward Premise Contract（Wave 5）と責務重複の可能性、別 program で整理
- **rationale**: reposteward が 97% 進行中で Premise Contract 着地直前。reposteward が「path → required reads」の universal contract を articulate するなら、本 program で重複実装する意味は薄い。**reposteward archive 後に再評価**
- **代替案**: 本 program では「既存 OBLIGATION_MAP の値が drift していないか」の advisory check のみ実施し、migration は reposteward 系統に委ねる

### Phase 9: Artifact Coverage Gate（2 PR）

- **現状**: 未管理 artifact 検出
- **分類**: **DEFER-WAVE-3** または **SEPARATE-PROGRAM 候補**
- **判断**: 既存 `docs:check` で部分カバー済み（generated section / KPI drift）。追加価値の articulate 必要
- **rationale**: 「未管理 artifact」を全件検出すると false-positive が膨大化。価値検証ポイントを Wave 1 で articulate してから着手判断

### Phase 10: Runner Parity Contract（1〜2 PR）

- **現状**: pre-push / CI / npm scripts / aag-engine advisory checks の同期検証
- **分類**: **SEPARATE-PROGRAM**（reposteward の責務）
- **判断**: 本 program scope 外
- **rationale**: pre-push / CI / npm scripts の整合性は reposteward の `aag-engine` が責務（既存 self-check / chaos run の延長）。本 program で重複実装しない
- **移譲先**: reposteward Wave 6 候補 or `aag-engine-runner-parity-extension`

## 3. §A1 / §A2 checker 棚卸し（plan.md やってはいけないこと §A1/§A2 に対応）

### §A1 checker（11 件、AAG Core 永続）

| checker | 元 Phase | Wave 配置 | 分類 | 判断 |
|---|---|---|---|---|
| `check-yaml-machine-truth` | Phase 1 | Wave 1 | **KEEP-WAVE-1** | grep ベース、軽い、reposteward JSON-first 整合 |
| `check-doc-contracts` | Phase 5 | Wave 2 | **DEFER-WAVE-2** | doc-registry 拡張実装後 |
| `check-doc-temporal-scope` | Phase 4 | Wave 2 | **DEFER-WAVE-2** | 誤検知率検証必要 |
| `check-tree` | Phase 3 | Wave 1 | **KEEP-WAVE-1** | top-level tree のみ |
| `check-no-prewrite-hook` | Phase 6 | Wave 3 | **DEFER-WAVE-3** | Phase 6 と同期 |
| `docs:check 拡張` | Phase 1 | Wave 1 | **KEEP-WAVE-1** | YAML→JSON drift 検出、軽い |
| `check-obligation-drift` | Phase 8a | 別 program 候補 | **SEPARATE-PROGRAM** | reposteward Premise Contract と責務重複 |
| `check-reading-pass-schema` | Phase 2.5 | Wave 2 | **DEFER-WAVE-2** | Reading Pass start 時 |
| `check-phase-ordering` | Phase 1 | 別 program 候補 | **SEPARATE-PROGRAM** | universal な multi-phase pattern、別 program へ |
| `check-finding-group-pr` | Phase 5 | 別 program 候補 | **SEPARATE-PROGRAM** | universal な migration PR convention、別 program へ |
| 既存 `PZ-13` + `C1` | 既存 | 既存 mechanism 利用 | **EXISTING** | 維持 |

§A1 Wave 1 件数: **3 件**（`check-yaml-machine-truth` / `check-tree` / `docs:check 拡張`）+ 既存 mechanism 1 件 = Wave 1 exit criteria「新 checker ≤ 3 本」を満たす

### §A2 checker（4 件、project-scoped boundary protection）

| checker | Wave 配置 | 分類 | 判断 |
|---|---|---|---|
| `app-untouched` | Wave 1 | **KEEP-WAVE-1** | boundary protection、Wave 1 から有効 |
| `docs-contracts-aag-untouched` | Wave 1 | **KEEP-WAVE-1** | 同上 |
| `no-new-references-doc` | Wave 1 | **KEEP-WAVE-1** | 同上、Reading Pass disposition 例外は Wave 2 で articulate |
| `hard-gate-surface` | Wave 1 | **KEEP-WAVE-1** | 同上 |

§A2 全 4 件 Wave 1 で start。boundary protection の image はそのまま維持（変更なし）。

## 4. 棚卸し集計

| Wave / 区分 | Phase | §A1 checker | §A2 checker | 概算 PR 数 |
|---|---|---|---|---|
| **Wave 1**（Structural Inventory MVP） | Phase 1（縮小） + Phase 2（縮小） + Phase 3（縮小） | 3 件 + 既存 1 | 4 件 | 8〜12 PR |
| **Wave 2**（Contract Pilot） | Phase 2.5（hot zone 限定） + Phase 4 + Phase 5（hot zone 限定） | 3 件追加 | 0（変更なし） | 8〜12 PR |
| **Wave 3**（Governance Migration） | Phase 6 + Phase 7 + Phase 9 | 1 件追加 | 0 | 4〜6 PR |
| **別 program 候補** | Phase 8a/8b/8c + Phase 10 | 3 件 | 0 | 別 program で landing |

合計縮小:

- 元計画: Phase 0〜10 + §A1 11 件 + §A2 4 件、想定 PR 数 30〜45
- 棚卸し後: Wave 1 + Wave 2 + Wave 3、想定 PR 数 20〜30、別 program へ移譲 5〜8 PR
- **本 program 範囲縮小: 約 25〜35%**

## 5. Wave 1 exit criteria（数値化、user review #1283 §5 整合）

Wave 1 完了条件:

- [ ] managed zone == 4（top-level tree + projects/ + references/04-tracking/ + docs/contracts/）
- [ ] 追加 schema ≤ 3（aag-finding + tree-contracts + 最小 doc-kind-registry）
- [ ] 新 §A1 checker ≤ 3（check-yaml-machine-truth + check-tree + docs:check 拡張）+ 既存 mechanism 1（PZ-13/C1）
- [ ] §A2 checker = 4（変更なし、boundary protection 維持）
- [ ] 誤検知レビューで未解決 == 0
- [ ] new-only gate 未導入（advisory のみ）
- [ ] valid finding が出る（= 既存 governance で拾えていない repo の structural drift を最低 1 件 articulate）
- [ ] 運用コストが読める（= AI session の探索 cost と user review cost が articulate 済）

## 6. 中止条件（user review #1283 §「追加した方がよいもの」整合）

以下のいずれかが Wave 1 で発生したら、本 program を **paused 状態**にして再評価:

1. **誤検知率が高い**: shadow check の false-positive rate > 30%、運用 cost 過大
2. **Reading Pass の人手負荷が過大**: Wave 2 へ進む前に hot zone Reading Pass の cost が articulate 不能
3. **既存 program と責務衝突**: reposteward の Premise Contract / Task Capsule と本 program の Document Contract の境界が articulate 不能
4. **valid finding が出ない**: 既存 governance（architecture-health / projectizationPolicyGuard / docRegistryGuard 等）で十分カバー済みと判明
5. **他 active program の進行に影響**: 本 program review / merge / ratchet-down が他 program の archive を遅延

## 7. 価値検証ポイント（Wave 1 で確認すべき）

Wave 1 で以下を articulate して Wave 2 進入判断:

| 検証項目 | 判定方法 | 期待値 |
|---|---|---|
| Tree Contract drift | top-level tree の `unmanaged-but-tolerated` 数 / declared 数 | drift count > 0、かつ既存 guard で拾えていないもの |
| 未登録 Markdown | repo 全体の Markdown - doc-registry entry 数 | gap count > 0、かつ既存 docRegistryGuard で警告されていないもの |
| YAML machine truth violation | detector / CI / AAG CLI が `*.yaml` を直読する import の grep 結果 | violation count > 0 で existing program のリスク articulate |
| §A2 boundary protection | `aag scp check` が AI session で actionable な finding を返す | boundary 逸脱 candidate が AI に提示される |
| Finding schema 妥当性 | Phase 1 で landing した aag-finding schema が実 finding を articulate できる | schema が後付け拡張なしで Wave 1 finding を表現可能 |

## 8. 棚卸し結論 + 後続判断材料

### 結論

本 program は方向性は妥当だが、**Wave 1 を Structural Inventory MVP に絞る** ことで価値検証 + 重さ抑制を両立可能。

### 後続判断（user 判断必要）

本棚卸し結論を踏まえた次の選択肢:

1. **棚卸し採用 + plan.md refactor**: 本 inquiry を入力に plan.md を Wave 1/2/3 + 別 program candidate に refactor。ADR-SCP-016（Wave restructuring）を articulate。checklist.md も Wave 1 exit criteria + 中止条件に update
2. **棚卸し参考 + plan.md 不変**: 本 inquiry を articulate のみで残し、plan.md は現状維持。Phase 1 着手時に user 判断で Wave 構造を反映
3. **棚卸し採用 + program 一旦 paused**: 棚卸し結果が「reposteward archive 後に再評価」を示すなら、本 program を paused にして他 program 進捗を待つ
4. **棚卸し採用 + scope 大幅縮小**: Wave 1 のみを本 program として完遂し、Wave 2/3/別 program は archive 後の後継 program で扱う

### 推奨

**選択肢 1（棚卸し採用 + plan.md refactor）** を推奨。理由:

- 棚卸し結果を articulate のみに留めると（選択肢 2）、Phase 1 着手時に再判断 cost が発生
- program 一旦 paused（選択肢 3）は他 active program との resource sharing には有利だが、本 program の foundation（ADR-SCP-001〜015）が活用されないまま放置される
- scope 大幅縮小（選択肢 4）は妥当だが、Wave 2/3 を最初から「別 program 候補」と articulate した方が migration cost の見通しが立つ
- 選択肢 1 なら、Wave 構造に refactor することで本 program の self-discipline（exit criteria + 中止条件）が機械検証可能になる

## 9. 開いている議論点（user 判断材料）

- Q1: Wave 2 の `hot zone Reading Pass` の対象 4 件（references/04-tracking/, projects/active/, CLAUDE.md, docs/contracts/）は妥当か?
- Q2: Phase 8a/8b/8c を SEPARATE-PROGRAM とする判断は、reposteward Premise Contract の最終仕様確定を待つべきか?
- Q3: Phase 6（AI Instruction Pack）を Wave 3 で着手するか、SEPARATE-PROGRAM 候補へ移譲するか?
- Q4: Wave 1 価値検証ポイントの「valid finding が出るか」について、最低何件を success threshold とするか?
- Q5: 中止条件の判定 timing は Wave 1 完了時 1 回のみか、Phase 1 / 2 / 3 の各 phase 完了時に gate するか?

## 10. 整合性確認項目

- [ ] 本 inquiry が ADR-SCP-001〜015 と矛盾しない（Wave 構造は ADR を invalidate しない、棚卸しのみ）
- [ ] §A2 boundary protection 4 件が Wave 1 維持される（不可侵、変更なし）
- [ ] reposteward-ai-ops-platform との責務重複候補（Phase 8a/8b/8c / Phase 10）が articulate されている
- [ ] Wave 1 exit criteria が数値化されている（user review #1283 §5 整合）
- [ ] 中止条件が articulate されている（user review #1283 整合）
- [ ] 価値検証ポイントが articulate されている（user review #1283 整合）
- [ ] 後続判断（user 判断必要）の選択肢が明示されている
- [ ] 推奨判断とその根拠が articulate されている
