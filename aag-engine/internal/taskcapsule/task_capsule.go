// Package taskcapsule holds the canonical Go binding for the Task Capsule v1
// JSON contract.
//
// Wave 1 #2 (= reposteward-ai-ops-platform、`reposteward task prepare` MVP) で
// landing。docs/contracts/aag/task-capsule.schema.json (= Wave 1 #1 で landing 済) と
// structurally identical な Go struct + factory + sync 検証 helper を articulate。
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則 継承):
//   - canonical schema は docs/contracts/aag/task-capsule.schema.json の側正本。
//     本 Go struct は **structurally identical な mirror**、独自 field 追加は禁止
//     (= TestSchemaSync_* で機械検証)。
//   - schemaVersion mismatch は ExitError として hard fail (= Wave 1 #2 sync test)。
//   - producer (= Prepare) は intent 以外の全 dimension を articulate する責務、
//     read-only の repo / project state 走査のみ実行 (= 不可侵原則 3 = read-only first)。
//
// 参照:
//   - docs/contracts/aag/task-capsule.schema.json (= canonical、Wave 1 #1 landing)
//   - aag-engine/internal/contract/detector_result.go (= 既存 contract binding pattern)
//   - projects/active/reposteward-ai-ops-platform/plan.md §Wave 1 #2
package taskcapsule

import (
	"fmt"
	"regexp"
)

// SchemaVersion is the const articulated in task-capsule.schema.json `schemaVersion`.
const SchemaVersion = "task-capsule-v1"

// CanonicalSchemaPath is the repo-relative POSIX path to the canonical JSON Schema.
const CanonicalSchemaPath = "docs/contracts/aag/task-capsule.schema.json"

// CanonicalSchemaID is the JSON Schema $id (= versioned URI、schema mismatch 検出用).
const CanonicalSchemaID = "https://aag.local/schemas/task-capsule-v1.json"

// PackageVersion articulates the binding version of this package.
const PackageVersion = "wave-1-2-task-capsule"

// HardGate enumerates the 3 canonical states for repoHealth.hardGate.
type HardGate string

const (
	// HardGatePass = architecture-health.json `summary.hardGatePass: true`.
	HardGatePass HardGate = "pass"
	// HardGateFail = architecture-health.json `summary.hardGatePass: false`.
	HardGateFail HardGate = "fail"
	// HardGateUnknown = health JSON unreadable / not yet generated.
	HardGateUnknown HardGate = "unknown"
)

// IsValid reports whether the hard-gate value matches the schema enum.
func (h HardGate) IsValid() bool {
	switch h {
	case HardGatePass, HardGateFail, HardGateUnknown:
		return true
	}
	return false
}

// TaskCapsule mirrors task-capsule.schema.json one-to-one.
//
// JSON shape:
//   - additionalProperties: false at top level → no untagged fields allowed.
//   - intent is the only optional top-level field (= omitempty).
//   - repoHealth / currentState / repairPolicy use map[string]interface{} because
//     the schema marks them additionalProperties: true (= producer-extensible).
//
// Producer (= Prepare) は intent 以外の全 field を articulate する責務。
type TaskCapsule struct {
	// SchemaVersion is the schema anchor (= const "task-capsule-v1").
	SchemaVersion string `json:"schemaVersion"`

	// TaskId is the kebab-case identifier of the task within the project.
	TaskId string `json:"taskId"`

	// ProjectId is the active project id (= projects/active/<id>/).
	ProjectId string `json:"projectId"`

	// Intent is a free-form 1-line articulation of the task purpose. Optional.
	Intent *string `json:"intent,omitempty"`

	// RepoHealth is the repo health snapshot at task prepare time.
	// Conventional keys: hardGate (enum) / kpi (string).
	RepoHealth map[string]interface{} `json:"repoHealth"`

	// CurrentState is project-specific facts (= producer articulate). Open shape.
	CurrentState map[string]interface{} `json:"currentState"`

	// Goal is the task's north star (= 1-2 sentence articulation).
	Goal string `json:"goal"`

	// NonGoals is the safety boundary articulation (= scope creep 抑止).
	NonGoals []string `json:"nonGoals"`

	// RequiredReads is the canonical file paths the AI session must read first.
	RequiredReads []string `json:"requiredReads"`

	// TargetFiles is the planned file paths the AI session may touch.
	TargetFiles []string `json:"targetFiles"`

	// RelatedCommands is the verification command list.
	RelatedCommands []string `json:"relatedCommands"`

	// ExpectedOutputs is the post-landing observation set.
	ExpectedOutputs []string `json:"expectedOutputs"`

	// RepairPolicy is the failure-handling articulation. Open shape.
	// Conventional keys: ifDocsObligationFails / ifGuardFails.
	RepairPolicy map[string]interface{} `json:"repairPolicy"`
}

