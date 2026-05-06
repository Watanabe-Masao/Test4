// Package stats holds the `aag stats files` query implementation.
//
// Wave 1 #6 (= reposteward-ai-ops-platform、`reposteward stats files` query MVP)
// で landing。Wave 1 #4 SourceFacts (= references/04-tracking/generated/source-facts.json)
// と Wave 1 #5 Effective LOC Statistics (= aag-size-statistics.json) を入力に、
// `--metric effectiveCodeLines --range N..M` / `--bucket loc.021_030` /
// `--layer presentation` / `--above p95` 等の filter を適用して file 詳細を返す
// read-only query。
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
//   1. JSON-first (= output は JSON、Human UI 出さない)
//   3. Read-only first (= source-facts / statistics の generated artifact を read-only に消費)
//   6. Additive-only (= 既存 detector / TS guard / docs:generate 不変、新 query subcommand のみ追加)
//
// 参照:
//   - tools/architecture-health/src/facts/source-facts.ts (= TS-side collector source、Wave 1 #4)
//   - tools/architecture-health/src/facts/source-facts-statistics.ts (= TS-side statistics source、Wave 1 #5)
//   - aag/parameters/aag-parameters.json (= bucket 定義の入力 source、Wave 1 #3)
//   - docs/contracts/aag/source-facts.schema.json (= input contract)
//   - docs/contracts/aag/aag-size-statistics.schema.json (= input contract)
package stats

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// input contracts (mirrors of TS-side schema)
// ───────────────────────────────────────────────────────────────────────

// SourceFact mirrors a single entry in source-facts.json `facts[]`.
//
// Note: schema-level fields beyond what we query are accepted but ignored
// (= encoding/json default behavior for unknown fields)。
type SourceFact struct {
	Path               string `json:"path"`
	Kind               string `json:"kind"`
	Layer              *string `json:"layer"`
	PhysicalLines      int    `json:"physicalLines"`
	BlankLines         int    `json:"blankLines"`
	CommentLines       int    `json:"commentLines"`
	EffectiveCodeLines int    `json:"effectiveCodeLines"`
}

// SourceFactsBundle mirrors source-facts.json top-level.
type SourceFactsBundle struct {
	SchemaVersion string       `json:"schemaVersion"`
	GeneratedAt   string       `json:"generatedAt"`
	Facts         []SourceFact `json:"facts"`
}

// SizeStatisticsBundle mirrors aag-size-statistics.json (subset we query).
type SizeStatisticsBundle struct {
	SchemaVersion string                 `json:"schemaVersion"`
	Metric        string                 `json:"metric"`
	Summary       SizeStatisticsSummary  `json:"summary"`
	ByBucket      []BucketDistribution   `json:"byBucket"`
}

type SizeStatisticsSummary struct {
	P50  int     `json:"p50"`
	P75  int     `json:"p75"`
	P90  int     `json:"p90"`
	P95  int     `json:"p95"`
	P99  int     `json:"p99"`
	Max  int     `json:"max"`
	Mean float64 `json:"mean"`
}

