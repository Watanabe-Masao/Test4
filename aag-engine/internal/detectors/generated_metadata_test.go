// generated_metadata_test.go は Generated Metadata Detector の unit test + fixture parity test。
//
// Phase 8 (= Generated Metadata Detector advisory) で landing する test:
//   - Unit test:
//       - empty files → empty result
//       - GENERATED marker (= 3 形式) のみ → 0 violation
//       - ISO timestamp のみ → 0 violation
//       - marker + timestamp 両方 → 0 violation
//       - marker / timestamp 両方欠落 → 1 violation
//       - 複数 file 混在 → 該当 file のみ violation
//   - Fixture parity test:
//       - generated/fail-stale-metadata → 1 violation, Match=true
//
// 参照:
//   - tools/architecture-health/src/detectors/generated-metadata-detector.ts (= TS source、parity reference)
//   - fixtures/aag/generated/fail-stale-metadata
package detectors

import (
	"encoding/json"
	"testing"

	"aag-engine/internal/contract"
	"aag-engine/internal/fixture"
)

// Unit: empty files は empty result。
func TestDetectGeneratedMetadataViolations_EmptyFiles(t *testing.T) {
	results, err := DetectGeneratedMetadataViolations(GeneratedMetadataFacts{
		Files: []GeneratedMetadataFile{},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d", len(results))
	}
}

// Unit: GENERATED marker 3 形式 (= markdown blockquote / HTML comment / section marker) のみ → 0 violation。
func TestDetectGeneratedMetadataViolations_MarkerVariants(t *testing.T) {
	cases := []struct {
		name    string
		content string
	}{
		{"markdown blockquote", "# Title\n\n> 生成: 2026-01-01\n\nbody"},
		{"HTML comment", "# Title\n\n<!-- GENERATED at 2026 -->\n\nbody"},
		{"section marker", "# Title\n\nGENERATED:START\n\nbody"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			results, err := DetectGeneratedMetadataViolations(GeneratedMetadataFacts{
				Files: []GeneratedMetadataFile{
					{Path: "test.generated.md", Content: tc.content},
				},
			})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(results) != 0 {
				t.Errorf("expected 0 violations for marker case %q, got %d", tc.name, len(results))
			}
		})
	}
}

// Unit: ISO timestamp のみ → 0 violation。
func TestDetectGeneratedMetadataViolations_TimestampOnly(t *testing.T) {
	results, err := DetectGeneratedMetadataViolations(GeneratedMetadataFacts{
		Files: []GeneratedMetadataFile{
			{Path: "ts-only.generated.md", Content: "# Title\n\nGenerated at 2026-05-05T10:30:45Z\n\nbody"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations for timestamp-only file, got %d", len(results))
	}
}

// Unit: marker + timestamp 両方 → 0 violation。
func TestDetectGeneratedMetadataViolations_BothPresent(t *testing.T) {
	results, err := DetectGeneratedMetadataViolations(GeneratedMetadataFacts{
		Files: []GeneratedMetadataFile{
			{Path: "both.generated.md", Content: "# Title\n\n> 生成: 2026-05-05T10:30:45Z\n\nbody"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations when both markers present, got %d", len(results))
	}
}

// Unit: marker / timestamp 両方欠落 → 1 violation。
func TestDetectGeneratedMetadataViolations_BothMissing(t *testing.T) {
	results, err := DetectGeneratedMetadataViolations(GeneratedMetadataFacts{
		Files: []GeneratedMetadataFile{
			{
				Path:    "orphan.generated.md",
				Content: "# Title\n\nNo markers here at all.\n\nbody",
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	r := results[0]
	if r.RuleId != "AR-GENERATED-METADATA-G2" {
		t.Errorf("ruleId mismatch: %q", r.RuleId)
	}
	if r.Severity != contract.SeverityGate {
		t.Errorf("severity mismatch: %q (= TS source と一致確認)", r.Severity)
	}
	if r.SourceFile != "orphan.generated.md" {
		t.Errorf("sourceFile mismatch: %q", r.SourceFile)
	}
	if r.Evidence == nil || *r.Evidence != "no GENERATED marker AND no ISO timestamp" {
		t.Errorf("evidence mismatch: %v", r.Evidence)
	}
}

// Unit: 複数 file 混在 → 該当 file のみ violation。
func TestDetectGeneratedMetadataViolations_MixedFiles(t *testing.T) {
	results, err := DetectGeneratedMetadataViolations(GeneratedMetadataFacts{
		Files: []GeneratedMetadataFile{
			{Path: "valid-1.generated.md", Content: "> 生成: 2026-01-01"},
			{Path: "orphan-a.generated.md", Content: "no markers"},
			{Path: "valid-2.generated.md", Content: "Time: 2026-05-05T10:30:45"},
			{Path: "orphan-b.generated.md", Content: "also no markers"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 violations (= orphan-a + orphan-b), got %d", len(results))
	}
	if results[0].SourceFile != "orphan-a.generated.md" {
		t.Errorf("results[0].SourceFile mismatch: %q", results[0].SourceFile)
	}
	if results[1].SourceFile != "orphan-b.generated.md" {
		t.Errorf("results[1].SourceFile mismatch: %q", results[1].SourceFile)
	}
}

// Fixture parity: generated/fail-stale-metadata → 1 violation, Match=true。
func TestFixtureParity_Generated_FailStaleMetadata(t *testing.T) {
	fx := loadFixture(t, "generated/fail-stale-metadata")

	facts := parseGeneratedMetadataFacts(t, fx.InputRaw)
	actual, err := DetectGeneratedMetadataViolations(facts)
	if err != nil {
		t.Fatalf("detector error: %v", err)
	}

	if len(actual) != 1 {
		t.Errorf("expected 1 violation, got %d: %+v", len(actual), actual)
	}

	diff := fixture.Compare(fx, actual)
	if !diff.Match {
		t.Errorf("fixture %q parity mismatch:\n  actual:   %+v\n  expected: %+v\n  missing: %+v\n  extra:   %+v",
			fx.Name, actual, fx.Expected, diff.Missing, diff.Extra)
	}
}

// parseGeneratedMetadataFacts は fixture の InputRaw から `{"facts": {files: [...]}}` を抽出。
func parseGeneratedMetadataFacts(t *testing.T, raw json.RawMessage) GeneratedMetadataFacts {
	t.Helper()
	var input struct {
		Facts GeneratedMetadataFacts `json:"facts"`
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		t.Fatalf("parse input.json: %v", err)
	}
	return input.Facts
}
