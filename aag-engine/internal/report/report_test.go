// report_test.go は RunResult JSON rendering の動作 contract を unit test で機械検証する。
package report

import (
	"encoding/json"
	"strings"
	"testing"

	"aag-engine/internal/contract"
)

// 空 DetectorResult[] の RunResult が valid JSON に rendering される。
func TestRenderJSON_EmptyResult(t *testing.T) {
	r := NewEmptyRunResult(".")

	out, err := RenderJSON(r)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("rendered output is not valid JSON: %v\noutput=%q", err, string(out))
	}

	if parsed["schemaVersion"] != RunResultSchemaVersion {
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
	rWithoutNote := NewEmptyRunResult(".")
	out, err := RenderJSON(rWithoutNote)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}
	if strings.Contains(string(out), "\"note\":") {
		t.Errorf("note field should be omitted when empty, got: %q", string(out))
	}

	rWithNote := NewEmptyRunResult(".")
	rWithNote.Note = "Phase 1 skeleton"
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
	r := NewEmptyRunResult(".")
	out, err := RenderJSON(r)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}
	if !strings.Contains(string(out), "\n  \"") {
		t.Errorf("output should be indent=2 multi-line, got: %q", string(out))
	}
}

// DeriveStatus: 空 → pass。
func TestDeriveStatus_Empty(t *testing.T) {
	if DeriveStatus([]contract.DetectorResult{}) != "pass" {
		t.Errorf("empty results should derive 'pass'")
	}
}

// DeriveStatus: gate severity 1 件 → fail。
func TestDeriveStatus_GateFail(t *testing.T) {
	r, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityGate,
	})
	if DeriveStatus([]contract.DetectorResult{r}) != "fail" {
		t.Errorf("gate severity should derive 'fail'")
	}
}

// DeriveStatus: block-merge severity 1 件 → fail。
func TestDeriveStatus_BlockMergeFail(t *testing.T) {
	r, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityBlockMerge,
	})
	if DeriveStatus([]contract.DetectorResult{r}) != "fail" {
		t.Errorf("block-merge severity should derive 'fail'")
	}
}

// DeriveStatus: warn のみは pass (= advisory、CI hard fail 引き起こさない)。
func TestDeriveStatus_WarnOnlyPass(t *testing.T) {
	r, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "x",
		SourceFile:    "a.ts",
		Severity:      contract.SeverityWarn,
	})
	if DeriveStatus([]contract.DetectorResult{r}) != "pass" {
		t.Errorf("warn-only results should derive 'pass' (= advisory)")
	}
}

// JSON output が contract.DetectorResult を含む場合の field 整合。
func TestRenderJSON_WithDetectorResult(t *testing.T) {
	r1, _ := contract.CreateDetectorResult(contract.DetectorResult{
		RuleId:        "AR-EXAMPLE",
		DetectionType: "governance-ops",
		SourceFile:    "app/src/x.ts",
		Severity:      contract.SeverityGate,
	})

	rr := NewEmptyRunResult(".")
	rr.DetectorResults = []contract.DetectorResult{r1}
	rr.Status = DeriveStatus(rr.DetectorResults)

	out, err := RenderJSON(rr)
	if err != nil {
		t.Fatalf("RenderJSON failed: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	if parsed["status"] != "fail" {
		t.Errorf("status should be 'fail' (gate severity present), got %v", parsed["status"])
	}

	results, _ := parsed["detectorResults"].([]interface{})
	if len(results) != 1 {
		t.Fatalf("expected 1 detector result, got %d", len(results))
	}
	first, _ := results[0].(map[string]interface{})
	if first["ruleId"] != "AR-EXAMPLE" {
		t.Errorf("ruleId mismatch: %v", first["ruleId"])
	}
	if first["severity"] != "gate" {
		t.Errorf("severity mismatch: %v", first["severity"])
	}
}
