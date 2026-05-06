package main

import (
	"flag"
	"fmt"
	"io"

	"aag-engine/internal/report"
)

// runValidate は `aag validate` サブコマンドの本体。
//
// Phase 1 では空の DetectorResult[] を返すのみ。Phase 4-8 で 5 detector が
// 順次 wired up され、実 violation を返すようになる。
func runValidate(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("validate", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "検証対象 repo root の path")
	format := fs.String("format", "json", "出力形式 ('json' のみ対応)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag validate: unexpected positional argument(s): %v\n", fs.Args())
		fmt.Fprintln(stderr, "hint: --repo flag を使用してください (= aag validate --repo /path/to/repo)")
		return ExitError
	}

	if *format != "json" {
		fmt.Fprintf(stderr, "aag validate: unsupported format %q (= 'json' のみ対応)\n", *format)
		return ExitError
	}

	// Phase 1 skeleton: empty DetectorResult[] を返す
	// Phase 2 から report.NewEmptyRunResult() + report.DeriveStatus() に migrate
	result := report.NewEmptyRunResult(*repo)
	result.Status = report.DeriveStatus(result.DetectorResults)

	out, err := report.RenderJSON(result)
	if err != nil {
		fmt.Fprintf(stderr, "aag validate: JSON rendering error: %v\n", err)
		return ExitError
	}

	fmt.Fprintln(stdout, string(out))

	// violation status から exit code を articulate
	if result.Status == "pass" {
		return ExitPass
	}
	return ExitFail
}
