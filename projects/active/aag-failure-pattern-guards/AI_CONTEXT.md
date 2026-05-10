# AI_CONTEXT — aag-failure-pattern-guards

> 役割: project 意味空間の入口（why / scope / read order）。
> 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= 最 leverage 高 sub)

## Project

AAG Failure Pattern Guards (= Sub-2 of aag-governance-ratchet-down umbrella、最 leverage 高)

## Purpose

aag-structural-control-plane で auto-promote された **6 guard candidates** (= ≥5 observations)
を実 guard test に articulate して **Failure Loop ratchet-down 完成** (= CLAUDE.md G8
機械化実装最終段階) を達成する。

**6 guard candidates** (= ratchet-down baseline + 検出 mechanism articulate target):
| pattern | obs | leverage |
|---|---|---|
| DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE | 16 | 高 (= 最頻) |
| DOC-FAIL-LOCATION-MISMATCH | 13 | 高 |
| DOC-FAIL-DUPLICATE-RESPONSIBILITY | 8 | 中 (= 検出 algorithm 既知) |
| DOC-FAIL-TEMPORAL-MIXING | 6 | 中 |
| DOC-FAIL-GENERATED-AS-MANUAL | 5 | 中 |
| DOC-FAIL-STALE-DESCRIPTION | 5 | 中 (= 直近 auto-promote 例) |

各 guard の articulate は **5 段階 maturity progression** (= observed → pattern-articulated →
guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory) を経る。AI 単独で advisory
から hard gate に直接昇格させない (= AAG-SCP-DOC-LEARNING-002、user 判断 gate 経由)。

## Scope

**含む**:
- 6 guard test の app/src/test/guards/ articulate (= 各 pattern の検出 algorithm 実装)
- baseline 確立 + ratchet-down 開始 (= 既存 observation 数 = baseline、超える new addition のみ
  warning)
- base-rules.ts に 6 AR-DOC-FAIL-* rule entry articulate + RuleBinding articulate
- maturity progression: pattern-articulated → guardrail-candidate-emitted → guardrail-shadow

**含まない**:
- 新 failure pattern 追加 (= aag-scp で 11 patterns articulate 済)
- AI 単独 hard gate 昇格 (= 5 段階 progression を経て user 判断 gate)
- 5 件未満 pattern の guard 化 (= unobserved 3 件は scope 外)

## 推奨 sub-PR 分割

各 guard は独立 sub-PR で landing (= 1 PR ≈ 1 guard、AAG-SCP-MIGRATION-005 整合):
1. sub-PR 1: bootstrap (本 PR、3 sub-programs 一括 spawn)
2. sub-PR 2: DOC-FAIL-DUPLICATE-RESPONSIBILITY guard (= 検出 algorithm 最 articulate、Wave 2 Batch 11 で実例観測済)
3. sub-PR 3〜7: 残 5 guard (各独立)

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次にやること）
3. 親 umbrella `HANDOFF.md`（共有 context）
4. `projects/completed/aag-structural-control-plane/` の document-failure-taxonomy 関連 deliverables
5. `app/src/test/guards/` 既存 guard test pattern（articulate 参考）
