# HANDOFF — aag-platformization

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 0 (Bootstrap) のみ landed** + Standard articulate 済。

- 必須セット 6 ファイル + DA-α-000 (進行モデル) landing 済
- `references/01-principles/platformization-standard.md` 新設 (本 project = Pilot)
- plan を 3 Phase + 1 Gate / 8 軸 deliverable 構造に **clean rewrite** (本 commit)
- 実装 0 件 → **Phase 1 から「あるべき」を「機能している」に転じる**

reframe 履歴 (Go 移行 → platformization → 分離 → drawer → context provision control → Standard Pilot → CLAUDE.md ≠ AAG entry) は `decision-audit.md` DA-α-000 軌道修正に集約済。

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
