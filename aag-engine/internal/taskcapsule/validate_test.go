// validate_test.go — Wave 5 #22 (= reposteward-ai-ops-platform、aag task validate / close)
package taskcapsule

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeCapsule(t *testing.T, path string, capsule TaskCapsule) {
	t.Helper()
	b, err := json.Marshal(capsule)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, b, 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestValidateCapsule_RejectsEmptyInput(t *testing.T) {
	if _, err := ValidateCapsule(ValidateInput{}); err == nil {
		t.Error("expected error for empty input")
	}
}

func TestValidateCapsule_NonexistentFile(t *testing.T) {
	_, err := ValidateCapsule(ValidateInput{CapsuleFile: "/nonexistent/capsule.json"})
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestValidateCapsule_ValidCapsule(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "capsule.json")
	writeCapsule(t, path, validCapsule())

	out, err := ValidateCapsule(ValidateInput{CapsuleFile: path})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !out.Valid {
		t.Errorf("expected Valid=true, got false. errors: %v", out.Errors)
	}
	if out.TaskId != "test-task" {
		t.Errorf("TaskId echo failed: %q", out.TaskId)
	}
	if out.SchemaVersion != ValidateSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
}

func TestValidateCapsule_InvalidCapsule_ArticulatesError(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "bad.json")
	c := validCapsule()
	c.SchemaVersion = "wrong-version"
	writeCapsule(t, path, c)

	out, err := ValidateCapsule(ValidateInput{CapsuleFile: path})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Valid {
		t.Error("expected Valid=false for wrong schemaVersion")
	}
	if len(out.Errors) == 0 {
		t.Error("expected articulated errors")
	}
}

func TestValidateCapsule_MalformedJson(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "broken.json")
	if err := os.WriteFile(path, []byte("{not valid json"), 0o644); err != nil {
		t.Fatal(err)
	}

	out, err := ValidateCapsule(ValidateInput{CapsuleFile: path})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Valid {
		t.Error("expected Valid=false for malformed JSON")
	}
	if !strings.Contains(out.Errors[0], "JSON parse error") {
		t.Errorf("expected JSON parse error articulation, got: %v", out.Errors)
	}
}

func TestCloseCapsule_RejectsEmptyInput(t *testing.T) {
	if _, err := CloseCapsule(CloseInput{}); err == nil {
		t.Error("expected error for empty input")
	}
}

func TestCloseCapsule_ValidCapsuleHardGatePass(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "capsule.json")
	writeCapsule(t, path, validCapsule())

	out, err := CloseCapsule(CloseInput{CapsuleFile: path})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !out.Valid {
		t.Errorf("expected Valid=true")
	}
	if !out.ReadyToClose {
		t.Errorf("expected ReadyToClose=true (hardGate=pass), got blocking: %v", out.BlockingIssues)
	}
	if len(out.RequiredFinalChecks) == 0 {
		t.Error("expected RequiredFinalChecks articulation")
	}
}

func TestCloseCapsule_HardGateFailBlocks(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "capsule.json")
	c := validCapsule()
	c.RepoHealth["hardGate"] = "fail"
	writeCapsule(t, path, c)

	out, err := CloseCapsule(CloseInput{CapsuleFile: path})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.ReadyToClose {
		t.Error("expected ReadyToClose=false when hardGate=fail")
	}
	if len(out.BlockingIssues) == 0 {
		t.Error("expected blocking issue articulation")
	}
}

func TestCloseCapsule_InvalidCapsuleBlocks(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "capsule.json")
	c := validCapsule()
	c.SchemaVersion = "wrong"
	writeCapsule(t, path, c)

	out, err := CloseCapsule(CloseInput{CapsuleFile: path})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Valid {
		t.Error("expected Valid=false")
	}
	if out.ReadyToClose {
		t.Error("expected ReadyToClose=false when capsule invalid")
	}
}

func TestDefaultFinalChecks_IncludesEssentials(t *testing.T) {
	checks := defaultFinalChecks()
	hasGuards := false
	hasGoTest := false
	for _, c := range checks {
		if strings.Contains(c, "test:guards") {
			hasGuards = true
		}
		if strings.Contains(c, "go test") {
			hasGoTest = true
		}
	}
	if !hasGuards || !hasGoTest {
		t.Errorf("essential checks missing: guards=%v go=%v", hasGuards, hasGoTest)
	}
}
