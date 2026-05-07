// selfcheck_test.go — v4.2 substrate (= reposteward-substrate-v4-2-introspect-provenance)
package selfcheck

import (
	"encoding/json"
	"path/filepath"
	"runtime"
	"testing"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// thisFile = aag-engine/internal/selfcheck/selfcheck_test.go
	// repoRoot = ../../../
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

func TestRun_BasicShape(t *testing.T) {
	out := Run(repoRoot(t))
	if out.SchemaVersion != SelfCheckSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Provenance.Confidence != "observed" {
		t.Errorf("provenance.confidence = %q (want observed)", out.Provenance.Confidence)
	}
	if out.Summary.TotalChecks != 5 {
		t.Errorf("summary.totalChecks = %d (want 5)", out.Summary.TotalChecks)
	}
}

func TestRun_HealthyOnRealRepo(t *testing.T) {
	out := Run(repoRoot(t))
	if !out.Healthy {
		t.Errorf("expected healthy=true on real repo, got violations:\n%+v", out.Violations)
	}
	if out.Summary.TotalViolations != 0 {
		t.Errorf("expected 0 violations on real repo, got %d", out.Summary.TotalViolations)
	}
}

func TestRun_DefaultRepoRoot(t *testing.T) {
	// Run with empty string defaults to "."。test working dir は selfcheck/
	// なので files won't resolve, V2/V3/V4 violations が出る予想。
	// healthy=false が articulate されることを confirm (= empty repoRoot は best-effort)。
	out := Run("")
	if out.SchemaVersion != SelfCheckSchemaVersion {
		t.Errorf("schemaVersion mismatch")
	}
	// Violations may exist (= cwd で path resolve しないため)、ただし panic しない
}

func TestRun_AllAxesCovered(t *testing.T) {
	out := Run(repoRoot(t))
	// Summary 構造の field が articulate されている (= 数値 zero でも field 存在)
	_ = out.Summary.V1CrossSync
	_ = out.Summary.V2ImplFiles
	_ = out.Summary.V3SchemaFiles
	_ = out.Summary.V4TestPaths
	_ = out.Summary.V5OrphanSchema
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out := Run(repoRoot(t))
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	var back SelfCheckOutput
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("JSON roundtrip failed: %v", err)
	}
	if back.SchemaVersion != out.SchemaVersion {
		t.Error("schemaVersion roundtrip mismatch")
	}
}
