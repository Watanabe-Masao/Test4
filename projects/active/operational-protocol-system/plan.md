# plan — operational-protocol-system

> **上位**: AAG Platformization Pilot (= `projects/completed/aag-platformization/`、archive 済 2026-05-02) の post-Pilot 運用制度。
> **scope**: AAG framework / Standard / drawer / 5 文書 / role / AAG-COA を **使う側** の運用 protocol を articulate。AAG Core / 主アプリ code は touch しない。
> **trigger source**: AAG Pilot 完了後の user articulation (本 session 2026-05-02)。

---

## §1 不可侵原則 6 件

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 既存 AAG framework / Standard / drawer / 5 文書 / role / AAG-COA を **破壊的変更しない** (= 上に薄く載せる) | revert |
| 2 | 新概念 (= 既存に articulate されていない vocabulary) を **追加しない** (`strategy.md` §1.1「正本を増やさない」整合) | scope 外 |
| 3 | 主アプリ code (= `app/src/`, `app-domain/`, `wasm/`) は **touch しない** | scope 外 |
| 4 | 全 deliverable に drawer **Pattern 2 (Scope Discipline)** を適用 (= 各 deliverable に「やらないこと」articulate) | scope 外 |
| 5 | 全 deliverable に drawer **Pattern 1 (Commit-bound Rollback)** を適用 (= judgement commit + tag pair) | scope 外 |
| 6 | 起動・archive 判断は **user 領域**、AI 単独で起動・archive しない | scope 外 |

---

## §2 Pilot 完了 criterion

**Pilot 完了 = 以下が同時に satisfy**:

1. M1-M5 全 deliverable landed
2. 6 Task Class + L1/L2/L3 + 5 protocol が articulate
3. AI simulation で **昇格 / 降格 trigger** + **session start/end** が verify (= drawer Pattern 6 application)
4. `decision-audit.md` に Pilot 判断履歴 landing
5. AAG framework / Standard / drawer / 5 文書 / role / AAG-COA / 主アプリ code に **破壊的変更 0 件**

---

## §3 Phase 構造

### Phase 0: Bootstrap (本 commit までで完了)

bootstrap 履歴は `decision-audit.md` DA-α-000 に集約。

### Phase M1: Task Protocol System 定義 (= core 制度の articulation)

**deliverable** (4 doc 新設、配置 = `references/05-aag-interface/protocols/`、aag-self-hosting-completion R0-R5 で path 確定):

- `task-protocol-system.md` — 上位 doc、M1-M5 全体の index、DA entry articulate
- `task-class-catalog.md` — Task Class 6 類型 (= Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff)、各々に scope + 標準手順 pointer
- `session-protocol.md` — Session 開始 / 実行中 / 終了 / 引き継ぎ の prescriptive 手順 (= 現 ad-hoc の置換)
- `complexity-policy.md` — L1 軽修正 / L2 通常変更 / L3 重変更 articulate + 各 level で使う文書 (= L1: checklist / L2: plan + checklist / L3: decision-audit まで)

**scope 外** (= drawer Pattern 2 application):

- 既存 5 文書 / role / AAG-COA / drawer の articulate 内容を改変しない
- AI Role Catalog (= Authority Auditor / Derivation Assembler 等) は **本 Phase scope 外** (= post-Pilot AI Role Layer charter で articulate 予定、drawer `_seam` で forward compatibility 確保済)
- guard 化 (= 機械検証) は M1 scope 外、M5 完了後に判断

**観測点** (= drawer Pattern 6 application):

- 6 Task Class が articulate されている (catalog 完成)
- Session Protocol が L1/L2/L3 別に articulate されている
- L1/L2/L3 と既存 5 文書の使い分けが table で articulate されている
- 4 doc 全 landing で `docs:check` PASS
- 反証可能観測 ≥ 1 (例: synthetic session scenario で各 level の routing が verify 可能)

### Phase M2: 既存 5 文書への routing 固定

**deliverable**:

