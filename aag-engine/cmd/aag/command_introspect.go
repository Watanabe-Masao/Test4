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
// Subcommands (= seed scope):
//   - command <name>  : command の implementation pointer
//   - schema <id>     : schema の path + producers + consumers (= v4.2 introspect-provenance で追加)
//
// 'introspect detector <id>' は意図的に articulate しない (= 既存 `aag detector refs <id>`
// と機能重複のため、command surface 最小化原則整合)。
//
// 使用例:
//
//	aag introspect command validate
//	aag introspect command "task prepare"
//	aag introspect schema detector-result-v1
//	aag introspect schema aag-pipeline-envelope-v1
//
// ExitCode contract:
//   - ExitPass (0)  = introspect 成功
//   - ExitError (2) = subcommand 不明 / id 不明 / 引数不足
func runIntrospect(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprintln(stderr, "aag introspect: subcommand required (= 'command' / 'schema'、例: 'aag introspect command validate' / 'aag introspect schema detector-result-v1')")
		return ExitError
	}
	switch args[0] {
	case "command":
		return runIntrospectCommand(args[1:], stdout, stderr)
	case "schema":
		return runIntrospectSchema(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag introspect: unknown subcommand %q (= 'command' / 'schema' のみ articulate)\n", args[0])
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

// runIntrospectSchema は `aag introspect schema <id>` の本体 (= v4.2 introspect-provenance)。
//
// schema id (= 'detector-result-v1' / 'aag-pipeline-envelope-v1' 等) を解決して
// path + virtual flag + producers + consumers + provenance を JSON で出力。
//
// AI session が schema-graph.json を walk せずに 1 command で schema relation を
// articulate するための substrate seed。
func runIntrospectSchema(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("introspect schema", flag.ContinueOnError)
	fs.SetOutput(stderr)
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() == 0 {
		fmt.Fprintln(stderr, "aag introspect schema: <schema-id> 引数は required (= 例: 'aag introspect schema detector-result-v1')")
		return ExitError
	}
	id := fs.Arg(0)
	if fs.NArg() > 1 {
		fmt.Fprintf(stderr, "aag introspect schema: unexpected extra args: %v\n", fs.Args()[1:])
		return ExitError
	}

	out, err := introspect.IntrospectSchema(id)
	if err != nil {
		fmt.Fprintf(stderr, "aag introspect schema: %v\n", err)
		return ExitError
	}
	b, err := introspect.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag introspect schema: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
