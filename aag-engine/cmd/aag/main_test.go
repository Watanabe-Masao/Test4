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
	"strings"
	"testing"
)

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

// fixtures は note 付きで空 DetectorResult[] を返し ExitPass。
func TestRun_Fixtures(t *testing.T) {
	var stdout, stderr bytes.Buffer
	code := run([]string{"fixtures"}, &stdout, &stderr)
	if code != ExitPass {
		t.Errorf("expected ExitPass (0), got %d (stderr=%q)", code, stderr.String())
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		t.Fatalf("stdout should be valid JSON, got err=%v", err)
	}

	// Phase 1 skeleton では note field で「Phase 3 で landing 予定」 を articulate
	note, _ := result["note"].(string)
	if !strings.Contains(note, "Phase 3") {
		t.Errorf("fixtures should articulate Phase 3 plan in note, got note=%q", note)
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
