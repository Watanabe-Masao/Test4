package main

import (
	"flag"
	"fmt"
	"io"

	"aag-engine/internal/bootstrap"
)

// runBootstrap は `aag bootstrap` の本体 (= v4.2 cluster C C1 articulate)。
//
// AI session が session 開始時に 1 command で必要な substrate snapshot を取得するための
// aggregate command。多 hop discovery (= where-am-i → context → ...) を 1 call に articulate。
//
// 出力 substrate:
//   - whereAmI: branch / activeProject / repoHealth / openObligations / manifestContext snapshot
//   - context: active project の requiredReads / constraints / nextActions (= active project ある場合のみ)
//   - suggestedNext: heuristic next command 候補 (= confidence: heuristic、AI 判断材料)
//
// 使用例:
//
//	aag bootstrap                    # session 開始時 (= 全 substrate 1 command で articulate)
//	aag bootstrap --repo /path
//
// ExitCode contract:
//   - ExitPass (0)  = 全 articulate 成功
//   - ExitError (2) = RepoRoot 不在 / git 不在
func runBootstrap(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("bootstrap", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root path (= default: 現在 directory)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag bootstrap: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	out, err := bootstrap.Run(bootstrap.Input{RepoRoot: *repo})
	if err != nil {
		fmt.Fprintf(stderr, "aag bootstrap: %v\n", err)
		return ExitError
	}
	b, err := bootstrap.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag bootstrap: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
