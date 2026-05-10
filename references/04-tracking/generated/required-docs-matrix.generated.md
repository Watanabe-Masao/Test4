# Required Docs Matrix (machine view)

> 機械生成。手で編集しない。authoring source = `docs/contracts/src/docs/required-docs-matrix.yaml`、
> generator = `tools/governance/build-required-docs-matrix.mjs`。
> Wave 3 advisory: 違反検出は warning のみ、CI fail なし。

- 生成: 2026-05-10T12:09:20.684Z
- generatedAtSha: `a1984d3584c8ec1f7022a0ada0fd2d54d044dfbf`
- schemaVersion: `required-docs-matrix-v1`
- stage: `pre-articulate`

## Summary

- Total rules: 5
- Total targets enumerated: 46
- Total required docs (across all targets): 46
- Total optional docs: 36
- **Total missing required docs (advisory): 0**
- Unknown docKinds in rules (= ai-doc-template-rules unregistered): 0

## `active-project`

**rationale**: project-checklist-governance §3 + projectization-policy.md で active project の必須セット 6 が articulate されている (= AI_CONTEXT + HANDOFF + plan + checklist + projectization + config)。 projectization.md は collection mode (= kind: collection) では不要 (= projectization-policy §11 + PZ-1 guard exception 整合) のため optional articulate (= advisory only)。 projectizationPolicyGuard PZ-1 + PZ-13 + PZ-14 が機械検証済 (= 既存 guard との重複 articulate、 本 matrix は cross-doc visibility 提供)。

- pathPattern: `projects/active/<id>/`
- targetCount: 6
- exceptionCount: 0
- requiredDocsCount (per target × N): 30
- optionalDocsCount: 6
- **missingRequiredCount: 0**

## `feature-slice`

**rationale**: app/src/features/ 配下の縦スライス (= 13 features articulate 済、CLAUDE.md project structure 整合) は将来 feature-contract doc を要求する candidate。Phase 7 では README.md を optional articulate (= 既存 13 features に大半 README.md なし、advisory のみ)。Wave 3 後段の別 sub-PR で 'feature-contract' doc kind の追加 + 全 feature 必須化を判断。

- pathPattern: `app/src/features/<feature>/`
- targetCount: 13
- exceptionCount: 1
- requiredDocsCount (per target × N): 0
- optionalDocsCount: 12
- **missingRequiredCount: 0**

## `wasm-module`

**rationale**: wasm/ 配下の各 module (= ~10+ modules articulate 済) は calculation-contract + parity-policy doc の候補。Phase 7 では README.md を optional articulate (= 既存 module の README 状態未確認、 advisory のみ)。Wave 3 後段の別 sub-PR で 'wasm-module-contract' doc kind の追加 + 必須化判断。

- pathPattern: `wasm/<module>/`
- targetCount: 18
- exceptionCount: 0
- requiredDocsCount (per target × N): 0
- optionalDocsCount: 18
- **missingRequiredCount: 0**

## `roles-role`

**rationale**: CLAUDE.md 4 層 governance model + Wave 2 Reading Pass Batch 16 articulate 済: 各 role は ROLE.md (Identity) + SKILL.md (Execution) の pair で governance contract を構成。pair の片方 だけでは不完全。本 matrix で機械的整合性 articulate。

- pathPattern: `roles/<tier>/<role>/`
- targetCount: 6
- exceptionCount: 1
- requiredDocsCount (per target × N): 10
- optionalDocsCount: 0
- **missingRequiredCount: 0**

## `roles-specialist`

**rationale**: roles/line/specialist/ は line tier の sub-tier (= duckdb-specialist / explanation-steward / invariant-guardian の 3 specialist roles)。roles-role rule は <tier>/<role>/ の 2 階層 pattern で specialist を role と誤検出するため、specialist 用に独立 rule articulate。各 specialist role も ROLE.md + SKILL.md pair で governance contract を構成 (= roles-role と同 governance)。

- pathPattern: `roles/line/specialist/<role>/`
- targetCount: 3
- exceptionCount: 0
- requiredDocsCount (per target × N): 6
- optionalDocsCount: 0
- **missingRequiredCount: 0**
