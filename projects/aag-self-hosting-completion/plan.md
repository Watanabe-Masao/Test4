# plan — aag-self-hosting-completion

> **上位**: AAG framework の self-hosting closure 真の達成 (= AAG-REQ-SELF-HOSTING を code-level + entry navigation rigor 完全達成)。
> **scope**: structural reorganization (= references/ + aag/ + projects/ の boundary を structural separation で articulate)、内容保持、機能 loss 0。
> **trigger source**: AAG Pilot 完遂 + operational-protocol-system bootstrap 後の user articulation で、AAG framework の entry navigation level での self-hosting failure が articulate された (= 本 session)。

---

## §1 不可侵原則 7 件

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) を **touch しない** | revert |
| 2 | AAG framework articulate **内容** を改変しない (= 物理 location のみ移動、articulate text 不変、ただし R6 で meta.md §2.1 self-hosting closure 部分のみ honest update 例外) | revert |
| 3 | Standard / drawer / 5 文書 template の articulate 内容を改変しない (= 物理 location 移動のみ) | revert |
| 4 | 既存 functionality を **100% 維持** (= 内容保持、phase 別 verify で 0 functionality loss) | revert |
| 5 | 各 R-phase は **judgement commit + rollback tag** で完結 (= drawer Pattern 1 application、1 commit に 2 phase まとめない) | revert |
| 6 | 各 R-phase に observation 観測点 ≥ 5 件 (= drawer Pattern 6 application、反証可能 ≥ 1) | scope 外 |
| 7 | 起動・archive 判断は **user 領域**、AI 単独で起動・archive しない | scope 外 |

---

## §2 完了 criterion

**完了 = 以下が同時に satisfy**:

1. R1-R7 全 deliverable landed
2. 1,000+ inbound link 全 update + broken link 0 件
3. 138 guard / collector path constants update + 944 test 全 PASS 維持
4. AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update (R6)
5. AAG framework / Standard / drawer / 5 文書 template / 主アプリ code に **内容変更 0 件** (= 物理 location 移動のみ)
6. operational-protocol-system R5 で再開、M1 deliverable が aag/interface/protocols/ に landing

---

## §3 Phase 構造

### Phase 0: Bootstrap (本 commit までで完了)

bootstrap 履歴は `decision-audit.md` DA-α-000 に集約。

### Phase R1: AAG sub-tree relocation

**deliverable**:

- `aag/_internal/` 新設 + `references/01-principles/aag/` 9 doc を移動 (= meta.md / strategy.md / architecture.md / evolution.md / source-of-truth.md / operational-classification.md / layer-map.md / display-rule-registry.md / README.md)
- `aag/interface/` 新設 (= R2 の skeleton、空 README + .gitkeep)
- 101 inbound link を新 path (= aag/_internal/) に全 update
- guard / collector の path constants 該当箇所 update (= aag-related guard 群)
- doc-registry.json + manifest.json reorganize entry

**scope 外**:

- AAG articulate 内容改変 (= 不可侵原則 2)
- references/ directory rename (= R3 で実施)
- 主アプリ code touch (= 不可侵原則 1)

**観測点 (= drawer Pattern 6)**:

- 9 doc が aag/_internal/ に物理 移動
- 101 inbound link が新 path に全 update (= broken link 0 件)
- guard / collector の path 反映後 944 test 全 PASS
- doc-registry.json + manifest.json で新 path 整合
- 反証: synthetic broken link 試験で test fail (= ratchet-down)

### Phase R2: drawer + protocols + operations relocate

**deliverable**:

- `aag/interface/drawer/` に `references/03-guides/decision-articulation-patterns.md` 移動
- `aag/interface/operations/` に AAG 運用 guide 4 doc 移動 (= projectization-policy.md / project-checklist-governance.md / new-project-bootstrap-guide.md / deferred-decision-pattern.md)
- `aag/interface/protocols/` skeleton (= R5 で fill する空 directory + README)
- 該当 inbound 全 update (= 5 doc 計、各 doc の inbound 数次第で数十-数百件)
- doc-registry.json + manifest.json 更新

**scope 外**:

