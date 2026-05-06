// doc_registry_test.go は Doc Registry Detector の unit test + fixture parity test。
//
// Phase 5 (= Doc Registry Detector) で landing する test:
//   - Unit test (= 合成 facts による direct 検証):
//       - empty entries → empty result
//       - all entries exist → empty result
//       - 1 missing path → 1 violation
//       - multiple missing → multiple violations (= 順序維持)
//   - Fixture parity test:
//       - doc-registry/fail-missing-path → 1 violation, Match=true
//
// 参照:
//   - tools/architecture-health/src/detectors/doc-registry-detector.ts (= TS source、parity reference)
//   - fixtures/aag/doc-registry/fail-missing-path (= 1 fixture)
package detectors

import (
	"encoding/json"
	"testing"

	"aag-engine/internal/contract"
	"aag-engine/internal/fixture"
)

// Unit: empty entries は empty result。
func TestDetectDocRegistryViolations_EmptyEntries(t *testing.T) {
	results, err := DetectDocRegistryViolations(DocRegistryFacts{
		Entries:       []DocRegistryEntry{},
		ExistingPaths: []string{},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d", len(results))
	}
}

// Unit: all entries exist → 0 violation。
func TestDetectDocRegistryViolations_AllExist(t *testing.T) {
	results, err := DetectDocRegistryViolations(DocRegistryFacts{
		Entries: []DocRegistryEntry{
			{Path: "references/01-foundation/exists.md", Label: "Exists"},
			{Path: "references/03-implementation/also-exists.md", Label: "Also Exists"},
		},
		ExistingPaths: []string{
			"references/01-foundation/exists.md",
			"references/03-implementation/also-exists.md",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d: %+v", len(results), results)
	}
}

// Unit: 1 missing → 1 violation、field-level check。
func TestDetectDocRegistryViolations_OneMissing(t *testing.T) {
	results, err := DetectDocRegistryViolations(DocRegistryFacts{
		Entries: []DocRegistryEntry{
			{Path: "references/01-foundation/exists.md", Label: "Exists Doc"},
			{Path: "references/03-implementation/missing.md", Label: "Missing Doc"},
		},
		ExistingPaths: []string{
			"references/01-foundation/exists.md",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	r := results[0]
	if r.RuleId != "AR-DOC-REGISTRY-D1" {
		t.Errorf("ruleId mismatch: %q", r.RuleId)
	}
	if r.DetectionType != "governance-ops" {
		t.Errorf("detectionType mismatch: %q", r.DetectionType)
	}
	if r.Severity != contract.SeverityGate {
		t.Errorf("severity mismatch: %q", r.Severity)
	}
	if r.SourceFile != "references/03-implementation/missing.md" {
		t.Errorf("sourceFile mismatch: %q", r.SourceFile)
	}
	if r.Evidence == nil || *r.Evidence != "registered label: Missing Doc" {
		t.Errorf("evidence mismatch: %v", r.Evidence)
	}
}

// Unit: multiple missing → multiple violations、順序維持 (= entries 順)。
func TestDetectDocRegistryViolations_MultipleMissing(t *testing.T) {
	results, err := DetectDocRegistryViolations(DocRegistryFacts{
		Entries: []DocRegistryEntry{
			{Path: "a/missing-1.md", Label: "First"},
			{Path: "b/exists.md", Label: "Exists"},
			{Path: "c/missing-2.md", Label: "Second"},
			{Path: "d/missing-3.md", Label: "Third"},
		},
		ExistingPaths: []string{
			"b/exists.md",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 violations, got %d", len(results))
	}

	// 順序 = entries の出現順 (= a/missing-1 → c/missing-2 → d/missing-3)
	wantPaths := []string{"a/missing-1.md", "c/missing-2.md", "d/missing-3.md"}
	for i, want := range wantPaths {
		if results[i].SourceFile != want {
			t.Errorf("results[%d].SourceFile = %q, want %q", i, results[i].SourceFile, want)
		}
	}
}

// Fixture parity: doc-registry/fail-missing-path → 1 violation、expected.json と Match=true。
func TestFixtureParity_DocRegistry_FailMissingPath(t *testing.T) {
	fx := loadFixture(t, "doc-registry/fail-missing-path")

	facts := parseDocRegistryFacts(t, fx.InputRaw)
	actual, err := DetectDocRegistryViolations(facts)
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

// parseDocRegistryFacts は fixture の InputRaw から `{"facts": {...}}` を抽出。
//
// fixture format:
//
//	{"facts": {"entries": [...], "existingPaths": [...]}}
func parseDocRegistryFacts(t *testing.T, raw json.RawMessage) DocRegistryFacts {
	t.Helper()
	var input struct {
		Facts DocRegistryFacts `json:"facts"`
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		t.Fatalf("parse input.json: %v", err)
	}
	return input.Facts
}