- `session-protocol.md` を拡張: L1/L2/L3 別 read order を articulate
  - L1: HANDOFF → AI_CONTEXT scope → 対象 checklist
  - L2: AI_CONTEXT → HANDOFF → 対象 plan → checklist
  - L3: AI_CONTEXT → HANDOFF → plan → decision-audit → checklist
- Session 終了 protocol (L1/L2/L3 別)
  - L1: checklist 更新 + 必要なら handoff 現在地
  - L2: checklist + handoff (現在地 / 次アクション)
  - L3: checklist + DA + handoff (現在地 / 次アクション / ハマりポイント)
- 引き継ぎ protocol (引き継ぐ側 / 引き継がれる側)

**scope 外**:

- 各 file の articulate 内容そのものは改変しない (= 既存内容維持、使い方だけ articulate)
- file 形式変更 (= schema / template) はしない

**観測点**:

- 3 routing pattern (L1/L2/L3) が articulate
- Session 終了 protocol が 3 level 全件 articulate
- 引き継ぎ protocol が双方向 articulate
- synthetic scenario で全 routing が再現可能

### Phase M3: 動的昇格・降格ルール

**deliverable**:

- `complexity-policy.md` を拡張: 昇格 trigger 列挙
  - Authority に触れ始めた
  - plan.md non-goal / 不可侵原則に近づいた
  - schema / contract / merge policy 変更が必要
  - generated artifact / sync guard 整合が必要
  - 当初想定より複数軸にまたがった
  - checklist 局所項目で閉じなくなった
- 降格 trigger 列挙
  - 既存方針の範囲内
  - Authority / Contract に touch しない
  - checklist 局所項目だけで閉じる
  - 候補比較不要
- 昇格時の手順 articulate (= 途中で plan.md / decision-audit を起こす経路)

**scope 外**:

- 自動昇格判定 (= AI が機械的に昇格判断) は本 Phase scope 外、AI judgement に委ねる
- 過去 task の retroactive 昇格は対象外

**観測点**:

- 昇格 trigger ≥ 6 件 articulate
- 降格 trigger ≥ 4 件 articulate
- 昇格時手順 articulate
- 反証: synthetic task で trigger 該当 → 手順実行が verify 可能

### Phase M4: Task Class ごとの標準手順 (= 5 protocol)

**deliverable** (= `task-class-catalog.md` 配下 or 各 sub-doc):

- **Planning Protocol** — 構想 → 調査 → 比較検討 → 妥当性判断 → ドキュメント化 → 自己評価
- **Refactor Protocol** — 挙動不変確認 → 範囲確定 → 実装 → parity / drift / regression 確認
- **Bug Fix Protocol** — 再現 → 原因調査 → 最小修正 → regression → 再発防止 guard 検討
- **New Capability Protocol** — authority/contract/generated 追加要否 → 実装 → compatibility 確認
- **Handoff Protocol** — 現在地 / 次アクション / 未確定判断 / ハマりポイント の更新

**scope 外**:

- AI Role Catalog 起動 (= 本 Phase は **Task Class** lens で articulate、role identity は別 program)
- Task → Role routing (= post-Pilot AI Role Layer charter scope)

**観測点**:

- 5 protocol articulated
- 各 protocol に drawer Pattern 1-6 application instance hint
- 各 protocol に Complexity Policy (M3) との対応 articulated

### Phase M5: drawer `_seam` を使った最小統合

**deliverable**:

- `taskHint` / `consumerKind` / `sourceRefs` の意味を articulate (= AAG drawer-generator.ts に既 articulate 済の値を **Task Class / Session Protocol** lens で再 articulate)
- Task Class ごとの drawer 読む優先順を articulate (例: Refactor Protocol → byImport drawer 優先 / Bug Fix Protocol → byGuardTag drawer 優先)
- guard 化判断: session protocol violation 検出 guard が **value > cost** か評価 (= drawer Pattern 4 honest articulation 適用)

**scope 外**:

- AI Role Catalog
- task-to-role routing
- role-scoped context bundle 本格導入
- drawer-generator.ts 自身の改変 (= AAG framework 改変禁止、不可侵原則 1 違反)

**観測点**:

