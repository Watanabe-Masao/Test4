// chaos_test.go — v4.2 substrate (= reposteward-substrate-v4-2-chaos)
package chaos

import (
	"encoding/json"
	"os/exec"
	"strings"
	"testing"
)

func TestOverview_BasicShape(t *testing.T) {
	out := Overview()
	if out.SchemaVersion != OverviewSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.TotalCommands < 20 {
		t.Errorf("expected ≥ 20 commands articulated, got %d", out.TotalCommands)
	}
	if out.TotalFailureModes <= 0 {
		t.Errorf("expected ≥ 1 failure modes (= A3 で landed)、got %d", out.TotalFailureModes)
	}
	// commandsWithFailureModes ≤ totalCommands invariant
	if out.CommandsWithFailureModes > out.TotalCommands {
		t.Errorf("commandsWithFailureModes (%d) > totalCommands (%d)", out.CommandsWithFailureModes, out.TotalCommands)
	}
	// withCountermeasure + untested == totalFailureModes invariant
	if out.WithCountermeasureCount+out.UntestedCount != out.TotalFailureModes {
		t.Errorf("withCountermeasure (%d) + untested (%d) != total (%d)",
			out.WithCountermeasureCount, out.UntestedCount, out.TotalFailureModes)
	}
}

func TestOverview_ByCommandSorted(t *testing.T) {
	out := Overview()
	for i := 1; i < len(out.ByCommand); i++ {
		if out.ByCommand[i-1].Command > out.ByCommand[i].Command {
			t.Errorf("byCommand not sorted: %q > %q",
				out.ByCommand[i-1].Command, out.ByCommand[i].Command)
		}
	}
}

func TestPerCommand_RejectsEmpty(t *testing.T) {
	_, err := PerCommand("")
	if err == nil {
		t.Error("expected error for empty command")
	}
}

func TestPerCommand_RejectsUnknown(t *testing.T) {
	_, err := PerCommand("nonexistent-command")
	if err == nil {
		t.Error("expected error for unknown command")
	}
}

func TestPerCommand_KnownCommandWithFailureModes(t *testing.T) {
	out, err := PerCommand("wrap")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != PerCommandSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Command != "wrap" {
		t.Errorf("command = %q", out.Command)
	}
	// wrap は 3 failure modes articulated (= A3 で landed)
	if out.TotalFailureModes != 3 {
		t.Errorf("expected 3 failure modes for wrap, got %d", out.TotalFailureModes)
	}
	for _, s := range out.Scenarios {
		if s.Trigger == "" {
			t.Error("scenario.trigger must be non-empty")
		}
		if s.Behavior == "" {
			t.Error("scenario.behavior must be non-empty")
		}
	}
}

func TestPerCommand_CommandWithoutFailureModes(t *testing.T) {
	// 'fixtures' は failure modes articulate なし (= A3 articulate 候補ではあったが未 articulate)
	out, err := PerCommand("fixtures")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.TotalFailureModes != 0 {
		t.Errorf("expected 0 failure modes for fixtures, got %d", out.TotalFailureModes)
	}
	if !strings.Contains(out.Summary, "no failure modes articulated") {
		t.Errorf("summary should articulate no-failure-modes case, got: %q", out.Summary)
	}
}

func TestPerCommand_CountermeasureFlagAccurate(t *testing.T) {
	out, err := PerCommand("task validate")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, s := range out.Scenarios {
		if s.HasCountermeasure != (s.CountermeasureTest != "") {
			t.Errorf("hasCountermeasure flag inconsistent with countermeasureTest: %+v", s)
		}
	}
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out := Overview()
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	var back OverviewOutput
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("JSON roundtrip failed: %v", err)
	}
	if back.SchemaVersion != out.SchemaVersion {
		t.Error("schemaVersion roundtrip mismatch")
	}
}

func TestRunAdversarial_RejectsEmpty(t *testing.T) {
	if _, err := RunAdversarial("", "validate"); err == nil {
		t.Error("expected error for empty binaryPath")
	}
	if _, err := RunAdversarial("/some/path", ""); err == nil {
		t.Error("expected error for empty command")
	}
}

func TestRunAdversarial_RejectsUnknown(t *testing.T) {
	_, err := RunAdversarial("/some/path", "nonexistent-command")
	if err == nil {
		t.Error("expected error for unknown command")
	}
}

func TestRunAdversarial_LiveExecution(t *testing.T) {
	// 実 binary build + execute (= integration test)。
	// build 失敗時は skip (= environment articulate されていない場合の graceful)。
	tmp := t.TempDir()
	binaryPath := tmp + "/aag-test"
	build := exec.Command("go", "build", "-o", binaryPath, "../../cmd/aag")
	if out, err := build.CombinedOutput(); err != nil {
		t.Skipf("build failed (= environment dependent): %v\noutput: %s", err, out)
	}

	out, err := RunAdversarial(binaryPath, "wrap")
	if err != nil {
		t.Fatalf("RunAdversarial error: %v", err)
	}
	if out.SchemaVersion != RunSchemaVersion {
		t.Errorf("schemaVersion = %q (want %q)", out.SchemaVersion, RunSchemaVersion)
	}
	if out.TotalReproducible != 3 {
		t.Errorf("expected 3 reproducible failure modes for wrap, got %d", out.TotalReproducible)
	}
	if !out.Healthy {
		t.Errorf("expected healthy=true (= 3/3 matched), got results: %+v", out.Results)
	}
	if out.MatchedCount != 3 {
		t.Errorf("expected 3 matched, got %d", out.MatchedCount)
	}
}
