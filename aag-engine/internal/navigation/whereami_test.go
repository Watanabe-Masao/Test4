// whereami_test.go — Wave 3 #10 (= reposteward-ai-ops-platform、aag where-am-i)
//
// 検証項目:
//   - empty RepoRoot rejection
//   - non-git directory rejection
//   - branch name pattern → activeProject 抽出 (= claude/<projectId>-<slug>)
//   - main / non-claude branch → activeProject = nil
//   - DeriveActiveProjectFromActiveDirs: 既存 active project の longest prefix match
//   - real repo dogfood (= WhereAmI returns ExitPass-equivalent + valid JSON shape)
//   - recommendNextCommand: openObligations > 0 / activeProject 有 / 無 の 3 path
//   - MarshalJSON: HTML escape disabled、indented、roundtrip
package navigation

import (
	"encoding/json"
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

func TestWhereAmI_RejectsEmptyRepoRoot(t *testing.T) {
	_, err := WhereAmI(WhereAmIInput{})
	if err == nil {
		t.Error("expected error for empty input, got nil")
	}
}

func TestWhereAmI_RejectsNonGitDir(t *testing.T) {
	tmp, err := os.MkdirTemp("", "whereami-nongit-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmp)
	_, err = WhereAmI(WhereAmIInput{RepoRoot: tmp})
	if err == nil {
		t.Error("expected error for non-git dir, got nil")
	}
}

func TestWhereAmI_RealRepo(t *testing.T) {
	out, err := WhereAmI(WhereAmIInput{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != WhereAmISchemaVersion {
		t.Errorf("schemaVersion = %q, want %q", out.SchemaVersion, WhereAmISchemaVersion)
	}
	if out.Branch == "" {
		t.Error("Branch must be non-empty")
	}
	if out.RepoHealth == nil {
		t.Error("RepoHealth must be articulated")
	}
	if _, ok := out.RepoHealth["hardGate"]; !ok {
		t.Error("RepoHealth.hardGate must be articulated")
	}
	// improvement B: manifestContext must be articulated when .claude/manifest.json exists
	if out.ManifestContext == nil {
		t.Error("ManifestContext must be articulated when .claude/manifest.json exists")
	}
}

func TestReadManifestContext_MissingFile(t *testing.T) {
	tmp, err := os.MkdirTemp("", "manifest-missing-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmp)
	got := readManifestContext(tmp)
	if got != nil {
		t.Errorf("expected nil for missing manifest, got %+v", got)
	}
}

func TestReadManifestContext_ParseError(t *testing.T) {
	tmp, err := os.MkdirTemp("", "manifest-broken-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmp)
	if err := os.MkdirAll(filepath.Join(tmp, ".claude"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmp, ".claude", "manifest.json"), []byte("{not json"), 0o644); err != nil {
		t.Fatal(err)
	}
	got := readManifestContext(tmp)
	if got != nil {
		t.Errorf("expected nil for invalid JSON, got %+v", got)
	}
}

func TestReadManifestContext_FullShape(t *testing.T) {
	tmp, err := os.MkdirTemp("", "manifest-full-")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmp)
	if err := os.MkdirAll(filepath.Join(tmp, ".claude"), 0o755); err != nil {
		t.Fatal(err)
	}
	body := `{
		"activeContext": {
			"currentFocus": "improvement A-G",
			"loadedRefs": ["a.md", "b.md"],
			"openQuestions": ["q1?"],
			"sessionNotes": "in progress",
			"lastUpdated": "2026-05-06"
		}
	}`
	if err := os.WriteFile(filepath.Join(tmp, ".claude", "manifest.json"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	got := readManifestContext(tmp)
	if got == nil {
		t.Fatal("expected ManifestContextSummary, got nil")
	}
	if got.CurrentFocus == nil || *got.CurrentFocus != "improvement A-G" {
		t.Errorf("currentFocus = %v", got.CurrentFocus)
	}
	if got.LoadedRefsCount != 2 {
		t.Errorf("loadedRefsCount = %d, want 2", got.LoadedRefsCount)
	}
	if got.OpenQuestionsCount != 1 {
		t.Errorf("openQuestionsCount = %d, want 1", got.OpenQuestionsCount)
	}
	if got.SessionNotes == nil || *got.SessionNotes != "in progress" {
		t.Errorf("sessionNotes = %v", got.SessionNotes)
	}
	if got.LastUpdated == nil || *got.LastUpdated != "2026-05-06" {
		t.Errorf("lastUpdated = %v", got.LastUpdated)
	}
}

func TestDeriveActiveProjectFromActiveDirs_RealRepo(t *testing.T) {
	cases := []struct {
		branch string
		want   *string
	}{
		{"claude/reposteward-ai-ops-platform-where-am-i", strPtr("reposteward-ai-ops-platform")},
		{"claude/quick-fixes-trivial", strPtr("quick-fixes")},
		{"claude/taxonomy-v2-extension", strPtr("taxonomy-v2")},
		{"main", nil},
		{"feature/something", nil},
		{"claude/nonexistent-project-xyz", nil},
	}
	for _, tc := range cases {
		t.Run(tc.branch, func(t *testing.T) {
			got := DeriveActiveProjectFromActiveDirs(repoRoot(t), tc.branch)
			if (got == nil) != (tc.want == nil) {
				t.Errorf("got %v, want %v", got, tc.want)
				return
			}
			if got != nil && *got != *tc.want {
				t.Errorf("got %q, want %q", *got, *tc.want)
			}
		})
	}
}

func TestRecommendNextCommand(t *testing.T) {
	pid := "reposteward-ai-ops-platform"
	cases := []struct {
		name            string
		project         *string
		openObligations int
		wantContains    string
	}{
		{"obligations open → fix command", &pid, 3, "docs:generate"},
		{"obligations 0 + project → context", &pid, 0, "aag context --project"},
		{"obligations 0 + no project → stats", nil, 0, "stats files"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := recommendNextCommand(tc.project, tc.openObligations)
			if !strings.Contains(got, tc.wantContains) {
				t.Errorf("got %q, want to contain %q", got, tc.wantContains)
			}
		})
	}
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out := WhereAmIOutput{
		SchemaVersion: WhereAmISchemaVersion,
		Branch:        "main",
		RepoHealth:    map[string]interface{}{"kpi": "60/60 OK"},
		RecommendedNextCommand: "cd app && npm test",
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	if strings.Contains(string(b), "\\u0026") {
		t.Error("expected `&` literal, got escaped")
	}
	if !strings.Contains(string(b), "\n  \"") {
		t.Errorf("expected indented JSON, got: %s", b)
	}
	var got WhereAmIOutput
	if err := json.Unmarshal(b, &got); err != nil {
		t.Fatalf("roundtrip Unmarshal error: %v", err)
	}
	if got.SchemaVersion != WhereAmISchemaVersion {
		t.Errorf("roundtrip schemaVersion mismatch")
	}
}

func strPtr(s string) *string {
	return &s
}
