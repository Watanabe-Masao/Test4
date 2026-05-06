// comments_test.go — Wave 4 #16 (= reposteward-ai-ops-platform、aag comments list)
package commentscan

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

func TestList_RejectsEmptyInput(t *testing.T) {
	if _, err := List(ListInput{}); err == nil {
		t.Error("expected error for empty input")
	}
	if _, err := List(ListInput{RepoRoot: "/tmp"}); err == nil {
		t.Error("expected error for missing kind")
	}
}

func TestList_RejectsInvalidKind(t *testing.T) {
	_, err := List(ListInput{RepoRoot: "/tmp", Kind: "bogus"})
	if err == nil {
		t.Error("expected error for invalid kind")
	}
}

func TestIsValidKind(t *testing.T) {
	for _, k := range []string{"todo", "suppression", "expired"} {
		if !IsValidKind(k) {
			t.Errorf("expected %q valid", k)
		}
	}
	for _, k := range []string{"", "TODO", "fixme", "bogus"} {
		if IsValidKind(k) {
			t.Errorf("expected %q invalid", k)
		}
	}
}

func TestList_TodoKind_DetectsAndArticulatesMissing(t *testing.T) {
	tmp := t.TempDir()
	makeFile(t, tmp, "app/src/foo.ts", strings.Join([]string{
		"// TODO: refactor this — projectId: foo-bar",
		"// FIXME: needs review",
		"const x = 1",
	}, "\n"))

	out, err := List(ListInput{RepoRoot: tmp, Kind: KindTodo})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out.Items) != 2 {
		t.Fatalf("expected 2 todo items, got %d: %v", len(out.Items), out.Items)
	}
	// First TODO has projectId
	if len(out.Items[0].MissingFields) != 0 {
		t.Errorf("first item should have no missing fields, got: %v", out.Items[0].MissingFields)
	}
	if !contains(out.Items[0].Annotations, "projectId") {
		t.Errorf("first item should annotate projectId")
	}
	// Second FIXME has neither projectId nor reviewAfter
	if len(out.Items[1].MissingFields) == 0 {
		t.Errorf("second item should articulate missing fields, got none")
	}
}

func TestList_SuppressionKind_DetectsMissingReasonExpiresAt(t *testing.T) {
	tmp := t.TempDir()
	makeFile(t, tmp, "app/src/foo.ts", strings.Join([]string{
		"// eslint-disable-next-line no-console reason: logging only expiresAt: 2099-12-31",
		"// @ts-ignore",
		"const y = 2",
	}, "\n"))

	out, err := List(ListInput{RepoRoot: tmp, Kind: KindSuppression})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out.Items) != 2 {
		t.Fatalf("expected 2 suppression items, got %d", len(out.Items))
	}
	// First: has reason + expiresAt
	if len(out.Items[0].MissingFields) != 0 {
		t.Errorf("first item should have no missing fields, got: %v", out.Items[0].MissingFields)
	}
	// Second: missing both
	if len(out.Items[1].MissingFields) != 2 {
		t.Errorf("second item should miss both reason and expiresAt, got: %v", out.Items[1].MissingFields)
	}
}

func TestList_ExpiredKind_DetectsPastDates(t *testing.T) {
	tmp := t.TempDir()
	makeFile(t, tmp, "app/src/foo.ts", strings.Join([]string{
		"// expiresAt: 2020-01-01 — should be flagged",
		"// expiresAt: 2099-12-31 — should NOT be flagged",
		"// no expiresAt here",
	}, "\n"))

	today, _ := time.Parse("2006-01-02", "2026-05-06")
	out, err := List(ListInput{RepoRoot: tmp, Kind: KindExpired, Today: today})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out.Items) != 1 {
		t.Fatalf("expected 1 expired item, got %d: %v", len(out.Items), out.Items)
	}
	if out.Items[0].ExpiresAt != "2020-01-01" {
		t.Errorf("expected ExpiresAt=2020-01-01, got %q", out.Items[0].ExpiresAt)
	}
}

func TestList_RealRepo_TodoKind_NotEmpty(t *testing.T) {
	out, err := List(ListInput{RepoRoot: repoRoot(t), Kind: KindTodo})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != ListSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.TotalScanned == 0 {
		t.Error("TotalScanned should be > 0 on real repo")
	}
}

func TestList_SkipsNodeModulesAndDist(t *testing.T) {
	tmp := t.TempDir()
	makeFile(t, tmp, "app/src/foo.ts", "// TODO: keep me\n")
	makeFile(t, tmp, "app/src/node_modules/lib/index.ts", "// TODO: skip me\n")
	makeFile(t, tmp, "dist/bundle.ts", "// TODO: skip me\n")

	out, _ := List(ListInput{RepoRoot: tmp, Kind: KindTodo})
	for _, item := range out.Items {
		if strings.Contains(item.Path, "node_modules") || strings.Contains(item.Path, "dist") {
			t.Errorf("should skip node_modules / dist, got: %s", item.Path)
		}
	}
}

func makeFile(t *testing.T, root, relPath, content string) {
	t.Helper()
	abs := filepath.Join(root, relPath)
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(abs, []byte(content), 0o644); err != nil {
		t.Fatal(err)
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
