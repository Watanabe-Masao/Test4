# Operational Protocol System — Charter Draft

> **status**: pre-bootstrap charter draft (= 起動 ≠ commit、user trigger 待ち)
> **位置付け**: AAG Platformization Pilot 完遂後 (2026-05-02 archive 済) の post-Pilot 運用制度。Pilot で landing した AAG framework / Standard / drawer (= `references/03-guides/decision-articulation-patterns.md`) を **使う側** の制度を articulate する。
> **scope**: AAG Core / 主アプリ code は touch しない。既存 5 文書 (AI_CONTEXT / HANDOFF / plan / checklist / decision-audit) + role / AAG-COA / drawer の **使い方を明文化** するだけの上層。
> **bootstrap trigger**: user 明示判断 (= `new-project-bootstrap-guide.md` に従い新 project を起動、project-id は bootstrap 時に確定)。本 charter は bootstrap 前の articulation で、bootstrap せずに storage しても dead specification にならないよう **trigger / scope / non-goal を明記**。

## §1 何を解決するか

AAG Pilot 完遂で AAG framework が articulate complete に到達したが、**AAG を日常作業で使う側の操作プロトコル** が未明文化:

- 軽い修正で制度が重くなりすぎる risk (= over-ritual)
- 重い変更で制度が間に合わない risk (= under-ritual)
- セッションの開始 / 終了 / 引き継ぎが ad-hoc
- AI が毎回必要な文脈に最短到達できない
- 途中で重さが変わったときの昇格・降格が articulate されていない

## §2 不可侵原則 (= 起動時に守るべき scope discipline、本 charter 起動条件)

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 既存 AAG framework / Standard / drawer / 5 文書 / role / AAG-COA を破壊的変更しない (= 上に薄く載せる) | revert |
| 2 | 新概念 (= 既存に articulated されていない vocabulary) を追加しない (`strategy.md` §1.1「正本を増やさない」整合) | scope 外 |
| 3 | 主アプリ code (= app/src/, app-domain/, wasm/) は touch しない | scope 外 |
| 4 | 全 deliverable は drawer Pattern 2 (Scope Discipline) を適用 (= 各 deliverable に「やらないこと」articulate) | scope 外 |
| 5 | 全 deliverable は drawer Pattern 1 (Commit-bound Rollback) を適用 (= judgement commit + tag pair) | scope 外 |
| 6 | 起動判断は user 領域、AI 単独で起動しない | scope 外 |

## §3 Phase 構造

### Phase M1: Task Protocol System 定義 (= core 制度の articulation)

**deliverable** (3 doc 新設、配置 = `references/03-guides/`):

- [ ] `task-protocol-system.md` — 上位 doc、M1-M5 全体の index
  - DA entry articulate (judgement commit + 5 軸 + 観測点)
- [ ] `task-class-catalog.md` — Task Class 列挙 (= Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff の 6 類型、各々に scope + 標準手順 pointer)
- [ ] `session-protocol.md` — Session 開始 / 実行中 / 終了 / 引き継ぎ の prescriptive 手順 (= 現 ad-hoc の置換)
- [ ] `complexity-policy.md` — L1 軽修正 / L2 通常変更 / L3 重変更 の articulate + 各 level で使う文書 (= L1: checklist / L2: plan + checklist / L3: decision-audit まで)

**scope 外 (= やらないこと)**:

- 既存 5 文書 / role / AAG-COA / drawer の articulate を改変しない
- AI Role Catalog (= Authority Auditor / Derivation Assembler 等) は **本 Phase scope 外** (= post-Pilot AI Role Layer charter で articulate 予定、drawer `_seam` で forward compatibility 確保済)
- guard 化 (= 機械検証) は M1 scope 外、M5 完了後に判断

**観測点 (= drawer Pattern 6 適用)**:

- [ ] 6 Task Class が articulate されている (catalog 完成)
- [ ] Session Protocol が L1/L2/L3 別に articulate されている
- [ ] L1/L2/L3 と既存 5 文書の使い分けが table で articulate されている
- [ ] 4 doc 全 landing で `docs:check` PASS
- [ ] 反証可能観測 ≥ 1 (例: synthetic session scenario で各 level の routing が verify 可能)

---

### Phase M2: 既存 5 文書への routing 固定

**deliverable**:

