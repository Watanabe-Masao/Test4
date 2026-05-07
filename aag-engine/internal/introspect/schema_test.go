// schema_test.go — v4.2 seed (= reposteward-substrate-v4-2-introspect-provenance、aag introspect schema)
package introspect

import (
	"encoding/json"
	"testing"
)

func TestIntrospectSchema_RejectsEmpty(t *testing.T) {
	_, err := IntrospectSchema("")
	if err == nil {
		t.Error("expected error for empty id")
	}
}

func TestIntrospectSchema_RejectsUnknown(t *testing.T) {
	_, err := IntrospectSchema("nonexistent-schema-v99")
	if err == nil {
		t.Error("expected error for unknown id")
	}
}

func TestIntrospectSchema_FileBackedSchema(t *testing.T) {
	out, err := IntrospectSchema("detector-result-v1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != SchemaIntrospectSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Schema.ID != "detector-result-v1" {
		t.Errorf("schema.id = %q", out.Schema.ID)
	}
	if out.Schema.Path == nil {
		t.Error("schema.path must be articulated for file-backed schema")
	}
	if out.Schema.IsVirtual {
		t.Error("schema.isVirtual must be false for file-backed schema")
	}
	if len(out.Producers) == 0 {
		t.Error("detector-result-v1 must have at least 1 producer")
	}
	if out.Provenance.Confidence != "canonical" {
		t.Errorf("provenance.confidence = %q", out.Provenance.Confidence)
	}
}

func TestIntrospectSchema_VirtualSchema(t *testing.T) {
	out, err := IntrospectSchema("aag-pipeline-envelope-v1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !out.Schema.IsVirtual {
		t.Error("aag-pipeline-envelope-v1 must be marked isVirtual")
	}
	if out.Schema.Path != nil {
		t.Errorf("virtual schema must have nil path, got %v", out.Schema.Path)
	}
	if len(out.Producers) == 0 {
		t.Error("aag-pipeline-envelope-v1 must have at least 1 producer (= wrap)")
	}
}

func TestIntrospectSchema_SchemaInfoTableConsistency(t *testing.T) {
	// Every entry in producers/consumers tables must reference a schema in schemaInfoTable.
	for id := range schemaProducersTable {
		if _, ok := schemaInfoTable[id]; !ok {
			t.Errorf("schemaProducersTable references unknown schema %q", id)
		}
	}
	for id := range schemaConsumersTable {
		if _, ok := schemaInfoTable[id]; !ok {
			t.Errorf("schemaConsumersTable references unknown schema %q", id)
		}
	}
}

func TestIntrospectSchema_AllInfoIdsMatchKey(t *testing.T) {
	for key, info := range schemaInfoTable {
		if info.ID != key {
			t.Errorf("schemaInfoTable[%q].ID = %q (must match key)", key, info.ID)
		}
		if info.Title == "" {
			t.Errorf("schemaInfoTable[%q].Title must be non-empty", key)
		}
		if info.Purpose == "" {
			t.Errorf("schemaInfoTable[%q].Purpose must be non-empty", key)
		}
	}
}

func TestIntrospectSchema_JSONRoundtrip(t *testing.T) {
	out, err := IntrospectSchema("task-capsule-v1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	var back SchemaIntrospectOutput
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("JSON roundtrip failed: %v", err)
	}
	if back.SchemaVersion != out.SchemaVersion {
		t.Error("schemaVersion roundtrip mismatch")
	}
}
