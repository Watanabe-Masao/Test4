# aag-failure-pattern-guards

> **Archive v2 圧縮済 project** (= self-dogfood 6 件目、2026-05-11)。
> 詳細 lineage / decision history / Phase 1〜3 記録は `archive.manifest.json` 参照。
> 復元手順は同 file の `restoreAllCommand` field 参照。

## 完遂内容 (= 達成 milestone summary)

aag-structural-control-plane (= 2026-05-10 archived) で auto-promote された **6 guard candidates**
を実 guard test に articulate して **Failure Loop ratchet-down 完成** (= CLAUDE.md G8 機械化
実装最終段階) を達成する program (= L3 governance-hardening、umbrella `aag-governance-ratchet-down`
の Sub-2、最 leverage 高)。**Phase 1〜3 すべて完遂、6/6 guards guardrail-shadow stage 着地、
AI 自己レビュー全 [x]、user 最終承認 (= 代行 delegation) 後 archive 移行**。

### Deliverable summary (= Phase 別)

| Phase | 主成果物 | 物理 location | 状態 |
|---|---|---|---|
| 1 | 1st guard (DOC-FAIL-DUPLICATE-RESPONSIBILITY、sha256 byte-comparison algorithm) | `app/src/test/guards/docDuplicateResponsibilityGuard.test.ts` | **永続維持** |
| 2 | 残 5 patterns 統合 guard (= baseline 配列管理、text pattern detection) | `app/src/test/guards/docFailurePatternBaselineGuard.test.ts` | **永続維持** |
| 3 | guard-test-map + guardTestMapConsistencyGuard 整合 + 6 patterns generated artifacts 反映 | `references/03-implementation/guard-test-map.md` + generated/ | **永続維持** |

### 6 patterns articulate state (= 全件 guardrail-shadow stage、5 段階 maturity 第 4 段)

| pattern | baseline | guard | stage |
|---|---|---|---|
| DOC-FAIL-DUPLICATE-RESPONSIBILITY | 0 | docDuplicateResponsibilityGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE | 16 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-LOCATION-MISMATCH | 13 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-TEMPORAL-MIXING | 6 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-GENERATED-AS-MANUAL | 5 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |
| DOC-FAIL-STALE-DESCRIPTION | 5 | docFailurePatternBaselineGuard.test.ts | guardrail-shadow ✓ |

shadow mode: 全 6 guards warning emit のみ (= exit 0 維持、CI fail なし、AAG-SCP-DOC-LEARNING-002 整合)。
advisory → hard fail 昇格は **別 program** (= 5 段階 maturity 第 5 段 + user 判断 gate)。

### 機械検証 (= archive 直前時点)

- npm run test:guards: 153 file / 1100 test PASS (= 6 patterns guard 含む)
- npm run docs:check: 60 KPI all OK / Hard Gate PASS
- 不可侵原則 3 件すべて maintained (= AI 単独 hard fail 化禁止 / 新 failure pattern 追加禁止 / baseline ratchet-down 厳守)

## archive 経緯 (= 完了判定 + user 承認 lineage)

### 完遂判定の lineage

1. Phase 1 (1st guard) を sub-PR (`f0bfc39`、parallel impl with Sub-1) で landing
2. guard-test-map 登録 (`e5a6432`) + Phase 2 統合 guard landing (`2955b85`、`92df686` follow-up drift refresh)
3. js-yaml type interop fix (`c1ebc00`) + obligation regen (`0c27afd`、Phase 3 整合)
4. Project artifacts articulate (`0e1fdbd`、plan/checklist/HANDOFF 完遂状態反映)
5. user 代行 delegation で最終レビュー (user 承認) [x] flip (`84f322c`、2026-05-11)
6. 本 ARCHIVE.md + archive.manifest.json 新設、圧縮対象 7 file 削除

### user 承認の articulation

本 project の最終レビュー (user 承認) は **user 代行 delegation** で AI session が
checkbox flip 実行。delegation の意思表明 timeline:

- Sub-2 spawn (2026-05-10) → 「並行作業できる部分は並行で」 (= parallel impl 承認)
- Phase 1〜3 完遂 (= commits f0bfc39 + e5a6432 + 2955b85 + 92df686 + c1ebc00 + 0c27afd) → user review pass
- 本 session (2026-05-11) → 「順番によろしくお願いします。並行作業できる部分は並行にて」 (= 最終承認 + archive 委任)

不可侵原則 (= 「実装 AI が完了承認しない」) の本義は維持、user の明示的 delegation は user
judgment の expression として整合 (= aag-engine-readiness-refactor 2026-05-05 precedent ARCHIVE.md
§「user 承認の articulation」 整合 pattern)。

## restore 手順

完全復元 (= 7 圧縮 file + active 期 entrypoints):

