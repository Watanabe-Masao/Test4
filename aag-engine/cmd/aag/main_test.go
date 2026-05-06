// main_test.go は AAG Engine CLI の動作 contract を unit test で機械検証する。
//
// Phase 1 (= Go CLI Skeleton) で landing する test:
//   - 引数なしは usage 表示 + ExitError
//   - --help は usage 表示 + ExitPass
//   - 不明 command は error message + ExitError
//   - validate は 空 DetectorResult[] を返し ExitPass
//   - validate --format=yaml は ExitError (= json のみ対応)
//   - fixtures は note 付きで空 DetectorResult[] を返し ExitPass
//
// Phase 2 以降:
//   - Phase 2 で DetectorResult schema binding + parity test 追加
//   - Phase 3 で fixture runner test 追加
package main

import (
	"bytes"
	"encoding/json"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// repoRootForTest returns the repo root absolute path (= aag-engine の親 directory)。
func repoRootForTest(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	// thisFile = aag-engine/cmd/aag/main_test.go
	// repoRoot = ../../../
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
}

// 引数なしは usage 表示 + ExitError。
func TestRun_NoArgs(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "aag — AAG Engine") {
		t.Errorf("stderr should contain usage, got: %q", stderr.String())
	}
	if stdout.Len() != 0 {
		t.Errorf("stdout should be empty on error, got: %q", stdout.String())
	}
}

// --help は usage 表示 + ExitPass。
func TestRun_Help(t *testing.T) {
	for _, arg := range []string{"--help", "-h", "help"} {
		t.Run(arg, func(t *testing.T) {
			var stdout, stderr bytes.Buffer
			code := run([]string{arg}, &stdout, &stderr)
			if code != ExitPass {
				t.Errorf("expected ExitPass (0), got %d", code)
			}
			if !strings.Contains(stdout.String(), "aag — AAG Engine") {
				t.Errorf("stdout should contain usage, got: %q", stdout.String())
			}
		})
	}
}

// 不明 command は error message + ExitError。
func TestRun_UnknownCommand(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"foobar"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), `unknown command "foobar"`) {
		t.Errorf("stderr should articulate unknown command, got: %q", stderr.String())
	}
}

// validate は空 DetectorResult[] を返し ExitPass。
func TestRun_Validate_DefaultArgs(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"validate"}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d (stderr=%q)", code, stderr.String())
	}

	// JSON output validation
	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("stdout should be valid JSON, got err=%v stdout=%q", err, stdout.String())
	}

	if result["schemaVersion"] != "aag-engine-run-result-v1" {
		t.Errorf("schemaVersion mismatch: got %v", result["schemaVersion"])
	}
	if result["status"] != "pass" {
		t.Errorf("status should be 'pass', got %v", result["status"])
	}
	detectorResults, ok := result["detectorResults"].([]interface{})
	if !ok {
		t.Fatalf("detectorResults should be array, got %T: %v", result["detectorResults"], result["detectorResults"])
	}
	if len(detectorResults) != 0 {
		t.Errorf("detectorResults should be empty in Phase 1 skeleton, got %d items", len(detectorResults))
	}
}

// validate --repo は repo path を articulate して JSON に含める。
func TestRun_Validate_WithRepoFlag(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"validate", "--repo", "/tmp/sample"}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d (stderr=%q)", code, stderr.String())
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("stdout should be valid JSON, got err=%v", err)
	}
	if result["repo"] != "/tmp/sample" {
		t.Errorf("repo field should be '/tmp/sample', got %v", result["repo"])
	}
}

// validate --format=yaml は ExitError (= json のみ対応)。
func TestRun_Validate_UnsupportedFormat(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"validate", "--format", "yaml"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "unsupported format") {
		t.Errorf("stderr should articulate unsupported format, got: %q", stderr.String())
	}
}

