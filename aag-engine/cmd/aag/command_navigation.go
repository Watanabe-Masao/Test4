package main

import (
	"flag"
	"fmt"
	"io"
	"path/filepath"

	"aag-engine/internal/navigation"
)

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
