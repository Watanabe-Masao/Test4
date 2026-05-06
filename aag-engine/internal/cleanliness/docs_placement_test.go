// docs_placement_test.go — Wave 4 #17 (= reposteward-ai-ops-platform、aag docs placement-check)
package cleanliness

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPlacementCheck_RejectsEmptyInput(t *testing.T) {
	if _, err := PlacementCheck(PlacementInput{}); err == nil {
		t.Error("expected error for empty input")
	}
}

func TestPlacementCheck_RealRepo(t *testing.T) {
	out, err := PlacementCheck(PlacementInput{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != PlacementSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if len(out.Conventions) != 6 {
		t.Errorf("expected 6 conventions, got %d", len(out.Conventions))
	}
	if out.Stats == nil {
		t.Error("Stats must be non-nil")
	}
}

func TestScanMisplacedSchemas_SyntheticBad(t *testing.T) {
	tmp := t.TempDir()
	makeSchemaFile(t, tmp, "app/src/foo.schema.json", `{}`)
	makeSchemaFile(t, tmp, "docs/contracts/correct.schema.json", `{}`)
	makeSchemaFile(t, tmp, "fixtures/aag/test.schema.json", `{}`)

	out := scanMisplacedSchemas(tmp)
	if len(out) != 1 {
		t.Fatalf("expected 1 violation (= app/src/foo.schema.json), got %d: %v", len(out), out)
	}
	if !strings.Contains(out[0].Path, "app/src/foo.schema.json") {
		t.Errorf("got path %q, want app/src/foo.schema.json", out[0].Path)
	}
}

func TestScanMisplacedGeneratedMd_SyntheticBad(t *testing.T) {
	tmp := t.TempDir()
	makeSchemaFile(t, tmp, "references/04-tracking/generated/correct.generated.md", "# generated")
	makeSchemaFile(t, tmp, "docs/generated/correct.generated.json", "{}")
	makeSchemaFile(t, tmp, "projects/active/foo/rogue.generated.md", "# misplaced")
	makeSchemaFile(t, tmp, "fixtures/aag/test.generated.md", "# fixture allowed")

	out := scanMisplacedGeneratedMd(tmp)
	if len(out) != 1 {
		t.Fatalf("expected 1 violation (= projects/active/foo/rogue.generated.md), got %d: %v", len(out), out)
	}
	if !strings.Contains(out[0].Path, "rogue.generated.md") {
		t.Errorf("got path %q, want rogue.generated.md", out[0].Path)
	}
}

func TestPlacementCheck_SyntheticEnd2End(t *testing.T) {
	tmp := t.TempDir()
	// 1 misplaced schema + 1 misplaced generated.md
	makeSchemaFile(t, tmp, "app/src/bad.schema.json", `{}`)
	makeSchemaFile(t, tmp, "projects/active/foo/rogue.generated.md", "# bad")
	// 1 correctly placed each
	makeSchemaFile(t, tmp, "docs/contracts/ok.schema.json", `{}`)
	makeSchemaFile(t, tmp, "references/04-tracking/generated/ok.generated.md", "# ok")

	out, err := PlacementCheck(PlacementInput{RepoRoot: tmp})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Stats["total"] != 2 {
		t.Errorf("expected 2 total violations, got %d: %v", out.Stats["total"], out.Violations)
	}
	if out.Stats[KindSchemaMisplaced] != 1 {
		t.Errorf("expected 1 schema-misplaced, got %d", out.Stats[KindSchemaMisplaced])
	}
	if out.Stats[KindGeneratedMisplaced] != 1 {
		t.Errorf("expected 1 generated-misplaced, got %d", out.Stats[KindGeneratedMisplaced])
	}
}

func TestIsUnder(t *testing.T) {
	cases := []struct {
		path, dir string
		want      bool
	}{
		{"docs/contracts/x.json", "docs/contracts", true},
		{"docs/contracts/sub/x.json", "docs/contracts", true},
		{"docs/contracts", "docs/contracts", false},  // exact match は under ではない
		{"docs/contracts-other/x", "docs/contracts", false},
		{"app/src/x", "docs/contracts", false},
	}
	for _, tc := range cases {
		t.Run(tc.path+"/"+tc.dir, func(t *testing.T) {
			got := isUnder(tc.path, tc.dir)
			if got != tc.want {
				t.Errorf("isUnder(%q, %q) = %v, want %v", tc.path, tc.dir, got, tc.want)
			}
		})
	}
}

func makeSchemaFile(t *testing.T, root, relPath, content string) {
	t.Helper()
	abs := filepath.Join(root, relPath)
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(abs, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