// fixtures は fixture catalog を返し ExitPass (= Phase 3 deliverable)。
//
// Phase 3 で fixture runner が wired up、`aag fixtures --repo .` は repo の 8 fixture を
// discover し、各 fixture の name + expectedCount を fixtureSummary field に articulate。
func TestRun_Fixtures(t *testing.T) {
	repoRoot := repoRootForTest(t)

	var stdout, stderr bytes.Buffer
	code := run([]string{"fixtures", "--repo", repoRoot}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d (stderr=%q)", code, stderr.String())
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("stdout should be valid JSON, got err=%v", err)
	}

	// Phase 1 contract lock: status="pass" + detectorResults=[] (= validator のみ、
	// generator ではない strict adherence、coderabbit review feedback)
	if result["status"] != "pass" {
		t.Errorf("status should be 'pass' (= no violations in fixture catalog mode), got %v", result["status"])
	}
	detectorResults, ok := result["detectorResults"].([]interface{})
	if !ok {
		t.Fatalf("detectorResults should be array, got %T: %v", result["detectorResults"], result["detectorResults"])
	}
	if len(detectorResults) != 0 {
		t.Errorf("detectorResults should be empty (= fixtures subcommand emit catalog only、Phase 4-8 で detector 走査追加候補), got %d items", len(detectorResults))
	}

	// fixtureSummary field articulate
	summary, ok := result["fixtureSummary"].(map[string]interface{})
	if !ok {
		t.Fatalf("fixtureSummary should be object, got %T: %v", result["fixtureSummary"], result["fixtureSummary"])
	}
	total, ok := summary["total"].(float64)
	if !ok {
		t.Fatalf("fixtureSummary.total should be number")
	}
	// 既存 fixture 8 件 (= readiness refactor Phase 5 deliverable) を minimum baseline
	// として articulate。新 fixture 追加は forward-compat (= 削除のみ regression 検出)。
	if int(total) < 8 {
		t.Errorf("expected at least 8 fixtures, got %d", int(total))
	}

	fixturesArr, ok := summary["fixtures"].([]interface{})
	if !ok {
		t.Fatalf("fixtureSummary.fixtures should be array")
	}
	if len(fixturesArr) < 8 {
		t.Errorf("fixtures array should have at least 8 entries, got %d", len(fixturesArr))
	}

	// Phase 3 note articulate
	note, _ := result["note"].(string)
	if !strings.Contains(note, "Phase 3") {
		t.Errorf("fixtures should articulate Phase 3 in note, got note=%q", note)
	}
}

// shadow は repo 全 fixture を dispatch、parity summary を返し ExitPass (= Phase 9 deliverable)。
func TestRun_Shadow(t *testing.T) {
	repoRoot := repoRootForTest(t)

	var stdout, stderr bytes.Buffer
	code := run([]string{"shadow", "--repo", repoRoot}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0、= 8 fixture parity 100%%), got %d (stderr=%q)", code, stderr.String())
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("stdout should be valid JSON, got err=%v", err)
	}

	if result["status"] != "pass" {
		t.Errorf("status should be 'pass' (= primary success metric)、got %v", result["status"])
	}

	// shadowSummary field articulate
	summary, ok := result["shadowSummary"].(map[string]interface{})
	if !ok {
		t.Fatalf("shadowSummary should be object, got %T: %v", result["shadowSummary"], result["shadowSummary"])
	}
	total, _ := summary["total"].(float64)
	matched, _ := summary["matched"].(float64)
	if int(total) != 8 {
		t.Errorf("total should be 8, got %d", int(total))
	}
	if int(matched) != 8 {
		t.Errorf("matched should be 8 (= parity 100%%), got %d", int(matched))
	}

	// note articulate
	note, _ := result["note"].(string)
	if !strings.Contains(note, "Phase 9") {
		t.Errorf("note should articulate Phase 9, got %q", note)
	}
	if !strings.Contains(note, "100%") {
		t.Errorf("note should articulate parity 100%%, got %q", note)
	}
}

// shadow が nonexistent repo で ExitError。
func TestRun_Shadow_NonexistentRepo(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"shadow", "--repo", "/tmp/nonexistent-shadow-test"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "failed to run shadow mode") {
		t.Errorf("stderr should articulate shadow run error, got: %q", stderr.String())
	}
}

// shadow の予期しない位置引数は ExitError (= validate / fixtures と同 pattern)。
func TestRun_Shadow_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"shadow", "/tmp/oops"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "unexpected positional argument") {
		t.Errorf("stderr should articulate unexpected positional, got: %q", stderr.String())
	}
}