- protocols 内 doc の articulate (= R5 で operational-protocol-system M1-M5 deliverable を landing)
- references/03-guides/ の他 doc (= 主アプリ実装ガイドは R3 で directory rename のみ、AAG-related のみ aag/interface/ に migrate)

**観測点**:

- 5 doc が aag/interface/ 配下に物理移動
- inbound 全 update + broken 0
- doc-registry / manifest 整合
- 944 test 維持
- 反証: synthetic 旧 path reference 試験で test fail

### Phase R3: references/ directory rename

**deliverable**:

- `references/01-principles/` → `references/01-foundation/` (= AAG sub-tree は R1 で relocate 済、残りを rename)
- `references/02-status/` → `references/04-tracking/`
- `references/04-design-system/` → `references/02-design-system/`
- `references/03-guides/` → `references/03-implementation/` (= AAG-related は R2 で aag/interface/ に migrate 済、残りを rename)
- `references/05-contents/` → `references/04-tracking/elements/` (= R4 の subset、merge)
- 1,000+ inbound link 全 update
- guard / collector path constants update (= 138 file)
- doc-registry / manifest update

**scope 外**:

- per-element directory 化 (= R4 で実施)
- dashboard layer 新設 (= R4 で実施)
- 内容変更 (= 不可侵原則 2/3)

**観測点**:

- 5 directory rename 完了
- 1,000+ inbound link broken 0
- 138 guard / collector path update + 944 test PASS
- doc-registry / manifest 整合
- 反証: 旧 path reference 試験で test fail

### Phase R4: per-element directory + dashboard layer

**deliverable** (= 段階導入、initial pilot subset で start):

- `04-tracking/dashboards/` 新設 + 機械生成 dashboard skeleton 4 件 (= quality-dashboard / migration-progress / element-coverage / boundary-health)
- `04-tracking/elements/<category>/<id>/` per-element directory 化 (= pilot subset = charts/ で start、widgets/ + read-models/ + calculations/ + ui-components/ は段階適用)
- per-element 4 doc (= README.md 手書き + implementation-ledger.md 手書き + quality-status.md 機械生成 + open-issues.md 機械生成)
- 既存 single-file spec (= WID-001.md 等) を per-element directory README.md に migrate

**scope 外**:

- 全 89 element 一括 full 適用 (= drawer Pattern 5 意図的 skip + rationale: pilot subset で value verify 後段階適用)
- dashboard layer の 内容articulate (= initial skeleton のみ、enrichment は段階別)

**観測点**:

- pilot subset (= charts/ 5 element) の per-element directory 完成
- dashboard layer 4 doc skeleton landed
- 機械生成 mechanism 動作 (= quality-status / open-issues 自動 fill)
- 944 test 維持
- 反証: pilot subset で AI が context 構築する simulation で reach efficiency verify

### Phase R5: operational-protocol-system M1-M5 deliverable landing

**deliverable**:

- operational-protocol-system project resume (= HANDOFF.md §3.6 pause articulation 解除)
- M1 deliverable (= task-protocol-system.md / task-class-catalog.md / session-protocol.md / complexity-policy.md) を `aag/interface/protocols/` に landing
- M2-M5 deliverable も同 location に articulate (= operational-protocol-system project 内で進行)
- operational-protocol-system project archive 判断は user 承認後

**scope 外**:

- operational-protocol-system project 自身の plan / checklist 改変 (= 既存 articulate を維持、location のみ aag/interface/protocols/)
- 内容追加 (= operational-protocol-system project 自身の articulate を維持)

**観測点**:

- operational-protocol-system pause 解除
- M1-M5 deliverable が aag/interface/protocols/ に landing
- structural foundation 上に articulation 整合
- 944 test 維持

### Phase R6: AAG self-hosting closure articulate update

**deliverable**:

- `aag/_internal/meta.md` §2.1 で AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate update
- self-hosting closure 達成根拠を articulate (= R1-R5 の structural separation + reader-domain boundary structural articulation)
- selfHostingGuard.test.ts に entry navigation rigor 検証項目追加 (= 構造的整合 機械検証)

**scope 外**:

