// wrap_test.go — improvement A (= reposteward-ai-ops-platform、aag wrap)
//
// schemaVersion = "aag-pipeline-envelope-v1" (= v4.2 seed で rename、DA-γ-001、
// 旧 "aag-response-v2" との name conflict を解消)。
package responsewrap

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestWrap_RejectsNilStdin(t *testing.T) {
	_, err := Wrap(WrapInput{Command: "x"})
	if err == nil {
		t.Error("expected error for nil Stdin")
	}
}

func TestWrap_RejectsEmptyCommand(t *testing.T) {
	_, err := Wrap(WrapInput{Stdin: bytes.NewBufferString(`{}`)})
	if err == nil {
		t.Error("expected error for empty command")
	}
}

func TestWrap_RejectsEmptyStdin(t *testing.T) {
	_, err := Wrap(WrapInput{Stdin: bytes.NewBufferString(""), Command: "x"})
	if err == nil {
		t.Error("expected error for empty stdin")
	}
}

func TestWrap_RejectsInvalidJSON(t *testing.T) {
	_, err := Wrap(WrapInput{Stdin: bytes.NewBufferString("{not valid"), Command: "x"})
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestWrap_BasicShape(t *testing.T) {
	fixed := time.Date(2026, 5, 6, 12, 0, 0, 0, time.UTC)
	in := bytes.NewBufferString(`{"foo":"bar","summary":"echoed"}`)
	out, err := Wrap(WrapInput{
		Stdin:   in,
		Command: "test-cmd",
		NowFn:   func() time.Time { return fixed },
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != WrapSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.Command != "test-cmd" {
		t.Errorf("command = %q", out.Command)
	}
	if out.Source != SourceName {
		t.Errorf("source = %q", out.Source)
	}
	if out.Timestamp != "2026-05-06T12:00:00Z" {
		t.Errorf("timestamp = %q", out.Timestamp)
	}
	if out.Summary != "echoed" {
		t.Errorf("summary should echo input: got %q", out.Summary)
	}
	// data roundtrip
	var inner map[string]interface{}
	if err := json.Unmarshal(out.Data, &inner); err != nil {
		t.Fatalf("data is not valid JSON: %v", err)
	}
	if inner["foo"] != "bar" {
		t.Errorf("data.foo = %v, want bar", inner["foo"])
	}
}

func TestWrap_NoSummaryFieldInInput(t *testing.T) {
	out, err := Wrap(WrapInput{
		Stdin:   bytes.NewBufferString(`{"x":1}`),
		Command: "test-cmd",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Summary != "" {
		t.Errorf("Summary should be empty when input has no summary field, got: %q", out.Summary)
	}
}

func TestWrap_ArrayInputAccepted(t *testing.T) {
	out, err := Wrap(WrapInput{
		Stdin:   bytes.NewBufferString(`[1,2,3]`),
		Command: "test-cmd",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(out.Data) != "[1,2,3]" {
		t.Errorf("array data should be preserved as-is, got: %s", out.Data)
	}
}

func TestMarshalJSON_NoHTMLEscape(t *testing.T) {
	out := WrappedResponse{
		SchemaVersion: WrapSchemaVersion,
		Command:       "test",
		Source:        SourceName,
		Timestamp:     "2026-05-06T12:00:00Z",
		Data:          json.RawMessage(`{"cmd":"cd app && npm test"}`),
	}
	b, err := MarshalJSON(out)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	if !strings.Contains(string(b), `&`) {
		t.Errorf("expected `&` literal, got escaped: %s", b)
	}
	if !strings.Contains(string(b), "\n  \"") {
		t.Error("expected indented JSON")
	}
}
