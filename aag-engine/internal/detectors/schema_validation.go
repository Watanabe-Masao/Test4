// schema_validation.go — Schema Validation Detector (= AR-SCHEMA-VALIDATION-PZ2)
//
// 位置付け (= aag-engine-go-mvp project Phase 6 deliverable):
//   - readiness refactor `tools/architecture-health/src/detectors/schema-validation-detector.ts` の Go mirror
//   - projectization.level (= AAG-COA Level、整数 0〜4) の範囲外を AR-SCHEMA-VALIDATION-PZ2
//     violation として emit
//
// 検出 logic boundary (= readiness refactor README.md §「Logic Boundary Reference」 mirror):
//   - Input facts: { projects: [{projectId, configPath, level: number | null}] }
//   - 判定 logic: level !== null && (!isInteger(level) || level < 0 || level > 4) で violation emit
//   - Output: 1 violation per out-of-range level (= actual + evidence + messageSeed)
//   - engine 再実装 boundary: `[0, 4]` 範囲は AAG-COA Level 定義 (= projectization-policy.md §3) に由来
//
// AAG-COA Level 定義 (= 0=Task / 1=Lightweight / 2=Standard / 3=Architecture / 4=Umbrella、
// integer 0〜4 のみ valid):
//   - level=null は skip (= 別 rule = PZ-1 = projectization metadata 欠落、本 detector scope 外)
//   - level=integer 0-4 → valid
//   - level=integer outside [0,4] (= -1, 5, 等) → violation
//   - level=非 integer (= 2.5 等) → violation
//
// 不可侵原則:
//   - 本 detector は production guard `projectizationPolicyGuard.test.ts` を **置換しない**
//   - ruleId / sourceFile / severity / actual / evidence / messageSeed は TS 側 expected.json と field-level 一致
//
// 参照:
//   - tools/architecture-health/src/detectors/schema-validation-detector.ts (= TS source)
//   - app/src/test/guards/projectizationPolicyGuard.test.ts (= production guard、parallel implementation)
//   - references/05-aag-interface/operations/projectization-policy.md §3 (= AAG-COA Level 定義 canonical)
//   - fixtures/aag/schema-validation/fail-level-out-of-range (= parity test 入力)
package detectors

import (
	"fmt"
	"math"

	"aag-engine/internal/contract"
)

// SchemaValidationProject は単一 project の projectization metadata 抽出結果。
//
// Level は pointer 型 (= JSON null を nil として articulate、TS `number | null` mirror):
//   - nil → 別 rule (= PZ-1 = projectization metadata 欠落)、本 detector で skip
//   - non-nil → 範囲 / integer check
type SchemaValidationProject struct {
	ProjectId  string   `json:"projectId"`
	ConfigPath string   `json:"configPath"`
	Level      *float64 `json:"level"`
}

// SchemaValidationFacts は schema-validation-detector が要求する input facts。
//
// TS 側 SchemaValidationFacts と structurally identical (= readiness refactor
// `schema-validation-detector.ts` mirror)。
type SchemaValidationFacts struct {
	Projects []SchemaValidationProject `json:"projects"`
}

// DetectSchemaValidationViolations は schema-validation 系 violation を検出する pure function。
//
// 検出 rule (= demonstration scope = PZ-2):
//   - **PZ-2** (= projectization.level が 0〜4 範囲外):
//     `Level !== nil && (!isInteger(*Level) || *Level < 0 || *Level > 4)` で violation emit
//
// TS 側 detectSchemaValidationViolations と意味的に等価 (= fixture parity primary metric)。
//
// formatLevel:
//   - integer 値 (= 5.0) → "5" (= %v が float64 を %g で format、trailing zero 省略)
//   - 非 integer (= 2.5) → "2.5"
//
// Returns:
//   - []contract.DetectorResult: 検出された violation 集合
//   - error: factory validation error
func DetectSchemaValidationViolations(facts SchemaValidationFacts) ([]contract.DetectorResult, error) {
	results := []contract.DetectorResult{}

	for _, project := range facts.Projects {
		if project.Level == nil {
			// PZ-1 (= projectization metadata 欠落) は別 rule、本 detector scope 外
			continue
		}

		level := *project.Level
		isInteger := level == math.Trunc(level)
		isValid := isInteger && level >= 0 && level <= 4

		if isValid {
			continue
		}

		// `%v` for float64 は %g format (= trailing zero 省略、5.0 → "5"、2.5 → "2.5")
		levelStr := fmt.Sprintf("%v", level)
		evidence := fmt.Sprintf("level=%s is not in [0, 1, 2, 3, 4]", levelStr)
		messageSeed := fmt.Sprintf("project '%s' の projectization.level (%s) が AAG-COA Level 範囲 [0, 4] 外", project.ProjectId, levelStr)

		actual := level
		r, err := contract.CreateDetectorResult(contract.DetectorResult{
			RuleId:        "AR-SCHEMA-VALIDATION-PZ2",
			DetectionType: "governance-ops",
			SourceFile:    project.ConfigPath,
			Severity:      contract.SeverityGate,
			Actual:        &actual,
			Evidence:      &evidence,
			MessageSeed:   &messageSeed,
		})
		if err != nil {
			return nil, fmt.Errorf("DetectSchemaValidationViolations: factory error: %w", err)
		}
		results = append(results, r)
	}

	return results, nil
}