- taskHint / consumerKind / sourceRefs の意味 articulated
- 5 Task Class × drawer 軸の routing matrix articulated
- guard 化判断 articulated (Yes/No + rationale、drawer Pattern 4 適用)

---

## §4 やってはいけないこと

| 禁止事項 | なぜ |
|---|---|
| AAG framework / Standard / drawer / 5 文書 / role / AAG-COA の articulate 内容を変更 | 不可侵原則 1 |
| 新概念 (= 既存 vocabulary 外) の追加 | 不可侵原則 2 (`strategy.md` §1.1) |
| 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の touch | 不可侵原則 3 |
| 5 軸 / 8 軸 articulate なき deliverable 追加 (= 5 軸 lens から外れる articulate) | 不可侵原則 4 + drawer Pattern 2 |
| observation なき articulation (= drawer Pattern 4 違反) | drawer Pattern 4 |
| 単一 commit で 2 軸 / 2 Phase まとめる (= 軸 / Phase 境界での観測ができなくなる) | drawer Pattern 1 (Commit-bound Rollback) 違反 |
| AI Role Catalog の本実装 (= 本 program scope 外、post-Pilot 別 program) | 不可侵原則 1 + 不可侵原則 2 |
| 自動昇格判定の機械化 (= AI judgement に委ねる scope) | drawer Pattern 4 (honest articulation) — 機械化は dead specification 化 risk |
| guard 化を M5 完了前に着手 | drawer Pattern 4 (value > cost 評価が前提) |

---

## §5 関連実装

### 触らない (既存資産は維持)

| パス | 役割 |
|---|---|
| `aag/_internal/*` | AAG framework articulate (= 参照のみ、改変禁止 = 不可侵原則 1) |
| `aag/core/` | AAG Core (= 同上) |
| `references/01-foundation/platformization-standard.md` | Standard (= 引用のみ) |
| `references/05-aag-interface/drawer/decision-articulation-patterns.md` | drawer (= Pattern 1-6 引用、改変禁止) |
| `projects/_template/` | 5 文書 template (= 参照のみ) |
| `roles/*` | role identity (= 参照のみ、改変禁止) |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA (= 参照のみ) |
| 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) | 業務 logic (= touch 禁止 = 不可侵原則 3) |

### 新設 (Phase M1-M5)

> **新 path articulation (= aag-self-hosting-completion R0-R5 で確定)**: M1-M5 deliverable target = `references/05-aag-interface/protocols/`。R2 で skeleton (= `protocols/README.md`) landed 済、本 project M1-M5 で fill。

| パス | 軸 |
|---|---|
| `references/05-aag-interface/protocols/task-protocol-system.md` | M1 上位 doc |
| `references/05-aag-interface/protocols/task-class-catalog.md` | M1 + M4 (Task Class 6 類型 + 5 protocol) |
| `references/05-aag-interface/protocols/session-protocol.md` | M1 + M2 (Session 手順 + L1/L2/L3 routing) |
| `references/05-aag-interface/protocols/complexity-policy.md` | M1 + M3 (L1/L2/L3 articulate + 昇格・降格 trigger) |

### 拡張 (既存 mechanism extend)

| パス | 拡張内容 |
|---|---|
| `.claude/manifest.json` | discovery に新 doc 追加 (M1 完了後) |
| `references/04-tracking/recent-changes.generated.md` | サマリ追加 (= archive 時) |

---

## §6 推定 effort + ROI

- effort: M1-M5 で **新 doc 4 件** + 既存 doc 引用 routing、bootstrap 込み 1-2 session 想定
- value: 軽い修正で制度が重くならない / 重い変更で制度が間に合わない 解消、session 開始 / 終了 / 引き継ぎ の ad-hoc 解消
- 比較対象: drawer landing (= AAG Pilot PROD-X) は 1 doc + manifest update で完了、本 program は 4 doc 想定 = drawer の ~4× scope
- AAG-COA: **Level 2 + governance-hardening + breakingChange=false + requiresGuard=maybe + requiresHumanApproval=true** (詳細 = `projectization.md`)