- [ ] `session-protocol.md` を拡張: L1/L2/L3 別 read order を articulate
  - L1: HANDOFF → AI_CONTEXT scope → 対象 checklist
  - L2: AI_CONTEXT → HANDOFF → 対象 plan → checklist
  - L3: AI_CONTEXT → HANDOFF → plan → decision-audit → checklist
- [ ] Session 終了 protocol を articulate (L1/L2/L3 別)
  - L1: checklist 更新 + 必要なら handoff 現在地
  - L2: checklist + handoff (現在地 / 次アクション)
  - L3: checklist + DA + handoff (現在地 / 次アクション / ハマりポイント)
- [ ] 引き継ぎ protocol を articulate (引き継ぐ側 / 引き継がれる側)

**scope 外**:

- 各 file の articulate 内容そのものは改変しない (= 既存内容維持、使い方だけ articulate)
- file 形式変更 (= schema / template) はしない

**観測点**:

- [ ] 3 routing pattern (L1/L2/L3) が articulate されている
- [ ] Session 終了 protocol が 3 level 全件 articulate
- [ ] 引き継ぎ protocol が双方向 articulate
- [ ] synthetic scenario で全 routing が再現可能

---

### Phase M3: 動的昇格・降格ルール

**deliverable**:

- [ ] `complexity-policy.md` を拡張: 昇格 trigger 列挙
  - Authority に触れ始めた
  - plan.md non-goal / 不可侵原則に近づいた
  - schema / contract / merge policy 変更が必要
  - generated artifact / sync guard 整合が必要
  - 当初想定より複数軸にまたがった
  - checklist 局所項目で閉じなくなった
- [ ] 降格 trigger 列挙
  - 既存方針の範囲内
  - Authority / Contract に touch しない
  - checklist 局所項目だけで閉じる
  - 候補比較不要
- [ ] 昇格時の手順 articulate (= 途中で plan.md / decision-audit を起こす経路)

**scope 外**:

- 自動昇格判定 (= AI が機械的に昇格判断) は本 Phase scope 外、AI judgement に委ねる
- 過去 task の retroactive 昇格は対象外

**観測点**:

- [ ] 昇格 trigger が 6 件以上 articulate
- [ ] 降格 trigger が 4 件以上 articulate
- [ ] 昇格時手順が articulate
- [ ] 反証: synthetic task で trigger 該当 → 手順実行が verify 可能

---

### Phase M4: Task Class ごとの標準手順 (= 5 protocol)

**deliverable** (= `task-class-catalog.md` 配下 or 各 sub-doc):

- [ ] **Planning Protocol** — 構想 → 調査 → 比較検討 → 妥当性判断 → ドキュメント化 → 自己評価
- [ ] **Refactor Protocol** — 挙動不変確認 → 範囲確定 → 実装 → parity / drift / regression 確認
- [ ] **Bug Fix Protocol** — 再現 → 原因調査 → 最小修正 → regression → 再発防止 guard 検討
- [ ] **New Capability Protocol** — authority/contract/generated 追加要否 → 実装 → compatibility 確認
- [ ] **Handoff Protocol** — 現在地、次アクション、未確定判断、ハマりポイントの更新

**scope 外**:

- AI Role Catalog 起動 (= 本 Phase は **Task Class** lens で articulate、role identity は別 program)
- Task → Role routing (= post-Pilot AI Role Layer charter scope)

**観測点**:

- [ ] 5 protocol が articulate
- [ ] 各 protocol に drawer Pattern 1-6 application instance hint
- [ ] 各 protocol に Complexity Policy (M3) との対応 articulate

---

### Phase M5: drawer `_seam` を使った最小統合

**deliverable**:

- [ ] `taskHint` / `consumerKind` / `sourceRefs` の意味を articulate (= AAG drawer-generator.ts に既 articulated の値を **Task Class / Session Protocol** lens で再 articulate)
- [ ] Task Class ごとの drawer 読む優先順を articulate (例: Refactor Protocol → byImport drawer 優先 / Bug Fix Protocol → byGuardTag drawer 優先)
- [ ] guard 化判断: session protocol violation 検出 guard が **value > cost** か評価 (= drawer Pattern 4 honest articulation 適用)

**scope 外**:

