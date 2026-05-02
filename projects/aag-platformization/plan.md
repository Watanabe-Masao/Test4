# plan — aag-platformization

> **上位**: `references/01-principles/platformization-standard.md` の **Pilot Application**。
> **Supreme principle (唯一の禁則)**: 「あるべき」で終わらさず observable に機能させる (`references/01-principles/aag/strategy.md` §2.1「抽象化過剰」AI 弱点対策)。
> **本 program scope**: AAG を Standard 8 軸 articulate complete + 実バグ修復まで。横展開 (docs / app / health) は **post-Pilot、本 program scope 外**。

---

## §1 不可侵原則

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 既存 AAG の振る舞いと思想を変えない (実バグ修復は例外、DA entry に articulate) | revert |
| 2 | 既存 9 integrity guard / 12 AAG-REQ を緩和しない (ratchet-down のみ) | revert |
| 3 | 派生 artifact を手編集しない (canonical → derived 一方向) | revert |
| 4 | 全 deliverable は **5 軸** (component design lens、`aag/source-of-truth.md` 等で既存 articulate) を articulate | scope 外 |
| 5 | observation なき articulation は scope 外 (supreme principle) | scope 外 |
| 6 | 判断は AI-driven、人間承認は最終 archive 1 点のみ | scope 外 |
| 7 | 横展開 (docs / app / health) は本 program scope 外、Phase 3 で charter のみ articulate | scope 外 |

---

## §2 Pilot 完了 criterion

**Pilot 完了 = 以下が同時に satisfy**:

1. AAG が Standard 8 軸 (A1〜A8) すべてで articulate complete
2. 実バグ 3 件修復: merge policy 揺れ / bootstrap path 破綻 / `RuleExecutionOverlayEntry` 三重定義
3. AI simulation で **5 機能 (F1〜F5)** verify
4. `decision-audit.md` に Pilot 判断履歴 (DA-α-001〜005) landing
5. System Inventory (Standard §3) に AAG entry が "Pilot complete" status で landing

---

## §3 Phase 構造

### Phase 0: Bootstrap (本 commit までで完了)

bootstrap + reframe 履歴は `decision-audit.md` DA-α-000 に集約済。

### Phase 1: Pilot Fill (8 軸 × 実バグ修復)

各軸別 deliverable:

| 軸 | Pilot deliverable | 関連 DA | 観測 |
|---|---|---|---|
| **A1 Authority** | 4 layer 正本確認 (Core 型 / App Domain / Project Overlay / Derived / Facade) + Standard §A1 への back-link 整理 | DA-α-001 | 4 layer 正本 articulate に曖昧 0 件 |
| **A2 Derivation** | merge policy 一本化 + `merged-architecture-rules.<format>` 生成 + sync guard。**実バグ 3 件修復**: 三重定義 `RuleExecutionOverlayEntry` を `aag-core-types.ts` 集約 / merged.ts に `resolvedBy` 追加 / 各 overlay comment 整合 / bootstrap-guide Step 4 整合 | DA-α-002 | 空 `EXECUTION_OVERLAY = {}` で `merged.ts` throw しない / `pure-calculation-reorg` 既存 merge 結果 byte-identical / artifact runtime と byte-identical / 試験 drift で sync guard hard fail |
| **A3 Contract** | `AagResponse` + `detector-result` schema 化 (`docs/contracts/aag/`) + sync guard。helper は schema-backed re-export | DA-α-003 | schema validation 通過 / 既存 text renderer byte-identical / 既存 `aagResponseFeedbackUnificationGuard` 維持 |
| **A4 Binding** | `ruleBindingBoundaryGuard.test.ts` 新設 (許可 5 field / 禁止意味系) | DA-α-004 | 違反コード試験で hard fail / 既存 RuleBinding pass |
| **A5 Generated** | drawer 4 種: `rules-by-path` (path → rule id) / `rule-index` (軽量 index) / `rule-detail/<id>` (on-demand) / `rule-by-topic` (manifest discovery 拡張) + 各 sync guard | DA-α-005 | AI が path 編集 task で関連 rule subset に 1 read で reach / 不要 rule surface しない / drift で sync guard hard fail |
| **A6 Facade** | `architectureRules.ts` 維持 (no-op verify) | - | 既存 consumer import 不変 |
| **A7 Policy** | 不可侵原則 (本 §1) + DA institution + 5 軸 articulate 要件 (= 既存 articulate verify) | - | 全 deliverable に 5 軸 articulation 存在 |
| **A8 Gate** | 全 sync guard + 既存 9 integrity guard active + Phase 完了 gate | - | `npm run test:guards && lint && build && docs:check` PASS |

**format 選定** (A2 / A3 / A5 共通): JSON / CUE / YAML / TOML 等から AI 判断 (DA-α-002 内に集約)。

### Phase 2: Verification (AI simulation)

**CT1-CT5** を本 session 内 / state-based / scenario-driven で実行 (calendar 観測なし、`AAG-REQ-NO-DATE-RITUAL` 整合)。

| # | scenario | 関連 functioning |
|---|---|---|
| **CT1** | path-triggered rule access (A5 effect) — AI が `merged.ts` 編集 task で関連 rule subset に 1 read で reach | F1 必要 context のみ surface |
| **CT2** | irrelevant context surface しない (negative) — 関係ない path 編集で関連 rule surface 0 | F1 |
| **CT3** | rule detail rapid lookup — guard 違反時に rule-detail へ N step 以下で reach | F2 素早く reach |
| **CT4** | drift detection — 試験 drift で sync guard hard fail | F3 機械検出 |
| **CT5** | session 間判断継承 — 新 session が `decision-audit.md` を read して再 derivation 不要 | F4 session 継承 |

