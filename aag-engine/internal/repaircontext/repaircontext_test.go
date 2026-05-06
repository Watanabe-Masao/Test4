// repaircontext_test.go — Wave 5 #21 (= reposteward-ai-ops-platform、aag repair-context)
package repaircontext

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

func TestRepair_RejectsEmptyInput(t *testing.T) {
	if _, err := Repair(RepairInput{}); err == nil {
		t.Error("expected error for empty input")
	}
	if _, err := Repair(RepairInput{RepoRoot: "/tmp"}); err == nil {
		t.Error("expected error for missing From")
	}
}

func TestRepair_NonexistentInputFile(t *testing.T) {
	_, err := Repair(RepairInput{RepoRoot: repoRoot(t), From: "/nonexistent/file.json"})
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestRepair_DetectorResultsArray(t *testing.T) {
	tmp := t.TempDir()
	input := filepath.Join(tmp, "results.json")
	content := `[
		{
			"ruleId": "AR-G5-HOOK-LINES",
			"detectionType": "size-limit",
			"sourceFile": "app/src/application/hooks/foo.ts",
			"severity": "gate",
			"messageSeed": "hook 行数超過"
		}
	]`
	if err := os.WriteFile(input, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := Repair(RepairInput{RepoRoot: repoRoot(t), From: input})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != RepairSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.InputKind != "detector-results" {
		t.Errorf("inputKind = %q, want detector-results", out.InputKind)
	}
	if out.ViolationCount != 1 {
		t.Errorf("violationCount = %d, want 1", out.ViolationCount)
	}
	if !contains(out.RepairReads, "app/src/application/hooks/foo.ts") {
		t.Error("expected sourceFile in repairReads")
	}
	hasBaseRules := false
	for _, r := range out.RepairReads {
		if strings.Contains(r, "base-rules.ts") {
			hasBaseRules = true
		}
	}
	if !hasBaseRules {
		t.Error("expected base-rules.ts in repairReads")
	}
	if len(out.SuggestedActions) == 0 {
		t.Error("expected suggested actions")
	}
}

func TestRepair_ObligationCheckV1(t *testing.T) {
	tmp := t.TempDir()
	input := filepath.Join(tmp, "obligation.json")
	content := `{
		"schemaVersion": "obligation-check-v1",
		"matchedContracts": [
			{
				"contractId": "PC-DETECTOR-RESULT-CONTRACT",
				"label": "Test contract",
				"matchedTriggers": ["docs/contracts/aag/detector-result.schema.json"],
				"requirements": [
					{"path": "app/src/test/guards/aagContractSchemaSyncGuard.test.ts", "mode": "must-pass", "rationale": "verify"},
					{"path": "fixtures/aag", "mode": "review", "rationale": "review fixtures"}
				]
			}
		]
	}`
	if err := os.WriteFile(input, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := Repair(RepairInput{RepoRoot: repoRoot(t), From: input})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.InputKind != "obligation-check-v1" {
		t.Errorf("inputKind = %q", out.InputKind)
	}
	if out.ViolationCount != 1 {
		t.Errorf("violationCount = %d, want 1", out.ViolationCount)
	}
	if !contains(out.RepairReads, "app/src/test/guards/aagContractSchemaSyncGuard.test.ts") {
		t.Error("expected guard path in repairReads")
	}
	hasMustPass := false
	for _, c := range out.RequiredChecks {
		if strings.Contains(c, "Re-run") && strings.Contains(c, "PASS") {
			hasMustPass = true
		}
	}
	if !hasMustPass {
		t.Error("expected must-pass requirement to articulate Re-run/PASS check")
	}
}

func TestRepair_CleanCheckV1(t *testing.T) {
	tmp := t.TempDir()
	input := filepath.Join(tmp, "clean.json")
	content := `{
		"schemaVersion": "clean-check-v1",
		"violations": [
			{
				"kind": "generated-handauthored",
				"path": "references/04-tracking/generated/rogue.md",
				"reason": "lacks marker",
				"severity": "warn",
				"action": "Add marker or move file"
			}
		]
	}`
	if err := os.WriteFile(input, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := Repair(RepairInput{RepoRoot: repoRoot(t), From: input})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.InputKind != "clean-check-v1" {
		t.Errorf("inputKind = %q", out.InputKind)
	}
	if out.ViolationCount != 1 {
		t.Errorf("violationCount = %d, want 1", out.ViolationCount)
	}
	if !contains(out.RepairReads, "references/04-tracking/generated/rogue.md") {
		t.Error("expected violation path in repairReads")
	}
}

func TestRepair_DocsPlacementCheckV1(t *testing.T) {
	tmp := t.TempDir()
	input := filepath.Join(tmp, "placement.json")
	content := `{
		"schemaVersion": "docs-placement-check-v1",
		"violations": [
			{
				"kind": "schema-misplaced",
				"path": "app/src/foo.schema.json",
				"reason": "should be in docs/contracts",
				"severity": "warn",
				"action": "Move to docs/contracts/"
			}
		]
	}`
	if err := os.WriteFile(input, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := Repair(RepairInput{RepoRoot: repoRoot(t), From: input})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.InputKind != "docs-placement-check-v1" {
		t.Errorf("inputKind = %q", out.InputKind)
	}
}

func TestRepair_UnknownInputKind(t *testing.T) {
	tmp := t.TempDir()
	input := filepath.Join(tmp, "unknown.json")
	if err := os.WriteFile(input, []byte(`{"schemaVersion":"unknown-format-v99"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := Repair(RepairInput{RepoRoot: repoRoot(t), From: input})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.InputKind != "unknown" {
		t.Errorf("inputKind = %q, want unknown", out.InputKind)
	}
	if len(out.SuggestedActions) == 0 {
		t.Error("expected fallback action articulation")
	}
}

func TestSupportedInputKinds(t *testing.T) {
	kinds := SupportedInputKinds()
	if len(kinds) != 4 {
		t.Errorf("expected 4 supported kinds, got %d", len(kinds))
	}
}

func TestDedup_RemovesDuplicates(t *testing.T) {
	got := dedup([]string{"a", "b", "a", "c", "", "b"})
	want := []string{"a", "b", "c"}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
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
