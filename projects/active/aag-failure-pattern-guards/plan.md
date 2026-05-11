# plan — aag-failure-pattern-guards

> 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= Sub-2、最 leverage 高)
> 親 program: `projects/completed/aag-structural-control-plane/` (= Wave 2 / Phase 2.5 で
> document-failure-taxonomy articulate、6 guard candidates auto-promoted)

## 不可侵原則

1. **AI 単独で hard fail 化しない** — 5 段階 maturity progression (= observed → pattern-articulated
   → guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory) を経る。advisory
   → hard gate 昇格は user 判断 gate (= AAG-SCP-DOC-LEARNING-002 整合)。Sub-2 scope は
   guardrail-shadow stage 着地まで。
2. **新 failure pattern 追加しない** — Sub-2 は **既 articulate 済 6 patterns** の guard 化のみ。
   新 pattern 観測は aag-scp Wave 2 の Reading Pass / Failure Loop で auto-promote される構造、
   本 Sub-2 で手動 articulate しない。
3. **baseline ratchet-down 厳守** — 各 guard の baseline は **観測時点の count** で fix
   (= 増加禁止)。新規違反は warning emit のみ (= shadow mode)、既存違反は historical な
   ratchet-down 対象として保持。

## Phase 構造

### Phase 1: 1st guard (DOC-FAIL-DUPLICATE-RESPONSIBILITY)

- 6 guard candidates 中、最も検出 algorithm が articulate されている pattern (= byte-identical
  template duplicates) を 1st guard として実装
- detection: `projects/active/<id>/` vs `projects/_template/` の sha256 比較
- baseline = 0 (= aag-scp Wave 3 sub-PR 5 で taxonomy-v2 8 duplicates cleanup 完了済)
- shadow mode: warning emit のみ、exit 0 維持

### Phase 2: 残 5 patterns batch articulate

5 patterns (= PROJECT-CONTENT-IN-REFERENCE / LOCATION-MISMATCH / TEMPORAL-MIXING /
GENERATED-AS-MANUAL / STALE-DESCRIPTION) を 1 統合 guard (= docFailurePatternBaselineGuard) で
batch articulate。各 pattern の baseline は aag-scp Wave 2 で articulate 済 observation 数を採用。

理由 (= 1 guard 採用):
- 各 pattern の detection algorithm は document-failure-taxonomy.yaml で articulate 済
- 6 separate guards は test file 増殖 = aag-scp の C7 (= 同義 API 併存禁止) 違反候補
- baseline ratchet-down mechanism は 1 guard 内で pattern 別 articulate 可能

### Phase 3: guard-test-map + guardTestMapConsistencyGuard 整合

- 6 patterns guard を guard-test-map.md に articulate (= 既存 guard registry への登録)
- guardTestMapConsistencyGuard PASS 確認 (= 登録漏れ検出)
- AR-DOC-FAIL-* rule entry を base-rules.ts に articulate (= 6 rule × SemanticTraceBinding pair)

## やってはいけないこと

- 6 separate guard 実装 → test 増殖 + 1 機能複数 file 違反 (C7 / G8 整合性)
- 新 failure pattern を手動 articulate → Reading Pass / Failure Loop auto-promote 経路を bypass
- baseline 0 強制 → 既存違反の急速 cleanup は scope 外 (= ratchet-down は long-term 圧)
- advisory → hard gate 直接昇格 → AAG-SCP-DOC-LEARNING-002 違反

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/test/guards/docDuplicateResponsibilityGuard.test.ts` | 1st guard (= Phase 1 deliverable) |
| `app/src/test/guards/docFailurePatternBaselineGuard.test.ts` | 残 5 patterns 統合 guard (= Phase 2 deliverable) |
| `docs/contracts/src/docs/document-failure-taxonomy.yaml` | 6 pattern articulate 正本 (= aag-scp Wave 2 articulate 済) |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | AR-DOC-FAIL-* rule entry (= consumer facade 経由 architectureRules.ts) |
| `references/03-implementation/guard-test-map.md` | 新 guard 登録 |
| `references/04-tracking/generated/document-failure-taxonomy.generated.md` | generated report |
