// detector_result_test.go は DetectorResult Go binding の動作 contract を unit test で機械検証する。
//
// Phase 2 (= DetectorResult Contract Binding) で landing する test:
//   - Schema sync (= canonical schema の required + properties が Go 側 RequiredFields + AllJSONFields と一致)
//   - reflection-based field name verification (= Go struct の json tag 集合が AllJSONFields と一致)
//   - factory validation (= CreateDetectorResult が空文字 / 不正 enum を hard fail)
//   - JSON marshal contract (= field name camelCase + omitempty + sample instance が schema 準拠 shape)
//   - Severity enum coverage (= 3 enum value すべて articulate、IsValid 動作)
//
// 参照:
//   - docs/contracts/aag/detector-result.schema.json (= canonical)
//   - app/src/test/guards/aagContractSchemaSyncGuard.test.ts (= TS 側 schema sync verifier mirror)
package contract

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"sort"
	"strings"
	"testing"
)

// loadCanonicalSchema は canonical JSON Schema を読んで parse する。
// 本 test は repo root を runtime.Caller 経由で resolve (= go test の作業 directory が
// internal/contract/ になるため)。
func loadCanonicalSchema(t *testing.T) map[string]interface{} {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// thisFile = aag-engine/internal/contract/detector_result_test.go
	// repoRoot = aag-engine/internal/contract/../../..
	repoRoot := filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
	schemaPath := filepath.Join(repoRoot, CanonicalSchemaPath)

	data, err := os.ReadFile(schemaPath)
	if err != nil {
		t.Fatalf("failed to read canonical schema at %s: %v", schemaPath, err)
	}
	var schema map[string]interface{}
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatalf("failed to parse canonical schema: %v", err)
	}
	return schema
}

// schema $id が CanonicalSchemaID 定数と一致 (= versioning anchor)。
func TestSchemaSync_SchemaID(t *testing.T) {
	schema := loadCanonicalSchema(t)
	id, ok := schema["$id"].(string)
	if !ok {
		t.Fatalf("schema $id missing or not string, got: %v", schema["$id"])
	}
	if id != CanonicalSchemaID {
		t.Errorf("schema $id mismatch:\n  got:  %s\n  want: %s\n  → CanonicalSchemaID 定数を schema $id に同期する必要", id, CanonicalSchemaID)
	}
}

// schema required = Go 側 RequiredFields。
func TestSchemaSync_RequiredFields(t *testing.T) {
	schema := loadCanonicalSchema(t)
	required, ok := schema["required"].([]interface{})
	if !ok {
		t.Fatalf("schema.required missing or not array, got: %v", schema["required"])
	}

	schemaRequired := make([]string, 0, len(required))
	for _, r := range required {
		s, _ := r.(string)
		schemaRequired = append(schemaRequired, s)
	}
	sort.Strings(schemaRequired)

	goRequired := make([]string, len(RequiredFields))
	copy(goRequired, RequiredFields)
	sort.Strings(goRequired)

	if !reflect.DeepEqual(schemaRequired, goRequired) {
		t.Errorf("schema.required vs Go RequiredFields mismatch:\n  schema: %v\n  go:     %v", schemaRequired, goRequired)
	}
}

// schema properties = Go 側 AllJSONFields。
func TestSchemaSync_PropertyFields(t *testing.T) {
	schema := loadCanonicalSchema(t)
	properties, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatalf("schema.properties missing or not object, got: %v", schema["properties"])
	}

	schemaFields := make([]string, 0, len(properties))
	for k := range properties {
		schemaFields = append(schemaFields, k)
	}
	sort.Strings(schemaFields)

	goFields := make([]string, len(AllJSONFields))
	copy(goFields, AllJSONFields)
	sort.Strings(goFields)

	if !reflect.DeepEqual(schemaFields, goFields) {
		t.Errorf("schema.properties vs Go AllJSONFields mismatch:\n  schema: %v\n  go:     %v", schemaFields, goFields)
	}
}

