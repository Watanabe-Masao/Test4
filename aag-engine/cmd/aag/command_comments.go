package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/commentscan"
	"aag-engine/internal/navigation"
)

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
