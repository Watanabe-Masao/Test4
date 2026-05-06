// Package detectors provides AAG Engine detector Go implementations.
//
// 位置付け (= aag-engine-go-mvp project Phase 4-8 deliverable):
//   - 各 detector は aag-engine-readiness-refactor で TS 側に landing 済みの 5 detector
//     の Go mirror。同 input facts shape + 同 violation 検出 logic + 同 DetectorResult[]
//     output (= fixture parity primary metric)。
//   - 不可侵原則 9 (= Go engine が source of truth にならない): 各 detector の logic
//     boundary は readiness refactor `tools/architecture-health/src/detectors/README.md`
//     §「Logic Boundary Reference」 を canonical reference として参照。
//
// 移植順序 (= readiness refactor §8.4 移植優先順位 継承):
//   1. archive-manifest (= Phase 4、最初に移植、JSON schema 中心、低 risk)
//   2. doc-registry (= Phase 5)
//   3. schema-validation (= Phase 6)
//   4. project-lifecycle (= Phase 7)
//   5. generated-metadata (= Phase 8、advisory only)
//
// 参照:
//   - tools/architecture-health/src/detectors/archive-manifest-detector.ts (= TS source)
//   - tools/architecture-health/src/detectors/README.md §archive-manifest-detector (= boundary articulate)
//   - fixtures/aag/archive-v2/{pass-minimal, fail-missing-restore-command, fail-missing-multiple-fields} (= parity test 入力)
package detectors

import (
	"fmt"

	"aag-engine/internal/contract"
)

// ArchiveManifestFacts は archive-manifest-detector が要求する input facts。
//
// TS 側 ArchiveManifestFacts と structurally identical (= aag-engine-readiness-refactor
// `archive-manifest-detector.ts` § ArchiveManifestFacts interface mirror):
//
//   - ManifestPath: archived project manifest への repo-relative POSIX path
//   - Manifest: parsed manifest object (= JSON.parse 後)、nil = 読み込み失敗 (= collector 責務)
type ArchiveManifestFacts struct {
	ManifestPath string                 `json:"manifestPath"`
	Manifest     map[string]interface{} `json:"manifest"`
}

// requiredArchiveManifestFields は Archive v2 manifest の required top-level field 12 件。
//
// 順序は schema (= docs/contracts/aag/project-archive.schema.json `requiredManifestFields`)
// および TS 側 archive-manifest-detector.ts の `REQUIRED_TOP_LEVEL_FIELDS` 配列と一致。
// 順序は detector 出力の deterministic ordering に影響するため変更不可。
var requiredArchiveManifestFields = []string{
	"archiveVersion",
	"projectId",
	"title",
	"archivedAt",
	"preCompressionCommit",
	"deletedPaths",
	"compressedFiles",
	"restoreAllCommand",
	"decisionEntries",
	"commitLineage",
	"relatedPrograms",
	"compressionRationale",
}

// DetectArchiveManifestViolations は archive-manifest 系 violation を検出する pure function。
//
// 検出 rule (= demonstration scope = A2):
//   - **A2** (= top-level required field 欠落): 各 manifest について 12 required field
//     それぞれの存在を check、欠落で violation emit (= severity=gate)
//
// TS 側 detectArchiveManifestViolations と意味的に等価 (= fixture parity primary metric)。
// readiness refactor archive で self-dogfood 済みの 4 archived project に対しても適用可能。
//
// Phase 5 以降:
//   - 残り 9 violation rule (= A1 / A3〜A10) は本 MVP scope 外、別 program 起票候補
//   - readiness refactor で TS 側に articulate された A1〜A10 すべての移植は別 program
//     (= production guard refactor 等) で担う
//
// 不可侵原則:
//   - 本 detector は production guard `archiveV2SchemaGuard.test.ts` を **置換しない**
//     (= 本 MVP は parallel implementation、TS 側 A2 と同 violation を Go 側でも emit)
//   - ruleId / sourceFile / severity は TS 側 expected.json と field-level 一致
//
// Returns:
//   - []contract.DetectorResult: 検出された violation 集合 (= 空 array は違反なし)
//   - error: factory validation error (= 通常発生せず、internal sanity)
func DetectArchiveManifestViolations(facts []ArchiveManifestFacts) ([]contract.DetectorResult, error) {
	results := []contract.DetectorResult{}

	for _, fact := range facts {
		if fact.Manifest == nil {
			// collector layer 読み込み失敗は本 detector scope 外 (= TS 側と同 articulate)
			continue
		}

		for _, field := range requiredArchiveManifestFields {
			if _, ok := fact.Manifest[field]; !ok {
				evidence := fmt.Sprintf("missing required field: %s", field)
				messageSeed := fmt.Sprintf("Archive v2 manifest が required top-level field '%s' を持たない", field)

				r, err := contract.CreateDetectorResult(contract.DetectorResult{
					RuleId:        "AR-ARCHIVE-MANIFEST-A2",
					DetectionType: "governance-ops",
					SourceFile:    fact.ManifestPath,
					Severity:      contract.SeverityGate,
					Evidence:      &evidence,
					MessageSeed:   &messageSeed,
				})
				if err != nil {
					return nil, fmt.Errorf("DetectArchiveManifestViolations: factory error: %w", err)
				}
				results = append(results, r)
			}
		}
	}

	return results, nil
}