// reflection で Go struct の json tag 集合が AllJSONFields と一致。
func TestSchemaSync_StructTags(t *testing.T) {
	typ := reflect.TypeOf(DetectorResult{})
	gotTags := make([]string, 0, typ.NumField())
	for i := 0; i < typ.NumField(); i++ {
		tag := typ.Field(i).Tag.Get("json")
		// "ruleId" or "evidence,omitempty" → "ruleId" / "evidence"
		name := strings.SplitN(tag, ",", 2)[0]
		if name != "" {
			gotTags = append(gotTags, name)
		}
	}
	sort.Strings(gotTags)

	wantTags := make([]string, len(AllJSONFields))
	copy(wantTags, AllJSONFields)
	sort.Strings(wantTags)

	if !reflect.DeepEqual(gotTags, wantTags) {
		t.Errorf("DetectorResult struct json tag set mismatch:\n  got:  %v\n  want: %v", gotTags, wantTags)
	}
}

// schema severity enum = AllSeverities。
func TestSchemaSync_SeverityEnum(t *testing.T) {
	schema := loadCanonicalSchema(t)
	properties, _ := schema["properties"].(map[string]interface{})
	severityProp, ok := properties["severity"].(map[string]interface{})
	if !ok {
		t.Fatalf("schema.properties.severity missing or not object")
	}
	enum, ok := severityProp["enum"].([]interface{})
	if !ok {
		t.Fatalf("schema.properties.severity.enum missing or not array")
	}

	schemaEnum := make([]string, 0, len(enum))
	for _, v := range enum {
		s, _ := v.(string)
		schemaEnum = append(schemaEnum, s)
	}
	sort.Strings(schemaEnum)

	goEnum := make([]string, 0, len(AllSeverities))
	for _, s := range AllSeverities {
		goEnum = append(goEnum, string(s))
	}
	sort.Strings(goEnum)

	if !reflect.DeepEqual(schemaEnum, goEnum) {
		t.Errorf("schema severity enum vs Go AllSeverities mismatch:\n  schema: %v\n  go:     %v", schemaEnum, goEnum)
	}
}

// CreateDetectorResult: required field を articulate した instance を生成。
func TestCreateDetectorResult_Valid(t *testing.T) {
	r, err := CreateDetectorResult(DetectorResult{
		RuleId:        "AR-EXAMPLE",
		DetectionType: "layer-boundary",
		SourceFile:    "app/src/example.ts",
		Severity:      SeverityGate,
	})
	if err != nil {
		t.Fatalf("CreateDetectorResult failed: %v", err)
	}
	if r.RuleId != "AR-EXAMPLE" {
		t.Errorf("RuleId mismatch")
	}
	if r.Severity != SeverityGate {
		t.Errorf("Severity mismatch")
	}
}

// CreateDetectorResult: optional field を articulate できる。
func TestCreateDetectorResult_OptionalFields(t *testing.T) {
	evidence := "sample evidence"
	actual := 3.0
	baseline := 5.0
	messageSeed := "sample seed"

	r, err := CreateDetectorResult(DetectorResult{
		RuleId:        "AR-EXAMPLE",
		DetectionType: "governance-ops",
		SourceFile:    "projects/active/example/",
		Severity:      SeverityWarn,
		Evidence:      &evidence,
		Actual:        &actual,
		Baseline:      &baseline,
		MessageSeed:   &messageSeed,
	})
	if err != nil {
		t.Fatalf("CreateDetectorResult failed: %v", err)
	}
	if r.Evidence == nil || *r.Evidence != "sample evidence" {
		t.Errorf("Evidence mismatch")
	}
	if r.Actual == nil || *r.Actual != 3.0 {
		t.Errorf("Actual mismatch")
	}
	if r.Baseline == nil || *r.Baseline != 5.0 {
		t.Errorf("Baseline mismatch")
	}
	if r.MessageSeed == nil || *r.MessageSeed != "sample seed" {
		t.Errorf("MessageSeed mismatch")
	}
}

// CreateDetectorResult: required field 空文字で error。
func TestCreateDetectorResult_RequiredEmptyError(t *testing.T) {
	cases := []struct {
		name  string
		input DetectorResult
		want  string
	}{
		{
			name:  "ruleId empty",
			input: DetectorResult{RuleId: "", DetectionType: "x", SourceFile: "x", Severity: SeverityGate},
			want:  "ruleId",
		},
		{
			name:  "detectionType empty",
			input: DetectorResult{RuleId: "x", DetectionType: "", SourceFile: "x", Severity: SeverityGate},
			want:  "detectionType",
		},
		{
			name:  "sourceFile empty",
			input: DetectorResult{RuleId: "x", DetectionType: "x", SourceFile: "", Severity: SeverityGate},
			want:  "sourceFile",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := CreateDetectorResult(tc.input)
			if err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Errorf("error should mention %q, got: %v", tc.want, err)
			}
		})
	}
}

