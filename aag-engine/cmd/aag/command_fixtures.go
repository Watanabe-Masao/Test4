package main

import (
	"flag"
	"fmt"
	"io"

	"aag-engine/internal/fixture"
	"aag-engine/internal/report"
)

// runFixtures は `aag fixtures` サブコマンドの本体。
//
// Phase 3 (= Fixture Runner) で fixture catalog 出力に migrate。
// fixtures/aag/ 配下を discover し、各 fixture の name + expected count を JSON で出力。
//
// Phase 4-8 で各 detector が landing した後、Phase 9 shadow mode で fixture parity を
// 検証する場合は本 subcommand に --compare フラグ等を追加して拡張予定。
func runFixtures(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("fixtures", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "検証対象 repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag fixtures: unexpected positional argument(s): %v\n", fs.Args())
		fmt.Fprintln(stderr, "hint: --repo flag を使用してください (= aag fixtures --repo /path/to/repo)")
		return ExitError
	}

	fixtures, err := fixture.LoadAll(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag fixtures: failed to load fixtures: %v\n", err)
		return ExitError
	}

	summary := &report.FixtureSummary{
		Total:    len(fixtures),
		Fixtures: make([]report.FixtureSummaryEntry, 0, len(fixtures)),
	}
	for _, f := range fixtures {
		summary.Fixtures = append(summary.Fixtures, report.FixtureSummaryEntry{
			Name:          f.Name,
			ExpectedCount: f.ExpectedCount(),
		})
	}

	result := report.NewEmptyRunResult(*repo)
	result.FixtureSummary = summary
	result.Note = "Phase 3 fixture runner: discovered fixtures listed in fixtureSummary. Detector wire-up は Phase 4-8 で landing 予定。"

	out, err := report.RenderJSON(result)
	if err != nil {
		fmt.Fprintf(stderr, "aag fixtures: JSON rendering error: %v\n", err)
		return ExitError
	}

	fmt.Fprintln(stdout, string(out))
	return ExitPass
}
