package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/navigation"
	"aag-engine/internal/projectstatus"
)

// runProject は `aag project <action>` の dispatcher (= Wave 5 #23)。
func runProject(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag project: action 不足 (= 'stale' を指定してください)")
		fmt.Fprintln(stderr, "usage: aag project stale [--repo PATH] [--days N]")
		return ExitError
	}
	switch args[0] {
	case "stale":
		return runProjectStale(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag project: unknown action %q (= 'stale' のみ対応)\n", args[0])
		return ExitError
	}
}

// runProjectStale は `aag project stale` の本体 (= Wave 5 #23)。
func runProjectStale(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("project stale", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	days := fs.Int("days", 30, "stale threshold days (= default 30)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag project stale: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag project stale: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := projectstatus.Stale(projectstatus.StaleInput{
		RepoRoot:  repoAbs,
		StaleDays: *days,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag project stale: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag project stale: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runNext は `aag next` の本体 (= Wave 5 #23、Wave 5 final)。
func runNext(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("next", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag next: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag next: failed to resolve --repo: %v\n", err)
		return ExitError
	}

	out, err := projectstatus.Next(projectstatus.NextInput{RepoRoot: repoAbs})
	if err != nil {
		fmt.Fprintf(stderr, "aag next: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag next: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
