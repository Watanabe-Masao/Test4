// obligation_test.go — Wave 5 #20 (= reposteward-ai-ops-platform、aag obligation check)
package obligation

import (
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

func TestCheck_RejectsEmptyInput(t *testing.T) {
	if _, err := Check(CheckInput{}); err == nil {
		t.Error("expected error for empty input")
	}
}

func TestPathMatchesTrigger(t *testing.T) {
	cases := []struct {
		file, trigger string
		want          bool
	}{
		// exact match
		{"docs/contracts/aag/detector-result.schema.json", "docs/contracts/aag/detector-result.schema.json", true},
		// prefix match (no extension on trigger = directory)
		{"fixtures/aag/foo.json", "fixtures/aag", true},
		{"fixtures/aag/sub/bar.json", "fixtures/aag", true},
		// glob match
		{"fixtures/aag/sub/x.json", "fixtures/aag/**", true},
		// no match
		{"app/src/foo.ts", "docs/contracts/aag/detector-result.schema.json", false},
		{"docs/foo.md", "docs/contracts/aag", false},
	}
	for _, tc := range cases {
		t.Run(tc.file+"/"+tc.trigger, func(t *testing.T) {
			got := pathMatchesTrigger(tc.file, tc.trigger)
			if got != tc.want {
				t.Errorf("pathMatchesTrigger(%q, %q) = %v, want %v", tc.file, tc.trigger, got, tc.want)
			}
		})
	}
}

func TestMatchContracts_Synthetic(t *testing.T) {
	contracts := []premiseContract{
		{
			Id:    "PC-TEST-A",
			Label: "Test contract A",
			Trigger: struct {
				Paths []string `json:"paths"`
			}{Paths: []string{"docs/contracts/aag/test-a.schema.json"}},
			Requires: []struct {
				Path      string `json:"path"`
				Mode      string `json:"mode"`
				Rationale string `json:"rationale,omitempty"`
			}{
				{Path: "tests/test-a.test.ts", Mode: "must-pass", Rationale: "verify A"},
			},
		},
	}
	files := []string{"docs/contracts/aag/test-a.schema.json", "unrelated/file.ts"}
	out := matchContracts(contracts, files)
	if len(out) != 1 {
		t.Fatalf("expected 1 matched contract, got %d", len(out))
	}
	if out[0].ContractId != "PC-TEST-A" {
		t.Errorf("contractId mismatch: %q", out[0].ContractId)
	}
	if len(out[0].MatchedTriggers) != 1 {
		t.Errorf("expected 1 trigger match")
	}
	if len(out[0].Requirements) != 1 {
		t.Errorf("expected 1 requirement, got %d", len(out[0].Requirements))
	}
}

func TestMatchContracts_NoTriggerNoMatch(t *testing.T) {
	contracts := []premiseContract{
		{
			Id: "PC-NOPE",
			Trigger: struct {
				Paths []string `json:"paths"`
			}{Paths: []string{"never/triggered.ts"}},
		},
	}
	files := []string{"app/src/foo.ts"}
	out := matchContracts(contracts, files)
	if len(out) != 0 {
		t.Errorf("expected 0 matches, got %d", len(out))
	}
}

func TestCheck_RealRepo_LoadsContracts(t *testing.T) {
	contracts, err := loadPremiseContracts(repoRoot(t))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(contracts) == 0 {
		t.Error("expected non-empty contracts (= Wave 5 #19 で 5 件 articulate)")
	}
	for _, c := range contracts {
		if !strings.HasPrefix(c.Id, "PC-") {
			t.Errorf("contract id should match PC-<...> pattern, got: %q", c.Id)
		}
	}
}

func TestCheck_RealRepo_DefaultBaseHead(t *testing.T) {
	out, err := Check(CheckInput{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Skipf("git diff main..HEAD not available: %v", err)
	}
	if out.SchemaVersion != CheckSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Base != "main" || out.Head != "HEAD" {
		t.Errorf("default base/head not echoed")
	}
	if out.Stats == nil {
		t.Error("Stats must be non-nil")
	}
}

func TestSummarize(t *testing.T) {
	if got := summarize(map[string]int{"changedFiles": 0}, 5); !strings.Contains(got, "No files changed") {
		t.Errorf("empty changes summary unexpected: %q", got)
	}
	got := summarize(map[string]int{
		"changedFiles":     3,
		"matchedContracts": 2,
		"requirements":     5,
	}, 10)
	if !strings.Contains(got, "3 changed file") || !strings.Contains(got, "2/10 premise") || !strings.Contains(got, "5 requirement") {
		t.Errorf("summary format unexpected: %q", got)
	}
}
