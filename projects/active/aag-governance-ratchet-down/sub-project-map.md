# sub-project-map — aag-governance-ratchet-down (umbrella)

> 役割: umbrella から spawn する sub-program の一覧と依存関係。
>
> **正本**: `projects/active/aag-governance-ratchet-down/plan.md` §Phase 構造 + §不可侵原則。
> 本文書は AAG-COA Umbrella governance contract の summary。

## sub-program 一覧

| ID | sub-program | scope | leverage | status | changeType |
|---|---|---|---|---|---|
| Sub-1 | `aag-coverage-rule-expansion` (C1) | artifact-coverage rules 拡張で unmanaged 86.2% を ratchet-down (= app/src/ 等の zone を coverage に articulate) | medium | not-spawned | governance-hardening |
| **Sub-2** | **`aag-failure-pattern-guards` (C2 + C3)** | **6 guard candidates の実 guard test articulate (= ratchet-down 完成、CLAUDE.md G8)** | **high (= 最 leverage)** | **not-spawned** | **governance-hardening** |
| Sub-3 | `aag-disposition-execution` (C4) | Reading Pass 残 19 件 disposition の実 execution (= move 12 + split 3 + archive 3 + generated-register 1) | medium | not-spawned | architecture-refactor |
| Sub-4 | `aag-failure-pattern-maturity` (C5) | Failure Loop maturity progression (= observed → guardrail-shadow → guardrail-advisory) | low (= taxonomy review window 律速) | not-spawned | governance-hardening |

## 依存関係

各 sub-program は **独立 spawn 可、依存順序なし**。ただし以下の articulate 整合あり:

```
aag-scp (= archived 2026-05-10)
   ├── advisory infrastructure articulate 完成
   ↓
aag-governance-ratchet-down (= 本 umbrella)
   ├── Sub-1 (coverage 拡張) ─── parallel ─┐
   ├── Sub-2 (guard 化) ──────── parallel ─┤  各 sub は独立 spawn 可
   ├── Sub-3 (disposition exec) ─ parallel ─┤
   └── Sub-4 (maturity) ──────── parallel ─┘  (= Sub-4 のみ taxonomy review window 律速)
```

**leverage 評価**:
- **Sub-2 が最 leverage 高** (= 6 guard candidates を実 guard に articulate することで、Failure Loop の design intent = ratchet-down 自動化 が完成する。CLAUDE.md G8 機械化実装の最終段階)
- Sub-1 は visibility 拡張 (= 86.2% unmanaged の reduction で artifact governance の coverage 拡大)
- Sub-3 は physical cleanup (= reading-decisions の articulate を実 file movement に converted)
- Sub-4 は review window 律速で priority lower (= taxonomy review window 経由、時間依存)

## sub-program spawn 推奨順序 (= 必須ではないが leverage 順)

1. **Sub-2** (= 最 leverage 高): guard 化で Failure Loop ratchet-down 完成
2. **Sub-1** (= visibility 拡張): coverage rule 拡張で governance 範囲拡大
3. **Sub-3** (= physical cleanup): disposition execution
4. **Sub-4** (= review window 律速): maturity progression

各 sub-program の spawn 判断は **user 判断 gate** (= AAG-SCP-DOC-LEARNING-002 整合)。

## sub-program bootstrap 手順

各 sub-program spawn 時の bootstrap 手順:

1. `projects/_template/` から copy (= projects/_template/AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md / projectization.md / config/project.json)
2. AAG-COA 判定 articulate (= projectization.md §1)
3. `references/04-tracking/operations/new-project-bootstrap-guide.md` 整合確認
4. config/project.json `projectId` + `title` + `versionImpact` + `projectization` を articulate
5. `references/04-tracking/open-issues.md` の active projects 索引に追加
6. `cd app && npm run docs:generate` で project-health 反映確認
7. 親 umbrella `sub-project-map.md` の status を `not-spawned` → `active` に flip

## boundary

- 本 umbrella から spawn する sub-program は **本 umbrella scope 内 articulate のみ** (= projectization §4 nonGoals)
- 各 sub-program は独立 governance contract (= 独自 plan / checklist / projectization) を持つ
- 各 sub-program archive 完遂は本 umbrella checklist で track (= sub-program 完遂 ≠ umbrella 完遂)
- 本 umbrella 完遂条件: 全 sub-program archive 完遂 + 本 umbrella final review

## 関連 program との対比

| 軸 | aag-governance-ratchet-down (本 umbrella) | taxonomy-v2 (parallel umbrella) |
|---|---|---|
| sub-program count | 4 (= coverage / guards / dispositions / maturity) | 2 (= responsibility-taxonomy-v2 + test-taxonomy-v2、両子 archive 済) |
| spawn 状態 | 全 not-spawned | 両子 archived 2026-04-27 |
| umbrella status | active (= bootstrap 直後) | active (= observation phase 2026-04-27〜) |
| changeType | governance-hardening | architecture-refactor |
| 不可侵原則 | 7 件 (= articulate 完成、即 Gate 化禁止 等) | 7 不可侵原則 (= 未分類は分類である 等) |
