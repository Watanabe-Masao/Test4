# HANDOFF — operational-protocol-system

> 役割: 起点文書。後任者が最初に読む。

> **⏸ PAUSED (2026-05-02)**: 本 project は **`aag-self-hosting-completion` project の R5 完了後 resume** で pause 状態。理由 = aag-self-hosting-completion の R5 で本 project の M1 deliverable (= task-protocol-system / task-class-catalog / session-protocol / complexity-policy) を `aag/interface/protocols/` に **structural foundation 上に直接 landing** する設計のため、references/03-guides/ 上で先行 articulate すると後で migrate 必要 = 順序整合性違反。aag-self-hosting-completion の R5 完了で resume + M1-M5 着手予定。詳細: `projects/aag-self-hosting-completion/plan.md` §3 R5 + §1 不可侵原則 5 (= rollback 境界 articulate)。

## 1. 現在地

**Phase 0 (Bootstrap) のみ landed**、**Phase M1 着手前で pause**。AAG Platformization Pilot 完遂 (2026-05-02 archive) を trigger に、user articulation で post-Pilot 運用制度として独立 project に bootstrap した (commit `8283b4b` / `1a5bb09`)。

その後 user articulation で AAG framework の entry navigation level での self-hosting failure が articulate され、`aag-self-hosting-completion` project が bootstrap、本 project は R5 完了後 resume となった。

- 必須セット 6 ファイル + DA-α-000 (進行モデル) landing 済
- charter draft (`references/02-status/operational-protocol-charter-draft.md`) を `plan.md` に migrate (重複 articulate 防止のため charter draft は削除)
- 実装 0 件 → **pause、aag-self-hosting-completion R5 完了で resume + M1 着手**

## 2. 次にやること

詳細は `checklist.md` / `plan.md` §3。

### 高優先 (Phase M1 の最初)

**M1 Task Protocol System 定義**

- [ ] `task-protocol-system.md` 新設 (上位 doc、M1-M5 全体の index)
- [ ] `task-class-catalog.md` 新設 (= Task Class 6 類型 = Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff)
- [ ] `session-protocol.md` 新設 (= Session 開始 / 実行中 / 終了 / 引き継ぎ の prescriptive 手順)
- [ ] `complexity-policy.md` 新設 (= L1 軽修正 / L2 通常変更 / L3 重変更 + 各 level で使う文書)

各 doc は drawer Pattern 1 (Commit-bound Rollback) + Pattern 2 (Scope Discipline) + Pattern 5 (意図的 Skip rationale) を application instance として articulate する (= self-dogfood)。

### 着手前判断

DA-α-001 を起こす (= M1 着手判断、新 doc 4 件配置と articulate 順序、5 軸 articulation + 観測点 + Lineage)。

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