// fixtures が nonexistent repo で ExitError。
func TestRun_Fixtures_NonexistentRepo(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"fixtures", "--repo", "/tmp/nonexistent-aag-engine-test-root"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "failed to load fixtures") {
		t.Errorf("stderr should articulate fixture load error, got: %q", stderr.String())
	}
}

// validate の不正 flag は ExitError。
func TestRun_Validate_InvalidFlag(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"validate", "--unknown-flag"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// validate の予期しない位置引数は ExitError (= silent ignore 防止)。
//
// regression: `aag validate /tmp/repo` を実行すると positional arg が無視されて
// repo="." が使われ、user が想定とは違う directory を validate する状況になる。
// これは silent な user 期待違いを引き起こすため、positional arg があれば
// hint 付きで hard fail させる。
func TestRun_Validate_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"validate", "/tmp/repo"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2) for positional arg, got %d", code)
	}
	if !strings.Contains(stderr.String(), "unexpected positional argument") {
		t.Errorf("stderr should articulate unexpected positional, got: %q", stderr.String())
	}
	if !strings.Contains(stderr.String(), "--repo") {
		t.Errorf("stderr should hint --repo flag, got: %q", stderr.String())
	}
}

// validate で flag + positional の混在も ExitError。
func TestRun_Validate_MixedFlagAndPositional(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"validate", "--repo", "/tmp/a", "/tmp/b"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2) for mixed flag + positional, got %d", code)
	}
}

// fixtures の予期しない位置引数も ExitError (= validate と同 pattern)。
func TestRun_Fixtures_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"fixtures", "/tmp/repo"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2) for positional arg, got %d", code)
	}
	if !strings.Contains(stderr.String(), "unexpected positional argument") {
		t.Errorf("stderr should articulate unexpected positional, got: %q", stderr.String())
	}
}

// task action が不足なら ExitError (= Wave 1 #2、reposteward-ai-ops-platform)。
func TestRun_Task_NoAction(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"task"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "action 不足") {
		t.Errorf("stderr should articulate missing action, got: %q", stderr.String())
	}
}

// task の不明 action は ExitError。
func TestRun_Task_UnknownAction(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"task", "bogus"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), `unknown action "bogus"`) {
		t.Errorf("stderr should articulate unknown action, got: %q", stderr.String())
	}
}

// task prepare で --project 不在は ExitError。
func TestRun_TaskPrepare_MissingProject(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"task", "prepare", "--repo", repoRootForTest(t)}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "--project flag は required") {
		t.Errorf("stderr should articulate required --project, got: %q", stderr.String())
	}
}

// task prepare の self-dogfood は ExitPass + valid TaskCapsule v1 JSON を出力。
func TestRun_TaskPrepare_SelfDogfood(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"task", "prepare",
		"--repo", repoRootForTest(t),
		"--project", "reposteward-ai-ops-platform",
		"--intent", "Wave 1 #2 task prepare CLI test",
	}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d. stderr: %q", code, stderr.String())
	}
	var capsule map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &capsule); err != nil {
		t.Fatalf("stdout is not valid JSON: %v\n%s", err, stdout.String())
	}
	if capsule["schemaVersion"] != "task-capsule-v1" {
		t.Errorf("schemaVersion = %v, want task-capsule-v1", capsule["schemaVersion"])
	}
	if capsule["projectId"] != "reposteward-ai-ops-platform" {
		t.Errorf("projectId = %v, want reposteward-ai-ops-platform", capsule["projectId"])
	}
	if _, ok := capsule["nonGoals"].([]interface{}); !ok {
		t.Errorf("nonGoals must be array, got: %T", capsule["nonGoals"])
	}
	if _, ok := capsule["repairPolicy"].(map[string]interface{}); !ok {
		t.Errorf("repairPolicy must be object, got: %T", capsule["repairPolicy"])
	}
}

// task prepare で位置引数があれば ExitError。
func TestRun_TaskPrepare_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"task", "prepare",
		"--project", "reposteward-ai-ops-platform",
		"unexpected-positional",
	}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "unexpected positional argument") {
		t.Errorf("stderr should articulate unexpected positional, got: %q", stderr.String())
	}
}

