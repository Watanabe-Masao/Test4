# HANDOFF — aag-failure-pattern-guards

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**完遂 (= shadow stage)、archive 移行待ち** (= 2026-05-10 spawn → 同日 + 翌日で全 Phase landed)。
6 guard candidates 全件が guardrail-shadow stage に articulate 済。

### 完遂 summary

- **6/6 guard candidates 全件 shadow stage 着地** (= candidate → shadow、5 段階 maturity 第 4 段)
- 1st guard (DUPLICATE-RESPONSIBILITY) = separate file (= sha256 比較の独立 algorithm)
- 残 5 patterns = 統合 guard (= docFailurePatternBaselineGuard、1 file で baseline 配列管理)
- shadow mode: 全件 warning emit のみ、exit 0 維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### 6 patterns articulate (= baseline 含む)

| pattern | baseline | guard | stage |
|---|---|---|---|
| DOC-FAIL-DUPLICATE-RESPONSIBILITY | 0 | docDuplicateResponsibilityGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE | 16 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-LOCATION-MISMATCH | 13 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-TEMPORAL-MIXING | 6 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-GENERATED-AS-MANUAL | 5 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-STALE-DESCRIPTION | 5 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |

### landed commits

| commit | scope |
|---|---|
| `f0bfc39` | Phase 1 = docDuplicateResponsibilityGuard.test.ts (= 1st guard、parallel with Sub-1) |
| `e5a6432` | guard-test-map 登録 + guardTestMapConsistencyGuard PASS |
| `2955b85` | Phase 2 = docFailurePatternBaselineGuard.test.ts (= 残 5 patterns 統合 guard、baseline 配列) |
| `92df686` | Phase 2 follow-up = generated sections drift refresh |
| `c1ebc00` | Phase 2 follow-up = js-yaml type declarations 不在対応 (= TS7016 解消) |
| `0c27afd` | Phase 3 整合 = obligation regen + health 再生成 |

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先 (= archive 移行前の最終 gate)

- 最終レビュー (user 承認) section の [x] flip 待ち (= 機能 Phase + AI 自己レビュー section は全 [x] 済)

### 中優先 (= user 承認後の archive プロセス)

- archive 移行 (= projects/active/aag-failure-pattern-guards/ → projects/completed/、Archive v2 形式)
- 親 umbrella `sub-project-map.md` の Sub-2 status を archive 反映

### 低優先 (= 別 program 候補、本 Sub-2 scope 外)

- **shadow → advisory 昇格判断** (= 6 guards の現 shadow stage → advisory stage、user 判断 gate)
- **advisory → hard gate 昇格判断** (= 別 program、taxonomy review window 経由)
- 新 failure pattern 観測時の auto-promote (= aag-scp Wave 2 mechanism が継続運用)

## 3. ハマりポイント

### 3.1. AI 単独で hard fail 化禁止 (AAG-SCP-DOC-LEARNING-002 整合)

shadow → advisory → hard fail は 5 段階 maturity の最終 3 段。各昇格は **user 判断 gate**。
AI 単独で advisory を hard gate に直接昇格させない。本 Sub-2 で landed したのは shadow stage
までで、advisory 昇格は別 session の user 判断を経る。

### 3.2. 統合 guard (= 1 file で 5 patterns) は意図的選択

docFailurePatternBaselineGuard は 1 file で 5 patterns を articulate。理由:
- 各 pattern の detection algorithm は document-failure-taxonomy.yaml に articulate 済 (= 共通入力)
- 5 separate guards は test 増殖 = C7 (= 同義 API 併存禁止) + G8 (= 責務分離) 違反候補
- baseline ratchet-down mechanism は 1 guard 内で pattern 別 articulate 可能

**ただし**: DUPLICATE-RESPONSIBILITY は別 file (= docDuplicateResponsibilityGuard) 。理由 =
detection algorithm が sha256 byte-comparison で他 5 patterns (= text pattern matching) と
**入力源 + 計算 cost が異なる** ため責務分離が articulate 価値あり。

### 3.3. baseline は **増加方向のみ** hard fail (= ratchet-down)

shadow mode でも、baseline 増加 (= 新規違反) は warning emit する。baseline 減少 (= 既存違反
cleanup) は automatic に accept。baseline value は test code の constant、減少時は manual
update が必要 (= 既存違反 cleanup PR で baseline 同時 update)。

### 3.4. js-yaml は require() interop (= TS7016 history)

docFailurePatternBaselineGuard は js-yaml で YAML parse。Sub-2 sub-PR 2 landing 時に
TS7016 (= js-yaml type declarations 不在) が trigger、c1ebc00 で require() interop に rewrite
解消。将来 @types/js-yaml 追加 or vitest 環境 改善があれば import 文に戻せる。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `plan.md` | 不可侵原則 + Phase 1〜3 articulate |
| `checklist.md` | 全 Phase + AI 自己レビュー [x]、最終レビュー [ ] (= user 承認待ち) |
| `decision-audit.md` | ADR-FPG-* lineage (= 6 guards の articulate 判断記録) |
| `discovery-log.md` | scope 外発見の蓄積 (= js-yaml type interop 等) |
| `projectization.md` | AAG-COA 判定 (= Level 3 governance-hardening / requiresHumanApproval=true) |
| 親 umbrella `projects/active/aag-governance-ratchet-down/HANDOFF.md` | 共有 context |
| `projects/completed/aag-structural-control-plane/` | 前駆 program (= 6 guard candidates auto-promoted) |

### 本 Sub-2 で landed deliverables

| 成果物 | パス |
|---|---|
| 1st guard | `app/src/test/guards/docDuplicateResponsibilityGuard.test.ts` |
| 統合 guard | `app/src/test/guards/docFailurePatternBaselineGuard.test.ts` |
| guard registry | `references/03-implementation/guard-test-map.md` (= 2 entries 追加) |
| generated report | `references/04-tracking/generated/document-failure-taxonomy.generated.md` |

## 5. 後任者向け checklist

archive 移行前に以下を確認:

1. [x] checklist.md の各 Phase section が全 [x] になっている
2. [x] AI 自己レビュー section の総 review 完了 (= 不可侵原則違反 0 / 歪み 0 / 潜在バグ 0)
3. [ ] 最終レビュー (user 承認) section の user 判断完了 + [x] flip
4. [ ] archive 移行手順実行 (= Archive v2 形式)
5. [ ] 親 umbrella sub-project-map.md の Sub-2 status update (= active → archived)
6. [ ] 6 guards の advisory 昇格判断 = 別 program candidate (= user gate)
