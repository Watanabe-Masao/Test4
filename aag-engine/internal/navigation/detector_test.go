// detector_test.go — Wave 3 #14 (= reposteward-ai-ops-platform、aag detector refs <detectorId>)
package navigation

import (
	"strings"
	"testing"
)

func TestDetectorRefs_RejectsEmptyInput(t *testing.T) {
	if _, err := DetectorRefs(DetectorRefsInput{}); err == nil {
		t.Error("expected error for empty input, got nil")
	}
	if _, err := DetectorRefs(DetectorRefsInput{RepoRoot: "/tmp"}); err == nil {
		t.Error("expected error for missing DetectorId, got nil")
	}
	if _, err := DetectorRefs(DetectorRefsInput{DetectorId: "x"}); err == nil {
		t.Error("expected error for missing RepoRoot, got nil")
	}
}

func TestDetectorRefs_UnknownDetector_HintsKnownList(t *testing.T) {
	_, err := DetectorRefs(DetectorRefsInput{
		RepoRoot:   repoRoot(t),
		DetectorId: "nonexistent-zzz",
	})
	if err == nil {
		t.Fatal("expected error for unknown detector, got nil")
	}
	msg := err.Error()
	if !strings.Contains(msg, "Known detectors:") {
		t.Errorf("expected 'Known detectors:' hint, got: %q", msg)
	}
	for _, id := range KnownDetectorIds() {
		if !strings.Contains(msg, id) {
			t.Errorf("expected hint to articulate %q, got: %q", id, msg)
		}
	}
}

func TestDetectorRefs_RealRepo_ArchiveManifest(t *testing.T) {
	out, err := DetectorRefs(DetectorRefsInput{
		RepoRoot:   repoRoot(t),
		DetectorId: "archive-manifest",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != DetectorRefsSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.DetectorId != "archive-manifest" {
		t.Errorf("detectorId = %q", out.DetectorId)
	}
	if !strings.Contains(out.GoImplementation, "archive_manifest.go") {
		t.Errorf("GoImplementation should reference archive_manifest.go, got: %q", out.GoImplementation)
	}
	if !strings.Contains(out.GoTest, "archive_manifest_test.go") {
		t.Errorf("GoTest should reference archive_manifest_test.go, got: %q", out.GoTest)
	}
	if !strings.Contains(out.TsImplementation, "archive-manifest-detector.ts") {
		t.Errorf("TsImplementation should reference archive-manifest-detector.ts, got: %q", out.TsImplementation)
	}
	if out.Schema == "" {
		t.Error("expected non-empty Schema (= detector-result.schema.json)")
	}
	if out.FixtureCount == 0 {
		t.Error("expected at least 1 fixture for archive-manifest (= archive-v2/)")
	}
	if out.FixtureCount != len(out.Fixtures) {
		t.Errorf("FixtureCount mismatch: %d vs len(Fixtures)=%d", out.FixtureCount, len(out.Fixtures))
	}
}

func TestDetectorRefs_AllKnownDetectors_HaveImplsAndFixtures(t *testing.T) {
	for _, id := range KnownDetectorIds() {
		t.Run(id, func(t *testing.T) {
			out, err := DetectorRefs(DetectorRefsInput{
				RepoRoot:   repoRoot(t),
				DetectorId: id,
			})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if out.GoImplementation == "" {
				t.Errorf("%s: GoImplementation must be articulated", id)
			}
			if out.TsImplementation == "" {
				t.Errorf("%s: TsImplementation must be articulated", id)
			}
			if out.FixtureCount == 0 {
				t.Errorf("%s: expected at least 1 fixture", id)
			}
		})
	}
}

func TestKnownDetectorIds_HasFiveDetectors(t *testing.T) {
	ids := KnownDetectorIds()
	if len(ids) != 5 {
		t.Errorf("expected 5 known detectors (= aag-engine-go-mvp landed), got %d", len(ids))
	}
}
