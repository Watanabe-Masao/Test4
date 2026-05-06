// generated_metadata.go — Generated Metadata Detector (= AR-GENERATED-METADATA-G2)
//
// 位置付け (= aag-engine-go-mvp project Phase 8 deliverable):
//   - readiness refactor `tools/architecture-health/src/detectors/generated-metadata-detector.ts` の Go mirror
//   - `*.generated.md` file が GENERATED marker / ISO timestamp 両方 欠落の場合に
//     AR-GENERATED-METADATA-G2 violation を emit (= 手編集の疑い)
//   - 5 detector 移植の **最後**、Phase 9 shadow mode への入口
//
// 検出 logic boundary (= readiness refactor README.md §「Logic Boundary Reference」 mirror):
//   - Input facts: { files: [{path, content}] }
//   - 判定 logic: 2 regex pattern (= GENERATED_MARKER + ISO_TIMESTAMP) で content match、
//     両方欠落で violation emit
//   - Output: 1 violation per file missing both markers
//   - engine 再実装 boundary: regex pattern は detector 内部 const、engine 側で同 pattern を
//     articulate (= regex literal の同期義務)
//
// severity articulate vs CI 扱い (= 本 detector の特殊性):
//   - DetectorResult.severity = "gate" (= TS source と一致、fixture parity primary metric 整合)
//   - CI 扱い = advisory non-blocking (= Phase 10 で articulate、readiness refactor
//     readiness-report.md §7 「advisory (= MVP)」 と整合)
//   - **distinction**: severity は detector 出力分類、CI hard gate 化は別 layer 判断
//   - false positive 余地 (= sourceCommit / generatedAt / shallow clone / regen timing)
//     を考慮し、Phase 11 hard gate promotion でも本 rule は最後 or advisory 継続候補
//
// 不可侵原則:
//   - 本 detector は production guard `generatedFileEditGuard.test.ts` を **置換しない**
//   - severity / regex pattern は TS 側と field-level 一致 (= fixture parity 100%)
//
// 参照:
//   - tools/architecture-health/src/detectors/generated-metadata-detector.ts (= TS source)
//   - app/src/test/guards/generatedFileEditGuard.test.ts (= production guard)
//   - projects/completed/aag-engine-readiness-refactor/ARCHIVE.md §7 hard gate 判定
//   - fixtures/aag/generated/fail-stale-metadata (= parity test 入力)
package detectors

import (
	"fmt"
	"regexp"

	"aag-engine/internal/contract"
)

// GeneratedMetadataFacts は generated-metadata-detector が要求する input facts。
//
// TS 側 GeneratedMetadataFacts と structurally identical (= readiness refactor
// `generated-metadata-detector.ts` mirror):
//
//   - Files: `*.generated.md` files (= path + 全 content)
type GeneratedMetadataFacts struct {
	Files []GeneratedMetadataFile `json:"files"`
}

// GeneratedMetadataFile は単一 generated file (= path + content)。
type GeneratedMetadataFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// generatedMarkerPattern は GENERATED marker の regex (= TS と同 pattern):
//
//   - `>\s*生成:` (= markdown blockquote 形式の "> 生成: ..." marker)
//   - `<!--\s*GENERATED` (= HTML comment 形式の <!-- GENERATED ... -->)
//   - `GENERATED:START` (= section marker GENERATED:START / END pair)
var generatedMarkerPattern = regexp.MustCompile(`(>\s*生成:|<!--\s*GENERATED|GENERATED:START)`)

// isoTimestampPattern は ISO 8601 timestamp の regex (= YYYY-MM-DDTHH:MM:SS)。
var isoTimestampPattern = regexp.MustCompile(`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`)

// DetectGeneratedMetadataViolations は generated metadata 系 violation を検出する pure function。
//
// 検出 rule (= demonstration scope = G2):
//   - **G2** (= GENERATED marker / ISO timestamp 両方欠落): 各 file について 2 regex pattern
//     を test、両方欠落で violation emit (= severity=gate、CI 扱いは advisory)
//
// TS 側 detectGeneratedMetadataViolations と意味的に等価 (= fixture parity primary metric)。
//
// 不可侵原則:
//   - severity = "gate" (= TS と一致、fixture parity)、CI 非 blocking 化は Phase 10 で articulate
//   - regex pattern は TS と同 literal (= readiness refactor 不可侵原則 4 「rule semantics
//     を別言語に複製しない」 を考慮、最小 pattern 同期義務として articulate)
//
// Returns:
//   - []contract.DetectorResult: 検出された violation 集合
//   - error: factory validation error
func DetectGeneratedMetadataViolations(facts GeneratedMetadataFacts) ([]contract.DetectorResult, error) {
	results := []contract.DetectorResult{}

	for _, file := range facts.Files {
		hasMarker := generatedMarkerPattern.MatchString(file.Content)
		hasTimestamp := isoTimestampPattern.MatchString(file.Content)

		if hasMarker || hasTimestamp {
			continue
		}

		evidence := "no GENERATED marker AND no ISO timestamp"
		messageSeed := fmt.Sprintf(
			"*.generated.md '%s' が GENERATED marker / ISO timestamp を含まない (= 手編集の疑い)",
			file.Path,
		)

		r, err := contract.CreateDetectorResult(contract.DetectorResult{
			RuleId:        "AR-GENERATED-METADATA-G2",
			DetectionType: "governance-ops",
			SourceFile:    file.Path,
			Severity:      contract.SeverityGate, // = TS source 一致、CI advisory 扱いは Phase 10 で articulate
			Evidence:      &evidence,
			MessageSeed:   &messageSeed,
		})
		if err != nil {
			return nil, fmt.Errorf("DetectGeneratedMetadataViolations: factory error: %w", err)
		}
		results = append(results, r)
	}

	return results, nil
}
