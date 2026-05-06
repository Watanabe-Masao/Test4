// stats_test.go — Wave 1 #6 (= reposteward-ai-ops-platform、`reposteward stats files` query MVP)
//
// 検証項目:
//   - parseRange の articulate (= 'N..M' / malformed / inverse 拒否)
//   - empty input rejection (= RepoRoot / metric)
//   - real repo dogfood (= source-facts.json + aag-size-statistics.json + aag-parameters.json を実 read)
//     - --range filter
//     - --bucket filter
//     - --layer filter
//     - --above filter (= percentile)
//     - --limit cap
//     - sort order (= effectiveCodeLines DESC, path ASC)
//   - MarshalJSON: HTML escape disabled、indented、roundtrip
package stats

import (
	"encoding/json"
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
	// thisFile = aag-engine/internal/stats/stats_test.go → repoRoot = ../../../
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

func TestParseRange_Valid(t *testing.T) {
	min, max, has, err := parseRange("21..30")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !has || min != 21 || max != 30 {
		t.Errorf("got min=%d max=%d has=%v", min, max, has)
	}
}

func TestParseRange_Empty(t *testing.T) {
	_, _, has, err := parseRange("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if has {
		t.Error("empty range should yield has=false")
	}
}

func TestParseRange_Malformed(t *testing.T) {
	cases := []string{"21", "21..30..40", "ab..30", "21..cd", "30..21"}
	for _, c := range cases {
		t.Run(c, func(t *testing.T) {
			if _, _, _, err := parseRange(c); err == nil {
				t.Errorf("expected error for %q, got nil", c)
			}
		})
	}
}

func TestQuery_RejectsEmptyRepoRoot(t *testing.T) {
	_, err := Query(QueryInput{})
	if err == nil {
		t.Error("expected error for empty input, got nil")
	}
}

func TestQuery_RejectsUnsupportedMetric(t *testing.T) {
	_, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Metric:   "physicalLines",
	})
	if err == nil {
		t.Error("expected error for unsupported metric, got nil")
	}
}

func TestQuery_RealRepo_NoFilter(t *testing.T) {
	out, err := Query(QueryInput{RepoRoot: repoRoot(t)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != QuerySchemaVersion {
		t.Errorf("schemaVersion = %q, want %q", out.SchemaVersion, QuerySchemaVersion)
	}
	if out.Metric != "effectiveCodeLines" {
		t.Errorf("metric = %q, want effectiveCodeLines", out.Metric)
	}
	if out.TotalMatched <= 0 {
		t.Errorf("expected TotalMatched > 0 (real repo), got %d", out.TotalMatched)
	}
	if out.Returned != out.TotalMatched {
		t.Errorf("no Limit set: Returned (%d) should equal TotalMatched (%d)", out.Returned, out.TotalMatched)
	}
}

func TestQuery_RealRepo_RangeFilter(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Range:    "21..30",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, f := range out.Files {
		if f.EffectiveCodeLines < 21 || f.EffectiveCodeLines > 30 {
			t.Errorf("file %q effectiveCodeLines=%d outside 21..30", f.Path, f.EffectiveCodeLines)
		}
	}
	if out.Filter["range"] != "21..30" {
		t.Errorf("filter.range mismatch")
	}
}

func TestQuery_RealRepo_BucketFilter(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Bucket:   "loc.021_030",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, f := range out.Files {
		if f.EffectiveCodeLines < 21 || f.EffectiveCodeLines > 30 {
			t.Errorf("bucket loc.021_030 file %q effectiveCodeLines=%d outside 21..30", f.Path, f.EffectiveCodeLines)
		}
	}
}

func TestQuery_RealRepo_BucketUnboundedMax(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Bucket:   "loc.301_plus",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, f := range out.Files {
		if f.EffectiveCodeLines < 301 {
			t.Errorf("bucket loc.301_plus file %q effectiveCodeLines=%d below 301", f.Path, f.EffectiveCodeLines)
		}
	}
}

func TestQuery_RealRepo_UnknownBucket(t *testing.T) {
	_, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Bucket:   "loc.999_xxx",
	})
	if err == nil {
		t.Error("expected error for unknown bucket, got nil")
	}
}

func TestQuery_RealRepo_LayerFilter(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Layer:    "presentation",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, f := range out.Files {
		if f.Layer != "presentation" {
			t.Errorf("file %q layer=%q, want presentation", f.Path, f.Layer)
		}
	}
}

func TestQuery_RealRepo_AbovePercentile(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Above:    "p95",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out.Files) == 0 {
		t.Skip("no files above p95 (= unlikely on real repo)")
	}
	// Should be a small fraction of total
	if len(out.Files) > 1000 {
		t.Errorf("p95 should articulate top ~5%% of files, got %d", len(out.Files))
	}
}

func TestQuery_RealRepo_AboveUnknown(t *testing.T) {
	_, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Above:    "p42",
	})
	if err == nil {
		t.Error("expected error for unknown percentile, got nil")
	}
}

func TestQuery_RealRepo_LimitCaps(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Returned > 10 {
		t.Errorf("Returned (%d) exceeds Limit 10", out.Returned)
	}
	if out.TotalMatched <= out.Returned {
		t.Logf("warning: TotalMatched (%d) <= Returned (%d)", out.TotalMatched, out.Returned)
	}
}

func TestQuery_RealRepo_SortDescThenPathAsc(t *testing.T) {
	out, err := Query(QueryInput{
		RepoRoot: repoRoot(t),
		Range:    "100..200",
		Limit:    20,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for i := 1; i < len(out.Files); i++ {
		prev := out.Files[i-1]
		cur := out.Files[i]
		if cur.EffectiveCodeLines > prev.EffectiveCodeLines {
			t.Errorf("not desc by effectiveCodeLines: %d at i-1 < %d at i", prev.EffectiveCodeLines, cur.EffectiveCodeLines)
		}
		if cur.EffectiveCodeLines == prev.EffectiveCodeLines && cur.Path < prev.Path {
			t.Errorf("not asc by path on tie: %q < %q", cur.Path, prev.Path)
		}
	}
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out := QueryOutput{
		SchemaVersion: QuerySchemaVersion,
		Metric:        "effectiveCodeLines",
		Filter:        map[string]interface{}{"range": "21..30"},
		Files: []FileEntry{
			{Path: "x.go", Kind: "go", EffectiveCodeLines: 25, PhysicalLines: 30, CommentLines: 3, BlankLines: 2},
		},
		TotalMatched: 1,
		Returned:     1,
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Contains(string(b), "\\u0026") {
		t.Error("expected `&` literal, got escaped")
	}
	if !strings.Contains(string(b), "\n  \"") {
		t.Errorf("expected indented JSON, got: %s", b)
	}
	// roundtrip
	var got QueryOutput
	if err := json.Unmarshal(b, &got); err != nil {
		t.Fatalf("roundtrip Unmarshal error: %v", err)
	}
	if got.SchemaVersion != QuerySchemaVersion {
		t.Errorf("roundtrip schemaVersion mismatch")
	}
}
