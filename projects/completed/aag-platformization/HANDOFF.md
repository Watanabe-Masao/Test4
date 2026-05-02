# [ARCHIVED] HANDOFF — aag-platformization

> **Archived: 2026-05-02** — Phase 0 (Bootstrap) + Phase 1 (Pilot Fill 8 軸 × 実バグ 3 件修復) + Phase 2 (AI simulation CT1-CT5) + Phase 3 (Archive + 横展開可否判定条件 articulation) 全完遂、ユーザー承認 (本 commit) により archive プロセス完了。physical archive 移管 = `projects/completed/aag-platformization/` (本 commit)。
>
> **deliverable summary**:
> - **8 軸 articulation complete** — A1 source-of-truth.md §1 (4 layer 正本) / A2a source-of-truth.md §4 Merge Policy 単一点 + 実バグ 3 件修復 / A2b merged-architecture-rules.json (676KB / 172 rule + resolvedBy + sync guard 6 test) / A3 aag-response.schema.json + detector-result.schema.json (JSON Schema draft-07 + sync guard 7 test) / A4 ruleBindingBoundaryGuard (6 test) / A5 3 drawer artifact (rule-index + rules-by-path + rule-by-topic + sync guard 10 test、_seam routing metadata) / A6 architectureRules.ts no-op 維持 / A7 不可侵原則 7 件 + 5 軸 articulate 要件 / A8 4 sync guard 29 test active
> - **実バグ 3 件修復** — merge policy 揺れ (source-of-truth.md §4 canonical 単一点化) / bootstrap path 破綻 (DEFAULT_REVIEW_POLICY_STUB 追加) / RuleExecutionOverlayEntry 三重定義 (aag-core-types.ts 集約)
> - **AI simulation で 5 機能 verify** — F1=PASS partial coverage (mapped 率 30.2%、post-Pilot 改善 candidate C-α-003) / F2-F5=PASS。CT1-CT5 全 PASS、quantitative observation + 反証可能 result articulated
> - **Decision Audit 制度** — 8 entry (DA-α-000 + 002a〜007) + 16 annotated tag + 8 implementation commit、各 entry が 5 軸 articulation + 振り返り観測点 + Commit Lineage を持つ self-dogfood
> - **System Inventory landing** — Standard §3.1 に AAG = "Pilot complete" status entry 追加 (Pilot reference として永続)
> - **PROD-X drawer landing (post-Pilot self-dogfood)** — `references/03-guides/decision-articulation-patterns.md` に 6 pattern を **領域 agnostic** に articulate (主アプリ改修主軸、AAG framework 内部読まずに適用可能、self-test 24/24 PASS)
>
> **意図的 skip 3 件** (Pattern 5 application instance):
> - DA-α-001 別 entry 化 skip (= A1 verify は source-of-truth.md §1 + DA-α-002a で吸収、`strategy.md` §1.1「正本を増やさない」整合)
> - drawer rule-detail/`<id>` per-file 化 skip (= merged-architecture-rules.json で代替、ROI 低、DA-α-005 §判断時)
> - CURRENT_PROJECT.md 切替保留 (= `pure-calculation-reorg` が active 別 program 進行中、archive 時に user に escalate)
>
> **後続 program candidate** (= 起動 ≠ commit、trigger 待ち、DA-α-007 §4.1):
> - C-α-001 Simulation Harness Template (= PROD-X drawer Pattern 6 で landed 済の一部)
> - C-α-002 drawer `_seam` consumer kind formal taxonomy (= AI Role Layer charter で起動)
> - C-α-003 mapped 率 coverage 改善 (= F1 partial coverage 解消 trigger)
>
> **後続 program candidate articulate しない判断** (= Pattern 4 + Pattern 5 self-application):
> - aag-config (= AAG → 主アプリ knowledge access 境界 articulate) は **value < cost** で skip (= DA-α-007 §4「charter 先行作成 anti-pattern」整合、artifact 化せず conversation context のみ)
>
> **AAG Knowledge Relocation observation** (= 構造債務 articulated):
> - `references/01-principles/aag/` 9 doc が `aag/core/` と二重配置で境界違反、本 archive scope 外、後続 trigger 発生時に独立 program

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 1〜3 全完遂 (2026-05-02、人間承認 archive 完了)**。

