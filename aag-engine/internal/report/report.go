// Package report holds engine run-result rendering for AAG Engine.
//
// Phase 1 (= Go CLI Skeleton) で landing する skeleton。空 DetectorResult[] を
// JSON 形式で出力可能にする。
//
// Phase 2 以降:
//   - DetectorResult struct を contract package に移管 (= 本 package は report 専属)
//   - shadow mode parity report の generation (= Phase 9)
//   - markdown view rendering (= Phase 10 以降、TS renderer と並列)
//
// 不可侵原則:
//   - 本 package は **生成 (= 書き込み)** を行わない (= MVP は validator のみ、
//     不可侵原則 1 strict adherence)。出力 (= stdout / stderr) は呼び出し側責務。
//   - JSON output は schemaVersion + status + repo + detectorResults + (optional) note
//     の 5 field。schemaVersion = "aag-engine-run-result-v1" (= 本 MVP 期間中固定)。
//
// 参照:
//   - projects/active/aag-engine-go-mvp/plan.md §Phase 1 (= 本 package の skeleton 計画)
//   - tools/architecture-health/src/detector-result.ts §renderDetectorResultsAsJson (= TS 側 reference)
package report

import (
	"encoding/json"
	"fmt"
)

// RunResult は AAG Engine の run-result top-level shape。
//
// Phase 1 skeleton では空 DetectorResult[] のみ。Phase 4-8 で各 detector が
// 順次 wired up され、実 violation を返すようになる。
type RunResult struct {
	// SchemaVersion は run-result schema の version (= "aag-engine-run-result-v1" 固定)。
	SchemaVersion string `json:"schemaVersion"`

	// Status は engine 実行結果。"pass" = violation 0 件、"fail" = violation ≥ 1 件。
	Status string `json:"status"`

	// Repo は検証対象 repo root の path (= --repo flag からの値)。
	Repo string `json:"repo"`

	// DetectorResults は各 detector が emit した violation 集合。
	// Phase 1 では空 array、Phase 4-8 で順次 populate。
	DetectorResults []DetectorResult `json:"detectorResults"`

	// Note は engine 実装段階の articulate (= optional、Phase 1 skeleton で活用)。
	Note string `json:"note,omitempty"`
}

// DetectorResult は AAG detector の violation entry。
//
// Phase 1 では placeholder (= 空 struct)。Phase 2 (= DetectorResult Contract
// Binding) で canonical schema (= docs/contracts/aag/detector-result.schema.json)
// に整合する field 群を populate:
//   - ruleId / detectionType / sourceFile / severity (= required)
//   - evidence / actual / baseline / messageSeed (= optional)
type DetectorResult struct {
	// Phase 2 で field 追加。Phase 1 skeleton では空 struct を marshal 可能にする
	// だけの placeholder。
}

// RenderJSON は RunResult を indent=2 の JSON bytes に変換。
//
// 出力形式は TS 側 renderDetectorResultsAsJson() (= Phase 9 shadow mode で
// parity 比較対象) と互換。但し本 Phase 1 skeleton では空 array なので
// deterministic ordering 比較は Phase 4 以降。
func RenderJSON(r RunResult) ([]byte, error) {
	out, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("RenderJSON: marshal failed: %w", err)
	}
	return out, nil
}
