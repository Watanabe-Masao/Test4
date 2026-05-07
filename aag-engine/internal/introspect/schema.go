package introspect

import (
	"fmt"

	"aag-engine/internal/provenance"
)

// SchemaIntrospectSchemaVersion is the schemaVersion for `aag introspect schema` output.
const SchemaIntrospectSchemaVersion = "aag-introspect-schema-v1"

// SchemaIntrospectOutput is the envelope for `aag introspect schema <id>`。
//
// schema id を解決して path + virtual flag + producer command + consumer command を
// articulate する。AI session が schema-graph.json を walk せずに 1 command で
// schema の relation を articulate するための substrate seed。
type SchemaIntrospectOutput struct {
	SchemaVersion string                `json:"schemaVersion"`
	Schema        SchemaInfo            `json:"schema"`
	Producers     []string              `json:"producers"`
	Consumers     []string              `json:"consumers"`
	Provenance    provenance.Provenance `json:"provenance"`
}

// SchemaInfo は 1 schema の identity + locator metadata。
type SchemaInfo struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Path      *string `json:"path"`
	IsVirtual bool    `json:"isVirtual"`
	Purpose   string  `json:"purpose"`
}

// schemaInfoTable は AAG schema (= file-backed + virtual) の embedded source-of-truth。
//
// schema-graph.json (= docs/generated/aag/schema-graph.json) と同期。schema 追加 /
// rename 時は両 table を update する (= schema-graph.json は graph view、本 table は
// AI introspection lookup)。
var schemaInfoTable = map[string]SchemaInfo{
	"aag-parameters-v1": {
		ID:      "aag-parameters-v1",
		Title:   "AAG Parameters v1",
		Path:    ptr("docs/contracts/aag/aag-parameters.schema.json"),
		Purpose: "size bucket / threshold / layer label の parameter source-of-truth",
	},
	"aag-response-v1": {
		ID:      "aag-response-v1",
		Title:   "AagResponse",
		Path:    ptr("docs/contracts/aag/aag-response.schema.json"),
		Purpose: "TS 側 guard / obligations / health / pre-commit の統一 response 契約",
	},
	"aag-size-statistics-v1": {
		ID:      "aag-size-statistics-v1",
		Title:   "AAG Size Statistics v1",
		Path:    ptr("docs/contracts/aag/aag-size-statistics.schema.json"),
		Purpose: "stats files の percentile / bucket / range 出力 shape",
	},
	"detection-inventory-v1": {
		ID:      "detection-inventory-v1",
		Title:   "Detection Inventory v1",
		Path:    ptr("docs/contracts/aag/detection-inventory.schema.json"),
		Purpose: "全 detector の id / family / fixtures / schema relation の inventory",
	},
	"detector-result-v1": {
		ID:      "detector-result-v1",
		Title:   "DetectorResult",
		Path:    ptr("docs/contracts/aag/detector-result.schema.json"),
		Purpose: "validate / shadow command の output (= violations 配列の canonical shape)",
	},
	"premise-contracts-v1": {
		ID:      "premise-contracts-v1",
		Title:   "Premise Contracts v1",
		Path:    ptr("docs/contracts/aag/premise-contract.schema.json"),
		Purpose: "path → required reads / co-changes mapping (= obligation check の source)",
	},
	"source-facts-v1": {
		ID:      "source-facts-v1",
		Title:   "Source Facts v1",
		Path:    ptr("docs/contracts/aag/source-facts.schema.json"),
		Purpose: "physicalLines / blankLines / commentLines / effectiveCodeLines per file",
	},
	"task-capsule-v1": {
		ID:      "task-capsule-v1",
		Title:   "Task Capsule v1",
		Path:    ptr("docs/contracts/aag/task-capsule.schema.json"),
		Purpose: "task prepare / validate / close の input + output canonical shape",
	},
	"aag-pipeline-envelope-v1": {
		ID:        "aag-pipeline-envelope-v1",
		Title:     "Pipeline envelope (= aag wrap output)",
		Path:      nil,
		IsVirtual: true,
		Purpose:   "aag wrap (= stdin pipeline composition envelope)、Go internal package で articulate",
	},
	"aag-describe-v1": {
		ID:      "aag-describe-v1",
		Title:   "Describe Output",
		Path:    ptr("docs/contracts/aag/commands/describe-output.schema.json"),
		Purpose: "aag describe <command> の output (= 1 command の metadata articulate)",
	},
	"aag-list-v1": {
		ID:      "aag-list-v1",
		Title:   "List Output",
		Path:    ptr("docs/contracts/aag/commands/describe-output.schema.json"),
		Purpose: "aag list の output (= 全 command の metadata articulate)",
	},
	"aag-introspect-command-v1": {
		ID:      "aag-introspect-command-v1",
		Title:   "Introspect Command Output",
		Path:    ptr("docs/contracts/aag/commands/describe-output.schema.json"),
		Purpose: "aag introspect command <name> の output (= command の implementation pointer + metadata)",
	},
	"aag-introspect-schema-v1": {
		ID:      "aag-introspect-schema-v1",
		Title:   "Introspect Schema Output",
		Path:    ptr("docs/contracts/aag/commands/describe-output.schema.json"),
		Purpose: "aag introspect schema <id> の output (= schema の path + producers + consumers articulate)",
	},
}

