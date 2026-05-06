package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/cleanliness"
	"aag-engine/internal/navigation"
)

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
