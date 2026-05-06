package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/navigation"
	"aag-engine/internal/obligation"
)

// runObligation は `aag obligation <action>` の dispatcher (= Wave 5 #20)。
func runObligation(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag obligation: action 不足 (= 'check' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag obligation check [--changed-only] [--base REF] [--head REF] [--repo PATH]")
		return ExitError
	}
	switch args[0] {
	case "check":
		return runObligationCheck(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag obligation: unknown action %q (= 'check' のみ対応)\n", args[0])
		return ExitError
	}
}

// runObligationCheck は `aag obligation check` の本体 (= Wave 5 #20)。
func runObligationCheck(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("obligation check", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	base := fs.String("base", "main", "base ref")
	head := fs.String("head", "HEAD", "head ref")
	changedOnly := fs.Bool("changed-only", true, "changed-only mode (= MVP では default true、唯一の mode)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	_ = changedOnly // articulate signal、MVP では always changed-only
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag obligation check: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag obligation check: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := obligation.Check(obligation.CheckInput{
		RepoRoot: repoAbs,
		Base:     *base,
		Head:     *head,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag obligation check: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag obligation check: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