Pilot 完了 criterion 5 件全 MET:
| # | criterion | status |
|---|---|---|
| 1 | AAG が Standard 8 軸 (A1-A8) すべてで articulate complete | ✅ MET |
| 2 | 実バグ 3 件修復 | ✅ MET |
| 3 | AI simulation で 5 機能 (F1-F5) verify | ✅ MET (F1 partial coverage articulate を含む) |
| 4 | Pilot 判断履歴 (DA-α-002a〜007) landing | ✅ MET (7 entry) |
| 5 | System Inventory に AAG entry が "Pilot complete" status で landing | ✅ MET (Standard §3.1) |

## 2. 次にやること

詳細: `checklist.md` / `plan.md` §3。

### 高優先 (Phase 1 の最初)

**A2 Derivation = 実バグ 3 件修復 + merged artifact + sync guard**

- `RuleExecutionOverlayEntry` 三重定義を `aag-core-types.ts` に集約
- `merged.ts` bootstrap 修復 + `resolvedBy` 追加
- 各 overlay comment 整合 + bootstrap-guide Step 4 整合
- `merged-architecture-rules.<format>` artifact + sync guard

→ Go 実装条件 C1 + C2 を最初に達成、bootstrap path の物理的破綻を修復。

### 中優先 (Phase 1 残り)

- A1 Authority (4 layer 正本確認)
- A3 Contract (AagResponse + detector schema 化)
- A4 Binding (RuleBinding boundary guard)
- A5 Generated (drawer 4 種)
- A6 Facade / A7 Policy / A8 Gate (verify)

### 低優先 (Phase 2-3 + Gate)

- Phase 2: AI simulation (CT1-CT5)
- Phase 3: Archive + 横展開 charter
- Gate: 最終 archive レビュー (人間承認 1 点)

## 3. ハマりポイント

### 3.1. supreme principle 違反 (= articulation without functioning) は本 program 最大の risk

`strategy.md` §2.1「抽象化過剰」AI 弱点を本 program で再現しないこと。Phase 完了 = articulate 完了ではなく **observable verification 通過** が条件。

### 3.2. 既存 AAG (12/12 AAG-REQ + 9 integrity guard) 振る舞いを変えない

修復は **実バグ 3 件のみ** (merge policy 揺れ / bootstrap 破綻 / 三重定義)、必ず DA entry に articulate。

### 3.3. 派生 artifact の 5 軸 + 8 軸 articulate を skip しない

各 deliverable は 5 軸 (製本 / 依存 / 意味 / 責務 / 境界) + Standard 8 軸 mapping を articulate。articulate なき deliverable は scope 外 (不可侵原則 4)。

### 3.4. observation なき articulation は scope 外

Phase 完了条件は機械検証 (`test:guards` PASS + observation Y/N + golden test 等)。articulate 完了は条件ではない。

### 3.5. judgementCommit を amend / rebase / force push しない

DA entry の `judgementCommit` (sha) と `judgementTag` (annotated tag) が rollback target。**rollback tag 動作確認は worktree clean 時のみ** (DA-α-000 早期事象で記録済)。

### 3.6. 言語境界

本 program runtime に **Rust 使用禁止** (本体 WASM/Rust と境界混線)。Go / Python / combo OK。AI 強推奨時は人間確認 escalation。

### 3.7. 横展開 (docs / app / health) は本 program scope 外

Phase 3 で charter のみ articulate、実施は別 program。本 program は AAG Pilot 完了が成功条件。

### 3.8. CLAUDE.md は触らない

CLAUDE.md は「use AAG (capability/limit articulated)」meta-instruction。AAG 入口 (`aag/` + `references/01-principles/aag/`) ではない。本 program で CLAUDE.md edit しない。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 文脈の入口 |
| `plan.md` | 3 Phase + 1 Gate + 8 軸 deliverable + 不可侵原則 |
| `checklist.md` | observable verification の機械入力 |
| `decision-audit.md` | DA template + 判断履歴 + 振り返り |
| `projectization.md` | AAG-COA Level 3 判定 |
| `breaking-changes.md` | 実バグ修復 + rollback plan |
| `references/01-principles/platformization-standard.md` | 上位 Standard (本 program = Pilot) |
| `references/01-principles/aag/*` | 既存 AAG articulate (5 軸 lens の location) |
| `aag/core/AAG_CORE_INDEX.md` / `aag/core/principles/core-boundary-policy.md` | AAG Core 入口 |
