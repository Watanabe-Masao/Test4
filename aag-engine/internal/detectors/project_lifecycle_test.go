// project_lifecycle_test.go は Project Lifecycle Detector の unit test + fixture parity test。
//
// Phase 7 (= Project Lifecycle Detector) で landing する test:
//   - Unit test:
//       - empty checklistResults → empty result
//       - in_progress / archived / collection / empty → 0 violation (= C1 該当外)
//       - completed + project kind → 1 violation
//       - completed + collection kind → skip (= continuous collection、archive 概念なし)
//       - 複数 completed → 複数 violation、順序維持
//   - Fixture parity test:
//       - project-lifecycle/pass-active → 0 violation, Match=true (= active / archived / collection mix)
//       - project-lifecycle/fail-completed-not-archived → 1 violation, Match=true
//
// 参照:
//   - tools/architecture-health/src/detectors/project-lifecycle-detector.ts (= TS source)
//   - fixtures/aag/project-lifecycle/{pass-active, fail-completed-not-archived}
package detectors

import (
	"encoding/json"
	"testing"

	"aag-engine/internal/contract"
	"aag-engine/internal/fixture"
)

// makeProject は test helper (= ProjectChecklistResult literal articulate)。
func makeProject(projectId string, kind ProjectKind, checked, total int, status DerivedStatus) ProjectChecklistResult {
	return ProjectChecklistResult{
		Meta: ProjectMeta{
			ProjectId:     projectId,
			Title:         projectId,
			Status:        "active",
			Kind:          kind,
			ProjectRoot:   "projects/active/" + projectId,
			ChecklistPath: "projects/active/" + projectId + "/checklist.md",
			AiContextPath: "projects/active/" + projectId + "/AI_CONTEXT.md",
			HandoffPath:   "projects/active/" + projectId + "/HANDOFF.md",
			PlanPath:      "projects/active/" + projectId + "/plan.md",
		},
		Checked:       checked,
		Total:         total,
		DerivedStatus: status,
	}
}

