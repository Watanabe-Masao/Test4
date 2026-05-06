// doc_registry.go — Doc Registry Detector (= AR-DOC-REGISTRY-D1)
//
// 位置付け (= aag-engine-go-mvp project Phase 5 deliverable):
//   - readiness refactor `tools/architecture-health/src/detectors/doc-registry-detector.ts` の Go mirror
//   - doc-registry (= docs/contracts/doc-registry.json) に登録された path が
//     file system に存在しない場合に AR-DOC-REGISTRY-D1 violation を emit
//   - references doc 追加時の §13.2 atomic update pattern (= doc-registry に
//     entry 追加せず references/ に新 doc 追加した状態) を hard fail で検出
//
// 検出 logic boundary (= readiness refactor README.md §「Logic Boundary Reference」 mirror):
//   - Input facts: { entries: [{path, label}], existingPaths: Set<string> }
//   - 判定 logic: 各 entry について existingPaths.has(entry.path) === false で violation emit
//   - Output: 1 violation per non-existent path (= evidence: "registered label: <label>")
//   - engine 再実装 boundary: existingPaths は collector layer (= filesystem read) で構築、
//     本 detector は **set membership 判定のみ**
//
// Phase 6 以降:
//   - 残り 5 violation rule (= D2 / D3 / 等) は本 MVP scope 外、別 program 起票候補
//
// 不可侵原則:
//   - 本 detector は production guard `docRegistryGuard.test.ts` を **置換しない**
//   - ruleId / sourceFile / severity は TS 側 expected.json と field-level 一致
//
// 参照:
//   - tools/architecture-health/src/detectors/doc-registry-detector.ts (= TS source)
//   - app/src/test/guards/docRegistryGuard.test.ts (= production guard、parallel implementation)
//   - fixtures/aag/doc-registry/fail-missing-path (= parity test 入力)
package detectors

import (
	"fmt"

	"aag-engine/internal/contract"
)

// DocRegistryEntry は doc-registry に登録された 1 entry (= path + label の pair)。
type DocRegistryEntry struct {
	Path  string `json:"path"`
	Label string `json:"label"`
}

// DocRegistryFacts は doc-registry-detector が要求する input facts。
//
// TS 側 DocRegistryFacts と structurally identical (= readiness refactor
// `doc-registry-detector.ts` mirror):
//
//   - Entries: doc-registry に登録された entry 集合 (= path + label のペア)
//   - ExistingPaths: 実存する file path 集合 (= filesystem read 後の collector output、
//     JSON では array、本 detector 内部で set 化)
type DocRegistryFacts struct {
	Entries       []DocRegistryEntry `json:"entries"`
	ExistingPaths []string           `json:"existingPaths"`
}

// DetectDocRegistryViolations は doc-registry 系 violation を検出する pure function。
//
// 検出 rule (= demonstration scope = D1):
//   - **D1** (= registered path が file system に存在しない): 各 entry について
//     existingPaths set membership を check、欠落で violation emit (= severity=gate)
//
// TS 側 detectDocRegistryViolations と意味的に等価 (= fixture parity primary metric)。
//
// 不可侵原則:
//   - 本 detector は production guard `docRegistryGuard.test.ts` の D1 と同 violation
//     を Go 側でも emit (= parallel implementation)
//   - ruleId / sourceFile / severity は TS 側 expected.json と field-level 一致
//
// Returns:
//   - []contract.DetectorResult: 検出された violation 集合 (= 空 array は違反なし)
//   - error: factory validation error
func DetectDocRegistryViolations(facts DocRegistryFacts) ([]contract.DetectorResult, error) {
	// existingPaths を set 化 (= O(1) lookup)
	existingSet := make(map[string]bool, len(facts.ExistingPaths))
	for _, p := range facts.ExistingPaths {
		existingSet[p] = true
	}

	results := []contract.DetectorResult{}

	for _, entry := range facts.Entries {
		if existingSet[entry.Path] {
			continue
		}

		evidence := fmt.Sprintf("registered label: %s", entry.Label)
		messageSeed := fmt.Sprintf("doc registry に登録された path '%s' が file system に存在しない", entry.Path)

		r, err := contract.CreateDetectorResult(contract.DetectorResult{
			RuleId:        "AR-DOC-REGISTRY-D1",
			DetectionType: "governance-ops",
			SourceFile:    entry.Path,
			Severity:      contract.SeverityGate,
			Evidence:      &evidence,
			MessageSeed:   &messageSeed,
		})
		if err != nil {
			return nil, fmt.Errorf("DetectDocRegistryViolations: factory error: %w", err)
		}
		results = append(results, r)
	}

	return results, nil
}
