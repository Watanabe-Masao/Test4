// archive_manifest_test.go は Archive Manifest Detector の unit test + fixture parity test。
//
// Phase 4 (= Archive Manifest Detector) で landing する test:
//   - Unit test (= 合成 facts による direct 検証):
//       - empty facts → empty result
//       - 12 required field 全 articulate → empty result
//       - 1 missing field → 1 violation
//       - 3 missing fields → 3 violations (= 順序維持 = requiredArchiveManifestFields 順)
//       - manifest = nil → skip (= collector 責務)
//   - Fixture parity test (= primary success metric):
//       - archive-v2/pass-minimal → 0 violation, Match=true
//       - archive-v2/fail-missing-restore-command → 1 violation, Match=true
//       - archive-v2/fail-missing-multiple-fields → 3 violations, Match=true
//
// 参照:
//   - tools/architecture-health/src/detectors/archive-manifest-detector.ts (= TS source、parity reference)
//   - app/src/test/guards/detectorResultModuleGuard.test.ts §「detectArchiveManifestViolations」 (= TS 側 unit test mirror)
//   - fixtures/aag/archive-v2/* (= 3 fixture)
package detectors

import (
	"encoding/json"
	"path/filepath"
	"runtime"
	"testing"

	"aag-engine/internal/contract"
	"aag-engine/internal/fixture"
)

// repoRoot returns the repo root absolute path (= aag-engine の親 directory)。
func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// thisFile = aag-engine/internal/detectors/archive_manifest_test.go
	// repoRoot = ../../../
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

// makeValidManifest は 12 required field すべて articulate された manifest object を返す。
func makeValidManifest() map[string]interface{} {
	return map[string]interface{}{
		"archiveVersion":       float64(2),
		"projectId":            "sample",
		"title":                "Sample",
		"archivedAt":           "2026-05-05",
		"preCompressionCommit": "0123456789abcdef0123456789abcdef01234567",
		"deletedPaths":         []interface{}{},
		"compressedFiles":      []interface{}{},
		"restoreAllCommand":    "git checkout ...",
		"decisionEntries":      []interface{}{},
		"commitLineage":        []interface{}{},
		"relatedPrograms":      []interface{}{},
		"compressionRationale": "sample",
	}
}

