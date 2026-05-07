// Package main is the AAG / RepoSteward read-only operations CLI entry point.
//
// Naming note:
//   - **Concept / platform name**: RepoSteward AI Ops Platform (= 構想名、project id
//     `reposteward-ai-ops-platform`)
//   - **Binary / current command**: `aag` (= aag-engine-go-mvp で institute された
//     binary 名を継続、Wave 1〜5 で command surface を additive 拡張)
//   - 後続 doc / example で「reposteward 〇〇」と articulate される command は
//     現実装上 `aag 〇〇` で実行する (= naming note は plan.md / AI_CONTEXT.md / HANDOFF.md でも articulate)
//
// Command surface (= reposteward-ai-ops-platform Wave 1〜5 全 23 step landing 済):
//   - **Go MVP family** (= aag-engine-go-mvp で landing): validate / fixtures / shadow
//   - **Task Capsule family** (Wave 1 #2 + Wave 5 #22): task prepare / task validate / task close
//   - **Stats family** (Wave 1 #6): stats files (= --range / --bucket / --layer / --above)
//   - **Navigation family** (Wave 3 #10〜#14): where-am-i / context / changed / rule locate / detector refs
//   - **Cleanliness family** (Wave 4 #15〜#17): clean check / comments list / docs placement-check
//   - **Obligation / Repair family** (Wave 5 #20〜#21): obligation check / repair-context
//   - **Project status family** (Wave 5 #23): project stale / next
//
// File layout (= reposteward-ai-ops-platform PR C で articulate された CLI dispatcher refactor):
//   - main.go           : package doc + ExitCode + main() + run() dispatcher (本 file)
//   - usage.go          : usage const
//   - command_validate.go / command_fixtures.go / command_shadow.go : Go MVP family
//   - command_task.go   : Task Capsule family (= prepare / validate / close)
//   - command_stats.go  : Stats family
//   - command_navigation.go : Navigation family (= where-am-i / context / changed / rule / detector)
//   - command_clean.go / command_comments.go / command_docs.go : Cleanliness family
//   - command_obligation.go / command_repair.go : Obligation / Repair family
//   - command_project.go : Project status family (= project stale + next)
//
// 不可侵原則 (= reposteward-ai-ops-platform 8 不可侵原則継承):
//   - 本 binary は repo を **書き換えない** (= read-only verify、Wave 1 不可侵原則 3 整合)
//   - JSON-first (= 全 command の primary output は JSON、Human UI 不在)
//   - exit code contract: 0 = pass / 1 = fail / 2 = error (= input / config 不正)
//   - schema-driven output (= 各 command output は schemaVersion field で identify)
//
// 参照:
//   - projects/active/reposteward-ai-ops-platform/plan.md (= 親 project plan)
//   - projects/completed/aag-engine-go-mvp/ARCHIVE.md (= 前提 program、Go MVP family の起源)
//   - references/03-implementation/reposteward-command-surface.md (= command maturity matrix)
//   - tools/architecture-health/src/detectors/README.md (= 4 層 layered model)
//   - docs/contracts/aag/detector-result.schema.json (= canonical schema)
package main

import (
	"fmt"
	"io"
	"os"
)

// ExitCode は engine の exit code contract。
type ExitCode int

const (
	// ExitPass は detector violation が 0 件の場合 (= validate の正常終了)。
	ExitPass ExitCode = 0
	// ExitFail は detector violation が 1 件以上の場合 (= validate の検出終了)。
	ExitFail ExitCode = 1
	// ExitError は input / config 不正 / 内部 error の場合。
	ExitError ExitCode = 2
)

func main() {
	os.Exit(int(run(os.Args[1:], os.Stdout, os.Stderr)))
}

// run は main の純粋実装 (= test 可能性のため stdout/stderr を inject)。
//
// 各 case は同 package 内の command_*.go に articulate された run* 関数に
// dispatch する。新 command 追加時の手順:
//   1. command_<family>.go に run<Command> 関数を articulate
//   2. usage.go の usage const に command 行を追加
//   3. 本 dispatcher の switch case に追加
func run(args []string, stdout, stderr io.Writer) ExitCode {
	if len(args) == 0 {
		fmt.Fprint(stderr, usage)
		return ExitError
	}

	switch args[0] {
	case "--help", "-h", "help":
		fmt.Fprint(stdout, usage)
		return ExitPass
	case "validate":
		return runValidate(args[1:], stdout, stderr)
	case "fixtures":
		return runFixtures(args[1:], stdout, stderr)
	case "shadow":
		return runShadow(args[1:], stdout, stderr)
	case "task":
		return runTask(args[1:], stdout, stderr)
	case "stats":
		return runStats(args[1:], stdout, stderr)
	case "where-am-i":
		return runWhereAmI(args[1:], stdout, stderr)
	case "context":
		return runContext(args[1:], stdout, stderr)
	case "changed":
		return runChanged(args[1:], stdout, stderr)
	case "rule":
		return runRule(args[1:], stdout, stderr)
	case "detector":
		return runDetector(args[1:], stdout, stderr)
	case "clean":
		return runClean(args[1:], stdout, stderr)
	case "comments":
		return runComments(args[1:], stdout, stderr)
	case "docs":
		return runDocs(args[1:], stdout, stderr)
	case "obligation":
		return runObligation(args[1:], stdout, stderr)
	case "repair-context":
		return runRepairContext(args[1:], stdout, stderr)
	case "project":
		return runProject(args[1:], stdout, stderr)
	case "next":
		return runNext(args[1:], stdout, stderr)
	case "wrap":
		return runWrap(args[1:], stdout, stderr)
	case "describe":
		return runDescribe(args[1:], stdout, stderr)
	case "list":
		return runList(args[1:], stdout, stderr)
	case "introspect":
		return runIntrospect(args[1:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "aag: unknown command %q\n\n", args[0])
		fmt.Fprint(stderr, usage)
		return ExitError
	}
}
