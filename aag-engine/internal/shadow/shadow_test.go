// shadow_test.go は Shadow Mode runner の動作 contract を unit test で機械検証する。
//
// Phase 9 (= Shadow Mode) で landing する test:
//   - Run: real repo の 8 fixture を全 dispatch、全 Match=true (= primary metric)
//   - Summary: Total / Matched / Mismatched / Skipped の articulate
//   - AllMatched: edge case (= empty / partial mismatch / skipped 含む)
//   - dispatch: 5 prefix すべてが appropriate detector に route される
//   - 想定外 prefix → Skipped として articulate
//
// 参照:
//   - app/src/test/guards/detectorResultModuleGuard.test.ts §「fixture corpus parity」 (= TS 側 mirror)
//   - fixtures/aag/ (= 8 fixture / 5 系統 coverage)
package shadow

import (
	"path/filepath"
	"runtime"
	"testing"
)

// repoRoot returns the repo root absolute path。
func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// thisFile = aag-engine/internal/shadow/shadow_test.go
	// repoRoot = ../../../
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

// Run: real repo の 8 fixture を全 dispatch、全 Match=true (= primary metric)。
func TestRun_AllFixturesMatch(t *testing.T) {
	summary, err := Run(repoRoot(t))
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if summary.Total != 8 {
		t.Errorf("expected Total=8, got %d", summary.Total)
	}
	if summary.Matched != 8 {
		t.Errorf("expected Matched=8 (= 5 detector × 8 fixture parity 100%%), got %d", summary.Matched)
		// Print diagnostic info
		for _, fr := range summary.Results {
			if !fr.Match {
				t.Logf("  mismatch: %s (detector=%s, expected=%d, actual=%d, missing=%d, extra=%d)",
					fr.FixtureName, fr.DetectorName, fr.ExpectedCount, fr.ActualCount,
					len(fr.Missing), len(fr.Extra))
			}
		}
	}
	if summary.Mismatched != 0 {
		t.Errorf("expected Mismatched=0, got %d", summary.Mismatched)
	}
	if summary.Skipped != 0 {
		t.Errorf("expected Skipped=0 (= all 8 fixtures dispatchable), got %d", summary.Skipped)
	}
}

// Run: 5 detector すべてが少なくとも 1 fixture を route する (= coverage 検証)。
func TestRun_AllDetectorsCovered(t *testing.T) {
	summary, err := Run(repoRoot(t))
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	expectedDetectors := map[string]bool{
		"archive-manifest":   false,
		"doc-registry":       false,
		"generated-metadata": false,
		"project-lifecycle":  false,
		"schema-validation":  false,
	}

	for _, fr := range summary.Results {
		expectedDetectors[fr.DetectorName] = true
	}

	for name, covered := range expectedDetectors {
		if !covered {
			t.Errorf("detector %q not covered by any fixture", name)
		}
	}
}

// AllMatched: 全 Match の場合 true。
func TestSummary_AllMatched_True(t *testing.T) {
	summary, err := Run(repoRoot(t))
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}
	if !summary.AllMatched() {
		t.Errorf("expected AllMatched=true (= 8 fixture parity 100%%), got false")
	}
}

// AllMatched: empty summary は false。
func TestSummary_AllMatched_Empty(t *testing.T) {
	s := Summary{Total: 0}
	if s.AllMatched() {
		t.Errorf("expected AllMatched=false for empty summary")
	}
}

// AllMatched: partial mismatch は false。
func TestSummary_AllMatched_Partial(t *testing.T) {
	s := Summary{Total: 3, Matched: 2, Mismatched: 1}
	if s.AllMatched() {
		t.Errorf("expected AllMatched=false for partial mismatch")
	}
}

// AllMatched: skipped > 0 は false。
func TestSummary_AllMatched_Skipped(t *testing.T) {
	s := Summary{Total: 3, Matched: 2, Skipped: 1}
	if s.AllMatched() {
		t.Errorf("expected AllMatched=false when Skipped > 0")
	}
}

// Run: nonexistent repo で error。
func TestRun_NonexistentRepo(t *testing.T) {
	_, err := Run("/tmp/nonexistent-shadow-test-root")
	if err == nil {
		t.Error("expected error for nonexistent root, got nil")
	}
}

// Run: per-fixture detector dispatch が想定通り。
func TestRun_DispatchMapping(t *testing.T) {
	summary, err := Run(repoRoot(t))
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	wantMapping := map[string]string{
		"archive-v2/pass-minimal":                       "archive-manifest",
		"archive-v2/fail-missing-restore-command":       "archive-manifest",
		"archive-v2/fail-missing-multiple-fields":       "archive-manifest",
		"doc-registry/fail-missing-path":                "doc-registry",
		"generated/fail-stale-metadata":                 "generated-metadata",
		"project-lifecycle/pass-active":                 "project-lifecycle",
		"project-lifecycle/fail-completed-not-archived": "project-lifecycle",
		"schema-validation/fail-level-out-of-range":     "schema-validation",
	}

	got := make(map[string]string)
	for _, fr := range summary.Results {
		got[fr.FixtureName] = fr.DetectorName
	}

	for fixtureName, wantDetector := range wantMapping {
		if got[fixtureName] != wantDetector {
			t.Errorf("fixture %q: expected detector %q, got %q", fixtureName, wantDetector, got[fixtureName])
		}
	}
}

// Run: ExpectedCount + ActualCount が fixture ごとに articulate される。
func TestRun_CountsArticulated(t *testing.T) {
	summary, err := Run(repoRoot(t))
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	wantCounts := map[string]int{
		"archive-v2/pass-minimal":                       0,
		"archive-v2/fail-missing-restore-command":       1,
		"archive-v2/fail-missing-multiple-fields":       3,
		"doc-registry/fail-missing-path":                1,
		"generated/fail-stale-metadata":                 1,
		"project-lifecycle/pass-active":                 0,
		"project-lifecycle/fail-completed-not-archived": 1,
		"schema-validation/fail-level-out-of-range":     1,
	}

	for _, fr := range summary.Results {
		want, ok := wantCounts[fr.FixtureName]
		if !ok {
			continue
		}
		if fr.ExpectedCount != want {
			t.Errorf("fixture %q: ExpectedCount=%d, want %d", fr.FixtureName, fr.ExpectedCount, want)
		}
		// fixture parity が成立しているなら ActualCount も同じはず
		if fr.Match && fr.ActualCount != want {
			t.Errorf("fixture %q (Match=true): ActualCount=%d, want %d", fr.FixtureName, fr.ActualCount, want)
		}
	}
}
