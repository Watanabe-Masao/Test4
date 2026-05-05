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
	if int(total) != 8 {
		t.Errorf("expected 8 fixtures, got %d", int(total))
	}

	fixturesArr, ok := summary["fixtures"].([]interface{})
	if !ok {
		t.Fatalf("fixtureSummary.fixtures should be array")
	}
	if len(fixturesArr) != 8 {
		t.Errorf("fixtures array should have 8 entries, got %d", len(fixturesArr))
	}

	// Phase 3 note articulate
	note, _ := result["note"].(string)
	if !strings.Contains(note, "Phase 3") {
		t.Errorf("fixtures should articulate Phase 3 in note, got note=%q", note)
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
