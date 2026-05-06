// context_test.go — Wave 3 #11 (= reposteward-ai-ops-platform、aag context --project)
package navigation

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestContext_RejectsEmptyInput(t *testing.T) {
	if _, err := Context(ContextInput{}); err == nil {
		t.Error("expected error for empty input, got nil")
	}
	if _, err := Context(ContextInput{RepoRoot: "/tmp"}); err == nil {
		t.Error("expected error for missing ProjectID, got nil")
	}
	if _, err := Context(ContextInput{ProjectID: "x"}); err == nil {
		t.Error("expected error for missing RepoRoot, got nil")
	}
}

func TestContext_RejectsNonexistentProject(t *testing.T) {
	_, err := Context(ContextInput{
		RepoRoot:  repoRoot(t),
		ProjectID: "nonexistent-project-zzz",
	})
	if err == nil {
		t.Error("expected error for nonexistent project, got nil")
	}
}

func TestContext_RealRepo_RepostewardAiOpsPlatform(t *testing.T) {
	out, err := Context(ContextInput{
		RepoRoot:  repoRoot(t),
		ProjectID: "reposteward-ai-ops-platform",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != ContextSchemaVersion {
		t.Errorf("schemaVersion = %q, want %q", out.SchemaVersion, ContextSchemaVersion)
	}
	if out.ProjectId != "reposteward-ai-ops-platform" {
		t.Errorf("projectId = %q", out.ProjectId)
	}
	if out.Title == "" {
		t.Error("expected non-empty title")
	}
	if len(out.RequiredReads) != 5 {
		t.Errorf("expected 5 RequiredReads, got %d", len(out.RequiredReads))
	}
	if len(out.Constraints) == 0 {
		t.Error("expected non-empty Constraints (= reposteward-ai-ops-platform articulates 11 nonGoals)")
	}
	// nextActions: may or may not have unchecked items at this exact moment.
	// Just verify it's a valid slice.
	if out.NextActions == nil {
		t.Error("NextActions should be non-nil slice (may be empty)")
	}
}

func TestContext_MaxNextActions(t *testing.T) {
	out, err := Context(ContextInput{
		RepoRoot:       repoRoot(t),
		ProjectID:      "reposteward-ai-ops-platform",
		MaxNextActions: 2,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out.NextActions) > 2 {
		t.Errorf("NextActions cap to 2, got %d", len(out.NextActions))
	}
}

func TestReadUncheckedChecklistItems_BasicChecklist(t *testing.T) {
	tmp := t.TempDir()
	checklist := filepath.Join(tmp, "checklist.md")
	content := strings.Join([]string{
		"# checklist",
		"",
		"## Phase 1",
		"",
		"- [x] done 1",
		"- [ ] todo 1",
		"- [ ] todo 2",
		"",
		"## AI 自己レビュー (= user 承認の手前)",
		"",
		"- [ ] AI review item (skipped)",
		"",
		"## Phase 2",
		"",
		"- [ ] todo 3",
	}, "\n")
	if err := os.WriteFile(checklist, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	got := readUncheckedChecklistItems(checklist, 10)
	want := []string{"todo 1", "todo 2", "todo 3"}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i, w := range want {
		if got[i] != w {
			t.Errorf("got[%d] = %q, want %q", i, got[i], w)
		}
	}
}

func TestReadUncheckedChecklistItems_MaxNCap(t *testing.T) {
	tmp := t.TempDir()
	checklist := filepath.Join(tmp, "checklist.md")
	lines := []string{"# checklist", "## Phase 1", ""}
	for i := 0; i < 10; i++ {
		lines = append(lines, "- [ ] item "+string(rune('a'+i)))
	}
	if err := os.WriteFile(checklist, []byte(strings.Join(lines, "\n")), 0o644); err != nil {
		t.Fatal(err)
	}
	got := readUncheckedChecklistItems(checklist, 3)
	if len(got) != 3 {
		t.Errorf("expected 3 items (capped), got %d", len(got))
	}
}

func TestReadUncheckedChecklistItems_MissingFile(t *testing.T) {
	got := readUncheckedChecklistItems("/nonexistent/checklist.md", 5)
	if got == nil || len(got) != 0 {
		t.Errorf("missing file should return empty slice, got %v", got)
	}
}
