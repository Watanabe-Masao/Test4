// projectstatus_test.go — Wave 5 #23 (= reposteward-ai-ops-platform、Wave 5 final)
package projectstatus

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

func TestStale_RejectsEmptyInput(t *testing.T) {
	if _, err := Stale(StaleInput{}); err == nil {
		t.Error("expected error for empty input")
	}
}

func TestStale_RealRepo_DefaultThreshold(t *testing.T) {
	out, err := Stale(StaleInput{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != StaleSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.StaleDays != 30 {
		t.Errorf("default StaleDays = %d, want 30", out.StaleDays)
	}
	// quick-fixes / _template should be excluded
	for _, p := range out.StaleProjects {
		if p.ProjectId == "quick-fixes" || p.ProjectId == "_template" {
			t.Errorf("quick-fixes / _template should be excluded, got: %s", p.ProjectId)
		}
	}
	for _, p := range out.FreshProjects {
		if p.ProjectId == "quick-fixes" || p.ProjectId == "_template" {
			t.Errorf("quick-fixes / _template should be excluded, got: %s", p.ProjectId)
		}
	}
}

func TestStale_CustomThreshold(t *testing.T) {
	out, err := Stale(StaleInput{
		RepoRoot:  repoRoot(t),
		StaleDays: 365,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.StaleDays != 365 {
		t.Errorf("StaleDays not articulated: got %d", out.StaleDays)
	}
}

func TestStale_TodayOverride(t *testing.T) {
	fixedToday, _ := time.Parse("2006-01-02", "2026-05-06")
	out, err := Stale(StaleInput{
		RepoRoot: repoRoot(t),
		Today:    fixedToday,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Today != "2026-05-06" {
		t.Errorf("Today articulate failed: got %q", out.Today)
	}
}

func TestNext_RejectsEmptyInput(t *testing.T) {
	if _, err := Next(NextInput{}); err == nil {
		t.Error("expected error for empty input")
	}
}

func TestNext_RealRepo_ReturnsRecommendations(t *testing.T) {
	out, err := Next(NextInput{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != NextSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Branch == "" {
		t.Error("Branch must be articulated")
	}
	if len(out.RecommendedActions) == 0 {
		t.Error("RecommendedActions must be non-empty")
	}
	if len(out.Reasoning) == 0 {
		t.Error("Reasoning must articulate at least 1 entry")
	}
}

func TestCountUnchecked_RealRepo(t *testing.T) {
	count := countUnchecked(repoRoot(t), "reposteward-ai-ops-platform")
	if count < 0 {
		t.Errorf("count should be >= 0, got %d", count)
	}
	// reposteward-ai-ops-platform has Wave 5 work in progress, count > 0 expected
	t.Logf("reposteward-ai-ops-platform unchecked count: %d", count)
}

func TestCountUnchecked_NonexistentProject(t *testing.T) {
	count := countUnchecked(repoRoot(t), "nonexistent-project-zzz")
	if count != 0 {
		t.Errorf("nonexistent project should return 0, got %d", count)
	}
}

func TestCountUnchecked_SyntheticChecklistSkipsAiReview(t *testing.T) {
	tmp := t.TempDir()
	projectDir := filepath.Join(tmp, "projects", "active", "test-project")
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatal(err)
	}
	checklist := strings.Join([]string{
		"# checklist",
		"## Phase 1",
		"- [x] done 1",
		"- [ ] todo 1",
		"- [ ] todo 2",
		"## AI 自己レビュー (= user 承認の手前)",
		"- [ ] AI review item (skipped)",
		"## 最終レビュー (user 承認)",
		"- [ ] final review (skipped)",
	}, "\n")
	if err := os.WriteFile(filepath.Join(projectDir, "checklist.md"), []byte(checklist), 0o644); err != nil {
		t.Fatal(err)
	}
	count := countUnchecked(tmp, "test-project")
	if count != 2 {
		t.Errorf("expected 2 unchecked (= AI review + final review skipped), got %d", count)
	}
}
