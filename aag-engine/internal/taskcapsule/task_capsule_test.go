// task_capsule_test.go — Wave 1 #2 (= reposteward-ai-ops-platform、`reposteward
// task prepare` MVP) で landing。
//
// 検証項目:
//   - Schema sync (= canonical schema の $id / required / properties が Go 側
//     CanonicalSchemaID / RequiredFields / AllJSONFields と一致)
//   - reflection-based field name verification (= Go struct の json tag 集合が
//     AllJSONFields と一致)
//   - Validate (= 空 field / 不正 enum / nil collection を hard fail)
//   - Prepare 自走 (= self-dogfood: reposteward-ai-ops-platform 自身を入力に
//     capsule を生成、required field articulate を確認)
//   - Slugify edge cases
//
// 参照:
//   - docs/contracts/aag/task-capsule.schema.json (= canonical)
//   - aag-engine/internal/contract/detector_result_test.go (= mirror pattern)
package taskcapsule

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

func loadCanonicalSchema(t *testing.T) map[string]interface{} {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
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

func repoRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

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

func TestSchemaSync_SchemaVersionConst(t *testing.T) {
	schema := loadCanonicalSchema(t)
	props, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatal("schema.properties missing or not map")
	}
	sv, ok := props["schemaVersion"].(map[string]interface{})
	if !ok {
		t.Fatal("schema.properties.schemaVersion missing or not map")
	}
	cst, ok := sv["const"].(string)
	if !ok {
		t.Fatalf("schema.properties.schemaVersion.const missing or not string, got: %v", sv["const"])
	}
	if cst != SchemaVersion {
		t.Errorf("schemaVersion const mismatch:\n  got:  %s\n  want: %s", cst, SchemaVersion)
	}
}

func TestSchemaSync_RequiredFields(t *testing.T) {
	schema := loadCanonicalSchema(t)
	required, ok := schema["required"].([]interface{})
	if !ok {
		t.Fatalf("schema.required missing or not array")
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
		t.Errorf("RequiredFields mismatch:\n  schema: %v\n  go:     %v", schemaRequired, goRequired)
	}
}

func TestSchemaSync_AllJSONFields(t *testing.T) {
	schema := loadCanonicalSchema(t)
	props, ok := schema["properties"].(map[string]interface{})
	if !ok {
		t.Fatalf("schema.properties missing or not map")
	}
	schemaProps := make([]string, 0, len(props))
	for k := range props {
		schemaProps = append(schemaProps, k)
	}
	sort.Strings(schemaProps)

	goAll := make([]string, len(AllJSONFields))
	copy(goAll, AllJSONFields)
	sort.Strings(goAll)

	if !reflect.DeepEqual(schemaProps, goAll) {
		t.Errorf("AllJSONFields mismatch:\n  schema: %v\n  go:     %v", schemaProps, goAll)
	}
}

func TestSchemaSync_StructTagsMatchAllJSONFields(t *testing.T) {
	typ := reflect.TypeOf(TaskCapsule{})
	got := make([]string, 0, typ.NumField())
	for i := 0; i < typ.NumField(); i++ {
		tag := typ.Field(i).Tag.Get("json")
		name := strings.SplitN(tag, ",", 2)[0]
		got = append(got, name)
	}
	sort.Strings(got)

	want := make([]string, len(AllJSONFields))
	copy(want, AllJSONFields)
	sort.Strings(want)

	if !reflect.DeepEqual(got, want) {
		t.Errorf("TaskCapsule json tags mismatch:\n  got:  %v\n  want: %v", got, want)
	}
}

func TestHardGate_IsValid(t *testing.T) {
	for _, h := range []HardGate{HardGatePass, HardGateFail, HardGateUnknown} {
		if !h.IsValid() {
			t.Errorf("HardGate %q should be valid", h)
		}
	}
	if HardGate("bogus").IsValid() {
		t.Errorf("HardGate \"bogus\" should be invalid")
	}
}