// schemaProducersTable は schema id → 該当 schema を produce する command 一覧。
//
// schema-graph.json edges (= kind: produces) と同期。
var schemaProducersTable = map[string][]string{
	"detector-result-v1":          {"validate", "shadow"},
	"task-capsule-v1":             {"task prepare"},
	"aag-size-statistics-v1":      {"stats files"},
	"aag-pipeline-envelope-v1":    {"wrap"},
	"aag-describe-v1":             {"describe"},
	"aag-list-v1":                 {"list"},
	"aag-introspect-command-v1":   {"introspect command"},
	"aag-introspect-schema-v1":    {"introspect schema"},
}

// schemaConsumersTable は schema id → 該当 schema を consume する command 一覧。
//
// schema-graph.json edges (= kind: consumes) と同期。
var schemaConsumersTable = map[string][]string{
	"aag-parameters-v1":      {"stats files"},
	"source-facts-v1":        {"stats files"},
	"premise-contracts-v1":   {"changed", "obligation check"},
	"detection-inventory-v1": {"detector refs"},
	"detector-result-v1":     {"repair-context"},
	"task-capsule-v1":        {"task validate", "task close", "repair-context"},
}

// IntrospectSchema は schema id から identity + relation を articulate する。
//
// id は schema-graph.json の node id (= 'detector-result-v1' / 'aag-pipeline-envelope-v1' 等) を accept。
//
// Errors:
//   - id 空 → error
//   - id 未登録 → error
func IntrospectSchema(id string) (SchemaIntrospectOutput, error) {
	if id == "" {
		return SchemaIntrospectOutput{}, fmt.Errorf("IntrospectSchema: id must be non-empty")
	}
	info, ok := schemaInfoTable[id]
	if !ok {
		return SchemaIntrospectOutput{}, fmt.Errorf("IntrospectSchema: unknown schema id %q (= 'aag list' / 'docs/generated/aag/schema-graph.json' で articulate されている schema id を articulate)", id)
	}
	return SchemaIntrospectOutput{
		SchemaVersion: SchemaIntrospectSchemaVersion,
		Schema:        info,
		Producers:     schemaProducersTable[id],
		Consumers:     schemaConsumersTable[id],
		Provenance: provenance.Compute(
			provenance.Canonical,
			"embedded schemaInfoTable + schemaProducersTable + schemaConsumersTable (= schema-graph.json と同期)",
		),
	}, nil
}
