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

	"aag-engine/internal/cleanliness"
	"aag-engine/internal/commentscan"
	"aag-engine/internal/fixture"
	"aag-engine/internal/navigation"
	"aag-engine/internal/report"
	"aag-engine/internal/shadow"
	"aag-engine/internal/stats"
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
  stats files      effectiveCodeLines を bucket / range / layer / percentile で query (= reposteward-ai-ops-platform Wave 1 #6 deliverable)
  where-am-i       branch / activeProject / repoHealth / openObligations / 推奨 next command を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #10 deliverable)
  context          active project の requiredReads / constraints / nextActions を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #11 deliverable)
  changed          --base..--head の changed file を area / obligations / requiredReads で articulate (= reposteward-ai-ops-platform Wave 3 #12 deliverable)
  rule locate      ruleId から rule の definition / guards / docs / thresholds を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #13 deliverable)
                   note: 'aag rule locate --repo PATH <ruleId>' のように flag を ruleId の前に articulate
  detector refs    detectorId から goImplementation / tsImplementation / schema / fixtures を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #14 deliverable)
                   note: 'aag detector refs --repo PATH <detectorId>' のように flag を detectorId の前に articulate
  clean check      generated 混入 / archive manifest 不在 / projectId 重複 等の cleanliness 違反を JSON で出力 (= reposteward-ai-ops-platform Wave 4 #15 deliverable)
  comments list    --kind todo|suppression|expired のコメントを repo 全体から scan して JSON で出力 (= reposteward-ai-ops-platform Wave 4 #16 deliverable)
  docs placement-check  schema / generated artifact の配置規約違反を JSON で出力 (= reposteward-ai-ops-platform Wave 4 #17 deliverable)

FLAGS (validate / fixtures / shadow):
  --repo PATH       検証対象 repo root の path (= default: 現在 directory)
  --format FORMAT   出力形式 (= 'json' のみ対応、default: 'json')

FLAGS (task prepare):
  --repo PATH       repo root の path (= default: 現在 directory)
  --project ID      active project id (= projects/active/<id>/、required)
  --intent TEXT     task の意図 (= optional、free-form 1 文)
  --task ID         task id (= optional、kebab-case、default: --intent slug or <project>-task)

FLAGS (stats files):
  --repo PATH       repo root の path (= default: 現在 directory)
  --metric NAME     size metric (= currently only 'effectiveCodeLines'、default)
  --range N..M      effectiveCodeLines を inclusive range で filter (= e.g., '21..30')
  --bucket ID       aag-parameters bucket id で filter (= e.g., 'loc.021_030')
  --layer NAME      layer 完全一致 filter (= e.g., 'presentation' / 'features/budget')
  --above PNN       percentile 超過 filter (= 'p50' / 'p75' / 'p90' / 'p95' / 'p99')
  --limit N         上位 N 件に cap (= 0 = unlimited、default)

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
	case "stats":
		return runStats(args[1:], stdout, stderr)
	case "where-am-i":
		return runWhereAmI(args[1:], stdout, stderr)
	case "context":
		return runContext(args[1:], stdout, stderr)
	case "changed":
		return runChanged(args[1:], stdout, stderr)
	case "rule":
		return runRule(args[1:], stdout, stderr)
	case "detector":
		return runDetector(args[1:], stdout, stderr)
	case "clean":
		return runClean(args[1:], stdout, stderr)
	case "comments":
		return runComments(args[1:], stdout, stderr)
	case "docs":
		return runDocs(args[1:], stdout, stderr)
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

// runWhereAmI は `aag where-am-i` の本体 (= Wave 3 #10、reposteward-ai-ops-platform)。
//
// AI session bootstrap 用 navigation command。branch / activeProject / repoHealth /
// openObligations / 推奨 next command を JSON で stdout に出力 (= read-only)。
//
// ExitCode contract:
//   - ExitPass (0)  = 出力成功
//   - ExitError (2) = repo not git / 引数不正
func runWhereAmI(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("where-am-i", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag where-am-i: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag where-am-i: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := navigation.WhereAmI(navigation.WhereAmIInput{RepoRoot: repoAbs})
	if err != nil {
		fmt.Fprintf(stderr, "aag where-am-i: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag where-am-i: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runContext は `aag context --project <id>` の本体 (= Wave 3 #11)。
//
// active project の requiredReads / constraints / nextActions を JSON で
// stdout に出力 (= read-only)。
func runContext(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("context", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	project := fs.String("project", "", "active project id (= required)")
	maxNext := fs.Int("max-next-actions", 5, "nextActions 最大件数 (= default 5)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag context: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}
	if *project == "" {
		fmt.Fprintln(stderr, "aag context: --project flag は required です")
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag context: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := navigation.Context(navigation.ContextInput{
		RepoRoot:       repoAbs,
		ProjectID:      *project,
		MaxNextActions: *maxNext,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag context: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag context: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runChanged は `aag changed --explain` の本体 (= Wave 3 #12)。
//
// git diff base..head の changed file を area / obligations / requiredReads /
// summary で articulate (= read-only)。
//
// Note: --explain flag は articulate 上の signal、実装上は default で全 explanation を
// 出力 (= JSON-first の primary output、別 mode は不要)。
func runChanged(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("changed", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	base := fs.String("base", "main", "base ref")
	head := fs.String("head", "HEAD", "head ref")
	explain := fs.Bool("explain", true, "explanation を articulate (= MVP では default true、--explain=false は not yet supported)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	_ = explain // articulate signal (= MVP で default は always explain)
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag changed: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag changed: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := navigation.Changed(navigation.ChangedInput{
		RepoRoot: repoAbs,
		Base:     *base,
		Head:     *head,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag changed: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag changed: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runRule は `aag rule <action> <args>` の dispatcher (= Wave 3 #13)。
func runRule(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag rule: action 不足 (= 'locate' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag rule locate <ruleId> [--repo PATH]")
		return ExitError
	}
	switch args[0] {
	case "locate":
		return runRuleLocate(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag rule: unknown action %q (= 'locate' のみ対応)\n", args[0])
		return ExitError
	}
}

// runRuleLocate は `aag rule locate <ruleId>` の本体 (= Wave 3 #13)。
//
// merged-architecture-rules.json から ruleId を lookup し、definition + guards +
// docs + thresholds を JSON で stdout に出力 (= read-only)。
func runRuleLocate(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("rule locate", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	posArgs := fs.Args()
	if len(posArgs) == 0 {
		fmt.Fprintln(stderr, "aag rule locate: ruleId 引数が必要です (= 'aag rule locate AR-G5-HOOK-LINES')")
		return ExitError
	}
	if len(posArgs) > 1 {
		fmt.Fprintf(stderr, "aag rule locate: 引数は ruleId 1 つのみ articulate してください (got %v)\n", posArgs)
		return ExitError
	}
	ruleId := posArgs[0]

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag rule locate: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := navigation.RuleLocate(navigation.RuleLocateInput{
		RepoRoot: repoAbs,
		RuleId:   ruleId,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag rule locate: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag rule locate: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runDetector は `aag detector <action> <args>` の dispatcher (= Wave 3 #14)。
func runDetector(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag detector: action 不足 (= 'refs' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag detector refs <detectorId> [--repo PATH]")
		return ExitError
	}
	switch args[0] {
	case "refs":
		return runDetectorRefs(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag detector: unknown action %q (= 'refs' のみ対応)\n", args[0])
		return ExitError
	}
}

// runDetectorRefs は `aag detector refs <detectorId>` の本体 (= Wave 3 #14、Wave 3 final)。
//
// detectorId から Go / TS implementation + schema + fixtures を JSON で
// stdout に出力 (= read-only)。
func runDetectorRefs(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("detector refs", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	posArgs := fs.Args()
	if len(posArgs) == 0 {
		fmt.Fprintln(stderr, "aag detector refs: detectorId 引数が必要です (= 'aag detector refs archive-manifest')")
		return ExitError
	}
	if len(posArgs) > 1 {
		fmt.Fprintf(stderr, "aag detector refs: 引数は detectorId 1 つのみ articulate してください (got %v)\n", posArgs)
		return ExitError
	}
	detectorId := posArgs[0]

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag detector refs: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := navigation.DetectorRefs(navigation.DetectorRefsInput{
		RepoRoot:   repoAbs,
		DetectorId: detectorId,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag detector refs: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag detector refs: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runClean は `aag clean <action>` の dispatcher (= Wave 4 #15)。
func runClean(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag clean: action 不足 (= 'check' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag clean check [--repo PATH]")
		return ExitError
	}
	switch args[0] {
	case "check":
		return runCleanCheck(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag clean: unknown action %q (= 'check' のみ対応)\n", args[0])
		return ExitError
	}
}

// runCleanCheck は `aag clean check` の本体 (= Wave 4 #15)。
//
// repo 全体を scan して cleanliness rule 違反 (= generated-handauthored /
// archive-missing-manifest / projectid-duplicate) を JSON で stdout に articulate。
// ExitPass with violations articulated (= violation 数で fail しない、AI session
// が判断する read-only output)。
func runCleanCheck(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("clean check", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag clean check: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag clean check: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := cleanliness.Check(cleanliness.CheckInput{RepoRoot: repoAbs})
	if err != nil {
		fmt.Fprintf(stderr, "aag clean check: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag clean check: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runComments は `aag comments <action>` の dispatcher (= Wave 4 #16)。
func runComments(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag comments: action 不足 (= 'list' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag comments list --kind <todo|suppression|expired> [--repo PATH]")
		return ExitError
	}
	switch args[0] {
	case "list":
		return runCommentsList(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag comments: unknown action %q (= 'list' のみ対応)\n", args[0])
		return ExitError
	}
}

// runCommentsList は `aag comments list --kind <kind>` の本体 (= Wave 4 #16)。
func runCommentsList(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("comments list", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	kind := fs.String("kind", "", "comment kind (= 'todo' / 'suppression' / 'expired'、required)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag comments list: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}
	if *kind == "" {
		fmt.Fprintln(stderr, "aag comments list: --kind flag は required です (= 'todo' / 'suppression' / 'expired')")
		return ExitError
	}
	if !commentscan.IsValidKind(*kind) {
		fmt.Fprintf(stderr, "aag comments list: invalid --kind %q (= 'todo' / 'suppression' / 'expired')\n", *kind)
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag comments list: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := commentscan.List(commentscan.ListInput{
		RepoRoot: repoAbs,
		Kind:     commentscan.CommentKind(*kind),
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag comments list: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag comments list: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runDocs は `aag docs <action>` の dispatcher (= Wave 4 #17)。
func runDocs(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag docs: action 不足 (= 'placement-check' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag docs placement-check [--repo PATH]")
		return ExitError
	}
	switch args[0] {
	case "placement-check":
		return runDocsPlacementCheck(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag docs: unknown action %q (= 'placement-check' のみ対応)\n", args[0])
		return ExitError
	}
}

// runDocsPlacementCheck は `aag docs placement-check` の本体 (= Wave 4 #17)。
func runDocsPlacementCheck(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("docs placement-check", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag docs placement-check: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag docs placement-check: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := cleanliness.PlacementCheck(cleanliness.PlacementInput{RepoRoot: repoAbs})
	if err != nil {
		fmt.Fprintf(stderr, "aag docs placement-check: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag docs placement-check: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
