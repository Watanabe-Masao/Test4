// Package aagindex implements `aag index <kind>` — substrate cross-reference index
// (= v4.2 cluster C C2 articulate)。
//
// schema-graph.json + describe.commandTable + introspect tables を projection
// して by-command / by-schema / by-detector の各 view を articulate。AI session が
// 多 hop walk せず 1 query で cross-reference を articulate するための substrate。
//
// 設計判断:
//   - 既存 source-of-truth (= schema-graph.json / describe / introspect) を
//     projection (= 新 logic 不在、view のみ articulate)
//   - by-command / by-schema は describe + introspect の合成
//   - by-detector は detection-inventory.schema.json + introspect の合成
//   - 静的 file (= docs/generated/aag/index/*.json) は別 PR で articulate 候補
//     (= 本 package は CLI 実時 articulate のみ)
package aagindex

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"

	"aag-engine/internal/describe"
	"aag-engine/internal/introspect"
	"aag-engine/internal/provenance"
)

// SchemaVersionByCommand is the schemaVersion for `aag index command` output.
const SchemaVersionByCommand = "aag-index-by-command-v1"

// SchemaVersionBySchema is the schemaVersion for `aag index schema` output.
const SchemaVersionBySchema = "aag-index-by-schema-v1"

// ByCommandOutput は `aag index command` の output envelope。
type ByCommandOutput struct {
	SchemaVersion string                `json:"schemaVersion"`
	TotalCommands int                   `json:"totalCommands"`
	Commands      []CommandIndexEntry   `json:"commands"`
	Provenance    provenance.Provenance `json:"provenance"`
}

// CommandIndexEntry は 1 command の cross-reference articulate。
type CommandIndexEntry struct {
	Name              string  `json:"name"`
	Family            string  `json:"family"`
	Maturity          string  `json:"maturity"`
	HandlerFile       string  `json:"handlerFile"`
	HandlerFunc       string  `json:"handlerFunc"`
	SchemaPath        *string `json:"schemaPath"`
	ExamplesPath      *string `json:"examplesPath"`
	FailureModesCount int     `json:"failureModesCount"`
	HasReproduction   int     `json:"reproducibleCount"`
}

// BySchemaOutput は `aag index schema` の output envelope。
type BySchemaOutput struct {
	SchemaVersion string                `json:"schemaVersion"`
	TotalSchemas  int                   `json:"totalSchemas"`
	Schemas       []SchemaIndexEntry    `json:"schemas"`
	Provenance    provenance.Provenance `json:"provenance"`
}

// SchemaIndexEntry は 1 schema の cross-reference articulate。
type SchemaIndexEntry struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Path      *string  `json:"path"`
	IsVirtual bool     `json:"isVirtual"`
	Producers []string `json:"producers"`
	Consumers []string `json:"consumers"`
}

// ByCommand returns the by-command index (= projection of describe + introspect)。
func ByCommand() ByCommandOutput {
	all := describe.List()
	impls := introspect.AllImplPointers()
	schemas := introspect.AllSchemaPaths()
	examples := introspect.AllExamplePaths()

	entries := make([]CommandIndexEntry, 0, len(all.Commands))
	for _, c := range all.Commands {
		impl := impls[c.Name]
		reproducible := 0
		for _, fm := range c.KnownFailureModes {
			if fm.Reproduction != nil {
				reproducible++
			}
		}
		entries = append(entries, CommandIndexEntry{
			Name:              c.Name,
			Family:            c.Family,
			Maturity:          c.Maturity,
			HandlerFile:       impl.HandlerFile,
			HandlerFunc:       impl.HandlerFunc,
			SchemaPath:        schemas[c.Name],
			ExamplesPath:      examples[c.Name],
			FailureModesCount: len(c.KnownFailureModes),
			HasReproduction:   reproducible,
		})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name < entries[j].Name })

	return ByCommandOutput{
		SchemaVersion: SchemaVersionByCommand,
		TotalCommands: len(entries),
		Commands:      entries,
		Provenance: provenance.Compute(
			provenance.Canonical,
			"projection of describe.commandTable + introspect.implTable / schemaTable / exampleTable",
		),
	}
}

// BySchema returns the by-schema index (= projection of introspect)。
func BySchema() BySchemaOutput {
	infos := introspect.AllSchemaInfo()
	entries := make([]SchemaIndexEntry, 0, len(infos))
	for id, info := range infos {
		entries = append(entries, SchemaIndexEntry{
			ID:        id,
			Title:     info.Title,
			Path:      info.Path,
			IsVirtual: info.IsVirtual,
			Producers: introspect.SchemaProducers(id),
			Consumers: introspect.SchemaConsumers(id),
		})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].ID < entries[j].ID })

	return BySchemaOutput{
		SchemaVersion: SchemaVersionBySchema,
		TotalSchemas:  len(entries),
		Schemas:       entries,
		Provenance: provenance.Compute(
			provenance.Canonical,
			"projection of introspect.schemaInfoTable + schemaProducersTable + schemaConsumersTable",
		),
	}
}

// SupportedKinds は `aag index` で articulate 可能な kind 一覧。
var SupportedKinds = []string{"command", "schema"}

// Run articulate index for a given kind ("command" / "schema")。
//
// Errors:
//   - kind 空 → error
//   - kind が SupportedKinds に articulate されていない → error
func Run(kind string) (any, error) {
	if kind == "" {
		return nil, fmt.Errorf("Run: kind must be non-empty (= %v)", SupportedKinds)
	}
	switch kind {
	case "command":
		return ByCommand(), nil
	case "schema":
		return BySchema(), nil
	default:
		return nil, fmt.Errorf("Run: unknown kind %q (= supported: %v)", kind, SupportedKinds)
	}
}

// MarshalJSON returns indented JSON without HTML escaping。
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
