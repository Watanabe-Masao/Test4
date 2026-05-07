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
	"aag-self-check-v1": {
		ID:      "aag-self-check-v1",
		Title:   "Self-Check Output",
		Path:    ptr("docs/contracts/aag/commands/self-check-output.schema.json"),
		Purpose: "aag self-check の output (= 5 軸 cross-validation result + healthy boolean)",
	},
	"aag-engine-fixtures-output-v1": {
		ID:      "aag-engine-fixtures-output-v1",
		Title:   "AAG Fixtures Output",
		Path:    ptr("docs/contracts/aag/commands/fixtures-output.schema.json"),
		Purpose: "aag fixtures の output (= RunResult + fixtureSummary、fixture catalog articulate)",
	},
	"where-am-i-v2": {
		ID:      "where-am-i-v2",
		Title:   "WhereAmI Output v2",
		Path:    ptr("docs/contracts/aag/commands/where-am-i-output.schema.json"),
		Purpose: "aag where-am-i の output (= branch / activeProject / repoHealth / openObligations / manifestContext snapshot)",
	},
	"context-project-v1": {
		ID:      "context-project-v1",
		Title:   "Context Project Output",
		Path:    ptr("docs/contracts/aag/commands/context-output.schema.json"),
		Purpose: "aag context の output (= active project の requiredReads / constraints / nextActions、light-weight bootstrap)",
	},
	"rule-locate-v1": {
		ID:      "rule-locate-v1",
		Title:   "Rule Locate Output",
		Path:    ptr("docs/contracts/aag/commands/rule-locate-output.schema.json"),
		Purpose: "aag rule locate <ruleId> の output (= rule の definition / guards / docs / thresholds articulate)",
	},
	"detector-refs-v1": {
		ID:      "detector-refs-v1",
		Title:   "Detector Refs Output",
		Path:    ptr("docs/contracts/aag/commands/detector-refs-output.schema.json"),
		Purpose: "aag detector refs <detectorId> の output (= goImpl / tsImpl / schema / fixtures pointer articulate)",
	},
	"changed-explain-v1": {
		ID:      "changed-explain-v1",
		Title:   "Changed Explain Output",
		Path:    ptr("docs/contracts/aag/commands/changed-output.schema.json"),
		Purpose: "aag changed --base..--head の output (= changed file + area + obligations + requiredReads articulate)",
	},
	"clean-check-v1": {
		ID:      "clean-check-v1",
		Title:   "Clean Check Output",
		Path:    ptr("docs/contracts/aag/commands/clean-check-output.schema.json"),
		Purpose: "aag clean check の output (= cleanliness rule violation articulate)",
	},
	"comments-list-v1": {
		ID:      "comments-list-v1",
		Title:   "Comments List Output",
		Path:    ptr("docs/contracts/aag/commands/comments-list-output.schema.json"),
		Purpose: "aag comments list --kind の output (= TODO / suppression / expired comment scan articulate)",
	},
	"docs-placement-check-v1": {
		ID:      "docs-placement-check-v1",
		Title:   "Docs Placement Check Output",
		Path:    ptr("docs/contracts/aag/commands/docs-placement-check-output.schema.json"),
		Purpose: "aag docs placement-check の output (= schema / generated artifact 配置規約違反 articulate)",
	},
	"obligation-check-v1": {
		ID:      "obligation-check-v1",
		Title:   "Obligation Check Output",
		Path:    ptr("docs/contracts/aag/commands/obligation-check-output.schema.json"),
		Purpose: "aag obligation check の output (= premise contract triggers + requirements articulate)",
	},
	"repair-context-v1": {
		ID:      "repair-context-v1",
		Title:   "Repair Context Output",
		Path:    ptr("docs/contracts/aag/commands/repair-context-output.schema.json"),
		Purpose: "aag repair-context --from の output (= input kind classifier + repairReads / suggestedActions / requiredChecks)",
	},
	"project-stale-v1": {
		ID:      "project-stale-v1",
		Title:   "Project Stale Output",
		Path:    ptr("docs/contracts/aag/commands/project-stale-output.schema.json"),
		Purpose: "aag project stale の output (= active project の最終 commit から stale 判定)",
	},
	"aag-chaos-overview-v1": {
		ID:      "aag-chaos-overview-v1",
		Title:   "Chaos Overview Output",
		Path:    ptr("docs/contracts/aag/commands/chaos-output.schema.json"),
		Purpose: "aag chaos (no args) の output (= 全 command の adversarial coverage articulate)",
	},
	"aag-chaos-command-v1": {
		ID:      "aag-chaos-command-v1",
		Title:   "Chaos Per-Command Output",
		Path:    ptr("docs/contracts/aag/commands/chaos-output.schema.json"),
		Purpose: "aag chaos <command> の output (= per-command failure modes adversarial 視点)",
	},
	"stats-files-query-v1": {
		ID:      "stats-files-query-v1",
		Title:   "Stats Files Query Output",
		Path:    ptr("docs/contracts/aag/commands/stats-files-query-output.schema.json"),
		Purpose: "aag stats files の output (= filtered query result、aag-size-statistics-v1 と分離)",
	},
	"task-validate-v1": {
		ID:      "task-validate-v1",
		Title:   "Task Validate Output",
		Path:    ptr("docs/contracts/aag/commands/task-validate-output.schema.json"),
		Purpose: "aag task validate の output (= valid / errors articulate、task-capsule-v1 input と分離)",
	},
	"task-close-v1": {
		ID:      "task-close-v1",
		Title:   "Task Close Output",
		Path:    ptr("docs/contracts/aag/commands/task-close-output.schema.json"),
		Purpose: "aag task close の output (= readyToClose / blockingIssues articulate)",
	},
}

