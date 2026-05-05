// Package shadow provides the AAG Engine shadow mode runner.
//
// 位置付け (= aag-engine-go-mvp project Phase 9 deliverable):
//   - 5 detector × 8 fixture = 40 parity 検証点を 1 回で集約 dispatch
//   - 各 fixture に対して appropriate detector を run、expected.json と Match を articulate
//   - CI advisory (= Phase 10) で本 runner を non-blocking 実行する base
//
// Shadow mode の primary success metric (= readiness refactor § 6.1 articulate):
//   - **fixture corpus parity** (= 主軸): 5 detector × 8 fixture で TS expected と Match=true
//   - 実 repo 状態 parity (= 補助): 時系列で変化するため deterministic でない
//
// 不可侵原則:
//   - 1 (= validator のみ): repo / fixture を read-only で評価、book/write 0 件
//   - 9 (= Go engine が source of truth にならない): fixture 正本 = repo の fixtures/aag/
//   - 10 (= fixture parity 必須): 本 package が parity 主軸 metric の集約場所
//
// Dispatch 設計:
//   fixture name の prefix (= "archive-v2/" / "doc-registry/" / "generated/" /
//   "project-lifecycle/" / "schema-validation/") から detector を route。
//   各 detector の facts shape を parse して run、Diff を集約。
//
// 参照:
//   - tools/architecture-health/src/detectors/README.md (= 4 層 layered model)
//   - app/src/test/guards/detectorResultModuleGuard.test.ts §「fixture corpus parity」 (= TS 側 mirror)
//   - projects/active/aag-engine-go-mvp/plan.md §Phase 9
package shadow

import (
	"encoding/json"
	"fmt"
	"strings"

	"aag-engine/internal/contract"
	"aag-engine/internal/detectors"
	"aag-engine/internal/fixture"
)

// FixtureResult は単一 fixture × detector の parity 結果。
type FixtureResult struct {
	// FixtureName は fixture identifier (= "archive-v2/pass-minimal" 等)。
	FixtureName string `json:"fixtureName"`

	// DetectorName は dispatch された detector の名前 (= "archive-manifest" 等)。
	DetectorName string `json:"detectorName"`

	// Match は actual と expected の deep equality 結果。
	Match bool `json:"match"`

	// ExpectedCount は expected.json 内の DetectorResult 件数。
	ExpectedCount int `json:"expectedCount"`

	// ActualCount は detector が emit した DetectorResult 件数。
	ActualCount int `json:"actualCount"`

	// Missing は expected にあって actual にないもの (= 未検出)。
	Missing []contract.DetectorResult `json:"missing,omitempty"`

	// Extra は actual にあって expected にないもの (= 過検出)。
	Extra []contract.DetectorResult `json:"extra,omitempty"`
}

// Summary は shadow mode 全体の集約 summary。
type Summary struct {
	// Total は処理した fixture 数。
	Total int `json:"total"`

	// Matched は parity Match=true の fixture 数。
	Matched int `json:"matched"`

	// Mismatched は parity Match=false の fixture 数。
	Mismatched int `json:"mismatched"`

	// Skipped は dispatch 不能な fixture 数 (= 想定外 prefix 等)。
	Skipped int `json:"skipped"`

	// Results は per-fixture 詳細結果。
	Results []FixtureResult `json:"results"`
}

// AllMatched returns true iff Total > 0 && Total == Matched && Skipped == 0。
func (s Summary) AllMatched() bool {
	return s.Total > 0 && s.Total == s.Matched && s.Skipped == 0
}

// Run は repo root を受け取り、5 detector × 8 fixture を全 dispatch、Summary を返す。
//
// Returns:
//   - Summary: parity 集約結果 (= primary metric for CI advisory / hard gate promotion)
//   - error: fixture load / detector internal error
func Run(repoRoot string) (Summary, error) {
	fixtures, err := fixture.LoadAll(repoRoot)
	if err != nil {
		return Summary{}, fmt.Errorf("shadow.Run: fixture load failed: %w", err)
	}

	summary := Summary{
		Total:   len(fixtures),
		Results: make([]FixtureResult, 0, len(fixtures)),
	}

	for _, fx := range fixtures {
		fr, err := dispatch(fx)
		if err != nil {
			return Summary{}, fmt.Errorf("shadow.Run: dispatch %q: %w", fx.Name, err)
		}
		summary.Results = append(summary.Results, fr)

		switch {
		case fr.DetectorName == "":
			summary.Skipped++
		case fr.Match:
			summary.Matched++
		default:
			summary.Mismatched++
		}
	}

	return summary, nil
}