func TestValidate_RejectsNilCollections(t *testing.T) {
	cases := []struct {
		name string
		mut  func(c *TaskCapsule)
	}{
		{"nil RepoHealth", func(c *TaskCapsule) { c.RepoHealth = nil }},
		{"nil CurrentState", func(c *TaskCapsule) { c.CurrentState = nil }},
		{"nil RepairPolicy", func(c *TaskCapsule) { c.RepairPolicy = nil }},
		{"nil NonGoals", func(c *TaskCapsule) { c.NonGoals = nil }},
		{"nil RequiredReads", func(c *TaskCapsule) { c.RequiredReads = nil }},
		{"nil TargetFiles", func(c *TaskCapsule) { c.TargetFiles = nil }},
		{"nil RelatedCommands", func(c *TaskCapsule) { c.RelatedCommands = nil }},
		{"nil ExpectedOutputs", func(c *TaskCapsule) { c.ExpectedOutputs = nil }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := validCapsule()
			tc.mut(&c)
			if err := c.Validate(); err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}

func TestValidate_RejectsEmptyRequiredScalars(t *testing.T) {
	cases := []struct {
		name string
		mut  func(c *TaskCapsule)
	}{
		{"wrong SchemaVersion", func(c *TaskCapsule) { c.SchemaVersion = "task-capsule-v0" }},
		{"empty TaskId", func(c *TaskCapsule) { c.TaskId = "" }},
		{"empty ProjectId", func(c *TaskCapsule) { c.ProjectId = "" }},
		{"empty Goal", func(c *TaskCapsule) { c.Goal = "" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := validCapsule()
			tc.mut(&c)
			if err := c.Validate(); err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}

func TestValidate_RejectsNonKebabCaseIds(t *testing.T) {
	cases := []struct {
		name string
		mut  func(c *TaskCapsule)
	}{
		{"taskId with uppercase", func(c *TaskCapsule) { c.TaskId = "Bad-Task-Id" }},
		{"taskId with space", func(c *TaskCapsule) { c.TaskId = "bad task id" }},
		{"taskId with underscore", func(c *TaskCapsule) { c.TaskId = "bad_task_id" }},
		{"taskId starting with hyphen", func(c *TaskCapsule) { c.TaskId = "-bad" }},
		{"taskId ending with hyphen", func(c *TaskCapsule) { c.TaskId = "bad-" }},
		{"projectId with uppercase", func(c *TaskCapsule) { c.ProjectId = "Bad-Project" }},
		{"projectId with slash", func(c *TaskCapsule) { c.ProjectId = "bad/project" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := validCapsule()
			tc.mut(&c)
			if err := c.Validate(); err == nil {
				t.Error("expected error for non-kebab-case id, got nil")
			}
		})
	}
}

func TestValidate_AcceptsValidKebabCaseIds(t *testing.T) {
	cases := []struct {
		name      string
		taskId    string
		projectId string
	}{
		{"single segment", "task", "project"},
		{"multi segment", "wave-1-task", "reposteward-ai-ops-platform"},
		{"with digits", "task-123", "project-2"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := validCapsule()
			c.TaskId = tc.taskId
			c.ProjectId = tc.projectId
			if err := c.Validate(); err != nil {
				t.Errorf("expected valid id %q/%q, got error: %v", tc.taskId, tc.projectId, err)
			}
		})
	}
}

func TestValidate_RejectsBogusHardGate(t *testing.T) {
	c := validCapsule()
	c.RepoHealth["hardGate"] = "bogus"
	if err := c.Validate(); err == nil {
		t.Error("expected error for bogus hardGate, got nil")
	}
}

func TestValidate_RejectsEmptyIntent(t *testing.T) {
	c := validCapsule()
	empty := ""
	c.Intent = &empty
	if err := c.Validate(); err == nil {
		t.Error("expected error for empty intent pointer, got nil")
	}
}

func TestValidate_AcceptsValidCapsule(t *testing.T) {
	c := validCapsule()
	if err := c.Validate(); err != nil {
		t.Errorf("expected valid capsule, got error: %v", err)
	}
}

func validCapsule() TaskCapsule {
	return TaskCapsule{
		SchemaVersion:   SchemaVersion,
		TaskId:          "test-task",
		ProjectId:       "test-project",
		Goal:            "Test goal",
		RepoHealth:      map[string]interface{}{"hardGate": "pass", "kpi": "60/60 OK"},
		CurrentState:    map[string]interface{}{},
		NonGoals:        []string{"do not break things"},
		RequiredReads:   []string{},
		TargetFiles:     []string{},
		RelatedCommands: []string{},
		ExpectedOutputs: []string{},
		RepairPolicy:    map[string]interface{}{},
	}
}

func TestSlugify(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"effective LOC statistics", "effective-loc-statistics"},
		{"  Effective  LOC  Statistics  ", "effective-loc-statistics"},
		{"Wave 1 #2: task prepare MVP", "wave-1-2-task-prepare-mvp"},
		{"___under___score___", "under-score"},
		{"!!!!!", "task"},
		{"", "task"},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			got := slugify(tc.in, 50)
			if got != tc.want {
				t.Errorf("slugify(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestSlugify_MaxLen(t *testing.T) {
	long := strings.Repeat("abcd ", 30) // 150 chars
	got := slugify(long, 50)
	if len(got) > 50 {
		t.Errorf("slugify result length %d exceeds maxLen 50", len(got))
	}
	if !strings.HasPrefix(got, "abcd") {
		t.Errorf("slugify lost prefix: %q", got)
	}
}

func TestPrepare_SelfDogfood_RepostewardAiOpsPlatform(t *testing.T) {
	root := repoRoot(t)
	capsule, err := Prepare(PrepareInput{
		RepoRoot:  root,
		ProjectID: "reposteward-ai-ops-platform",
		Intent:    "Wave 1 #2 task prepare MVP self-dogfood",
	})
	if err != nil {
		t.Fatalf("Prepare returned error: %v", err)
	}
	if err := capsule.Validate(); err != nil {
		t.Errorf("self-dogfood capsule failed Validate: %v", err)
	}
	if capsule.SchemaVersion != SchemaVersion {
		t.Errorf("schemaVersion = %q, want %q", capsule.SchemaVersion, SchemaVersion)
	}
	if capsule.ProjectId != "reposteward-ai-ops-platform" {
		t.Errorf("projectId = %q, want reposteward-ai-ops-platform", capsule.ProjectId)
	}
	if capsule.Intent == nil || *capsule.Intent != "Wave 1 #2 task prepare MVP self-dogfood" {
		t.Errorf("intent not preserved, got: %v", capsule.Intent)
	}
	if capsule.Goal != "Wave 1 #2 task prepare MVP self-dogfood" {
		t.Errorf("goal not derived from intent, got: %q", capsule.Goal)
	}
	if len(capsule.NonGoals) == 0 {
		t.Error("expected non-empty NonGoals (= reposteward-ai-ops-platform articulates 11 nonGoals in projectization)")
	}
	if len(capsule.TargetFiles) == 0 {
		t.Error("expected non-empty TargetFiles (= reposteward-ai-ops-platform articulates implementationScope)")
	}
	if len(capsule.RequiredReads) != 5 {
		t.Errorf("expected 5 RequiredReads (= AI_CONTEXT / HANDOFF / plan / projectization / decision-audit), got %d", len(capsule.RequiredReads))
	}
	if len(capsule.RelatedCommands) != 3 {
		t.Errorf("expected 3 RelatedCommands (= test:guards / docs:check / docs:generate), got %d", len(capsule.RelatedCommands))
	}
	if _, ok := capsule.RepairPolicy["ifDocsObligationFails"]; !ok {
		t.Error("expected repairPolicy.ifDocsObligationFails to be articulated")
	}
	if _, ok := capsule.RepairPolicy["ifGuardFails"]; !ok {
		t.Error("expected repairPolicy.ifGuardFails to be articulated")
	}
	if _, ok := capsule.RepoHealth["hardGate"]; !ok {
		t.Error("expected repoHealth.hardGate to be articulated")
	}
}

func TestPrepare_DerivesTaskIDFromIntent(t *testing.T) {
	capsule, err := Prepare(PrepareInput{
		RepoRoot:  repoRoot(t),
		ProjectID: "reposteward-ai-ops-platform",
		Intent:    "AAG Parameters v1 landing",
	})
	if err != nil {
		t.Fatalf("Prepare returned error: %v", err)
	}
	want := "aag-parameters-v1-landing"
	if capsule.TaskId != want {
		t.Errorf("taskId = %q, want %q", capsule.TaskId, want)
	}
}

func TestPrepare_DefaultTaskIDWhenNoIntent(t *testing.T) {
	capsule, err := Prepare(PrepareInput{
		RepoRoot:  repoRoot(t),
		ProjectID: "reposteward-ai-ops-platform",
	})
	if err != nil {
		t.Fatalf("Prepare returned error: %v", err)
	}
	want := "reposteward-ai-ops-platform-task"
	if capsule.TaskId != want {
		t.Errorf("taskId = %q, want %q", capsule.TaskId, want)
	}
	if capsule.Intent != nil {
		t.Errorf("intent should be nil when no --intent provided, got: %v", capsule.Intent)
	}
}

func TestPrepare_ExplicitTaskIDWins(t *testing.T) {
	capsule, err := Prepare(PrepareInput{
		RepoRoot:  repoRoot(t),
		ProjectID: "reposteward-ai-ops-platform",
		Intent:    "ignored for taskId",
		TaskID:    "explicit-task-id",
	})
	if err != nil {
		t.Fatalf("Prepare returned error: %v", err)
	}
	if capsule.TaskId != "explicit-task-id" {
		t.Errorf("taskId = %q, want explicit-task-id", capsule.TaskId)
	}
}

func TestPrepare_RejectsMissingProject(t *testing.T) {
	_, err := Prepare(PrepareInput{
		RepoRoot:  repoRoot(t),
		ProjectID: "nonexistent-project-xyz",
	})
	if err == nil {
		t.Error("expected error for nonexistent project, got nil")
	}
}

func TestPrepare_RejectsEmptyInput(t *testing.T) {
	if _, err := Prepare(PrepareInput{}); err == nil {
		t.Error("expected error for empty input, got nil")
	}
	if _, err := Prepare(PrepareInput{RepoRoot: "/tmp"}); err == nil {
		t.Error("expected error for missing ProjectID, got nil")
	}
	if _, err := Prepare(PrepareInput{ProjectID: "x"}); err == nil {
		t.Error("expected error for missing RepoRoot, got nil")
	}
}

func TestMarshalJSON_ProducesIndentedJSON(t *testing.T) {
	c := validCapsule()
	out, err := MarshalJSON(c)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	if !strings.Contains(string(out), "\n  \"") {
		t.Errorf("expected 2-space indented JSON, got: %s", out)
	}
	// roundtrip
	var got TaskCapsule
	if err := json.Unmarshal(out, &got); err != nil {
		t.Fatalf("roundtrip Unmarshal error: %v", err)
	}
	if got.SchemaVersion != c.SchemaVersion {
		t.Errorf("roundtrip schemaVersion mismatch")
	}
}

func TestMarshalJSON_OmitsIntentWhenNil(t *testing.T) {
	c := validCapsule() // Intent is nil by default
	out, err := MarshalJSON(c)
	if err != nil {
		t.Fatalf("MarshalJSON error: %v", err)
	}
	if strings.Contains(string(out), "\"intent\"") {
		t.Errorf("expected intent to be omitted when nil, got: %s", out)
	}
}