// RequiredFields mirrors task-capsule.schema.json `required`. Used by sync test.
var RequiredFields = []string{
	"schemaVersion",
	"taskId",
	"projectId",
	"repoHealth",
	"currentState",
	"goal",
	"nonGoals",
	"requiredReads",
	"targetFiles",
	"relatedCommands",
	"expectedOutputs",
	"repairPolicy",
}

// AllJSONFields mirrors task-capsule.schema.json `properties` keys.
var AllJSONFields = []string{
	"schemaVersion",
	"taskId",
	"projectId",
	"intent",
	"repoHealth",
	"currentState",
	"goal",
	"nonGoals",
	"requiredReads",
	"targetFiles",
	"relatedCommands",
	"expectedOutputs",
	"repairPolicy",
}

// kebabCasePattern matches the canonical taskId / projectId pattern articulated
// in docs/contracts/aag/task-capsule.schema.json (= `^[a-z0-9][a-z0-9-]*[a-z0-9]$`).
//
// Schema-level pattern check is mirrored here so producer-side Validate() catches
// non-conforming ids before the capsule reaches a JSON Schema validator (= AI
// session が schema-invalid な capsule を出力 / 承認しないように)。
var kebabCasePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)

// Validate checks that all required fields are articulated and enums are valid.
//
// Schema-level structural validity (= field set / additionalProperties) is
// guaranteed by the Go type itself. This method validates value-level
// invariants the schema enforces via type / pattern / enum.
func (t TaskCapsule) Validate() error {
	if t.SchemaVersion != SchemaVersion {
		return fmt.Errorf("TaskCapsule: schemaVersion must be %q (got %q)", SchemaVersion, t.SchemaVersion)
	}
	if t.TaskId == "" {
		return fmt.Errorf("TaskCapsule: taskId must be non-empty")
	}
	if !kebabCasePattern.MatchString(t.TaskId) {
		return fmt.Errorf("TaskCapsule: taskId %q must match kebab-case pattern '^[a-z0-9][a-z0-9-]*[a-z0-9]$' (= schema 整合)", t.TaskId)
	}
	if t.ProjectId == "" {
		return fmt.Errorf("TaskCapsule: projectId must be non-empty")
	}
	if !kebabCasePattern.MatchString(t.ProjectId) {
		return fmt.Errorf("TaskCapsule: projectId %q must match kebab-case pattern '^[a-z0-9][a-z0-9-]*[a-z0-9]$' (= schema 整合)", t.ProjectId)
	}
	if t.Goal == "" {
		return fmt.Errorf("TaskCapsule: goal must be non-empty")
	}
	if t.RepoHealth == nil {
		return fmt.Errorf("TaskCapsule: repoHealth must be articulated (= empty map allowed, nil not allowed)")
	}
	if t.CurrentState == nil {
		return fmt.Errorf("TaskCapsule: currentState must be articulated (= empty map allowed, nil not allowed)")
	}
	if t.RepairPolicy == nil {
		return fmt.Errorf("TaskCapsule: repairPolicy must be articulated (= empty map allowed, nil not allowed)")
	}
	if t.NonGoals == nil {
		return fmt.Errorf("TaskCapsule: nonGoals must be articulated (= empty array allowed, nil not allowed)")
	}
	if t.RequiredReads == nil {
		return fmt.Errorf("TaskCapsule: requiredReads must be articulated (= empty array allowed, nil not allowed)")
	}
	if t.TargetFiles == nil {
		return fmt.Errorf("TaskCapsule: targetFiles must be articulated (= empty array allowed, nil not allowed)")
	}
	if t.RelatedCommands == nil {
		return fmt.Errorf("TaskCapsule: relatedCommands must be articulated (= empty array allowed, nil not allowed)")
	}
	if t.ExpectedOutputs == nil {
		return fmt.Errorf("TaskCapsule: expectedOutputs must be articulated (= empty array allowed, nil not allowed)")
	}
	if hg, ok := t.RepoHealth["hardGate"].(string); ok {
		if !HardGate(hg).IsValid() {
			return fmt.Errorf("TaskCapsule: repoHealth.hardGate must be 'pass' / 'fail' / 'unknown' (got %q)", hg)
		}
	}
	if t.Intent != nil && *t.Intent == "" {
		return fmt.Errorf("TaskCapsule: intent must be non-empty when present (use nil to omit)")
	}
	return nil
}
