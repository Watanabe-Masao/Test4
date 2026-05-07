// bootstrap_test.go — v4.2 cluster C (= reposteward-substrate-v4-2-cluster-c)
package bootstrap

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
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

func TestRun_RejectsEmpty(t *testing.T) {
	_, err := Run(Input{})
	if err == nil {
		t.Error("expected error for empty input")
	}
}

func TestRun_RealRepo(t *testing.T) {
	out, err := Run(Input{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != SchemaVersion {
		t.Errorf("schemaVersion = %q (want %q)", out.SchemaVersion, SchemaVersion)
	}
	if out.WhereAmI == nil {
		t.Error("WhereAmI must be articulated")
	}
	// SuggestedNext は articulate されているはず (= 1 件以上)
	if len(out.SuggestedNext) == 0 {
		t.Error("SuggestedNext should articulate at least 1 entry")
	}
	for _, s := range out.SuggestedNext {
		if s.Command == "" || s.Rationale == "" {
			t.Errorf("SuggestedCommand fields must be non-empty: %+v", s)
		}
	}
}

func TestRun_JSONRoundTrip(t *testing.T) {
	out, err := Run(Input{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	var back Output
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	if back.SchemaVersion != out.SchemaVersion {
		t.Error("schemaVersion roundtrip mismatch")
	}
}
