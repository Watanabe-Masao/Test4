# plan — aag-self-hosting-completion

> **上位**: AAG framework の self-hosting closure 真の達成 (= AAG-REQ-SELF-HOSTING を code-level + entry navigation rigor 完全達成)。
> **scope**: structural reorganization (= references/ + aag/ + projects/ の boundary を structural separation で articulate)、内容保持、機能 loss 0。
> **trigger source**: AAG Pilot 完遂 + operational-protocol-system bootstrap 後の user articulation で、AAG framework の entry navigation level での self-hosting failure が articulate された (= 本 session)。

---

## §1 不可侵原則 8 件

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) を **touch しない** | revert |
| **2a** | AAG framework articulate **内容** (= text / 意味論) を改変しない (= 物理 location のみ移動、articulate text 不変、ただし R6 で meta.md §2.1 self-hosting closure 部分のみ honest update 例外) | revert |
| **2b** | AAG framework **構造** (= directory layout / sub-directory 追加) は本 program scope 内 (= R1 で `aag/_internal/` + `aag/_framework/` skeleton 新設は scope 内、不可侵原則違反ではない、ただし新 directory が articulate 不要な内容変更を引き起こすことは禁止) | revert |
| 3 | Standard / drawer / 5 文書 template の articulate 内容を改変しない (= 物理 location 移動のみ) | revert |
| 4 | 既存 functionality を **100% 維持** (= 内容保持、phase 別 verify で 0 functionality loss) | revert |
| 5 | 各 R-phase は **judgement commit + rollback tag** で完結 (= drawer Pattern 1 application、R-phase 内では partial migration を **同一 commit 内で完結**、複数 commit 跨ぎ partial migration は禁止)。R-phase は必要なら **sub-phase に分割** (= R3a-R3d 等)、各 sub-phase が独立した judgement commit | revert |
| 6 | 各 R-phase に observation 観測点 ≥ 5 件 (= drawer Pattern 6 application、反証可能 ≥ 1)。観測点は **machine-verifiable で articulate** (= grep / test command で yes/no)、subjective 観測点は honest skip articulate (= drawer Pattern 4 + 5 application instance) | scope 外 |
| 7 | 起動・archive 判断は **user 領域**、AI 単独で起動・archive しない | scope 外 |
| **8** (新設、self-evaluation 反映) | operational-protocol-system project boundary を本 program で侵さない (= R5 は **project resume + skeleton fill のみ**、M1-M5 deliverable の articulate は operational-protocol-system project 内で実施) | revert |

---

## §2 完了 criterion

**完了 = 以下が同時に satisfy**:

