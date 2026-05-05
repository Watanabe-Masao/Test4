// Package main is the AAG Engine Go MVP CLI entry point.
//
// Phase 1 (= Go CLI Skeleton) で landing する skeleton。Go binary が起動し、
// 2 サブコマンド (= validate / fixtures、+ --help / -h / help meta flag) で空の
// DetectorResult[] JSON を返す。
//
// Phase 2 以降で:
//   - DetectorResult contract binding (= internal/contract/)
//   - fixture runner (= internal/fixture/、Phase 3 で新設)
//   - 5 detector 実装 (= internal/detectors/、Phase 4-8 で順次)
//   - shadow mode report (= Phase 9)
//
// 不可侵原則:
//   - 本 binary は repo を **書き換えない** (= read-only verify)。
//   - exit code contract: 0 = pass / 1 = fail / 2 = error (= input / config 不正)。
//   - JSON output は schemaVersion + status + detectorResults の 3 field を保持。
//
// 参照:
//   - projects/active/aag-engine-go-mvp/plan.md (= 親 project plan)
//   - tools/architecture-health/src/detectors/README.md (= 4 層 layered model)
//   - docs/contracts/aag/detector-result.schema.json (= canonical schema)
package main

import (
	"flag"
	"fmt"
	"io"
	"os"

	"aag-engine/internal/fixture"
	"aag-engine/internal/report"
)

// ExitCode は engine の exit code contract。
type ExitCode int

const (
	// ExitPass は detector violation が 0 件の場合 (= validate の正常終了)。
	ExitPass ExitCode = 0
	// ExitFail は detector violation が 1 件以上の場合 (= validate の検出終了)。
	ExitFail ExitCode = 1
	// ExitError は input / config 不正 / 内部 error の場合。
	ExitError ExitCode = 2
)

// usage は --help / argument 不足時の hint 文字列。
const usage = `aag — AAG Engine Go MVP CLI

USAGE:
  aag <command> [flags]

COMMANDS:
  validate    repo を read-only で検証し DetectorResult[] を出力
  fixtures    fixtures/aag/ 配下を読み expected と actual の parity を検証

FLAGS:
  --repo PATH       検証対象 repo root の path (= default: 現在 directory)
  --format FORMAT   出力形式 (= 'json' のみ対応、default: 'json')
  --help            本 help を表示

EXIT CODE:
  0    pass (= violation 0 件)
  1    fail (= violation ≥ 1 件)
  2    error (= 引数 / config 不正、内部 error)

PHASE 1 STATUS:
  本 skeleton は **空の DetectorResult[] JSON** を返すのみ。
  実 detection logic は Phase 4-8 で landing 予定 (= 5 detector × 8 fixture)。
`

func main() {
	os.Exit(int(run(os.Args[1:], os.Stdout, os.Stderr)))
}

// run は main の純粋実装 (= test 可能性のため stdout/stderr を inject)。
func run(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprint(stderr, usage)
		return ExitError
	}

	switch args[0] {
	case "--help", "-h", "help":
		fmt.Fprint(stdout, usage)
		return ExitPass
	case "validate":
		return runValidate(args[1:], stdout, stderr)
	case "fixtures":
		return runFixtures(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag: unknown command %q\n\n", args[0])
		fmt.Fprint(stderr, usage)
		return ExitError
	}
}

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
