# HANDOFF — operational-protocol-system

> 役割: 起点文書。後任者が最初に読む。

> **▶ READY TO RESUME (2026-05-03、aag-self-hosting-completion R5 完遂で trigger satisfied)**: 本 project の resume 条件は **aag-self-hosting-completion R0-R5 完了** で全て satisfied (= 新構造 references/05-aag-interface/protocols/ skeleton landed + plan path refinement 完了)。M1 着手は本 project 内 DA-α-001 起票 + user 判断で起動可能。
>
> **新 path articulation (= aag-self-hosting-completion R0-R5 で確定)**: M1-M5 deliverable target = `references/05-aag-interface/protocols/`。`task-protocol-system.md` / `task-class-catalog.md` / `session-protocol.md` / `complexity-policy.md` + 5 protocol 系列を **同 directory** に landing。R2 で skeleton (= protocols/README.md) landed 済、M1 で fill のみ。
>
> **resume 着手判断**: 本 project DA-α-001 (= placeholder 済) を articulate して M1 着手判断 + 5 軸 articulation + 観測点 + Lineage を land。詳細: `plan.md` §3 M1。

## 1. 現在地

**Phase M1 (Task Protocol System 定義) landing 完了 (= 2026-05-04、archive-v2 program PR 6 で実施)**。AAG Platformization Pilot 完遂 (2026-05-02 archive) + aag-self-hosting-completion 完遂 (2026-05-04 archive) + Archive v2 program PR 1-5 完遂を経て、M1 着手 trigger satisfied。

### 2026-05-04 M1 landing 内容

- `references/05-aag-interface/protocols/` 配下に 4 doc landed (= 全 articulate 完了):
  - `task-protocol-system.md` (= 上位 index、M1-M5 全体)
  - `task-class-catalog.md` (= 6 Task Class、TC-1 Planning / TC-2 Refactor / TC-3 Bug Fix / TC-4 New Capability / TC-5 Incident Discovery / TC-6 Handoff)
  - `session-protocol.md` (= Session 開始 / 実行中 §3.2-§3.4 (L1/L2/L3) / 終了・引き継ぎ §4)
  - `complexity-policy.md` (= L1 軽修正 / L2 通常変更 / L3 重変更 + AAG-COA との関係 + 既存 5 文書 use-case mapping)
- `decision-audit.md` に DA-α-001 (M1 着手判断) entry articulated (= 5 軸 + 5 観測点 + Lineage 仮 sha)
- `checklist.md` Phase M1 で 8/12 [x] (= 残: M1-4 docs:check PASS / M1 振り返り / final lint+build PASS)

### Phase M2 (= 既存 5 文書 routing 固定) 完遂内容 (2026-05-04)

- DA-α-002 entry landed + 振り返り判定 = "正しい"
- `session-protocol.md` を拡張:
  - §1.1 L 別 read order table
  - §4.1 Session 終了 protocol L 別 required artifacts table
  - §4.3.1 引き継ぐ側 + §4.3.2 引き継がれる側 双方向 articulate
  - §4.4 antipattern を L 別 articulate
- M2 観測点 4 件全達成

### Phase M3 (= 動的昇格・降格ルール) 完遂内容 (2026-05-04)

- DA-α-003 entry landed (= 5 軸 + 4 観測点 + Lineage articulate)
- `complexity-policy.md` を拡張:
  - §4.1 昇格 trigger 10 件 articulate (P1-P10、≥ 6 件 観測点を 4 件超過)
  - §4.2 降格 trigger 7 件 articulate (D1-D7、≥ 4 件 観測点を 3 件超過)
  - §4.3 昇格時手順 (L1→L2 / L2→L3 / L1→L3 直接昇格)
  - §4.4 降格時手順 (= 既起票 artifact retire 不要)
  - §4.5 articulation template (= drawer Pattern 4 self-application)
  - §4.6 AI judgement 範囲 articulate (= 自動判定可 / 不可)
- M3 観測点 4 件全達成

### M1-M5 残作業

