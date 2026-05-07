// Package introspect implements `aag introspect command <name>` —
// v4.2 seed (= reposteward-substrate-v4-2-seed)。
//
// command の implementation pointer (= dispatcher / handler / package / schema /
// tests / examples) を JSON で articulate する。AI session が grep なしに任意
// command の Go 実装に navigate するための substrate seed。
//
// 設計判断:
//   - 21 command の embedded mapping を articulate (= source-of-truth、別 mechanism 不在)
//   - existing aag detector refs と同 idiom (= embedded pointer mapping)
//   - 出力 schema は describe-output.schema.json (= additionalProperties: true、provenance 含む)
//   - schemaVersion = "aag-introspect-command-v1"
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first
//   6. Additive-only (= 既存 describe / list / detector refs を modify しない)
package introspect

import (
	"bytes"
	"encoding/json"
	"fmt"

	"aag-engine/internal/describe"
	"aag-engine/internal/provenance"
)

// IntrospectSchemaVersion is the schemaVersion for `aag introspect command` output.
const IntrospectSchemaVersion = "aag-introspect-command-v1"

// IntrospectOutput is the envelope for `aag introspect command <name>`。
type IntrospectOutput struct {
	SchemaVersion  string                   `json:"schemaVersion"`
	Command        describe.CommandMetadata `json:"command"`
	Implementation ImplementationPointer    `json:"implementation"`
	Schema         *string                  `json:"schema"`
	Tests          []string                 `json:"tests"`
	Examples       *string                  `json:"examples"`
	Provenance     provenance.Provenance    `json:"provenance"`
}

// ImplementationPointer は command の Go 実装位置を articulate する。
type ImplementationPointer struct {
	DispatcherFile string  `json:"dispatcherFile"`
	HandlerFile    string  `json:"handlerFile"`
	HandlerFunc    string  `json:"handlerFunc"`
	Package        *string `json:"package"`
}

