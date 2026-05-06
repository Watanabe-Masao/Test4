package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"

	"aag-engine/internal/report"
	"aag-engine/internal/shadow"
)

// runShadow は `aag shadow` サブコマンドの本体 (= Phase 9 deliverable)。
//
// 5 detector × 8 fixture = 40 parity 検証点を全 dispatch、shadow.Summary を JSON で出力。
// fixture parity 100% (= AllMatched) なら ExitPass、mismatch / skipped があれば ExitFail。
//
// CI advisory (= Phase 10) で本 subcommand を non-blocking 実行する base。
func runShadow(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("shadow", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "検証対象 repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag shadow: unexpected positional argument(s): %v\n", fs.Args())
		fmt.Fprintln(stderr, "hint: --repo flag を使用してください (= aag shadow --repo /path/to/repo)")
		return ExitError
	}

	summary, err := shadow.Run(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag shadow: failed to run shadow mode: %v\n", err)
		return ExitError
	}

	// shadow.Summary を JSON RawMessage に marshal して RunResult に embed
	summaryRaw, err := json.MarshalIndent(summary, "  ", "  ")
	if err != nil {
		fmt.Fprintf(stderr, "aag shadow: shadow summary marshal error: %v\n", err)
		return ExitError
	}

	result := report.NewEmptyRunResult(*repo)
	result.ShadowSummaryRaw = summaryRaw
	if summary.AllMatched() {
		result.Status = "pass"
		result.Note = "Phase 9 shadow mode: 5 detector × 8 fixture parity 100% (= primary success metric 達成)"
	} else {
		result.Status = "fail"
		result.Note = fmt.Sprintf("Phase 9 shadow mode: parity mismatch (= matched %d / total %d、skipped %d)",
			summary.Matched, summary.Total, summary.Skipped)
	}

	out, err := report.RenderJSON(result)
	if err != nil {
		fmt.Fprintf(stderr, "aag shadow: JSON rendering error: %v\n", err)
		return ExitError
	}

	fmt.Fprintln(stdout, string(out))

	if summary.AllMatched() {
		return ExitPass
	}
	return ExitFail
}
