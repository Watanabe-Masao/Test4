package main

import (
	"flag"
	"fmt"
	"io"

	"aag-engine/internal/aagindex"
)

// runIndex は `aag index <kind>` の本体 (= v4.2 cluster C C2 articulate)。
//
// substrate cross-reference を kind 別に projection (= command / schema view)。
// AI session が schema-graph.json + describe + introspect を walk せず 1 query で
// cross-reference を articulate するための substrate。
//
// Supported kinds:
//   - command : describe + introspect の合成 (= command 名 → handler / schema / examples / failure modes count)
//   - schema  : introspect schemaInfoTable + producers + consumers (= schema id → relations)
//
// 使用例:
//
//	aag index command                   # 全 command の cross-reference index
//	aag index schema                    # 全 schema の relations index
//	aag index command | jq '.commands[] | select(.maturity == "stable")'  # filter
//	aag index schema | jq '.schemas[] | select(.isVirtual == false)'      # file-backed のみ
//
// ExitCode contract:
//   - ExitPass (0)  = articulate 成功
//   - ExitError (2) = kind 不明 / 引数不足
func runIndex(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("index", flag.ContinueOnError)
	fs.SetOutput(stderr)
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() == 0 {
		fmt.Fprintf(stderr, "aag index: <kind> 引数は required (= %v)\n", aagindex.SupportedKinds)
		return ExitError
	}
	if fs.NArg() > 1 {
		fmt.Fprintf(stderr, "aag index: unexpected extra args: %v\n", fs.Args()[1:])
		return ExitError
	}

	out, err := aagindex.Run(fs.Arg(0))
	if err != nil {
		fmt.Fprintf(stderr, "aag index: %v\n", err)
		return ExitError
	}
	b, err := aagindex.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag index: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
