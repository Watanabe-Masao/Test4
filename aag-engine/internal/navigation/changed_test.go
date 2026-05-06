// changed_test.go — Wave 3 #12 (= reposteward-ai-ops-platform、aag changed --explain)
package navigation

import (
	"strings"
	"testing"
)

func TestChanged_RejectsEmptyRepoRoot(t *testing.T) {
	if _, err := Changed(ChangedInput{}); err == nil {
		t.Error("expected error for empty input, got nil")
	}
}

func TestClassifyByArea_KnownPrefixes(t *testing.T) {
	files := []string{
		"app/src/test/guards/sizeGuard.test.ts",
		"app/src/domain/calculations/foo.ts",
		"aag-engine/internal/stats/stats.go",
		"docs/contracts/aag/task-capsule.schema.json",
		"references/01-foundation/principles.md",
		"unknown/path/file.txt",
	}
	out := classifyByArea(files)
	if !contains(out["guards"], "app/src/test/guards/sizeGuard.test.ts") {
		t.Errorf("guards area missing expected file")
	}
	if !contains(out["domain-calculations"], "app/src/domain/calculations/foo.ts") {
		t.Errorf("domain-calculations area missing expected file")
	}
	if !contains(out["aag-engine-internal"], "aag-engine/internal/stats/stats.go") {
		t.Errorf("aag-engine-internal area missing")
	}
	if !contains(out["aag-contracts"], "docs/contracts/aag/task-capsule.schema.json") {
		t.Errorf("aag-contracts area missing")
	}
	if !contains(out["references"], "references/01-foundation/principles.md") {
		t.Errorf("references area missing")
	}
	if !contains(out["other"], "unknown/path/file.txt") {
		t.Errorf("'other' area missing for unknown prefix")
	}
}

func TestMatchObligations_GuardChange(t *testing.T) {
	files := []string{
		"app/src/test/guards/sizeGuard.test.ts",
		"projects/active/foo/checklist.md",
	}
	out := matchObligations(files)
	if len(out) < 2 {
		t.Errorf("expected ≥ 2 obligations matched, got %d", len(out))
	}
	var foundGuard, foundProject bool
	for _, o := range out {
		if o.ObligationId == "obligation.guard.health" {
			foundGuard = true
			if !strings.Contains(o.Action, "docs:generate") {
				t.Errorf("guard obligation action should hint docs:generate, got: %q", o.Action)
			}
		}
		if o.ObligationId == "obligation.project.checklist-format" {
			foundProject = true
		}
	}
	if !foundGuard || !foundProject {
		t.Errorf("expected guard + project obligations, got: %v", out)
	}
}

func TestCollectRequiredReads_DeDupsAcrossPrefixes(t *testing.T) {
	files := []string{
		"app/src/test/guards/sizeGuard.test.ts",
		"app/src/test/allowlists/architecture.ts",
	}
	reads := collectRequiredReads(files)
	if len(reads) == 0 {
		t.Error("expected non-empty required reads")
	}
	// allowlist-management.md is referenced from both prefixes, must appear once
	count := 0
	for _, r := range reads {
		if r == "references/03-implementation/allowlist-management.md" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("allowlist-management.md should appear once, got %d", count)
	}
}

func TestSummarizeChange(t *testing.T) {
	if got := summarizeChange(0, nil, nil); !strings.Contains(got, "No files changed") {
		t.Errorf("empty change should articulate 'No files', got: %q", got)
	}
	got := summarizeChange(5, map[string][]string{"guards": {"a", "b"}, "domain": {"c"}}, []ChangedObligation{{ObligationId: "x"}})
	if !strings.Contains(got, "5 file") || !strings.Contains(got, "2 area") || !strings.Contains(got, "1 obligation") {
		t.Errorf("summary format unexpected: %q", got)
	}
}

func TestChanged_RealRepo_DefaultBaseHead(t *testing.T) {
	out, err := Changed(ChangedInput{RepoRoot: repoRoot(t)})
	if err != nil {
		// In some CI envs, 'main' branch may not exist locally → skip
		t.Skipf("git diff main..HEAD failed (expected in some envs): %v", err)
	}
	if out.SchemaVersion != ChangedSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Base != "main" || out.Head != "HEAD" {
		t.Errorf("default base/head: got base=%q head=%q", out.Base, out.Head)
	}
	if out.ChangedFiles == nil {
		t.Error("ChangedFiles must be non-nil slice")
	}
	if out.ByArea == nil {
		t.Error("ByArea must be non-nil map")
	}
}

func contains(slice []string, s string) bool {
	for _, x := range slice {
		if x == s {
			return true
		}
	}
	return false
}