- AAG framework 他 articulate の改変 (= 不可侵原則 2)
- AAG-REQ-* の他項目改変

**観測点**:

- meta.md §2.1 articulate update 完了
- selfHostingGuard.test.ts 拡張 + PASS
- self-hosting closure 達成根拠 articulated
- AAG framework 内部正直化 articulate (= drawer Pattern 4 application)

### Phase R7: verify + archive

**deliverable**:

- 全 verify command PASS (= 944 test + docs:check + lint + build)
- AAG self-hosting at entry level の self-test PASS (= R6 で追加した検証 + 既存 selfHostingGuard)
- broken link 0 件 maximum verify (= 全 inbound link sweep)
- 138 guard / collector path 整合 verify
- 機能 loss 0 件 verify (= 主アプリ動作確認、E2E + storybook build)
- recent-changes.md にサマリ landing
- archive 移行 (= user 承認後)

**観測点**:

- 全 verify PASS
- self-test PASS
- broken link / 機能 loss 0 件
- archive 完遂

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

---

## §5 関連実装

### 触らない (既存資産は維持)

| パス | 役割 |
|---|---|
| `app/src/`, `app-domain/`, `wasm/` | 主アプリ code (= 不可侵原則 1) |
| AAG framework articulate 内容 | 不可侵原則 2 (R6 例外除く) |
| Standard / drawer / 5 文書 template | 不可侵原則 3 |
| 既存 functionality | 不可侵原則 4 |

### 物理 location 移動 (R1-R3)

| 現 path | 新 path | Phase |
|---|---|---|
| `references/01-principles/aag/*` (9 doc) | `aag/_internal/*` | R1 |
| `references/03-guides/decision-articulation-patterns.md` | `aag/interface/drawer/decision-articulation-patterns.md` | R2 |
| `references/03-guides/projectization-policy.md` | `aag/interface/operations/projectization-policy.md` | R2 |
| `references/03-guides/project-checklist-governance.md` | `aag/interface/operations/project-checklist-governance.md` | R2 |
| `references/03-guides/new-project-bootstrap-guide.md` | `aag/interface/operations/new-project-bootstrap-guide.md` | R2 |
| `references/03-guides/deferred-decision-pattern.md` | `aag/interface/operations/deferred-decision-pattern.md` | R2 |
| `references/01-principles/` (residual) | `references/01-foundation/` | R3 |
| `references/02-status/` | `references/04-tracking/` | R3 |
| `references/04-design-system/` | `references/02-design-system/` | R3 |
| `references/03-guides/` (residual) | `references/03-implementation/` | R3 |
| `references/05-contents/*` | `references/04-tracking/elements/*` | R3 |

### 新設 (R4-R5)

| パス | Phase |
|---|---|
| `references/04-tracking/dashboards/{quality-dashboard,migration-progress,element-coverage,boundary-health}.md` | R4 |
| `references/04-tracking/elements/<category>/<id>/{README,implementation-ledger,quality-status,open-issues}.md` | R4 (pilot subset) |
| `aag/interface/protocols/{task-protocol-system,task-class-catalog,session-protocol,complexity-policy}.md` | R5 (= operational-protocol-system M1) |

### update (R6)

| パス | 内容 |
|---|---|
| `aag/_internal/meta.md` §2.1 | AAG-REQ-SELF-HOSTING を「完全達成」に articulate (R6 例外、不可侵原則 2 articulate) |
| `app/src/test/guards/selfHostingGuard.test.ts` | entry navigation rigor 検証項目追加 |

---

## §6 推定 effort + ROI

- effort: AAG Pilot の 5-10 倍 (= 数 ヶ月-1 年級、phase 別 verify 込み)
- value: AAG self-hosting closure 真の達成 + 主アプリ AI navigation 100% predictable + per-element drill-down + dashboard auto-detect + drawer 中核性 structural articulation
- 比較対象: AAG Pilot (= 1 program、174 rule)、本 program は cross-tree restructure (= AAG framework + references + projects)
- AAG-COA: **Level 3 + architecture-refactor + breakingChange=true + requiresLegacyRetirement=false + requiresGuard=true + requiresHumanApproval=true** (詳細 = `projectization.md`)