// CreateDetectorResult: 不正 severity で error。
func TestCreateDetectorResult_InvalidSeverity(t *testing.T) {
	_, err := CreateDetectorResult(DetectorResult{
		RuleId:        "x",
		DetectionType: "x",
		SourceFile:    "x",
		Severity:      "error", // schema enum 外 (= TS plan.md sketch との混同パターン)
	})
	if err == nil {
		t.Fatal("expected error for invalid severity, got nil")
	}
	if !strings.Contains(err.Error(), "severity") {
		t.Errorf("error should mention severity, got: %v", err)
	}
}

// CreateDetectorResult: optional 空文字で error (= TS と同 strictness)。
func TestCreateDetectorResult_OptionalEmptyError(t *testing.T) {
	emptyEvidence := ""
	emptyMessageSeed := ""

	_, err := CreateDetectorResult(DetectorResult{
		RuleId:        "x",
		DetectionType: "x",
		SourceFile:    "x",
		Severity:      SeverityGate,
		Evidence:      &emptyEvidence,
	})
	if err == nil || !strings.Contains(err.Error(), "evidence") {
		t.Errorf("expected evidence empty error, got: %v", err)
	}

	_, err = CreateDetectorResult(DetectorResult{
		RuleId:        "x",
		DetectionType: "x",
		SourceFile:    "x",
		Severity:      SeverityGate,
		MessageSeed:   &emptyMessageSeed,
	})
	if err == nil || !strings.Contains(err.Error(), "messageSeed") {
		t.Errorf("expected messageSeed empty error, got: %v", err)
	}
}

// JSON marshal contract: field 名 camelCase + 順序 + omitempty。
func TestDetectorResult_JSONMarshal_RequiredOnly(t *testing.T) {
	r := DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "governance-ops",
		SourceFile:    "app/src/x.ts",
		Severity:      SeverityGate,
	}
	out, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	got := string(out)
	want := `{"ruleId":"AR-X","detectionType":"governance-ops","sourceFile":"app/src/x.ts","severity":"gate"}`
	if got != want {
		t.Errorf("JSON output mismatch:\n  got:  %s\n  want: %s", got, want)
	}
}

// JSON marshal: optional field 全 articulate ケース。
func TestDetectorResult_JSONMarshal_AllFields(t *testing.T) {
	evidence := "sample"
	actual := 1.0
	baseline := 0.0
	messageSeed := "msg"

	r := DetectorResult{
		RuleId:        "AR-X",
		DetectionType: "governance-ops",
		SourceFile:    "app/src/x.ts",
		Severity:      SeverityWarn,
		Evidence:      &evidence,
		Actual:        &actual,
		Baseline:      &baseline,
		MessageSeed:   &messageSeed,
	}
	out, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	// Round-trip: parse + verify all fields present
	var parsed map[string]interface{}
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	for _, field := range AllJSONFields {
		if _, ok := parsed[field]; !ok {
			t.Errorf("expected field %q in JSON output, not found", field)
		}
	}
}

// Severity.IsValid: 全 enum value valid + 不正値は invalid。
func TestSeverity_IsValid(t *testing.T) {
	for _, s := range AllSeverities {
		if !s.IsValid() {
			t.Errorf("Severity %q should be valid", s)
		}
	}
	for _, s := range []Severity{"", "error", "info", "GATE", "warn "} {
		if s.IsValid() {
			t.Errorf("Severity %q should be invalid", s)
		}
	}
}

// PtrString / PtrFloat64 helper の動作。
func TestPtrHelpers(t *testing.T) {
	s := PtrString("hello")
	if s == nil || *s != "hello" {
		t.Errorf("PtrString broken")
	}

	f := PtrFloat64(3.14)
	if f == nil || *f != 3.14 {
		t.Errorf("PtrFloat64 broken")
	}
}
