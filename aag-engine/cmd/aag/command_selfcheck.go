package main

import (
	"flag"
	"fmt"
	"io"

	"aag-engine/internal/selfcheck"
)

// runSelfCheck は `aag self-check` の本体 (= v4.2 substrate continuation)。
//
// AAG 自身の整合性を 5 軸で機械検証して JSON で articulate する:
//   - V1: describe.commandTable ↔ introspect.implTable cross-sync
//   - V2: implTable の handler / dispatcher file 実在
//   - V3: schemaTable の file-backed schema path 実在
//   - V4: testTable の test path 実在
//   - V5: schemaInfoTable の orphan schema 検出
//
// Substrate philosophy:
//   - 本 command は **AAG self-test** (= AAG 自身の正しさを runtime machine-verify)
//   - exit code は **常に 0** (= advisory observability、failure block しない)
//   - violation は output `violations[]` で articulate、AI / human が判断
//
// 使用例:
//
//	aag self-check
//	aag self-check --repo /path/to/repo
//	aag self-check | jq '.violations[]' # violation のみ articulate
//	aag self-check | jq '.healthy'      # boolean substrate health articulate
//
// ExitCode contract:
//   - ExitPass (0)  = 常に (= advisory)
//   - ExitError (2) = flag parse error のみ
func runSelfCheck(args []string, stdout, stderr io.Writer) ExitCode {
	fs := flag.NewFlagSet("self-check", flag.ContinueOnError)
	fs.SetOutput(stderr)
	repo := fs.String("repo", ".", "repo root path (= default: 現在 directory)")
	if err := fs.Parse(args); err != nil {
		return ExitError
	}
	if fs.NArg() > 0 {
		fmt.Fprintf(stderr, "aag self-check: unexpected positional argument(s): %v\n", fs.Args())
		return ExitError
	}

	out := selfcheck.Run(*repo)
	b, err := selfcheck.MarshalJSON(out)
	if err != nil {
		fmt.Fprintf(stderr, "aag self-check: JSON rendering error: %v\n", err)
		return ExitError
	}
	fmt.Fprintln(stdout, string(b))
	return ExitPass
}
