// schema_validation_test.go は Schema Validation Detector の unit test + fixture parity test。
//
// Phase 6 (= Schema Validation Detector) で landing する test:
//   - Unit test:
//       - empty projects → empty result
//       - level 0/1/2/3/4 → 0 violation (= valid AAG-COA Level)
//       - level=5 (out of upper) → 1 violation
//       - level=-1 (out of lower) → 1 violation
//       - level=2.5 (非 integer) → 1 violation
//       - level=null → skip (= 別 rule、本 detector scope 外)
//       - 複数 invalid → 複数 violation、順序維持
//   - Fixture parity test:
//       - schema-validation/fail-level-out-of-range → 1 violation, Match=true
//
// 参照:
//   - tools/architecture-health/src/detectors/schema-validation-detector.ts (= TS source、parity reference)
//   - fixtures/aag/schema-validation/fail-level-out-of-range
package detectors

import (
	"encoding/json"
	"testing"

	"aag-engine/internal/contract"
	"aag-engine/internal/fixture"
)

// floatPtr は test helper (= `*float64` literal articulate)。
func floatPtr(f float64) *float64 {
	return &f
}

// Unit: empty projects は empty result。
func TestDetectSchemaValidationViolations_EmptyProjects(t *testing.T) {
	results, err := DetectSchemaValidationViolations(SchemaValidationFacts{
		Projects: []SchemaValidationProject{},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d", len(results))
	}
}

// Unit: AAG-COA Level 0〜4 すべて valid。
func TestDetectSchemaValidationViolations_AllValidLevels(t *testing.T) {
	facts := SchemaValidationFacts{
		Projects: []SchemaValidationProject{
			{ProjectId: "p0", ConfigPath: "p0/config.json", Level: floatPtr(0)},
			{ProjectId: "p1", ConfigPath: "p1/config.json", Level: floatPtr(1)},
			{ProjectId: "p2", ConfigPath: "p2/config.json", Level: floatPtr(2)},
			{ProjectId: "p3", ConfigPath: "p3/config.json", Level: floatPtr(3)},
			{ProjectId: "p4", ConfigPath: "p4/config.json", Level: floatPtr(4)},
		},
	}
	results, err := DetectSchemaValidationViolations(facts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations for valid levels, got %d: %+v", len(results), results)
	}
}

// Unit: level=5 は upper 境界外で violation。
func TestDetectSchemaValidationViolations_UpperOutOfRange(t *testing.T) {
	results, err := DetectSchemaValidationViolations(SchemaValidationFacts{
		Projects: []SchemaValidationProject{
			{ProjectId: "p5", ConfigPath: "p5/config.json", Level: floatPtr(5)},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	r := results[0]
	if r.RuleId != "AR-SCHEMA-VALIDATION-PZ2" {
		t.Errorf("ruleId mismatch: %q", r.RuleId)
	}
	if r.Severity != contract.SeverityGate {
		t.Errorf("severity mismatch: %q", r.Severity)
	}
	if r.Actual == nil || *r.Actual != 5 {
		t.Errorf("actual mismatch: %v", r.Actual)
	}
	if r.Evidence == nil || *r.Evidence != "level=5 is not in [0, 1, 2, 3, 4]" {
		t.Errorf("evidence mismatch: %v", r.Evidence)
	}
	if r.MessageSeed == nil ||
		*r.MessageSeed != "project 'p5' の projectization.level (5) が AAG-COA Level 範囲 [0, 4] 外" {
		t.Errorf("messageSeed mismatch: %v", r.MessageSeed)
	}
}

// Unit: level=-1 は lower 境界外で violation。
func TestDetectSchemaValidationViolations_LowerOutOfRange(t *testing.T) {
	results, err := DetectSchemaValidationViolations(SchemaValidationFacts{
		Projects: []SchemaValidationProject{
			{ProjectId: "pm1", ConfigPath: "pm1/config.json", Level: floatPtr(-1)},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	if results[0].Actual == nil || *results[0].Actual != -1 {
		t.Errorf("actual mismatch: %v", results[0].Actual)
	}
	if results[0].Evidence == nil || *results[0].Evidence != "level=-1 is not in [0, 1, 2, 3, 4]" {
		t.Errorf("evidence mismatch: %v", results[0].Evidence)
	}
}

// Unit: level=2.5 は非 integer で violation。
func TestDetectSchemaValidationViolations_NonInteger(t *testing.T) {
	results, err := DetectSchemaValidationViolations(SchemaValidationFacts{
		Projects: []SchemaValidationProject{
			{ProjectId: "p2.5", ConfigPath: "p2.5/config.json", Level: floatPtr(2.5)},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	if results[0].Evidence == nil || *results[0].Evidence != "level=2.5 is not in [0, 1, 2, 3, 4]" {
		t.Errorf("evidence mismatch: %v", results[0].Evidence)
	}
}

// Unit: level=nil は skip (= 別 rule、本 detector scope 外)。
func TestDetectSchemaValidationViolations_NilLevelSkipped(t *testing.T) {
	results, err := DetectSchemaValidationViolations(SchemaValidationFacts{
		Projects: []SchemaValidationProject{
			{ProjectId: "pNull", ConfigPath: "pNull/config.json", Level: nil},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations for nil level (= scope 外), got %d", len(results))
	}
}

// Unit: 複数 invalid project → 複数 violation、順序維持。
func TestDetectSchemaValidationViolations_MultipleInvalid(t *testing.T) {
	facts := SchemaValidationFacts{
		Projects: []SchemaValidationProject{
			{ProjectId: "p5", ConfigPath: "p5/config.json", Level: floatPtr(5)},
			{ProjectId: "valid", ConfigPath: "valid/config.json", Level: floatPtr(2)},
			{ProjectId: "pm1", ConfigPath: "pm1/config.json", Level: floatPtr(-1)},
			{ProjectId: "p99", ConfigPath: "p99/config.json", Level: floatPtr(99)},
		},
	}
	results, err := DetectSchemaValidationViolations(facts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 violations, got %d", len(results))
	}

	// 順序 = projects 順 (= p5 → pm1 → p99、valid は skip)
	wantProjectIds := []string{"p5", "pm1", "p99"}
	for i, want := range wantProjectIds {
		if results[i].MessageSeed == nil {
			t.Fatalf("results[%d].MessageSeed nil", i)
		}
		expectedSeedFragment := "'" + want + "'"
		if !contains(*results[i].MessageSeed, expectedSeedFragment) {
			t.Errorf("results[%d].MessageSeed should contain %q, got %q", i, expectedSeedFragment, *results[i].MessageSeed)
		}
	}
}

// contains は string 内 substring の検索 (= helper、strings.Contains を import せず inline)。
func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// Fixture parity: schema-validation/fail-level-out-of-range → 1 violation、Match=true。
func TestFixtureParity_SchemaValidation_FailLevelOutOfRange(t *testing.T) {
	fx := loadFixture(t, "schema-validation/fail-level-out-of-range")

	facts := parseSchemaValidationFacts(t, fx.InputRaw)
	actual, err := DetectSchemaValidationViolations(facts)
	if err != nil {
		t.Fatalf("detector error: %v", err)
	}

	if len(actual) != 1 {
		t.Errorf("expected 1 violation, got %d: %+v", len(actual), actual)
	}

	diff := fixture.Compare(fx, actual)
	if !diff.Match {
		t.Errorf("fixture %q parity mismatch:\n  actual:   %+v\n  expected: %+v\n  missing: %+v\n  extra:   %+v",
			fx.Name, actual, fx.Expected, diff.Missing, diff.Extra)
	}
}

// parseSchemaValidationFacts は fixture の InputRaw から `{"facts": {projects: [...]}}` を抽出。
func parseSchemaValidationFacts(t *testing.T, raw json.RawMessage) SchemaValidationFacts {
	t.Helper()
	var input struct {
		Facts SchemaValidationFacts `json:"facts"`
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		t.Fatalf("parse input.json: %v", err)
	}
	return input.Facts
}