// implTable は 22 command の implementation pointer の embedded source-of-truth。
//
// describe.commandTable と同期。command 追加時は両 table を update する
// (= Command Registry Sync Guard で機械検証)。
var implTable = map[string]ImplementationPointer{
	"validate": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_validate.go",
		HandlerFunc:    "runValidate",
		Package:        ptr("aag-engine/internal/detectors"),
	},
	"fixtures": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_fixtures.go",
		HandlerFunc:    "runFixtures",
		Package:        ptr("aag-engine/internal/fixture"),
	},
	"shadow": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_shadow.go",
		HandlerFunc:    "runShadow",
		Package:        ptr("aag-engine/internal/shadow"),
	},
	"task prepare": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_task.go",
		HandlerFunc:    "runTaskPrepare",
		Package:        ptr("aag-engine/internal/taskcapsule"),
	},
	"task validate": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_task.go",
		HandlerFunc:    "runTaskValidate",
		Package:        ptr("aag-engine/internal/taskcapsule"),
	},
	"task close": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_task.go",
		HandlerFunc:    "runTaskClose",
		Package:        ptr("aag-engine/internal/taskcapsule"),
	},
	"stats files": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_stats.go",
		HandlerFunc:    "runStatsFiles",
		Package:        ptr("aag-engine/internal/stats"),
	},
	"where-am-i": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_navigation.go",
		HandlerFunc:    "runWhereAmI",
		Package:        ptr("aag-engine/internal/navigation"),
	},
	"context": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_navigation.go",
		HandlerFunc:    "runContext",
		Package:        ptr("aag-engine/internal/navigation"),
	},
	"changed": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_navigation.go",
		HandlerFunc:    "runChanged",
		Package:        ptr("aag-engine/internal/navigation"),
	},
	"rule locate": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_navigation.go",
		HandlerFunc:    "runRule",
		Package:        ptr("aag-engine/internal/navigation"),
	},
	"detector refs": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_navigation.go",
		HandlerFunc:    "runDetector",
		Package:        ptr("aag-engine/internal/navigation"),
	},
	"clean check": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_clean.go",
		HandlerFunc:    "runClean",
		Package:        ptr("aag-engine/internal/cleanliness"),
	},
	"comments list": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_comments.go",
		HandlerFunc:    "runComments",
		Package:        ptr("aag-engine/internal/commentscan"),
	},
	"docs placement-check": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_docs.go",
		HandlerFunc:    "runDocs",
		Package:        ptr("aag-engine/internal/cleanliness"),
	},
	"obligation check": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_obligation.go",
		HandlerFunc:    "runObligation",
		Package:        ptr("aag-engine/internal/obligation"),
	},
	"repair-context": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_repair.go",
		HandlerFunc:    "runRepairContext",
		Package:        ptr("aag-engine/internal/repaircontext"),
	},
	"project stale": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_project.go",
		HandlerFunc:    "runProject",
		Package:        ptr("aag-engine/internal/projectstatus"),
	},
	"next": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_project.go",
		HandlerFunc:    "runNext",
		Package:        ptr("aag-engine/internal/projectstatus"),
	},
	"wrap": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_wrap.go",
		HandlerFunc:    "runWrap",
		Package:        ptr("aag-engine/internal/responsewrap"),
	},
	"describe": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_describe.go",
		HandlerFunc:    "runDescribe",
		Package:        ptr("aag-engine/internal/describe"),
	},
	"list": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_describe.go",
		HandlerFunc:    "runList",
		Package:        ptr("aag-engine/internal/describe"),
	},
	"introspect command": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_introspect.go",
		HandlerFunc:    "runIntrospectCommand",
		Package:        ptr("aag-engine/internal/introspect"),
	},
	"introspect schema": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_introspect.go",
		HandlerFunc:    "runIntrospectSchema",
		Package:        ptr("aag-engine/internal/introspect"),
	},
	"self-check": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_selfcheck.go",
		HandlerFunc:    "runSelfCheck",
		Package:        ptr("aag-engine/internal/selfcheck"),
	},
	"chaos": {
		DispatcherFile: "aag-engine/cmd/aag/main.go",
		HandlerFile:    "aag-engine/cmd/aag/command_chaos.go",
		HandlerFunc:    "runChaos",
		Package:        ptr("aag-engine/internal/chaos"),
	},
}

// schemaTable は command → output schema path の mapping。
// schema 不在 (= 旧 strict schema 命名 / 新 v4.2 stable subset 化未完) は nil。
var schemaTable = map[string]*string{
	"validate":             ptr("docs/contracts/aag/detector-result.schema.json"),
	"shadow":               ptr("docs/contracts/aag/detector-result.schema.json"),
	"task prepare":         ptr("docs/contracts/aag/task-capsule.schema.json"),
	"task validate":        ptr("docs/contracts/aag/task-capsule.schema.json"),
	"task close":           ptr("docs/contracts/aag/task-capsule.schema.json"),
	"stats files":          ptr("docs/contracts/aag/aag-size-statistics.schema.json"),
	"obligation check":     ptr("docs/contracts/aag/commands/obligation-check-output.schema.json"),
	"detector refs":        ptr("docs/contracts/aag/commands/detector-refs-output.schema.json"),
	"describe":             ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"list":                 ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"introspect command":   ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"introspect schema":    ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"self-check":           ptr("docs/contracts/aag/commands/self-check-output.schema.json"),
	"chaos":                ptr("docs/contracts/aag/commands/chaos-output.schema.json"),
	"fixtures":             ptr("docs/contracts/aag/commands/fixtures-output.schema.json"),
	"where-am-i":           ptr("docs/contracts/aag/commands/where-am-i-output.schema.json"),
	"context":              ptr("docs/contracts/aag/commands/context-output.schema.json"),
	"rule locate":          ptr("docs/contracts/aag/commands/rule-locate-output.schema.json"),
	"changed":              ptr("docs/contracts/aag/commands/changed-output.schema.json"),
	"clean check":          ptr("docs/contracts/aag/commands/clean-check-output.schema.json"),
	"comments list":        ptr("docs/contracts/aag/commands/comments-list-output.schema.json"),
	"docs placement-check": ptr("docs/contracts/aag/commands/docs-placement-check-output.schema.json"),
	"repair-context":       ptr("docs/contracts/aag/commands/repair-context-output.schema.json"),
	"project stale":        ptr("docs/contracts/aag/commands/project-stale-output.schema.json"),
	// 以下は schema 未 articulate (= v4.2 subsequent PR で stable subset 化候補)
	"next":                 nil,
	"wrap":                 nil,
}

