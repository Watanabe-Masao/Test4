// Package contract holds canonical schema bindings for AAG Engine.
//
// Phase 2 (= DetectorResult Contract Binding) で landing する binding。
// docs/contracts/aag/detector-result.schema.json (= JSON Schema draft-07) と
// structurally identical な Go struct + factory + helper を articulate。
//
// 不可侵原則:
//   - canonical schema は docs/contracts/aag/detector-result.schema.json の TS 側正本。
//     本 Go struct は **structurally identical な mirror**、独自 field 追加は禁止
//     (= sync test で機械検証)。
//   - schemaVersion mismatch は ExitError として hard fail (= Phase 2 sync test)。
//
// 参照:
//   - docs/contracts/aag/detector-result.schema.json (= canonical)
//   - tools/architecture-health/src/detector-result.ts (= TS implementation reference)
//   - app/src/test/guards/aagContractSchemaSyncGuard.test.ts (= TS 側 schema sync verifier)
//   - projects/active/aag-engine-go-mvp/plan.md §Phase 2
package contract

import "fmt"

// CanonicalSchemaPath は repo-relative POSIX path で canonical JSON Schema を articulate。
const CanonicalSchemaPath = "docs/contracts/aag/detector-result.schema.json"

// CanonicalSchemaID は JSON Schema $id (= versioned URI、schema mismatch 検出用)。
const CanonicalSchemaID = "https://aag.local/schemas/detector-result-v1.json"

// PackageVersion は本 package の binding version (= Phase 単位で update)。
const PackageVersion = "phase-2-detector-result"

// Severity は DetectorResult の severity enum (= schema の 3-enum と一致)。
//
//   - SeverityGate        = CI fail + マージ block
//   - SeverityBlockMerge  = CI warn + マージ block
//   - SeverityWarn        = CI warn + マージ allow
type Severity string

// Severity enum value。canonical schema の enum と完全一致。
const (
	SeverityGate       Severity = "gate"
	SeverityBlockMerge Severity = "block-merge"
	SeverityWarn       Severity = "warn"
)

// AllSeverities は Severity enum の articulate 全 3 値 (= test / validation で使用)。
var AllSeverities = []Severity{SeverityGate, SeverityBlockMerge, SeverityWarn}

// IsValid は Severity enum 値の妥当性を articulate。
func (s Severity) IsValid() bool {
	for _, v := range AllSeverities {
		if s == v {
			return true
		}
	}
	return false
}

// DetectorResult は AAG detector が emit する machine-readable 違反 result。
//
// Field 順序は canonical schema の required + properties 並び順に揃える
// (= sync test で機械検証)。
//
// Optional field は pointer 型で articulate (= TS の `?` 接尾辞と等価):
//   - nil           = 未 articulate (= JSON output で field 不在)
//   - non-nil       = articulate あり (= JSON output で field 存在)
//
// canonical schema:
//   - required: ruleId, detectionType, sourceFile, severity
//   - optional: evidence, actual, baseline, messageSeed
type DetectorResult struct {
	// RuleId は AR rule id (= 例: AR-AAG-DERIVED-ONLY-IMPORT)。base-rules.ts rule.id に対応。
	RuleId string `json:"ruleId"`

	// DetectionType は検出 type (= 例: layer-boundary / governance-ops / etc.)。
	DetectionType string `json:"detectionType"`

	// SourceFile は違反検出元の file path (= repo-relative POSIX、4 規約遵守)。
	SourceFile string `json:"sourceFile"`

	// Severity は CI / マージ判定への impact (= gate / block-merge / warn)。
	Severity Severity `json:"severity"`

	// Evidence は違反の evidence (= 具体 code snippet / regex match 等)。optional。
	Evidence *string `json:"evidence,omitempty"`

	// Actual は ratchet-down 系 guard における現在カウント。optional。
	Actual *float64 `json:"actual,omitempty"`

	// Baseline は ratchet-down 系 guard における baseline 上限。optional。
	Baseline *float64 `json:"baseline,omitempty"`

	// MessageSeed は AagResponse.summary / reason 生成のための seed message。optional。
	MessageSeed *string `json:"messageSeed,omitempty"`
}

// CreateDetectorResult は DetectorResult を生成する factory。
//
// Schema required field を必ず articulate させ、optional field は nil を strict
// に handle。TS 側 createDetectorResult() の Go mirror。
//
// Validation:
//   - RuleId / DetectionType / SourceFile が空文字なら error
//   - Severity が enum 値以外なら error
//   - Evidence / MessageSeed が non-nil で空文字なら error (= TS と同 strictness)
//
// Note: Go struct literal 経由でも DetectorResult は articulate 可能。
// CreateDetectorResult は **validation 必須 path** (= 本 factory 経由した結果は
// schema 準拠を保証)。直接 struct literal 経由した場合は呼び出し側責任で validation。
func CreateDetectorResult(input DetectorResult) (DetectorResult, error) {
	if input.RuleId == "" {
		return DetectorResult{}, fmt.Errorf("DetectorResult: ruleId must be non-empty")
	}
	if input.DetectionType == "" {
		return DetectorResult{}, fmt.Errorf("DetectorResult: detectionType must be non-empty")
	}
	if input.SourceFile == "" {
		return DetectorResult{}, fmt.Errorf("DetectorResult: sourceFile must be non-empty")
	}
	if !input.Severity.IsValid() {
		return DetectorResult{}, fmt.Errorf("DetectorResult: severity must be 'gate' / 'block-merge' / 'warn' (got %q)", input.Severity)
	}
	if input.Evidence != nil && *input.Evidence == "" {
		return DetectorResult{}, fmt.Errorf("DetectorResult: evidence must be non-empty when present (use nil to omit)")
	}
	if input.MessageSeed != nil && *input.MessageSeed == "" {
		return DetectorResult{}, fmt.Errorf("DetectorResult: messageSeed must be non-empty when present (use nil to omit)")
	}

	return input, nil
}

// PtrString は string optional field articulate のための convenience helper。
//
//	contract.PtrString("evidence text") // -> *string
func PtrString(s string) *string {
	return &s
}

// PtrFloat64 は float64 optional field articulate のための convenience helper。
//
//	contract.PtrFloat64(5) // -> *float64
func PtrFloat64(f float64) *float64 {
	return &f
}

// RequiredFields は schema required (= sync test で schema.required と比較)。
var RequiredFields = []string{"ruleId", "detectionType", "sourceFile", "severity"}

// AllJSONFields は全 JSON field name (= sync test で schema.properties と比較)。
var AllJSONFields = []string{
	"ruleId",
	"detectionType",
	"sourceFile",
	"severity",
	"evidence",
	"actual",
	"baseline",
	"messageSeed",
}
