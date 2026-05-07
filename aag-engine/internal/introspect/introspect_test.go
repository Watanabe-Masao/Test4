// introspect_test.go — v4.2 seed (= reposteward-substrate-v4-2-seed、aag introspect command)
package introspect

import (
	"encoding/json"
	"strings"
	"testing"

	"aag-engine/internal/describe"
)

func TestIntrospect_RejectsEmptyCommand(t *testing.T) {
	_, err := Introspect("")
	if err == nil {
		t.Error("expected error for empty command")
	}
}

func TestIntrospect_RejectsUnknownCommand(t *testing.T) {
	_, err := Introspect("nonexistent-command")
	if err == nil {
		t.Error("expected error for unknown command")
	}
}

func TestIntrospect_KnownCommand(t *testing.T) {
	out, err := Introspect("validate")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != IntrospectSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Command.Name != "validate" {
		t.Errorf("command.name = %q", out.Command.Name)
	}
	if out.Implementation.DispatcherFile == "" {
		t.Error("implementation.dispatcherFile must be non-empty")
	}
	if out.Implementation.HandlerFile == "" {
		t.Error("implementation.handlerFile must be non-empty")
	}
	if out.Implementation.HandlerFunc == "" {
		t.Error("implementation.handlerFunc must be non-empty")
	}
	if out.Provenance.ComputedAt == "" {
		t.Error("provenance.computedAt must be articulated")
	}
	if out.Provenance.Confidence == "" {
		t.Error("provenance.confidence must be articulated")
	}
}

func TestIntrospect_MultiWordCommand(t *testing.T) {
	out, err := Introspect("task prepare")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Command.Name != "task prepare" {
		t.Errorf("command.name = %q", out.Command.Name)
	}
	if !strings.Contains(out.Implementation.HandlerFunc, "Task") {
		t.Errorf("handlerFunc should contain 'Task', got %q", out.Implementation.HandlerFunc)
	}
}

func TestIntrospect_AllDescribeCommandsHaveImplementation(t *testing.T) {
	all := describe.List()
	for _, c := range all.Commands {
		out, err := Introspect(c.Name)
		if err != nil {
			t.Errorf("Introspect(%q) failed: %v", c.Name, err)
			continue
		}
		if out.Implementation.DispatcherFile == "" {
			t.Errorf("%s: implementation.dispatcherFile is empty", c.Name)
		}
		if out.Implementation.HandlerFile == "" {
			t.Errorf("%s: implementation.handlerFile is empty", c.Name)
		}
	}
}

func TestIntrospect_CommandsWithSchemaArticulated(t *testing.T) {
	cases := map[string]string{
		"validate":           "detector-result",
		"task prepare":       "task-capsule",
		"stats files":        "aag-size-statistics",
		"obligation check":   "premise-contract",
		"detector refs":      "detector-refs-output",
		"describe":           "describe-output",
		"introspect command": "describe-output",
	}
	for command, expectedSchemaPart := range cases {
		t.Run(command, func(t *testing.T) {
			out, err := Introspect(command)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if out.Schema == nil {
				t.Errorf("%s: schema must be articulated", command)
				return
			}
			if !strings.Contains(*out.Schema, expectedSchemaPart) {
				t.Errorf("%s: schema = %q, want to contain %q", command, *out.Schema, expectedSchemaPart)
			}
		})
	}
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out, err := Introspect("validate")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	var back IntrospectOutput
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("JSON roundtrip failed: %v", err)
	}
	if back.SchemaVersion != out.SchemaVersion {
		t.Errorf("schemaVersion roundtrip mismatch")
	}
}