// task prepare で存在しない project を指定したら ExitError。
func TestRun_TaskPrepare_NonexistentProject(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"task", "prepare",
		"--repo", repoRootForTest(t),
		"--project", "nonexistent-project-zzz",
	}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// stats action 不足は ExitError (= Wave 1 #6)。
func TestRun_Stats_NoAction(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"stats"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "action 不足") {
		t.Errorf("stderr should articulate missing action, got: %q", stderr.String())
	}
}

// stats の不明 action は ExitError。
func TestRun_Stats_UnknownAction(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"stats", "size"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), `unknown action "size"`) {
		t.Errorf("stderr should articulate unknown action, got: %q", stderr.String())
	}
}

// stats files: real repo 走査で valid query output JSON を articulate。
func TestRun_StatsFiles_RealRepo_NoFilter(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"stats", "files", "--repo", repoRootForTest(t)}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d. stderr: %q", code, stderr.String())
	}
	var out map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("stdout is not valid JSON: %v", err)
	}
	if out["schemaVersion"] != "stats-files-query-v1" {
		t.Errorf("schemaVersion = %v, want stats-files-query-v1", out["schemaVersion"])
	}
	if out["metric"] != "effectiveCodeLines" {
		t.Errorf("metric = %v, want effectiveCodeLines", out["metric"])
	}
	files, ok := out["files"].([]interface{})
	if !ok {
		t.Fatalf("files must be array")
	}
	if len(files) == 0 {
		t.Errorf("expected non-empty files array on real repo")
	}
}

// stats files --range で filter された結果が範囲内。
func TestRun_StatsFiles_RangeFilter(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"stats", "files",
		"--repo", repoRootForTest(t),
		"--range", "21..30",
		"--limit", "20",
	}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d", code)
	}
	var out struct {
		Files []struct {
			Path               string `json:"path"`
			EffectiveCodeLines int    `json:"effectiveCodeLines"`
		} `json:"files"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	for _, f := range out.Files {
		if f.EffectiveCodeLines < 21 || f.EffectiveCodeLines > 30 {
			t.Errorf("file %q effectiveCodeLines=%d outside 21..30", f.Path, f.EffectiveCodeLines)
		}
	}
}

// stats files --bucket でも filter が効く。
func TestRun_StatsFiles_BucketFilter(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"stats", "files",
		"--repo", repoRootForTest(t),
		"--bucket", "loc.301_plus",
		"--limit", "5",
	}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d. stderr: %q", code, stderr.String())
	}
	var out struct {
		Files []struct {
			Path               string `json:"path"`
			EffectiveCodeLines int    `json:"effectiveCodeLines"`
		} `json:"files"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	for _, f := range out.Files {
		if f.EffectiveCodeLines < 301 {
			t.Errorf("file %q effectiveCodeLines=%d below 301 for loc.301_plus", f.Path, f.EffectiveCodeLines)
		}
	}
}

// stats files --range が malformed なら ExitError。
func TestRun_StatsFiles_MalformedRange(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"stats", "files",
		"--repo", repoRootForTest(t),
		"--range", "21",
	}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// stats files で位置引数があれば ExitError。
func TestRun_StatsFiles_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"stats", "files",
		"--repo", repoRootForTest(t),
		"unexpected",
	}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// where-am-i は real repo で valid JSON を出力する (= Wave 3 #10)。
func TestRun_WhereAmI_RealRepo(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"where-am-i", "--repo", repoRootForTest(t)}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d. stderr: %q", code, stderr.String())
	}
	var out map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("stdout not valid JSON: %v", err)
	}
	if out["schemaVersion"] != "where-am-i-v1" {
		t.Errorf("schemaVersion = %v, want where-am-i-v1", out["schemaVersion"])
	}
	if _, ok := out["branch"].(string); !ok {
		t.Error("branch must be string")
	}
	if _, ok := out["repoHealth"].(map[string]interface{}); !ok {
		t.Error("repoHealth must be object")
	}
}