- AI Role Catalog
- task-to-role routing
- role-scoped context bundle 本格導入
- drawer-generator.ts 自身の改変 (= AAG framework 改変禁止、不可侵原則 1 違反)

**観測点**:

- [ ] taskHint / consumerKind / sourceRefs の意味 articulated
- [ ] 5 Task Class × drawer 軸の routing matrix articulated
- [ ] guard 化判断が articulated (Yes/No + rationale)

---

## §4 Pilot 完了 criterion (= bootstrap 後の完了判定)

**Pilot 完了 = 以下が同時に satisfy**:

1. M1-M5 全 deliverable landed
2. 6 Task Class + L1/L2/L3 + 5 protocol が articulate
3. AI simulation で **昇格 / 降格 trigger** + **session start/end** が verify (= drawer Pattern 6 application)
4. `decision-audit.md` に Pilot 判断履歴 landing
5. AAG framework / Standard / drawer / 5 文書 / role / AAG-COA / 主アプリ code に破壊的変更 0 件

## §5 既存資産との関係

| 既存資産 | 本 program での扱い |
|---|---|
| AAG framework (`references/01-principles/aag/` + `aag/core/`) | touch しない (= 不可侵原則 1) |
| Platformization Standard | touch しない |
| drawer (`references/03-guides/decision-articulation-patterns.md`) | 引用 (= Pattern 1-6 を本 program 自身が application instance として appendix で articulate)、改変しない |
| 5 文書 (AI_CONTEXT / HANDOFF / plan / checklist / decision-audit) | 使い方を articulate、内容 / template / schema は改変しない |
| `roles/*` | 引用、改変しない |
| AAG-COA (`projectization-policy.md`) | 引用、改変しない (= L1/L2/L3 は AAG-COA の Level 0-4 と異なる lens、混同禁止) |
| `aag/core/` | touch しない |
| 主アプリ code | touch しない |

## §6 推定 effort + ROI

- effort: M1-M5 で **新 doc 4 件 + 既存 doc 引用 routing**、bootstrap の AAG-COA 判定込み 1-2 session
- value: 軽い修正で制度が重くならない / 重い変更で制度が間に合わない 解消、session 開始 / 終了 / 引き継ぎ の ad-hoc 解消
- 比較対象: drawer landing (= PROD-X) は 1 doc + manifest update で完了、本 program は 4 doc 想定 = drawer の ~4× scope
- AAG-COA 推定: **Level 2 + governance-hardening** + breakingChange=false + requiresGuard=maybe + requiresHumanApproval=true

## §7 bootstrap 起動条件 (= dead specification 化防止)

本 charter は以下 trigger で bootstrap される。trigger 不在のまま storage しても dead specification にならないよう、本 §7 で起動条件を articulate:

1. **user 起動判断** (= 不可侵原則 6) — 本 charter を見て user が起動 trigger 発火
2. **AAG-COA 判定 + plan + checklist + decision-audit** — `new-project-bootstrap-guide.md` に従い skeleton 6 doc landing
3. **CURRENT_PROJECT.md 切替判断** — bootstrap 時に user に escalate (= 別 active program との競合判断)
4. **trigger 不在期間の限度なし** — calendar-based deadline なし (= AAG-REQ-NO-DATE-RITUAL 整合)、state-based trigger 待ち

## §8 関連

- AAG Platformization Pilot (完了): `projects/completed/aag-platformization/` (= 本 charter は post-Pilot 制度として位置付け)
- drawer (= 本 charter が引用する pattern 集): `references/03-guides/decision-articulation-patterns.md`
- AAG-COA (= bootstrap 前判定): `references/03-guides/projectization-policy.md`
- new project bootstrap guide: `references/03-guides/new-project-bootstrap-guide.md`
- post-Pilot AI Role Layer charter (= 本 charter scope 外、別 program candidate): `projects/completed/aag-platformization/decision-audit.md` DA-α-007 §4.1 C-α-002

## §9 status / history

| date | event | actor |
|---|---|---|
| 2026-05-02 | 本 charter draft landing (= AAG Pilot archive 後の post-Pilot 運用制度提案、user articulation 反映) | user + AI |
| TBD | bootstrap 起動 (= user trigger + new-project-bootstrap-guide.md 適用) | user 起動判断 |
| TBD | bootstrap 後 program archive | TBD |
