package main

import (
	"flag"
	"fmt"
	"io"
	"strings"

	"aag-engine/internal/introspect"
)

// runIntrospect は `aag introspect command <name>` の本体 (= v4.2 seed)。
//
// command の implementation pointer (= dispatcher / handler / package / schema /
// tests) を JSON で出力。AI session が grep なしに任意 command の Go 実装に
// navigate するための substrate seed。
//
// Subcommand: 'command' のみ articulate (= seed scope)。
// 将来 'introspect schema <id>' / 'introspect detector <id>' を additive 拡張候補。
//
// 使用例:
//
//	aag introspect command validate
//	aag introspect command "task prepare"
//	aag introspect command "introspect command"
//
// ExitCode contract:
//   - ExitPass (0)  = introspect 成功
//   - ExitError (2) = subcommand 不明 / command 不明 / 引数不足
func runIntrospect(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag introspect: subcommand required (= 現時点 'command' のみ articulate、例: 'aag introspect command validate')")
		return ExitError
	}
	switch args[0] {
	case "command":
		return runIntrospectCommand(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag introspect: unknown subcommand %q (= 現時点 'command' のみ articulate)\n", args[0])
		return ExitError
	}
}

func runIntrospectCommand(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("introspect command", flag.ContinueOnError)
	fs.SetOutput(stderr)
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() == 0 {
		fmt.Fprintln(stderr, "aag introspect command: <command> 引数は required (= 例: 'aag introspect command validate' / 'aag introspect command \"task prepare\"')")
		return ExitError
	}
	command := strings.Join(fs.Args(), " ")

	out, err := introspect.Introspect(command)
	if err != nil {
		fmt.Fprintf(stderr, "aag introspect command: %v\n", err)
		return ExitError
	}
	b, err := introspect.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag introspect command: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