// dispatch は fixture name prefix から detector を route、parity 結果を返す。
//
// 想定外 prefix の場合は DetectorName="" の FixtureResult を返す (= Skipped として集約)。
func dispatch(fx fixture.Fixture) (FixtureResult, error) {
	switch {
	case strings.HasPrefix(fx.Name, "archive-v2/"):
		return runArchiveManifest(fx)
	case strings.HasPrefix(fx.Name, "doc-registry/"):
		return runDocRegistry(fx)
	case strings.HasPrefix(fx.Name, "generated/"):
		return runGeneratedMetadata(fx)
	case strings.HasPrefix(fx.Name, "project-lifecycle/"):
		return runProjectLifecycle(fx)
	case strings.HasPrefix(fx.Name, "schema-validation/"):
		return runSchemaValidation(fx)
	default:
		// 想定外 prefix → Skipped として articulate
		return FixtureResult{
			FixtureName:   fx.Name,
			DetectorName:  "",
			Match:         false,
			ExpectedCount: fx.ExpectedCount(),
			ActualCount:   0,
		}, nil
	}
}

// runArchiveManifest は archive-v2/* fixture を archive-manifest detector で評価。
func runArchiveManifest(fx fixture.Fixture) (FixtureResult, error) {
	var input struct {
		Facts []detectors.ArchiveManifestFacts `json:"facts"`
	}
	if err := json.Unmarshal(fx.InputRaw, &input); err != nil {
		return FixtureResult{}, fmt.Errorf("parse archive-manifest input: %w", err)
	}
	actual, err := detectors.DetectArchiveManifestViolations(input.Facts)
	if err != nil {
		return FixtureResult{}, fmt.Errorf("archive-manifest detector: %w", err)
	}
	return makeFixtureResult(fx, "archive-manifest", actual), nil
}

// runDocRegistry は doc-registry/* fixture を doc-registry detector で評価。
func runDocRegistry(fx fixture.Fixture) (FixtureResult, error) {
	var input struct {
		Facts detectors.DocRegistryFacts `json:"facts"`
	}
	if err := json.Unmarshal(fx.InputRaw, &input); err != nil {
		return FixtureResult{}, fmt.Errorf("parse doc-registry input: %w", err)
	}
	actual, err := detectors.DetectDocRegistryViolations(input.Facts)
	if err != nil {
		return FixtureResult{}, fmt.Errorf("doc-registry detector: %w", err)
	}
	return makeFixtureResult(fx, "doc-registry", actual), nil
}

// runGeneratedMetadata は generated/* fixture を generated-metadata detector で評価。
func runGeneratedMetadata(fx fixture.Fixture) (FixtureResult, error) {
	var input struct {
		Facts detectors.GeneratedMetadataFacts `json:"facts"`
	}
	if err := json.Unmarshal(fx.InputRaw, &input); err != nil {
		return FixtureResult{}, fmt.Errorf("parse generated-metadata input: %w", err)
	}
	actual, err := detectors.DetectGeneratedMetadataViolations(input.Facts)
	if err != nil {
		return FixtureResult{}, fmt.Errorf("generated-metadata detector: %w", err)
	}
	return makeFixtureResult(fx, "generated-metadata", actual), nil
}

// runProjectLifecycle は project-lifecycle/* fixture を project-lifecycle detector で評価。
func runProjectLifecycle(fx fixture.Fixture) (FixtureResult, error) {
	var input struct {
		Facts detectors.ProjectLifecycleFacts `json:"facts"`
	}
	if err := json.Unmarshal(fx.InputRaw, &input); err != nil {
		return FixtureResult{}, fmt.Errorf("parse project-lifecycle input: %w", err)
	}
	actual, err := detectors.DetectProjectLifecycleViolations(input.Facts)
	if err != nil {
		return FixtureResult{}, fmt.Errorf("project-lifecycle detector: %w", err)
	}
	return makeFixtureResult(fx, "project-lifecycle", actual), nil
}

// runSchemaValidation は schema-validation/* fixture を schema-validation detector で評価。
func runSchemaValidation(fx fixture.Fixture) (FixtureResult, error) {
	var input struct {
		Facts detectors.SchemaValidationFacts `json:"facts"`
	}
	if err := json.Unmarshal(fx.InputRaw, &input); err != nil {
		return FixtureResult{}, fmt.Errorf("parse schema-validation input: %w", err)
	}
	actual, err := detectors.DetectSchemaValidationViolations(input.Facts)
	if err != nil {
		return FixtureResult{}, fmt.Errorf("schema-validation detector: %w", err)
	}
	return makeFixtureResult(fx, "schema-validation", actual), nil
}

// makeFixtureResult は actual と fixture.Expected を比較して FixtureResult を articulate。
func makeFixtureResult(fx fixture.Fixture, detectorName string, actual []contract.DetectorResult) FixtureResult {
	diff := fixture.Compare(fx, actual)
	return FixtureResult{
		FixtureName:   fx.Name,
		DetectorName:  detectorName,
		Match:         diff.Match,
		ExpectedCount: len(fx.Expected),
		ActualCount:   len(actual),
		Missing:       diff.Missing,
		Extra:         diff.Extra,
	}
}
