package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"aag-engine/internal/chaos"
)

// runChaos は `aag chaos [<command>]` / `aag chaos run <command>` の本体 (= v4.2 chaos seed + run extension)。
//
// 引数なし: overview (= 全 command の adversarial coverage articulate)
// 引数 'run <command>': execution version (= reproducible failure modes を実機械実行 + verify)
// 引数 '<command>': per-command (= 該当 command の failure modes 詳細 articulate、listing version)
//
// AI session が command 実行前に既知 boundary を articulate なしに understand し、
// 想定外 failure を新 failure mode として articulate する材料を articulate する
// adversarial substrate (= listing + execution の両 mode articulate)。
//
// 使用例:
//
//	aag chaos                # overview
//	aag chaos wrap           # per-command (= listing)
//	aag chaos "task validate"
//	aag chaos run wrap       # execution (= reproducible failure modes 実機械実行 + verify)
//	aag chaos run "task validate"
//
// ExitCode contract:
//   - ExitPass (0)  = listing 系は常に / execution 系は healthy=true
//   - ExitError (2) = command 不明 / flag parse error / binary path resolve error
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

	// 'run <command>' subcommand
	if fs.Arg(0) == "run" {
		if fs.NArg() < 2 {
			fmt.Fprintln(stderr, "aag chaos run: <command> 引数は required (= 例: 'aag chaos run wrap')")
			return ExitError
		}
		command := strings.Join(fs.Args()[1:], " ")
		binaryPath, err := os.Executable()
		if err != nil {
			fmt.Fprintf(stderr, "aag chaos run: failed to resolve binary path: %v\n", err)
			return ExitError
		}
		out, err := chaos.RunAdversarial(binaryPath, command)
		if err != nil {
			fmt.Fprintf(stderr, "aag chaos run: %v\n", err)
			return ExitError
		}
		b, err := chaos.MarshalJSON(out)
		if err != nil {
			fmt.Fprintf(stderr, "aag chaos run: JSON rendering error: %v\n", err)
			return ExitError
		}
		fmt.Fprintln(stdout, string(b))
		return ExitPass
	}

	// per-command mode (= listing version)
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