// testTable は command → 主要 test file path の mapping (= multiple 可能、走査の起点として articulate)。
var testTable = map[string][]string{
	"validate":             {"aag-engine/cmd/aag/main_test.go", "aag-engine/internal/detectors"},
	"fixtures":             {"aag-engine/internal/fixture"},
	"shadow":               {"aag-engine/internal/shadow"},
	"task prepare":         {"aag-engine/internal/taskcapsule/task_capsule_test.go"},
	"task validate":        {"aag-engine/internal/taskcapsule/validate_test.go"},
	"task close":           {"aag-engine/internal/taskcapsule"},
	"stats files":          {"aag-engine/internal/stats"},
	"where-am-i":           {"aag-engine/internal/navigation/whereami_test.go"},
	"context":              {"aag-engine/internal/navigation/context_test.go"},
	"changed":              {"aag-engine/internal/navigation/changed_test.go"},
	"rule locate":          {"aag-engine/internal/navigation/rule_test.go"},
	"detector refs":        {"aag-engine/internal/navigation/detector_test.go"},
	"clean check":          {"aag-engine/internal/cleanliness"},
	"comments list":        {"aag-engine/internal/commentscan"},
	"docs placement-check": {"aag-engine/internal/cleanliness"},
	"obligation check":     {"aag-engine/internal/obligation"},
	"repair-context":       {"aag-engine/internal/repaircontext"},
	"project stale":        {"aag-engine/internal/projectstatus"},
	"next":                 {"aag-engine/internal/projectstatus"},
	"wrap":                 {"aag-engine/internal/responsewrap/wrap_test.go"},
	"describe":             {"aag-engine/internal/describe/describe_test.go"},
	"list":                 {"aag-engine/internal/describe/describe_test.go"},
	"introspect command":   {"aag-engine/internal/introspect/introspect_test.go"},
	"introspect schema":    {"aag-engine/internal/introspect/schema_test.go"},
	"self-check":           {"aag-engine/internal/selfcheck/selfcheck_test.go"},
	"chaos":                {"aag-engine/internal/chaos/chaos_test.go"},
}

// exampleTable は command → example fixtures directory path の mapping。
//
// fixtures/aag/commands/<cmd-id>/examples/ に articulate された snapshot output。
// AI session が `aag introspect command <name>` から本 directory に navigate して
// representative shape を articulate する substrate (= v4.2 examples-phase1 seed)。
//
// directory 不在 (= example articulate されていない command) は nil。
//
// command name と directory id の articulate (= directory id は command name の
// space → '-' 変換、特殊な multi-word は同 idiom):
//   - "self-check" → "self-check"
//   - "introspect command" → "introspect-command"
//   - "introspect schema" → "introspect-schema"
//   - "task prepare" → "task-prepare" (= 未 articulate、demand-driven)
var exampleTable = map[string]*string{
	"self-check":           ptr("fixtures/aag/commands/self-check/examples/"),
	"fixtures":             ptr("fixtures/aag/commands/fixtures/examples/"),
	"list":                 ptr("fixtures/aag/commands/list/examples/"),
	"where-am-i":           ptr("fixtures/aag/commands/where-am-i/examples/"),
	"clean check":          ptr("fixtures/aag/commands/clean-check/examples/"),
	"docs placement-check": ptr("fixtures/aag/commands/docs-placement-check/examples/"),
	"project stale":        ptr("fixtures/aag/commands/project-stale/examples/"),
	"shadow":               ptr("fixtures/aag/commands/shadow/examples/"),
	"validate":             ptr("fixtures/aag/commands/validate/examples/"),
	"describe":             ptr("fixtures/aag/commands/describe/examples/"),
	"introspect command":   ptr("fixtures/aag/commands/introspect-command/examples/"),
	"introspect schema":    ptr("fixtures/aag/commands/introspect-schema/examples/"),
	"rule locate":          ptr("fixtures/aag/commands/rule-locate/examples/"),
	"detector refs":        ptr("fixtures/aag/commands/detector-refs/examples/"),
	"chaos":                ptr("fixtures/aag/commands/chaos/examples/"),
	// 以下は example 未 articulate (= demand-driven 起動候補、input 依存度高)
	"context":         nil,
	"changed":         nil,
	"obligation check": nil,
	"comments list":   nil,
	"stats files":     nil,
	"task prepare":    nil,
	"task validate":   nil,
	"task close":      nil,
	"repair-context":  nil,
	"wrap":            nil,
	"next":            nil,
}

