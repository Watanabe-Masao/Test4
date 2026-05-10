# Artifact Coverage Matrix (machine view)

> 機械生成。手で編集しない。authoring source = `docs/contracts/src/governance/artifact-coverage.yaml`、
> generator = `tools/governance/build-artifact-coverage.mjs`。
> Wave 3 advisory: 違反検出は warning のみ、CI fail なし。

- 生成: 2026-05-10T12:18:41.830Z
- generatedAtSha: `1e6a75cf9f61510b317adda07f91d453b7836cfb`
- schemaVersion: `artifact-coverage-v1`
- stage: `pre-articulate`

## Summary

- Total rules: 17
- Total tracked files (= git ls-files): 3704
- Managed files: 511
- **Unmanaged files: 3193** (= 86.2%)

## By Category

| category | count |
|---|---|
| `declared` | 63 |
| `generated` | 49 |
| `archived` | 392 |
| `external` | 0 |
| `temporary-with-expiry` | 0 |
| `ignored-with-reason` | 7 |
| `unmanaged` | 3193 |

## Unmanaged by Zone

| zone | count |
|---|---|
| `app/` | 2318 |
| `references/` | 331 |
| `wasm/` | 163 |
| `aag-engine/` | 90 |
| `projects/` | 88 |
| `tools/` | 61 |
| `fixtures/` | 49 |
| `app-domain/` | 26 |
| `roles/` | 24 |
| `aag/` | 16 |
| `docs/` | 6 |
| `.claude/` | 5 |
| `workers/` | 4 |
| `.coderabbit.yaml/` | 1 |
| `.gitignore/` | 1 |
| `.nvmrc/` | 1 |
| `CHANGELOG.md/` | 1 |
| `CLAUDE.md/` | 1 |
| `CONTRIBUTING.md/` | 1 |
| `CURRENT_PROJECT.md/` | 1 |
| `README.md/` | 1 |
| `go.work/` | 1 |
| `package-lock.json/` | 1 |
| `package.json/` | 1 |
| `scripts/` | 1 |

## Unmanaged Files (first 50 + last 50 sample)

> Full list (3193) in JSON output.

- `.claude/hooks/session-start.sh`
- `.claude/hooks/user-prompt-submit.sh`
- `.claude/manifest.json`
- `.claude/plans/next-session-plan.md`
- `.claude/settings.json`
- `.coderabbit.yaml`
- `.gitignore`
- `.nvmrc`
- `CHANGELOG.md`
- `CLAUDE.md`
- `CONTRIBUTING.md`
- `CURRENT_PROJECT.md`
- `README.md`
- `aag-engine/cmd/aag/command_bootstrap.go`
- `aag-engine/cmd/aag/command_chaos.go`
- `aag-engine/cmd/aag/command_clean.go`
- `aag-engine/cmd/aag/command_comments.go`
- `aag-engine/cmd/aag/command_describe.go`
- `aag-engine/cmd/aag/command_docs.go`
- `aag-engine/cmd/aag/command_fixtures.go`
- `aag-engine/cmd/aag/command_index.go`
- `aag-engine/cmd/aag/command_introspect.go`
- `aag-engine/cmd/aag/command_navigation.go`
- `aag-engine/cmd/aag/command_obligation.go`
- `aag-engine/cmd/aag/command_project.go`
- `aag-engine/cmd/aag/command_repair.go`
- `aag-engine/cmd/aag/command_selfcheck.go`
- `aag-engine/cmd/aag/command_shadow.go`
- `aag-engine/cmd/aag/command_stats.go`
- `aag-engine/cmd/aag/command_task.go`
- `aag-engine/cmd/aag/command_validate.go`
- `aag-engine/cmd/aag/command_wrap.go`
- `aag-engine/cmd/aag/main.go`
- `aag-engine/cmd/aag/main_test.go`
- `aag-engine/cmd/aag/usage.go`
- `aag-engine/go.mod`
- `aag-engine/internal/aagindex/aagindex.go`
- `aag-engine/internal/aagindex/aagindex_test.go`
- `aag-engine/internal/bootstrap/bootstrap.go`
- `aag-engine/internal/bootstrap/bootstrap_test.go`
- `aag-engine/internal/chaos/chaos.go`
- `aag-engine/internal/chaos/chaos_test.go`
- `aag-engine/internal/cleanliness/clean.go`
- `aag-engine/internal/cleanliness/clean_test.go`
- `aag-engine/internal/cleanliness/docs_placement.go`
- `aag-engine/internal/cleanliness/docs_placement_test.go`
- `aag-engine/internal/commentscan/comments.go`
- `aag-engine/internal/commentscan/comments_test.go`
- `aag-engine/internal/contract/detector_result.go`
- `aag-engine/internal/contract/detector_result_test.go`
- _...(3093 more)..._
- `wasm/pi-value/tests/invariants.rs`
- `wasm/pin-intervals/Cargo.lock`
- `wasm/pin-intervals/Cargo.toml`
- `wasm/pin-intervals/src/lib.rs`
- `wasm/pin-intervals/src/pin_intervals.rs`
- `wasm/pin-intervals/src/utils.rs`
- `wasm/pin-intervals/tests/cross_validation.rs`
- `wasm/pin-intervals/tests/edge_cases.rs`
- `wasm/pin-intervals/tests/invariants.rs`
- `wasm/remaining-budget-rate/Cargo.lock`
- `wasm/remaining-budget-rate/Cargo.toml`
- `wasm/remaining-budget-rate/src/lib.rs`
- `wasm/remaining-budget-rate/src/remaining_budget_rate.rs`
- `wasm/remaining-budget-rate/src/utils.rs`
- `wasm/remaining-budget-rate/tests/cross_validation.rs`
- `wasm/remaining-budget-rate/tests/edge_cases.rs`
- `wasm/remaining-budget-rate/tests/invariants.rs`
- `wasm/sensitivity/Cargo.lock`
- `wasm/sensitivity/Cargo.toml`
- `wasm/sensitivity/src/lib.rs`
- `wasm/sensitivity/src/sensitivity.rs`
- `wasm/sensitivity/src/utils.rs`
- `wasm/sensitivity/tests/cross_validation.rs`
- `wasm/sensitivity/tests/edge_cases.rs`
- `wasm/sensitivity/tests/invariants.rs`
- `wasm/statistics/Cargo.lock`
- `wasm/statistics/Cargo.toml`
- `wasm/statistics/src/correlation.rs`
- `wasm/statistics/src/dow_gap.rs`
- `wasm/statistics/src/lib.rs`
- `wasm/statistics/src/sensitivity.rs`
- `wasm/time-slot/.gitignore`
- `wasm/time-slot/Cargo.lock`
- `wasm/time-slot/Cargo.toml`
- `wasm/time-slot/src/core_time.rs`
- `wasm/time-slot/src/lib.rs`
- `wasm/time-slot/src/turnaround.rs`
- `wasm/time-slot/tests/invariants.rs`
- `wasm/trend-analysis/Cargo.lock`
- `wasm/trend-analysis/Cargo.toml`
- `wasm/trend-analysis/src/lib.rs`
- `wasm/trend-analysis/src/trend_analysis.rs`
- `wasm/trend-analysis/src/utils.rs`
- `wasm/trend-analysis/tests/cross_validation.rs`
- `wasm/trend-analysis/tests/edge_cases.rs`
- `wasm/trend-analysis/tests/invariants.rs`
- `workers/jma-proxy/package.json`
- `workers/jma-proxy/src/index.ts`
- `workers/jma-proxy/tsconfig.json`
- `workers/jma-proxy/wrangler.toml`
