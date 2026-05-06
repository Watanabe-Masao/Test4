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
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"aag-engine/internal/fixture"
	"aag-engine/internal/report"
	"aag-engine/internal/shadow"
	"aag-engine/internal/taskcapsule"
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
  validate         repo を read-only で検証し DetectorResult[] を出力 (= Phase 1 skeleton)
  fixtures         fixtures/aag/ 配下を discover し catalog を出力 (= Phase 3 deliverable)
  shadow           5 detector × 8 fixture を全 dispatch、parity summary を出力 (= Phase 9 deliverable)
  task prepare     active project の Task Capsule を JSON で出力 (= reposteward-ai-ops-platform Wave 1 #2 deliverable)

FLAGS (validate / fixtures / shadow):
  --repo PATH       検証対象 repo root の path (= default: 現在 directory)
  --format FORMAT   出力形式 (= 'json' のみ対応、default: 'json')

FLAGS (task prepare):
  --repo PATH       repo root の path (= default: 現在 directory)
  --project ID      active project id (= projects/active/<id>/、required)
  --intent TEXT     task の意図 (= optional、free-form 1 文)
  --task ID         task id (= optional、kebab-case、default: --intent slug or <project>-task)

  --help            本 help を表示

EXIT CODE:
  0    pass (= violation 0 件 / parity all match)
  1    fail (= violation ≥ 1 件 / parity mismatch)
  2    error (= 引数 / config 不正、内部 error)

PHASE 9 STATUS:
  shadow subcommand が 5 detector 全 dispatch + 8 fixture parity 集約を articulate。
  validate subcommand は Phase 1 skeleton のまま (= empty DetectorResult[]、Phase
  10/11 で実 repo 走査追加候補)。
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
	case "shadow":
		return runShadow(args[1:], stdout, stderr)
	case "task":
		return runTask(args[1:], stdout, stderr)
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

// runTask は `aag task <action>` の dispatcher (= Wave 1 #2、reposteward-ai-ops-platform)。
//
// MVP では prepare action のみ対応。Wave 5 で task validate / task close / task
// repair-context が articulate される予定 (= projects/active/reposteward-ai-ops-platform/plan.md §Wave 5)。
func runTask(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag task: action 不足 (= 'prepare' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag task prepare --project <id> [--intent <text>] [--task <id>]")
		return ExitError
	}
	switch args[0] {
	case "prepare":
		return runTaskPrepare(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag task: unknown action %q (= 'prepare' のみ対応)\n", args[0])
		return ExitError
	}
}

// runTaskPrepare は `aag task prepare` の本体 (= Wave 1 #2 deliverable)。
//
// active project の state を read-only に走査して TaskCapsule v1 (= JSON Schema
// docs/contracts/aag/task-capsule.schema.json) 準拠の JSON を stdout に出力する。
// AI session の作業前の operating layer 契約として消費される。
//
// ExitCode contract:
//   - ExitPass (0)  = capsule 出力成功
//   - ExitError (2) = 引数不正 / project 不存在 / generated artifact parse error
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則 3):
//   - read-only first: 本 command は repo を一切書き換えない
//   - JSON-first: 出力は JSON のみ、Human UI / Markdown summary は出さない
func runTaskPrepare(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("task prepare", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	project := fs.String("project", "", "active project id (= required)")
	intent := fs.String("intent", "", "task の意図 (= optional、free-form 1 文)")
	taskID := fs.String("task", "", "task id (= optional、kebab-case、default: intent slug or <project>-task)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag task prepare: unexpected positional argument(s): %v\n", fs.Args())
		fmt.Fprintln(stderr, "hint: --project / --intent / --task / --repo flag を使用してください")
		return ExitError
	}
	if *project == "" {
		fmt.Fprintln(stderr, "aag task prepare: --project flag は required です (= active project id を articulate してください)")
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag task prepare: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	capsule, err := taskcapsule.Prepare(taskcapsule.PrepareInput{
		RepoRoot:  repoAbs,
		ProjectID: *project,
		Intent:    *intent,
		TaskID:    *taskID,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag task prepare: %v\n", err)
		return ExitError
	}

	out, err := taskcapsule.MarshalJSON(capsule)
	if err != nil {
		fmt.Fprintf(stderr, "aag task prepare: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(out))
	return ExitPass
}