// where-am-i で位置引数があれば ExitError。
func TestRun_WhereAmI_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"where-am-i", "/tmp/extra"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// context は real repo で valid JSON を出力する (= Wave 3 #11)。
func TestRun_Context_RealRepo(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"context",
		"--repo", repoRootForTest(t),
		"--project", "reposteward-ai-ops-platform",
	}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d. stderr: %q", code, stderr.String())
	}
	var out map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("stdout not valid JSON: %v", err)
	}
	if out["schemaVersion"] != "context-project-v1" {
		t.Errorf("schemaVersion = %v", out["schemaVersion"])
	}
	if out["projectId"] != "reposteward-ai-ops-platform" {
		t.Errorf("projectId = %v", out["projectId"])
	}
	if reads, ok := out["requiredReads"].([]interface{}); !ok || len(reads) != 5 {
		t.Errorf("requiredReads must be 5-element array, got %v", out["requiredReads"])
	}
	if cons, ok := out["constraints"].([]interface{}); !ok || len(cons) == 0 {
		t.Errorf("constraints must be non-empty array, got %v", out["constraints"])
	}
}

// context で --project 不在は ExitError。
func TestRun_Context_MissingProject(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"context", "--repo", repoRootForTest(t)}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// context で nonexistent project は ExitError。
func TestRun_Context_NonexistentProject(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"context",
		"--repo", repoRootForTest(t),
		"--project", "nonexistent-zzz",
	}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// changed は real repo で valid JSON を出力 (= Wave 3 #12)。
func TestRun_Changed_RealRepo(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"changed",
		"--repo", repoRootForTest(t),
		"--base", "HEAD~1",
		"--head", "HEAD",
	}, &stdout, &stderr)
	if code != ExitPass {
		// HEAD~1 may not exist on fresh branches; tolerate
		if !strings.Contains(stderr.String(), "git diff failed") {
			t.Errorf("expected ExitPass or git diff failed, got code %d. stderr: %q", code, stderr.String())
		}
		return
	}
	var out map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("stdout not valid JSON: %v", err)
	}
	if out["schemaVersion"] != "changed-explain-v1" {
		t.Errorf("schemaVersion = %v", out["schemaVersion"])
	}
	if out["base"] != "HEAD~1" || out["head"] != "HEAD" {
		t.Errorf("base/head not echoed: base=%v head=%v", out["base"], out["head"])
	}
}

// changed で位置引数があれば ExitError。
func TestRun_Changed_UnexpectedPositionalArg(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"changed", "--repo", repoRootForTest(t), "extra"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// rule action 不足は ExitError (= Wave 3 #13)。
func TestRun_Rule_NoAction(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"rule"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// rule の不明 action は ExitError。
func TestRun_Rule_UnknownAction(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"rule", "unknown"}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// rule locate で ruleId 不在は ExitError。
func TestRun_RuleLocate_MissingRuleId(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"rule", "locate", "--repo", repoRootForTest(t)}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
}

// rule locate で known ruleId は valid JSON を出力。
// flag は positional arg の前に articulate (= 標準 Go flag library 制約)。
func TestRun_RuleLocate_RealRepo_KnownRule(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"rule", "locate",
		"--repo", repoRootForTest(t),
		"AR-G5-HOOK-LINES",
	}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d. stderr: %q", code, stderr.String())
	}
	var out map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		t.Fatalf("stdout not valid JSON: %v", err)
	}
	if out["schemaVersion"] != "rule-locate-v1" {
		t.Errorf("schemaVersion = %v", out["schemaVersion"])
	}
	if out["ruleId"] != "AR-G5-HOOK-LINES" {
		t.Errorf("ruleId = %v", out["ruleId"])
	}
	if guards, ok := out["guards"].([]interface{}); !ok || len(guards) == 0 {
		t.Errorf("guards must be non-empty array, got: %v", out["guards"])
	}
}

// rule locate で unknown ruleId は ExitError。
func TestRun_RuleLocate_UnknownRule(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{
		"rule", "locate",
		"--repo", repoRootForTest(t),
		"AR-NONEXISTENT-XYZ",
	}, &stdout, &stderr)
	if code != ExitError {
		t.Errorf("expected ExitError (2), got %d", code)
	}
	if !strings.Contains(stderr.String(), "Similar:") {
		t.Errorf("stderr should articulate Similar: hint, got: %q", stderr.String())
	}
}
