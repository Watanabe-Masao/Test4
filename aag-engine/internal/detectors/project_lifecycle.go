// project_lifecycle.go — Project Lifecycle Detector (= AR-PROJECT-LIFECYCLE-C1)
//
// 位置付け (= aag-engine-go-mvp project Phase 7 deliverable):
//   - readiness refactor `tools/architecture-health/src/detectors/project-lifecycle-detector.ts` の Go mirror
//   - completed checklist (= 100% 完了) だが projects/completed/ に物理移動されていない
//     project を AR-PROJECT-LIFECYCLE-C1 violation として emit
//   - 3 状態 (= active / completed v1 / completed v2 圧縮済) すべてで動作
//
// 検出 logic boundary (= readiness refactor README.md §「Logic Boundary Reference」 mirror):
//   - Input facts: { checklistResults: ProjectChecklistResult[] } (= collector layer から articulate)
//   - 判定 logic: derivedStatus === 'completed' && meta.kind !== 'collection' で violation emit
//   - Output: 1 violation per completed-but-not-archived project
//   - engine 再実装 boundary: derivedStatus 計算 logic は collector 側にあり、
//     本 detector は **判定のみ** を担う (= readiness refactor SRP 継承)
//
// 3 状態 routing (= readiness refactor inventory §1 + §4.3 articulate 整合):
//   - **active** (= projects/active/<id>/、full 7 file セット)
//   - **completed v1** (= projects/completed/<id>/ 圧縮未実施、full 7 file セット維持)
//   - **completed v2** (= projects/completed/<id>/ Archive v2 圧縮済、ARCHIVE.md +
//     archive.manifest.json + config/ の 3 file のみ)
//   本 detector は **collector 経由で標準化された ProjectChecklistResult** を受け取るため
//   3 状態 routing は collector の責務、detector は state-agnostic な判定のみ。
//
// 不可侵原則:
//   - 本 detector は production guard `projectCompletionConsistencyGuard.test.ts` を **置換しない**
//   - ruleId / sourceFile / actual / baseline / messageSeed は TS 側 expected.json と field-level 一致
//
// 参照:
//   - tools/architecture-health/src/detectors/project-lifecycle-detector.ts (= TS source)
//   - app/src/test/guards/projectCompletionConsistencyGuard.test.ts (= production guard)
//   - references/03-implementation/aag-engine-readiness-inventory.md §1 + §4.3 (= 3 状態 articulate)
//   - fixtures/aag/project-lifecycle/{pass-active, fail-completed-not-archived} (= parity test 入力)
package detectors

import (
	"fmt"

	"aag-engine/internal/contract"
)

// ProjectKind は project の種別 (= 'project' / 'collection')。
//
// collection (= 例: quick-fixes) は完了概念を持たない (= continuous)、本 detector で skip。
type ProjectKind string

// ProjectKind enum value。
const (
	ProjectKindProject    ProjectKind = "project"
	ProjectKindCollection ProjectKind = "collection"
)

// DerivedStatus は project lifecycle の動的判定状態 (= collector layer 出力)。
type DerivedStatus string

// DerivedStatus enum value (= readiness refactor `project-checklist-collector.ts` の DerivedStatus type と一致)。
const (
	DerivedStatusCompleted  DerivedStatus = "completed"
	DerivedStatusInProgress DerivedStatus = "in_progress"
	DerivedStatusEmpty      DerivedStatus = "empty"
	DerivedStatusArchived   DerivedStatus = "archived"
	DerivedStatusCollection DerivedStatus = "collection"
)

// ProjectMeta は ProjectChecklistResult の meta (= projectId / projectRoot / kind 等)。
//
// TS 側 ProjectMeta と structurally identical (= readiness refactor
// `project-checklist-collector.ts` mirror)。本 detector は projectId / kind /
// projectRoot のみを参照、他 field は collector / 他 detector で使用候補。
type ProjectMeta struct {
	ProjectId     string      `json:"projectId"`
	Title         string      `json:"title"`
	Status        string      `json:"status"`
	Kind          ProjectKind `json:"kind"`
	Parent        *string     `json:"parent,omitempty"`
	ProjectRoot   string      `json:"projectRoot"`
	ChecklistPath string      `json:"checklistPath"`
	AiContextPath string      `json:"aiContextPath"`
	HandoffPath   string      `json:"handoffPath"`
	PlanPath      string      `json:"planPath"`
}

// ProjectChecklistResult は collector が emit する単一 project の状態 (= TS mirror)。
type ProjectChecklistResult struct {
	Meta          ProjectMeta   `json:"meta"`
	Checked       int           `json:"checked"`
	Total         int           `json:"total"`
	DerivedStatus DerivedStatus `json:"derivedStatus"`
}

// ProjectLifecycleFacts は project-lifecycle-detector が要求する input facts。
type ProjectLifecycleFacts struct {
	ChecklistResults []ProjectChecklistResult `json:"checklistResults"`
}

// DetectProjectLifecycleViolations は project lifecycle 系 violation を検出する pure function。
//
// 検出 rule (= demonstration scope = C1):
//   - **C1** (= completed but not archived): derivedStatus === 'completed' &&
//     kind !== 'collection' で violation emit (= severity=gate)
//
// TS 側 detectProjectLifecycleViolations と意味的に等価 (= fixture parity primary metric)。
//
// 不可侵原則:
//   - 本 detector は production guard `projectCompletionConsistencyGuard.test.ts` の C1 と
//     同 violation を Go 側でも emit (= parallel implementation)
//   - actual = checked / baseline = total を articulate (= ratchet-down 系の慣用 pattern)
//
// Returns:
//   - []contract.DetectorResult: 検出された violation 集合
//   - error: factory validation error
func DetectProjectLifecycleViolations(facts ProjectLifecycleFacts) ([]contract.DetectorResult, error) {
	results := []contract.DetectorResult{}

	for _, project := range facts.ChecklistResults {
		if project.DerivedStatus != DerivedStatusCompleted {
			continue
		}
		if project.Meta.Kind == ProjectKindCollection {
			// collection は完了概念を持たない (= 継続 collection、archive しない)
			continue
		}

		actual := float64(project.Checked)
		baseline := float64(project.Total)
		messageSeed := fmt.Sprintf(
			"project '%s' は checklist 100%% 完了 (%d/%d) ですが projects/completed/ に移されていません",
			project.Meta.ProjectId, project.Checked, project.Total,
		)

		r, err := contract.CreateDetectorResult(contract.DetectorResult{
			RuleId:        "AR-PROJECT-LIFECYCLE-C1",
			DetectionType: "governance-ops",
			SourceFile:    project.Meta.ProjectRoot,
			Severity:      contract.SeverityGate,
			Actual:        &actual,
			Baseline:      &baseline,
			MessageSeed:   &messageSeed,
		})
		if err != nil {
			return nil, fmt.Errorf("DetectProjectLifecycleViolations: factory error: %w", err)
		}
		results = append(results, r)
	}

	return results, nil
}