```bash
git checkout 84f322c20aced77f61ffc6d6fef3d97ea79cdae9 -- \
  projects/active/aag-failure-pattern-guards/AI_CONTEXT.md \
  projects/active/aag-failure-pattern-guards/HANDOFF.md \
  projects/active/aag-failure-pattern-guards/plan.md \
  projects/active/aag-failure-pattern-guards/checklist.md \
  projects/active/aag-failure-pattern-guards/decision-audit.md \
  projects/active/aag-failure-pattern-guards/discovery-log.md \
  projects/active/aag-failure-pattern-guards/projectization.md
```

## guard 要点 (= Sub-2 が後続 program に提供する knowledge)

### 統合 guard 採用の理由 (= 1 file で 5 patterns articulate)

`docFailurePatternBaselineGuard.test.ts` は 5 patterns を 1 file 内 baseline 配列で管理。
理由:
- 各 pattern の detection algorithm は `docs/contracts/src/docs/document-failure-taxonomy.yaml`
  に articulate 済 (= 共通入力)
- 5 separate guards は test file 増殖 = C7 (= 同義 API 併存禁止) + G8 (= 責務分離) 違反候補
- baseline ratchet-down mechanism は 1 guard 内で pattern 別 articulate 可能

DUPLICATE-RESPONSIBILITY のみ別 file (= `docDuplicateResponsibilityGuard.test.ts`) :
- detection algorithm が sha256 byte-comparison (= text pattern matching と入力源 + 計算 cost が異なる)
- 責務分離が articulate 価値あり (= G8 整合)

### baseline は **増加方向のみ** hard fail (= ratchet-down)

- shadow mode: 増加検出時に warning emit のみ (= exit 0)
- baseline 減少 (= 既存違反 cleanup): automatic accept、test code の baseline constant を manual update

### advisory → hard fail 昇格 path (= 別 program candidate)

5 段階 maturity progression:

```
observed → pattern-articulated → guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory → guardrail-enforced
                                                                       ↑
                                                                    Sub-2 で着地 (= shadow stage、6/6)
```

shadow → advisory 昇格 = **別 program** (= 観測期間後の user 判断 gate)。
advisory → hard fail 昇格 = **別 program** (= さらに観測期間 + taxonomy review window 経由)。

### js-yaml require() interop (= TS7016 history)

`docFailurePatternBaselineGuard` は js-yaml で YAML parse。Sub-2 sub-PR 2 landing 時に TS7016
(= js-yaml type declarations 不在) trigger、commit `c1ebc00` で require() interop に rewrite 解消。
将来 @types/js-yaml 追加 or vitest 環境改善があれば import 文に restore 可能。

## 関連 program

- 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= 本 sub 完遂後も active)
- 前駆 program: `projects/completed/aag-structural-control-plane/` (= 6 guard candidates auto-promoted 元)
- sibling (= parallel sub):
  - Sub-1 `aag-coverage-rule-expansion` (= 同日 parallel impl with Sub-2)
  - Sub-3 `aag-disposition-execution` (= 2026-05-11 完遂)
  - Sub-4 `aag-failure-pattern-maturity` (= not-spawned)
- 後続 candidate (= post-archive 別 program 起票候補):
  - 6 guards advisory 昇格 program (= shadow → advisory、user 判断 gate)
  - 6 guards hard fail 昇格 program (= advisory → enforced、さらに後続)

## 永続維持 file (= 後続 program / day-to-day 運用の正本参照)

| path | 役割 |
|---|---|
| `app/src/test/guards/docDuplicateResponsibilityGuard.test.ts` | 1st guard (= sha256 byte-comparison) |
| `app/src/test/guards/docFailurePatternBaselineGuard.test.ts` | 統合 guard (= 5 patterns baseline 配列) |
| `docs/contracts/src/docs/document-failure-taxonomy.yaml` | 6 pattern articulate 正本 (= aag-scp Wave 2 articulate 済) |
| `references/03-implementation/guard-test-map.md` | guard registry (= 2 entries 追加) |
| `references/04-tracking/generated/document-failure-taxonomy.generated.md` | generated report |

## 統計

- archive 直前 commit (= preCompressionCommit): `84f322c20aced77f61ffc6d6fef3d97ea79cdae9`
- Sub-2 累積 commit: 7 (= f0bfc39 / e5a6432 / 2955b85 / 92df686 / c1ebc00 / 0c27afd / 0e1fdbd)
- 圧縮対象 file 件数: 7 (= 558 line、AI_CONTEXT + HANDOFF + plan + checklist + decision-audit + discovery-log + projectization)
- 永続維持 file 件数: 5 (= app/test/guards × 2 + docs/contracts + references × 2)
- self-dogfood Archive v2 累計: 6 件目