// Introspect は command 名から implementation pointer 等を articulate する。
//
// command 名は full name (= 'task prepare' / 'rule locate' / 'detector refs' /
// 'introspect command' 等) を accept。
//
// Errors:
//   - command 空 → error
//   - command 未登録 → error
func Introspect(command string) (IntrospectOutput, error) {
	if command == "" {
		return IntrospectOutput{}, fmt.Errorf("Introspect: command must be non-empty")
	}
	desc, err := describe.Describe(command)
	if err != nil {
		return IntrospectOutput{}, fmt.Errorf("Introspect: %w", err)
	}
	impl, ok := implTable[command]
	if !ok {
		return IntrospectOutput{}, fmt.Errorf("Introspect: implementation pointer not articulated for %q", command)
	}
	return IntrospectOutput{
		SchemaVersion:  IntrospectSchemaVersion,
		Command:        desc.Command,
		Implementation: impl,
		Schema:         schemaTable[command],
		Tests:          testTable[command],
		Examples:       exampleTable[command], // v4.2 examples-phase1 で articulate (= nil = 未 articulate command)
		Provenance: provenance.Compute(
			provenance.Canonical,
			"embedded implTable + schemaTable + testTable + exampleTable + describe.commandTable",
		),
	}, nil
}

// ─────────────────────────────────────────────────────────────────────
// Accessor functions for selfcheck / external substrate verification。
// ─────────────────────────────────────────────────────────────────────

// ImplTableNames returns the set of command names articulated in implTable。
func ImplTableNames() map[string]bool {
	out := make(map[string]bool, len(implTable))
	for k := range implTable {
		out[k] = true
	}
	return out
}

// AllImplPointers returns a copy of implTable for read-only access。
func AllImplPointers() map[string]ImplementationPointer {
	out := make(map[string]ImplementationPointer, len(implTable))
	for k, v := range implTable {
		out[k] = v
	}
	return out
}

// AllSchemaPaths returns a copy of schemaTable for read-only access。
func AllSchemaPaths() map[string]*string {
	out := make(map[string]*string, len(schemaTable))
	for k, v := range schemaTable {
		out[k] = v
	}
	return out
}

// AllTestPaths returns a copy of testTable for read-only access。
func AllTestPaths() map[string][]string {
	out := make(map[string][]string, len(testTable))
	for k, v := range testTable {
		paths := make([]string, len(v))
		copy(paths, v)
		out[k] = paths
	}
	return out
}

// AllExamplePaths returns a copy of exampleTable for read-only access。
func AllExamplePaths() map[string]*string {
	out := make(map[string]*string, len(exampleTable))
	for k, v := range exampleTable {
		out[k] = v
	}
	return out
}

// MarshalJSON returns indented JSON without HTML escaping。
//
// Accepts any introspect output type (= IntrospectOutput / SchemaIntrospectOutput)。
func MarshalJSON(out any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		return nil, err
	}
	b := buf.Bytes()
	if n := len(b); n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}
	return b, nil
}

func ptr(s string) *string { return &s }