type BucketDistribution struct {
	Id    string `json:"id"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

// ParameterBucket mirrors aag-parameters.json `codeSize.buckets[]`。
type ParameterBucket struct {
	Id    string `json:"id"`
	Label string `json:"label"`
	Min   int    `json:"min"`
	Max   *int   `json:"max"`
}

type aagParameters struct {
	CodeSize struct {
		Metric  string            `json:"metric"`
		Buckets []ParameterBucket `json:"buckets"`
	} `json:"codeSize"`
}

// ───────────────────────────────────────────────────────────────────────
// query
// ───────────────────────────────────────────────────────────────────────

// QueryInput articulates the filter applied to the SourceFacts.
type QueryInput struct {
	RepoRoot string

	// Metric is the size metric to query. Currently only "effectiveCodeLines".
	// Empty defaults to "effectiveCodeLines".
	Metric string

	// Range is the inclusive range "N..M" (e.g., "21..30"). Empty = no range filter.
	Range string

	// Bucket is the bucket id (e.g., "loc.021_030"). Empty = no bucket filter.
	// When set, read aag-parameters.json to resolve min/max。
	Bucket string

	// Layer filters by exact layer match (e.g., "presentation"). Empty = no filter.
	Layer string

	// Above selects files whose effectiveCodeLines exceed the named percentile
	// (e.g., "p95"). Empty = no filter. Resolves from aag-size-statistics.json。
	Above string

	// Limit caps the result to N entries. 0 = unlimited.
	Limit int
}

// FileEntry is the per-file item returned by Query.
type FileEntry struct {
	Path               string `json:"path"`
	Kind               string `json:"kind"`
	Layer              string `json:"layer,omitempty"`
	EffectiveCodeLines int    `json:"effectiveCodeLines"`
	PhysicalLines      int    `json:"physicalLines"`
	CommentLines       int    `json:"commentLines"`
	BlankLines         int    `json:"blankLines"`
}

// QueryOutput is the JSON shape emitted to stdout by `aag stats files`.
type QueryOutput struct {
	SchemaVersion string                 `json:"schemaVersion"`
	Metric        string                 `json:"metric"`
	Filter        map[string]interface{} `json:"filter"`
	TotalMatched  int                    `json:"totalMatched"`
	Returned      int                    `json:"returned"`
	Files         []FileEntry            `json:"files"`
}

// QuerySchemaVersion is the const articulated in the `schemaVersion` field of
// QueryOutput.
const QuerySchemaVersion = "stats-files-query-v1"

// Query reads the generated artifacts and filters facts according to the input.
//
// Sort order: descending by effectiveCodeLines, then ascending by path.
//
// Errors:
//   - source-facts.json missing / invalid → error
//   - --bucket given but aag-parameters.json missing → error
//   - --above given but aag-size-statistics.json missing → error
//   - --range malformed → error
//   - --metric not "effectiveCodeLines" → error
func Query(input QueryInput) (QueryOutput, error) {
	if input.RepoRoot == "" {
		return QueryOutput{}, fmt.Errorf("Query: RepoRoot must be set")
	}

	metric := input.Metric
	if metric == "" {
		metric = "effectiveCodeLines"
	}
	if metric != "effectiveCodeLines" {
		return QueryOutput{}, fmt.Errorf("Query: --metric must be 'effectiveCodeLines' (got %q、v2 で複数 metric 化候補)", metric)
	}

	bundle, err := loadSourceFacts(input.RepoRoot)
	if err != nil {
		return QueryOutput{}, err
	}

	filter := map[string]interface{}{}
	filter["metric"] = metric

	rangeMin, rangeMax, hasRange, err := parseRange(input.Range)
	if err != nil {
		return QueryOutput{}, err
	}
	if hasRange {
		filter["range"] = input.Range
	}

	var bucketMin, bucketMax int
	hasBucket := input.Bucket != ""
	if hasBucket {
		b, err := resolveBucket(input.RepoRoot, input.Bucket)
		if err != nil {
			return QueryOutput{}, err
		}
		bucketMin = b.Min
		if b.Max == nil {
			bucketMax = -1 // -1 marker = no upper bound
		} else {
			bucketMax = *b.Max
		}
		filter["bucket"] = input.Bucket
	}

	hasLayer := input.Layer != ""
	if hasLayer {
		filter["layer"] = input.Layer
	}

	var aboveThreshold int
	hasAbove := input.Above != ""
	if hasAbove {
		t, err := resolvePercentileThreshold(input.RepoRoot, input.Above)
		if err != nil {
			return QueryOutput{}, err
		}
		aboveThreshold = t
		filter["above"] = input.Above
	}

	matched := make([]FileEntry, 0, len(bundle.Facts))
	for _, f := range bundle.Facts {
		v := f.EffectiveCodeLines
		if hasRange && (v < rangeMin || v > rangeMax) {
			continue
		}
		if hasBucket {
			if v < bucketMin {
				continue
			}
			if bucketMax >= 0 && v > bucketMax {
				continue
			}
		}
		if hasLayer {
			if f.Layer == nil || *f.Layer != input.Layer {
				continue
			}
		}
		if hasAbove && v <= aboveThreshold {
			continue
		}
		layer := ""
		if f.Layer != nil {
			layer = *f.Layer
		}
		matched = append(matched, FileEntry{
			Path:               f.Path,
			Kind:               f.Kind,
			Layer:              layer,
			EffectiveCodeLines: v,
			PhysicalLines:      f.PhysicalLines,
			CommentLines:       f.CommentLines,
			BlankLines:         f.BlankLines,
		})
	}

	sort.SliceStable(matched, func(i, j int) bool {
		if matched[i].EffectiveCodeLines != matched[j].EffectiveCodeLines {
			return matched[i].EffectiveCodeLines > matched[j].EffectiveCodeLines
		}
		return matched[i].Path < matched[j].Path
	})

	totalMatched := len(matched)
	if input.Limit > 0 && len(matched) > input.Limit {
		matched = matched[:input.Limit]
	}

	return QueryOutput{
		SchemaVersion: QuerySchemaVersion,
		Metric:        metric,
		Filter:        filter,
		TotalMatched:  totalMatched,
		Returned:      len(matched),
		Files:         matched,
	}, nil
}

// MarshalJSON returns the indented JSON serialization used by the CLI.
//
// HTML escape is disabled to keep `&` / `<` / `>` literal (= AI consumer 読了性、
// Wave 1 #2 task prepare と同 idiom)。
func MarshalJSON(out QueryOutput) ([]byte, error) {
	var buf strings.Builder
	enc := json.NewEncoder(&jsonStringWriter{builder: &buf})
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		return nil, err
	}
	s := buf.String()
	// trailing newline from Encoder.Encode → strip for MarshalIndent compatibility
	if len(s) > 0 && s[len(s)-1] == '\n' {
		s = s[:len(s)-1]
	}
	return []byte(s), nil
}

// jsonStringWriter wraps strings.Builder as an io.Writer for json.Encoder.
type jsonStringWriter struct {
	builder *strings.Builder
}

func (w *jsonStringWriter) Write(p []byte) (int, error) {
	return w.builder.Write(p)
}

// ───────────────────────────────────────────────────────────────────────
// internals
// ───────────────────────────────────────────────────────────────────────

func loadSourceFacts(repoRoot string) (SourceFactsBundle, error) {
	path := filepath.Join(repoRoot, "references", "04-tracking", "generated", "source-facts.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return SourceFactsBundle{}, fmt.Errorf("Query: source-facts.json not readable at %s: %w (= hint: run 'npx tsx tools/architecture-health/src/facts/source-facts-cli.ts')", path, err)
	}
	var b SourceFactsBundle
	if err := json.Unmarshal(raw, &b); err != nil {
		return SourceFactsBundle{}, fmt.Errorf("Query: source-facts.json parse error: %w", err)
	}
	if b.SchemaVersion != "source-facts-v1" {
		return SourceFactsBundle{}, fmt.Errorf("Query: source-facts.json schemaVersion must be 'source-facts-v1' (got %q)", b.SchemaVersion)
	}
	return b, nil
}

func loadStatistics(repoRoot string) (SizeStatisticsBundle, error) {
	path := filepath.Join(repoRoot, "references", "04-tracking", "generated", "aag-size-statistics.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return SizeStatisticsBundle{}, fmt.Errorf("Query: aag-size-statistics.json not readable at %s: %w (= hint: run 'npx tsx tools/architecture-health/src/facts/source-facts-statistics-cli.ts')", path, err)
	}
	var b SizeStatisticsBundle
	if err := json.Unmarshal(raw, &b); err != nil {
		return SizeStatisticsBundle{}, fmt.Errorf("Query: aag-size-statistics.json parse error: %w", err)
	}
	if b.SchemaVersion != "aag-size-statistics-v1" {
		return SizeStatisticsBundle{}, fmt.Errorf("Query: aag-size-statistics.json schemaVersion must be 'aag-size-statistics-v1' (got %q)", b.SchemaVersion)
	}
	return b, nil
}

func loadParameters(repoRoot string) (aagParameters, error) {
	path := filepath.Join(repoRoot, "aag", "parameters", "aag-parameters.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return aagParameters{}, fmt.Errorf("Query: aag-parameters.json not readable at %s: %w", path, err)
	}
	var p aagParameters
	if err := json.Unmarshal(raw, &p); err != nil {
		return aagParameters{}, fmt.Errorf("Query: aag-parameters.json parse error: %w", err)
	}
	return p, nil
}

func parseRange(s string) (min, max int, hasRange bool, err error) {
	if s == "" {
		return 0, 0, false, nil
	}
	parts := strings.SplitN(s, "..", 2)
	if len(parts) != 2 {
		return 0, 0, false, fmt.Errorf("Query: --range must be 'N..M' (got %q)", s)
	}
	min, err = strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, false, fmt.Errorf("Query: --range min not integer: %w", err)
	}
	max, err = strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, false, fmt.Errorf("Query: --range max not integer: %w", err)
	}
	if min > max {
		return 0, 0, false, fmt.Errorf("Query: --range min (%d) must be <= max (%d)", min, max)
	}
	return min, max, true, nil
}

func resolveBucket(repoRoot, bucketId string) (ParameterBucket, error) {
	params, err := loadParameters(repoRoot)
	if err != nil {
		return ParameterBucket{}, err
	}
	for _, b := range params.CodeSize.Buckets {
		if b.Id == bucketId {
			return b, nil
		}
	}
	known := make([]string, 0, len(params.CodeSize.Buckets))
	for _, b := range params.CodeSize.Buckets {
		known = append(known, b.Id)
	}
	return ParameterBucket{}, fmt.Errorf("Query: --bucket %q not found in aag-parameters.json (known: %s)", bucketId, strings.Join(known, ", "))
}

func resolvePercentileThreshold(repoRoot, name string) (int, error) {
	stats, err := loadStatistics(repoRoot)
	if err != nil {
		return 0, err
	}
	switch strings.ToLower(name) {
	case "p50":
		return stats.Summary.P50, nil
	case "p75":
		return stats.Summary.P75, nil
	case "p90":
		return stats.Summary.P90, nil
	case "p95":
		return stats.Summary.P95, nil
	case "p99":
		return stats.Summary.P99, nil
	}
	return 0, fmt.Errorf("Query: --above must be 'p50' / 'p75' / 'p90' / 'p95' / 'p99' (got %q)", name)
}