5 機能 (F1-F5) status を DA-α-006 observation table に landing。

### Phase 3: Archive + 横展開 charter

- System Inventory (Standard §3) に AAG entry を "Pilot complete" status で landing
- 後続 program (もし必要なら) charter を 1 doc で articulate (新規 or 既存拡張、判断 = DA-α-007)
- `references/02-status/recent-changes.md` にサマリ追加

### Gate: 最終 archive レビュー (人間承認、唯一の人間 mandatory 点)

- 人間が `decision-audit.md` 全 entry (DA-α-000〜007) を read
- F1-F5 + Pilot 完了 criterion 5 件を確認
- archive プロセスへの移行を承認

---

## §4 Decision Audit + 5 軸 lens

- **DA institution**: `decision-audit.md` (entry テンプレ + 必須要件 + commit lineage + 5 軸 articulation 欄 + 振り返り)
- **5 軸 lens** (component design): 製本 / 依存方向 / 意味 / 責務 / 境界。既存 articulate 場所:
  - 製本 → `aag/source-of-truth.md`
  - 依存方向 → `aag/architecture.md` + `AAG-REQ-LAYER-SEPARATION`
  - 意味 → `aag/meta.md`
  - 責務 → `aag/strategy.md` §1.1.3 (C1)
  - 境界 → `aag/layer-map.md` + `aag/core/principles/core-boundary-policy.md`
- **8 軸 lens** (subsystem template): `references/01-principles/platformization-standard.md` §2

---

## §5 やってはいけないこと

| 禁止事項 | なぜ |
|---|---|
| 既存 AAG 振る舞い変更 (rule semantics / merge 結果 / response 出力 / detector message) | 不可侵原則 1 |
| 既存 9 integrity guard / 12 AAG-REQ baseline 緩和 | 不可侵原則 2 |
| 派生 artifact 手編集 | 不可侵原則 3 |
| 5 軸 articulate なき deliverable 追加 | 不可侵原則 4 |
| observation なき articulation を deliverable に | 不可侵原則 5 + supreme |
| 単一 commit で 2 軸 / 2 Phase まとめる | 軸 / Phase 境界での観測ができなくなる |
| `base-rules.ts` (10,805 行) TS authoring を JSON 化 | authoring 価値毀損 |
| 新 AAG doc を増やす (gap fill は既存 doc 拡張) | `strategy.md` §1.1「正本を増やさない」 |
| 横展開 (docs / app / health) を本 program scope に入れる | 不可侵原則 7 |
| Rust を本 program runtime に使う | 本体 WASM/Rust と境界混線、AI 強推奨時は人間確認 escalation |

---

## §6 関連実装

### 触らない (既存資産は維持)

| パス | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` (10,805 行) | TS authoring canonical |
| `app/src/test/architectureRules.ts` | consumer facade (= A6) |
| `tools/architecture-health/src/aag-response.ts` (本体 logic) | A3 で schema 駆動化、本体は維持 |
| `references/01-principles/aag/*` (9 doc) | 既存 articulate、verify のみ |
| 既存 9 integrity guard | F3 の現役機能 |
| `manifest.json` (既存 discovery / pathTriggers) | A5 で extend 可 |
| **CLAUDE.md** | "use AAG (capability/limit articulated)" meta-instruction、本 program で touch しない |

### 修正 (Phase 1 A2 = 実バグ修復)

| パス | 修正 |
|---|---|
| `app/src/test/aag-core-types.ts` | `RuleExecutionOverlayEntry` 集約 |
| `app/src/test/architectureRules/merged.ts` | bootstrap 修復 + `resolvedBy` 追加 |
| `app/src/test/architectureRules/defaults.ts` | reviewPolicy stub (採用案次第) |
| `_template / pure-calculation-reorg / aag-platformization` の `aag/execution-overlay.ts` | type import 集約版へ + comment 整合 |
| `references/03-guides/new-project-bootstrap-guide.md` | Step 4 採用案整合 |

### 新設 (Phase 1 A2-A5)

| パス | 軸 |
|---|---|
| `tools/architecture-health/src/aag/merge-artifact-generator.ts` | A2 |
| `docs/generated/aag/merged-architecture-rules.<format>` | A2 |
| `app/src/test/guards/aagMergedArtifactSyncGuard.test.ts` | A2 + A8 |
| `docs/contracts/aag/aag-response.<format>` | A3 |
| `docs/contracts/aag/detector-result.<format>` | A3 |
| `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` | A3 + A8 |
| `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` | A4 + A8 |
| `tools/architecture-health/src/aag/drawer-generator.ts` | A5 |
| `docs/generated/aag/{rules-by-path,rule-index,rule-detail/<id>,rule-by-topic}.<format>` | A5 |
| `app/src/test/guards/aagDrawerSyncGuard.test.ts` | A5 + A8 |

### 拡張 (既存 mechanism extend)

| パス | 拡張内容 |
|---|---|
| `tools/architecture-health/src/collectors/obligation-collector.ts` | A5 で rules-by-path を obligation trigger に追加 (判断次第) |
| `.claude/manifest.json` | A5 で discovery に rule-by-topic 追加 (判断次第) |
| `references/01-principles/aag/README.md` | Phase 3 で AAG が Standard Pilot Application であることを 1 行 articulate |