// Unit: empty checklistResults は empty result。
func TestDetectProjectLifecycleViolations_Empty(t *testing.T) {
	results, err := DetectProjectLifecycleViolations(ProjectLifecycleFacts{
		ChecklistResults: []ProjectChecklistResult{},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations, got %d", len(results))
	}
}

// Unit: in_progress / archived / collection / empty は C1 該当外 → 0 violation。
func TestDetectProjectLifecycleViolations_NonCompletedSkipped(t *testing.T) {
	facts := ProjectLifecycleFacts{
		ChecklistResults: []ProjectChecklistResult{
			makeProject("p-progress", ProjectKindProject, 3, 5, DerivedStatusInProgress),
			makeProject("p-archived", ProjectKindProject, 5, 5, DerivedStatusArchived),
			makeProject("p-collection", ProjectKindCollection, 0, 0, DerivedStatusCollection),
			makeProject("p-empty", ProjectKindProject, 0, 0, DerivedStatusEmpty),
		},
	}
	results, err := DetectProjectLifecycleViolations(facts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations for non-completed/collection states, got %d: %+v", len(results), results)
	}
}

// Unit: completed + project kind → 1 violation、field-level check。
func TestDetectProjectLifecycleViolations_CompletedNotArchived(t *testing.T) {
	results, err := DetectProjectLifecycleViolations(ProjectLifecycleFacts{
		ChecklistResults: []ProjectChecklistResult{
			makeProject("sample", ProjectKindProject, 7, 7, DerivedStatusCompleted),
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(results))
	}
	r := results[0]
	if r.RuleId != "AR-PROJECT-LIFECYCLE-C1" {
		t.Errorf("ruleId mismatch: %q", r.RuleId)
	}
	if r.Severity != contract.SeverityGate {
		t.Errorf("severity mismatch: %q", r.Severity)
	}
	if r.SourceFile != "projects/active/sample" {
		t.Errorf("sourceFile mismatch: %q", r.SourceFile)
	}
	if r.Actual == nil || *r.Actual != 7 {
		t.Errorf("actual mismatch: %v", r.Actual)
	}
	if r.Baseline == nil || *r.Baseline != 7 {
		t.Errorf("baseline mismatch: %v", r.Baseline)
	}
	expectedMsg := "project 'sample' は checklist 100% 完了 (7/7) ですが projects/completed/ に移されていません"
	if r.MessageSeed == nil || *r.MessageSeed != expectedMsg {
		t.Errorf("messageSeed mismatch:\n  got:  %q\n  want: %q", *r.MessageSeed, expectedMsg)
	}
}

// Unit: completed + collection kind は skip (= continuous collection)。
func TestDetectProjectLifecycleViolations_CollectionSkipped(t *testing.T) {
	results, err := DetectProjectLifecycleViolations(ProjectLifecycleFacts{
		ChecklistResults: []ProjectChecklistResult{
			// kind=collection、derivedStatus=completed の hypothetical case
			makeProject("quick-fixes", ProjectKindCollection, 5, 5, DerivedStatusCompleted),
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 violations for collection kind, got %d", len(results))
	}
}

// Unit: 複数 completed project → 複数 violation、順序維持 (= checklistResults 順)。
func TestDetectProjectLifecycleViolations_MultipleCompletedNotArchived(t *testing.T) {
	facts := ProjectLifecycleFacts{
		ChecklistResults: []ProjectChecklistResult{
			makeProject("p1", ProjectKindProject, 3, 3, DerivedStatusCompleted),
			makeProject("p-progress", ProjectKindProject, 1, 5, DerivedStatusInProgress),
			makeProject("p2", ProjectKindProject, 5, 5, DerivedStatusCompleted),
		},
	}
	results, err := DetectProjectLifecycleViolations(facts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 violations, got %d", len(results))
	}
	if results[0].SourceFile != "projects/active/p1" {
		t.Errorf("results[0].SourceFile mismatch: %q", results[0].SourceFile)
	}
	if results[1].SourceFile != "projects/active/p2" {
		t.Errorf("results[1].SourceFile mismatch: %q", results[1].SourceFile)
	}
}

// Fixture parity: project-lifecycle/pass-active → 0 violations (= active / archived / collection mix)。
func TestFixtureParity_ProjectLifecycle_PassActive(t *testing.T) {
	fx := loadFixture(t, "project-lifecycle/pass-active")

	facts := parseProjectLifecycleFacts(t, fx.InputRaw)
	actual, err := DetectProjectLifecycleViolations(facts)
	if err != nil {
		t.Fatalf("detector error: %v", err)
	}

	diff := fixture.Compare(fx, actual)
	if !diff.Match {
		t.Errorf("fixture %q parity mismatch:\n  actual:   %+v\n  expected: %+v\n  missing: %+v\n  extra:   %+v",
			fx.Name, actual, fx.Expected, diff.Missing, diff.Extra)
	}
}

// Fixture parity: project-lifecycle/fail-completed-not-archived → 1 violation, Match=true。
func TestFixtureParity_ProjectLifecycle_FailCompletedNotArchived(t *testing.T) {
	fx := loadFixture(t, "project-lifecycle/fail-completed-not-archived")

	facts := parseProjectLifecycleFacts(t, fx.InputRaw)
	actual, err := DetectProjectLifecycleViolations(facts)
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

// parseProjectLifecycleFacts は fixture の InputRaw から `{"facts": {checklistResults: [...]}}` を抽出。
func parseProjectLifecycleFacts(t *testing.T, raw json.RawMessage) ProjectLifecycleFacts {
	t.Helper()
	var input struct {
		Facts ProjectLifecycleFacts `json:"facts"`
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		t.Fatalf("parse input.json: %v", err)
	}
	return input.Facts
}
