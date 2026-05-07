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
	"obligation check":     ptr("docs/contracts/aag/premise-contract.schema.json"),
	"detector refs":        ptr("docs/contracts/aag/detection-inventory.schema.json"),
	"describe":             ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"list":                 ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"introspect command":   ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	"introspect schema":    ptr("docs/contracts/aag/commands/describe-output.schema.json"),
	// 以下は schema 未 articulate (= v4.2 subsequent PR で stable subset 化候補)
	"fixtures":             nil,
	"where-am-i":           nil,
	"context":              nil,
	"changed":              nil,
	"rule locate":          nil,
	"clean check":          nil,
	"comments list":        nil,
	"docs placement-check": nil,
	"repair-context":       nil,
	"project stale":        nil,
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
		Examples:       nil, // v4.2 subsequent PR で fixtures/aag/commands/<cmd>/examples/ articulate 候補
		Provenance: provenance.Compute(
			provenance.Canonical,
			"embedded implTable + schemaTable + testTable + describe.commandTable",
		),
	}, nil
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
