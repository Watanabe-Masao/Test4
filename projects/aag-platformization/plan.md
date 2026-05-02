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
| **A2a Derivation (policy + 実バグ修復)** | **`aag/source-of-truth.md` に "Merge Policy" section 追加 (= merge policy canonical 単一点)**: 解決順序 / reviewPolicy 契約 / `resolvedBy` 必須 articulate。**実バグ 3 件修復**: 三重定義 `RuleExecutionOverlayEntry` を `aag-core-types.ts` 集約 / `merged.ts` bootstrap 修復 + `resolvedBy` field 追加 / 各 overlay comment + bootstrap-guide Step 4 を canonical section に back-link 整合 | DA-α-002a | 空 `EXECUTION_OVERLAY = {}` で `merged.ts` throw しない / `pure-calculation-reorg` 既存 merge 結果 byte-identical (golden test) / merged.ts / defaults.ts / 各 overlay comment が source-of-truth.md "Merge Policy" section に back-link |
| **A2b Derivation (artifact + sync guard)** | `tools/architecture-health/src/aag/merge-artifact-generator.ts` 新設 + `docs/generated/aag/merged-architecture-rules.<format>` 生成 + `aagMergedArtifactSyncGuard` | DA-α-002b (artifact format = generated 系) | artifact runtime と byte-identical / 試験 drift で sync guard hard fail |
| **A3 Contract** | **contract format 先行確定** (`AagResponse` / `detector-result` の schema 形式、generated 系とは独立判断) → `docs/contracts/aag/aag-response.<format>` + `docs/contracts/aag/detector-result.<format>` 新設 + sync guard。helper は schema-backed re-export | DA-α-003 (contract format = schema 系) | schema validation 通過 / 既存 text renderer byte-identical / 既存 `aagResponseFeedbackUnificationGuard` 維持 |
| **A4 Binding** | `ruleBindingBoundaryGuard.test.ts` 新設 (許可 5 field / 禁止意味系) | DA-α-004 | 違反コード試験で hard fail / 既存 RuleBinding pass |
| **A5 Generated** | drawer 4 種: `rules-by-path` / `rule-index` / `rule-detail/<id>` / `rule-by-topic`。**A5 内で独立に format 判断** (A3 contract format と必ずしも一致しない、index / lookup 用途で最適 format を選定) + 各 sync guard。**post-Pilot seam**: 各 drawer artifact entry に最小 routing metadata (`path` / `topic` / `sourceRefs` / `consumerKind` / `taskHint`) を持たせる (= Phase 3 charter で articulate される AI Role Layer の Role-scoped Context Bundle 差し込み口、本 Pilot では未利用だが構造上 forward compatibility) | DA-α-005 (drawer format = generated 系、A2b と相互整合判断) | AI が path 編集 task で関連 rule subset に 1 read で reach / 不要 rule surface しない / drift で sync guard hard fail |
| **A6 Facade** | `architectureRules.ts` 維持 (no-op verify) | - | 既存 consumer import 不変 |
| **A7 Policy** | 不可侵原則 (本 §1) + DA institution + 5 軸 articulate 要件 (= 既存 articulate verify) | - | 全 deliverable に 5 軸 articulation 存在 |
| **A8 Gate** | 全 sync guard + 既存 9 integrity guard active + Phase 完了 gate | - | `npm run test:guards && lint && build && docs:check` PASS |

**format 判断の分離** (改訂): 軸ごとに用途が異なるため format 判断を独立化:

- **A2b artifact format** (DA-α-002b): merged result の generated artifact、TS から re-export 可能性が要件 → JSON 系 / TS-friendly 候補
- **A3 contract format** (DA-α-003): AagResponse / detector の schema、言語非依存 contract が要件 → JSON Schema / CUE / Protobuf 候補
- **A5 drawer format** (DA-α-005): AI 直読 + index / lookup 用途、軽量性が要件 → JSON / YAML / TOML 候補 (A2b と相互整合、ただし A3 とは独立で良い)

A2/A3/A5 で format 統一は強制しない。subsystem ごとに最適化。

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

### Phase 3: Archive + 横展開可否判定条件 articulation

- System Inventory (Standard §3) に AAG entry を "Pilot complete" status で landing
- **横展開可否判定条件を articulate** (= 改訂 4、横展開そのものは scope 外維持、判定条件のみ articulate):
    - **展開可条件** (全 met なら docs / app / health 等への横展開を別 program で着手可):
        1. Pilot 完了 criterion (`plan.md` §2) 5 件 全 met
        2. AAG が System Inventory (Standard §3) に "Pilot complete" status landed
        3. Standard §9 (does / does NOT) capability boundary 違反 0 件
        4. 横展開 candidate subsystem が Standard 8 軸 template を **AI 自身が application 可能** (= 8 軸の各々で candidate subsystem を articulate しきれる) と verify
        5. Pilot 過程の learning (DA-α-001〜006 振り返り) が後続 program に引き継ぎ可能な形で landing
    - **展開禁止条件** (1 つでも該当なら横展開禁止):
        - 既存 9 integrity guard / 12 AAG-REQ baseline が緩和されている
        - Pilot で identify された負債が未解消
        - Standard 8 軸の中で AAG 自身が articulate しきれていない軸がある (= Pilot 不完全)
        - 候補 subsystem の owner / 承認構造が unclear
- 後続 program (もし必要なら) charter を 1 doc で articulate (新規 or 既存拡張、判断 = DA-α-007)
- **AI Role Layer = post-Pilot deliverable** を charter に明記 (本 Pilot scope 外、ただし A5 drawer routing metadata + decision-audit `taskClass` field の seam を Pilot 内で残してある)。Role Layer = AI Role Catalog (Authority Auditor / Derivation Assembler / Contract Steward / Binding Auditor / Discovery Curator / Policy Enforcer 等) + Task → Role Routing + Role-scoped Context Bundle の 3 components。Pilot で AI が文脈に到達できることが verify された後、role を articulate する別 program で実施
- `references/02-status/recent-changes.md` にサマリ追加

### Gate: 最終 archive レビュー (人間承認、唯一の人間 mandatory 点)

- 人間が `decision-audit.md` 全 entry (DA-α-000〜007) を read
- F1-F5 + Pilot 完了 criterion 5 件を確認
- archive プロセスへの移行を承認

---

## §4 Decision Audit + 5 軸 lens

- **DA institution**: `decision-audit.md` (entry テンプレ + 必須要件 + commit lineage + 5 軸 articulation 欄 + 振り返り)
- **planned entries** (Phase / 軸との mapping):
    - DA-α-001: A1 Authority articulation 方針
    - **DA-α-002a**: A2a merge policy canonical 単一点 (source-of-truth.md "Merge Policy" section) + 実バグ修復方針
    - **DA-α-002b**: A2b merged artifact format + sync guard 設計
    - DA-α-003: A3 contract format (schema) + AagResponse / detector schema 化方針
    - DA-α-004: A4 RuleBinding 境界 guard 設計
    - DA-α-005: A5 drawer format (A2b と相互整合、A3 とは独立) + drawer 4 種 granularity
    - DA-α-006: Phase 2 simulation CT1-CT5 結果総括
    - DA-α-007: Phase 3 archive + 横展開可否判定条件 articulation 判断
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
