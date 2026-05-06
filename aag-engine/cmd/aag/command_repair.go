package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/navigation"
	"aag-engine/internal/repaircontext"
)

// runRepairContext は `aag repair-context --from <file>` の本体 (= Wave 5 #21)。
func runRepairContext(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("repair-context", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root の path")
	from := fs.String("from", "", "input JSON file (= detector-results / obligation-check-v1 / clean-check-v1 / docs-placement-check-v1)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag repair-context: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}
	if *from == "" {
		fmt.Fprintln(stderr, "aag repair-context: --from flag は required です (= file path or '-' for stdin)")
		return ExitError
	}

	repoAbs, err := filepath.Abs(*repo)
	if err != nil {
		fmt.Fprintf(stderr, "aag repair-context: failed to resolve --repo: %v\n", err)
		return ExitError
	}
	// "-" は stdin marker (= improvement D)、filepath.Abs を経由しない
	fromAbs := *from
	if fromAbs != "-" {
		fromAbs, err = filepath.Abs(*from)
		if err != nil {
			fmt.Fprintf(stderr, "aag repair-context: failed to resolve --from: %v\n", err)
			return ExitError
		}
	}

	out, err := repaircontext.Repair(repaircontext.RepairInput{
		RepoRoot: repoAbs,
		From:     fromAbs,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag repair-context: %v\n", err)
		return ExitError
	}

	b, err := navigation.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag repair-context: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