1. R0-R7 全 deliverable landed
2. 3 tree (= references / aag / projects) の境界 articulated + 5 README + CURRENT_PROJECT.md + CLAUDE.md で機械可読
3. 1,000+ inbound link 全 update + broken link 0 件
4. 138 guard / collector path constants update + 944 test 全 PASS 維持
5. **7 guard active** (= 5 新設 + 1 拡張 + 1 統合 entry、self-evaluation 反映で 14 → 7 集約、§6.2 一覧)
6. AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update (R6)
7. AAG framework / Standard / drawer / 5 文書 template / 主アプリ code に **内容変更 0 件** (= 物理 location 移動のみ、R6 例外 = meta.md §2.1)
8. operational-protocol-system R5 で再開、M1 deliverable が **references/05-aag-interface/protocols/** に landing
9. `*.generated.md` 命名規約適用 (= references/04-tracking/ 配下の機械生成 file 全件 suffix)
10. `projects/` split (= active/ + completed/) 完了 + `_template/` 新構造 migrate
11. `CURRENT_PROJECT.md` pointer-only 固定 + 機械検証 guard 動作
12. pre-commit hook で boundary 違反早期検出 (= R7 で統合)

---

## §3 Phase 構造

### Phase 0: Bootstrap (本 commit までで完了)

bootstrap 履歴は `decision-audit.md` DA-α-000 に集約。本 commit (b19518c) + Lineage update (4d189a1) + 軌道修正 articulation update (= 構造案 refinement、本 commit) 後、R0 着手。

### Phase R0: 境界定義先行 (= structural change 前の articulation update)

**目的**: 構造変更前に **3 tree の境界 articulate** を root README で確立。R1 以降の物理移動が start した後でも、AI / userが物理配置を見るだけで「読む / 読まない」を即判断できる state を作る。

**deliverable**:

- `references/README.md` update — **「主アプリ改修 userの knowledge interface」** と明示、3 tree (references / aag / projects) の境界 articulate
- `aag/README.md` 新設 — **「AAG framework 本体、主アプリ改修 userは通常 not read」** + `aag/_internal/` + `aag/_framework/` 構造の articulate (= R1 で fill する skeleton)
- projects/ root の README.md update — **「作業単位 lens、状態正本でも進捗集約でもない」** と明示、active + completed の境界 articulate (= R6 で active/ + completed/ split 適用予定)
- `CURRENT_PROJECT.md` update — **「active project pointer 限定、詳細進捗・判断は `projects` 配下 `active/<id>`/ に集約」** と明示
- `CLAUDE.md` update — 3 tree の境界 + reader-별 routing を 1 section で articulate (= AAG セクション既存記載との整合維持)

**scope 外** (= drawer Pattern 2):

- 構造変更 (= 物理移動・rename、R1 以降で実施)
- AAG framework articulate 内容改変 (= 不可侵原則 2)
- 主アプリ code touch

**観測点** (= drawer Pattern 6):

- R0-1: 5 README + CLAUDE.md で 3 tree の境界 articulated
- R0-2: 「主アプリ改修 user read OK / not read」が file 名 / directory 名から判断可能 articulated
- R0-3: `*.generated.md` 命名規約 articulate (= R3 以降で適用予定の予告 articulate)
- R0-4: 944 test 維持
- R0-5 (反証): 後続 R-phase の物理移動 instruction が R0 articulate と齟齬する場合 verify fail

### Phase R1: AAG sub-tree relocation

**deliverable**:

- `aag/_internal/` 新設 + `aag/_internal/` 9 doc を移動 (= meta.md / strategy.md / architecture.md / evolution.md / source-of-truth.md / operational-classification.md / layer-map.md / display-rule-registry.md / README.md)
- `aag/_framework/` skeleton 新設 (= rules / collectors / generators / schemas / fixtures の subdirectory + README、後続 phase で AAG framework 実装の物理移動を準備、本 R1 では skeleton のみ)
- 101 inbound link を新 path (= aag/_internal/) に全 update
- guard / collector の path constants 該当箇所 update (= aag-related guard 群)
- doc-registry.json + manifest.json reorganize entry

**scope 外**:

- AAG public interface (= drawer / protocols / operations) の relocate (= R2 で実施)
- AAG framework 実装 (= rules / collectors / etc.) の物理移動 (= 別 program candidate、R7 後判断)
- AAG articulate 内容改変 (= 不可侵原則 2)
- references/ directory rename (= R3 で実施)
- 主アプリ code touch (= 不可侵原則 1)

**観測点 (= drawer Pattern 6)**:

- R1-1: 9 doc が aag/_internal/ に物理 移動
- R1-2: 101 inbound link が新 path に全 update (= broken link 0 件)
- R1-3: guard / collector の path 反映後 944 test 全 PASS
- R1-4: doc-registry.json + manifest.json で新 path 整合
- R1-5 (反証): synthetic broken link 試験で test fail (= ratchet-down)

### Phase R2: AAG public interface を references/05-aag-interface/ に relocate

> **境界 articulate**: AAG framework 自身は `aag/_internal/` (R1) + `aag/_framework/` skeleton (R1) に配置、ただし **主アプリ改修 userが読む AAG public interface (= drawer / protocols / operations)** は `references/` 配下に置く (= reader-別 structural separation)。

**deliverable**:

- `references/05-aag-interface/` 新設 + sub-directory: `drawer/` + `protocols/` + `operations/` + `README.md`
- `references/05-aag-interface/drawer/` に `references/05-aag-interface/drawer/decision-articulation-patterns.md` 移動
- `references/05-aag-interface/operations/` に AAG 運用 guide 4 doc 移動 (= projectization-policy.md / project-checklist-governance.md / new-project-bootstrap-guide.md / deferred-decision-pattern.md)
- `references/05-aag-interface/protocols/` skeleton (= R5 で fill する空 directory + README)
- aag/ 側に **stub なし**: `aag/interface/` ディレクトリは作らない (= 境界矛盾防止)
- 該当 inbound 全 update (= 5 doc 計、各 doc の inbound 数次第で数十-数百件)
- doc-registry.json + manifest.json 更新

**scope 外**:

- protocols 内 doc の articulate (= R5 で operational-protocol-system M1-M5 deliverable を landing)
- references/03-implementation/ の他 doc (= 主アプリ実装ガイドは R3 で directory rename のみ、AAG-related のみ references/05-aag-interface/ に migrate)
- aag/ 内に主アプリ改修 user向け doc を残す (= 境界矛盾防止、不可侵原則 4)

**観測点**:

- R2-1: 5 doc が references/05-aag-interface/ 配下に物理移動
- R2-2: inbound 全 update + broken 0
- R2-3: doc-registry / manifest 整合
- R2-4: 944 test 維持
- R2-5 (反証): aag/ 配下に主アプリ改修 user向け doc が 0 件であることを machine 検証 (= synthetic 違反 test で fail)

### Phase R3: references/ directory rename + 命名規約適用 (= sub-phase 化、self-evaluation 反映)

**self-evaluation 反映**: 元 R3 は 5 directory rename + 1,000+ inbound update + 138 guard / collector + naming convention + PR template + decisions/ 新設 = 1 commit に収まらない物理現実。**4 sub-phase に分割**、各 sub-phase = independent judgement commit + rollback tag (= 不可侵原則 5 articulate)。

#### R3a: 5 directory rename + 1,000+ inbound update

**deliverable**:

- `references/01-foundation/` → `references/01-foundation/` (= AAG sub-tree は R1 で relocate 済、残りを rename)
- `references/04-tracking/` → `references/04-tracking/`
- `references/02-design-system/` → `references/02-design-system/`
- `references/03-implementation/` → `references/03-implementation/` (= AAG-related は R2 で references/05-aag-interface/ に migrate 済、残りを rename)
- `references/04-tracking/elements/` → `references/04-tracking/elements/` (= R4 の前提、directory 移動のみ、内部構造化は R4)
- **1,000+ inbound link 全 update を R3a 内で完結** (= partial migration は同一 commit 内で閉じる、不可侵原則 5)

**観測点 (= machine-verifiable refine)**:

- R3a-1: `for d in 01-principles 02-status 04-design-system 03-guides 05-contents; do test ! -d references/$d; done` で 5 directory 不在
- R3a-2: `grep -rE "references/(01-principles|02-status|04-design-system|03-guides|05-contents)/" --include="*.md" --include="*.ts" --include="*.json" | grep -v "99-archive\|projects/completed" | wc -l` = 0 件 (= broken link 0)
- R3a-3: `npm run test:guards` で 944 test PASS
- R3a-4 (反証): synthetic 旧 path link を 1 件追加した状態で test fail (= ratchet-down 動作確認)
- R3a-5: doc-registry / manifest が新 path で整合 (= `npm run docs:check` PASS)

#### R3b: `*.generated.md` 命名規約適用 + generator 出力先変更

**deliverable**:

- `references/04-tracking/recent-changes.generated.md` → `references/04-tracking/recent-changes.generated.md` (= 機械生成化)
- 既存 `references/04-tracking/generated/*.md` (= 19 file、R3a で directory 移動済) → `*.generated.md` suffix 付与
- generator (`tools/architecture-health/src/renderers/`) の出力先 path constants update (= `*.generated.md` suffix 込み)
- 既存 inbound link を `*.generated.md` に update

**観測点**:

- R3b-1: `find references/04-tracking -name "*.md" -not -name "*.generated.md" -not -name "README.md"` で 手書き対象のみ (= `recent-changes.md` 等の旧 naming 0 件)
- R3b-2: `find references/04-tracking/generated -name "*.md" | grep -v ".generated.md" | wc -l` = 0 (= 全 generated に suffix)
- R3b-3: generator 再 run で出力 file が `.generated.md` suffix で生成
- R3b-4 (反証): synthetic で `*.generated.md` を手編集 → R3 完了後の `generatedFileEditGuard` で fail
- R3b-5: `npm run docs:check` PASS

#### R3c: 旧 mention 撤退 (= PR template / CLAUDE.md / .github/* update) + doc-improvement-backlog P1 batch 解消

**deliverable**:

- `.github/PULL_REQUEST_TEMPLATE.md` 内 旧 path 参照 約 9 箇所を新 path に update (= §7.7 articulated 一覧)
- `CLAUDE.md` 内 旧 section path 参照を新 path に update
- `.github/workflows/*.yml` で旧 path に依存する箇所があれば update
- **doc-improvement-backlog.md P1 batch 解消** (= 「人間」→ 「user」grep + sed bulk + 「主アプリ改修 user」→ 「主アプリ改修 user」統一、~150 箇所推定、4 系統 lens 違反検出も同 batch で解消)
- doc-improvement-backlog.md status update (= P1 完遂 articulate、P2-P3 は post-R7 candidate)

**観測点**:

- R3c-1: `grep -nE "references/(01-principles|02-status|04-design-system|03-guides|05-contents)/" .github/ CLAUDE.md` = 0 件
- R3c-2: PR template 内 9 箇所が articulate 通り update 済 (= grep で旧 path 0 件)
- R3c-3: `.github/workflows/*.yml` の旧 path 0 件
- R3c-4 (反証): 旧 path を再追加した PR template で `oldPathReferenceGuard` (R3d で landing) が fail
- R3c-5: `npm run docs:check` + `npm run lint` PASS

#### R3d: guard / collector path constants update + doc-registry / manifest update + decisions/ 新設 + 新 guard landing

**deliverable**:

- 138 guard / collector の path constants update (= aag-related 以外、aag は R1 で update 済)
- `docs/contracts/doc-registry.json` 全 entry path update
- `.claude/manifest.json` `discovery.byTopic` / `byExpertise` 内 path update
- `references/01-foundation/decisions/` 新設 (= user 判断置き場、recent-changes 生成化と分離)
- **新 guard 2 件 landing** (集約後):
  - `generatedFileEditGuard.test.ts` (= `*.generated.md` 手編集検出、Hard fail、baseline=0)
  - `oldPathReferenceGuard.test.ts` (= 旧 path reference 残置検出、Hard fail、baseline=0、archive-to-archive 例外 whitelist)

**観測点**:

- R3d-1: 138 guard / collector 全 path update 後 944 test + 新 guard 2 件 PASS
- R3d-2: doc-registry.json 全 entry path が新 path 整合 (= `node -e 'check'` で 0 broken)
- R3d-3: manifest.json discovery が新 path 整合
- R3d-4: `references/01-foundation/decisions/` directory 存在
- R3d-5 (反証): synthetic 旧 path reference / 手編集試験で 2 新 guard fail

**R3 (R3a-R3d 統合) scope 外**:

- per-element directory 化 (= R4 で実施、R3 では `05-contents` → `04-tracking/elements/` の dir 移動のみ)
- dashboard layer 新設 (= R4 で実施)
- 内容変更 (= 不可侵原則 2a/3) (= R7 で landing する手編集禁止 guard の precursor verify)

### Phase R4: per-element directory + dashboard layer + element taxonomy

**deliverable** (= 段階導入、initial pilot subset で start):

- `references/04-tracking/elements/element-taxonomy.md` 新設 — ID prefix 正本: `WID-*` (UI widget) / `CHART-*` (chart / visualization) / `ENG-*` (engine / calculation runtime) / `PAGE-*` (application page) / `FLOW-*` (user / data flow)
- `references/04-tracking/elements/element-index.generated.md` 新設 — 全 element 索引 (機械生成)
- `references/04-tracking/dashboards/` 新設 + 機械生成 dashboard 4 件 (= `quality-dashboard.generated.md` / `migration-progress.generated.md` / `element-coverage.generated.md` / `boundary-health.generated.md`)
- `references/04-tracking/elements/<category>/<id>/` per-element directory 化 (= pilot subset = `charts/` 5 element で start、widgets / read-models / calculations / ui-components は段階適用)
- per-element 4 doc:
  - `README.md` (= 手書き、overview + 1 行定義 + upstream 定義への pointer)
  - `implementation-ledger.md` (= 手書き、改修履歴 / commit lineage / 変更 rationale)
  - `quality-status.generated.md` (= 機械生成、test coverage / health metrics / 制約状態)
  - `open-issues.generated.md` (= 機械生成、guard / collector からの active issue surface)
- 既存 single-file spec (= WID-001.md 等) を per-element directory `README.md` に migrate (= pilot subset 範囲、charts/ 5 element 分のみ)

**scope 外**:

- 全 89 element 一括 full 適用 (= drawer Pattern 5 意図的 skip + rationale: pilot subset で value verify 後段階適用)
- dashboard layer の 内容enrichment (= initial skeleton のみ、enrichment は段階別)
- 命名規約変更 (= R3 で確立済の `*.generated.md` を維持)

**観測点**:

- R4-1: pilot subset (= charts/ 5 element) の per-element directory 完成
- R4-2: dashboard layer 4 doc skeleton (= 全 `.generated.md` suffix) landed
- R4-3: 機械生成 mechanism 動作 (= `quality-status.generated.md` / `open-issues.generated.md` 自動 fill)
- R4-4: `element-taxonomy.md` で ID prefix 5 種類 (WID/CHART/ENG/PAGE/FLOW) articulated
- R4-5: 944 test 維持
- R4-6 (反証): pilot subset で AI が context 構築する simulation で reach efficiency verify (= 1 element directory 1 read で 4 doc 全 reach)

### Phase R5: operational-protocol-system project resume + 新構造前提 plan refinement trigger (= self-evaluation 反映で scope 縮小、user articulation で flow 確定)

**self-evaluation 反映**: 元 R5 は M1-M5 deliverable landing 全部を本 program 内で実施 articulated、ただし operational-protocol-system project boundary を侵す risk (= 不可侵原則 8 違反)。**scope 縮小**: 本 program は project resume + skeleton fill + plan refinement trigger のみ、operational-protocol-system project 内で **新構造前提 plan refinement** + M1-M5 deliverable 実装 (= R5 完了後 user 判断で起動)。

**user articulation 反映 (本 session)**: aag-self-hosting-completion R7 まで先行完了 → operational-protocol-system project が新構造前提に **plan 修正** + M1-M5 実装、という flow を確定。本 R5 は **plan 修正 trigger** として機能 (= 本 program が articulate trigger、refine 自体は operational-protocol-system project 内、不可侵原則 8 整合)。

**deliverable** (= 本 program scope):

- operational-protocol-system project HANDOFF.md ⏸ PAUSED articulation 解除 (= resume articulate)
- `references/05-aag-interface/protocols/README.md` で **landing 受け入れ structure** を articulate (= "本 directory は operational-protocol-system project の M1 deliverable (= task-protocol-system / task-class-catalog / session-protocol / complexity-policy) の landing 場所" を articulate)
- `aagBoundaryGuard` で landing 場所制約を機械検証 (= operational-protocol-system M1-M5 deliverable は本 location 限定)
- doc-registry.json + manifest.json で protocols/ entry articulate
- **plan refinement trigger articulate**: operational-protocol-system project resume 後、自身の plan を **新構造前提に refine** する task が articulate される (= 本 program は trigger のみ、refine 自体は operational-protocol-system project 内、不可侵原則 8 整合)

**scope 外** (= 不可侵原則 8 articulate):

- operational-protocol-system project 自身の plan / checklist 改変 (= 本 program は trigger only、refine 自体は別 project 内)
- M1-M5 deliverable の articulate 自体 (= task-protocol-system.md / etc. の content articulate は operational-protocol-system project 内で実施、本 program R5 では skeleton landing 場所 articulate のみ)
- operational-protocol-system project archive 判断 (= user 承認後、本 program scope 外)

**flow articulation (= user articulation 反映)**:

1. 本 program R0-R7 完遂 (= structural foundation + 7 guard active + AAG self-hosting closure 完成)
2. R5 trigger で operational-protocol-system project resume (= ⏸ PAUSED 解除)
3. operational-protocol-system project 内で **plan refinement** (= M1-M5 deliverable を `references/05-aag-interface/protocols/` 配置前提に refine、現 plan は `references/03-implementation/` 想定で articulated だが新構造前提に書き換え)
4. operational-protocol-system project 内で M1-M5 実装 + archive

**観測点**:

- R5-1: operational-protocol-system HANDOFF.md ⏸ PAUSED articulation 解除確認 (= `grep "PAUSED" projects/active/operational-protocol-system/HANDOFF.md` = 0 件 or "resumed" articulate)
- R5-2: `references/05-aag-interface/protocols/README.md` が landing 構造 articulate (= "operational-protocol-system M1 deliverable 受け入れ" articulate)
- R5-3: `aagBoundaryGuard` が active で landing 場所制約検証
- R5-4: operational-protocol-system project HANDOFF.md に「**新構造前提 plan refinement task**」が articulate (= grep で plan refinement keyword ≥ 1 mention)
- R5-5: 944 test 維持
- R5-6 (反証): synthetic で operational-protocol-system M1 deliverable を別 path に articulate 試行 → `aagBoundaryGuard` で fail

### Phase R6: AAG self-hosting closure articulate update + projects/ split + template migrate

**deliverable**:

- `aag/_internal/meta.md` §2.1 で AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update (= 不可侵原則 2 R6 例外)
- self-hosting closure 達成根拠を articulate (= R1-R5 の structural separation + reader-domain boundary structural articulation + 各 R-phase で landing した guard 一覧)
- `selfHostingGuard.test.ts` に **entry navigation rigor 検証項目追加** (= 構造的整合 機械検証):
  - aag/ 配下に主アプリ改修 user向け doc が 0 件 (= R2 guard 統合)
  - references/ 配下に AAG framework 内部 doc が 0 件 (= R1 guard 統合)
  - `*.generated.md` の手編集 0 件 (= R3 guard 統合)
  - element ID prefix 違反 0 件 (= R4 guard 統合)
- **`projects/` を `active/` + `completed/` に split** — 全 active project を `projects` 配下 `active/<id>` directory へ移動、`projects/completed/` は既存維持
- **`projects/_template/` を新構造前提に migrate** (= 新規 project bootstrap 時に新構造を強制)
- `CURRENT_PROJECT.md` を pointer 限定 articulation で固定 (= R0 で articulate 済の機械検証 guard 化)

**scope 外**:

- AAG framework 他 articulate の改変 (= 不可侵原則 2)
- AAG-REQ-* の他項目改変
- 新規 project の bootstrap (= 本 program scope 外、新 template から後続 program で起動)

**観測点**:

- R6-1: meta.md §2.1 articulate update 完了 + self-hosting closure 達成根拠 articulated
- R6-2: selfHostingGuard.test.ts 拡張 (= 4 boundary 検証項目追加) + PASS
- R6-3: projects/ split (= active/ + completed/) 完了 + 全 active project 物理移動 + inbound update
- R6-4: _template/ 新構造 migrate (= 新規 bootstrap で旧構造 file 生成不能)
- R6-5: CURRENT_PROJECT.md pointer-only guard 動作 (= inline progress / decision articulate 試験で fail)
- R6-6 (反証): AAG framework 内部正直化 articulate (= drawer Pattern 4 application、self-hosting failure 復帰試験で fail)

### Phase R7: 統合 guard 完成 + verify + archive

**deliverable**:

- **統合 guard** (= 各 R-phase で landing した guard を 1 集約 guard に集約 + pre-commit hook 統合):
  - `boundaryIntegrityGuard.test.ts` (新設) — 全 boundary 違反検出 (= R1-R6 guard 集約)
  - pre-commit hook で statesd guard 全 run (= 早期検出)
- 全 verify command PASS (= 944 test + docs:check + lint + build)
- AAG self-hosting at entry level の self-test PASS (= R6 で追加した検証 + 既存 selfHostingGuard)
- broken link 0 件 maximum verify (= 全 inbound link sweep)
- 138 guard / collector path 整合 verify
- 機能 loss 0 件 verify (= 主アプリ動作確認、E2E + storybook build)
- `references/04-tracking/recent-changes.generated.md` にサマリ landing
- archive 移行 (= user 承認後)

**観測点**:

- R7-1: 全 verify PASS (= 944 test + 新 guard + docs:check + lint + build)
- R7-2: self-test PASS (= boundaryIntegrityGuard で R1-R6 全 boundary verify)
- R7-3: broken link / 機能 loss 0 件
- R7-4: pre-commit hook で 5 boundary 違反全 type が早期検出可能 articulated
- R7-5: archive 完遂

---

## §4 やってはいけないこと

| 禁止事項 | なぜ |
|---|---|
| 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の touch | 不可侵原則 1 |
| AAG framework articulate 内容改変 (R6 例外を除く) | 不可侵原則 2 |
| Standard / drawer / 5 文書 template の articulate 内容改変 | 不可侵原則 3 |
| 機能 loss を伴う migration | 不可侵原則 4 |
| 単一 commit で 2 R-phase まとめる | 不可侵原則 5 (= rollback 境界 articulate 不能化) |
| 観測点 < 5 件 / 反証可能 0 件 で R-phase landing | 不可侵原則 6 |
| AI 単独 archive | 不可侵原則 7 |
| AI Role Catalog 本実装 | 別 program scope |
| per-element 全 89 element 一括 full 適用 | drawer Pattern 5 (意図的 skip): pilot subset で value verify 後段階適用 |
| dashboard layer の手書き化 | drift detection 機能を破壊、機械生成 mandatory |
| inbound update を後回しに R-phase landing | broken link 大量発生 risk、各 R-phase で必ず inbound update + verify |
| **`aag/interface/` を作る** (= 旧案) | 境界矛盾 (= 主アプリ改修 user not read directory に主アプリ改修 user向け doc 配置)、軌道修正済 = `references/05-aag-interface/` |
| `aag/` 配下に主アプリ改修 user向け doc 配置 | R2 `aagBoundaryGuard` で Hard fail |
| `references/` 配下に AAG framework 内部 doc 配置 | R1 `aagBoundaryGuard` で Hard fail |
| `*.generated.md` の手編集 | R3 `generatedFileEditGuard` で Hard fail |
| 旧 path 参照残置 (= `01-principles/` / `02-status/` / `03-guides/` / `04-design-system/` / `05-contents/`) | R3 `oldPathReferenceGuard` で Hard fail |
| element ID prefix 違反 (= `WID-*` を `charts/` 等) | R4 `elementStructureGuard` で Hard fail |
| `references/04-tracking/dashboards/` に手書き file 配置 | R4 `elementStructureGuard` で Hard fail |
| `CURRENT_PROJECT.md` に inline 進捗 / 判断 articulate | R6 `projectsStructureGuard` で Hard fail |
| `projects` 配下 `active/<id>` directory に正本定義 (= 業務 domain definition) 配置 | R6 `projectsStructureGuard` で Hard fail (= 正本は references/01-foundation/ に配置) |
| `projects/` root 直下に新規 project 配置 | R6 `projectsStructureGuard` で Hard fail (= active/ or completed/ 配下に配置) |
| pre-commit hook bypass (= `--no-verify`) | AAG framework 既存禁止維持 |

---

## §5 関連実装

### 触らない (既存資産は維持)

| パス | 役割 |
|---|---|
| `app/src/`, `app-domain/`, `wasm/` | 主アプリ code (= 不可侵原則 1) |
| AAG framework articulate 内容 | 不可侵原則 2 (R6 例外除く) |
| Standard / drawer / 5 文書 template | 不可侵原則 3 |
| 既存 functionality | 不可侵原則 4 |

### 境界 articulate (R0、構造変更前)

| パス | 内容 |
|---|---|
| `references/README.md` (update) | 主アプリ改修 userの knowledge interface と articulate、3 tree (references / aag / projects) 境界 |
| `aag/README.md` (新設) | AAG framework 本体と articulate、`_internal/` + `_framework/` skeleton |
| projects/ root の README.md (update) | 作業単位 lens、active + completed 境界 |
| `CURRENT_PROJECT.md` (update) | active project pointer 限定、詳細進捗 / 判断は `projects` 配下 `active/<id>`/ |
| `CLAUDE.md` (update) | 3 tree 境界 + reader-別 routing 1 section |

### 物理 location 移動 (R1-R3)

| 現 path | 新 path | Phase |
|---|---|---|
| `aag/_internal/*` (9 doc) | `aag/_internal/*` | R1 |
| `aag/_framework/{rules,collectors,generators,schemas,fixtures}/` (skeleton) | (新設、AAG framework 実装の物理移動は別 program、本 R1 では skeleton のみ) | R1 |
| `references/05-aag-interface/drawer/decision-articulation-patterns.md` | `references/05-aag-interface/drawer/decision-articulation-patterns.md` | R2 |
| `references/05-aag-interface/operations/projectization-policy.md` | `references/05-aag-interface/operations/projectization-policy.md` | R2 |
| `references/05-aag-interface/operations/project-checklist-governance.md` | `references/05-aag-interface/operations/project-checklist-governance.md` | R2 |
| `references/05-aag-interface/operations/new-project-bootstrap-guide.md` | `references/05-aag-interface/operations/new-project-bootstrap-guide.md` | R2 |
| `references/05-aag-interface/operations/deferred-decision-pattern.md` | `references/05-aag-interface/operations/deferred-decision-pattern.md` | R2 |
| `references/01-foundation/` (residual) | `references/01-foundation/` | R3 |
| `references/04-tracking/` | `references/04-tracking/` | R3 |
| `references/02-design-system/` | `references/02-design-system/` | R3 |
| `references/03-implementation/` (residual) | `references/03-implementation/` | R3 |
| `references/04-tracking/elements/*` | `references/04-tracking/elements/*` | R3 |
| `references/04-tracking/recent-changes.generated.md` (= R3 後 04-tracking/) | `references/04-tracking/recent-changes.generated.md` (= 機械生成化) | R3 |
| `references/04-tracking/generated/*.md` (19 file) | `references/04-tracking/generated/*.generated.md` (= 全 suffix 付与) | R3 |
| ``projects` 配下 active project directory` (各 active project) | `projects` 配下 `active/<active-id>` directory | R6 |

### 新設 (R3-R5)

| パス | Phase | 内容 |
|---|---|---|
| `references/01-foundation/decisions/` | R3 | user 判断の置き場 (= recent-changes 生成化 と分離) |
| `references/04-tracking/elements/element-taxonomy.md` | R4 | ID prefix 正本 (WID/CHART/ENG/PAGE/FLOW) |
| `references/04-tracking/elements/element-index.generated.md` | R4 | 全 element 索引 (機械生成) |
| `references/04-tracking/dashboards/{quality-dashboard,migration-progress,element-coverage,boundary-health}.generated.md` | R4 | 機械生成 dashboard |
| `references/04-tracking/elements/<category>/<id>/README.md` | R4 (pilot subset) | overview + 1 行定義 + upstream pointer |
| `references/04-tracking/elements/<category>/<id>/implementation-ledger.md` | R4 (pilot subset) | 改修履歴 / commit lineage / 変更 rationale |
| `references/04-tracking/elements/<category>/<id>/quality-status.generated.md` | R4 (pilot subset) | test coverage / health metrics |
| `references/04-tracking/elements/<category>/<id>/open-issues.generated.md` | R4 (pilot subset) | guard / collector からの active issue surface |
| `references/05-aag-interface/protocols/{task-protocol-system,task-class-catalog,session-protocol,complexity-policy}.md` | R5 (= operational-protocol-system M1) | |

### update + 新設 guard (R6-R7)

| パス | Phase | 内容 |
|---|---|---|
| `aag/_internal/meta.md` §2.1 | R6 | AAG-REQ-SELF-HOSTING を「完全達成」に articulate (R6 例外、不可侵原則 2 articulate) |
| `app/src/test/guards/selfHostingGuard.test.ts` | R6 | entry navigation rigor 検証項目追加 (= 4 boundary) |
| `app/src/test/guards/aagBoundaryGuard.test.ts` | R1 (新設) | aag/_internal/ 外への AAG framework 内部 doc 配置検出 |
| `app/src/test/guards/aagBoundaryGuard.test.ts` | R2 (新設) | aag/ 配下に主アプリ改修 user向け doc 配置検出 |
| `app/src/test/guards/aagBoundaryGuard.test.ts` | R2 (新設) | references/05-aag-interface/ 外への AAG public interface doc 配置検出 |
| `app/src/test/guards/generatedFileEditGuard.test.ts` | R3 (新設) | `*.generated.md` 手編集検出 |
| `app/src/test/guards/oldPathReferenceGuard.test.ts` | R3 (新設) | 旧 path reference 残置検出 |
| `app/src/test/guards/elementStructureGuard.test.ts` | R4 (新設) | element ID prefix 違反検出 |
| `app/src/test/guards/elementStructureGuard.test.ts` | R4 (新設) | per-element directory 4 doc 整合 |
| `app/src/test/guards/elementStructureGuard.test.ts` | R4 (新設) | dashboards/ 配下の手書き file 配置検出 |
| `app/src/test/guards/aagBoundaryGuard.test.ts` | R5 (新設) | references/05-aag-interface/protocols/ 外への M1-M5 deliverable 配置検出 |
| `app/src/test/guards/projectsStructureGuard.test.ts` | R6 (新設) | projects/ root 直下の project 配置検出 |
| `app/src/test/guards/projectsStructureGuard.test.ts` | R6 (新設) | CURRENT_PROJECT.md inline state 検出 |
| `app/src/test/guards/projectsStructureGuard.test.ts` | R6 (新設) | `projects` 配下 `active/<id>`/ 内正本定義配置検出 |
| `app/src/test/guards/boundaryIntegrityGuard.test.ts` | R7 (新設、統合) | 全 boundary 違反集約 entry point |
| `projects/_template/` | R6 | 新構造前提に migrate (= 新規 bootstrap 強制) |
| `tools/git-hooks/pre-commit` | R7 | boundaryIntegrityGuard 統合 |

---

## §6 定着 mechanism + 逆戻り防止 guard (= 構造改革を **強固** にし **逆戻り** させない)

### §6.1 設計原理

| 原理 | articulation |
|---|---|
| **強固 (= Hard guard)** | 各 R-phase で landing する guard は **Hard fail** (= test fail で commit / push block)、Soft warning ではない |
| **逆戻り防止 (= ratchet-down)** | guard は baseline=0 で fix、違反検出時 immediate fail (= 一度 PASS したら下げない) |
| **定着 (= structural integration)** | guard は **pre-commit hook + CI** で常時 run + `_template/` 更新で新規 project bootstrap も新構造強制 + AAG self-hosting closure articulation で boundary を AAG framework 自身が機械検証 |
| **段階導入** | R7 で全 guard 統合せず、各 R-phase 完了時に該当 guard を即 landing (= R-phase の deliverable に guard 自身が含まれる、ratchet-down で次 phase でも維持) |

### §6.2 guard 一覧 (= R-phase 別、各 ratchet-down baseline=0 で landing、self-evaluation 反映で 14 → 7 件に集約)

**self-evaluation 反映**: 元 14 guard は **同一 invariant の複数 view** で重複 risk (= aagInternal + aagPublicInterface + referencesAagInterface + protocolsLocation は **boundary placement 同一 domain**)。**invariant-based で 7 件に集約**、各 guard が複数 sub-invariant を扱う domain 単位 (= boundary / file / path / element / projects)。

| guard | landing phase | 検出対象 (= sub-invariant 集約) | 違反 = |
|---|---|---|---|
| `aagBoundaryGuard` (= 統合 4 sub-invariant) | R1 (skeleton) → R2 (full) | (a) `aag/_internal/` 外への AAG framework 内部 doc 配置 / (b) `aag/` 配下に主アプリ改修 user向け doc 配置 / (c) `references/05-aag-interface/` 外への AAG public interface doc 配置 / (d) `references/05-aag-interface/protocols/` 外への operational-protocol-system M1-M5 deliverable 配置 | Hard fail |
| `generatedFileEditGuard` | R3d | `*.generated.md` の **手編集** (= last-edit author が generator commit でない場合) | Hard fail |
| `oldPathReferenceGuard` | R3d | 旧 path 参照残置 (= `01-principles/` / `02-status/` / `03-guides/` / `04-design-system/` / `05-contents/` 文字列の inbound link、archive-to-archive 例外 whitelist) | Hard fail |
| `elementStructureGuard` (= 統合 3 sub-invariant) | R4 | (a) element ID prefix 違反 (= `WID-*` を `charts/` に配置等) / (b) per-element directory 4 doc 整合 / (c) `references/04-tracking/dashboards/` 配下の手書き file 配置 | Hard fail |
| `projectsStructureGuard` (= 統合 3 sub-invariant) | R6 | (a) `projects/` root 直下に project (= `active/` + `completed/` + `_template/` 以外) 配置 / (b) `CURRENT_PROJECT.md` に inline state articulate / (c) `projects` 配下 `active/` directory 配下に正本定義 (= `definition.md` 等) 配置 | Hard fail |
| `selfHostingGuard` 拡張 (= 既存 guard 拡張、新規ではない) | R6 | entry navigation rigor 検証 (= 上記 5 guard の状態を AAG self-hosting closure として articulate) | Hard fail |
| `boundaryIntegrityGuard` (= 統合 entry) | R7 | 上記 6 guard の統合 entry point + pre-commit hook 統合 | Hard fail |

合計 **7 guard** (= 5 新設 + 1 拡張 + 1 統合 entry、14 → 7 で 50% 削減)。

**集約 rationale** (= drawer Pattern 4 + 5 application instance):

- aagBoundaryGuard 4 sub-invariant: 全て **boundary placement** 同一 domain
- elementStructureGuard 3 sub-invariant: 全て **element 構造** domain
- projectsStructureGuard 3 sub-invariant: 全て **projects 構造** domain
- generatedFileEditGuard / oldPathReferenceGuard は別 domain で独立維持
- selfHostingGuard 拡張は **既存 guard の拡張**、新規 guard ではない
- boundaryIntegrityGuard (R7) は entry point 統合で pre-commit hook 統合用

### §6.3 pre-commit hook 統合

R7 で `tools/git-hooks/pre-commit` に以下追加:

- `boundaryIntegrityGuard` 関連 test を hook で run (= guard 違反 → commit block、早期検出)
- 既存 hook (= docs:check / lint / format:check / test:guards) は維持
- hook bypass (= `--no-verify`) は不可侵原則 (AAG framework 既存) で禁止維持

### §6.4 _template/ 新構造 migrate

R6 で `projects/_template/` を新構造前提に update:

- `aag/execution-overlay.ts` 維持 (= 既存)
- `decision-audit.md` template 維持
- doc-registry / manifest registration template 新構造前提
- 新規 project bootstrap 時に **旧構造 path 生成不能** (= 新 template が新 path 強制)

= 新規 program が立ち上がる度に新構造が **再生** される mechanism (= 定着の自然 propagation)。

### §6.5 AAG self-hosting closure articulation で boundary 自体を articulate

R6 で `aag/_internal/meta.md` §2.1 articulate 拡張:

- AAG-REQ-SELF-HOSTING の達成基準に **「entry navigation rigor」** を articulate (= boundary 違反 0 件が必要条件)
- selfHostingGuard 拡張で 4 boundary を機械検証 (= AAG framework 自身が自分の boundary を articulate + verify)
- = AAG framework が **自分自身の rigor を entry level でも維持する** self-application closure 完成

### §6.6 ratchet-down 維持の articulate

各 R-phase 完了後の **逆戻り** trigger (= 例):

- 新規 doc を旧 path で作成 → R3 `oldPathReferenceGuard` で fail
- AAG 内部 doc を references/ に配置 → R1 `aagBoundaryGuard` で fail
- 主アプリ向け doc を aag/ に配置 → R2 `aagBoundaryGuard` で fail
- `*.generated.md` を手編集 → R3 `generatedFileEditGuard` で fail
- element を taxonomy 違反 ID で配置 → R4 `elementStructureGuard` で fail
- CURRENT_PROJECT.md に進捗 inline → R6 `projectsStructureGuard` で fail

= 7 guard が **全方位 ratchet-down**、AI / userが **無意識に** 旧構造に戻る path を全 type 検出。

---

## §7 旧経路・旧制度 撤退プラン (= legacy retirement、user articulation 反映)

### §7.1 撤退対象 articulate

「**本 program は内容 100% 維持** (= 不可侵原則 4) で **物理 location 移動のみ**」だが、**旧 location / 旧 convention / 旧 mention** の **完全撤退** は scope 内。AAG-COA の `requiresLegacyRetirement=false` は **「内容削除」の意味**であり、「**旧 path / 旧制度の撤退** は migration の通常範囲」として scope に含まれる。

撤退対象 4 種類:

| 種類 | articulate |
|---|---|
| **旧 path (= 物理 location)** | R-phase で `git mv` で完全移動、旧 path には **0 件残置** (= stub も .gitkeep も置かない) |
| **旧 convention** | `recent-changes.md` (suffix なし) → `recent-changes.generated.md` / `02-status/generated/*.md` (suffix なし) → `04-tracking/generated/*.generated.md` / projects/ root flat (= active subdirectory なし) → `projects` 配下 `active/` directory / CURRENT_PROJECT.md inline state → pointer-only / file-level vs section-level generated 混在 → file-level `*.generated.md` で第一優先、section marker は補助 |
| **旧制度 / 旧 system** | AAG-related guide が主アプリ実装ガイドと同 directory (= `references/03-implementation/` 内混在) → reader-別 separation (= `references/05-aag-interface/` 純化) / aag/ vs references/ boundary 不在 → structural separation / 03-guides 内 framework + main app 混在 → 03-implementation (= main app 純化) + 05-aag-interface (= AAG public interface) で分離 |
| **旧 mention (= meta-documentation)** | PR template (`.github/PULL_REQUEST_TEMPLATE.md`) 内 旧 path 参照 / CLAUDE.md 内 旧 section / doc-registry.json + manifest.json 内 path entry / guard / collector path constants / generator 出力先 path / 既存 doc 内 inbound link |

### §7.2 撤退 timing per R-phase

各 R-phase で **対応する撤退対象** を完全撤退する (= 部分撤退は禁止、phase 完了 = その phase の撤退対象 0 件):

| Phase | 撤退対象 | 撤退 verify |
|---|---|---|
| **R1** | `aag/_internal/` 9 doc 物理 file + 旧 path への inbound link 101 件 + aag-related guard / collector の旧 path constants | `aagBoundaryGuard` で aag/_internal/ 外への AAG framework 内部 doc 配置 0 件、grep で `aag/_internal/` 文字列 0 件 |
| **R2** | `references/03-implementation/{decision-articulation-patterns,projectization-policy,project-checklist-governance,new-project-bootstrap-guide,deferred-decision-pattern}.md` 物理 file + inbound link + guard / collector path | `aagBoundaryGuard` + `aagBoundaryGuard` で aag/ 配下に主アプリ改修 user向け doc 0 件 + references/05-aag-interface/ 外への AAG public interface doc 0 件 |
| **R3** | 旧 5 directory (`01-principles/`, `02-status/`, `03-guides/` 残部, `04-design-system/`, `05-contents/`) 物理 directory + 1,000+ inbound link + 138 guard / collector path constants + doc-registry / manifest entry path + generator 出力先 path + **PR template (`.github/PULL_REQUEST_TEMPLATE.md`) 内 旧 path 参照** + **CLAUDE.md 内 旧 section path** + 旧 naming (`recent-changes.md` suffix なし、`02-status/generated/*.md` suffix なし) | `oldPathReferenceGuard` で旧 path 文字列 0 件、`generatedFileEditGuard` で `*.generated.md` 手編集 0 件 |
| **R4** | (= R3 で撤退済の延長、新 element 構造移行) | `elementStructureGuard` で旧 ID prefix 違反 0 件 |
| **R5** | (= 撤退対象なし、新 articulation を `references/05-aag-interface/protocols/` に landing のみ) | `aagBoundaryGuard` で旧 location 0 件 |
| **R6** | `projects/` root 直下の各 active project (6 件) → `projects` 配下 `active/` directoryに migrate + 旧 `_template/` (= 旧構造前提) → 新構造 migrate + `CURRENT_PROJECT.md` inline state 残置 → pointer-only | `projectsStructureGuard` + `projectsStructureGuard` で旧構造 0 件 |
| **R7** | (= 各 R-phase で撤退済の総合 verify) | `boundaryIntegrityGuard` で全 boundary 違反 0 件 + pre-commit hook で逆戻り早期検出 |

### §7.3 transitional period の articulate

**migration 中** (= R-phase 進行中) の旧 / 新 path 共存 articulate:

| 状態 | 旧 path 扱い | 新 path 扱い |
|---|---|---|
| R-phase 着手前 | active (= 全 reference 旧 path) | 未存在 |
| R-phase 進行中 (= 同一 commit 内) | **共存禁止** (= 1 commit で完全 swap、partial migration は禁止) | 全 reference 新 path に update |
| R-phase 完了後 | **0 件** (= guard で hard fail、= retired) | active |

= **transitional period は 1 commit の中** に閉じる。複数 commit に跨る partial migration は禁止 (= drawer Pattern 1 不可侵原則 5「単一 commit で 2 phase まとめない」と同 lens の partial migration 禁止)。

### §7.4 archive policy (= 撤退 doc の扱い)

| ケース | 扱い |
|---|---|
| 旧 path から新 path に doc 移動 | `git mv` で物理移動、内容保持、旧 path 0 件残置 |
| 旧 path doc が **削除対象** (= 例外、本 program では発生しない想定) | `requiresLegacyRetirement=false` 整合、削除なし |
| `references/99-archive/` 内の immutable archive doc | **touch しない** (= archive policy 整合)、archive 内 旧 path mention は **archive-to-archive 例外**として `oldPathReferenceGuard` で許容 |
| `projects/completed/` 内 archived project doc | **touch しない** (= immutable archive policy)、archive 内 旧 path mention は **archive-to-archive 例外** |

### §7.5 撤退 verify mechanism

各 R-phase 完了時の撤退 verify は **3 軸**:

1. **物理 verify**: 旧 path に file 0 件 (= `find aag/_internal/ -type f` で 0 件等)
2. **string verify**: 旧 path 文字列 reference 0 件 (= `grep -r "aag/_internal/" .` で 0 件、archive-to-archive 例外除く)
3. **functional verify**: 旧 path 経路で reach 試行 → fail (= 旧 path 想定の test が必ず fail)

3 軸全 PASS で撤退完了、いずれか fail なら R-phase 未完了。

### §7.6 撤退漏れ防止 guard (= §6 と統合、ratchet-down baseline=0)

- `oldPathReferenceGuard` (R3 landing) — 5 directory rename 時の旧 path 文字列残置検出
- `generatedFileEditGuard` (R3 landing) — `*.generated.md` 手編集検出 (= 旧 convention で手編集試行)
- 全 location guard 群 (R1-R6 landing) — 旧 location への新規 file 配置検出 (= 逆戻り防止)
- `boundaryIntegrityGuard` (R7 統合) — 全撤退対象の集約 verify

### §7.7 PR template / .github/* 撤退 articulate

R3 で `references/03-implementation/` rename 時に同時実施:

- `.github/PULL_REQUEST_TEMPLATE.md` 内 path:
  - `references/03-implementation/responsibility-taxonomy-operations.md` (line 32)
  - `references/03-implementation/test-taxonomy-operations.md` (line 32)
  - `references/04-tracking/taxonomy-review-journal.md` (line 36)
  - `references/03-implementation/extension-playbook.md` (line 41, 51)
  - `references/03-implementation/metric-id-registry.md` (line 46)
  - `references/01-foundation/engine-responsibility.md` (line 53)
  - `references/01-foundation/**` (line 78)
  - `references/03-implementation/aag-change-impact-template.md` (line 93)
  - `references/04-tracking/generated/` (line 108)
  - `references/01-foundation/aag-*` / `AAG_*.md` (line 110)
- → 全件 R3 で新 path に update、PR template 内 旧 path 0 件まで verify

---

## §8 推定 effort + ROI

- effort: AAG Pilot の 5-10 倍 (= 数 ヶ月-1 年級、phase 別 verify 込み + 7 guard landing 込み、R3 sub-phase 化で 4 sub-commit)
- value: AAG self-hosting closure 真の達成 + 主アプリ AI navigation 100% predictable + per-element drill-down + dashboard auto-detect + drawer 中核性 structural articulation + **7 guard で逆戻り防止 + 定着 mechanism**
- 比較対象: AAG Pilot (= 1 program、174 rule)、本 program は cross-tree restructure (= AAG framework + references + projects + 7 新 guard)
- AAG-COA: **Level 3 + architecture-refactor + breakingChange=true + requiresLegacyRetirement=false + requiresGuard=true + requiresHumanApproval=true** (詳細 = `projectization.md`)