// schemaProducersTable は schema id → 該当 schema を produce する command 一覧。
//
// schema-graph.json edges (= kind: produces) と同期。
var schemaProducersTable = map[string][]string{
	"detector-result-v1":            {"validate", "shadow"},
	"task-capsule-v1":                {"task prepare"},
	// aag-size-statistics-v1 producer は TS-side architecture-health collector
	// (= references/04-tracking/generated/aag-size-statistics.json articulate)、
	// Go-side commandTable には producer 不在。consumer は stats files (= 入力 source)。
	"aag-pipeline-envelope-v1":       {"wrap"},
	"aag-describe-v1":                {"describe"},
	"aag-list-v1":                    {"list"},
	"aag-introspect-command-v1":      {"introspect command"},
	"aag-introspect-schema-v1":       {"introspect schema"},
	"aag-self-check-v1":              {"self-check"},
	"aag-engine-fixtures-output-v1":  {"fixtures"},
	"where-am-i-v2":                  {"where-am-i"},
	"context-project-v1":             {"context"},
	"rule-locate-v1":                 {"rule locate"},
	"detector-refs-v1":               {"detector refs"},
	"changed-explain-v1":             {"changed"},
	"clean-check-v1":                 {"clean check"},
	"comments-list-v1":               {"comments list"},
	"docs-placement-check-v1":        {"docs placement-check"},
	"obligation-check-v1":            {"obligation check"},
	"repair-context-v1":              {"repair-context"},
	"project-stale-v1":               {"project stale"},
	"aag-chaos-overview-v1":          {"chaos"},
	"aag-chaos-command-v1":           {"chaos"},
	"stats-files-query-v1":           {"stats files"},
	"task-validate-v1":               {"task validate"},
	"task-close-v1":                  {"task close"},
}

// schemaConsumersTable は schema id → 該当 schema を consume する command 一覧。
//
// schema-graph.json edges (= kind: consumes) と同期。
var schemaConsumersTable = map[string][]string{
	"aag-parameters-v1":       {"stats files"},
	"aag-size-statistics-v1":  {"stats files"},
	"source-facts-v1":         {"stats files"},
	"premise-contracts-v1":    {"changed", "obligation check"},
	"detection-inventory-v1":  {"detector refs"},
	"detector-result-v1":      {"repair-context"},
	"task-capsule-v1":         {"task validate", "task close", "repair-context"},
	"obligation-check-v1":     {"repair-context"},
	"clean-check-v1":          {"repair-context"},
	"docs-placement-check-v1": {"repair-context"},
}

// AllSchemaInfo returns a copy of schemaInfoTable for read-only access。
func AllSchemaInfo() map[string]SchemaInfo {
	out := make(map[string]SchemaInfo, len(schemaInfoTable))
	for k, v := range schemaInfoTable {
		out[k] = v
	}
	return out
}

// SchemaProducers returns the producer command list for a schema id (= empty if none)。
func SchemaProducers(id string) []string {
	v := schemaProducersTable[id]
	out := make([]string, len(v))
	copy(out, v)
	return out
}

// SchemaConsumers returns the consumer command list for a schema id (= empty if none)。
func SchemaConsumers(id string) []string {
	v := schemaConsumersTable[id]
	out := make([]string, len(v))
	copy(out, v)
	return out
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
