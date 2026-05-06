package main

import (
	"flag"
	"fmt"
	"io"
	"os"

	"aag-engine/internal/responsewrap"
)

// runWrap は `aag wrap --command <name>` の本体 (= improvement A、reposteward-ai-ops-platform)。
//
// stdin から JSON を読み、AagResponse-v2 envelope で wrap して articulate する。
// 既存 14 command の output を破壊変更せず、optional な envelope layer として articulate。
//
// 使用例:
//   aag where-am-i --repo . | aag wrap --command where-am-i
//   aag stats files --bucket loc.301_plus | aag wrap --command stats-files
//
// ExitCode contract:
//   - ExitPass (0)  = wrap 成功
//   - ExitError (2) = stdin 不在 / --command 不在 / invalid JSON
func runWrap(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("wrap", flag.ContinueOnError)
	fs.SetOutput(stderr)
	command := fs.String("command", "", "wrap 対象の command 名 (= required、e.g., 'where-am-i')")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag wrap: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}
	if *command == "" {
		fmt.Fprintln(stderr, "aag wrap: --command flag は required です (= 例: --command where-am-i)")
		return ExitError
	}

	out, err := responsewrap.Wrap(responsewrap.WrapInput{
		Stdin:   os.Stdin,
		Command: *command,
	})
	if err != nil {
		fmt.Fprintf(stderr, "aag wrap: %v\n", err)
		return ExitError
	}

	b, err := responsewrap.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag wrap: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
