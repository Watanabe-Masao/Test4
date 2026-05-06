// Package taskcapsule — Wave 5 #22 (= reposteward-ai-ops-platform、`aag task
// validate` / `aag task close` 補助 command の実装)。
//
// validate: TaskCapsule JSON を読み schema 準拠 + value-level invariant を検証。
// close: 「task を close 可能か」の precondition を articulate (= read-only check)。
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first (= file 読み込み + Validate() 呼び出しのみ)
package taskcapsule

import (
	"encoding/json"
	"fmt"
	"os"
)

// ValidateOutput is the JSON shape emitted by `aag task validate`.
type ValidateOutput struct {
	SchemaVersion string   `json:"schemaVersion"`
	CapsuleFile   string   `json:"capsuleFile"`
	Valid         bool     `json:"valid"`
	Errors        []string `json:"errors"`
	TaskId        string   `json:"taskId,omitempty"`
	ProjectId     string   `json:"projectId,omitempty"`
}

// CloseOutput is the JSON shape emitted by `aag task close`.
type CloseOutput struct {
	SchemaVersion       string   `json:"schemaVersion"`
	CapsuleFile         string   `json:"capsuleFile"`
	Valid               bool     `json:"valid"`
	ReadyToClose        bool     `json:"readyToClose"`
	BlockingIssues      []string `json:"blockingIssues"`
	RequiredFinalChecks []string `json:"requiredFinalChecks"`
	TaskId              string   `json:"taskId,omitempty"`
	ProjectId           string   `json:"projectId,omitempty"`
}

// ValidateSchemaVersion / CloseSchemaVersion are the consts articulated in outputs.
const (
	ValidateSchemaVersion = "task-validate-v1"
	CloseSchemaVersion    = "task-close-v1"
)

// ValidateInput / CloseInput control the corresponding functions.
type ValidateInput struct {
	CapsuleFile string
}

type CloseInput struct {
	CapsuleFile string
}

// ValidateCapsule reads a TaskCapsule JSON file and validates it against the
// v1 contract (= JSON shape + Validate() value-level invariants).
//
// Errors:
//   - CapsuleFile empty → error
//   - file not readable → error
// Otherwise returns ValidateOutput with valid=true/false and detailed errors.
func ValidateCapsule(input ValidateInput) (ValidateOutput, error) {
	if input.CapsuleFile == "" {
		return ValidateOutput{}, fmt.Errorf("ValidateCapsule: CapsuleFile must be set")
	}

	raw, err := os.ReadFile(input.CapsuleFile)
	if err != nil {
		return ValidateOutput{}, fmt.Errorf("ValidateCapsule: failed to read %s: %w", input.CapsuleFile, err)
	}

	out := ValidateOutput{
		SchemaVersion: ValidateSchemaVersion,
		CapsuleFile:   input.CapsuleFile,
		Errors:        []string{},
	}

	var capsule TaskCapsule
	if err := json.Unmarshal(raw, &capsule); err != nil {
		out.Valid = false
		out.Errors = append(out.Errors, fmt.Sprintf("JSON parse error: %v", err))
		return out, nil
	}

	out.TaskId = capsule.TaskId
	out.ProjectId = capsule.ProjectId

	if err := capsule.Validate(); err != nil {
		out.Valid = false
		out.Errors = append(out.Errors, err.Error())
		return out, nil
	}

	out.Valid = true
	return out, nil
}

// CloseCapsule articulates whether the task represented by the capsule is
// ready to close. MVP scope: structural validation + articulate the standard
// final checks that the AI session must run before declaring close.
//
// readyToClose=true means the capsule is structurally valid AND all blocking
// issues are 0. The AI session is still responsible for running the final
// checks listed in requiredFinalChecks.
func CloseCapsule(input CloseInput) (CloseOutput, error) {
	if input.CapsuleFile == "" {
		return CloseOutput{}, fmt.Errorf("CloseCapsule: CapsuleFile must be set")
	}

	raw, err := os.ReadFile(input.CapsuleFile)
	if err != nil {
		return CloseOutput{}, fmt.Errorf("CloseCapsule: failed to read %s: %w", input.CapsuleFile, err)
	}

	out := CloseOutput{
		SchemaVersion:       CloseSchemaVersion,
		CapsuleFile:         input.CapsuleFile,
		BlockingIssues:      []string{},
		RequiredFinalChecks: defaultFinalChecks(),
	}

	var capsule TaskCapsule
	if err := json.Unmarshal(raw, &capsule); err != nil {
		out.Valid = false
		out.ReadyToClose = false
		out.BlockingIssues = append(out.BlockingIssues, fmt.Sprintf("JSON parse error: %v", err))
		return out, nil
	}

	out.TaskId = capsule.TaskId
	out.ProjectId = capsule.ProjectId

	if err := capsule.Validate(); err != nil {
		out.Valid = false
		out.ReadyToClose = false
		out.BlockingIssues = append(out.BlockingIssues, fmt.Sprintf("Capsule validation failed: %v", err))
		return out, nil
	}

	// repoHealth check
	if hg, ok := capsule.RepoHealth["hardGate"].(string); ok {
		if hg != string(HardGatePass) {
			out.BlockingIssues = append(out.BlockingIssues,
				fmt.Sprintf("repoHealth.hardGate is %q (= must be 'pass' to close)", hg))
		}
	}

	out.Valid = true
	out.ReadyToClose = len(out.BlockingIssues) == 0
	return out, nil
}

// defaultFinalChecks articulates the standard set of final checks the AI session
// should run before declaring task close. AI consumer interprets and runs.
func defaultFinalChecks() []string {
	return []string{
		"cd app && npm run test:guards  # all TS guards PASS",
		"cd app && npm run docs:check  # health + KPI sync",
		"cd /home/user/Test4/aag-engine && go test ./...  # all Go tests PASS",
		"git status  # working tree clean",
		"git log --oneline -5  # commit lineage articulated",
	}
}
