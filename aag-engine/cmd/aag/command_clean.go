package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/cleanliness"
	"aag-engine/internal/navigation"
)

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
