// fixture_test.go は Fixture loader + parity comparison primitive の動作 contract を
// unit test で機械検証する。
//
// Phase 3 (= Fixture Runner) で landing する test:
//   - LoadAll が repo の 8 fixture を全 discover (= name + ExpectedCount 一致)
//   - LoadAll の sort order が deterministic (= Name で安定)
//   - Compare が deep equality で Match を判定 (= 要素 + 順序 完全一致)
//   - Compare の Missing / Extra が set-based diff
//   - SummarizeParity が Total / Matched / Mismatched を集約
//   - AllMatched が edge case (= empty / partial) を articulate
//
// 参照:
//   - fixtures/aag/README.md (= 8 fixture 一覧 + 期待 violation count)
//   - app/src/test/guards/detectorResultModuleGuard.test.ts §「fixture corpus parity」 (= TS 側 mirror)
package fixture

import (
	"path/filepath"
	"reflect"
	"runtime"
	"testing"

	"aag-engine/internal/contract"
)

// repoRoot は test 実行時の repo root 絶対 path を runtime.Caller 経由で resolve。
func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// thisFile = aag-engine/internal/fixture/fixture_test.go
	// repoRoot = ../../../
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

// LoadAll: 8 fixture が全 discover される。
func TestLoadAll_DiscoverAll(t *testing.T) {
	fixtures, err := LoadAll(repoRoot(t))
	if err != nil {
		t.Fatalf("LoadAll failed: %v", err)
	}
	if len(fixtures) != 8 {
		names := make([]string, len(fixtures))
		for i, f := range fixtures {
			names[i] = f.Name
		}
		t.Errorf("expected 8 fixtures, got %d: %v", len(fixtures), names)
	}
}

// LoadAll: fixture の Name と ExpectedCount が plan.md / fixtures/aag/README.md と一致。
//
// 各 fixture の expected violation 件数 (= readiness refactor Phase 5 deliverable):
//
//	archive-v2/pass-minimal:                          0
//	archive-v2/fail-missing-restore-command:          1
//	archive-v2/fail-missing-multiple-fields:          3
//	doc-registry/fail-missing-path:                   1
//	generated/fail-stale-metadata:                    1
//	project-lifecycle/pass-active:                    0
//	project-lifecycle/fail-completed-not-archived:    1
//	schema-validation/fail-level-out-of-range:        1
//
// = 計 8 violation (= TS 側 detectorResultModuleGuard の最終 sanity test と一致)。
func TestLoadAll_ExpectedCounts(t *testing.T) {
	fixtures, err := LoadAll(repoRoot(t))
	if err != nil {
		t.Fatalf("LoadAll failed: %v", err)
	}

	wantCounts := map[string]int{
		"archive-v2/pass-minimal":                       0,
		"archive-v2/fail-missing-restore-command":       1,
		"archive-v2/fail-missing-multiple-fields":       3,
		"doc-registry/fail-missing-path":                1,
		"generated/fail-stale-metadata":                 1,
		"project-lifecycle/pass-active":                 0,
		"project-lifecycle/fail-completed-not-archived": 1,
		"schema-validation/fail-level-out-of-range":     1,
	}

	got := make(map[string]int)
	for _, f := range fixtures {
		got[f.Name] = f.ExpectedCount()
	}

	for name, want := range wantCounts {
		if got[name] != want {
			t.Errorf("fixture %q: expected %d violations, got %d", name, want, got[name])
		}
	}

	// 合計件数 sanity (= 0+1+3+0+1+1+1+1 = 8)
	total := 0
	for _, c := range got {
		total += c
	}
	if total != 8 {
		t.Errorf("expected total 8 violations across all fixtures, got %d", total)
	}
}

