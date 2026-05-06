package main

import (
	"flag"
	"fmt"
	"io"
	"strings"

	"aag-engine/internal/describe"
)

// runDescribe は `aag describe <command>` の本体 (= improvement E)。
//
// 指定 command の metadata (= maturity / args / output schema / family) を JSON で出力。
// multi-word command (= 'task prepare' / 'rule locate' 等) は positional args を space で join。
//
// 使用例:
//
//	aag describe validate
//	aag describe task prepare
//	aag describe stats files
//
// ExitCode contract:
//   - ExitPass (0)  = describe 成功
//   - ExitError (2) = command 不明 / 引数不足
func runDescribe(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("describe", flag.ContinueOnError)
	fs.SetOutput(stderr)
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() == 0 {
		fmt.Fprintln(stderr, "aag describe: <command> 引数は required です (= 例: 'aag describe validate' / 'aag describe task prepare')")
		return ExitError
	}
	command := strings.Join(fs.Args(), " ")

	out, err := describe.Describe(command)
	if err != nil {
		fmt.Fprintf(stderr, "aag describe: %v\n", err)
		return ExitError
	}
	b, err := describe.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag describe: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}

// runList は `aag list` の本体 (= improvement E)。
//
// 全 command の metadata を name 順で JSON 出力。
//
// 使用例:
//
//	aag list
//	aag list | jq '.commands[] | select(.maturity == "provisional")'
//
// ExitCode contract:
//   - ExitPass (0) = 常に
func runList(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("list", flag.ContinueOnError)
	fs.SetOutput(stderr)
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag list: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	out := describe.List()
	b, err := describe.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag list: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