// Unit: empty facts は empty result。
func TestDetectArchiveManifestViolations_EmptyFacts(t *testing.T) {
	results, err := DetectArchiveManifestViolations([]ArchiveManifestFacts{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d", len(results))
	}
}

// Unit: 12 required field 全 articulate → 0 violation。
func TestDetectArchiveManifestViolations_AllFieldsPresent(t *testing.T) {
	results, err := DetectArchiveManifestViolations([]ArchiveManifestFacts{
		{
			ManifestPath: "projects/completed/sample/archive.manifest.json",
			Manifest:     makeValidManifest(),
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d: %+v", len(results), results)
	}
}

// Unit: 1 missing field → 1 violation。
func TestDetectArchiveManifestViolations_OneMissing(t *testing.T) {
	manifest := makeValidManifest()
	delete(manifest, "restoreAllCommand")

	results, err := DetectArchiveManifestViolations([]ArchiveManifestFacts{
		{
			ManifestPath: "projects/completed/sample/archive.manifest.json",
			Manifest:     manifest,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	r := results[0]
	if r.RuleId != "AR-ARCHIVE-MANIFEST-A2" {
		t.Errorf("ruleId mismatch: %q", r.RuleId)
	}
	if r.DetectionType != "governance-ops" {
		t.Errorf("detectionType mismatch: %q", r.DetectionType)
	}
	if r.Severity != contract.SeverityGate {
		t.Errorf("severity mismatch: %q", r.Severity)
	}
	if r.Evidence == nil || *r.Evidence != "missing required field: restoreAllCommand" {
		t.Errorf("evidence mismatch: %v", r.Evidence)
	}
}

// Unit: 3 missing fields → 3 violations、順序は requiredArchiveManifestFields に従う。
func TestDetectArchiveManifestViolations_MultipleMissing(t *testing.T) {
	manifest := makeValidManifest()
	delete(manifest, "restoreAllCommand")
	delete(manifest, "decisionEntries")
	delete(manifest, "commitLineage")

	results, err := DetectArchiveManifestViolations([]ArchiveManifestFacts{
		{
			ManifestPath: "projects/completed/sample/archive.manifest.json",
			Manifest:     manifest,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 violations, got %d", len(results))
	}

	// 順序 = requiredArchiveManifestFields 順 (= restoreAllCommand → decisionEntries → commitLineage)
	wantFields := []string{"restoreAllCommand", "decisionEntries", "commitLineage"}
	for i, want := range wantFields {
		if results[i].Evidence == nil {
			t.Fatalf("results[%d].Evidence is nil", i)
		}
		wantEvidence := "missing required field: " + want
		if *results[i].Evidence != wantEvidence {
			t.Errorf("results[%d].Evidence = %q, want %q", i, *results[i].Evidence, wantEvidence)
		}
	}
}

// Unit: manifest = nil は skip (= collector 責務)。
func TestDetectArchiveManifestViolations_NilManifestSkipped(t *testing.T) {
	results, err := DetectArchiveManifestViolations([]ArchiveManifestFacts{
		{
			ManifestPath: "projects/completed/broken/archive.manifest.json",
			Manifest:     nil,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations for nil manifest, got %d", len(results))
	}
}

// Fixture parity: archive-v2/pass-minimal → 0 violation、expected.json と Match=true。
func TestFixtureParity_ArchiveV2_PassMinimal(t *testing.T) {
	fx := loadFixture(t, "archive-v2/pass-minimal")

	facts := parseArchiveManifestFacts(t, fx.InputRaw)
	actual, err := DetectArchiveManifestViolations(facts)
	if err != nil {
		t.Fatalf("detector error: %v", err)
	}

	diff := fixture.Compare(fx, actual)
	if !diff.Match {
		t.Errorf("fixture %q parity mismatch:\n  missing: %+v\n  extra:   %+v",
			fx.Name, diff.Missing, diff.Extra)
	}
}

// Fixture parity: archive-v2/fail-missing-restore-command → 1 violation、expected.json と Match=true。
func TestFixtureParity_ArchiveV2_FailMissingRestoreCommand(t *testing.T) {
	fx := loadFixture(t, "archive-v2/fail-missing-restore-command")

	facts := parseArchiveManifestFacts(t, fx.InputRaw)
	actual, err := DetectArchiveManifestViolations(facts)
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

// Fixture parity: archive-v2/fail-missing-multiple-fields → 3 violations、順序維持 + Match=true。
func TestFixtureParity_ArchiveV2_FailMissingMultipleFields(t *testing.T) {
	fx := loadFixture(t, "archive-v2/fail-missing-multiple-fields")

	facts := parseArchiveManifestFacts(t, fx.InputRaw)
	actual, err := DetectArchiveManifestViolations(facts)
	if err != nil {
		t.Fatalf("detector error: %v", err)
	}

	if len(actual) != 3 {
		t.Errorf("expected 3 violations, got %d: %+v", len(actual), actual)
	}

	diff := fixture.Compare(fx, actual)
	if !diff.Match {
		t.Errorf("fixture %q parity mismatch:\n  actual:   %+v\n  expected: %+v\n  missing: %+v\n  extra:   %+v",
			fx.Name, actual, fx.Expected, diff.Missing, diff.Extra)
	}
}

// loadFixture は fixture name を指定して fixtures/aag/<name>/ を load。
func loadFixture(t *testing.T, name string) fixture.Fixture {
	t.Helper()
	all, err := fixture.LoadAll(repoRoot(t))
	if err != nil {
		t.Fatalf("LoadAll failed: %v", err)
	}
	for _, f := range all {
		if f.Name == name {
			return f
		}
	}
	t.Fatalf("fixture %q not found", name)
	return fixture.Fixture{}
}

// parseArchiveManifestFacts は fixture の InputRaw から `{"facts": [...]}` を抽出。
func parseArchiveManifestFacts(t *testing.T, raw json.RawMessage) []ArchiveManifestFacts {
	t.Helper()
	var input struct {
		Facts []ArchiveManifestFacts `json:"facts"`
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		t.Fatalf("parse input.json: %v", err)
	}
	return input.Facts
}