// LoadAll: sort order が Name で deterministic。
func TestLoadAll_SortDeterministic(t *testing.T) {
	fixtures, err := LoadAll(repoRoot(t))
	if err != nil {
		t.Fatalf("LoadAll failed: %v", err)
	}

	for i := 1; i < len(fixtures); i++ {
		if fixtures[i-1].Name >= fixtures[i].Name {
			t.Errorf("fixtures not sorted: %q >= %q at index %d",
				fixtures[i-1].Name, fixtures[i].Name, i)
		}
	}
}

// LoadAll: 期待 fixture name に POSIX separator が articulate される (= path-helpers 4 規約継承)。
func TestLoadAll_POSIXSeparator(t *testing.T) {
	fixtures, err := LoadAll(repoRoot(t))
	if err != nil {
		t.Fatalf("LoadAll failed: %v", err)
	}
	for _, f := range fixtures {
		if filepath.Separator == '\\' {
			// Windows test runner: ToSlash で `/` に正規化されているか
			if filepath.ToSlash(f.Name) != f.Name {
				t.Errorf("fixture name has non-POSIX separator: %q", f.Name)
			}
		}
	}
}

// LoadAll: nonexistent repo root で error。
func TestLoadAll_NonexistentRoot(t *testing.T) {
	_, err := LoadAll("/tmp/nonexistent-repo-root-aag-engine-test")
	if err == nil {
		t.Error("expected error for nonexistent root, got nil")
	}
}

// Compare: 完全一致で Match=true。
func TestCompare_ExactMatch(t *testing.T) {
	r, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
	})
	fx := Fixture{
		Name:     "test/sample",
		Expected: []contract.DetectorResult{r},
	}
	d := Compare(fx, []contract.DetectorResult{r})
	if !d.Match {
		t.Errorf("expected Match=true for identical inputs")
	}
	if len(d.Missing) != 0 || len(d.Extra) != 0 {
		t.Errorf("expected no missing/extra for match, got missing=%v extra=%v", d.Missing, d.Extra)
	}
}

// Compare: 空 actual + 空 expected で Match=true。
func TestCompare_BothEmpty(t *testing.T) {
	fx := Fixture{Name: "empty/test", Expected: []contract.DetectorResult{}}
	d := Compare(fx, []contract.DetectorResult{})
	if !d.Match {
		t.Errorf("expected Match=true for both empty")
	}
}

// Compare: actual に Missing 要素 (= expected にあって actual にない)。
func TestCompare_Missing(t *testing.T) {
	r, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
	})
	fx := Fixture{
		Name:     "test/sample",
		Expected: []contract.DetectorResult{r},
	}
	d := Compare(fx, []contract.DetectorResult{})
	if d.Match {
		t.Errorf("expected Match=false")
	}
	if len(d.Missing) != 1 {
		t.Errorf("expected 1 missing, got %d: %v", len(d.Missing), d.Missing)
	}
	if len(d.Extra) != 0 {
		t.Errorf("expected 0 extra, got %d", len(d.Extra))
	}
}

// Compare: actual に Extra 要素 (= actual にあって expected にない)。
func TestCompare_Extra(t *testing.T) {
	r, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
	})
	fx := Fixture{
		Name:     "test/sample",
		Expected: []contract.DetectorResult{},
	}
	d := Compare(fx, []contract.DetectorResult{r})
	if d.Match {
		t.Errorf("expected Match=false")
	}
	if len(d.Missing) != 0 {
		t.Errorf("expected 0 missing, got %d", len(d.Missing))
	}
	if len(d.Extra) != 1 {
		t.Errorf("expected 1 extra, got %d: %v", len(d.Extra), d.Extra)
	}
}

// Compare: 順序違いは Match=false (= 順序維持を要求)。
func TestCompare_OrderMismatch(t *testing.T) {
	r1, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-A",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
	})
	r2, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-B",
		DetectionType: "x",
		SourceFile:    "b.ts",
		Severity:      contract.SeverityGate,
	})
	fx := Fixture{
		Name:     "test/sample",
		Expected: []contract.DetectorResult{r1, r2},
	}
	// 順序違い: r2, r1
	d := Compare(fx, []contract.DetectorResult{r2, r1})
	if d.Match {
		t.Errorf("expected Match=false for order mismatch")
	}
	// 但し set-based では Missing / Extra 0 (= 集合的には等価)
	if len(d.Missing) != 0 || len(d.Extra) != 0 {
		t.Errorf("expected set-based diff to show 0 missing/extra (same set, different order), got missing=%d extra=%d",
			len(d.Missing), len(d.Extra))
	}
}

