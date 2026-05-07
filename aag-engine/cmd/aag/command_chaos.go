package main

import (
	"flag"
	"fmt"
	"io"
	"strings"

	"aag-engine/internal/chaos"
)

// runChaos は `aag chaos [<command>]` の本体 (= v4.2 chaos seed)。
//
// 引数なし: overview (= 全 command の adversarial coverage articulate)
// 引数あり: per-command (= 該当 command の failure modes 詳細 articulate)
//
// AI session が command 実行前に既知 boundary を articulate なしに understand し、
// 想定外 failure を新 failure mode として articulate する材料を articulate する
// adversarial substrate seed。
//
// Future: `aag chaos run <command>` で adversarial input を実行 verify する subcommand
// を articulate 候補 (= 本 PR scope 外)。
//
// 使用例:
//
//	aag chaos                # overview
//	aag chaos wrap           # per-command
//	aag chaos "task validate"
//	aag chaos | jq '.byCommand[] | select(.withCountermeasure < .totalFailureModes)' # untested boundary articulate
//
// ExitCode contract:
//   - ExitPass (0)  = 常に (= read-only articulate command)
//   - ExitError (2) = command 不明 / flag parse error
func runChaos(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("chaos", flag.ContinueOnError)
	fs.SetOutput(stderr)
	if err := fs.Parse(args); err != nil {
		return ExitError
	}

	if fs.NArg() == 0 {
		// overview mode
		out := chaos.Overview()
		b, err := chaos.MarshalJSON(out)
		if err != nil {
			fmt.Fprintf(stderr, "aag chaos: JSON rendering error: %v\n", err)
			return ExitError
		}
		fmt.Fprintln(stdout, string(b))
		return ExitPass
	}

	// per-command mode
	command := strings.Join(fs.Args(), " ")
	out, err := chaos.PerCommand(command)
	if err != nil {
		fmt.Fprintf(stderr, "aag chaos: %v\n", err)
		return ExitError
	}
	b, err := chaos.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag chaos: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
