package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/navigation"
	"aag-engine/internal/taskcapsule"
)

// runTask は `aag task <action>` の dispatcher (= Wave 1 #2 + Wave 5 #22、reposteward-ai-ops-platform)。
//
// MVP では prepare action のみ landing、Wave 5 で task validate / task close を articulate。
// 後続で task repair-context が articulate される予定。
func runTask(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag task: action 不足 (= 'prepare' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag task prepare --project <id> [--intent <text>] [--task <id>]")
		return ExitError
	}
	switch args[0] {
	case "prepare":
		return runTaskPrepare(args[1:], stdout, stderr)
	case "validate":
		return runTaskValidate(args[1:], stdout, stderr)
	case "close":
		return runTaskClose(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag task: unknown action %q (= 'prepare' / 'validate' / 'close')\n", args[0])
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

// runTaskValidate は `aag task validate --capsule <file>` の本体 (= Wave 5 #22)。
func runTaskValidate(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("task validate", flag.ContinueOnError)
	fs.SetOutput(stderr)
	capsuleFile := fs.String("capsule", "", "TaskCapsule JSON file path (= required)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag task validate: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}
	if *capsuleFile == "" {
		fmt.Fprintln(stderr, "aag task validate: --capsule flag は required です")
		return ExitError
	}

	abs, err := filepath.Abs(*capsuleFile)
	if err != nil {
		fmt.Fprintf(stderr, "aag task validate: failed to resolve --capsule: %v\n", err)
		return ExitError
	}

	out, err := taskcapsule.ValidateCapsule(taskcapsule.ValidateInput{CapsuleFile: abs})
	if err != nil {
		fmt.Fprintf(stderr, "aag task validate: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag task validate: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	if !out.Valid {
		return ExitFail
	}
	return ExitPass
}

// runTaskClose は `aag task close --capsule <file>` の本体 (= Wave 5 #22)。
func runTaskClose(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("task close", flag.ContinueOnError)
	fs.SetOutput(stderr)
	capsuleFile := fs.String("capsule", "", "TaskCapsule JSON file path (= required)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag task close: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}
	if *capsuleFile == "" {
		fmt.Fprintln(stderr, "aag task close: --capsule flag は required です")
		return ExitError
	}

	abs, err := filepath.Abs(*capsuleFile)
	if err != nil {
		fmt.Fprintf(stderr, "aag task close: failed to resolve --capsule: %v\n", err)
		return ExitError
	}

	out, err := taskcapsule.CloseCapsule(taskcapsule.CloseInput{CapsuleFile: abs})
	if err != nil {
		fmt.Fprintf(stderr, "aag task close: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag task close: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	if !out.ReadyToClose {
		return ExitFail
	}
	return ExitPass
}