// SummarizeParity: 全 match で AllMatched=true。
func TestSummarizeParity_AllMatch(t *testing.T) {
	diffs := []Diff{
		{FixtureName: "a", Match: true},
		{FixtureName: "b", Match: true},
	}
	s := SummarizeParity(diffs)
	if s.Total != 2 || s.Matched != 2 || s.Mismatched != 0 {
		t.Errorf("summary mismatch: %+v", s)
	}
	if !s.AllMatched() {
		t.Errorf("AllMatched should be true")
	}
}

// SummarizeParity: 部分 mismatch で AllMatched=false。
func TestSummarizeParity_PartialMatch(t *testing.T) {
	diffs := []Diff{
		{FixtureName: "a", Match: true},
		{FixtureName: "b", Match: false},
	}
	s := SummarizeParity(diffs)
	if s.Total != 2 || s.Matched != 1 || s.Mismatched != 1 {
		t.Errorf("summary mismatch: %+v", s)
	}
	if s.AllMatched() {
		t.Errorf("AllMatched should be false for partial match")
	}
}

// SummarizeParity: 空 input で AllMatched=false (= total > 0 を要求)。
func TestSummarizeParity_Empty(t *testing.T) {
	s := SummarizeParity(nil)
	if s.Total != 0 || s.Matched != 0 || s.Mismatched != 0 {
		t.Errorf("empty summary should be all-zero, got %+v", s)
	}
	if s.AllMatched() {
		t.Errorf("AllMatched should be false for empty input")
	}
}

// LoadAll で読んだ expected が contract.DetectorResult として valid。
//
// canonical schema 整合性: ruleId / detectionType / sourceFile / severity が articulate
// されているはず (= fixture corpus 自体の sanity)。
func TestLoadAll_ExpectedAreValidDetectorResults(t *testing.T) {
	fixtures, err := LoadAll(repoRoot(t))
	if err != nil {
		t.Fatalf("LoadAll failed: %v", err)
	}
	for _, f := range fixtures {
		for i, r := range f.Expected {
			if r.RuleId == "" {
				t.Errorf("fixture %q expected[%d]: ruleId empty", f.Name, i)
			}
			if r.DetectionType == "" {
				t.Errorf("fixture %q expected[%d]: detectionType empty", f.Name, i)
			}
			if r.SourceFile == "" {
				t.Errorf("fixture %q expected[%d]: sourceFile empty", f.Name, i)
			}
			if !r.Severity.IsValid() {
				t.Errorf("fixture %q expected[%d]: severity %q invalid", f.Name, i, r.Severity)
			}
		}
	}
}

// Compare: Diff の FixtureName が Fixture.Name と一致。
func TestCompare_PreservesFixtureName(t *testing.T) {
	fx := Fixture{Name: "archive-v2/pass-minimal", Expected: []contract.DetectorResult{}}
	d := Compare(fx, []contract.DetectorResult{})
	if d.FixtureName != "archive-v2/pass-minimal" {
		t.Errorf("FixtureName mismatch: %q", d.FixtureName)
	}
}

// reflect.DeepEqual sanity: pointer field を含む DetectorResult の equality。
func TestCompare_PointerFieldEquality(t *testing.T) {
	evidence := "sample"
	r1, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
		Evidence:      &evidence,
	})
	// 同 content の別 pointer
	evidence2 := "sample"
	r2, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
		Evidence:      &evidence2,
	})
	if !reflect.DeepEqual(r1, r2) {
		t.Errorf("DetectorResult with same pointer-deref content should be DeepEqual")
	}
}
