// aagindex_test.go — v4.2 cluster C (= reposteward-substrate-v4-2-cluster-c)
package aagindex

import (
	"encoding/json"
	"testing"
)

func TestByCommand_BasicShape(t *testing.T) {
	out := ByCommand()
	if out.SchemaVersion != SchemaVersionByCommand {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.TotalCommands < 20 {
		t.Errorf("expected ≥ 20 commands, got %d", out.TotalCommands)
	}
	for _, e := range out.Commands {
		if e.Name == "" || e.Family == "" || e.Maturity == "" {
			t.Errorf("entry must have non-empty name/family/maturity: %+v", e)
		}
		if e.HandlerFile == "" {
			t.Errorf("entry %q must have non-empty handlerFile", e.Name)
		}
	}
}

func TestByCommand_SortedByName(t *testing.T) {
	out := ByCommand()
	for i := 1; i < len(out.Commands); i++ {
		if out.Commands[i-1].Name > out.Commands[i].Name {
			t.Errorf("not sorted: %q > %q", out.Commands[i-1].Name, out.Commands[i].Name)
		}
	}
}

func TestBySchema_BasicShape(t *testing.T) {
	out := BySchema()
	if out.SchemaVersion != SchemaVersionBySchema {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.TotalSchemas < 15 {
		t.Errorf("expected ≥ 15 schemas, got %d", out.TotalSchemas)
	}
	for _, e := range out.Schemas {
		if e.ID == "" || e.Title == "" {
			t.Errorf("entry must have non-empty id/title: %+v", e)
		}
		// virtual schema は path nil、file-backed は path 必須
		if e.IsVirtual && e.Path != nil {
			t.Errorf("virtual schema %q should have nil path, got %v", e.ID, e.Path)
		}
	}
}

func TestRun_RejectsEmpty(t *testing.T) {
	_, err := Run("")
	if err == nil {
		t.Error("expected error for empty kind")
	}
}

func TestRun_RejectsUnknown(t *testing.T) {
	_, err := Run("nonexistent-kind")
	if err == nil {
		t.Error("expected error for unknown kind")
	}
}

func TestRun_KnownKinds(t *testing.T) {
	for _, kind := range SupportedKinds {
		t.Run(kind, func(t *testing.T) {
			out, err := Run(kind)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			b, err := MarshalJSON(out)
			if err != nil {
				t.Fatalf("MarshalJSON error: %v", err)
			}
			var generic map[string]any
			if err := json.Unmarshal(b, &generic); err != nil {
				t.Fatalf("Unmarshal failed: %v", err)
			}
			if _, ok := generic["schemaVersion"]; !ok {
				t.Error("output must articulate schemaVersion")
			}
		})
	}
}
