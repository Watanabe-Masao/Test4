// describe_test.go — improvement E (= reposteward-ai-ops-platform、aag describe / aag list)
package describe

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestDescribe_RejectsEmptyCommand(t *testing.T) {
	_, err := Describe("")
	if err == nil {
		t.Error("expected error for empty command")
	}
}

func TestDescribe_RejectsUnknownCommand(t *testing.T) {
	_, err := Describe("nonexistent-command")
	if err == nil {
		t.Error("expected error for unknown command")
	}
}

func TestDescribe_KnownCommand(t *testing.T) {
	out, err := Describe("validate")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != DescribeSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Command.Name != "validate" {
		t.Errorf("command.name = %q", out.Command.Name)
	}
	if out.Command.Family != "go-mvp" {
		t.Errorf("command.family = %q", out.Command.Family)
	}
	if out.Command.Maturity == "" {
		t.Error("command.maturity should be non-empty")
	}
}

func TestDescribe_MultiWordCommand(t *testing.T) {
	out, err := Describe("task prepare")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Command.Name != "task prepare" {
		t.Errorf("command.name = %q", out.Command.Name)
	}
	if out.Command.Family != "task-capsule" {
		t.Errorf("command.family = %q", out.Command.Family)
	}
}

func TestList_AllCommandsPresent(t *testing.T) {
	out := List()
	if out.SchemaVersion != ListSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Total != len(out.Commands) {
		t.Errorf("total = %d, len(commands) = %d", out.Total, len(out.Commands))
	}
	if out.Total < 17 {
		t.Errorf("expected at least 17 commands, got %d", out.Total)
	}
	// All maturity values should be valid
	validMaturity := map[string]bool{"stable": true, "provisional": true, "advisory": true}
	for _, c := range out.Commands {
		if !validMaturity[c.Maturity] {
			t.Errorf("command %q has invalid maturity %q", c.Name, c.Maturity)
		}
		if c.Name == "" {
			t.Error("command name must be non-empty")
		}
		if c.Family == "" {
			t.Errorf("command %q family must be non-empty", c.Name)
		}
		if c.Summary == "" {
			t.Errorf("command %q summary must be non-empty", c.Name)
		}
	}
}

func TestList_SortedByName(t *testing.T) {
	out := List()
	for i := 1; i < len(out.Commands); i++ {
		if out.Commands[i-1].Name > out.Commands[i].Name {
			t.Errorf("commands not sorted: %q > %q", out.Commands[i-1].Name, out.Commands[i].Name)
		}
	}
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out := DescribeOutput{
		SchemaVersion: DescribeSchemaVersion,
		Command: CommandMetadata{
			Name:    "test",
			Summary: "a && b < c > d",
		},
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	if !strings.Contains(string(b), `&&`) {
		t.Errorf("expected `&&` literal, got escaped: %s", b)
	}
}

func TestList_JSONRoundtrip(t *testing.T) {
	out := List()
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	var back ListOutput
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatalf("JSON roundtrip failed: %v", err)
	}
	if back.Total != out.Total {
		t.Errorf("total mismatch: %d vs %d", back.Total, out.Total)
	}
}

func TestDescribe_AllCommandsFromTableLookable(t *testing.T) {
	all := List()
	for _, c := range all.Commands {
		_, err := Describe(c.Name)
		if err != nil {
			t.Errorf("Describe(%q) failed: %v", c.Name, err)
		}
	}
}