- ~~M1: Task Protocol System 定義~~ ✅ 完遂 (2026-05-04)
- ~~M2: 既存 5 文書への routing 固定~~ ✅ 完遂 (2026-05-04)
- ~~M3: 動的昇格・降格ルール articulate~~ ✅ 完遂 (2026-05-04)
- M4: 各 Task Class の標準手順 (= 5 protocol 詳細) fill 予定
- M5: drawer `_seam` を使った最小統合 (= taskHint / consumerKind / sourceRefs)

## 2. 次にやること

詳細は `checklist.md` / `plan.md` §3。

### 高優先 (M3 wrap-up + M4 着手判断)

- [ ] DA-α-003 振り返り判定 (= 正しい / 部分的 / 間違い、本 wrap-up commit で articulated)
- [ ] DA-α-003 Lineage 実 sha update (= 本 commit 後)
- [ ] M4 着手判断 = DA-α-004 起票 (= M4 Task Class 5 protocol articulate 方針)

## 3. ハマりポイント

### 3.1. AAG framework / drawer に「使い方」を articulate したくなる誘惑

不可侵原則 1 違反。本 project は AAG 上に薄く載せる operational layer のみ。AAG 内部 (`aag/_internal/` + `aag/core/`) は **touch しない**、参照のみ。drawer (`references/05-aag-interface/drawer/decision-articulation-patterns.md`) も改変しない、引用のみ。

### 3.2. 新概念を作りたくなる誘惑

不可侵原則 2 違反。`strategy.md` §1.1「正本を増やさない」整合。既存 vocabulary (Task Class / L1-L3 / Phase / DA-α / drawer Pattern 1-6) で articulate する。新 vocabulary が必要に見える場合は **既存 vocabulary で articulate しきれていない** = articulate 不足を疑う。

### 3.3. Role identity と Task Protocol の混同

- Role identity (= `roles/*`) = 永続的 expertise (= 計算の正しさ / DuckDB / Explanation 等)
- Task Protocol (= 本 project) = 状況的 task class (= Planning / Refactor / Bug Fix 等)

両者は **別 lens で同時 application 可能**。例: Refactor Task の中で invariant-guardian role が consult される。`task-class-catalog.md` で混同禁止を明示。

### 3.4. AAG-COA Level 0-4 と Complexity Policy L1-L3 の混同

- AAG-COA Level 0-4 = bootstrap 前 **単一時点** 判定 (= project の重さ判定)
- Complexity Policy L1-L3 = task 進行中の **動的** 判定 (= 昇格・降格 trigger あり)

別 lens、別タイミング、混同禁止。`complexity-policy.md` で対応関係 articulate (例: AAG-COA Level 2-3 project 内の task は通常 L2-L3 だが、Level 1 project でも L3 task が発生し得る)。

### 3.5. guard 化したくなる誘惑

M1-M3 では不要。M5 で value vs cost 評価後に判断 (= drawer Pattern 4 適用)。session protocol violation の機械検証は **dead specification 化 risk** vs 実害 を honest に articulate して判断する。

### 3.6. CURRENT_PROJECT.md 切替判断

bootstrap 時点で `pure-calculation-reorg` が active のまま (= 本 project 起動と独立)。本 project が Phase M1 着手時に CURRENT_PROJECT 切替が必要か判断する。切替判断は user 領域 (= 不可侵原則 6 + 6 自身)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間 (why / scope / read order) |
| `plan.md` | 不可侵原則 6 件 + Phase M1-M5 構造 + scope 外 + 観測点 |
| `checklist.md` | completion 判定 (= Phase 0 + M1-M5 全 phase の checkbox) |
| `decision-audit.md` | 重判断 institution + DA-α-000 (進行モデル) |
| `projectization.md` | AAG-COA 判定 (Level 2 + governance-hardening) |
| `aag/execution-overlay.ts` | 案件運用状態 override (= 空、defaults 解決) |
| `references/05-aag-interface/drawer/decision-articulation-patterns.md` | drawer (= Pattern 1-6 application instance source) |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA |
| `references/05-aag-interface/operations/new-project-bootstrap-guide.md` | bootstrap 手順 |
| `projects/completed/aag-platformization/` | AAG Pilot (= 本 project trigger source) |
