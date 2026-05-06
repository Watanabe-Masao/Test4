package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/stats"
)

// runStats は `aag stats <action>` の dispatcher (= Wave 1 #6、reposteward-ai-ops-platform)。
//
// MVP では files action のみ対応。後続で `stats size` (= summary view) 等の追加候補。
func runStats(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag stats: action 不足 (= 'files' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag stats files [--range N..M | --bucket ID | --layer NAME | --above PNN] [--limit N]")
		return ExitError
	}
	switch args[0] {
	case "files":
		return runStatsFiles(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag stats: unknown action %q (= 'files' のみ対応)\n", args[0])
		return ExitError
	}
}

// runStatsFiles は `aag stats files` の本体 (= Wave 1 #6 deliverable)。
//
// references/04-tracking/generated/source-facts.json (Wave 1 #4) +
// references/04-tracking/generated/aag-size-statistics.json (Wave 1 #5) +
// aag/parameters/aag-parameters.json (Wave 1 #3) を read-only に消費し、
// effectiveCodeLines を `--range` / `--bucket` / `--layer` / `--above` で filter
// した file 一覧を JSON で stdout に出力。
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則 3):
//   - read-only: generated artifact / parameters を read-only に消費、書き換えなし
//   - JSON-first: 出力 JSON のみ、Human UI なし
func runStatsFiles(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("stats files", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	metric := fs.String("metric", "effectiveCodeLines", "size metric")
	rangeFlag := fs.String("range", "", "inclusive range 'N..M' (= e.g., '21..30')")
	bucket := fs.String("bucket", "", "bucket id (= e.g., 'loc.021_030')")
	layer := fs.String("layer", "", "layer 完全一致 (= e.g., 'presentation')")
	above := fs.String("above", "", "percentile 超過 (= 'p50' / 'p75' / 'p90' / 'p95' / 'p99')")
	limit := fs.Int("limit", 0, "上位 N 件に cap (= 0 = unlimited)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag stats files: unexpected positional argument(s): %v\n", fs.Args())
		fmt.Fprintln(stderr, "hint: --range / --bucket / --layer / --above / --limit / --repo flag を使用してください")
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag stats files: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := stats.Query(stats.QueryInput{
		RepoRoot: repoAbs,
		Metric:   *metric,
		Range:    *rangeFlag,
		Bucket:   *bucket,
		Layer:    *layer,
		Above:    *above,
		Limit:    *limit,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag stats files: %v\n", err)
		return ExitError
	}

	bytes, err := stats.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag stats files: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(bytes))
	return ExitPass
}
