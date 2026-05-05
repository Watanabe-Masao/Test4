// report_test.go は RunResult JSON rendering の動作 contract を unit test で機械検証する。
package report

import (
	"encoding/json"
	"strings"
	"testing"
)

// 空 DetectorResult[] の RunResult が valid JSON に rendering される。
func TestRenderJSON_EmptyResult(t *testing.T) {
	r := RunResult{
		SchemaVersion:   "aag-engine-run-result-v1",
		Status:          "pass",
		Repo:            ".",
		DetectorResults: []DetectorResult{},
	}

	out, err := RenderJSON(r)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("rendered output is not valid JSON: %v\noutput=%q", err, string(out))
	}

	if parsed["schemaVersion"] != "aag-engine-run-result-v1" {
		t.Errorf("schemaVersion mismatch: got %v", parsed["schemaVersion"])
	}
	if parsed["status"] != "pass" {
		t.Errorf("status should be 'pass', got %v", parsed["status"])
	}
	if parsed["repo"] != "." {
		t.Errorf("repo should be '.', got %v", parsed["repo"])
	}

	dr, ok := parsed["detectorResults"].([]interface{})
	if !ok {
		t.Fatalf("detectorResults should be array, got %T", parsed["detectorResults"])
	}
	if len(dr) != 0 {
		t.Errorf("detectorResults should be empty, got %d items", len(dr))
	}
}

// note field は articulate 時のみ JSON に含まれる (= omitempty)。
func TestRenderJSON_NoteOmitempty(t *testing.T) {
	rWithoutNote := RunResult{
		SchemaVersion:   "aag-engine-run-result-v1",
		Status:          "pass",
		Repo:            ".",
		DetectorResults: []DetectorResult{},
	}
	out, err := RenderJSON(rWithoutNote)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}
	if strings.Contains(string(out), "\"note\":") {
		t.Errorf("note field should be omitted when empty, got: %q", string(out))
	}

	rWithNote := RunResult{
		SchemaVersion:   "aag-engine-run-result-v1",
		Status:          "pass",
		Repo:            ".",
		DetectorResults: []DetectorResult{},
		Note:            "Phase 1 skeleton",
	}
	out, err = RenderJSON(rWithNote)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}
	if !strings.Contains(string(out), "\"note\":") {
		t.Errorf("note field should be included when articulate, got: %q", string(out))
	}
}

// 出力は indent=2 の JSON (= human-readable + parity 比較用)。
func TestRenderJSON_Indent(t *testing.T) {
	r := RunResult{
		SchemaVersion:   "aag-engine-run-result-v1",
		Status:          "pass",
		Repo:            ".",
		DetectorResults: []DetectorResult{},
	}
	out, err := RenderJSON(r)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}
	// indent=2 は line を含む (= single-line でない)
	if !strings.Contains(string(out), "\n  \"") {
		t.Errorf("output should be indent=2 multi-line, got: %q", string(out))
	}
}
