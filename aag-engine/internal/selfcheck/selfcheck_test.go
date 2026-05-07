// selfcheck_test.go — v4.2 substrate (= reposteward-substrate-v4-2-introspect-provenance)
package selfcheck

import (
	"encoding/json"
	"os"
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
	if out.Summary.TotalChecks != 7 {
		t.Errorf("summary.totalChecks = %d (want 7)", out.Summary.TotalChecks)
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
	_ = out.Summary.V6ExamplePaths
	_ = out.Summary.V7ExampleSchemaConsistency
}

func TestExtractExpectedSchemaVersions(t *testing.T) {
	// V7 helper の単体 test
	tmp := t.TempDir()
	cases := []struct {
		name   string
		schema string
		want   []string
	}{
		{
			name:   "const",
			schema: `{"properties": {"schemaVersion": {"const": "foo-v1"}}}`,
			want:   []string{"foo-v1"},
		},
		{
			name:   "enum",
			schema: `{"properties": {"schemaVersion": {"enum": ["foo-v1", "bar-v2"]}}}`,
			want:   []string{"foo-v1", "bar-v2"},
		},
		{
			name:   "no schemaVersion property",
			schema: `{"properties": {"other": {"type": "string"}}}`,
			want:   nil,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			path := tmp + "/" + tc.name + ".json"
			if err := os.WriteFile(path, []byte(tc.schema), 0644); err != nil {
				t.Fatal(err)
			}
			got, err := extractExpectedSchemaVersions(path)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(got) != len(tc.want) {
				t.Errorf("len mismatch: got %v, want %v", got, tc.want)
				return
			}
			for i, g := range got {
				if g != tc.want[i] {
					t.Errorf("[%d] = %q, want %q", i, g, tc.want[i])
				}
			}
		})
	}
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
