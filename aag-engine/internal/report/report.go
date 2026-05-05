// Package report holds engine run-result rendering for AAG Engine.
//
// Phase 1 (= Go CLI Skeleton) で skeleton landing。
// Phase 2 (= DetectorResult Contract Binding) で contract.DetectorResult に migrate。
//
// Phase 3 以降:
//   - shadow mode parity report の generation (= Phase 9)
//   - markdown view rendering (= Phase 10 以降、TS renderer と並列)
//
// 不可侵原則:
//   - 本 package は **生成 (= 書き込み)** を行わない (= MVP は validator のみ、
//     不可侵原則 1 strict adherence)。出力 (= stdout / stderr) は呼び出し側責務。
//   - JSON output は schemaVersion + status + repo + detectorResults + (optional) note
//     の 5 field。schemaVersion = "aag-engine-run-result-v1" (= 本 MVP 期間中固定)。
//   - DetectorResult は contract package の canonical struct を参照 (= source of truth は
//     docs/contracts/aag/detector-result.schema.json、不可侵原則 9 整合)。
package report

import (
	"encoding/json"
	"fmt"

	"aag-engine/internal/contract"
)

// RunResultSchemaVersion は本 MVP 期間中の固定 version。
const RunResultSchemaVersion = "aag-engine-run-result-v1"

// RunResult は AAG Engine の run-result top-level shape。
//
// Phase 2 から DetectorResults は contract.DetectorResult slice (= canonical schema 整合)。
// Phase 3 から FixtureSummary を optional articulate (= `aag fixtures` で使用、他 subcommand
// では nil → JSON omitempty)。
type RunResult struct {
	// SchemaVersion は run-result schema の version (= "aag-engine-run-result-v1" 固定)。
	SchemaVersion string `json:"schemaVersion"`

	// Status は engine 実行結果。"pass" = violation 0 件、"fail" = violation ≥ 1 件。
	Status string `json:"status"`

	// Repo は検証対象 repo root の path (= --repo flag からの値)。
	Repo string `json:"repo"`

	// DetectorResults は各 detector が emit した violation 集合。
	// canonical schema = docs/contracts/aag/detector-result.schema.json。
	DetectorResults []contract.DetectorResult `json:"detectorResults"`

	// FixtureSummary は `aag fixtures` subcommand 時のみ articulate (= optional、Phase 3 で追加)。
	// 他 subcommand では nil → JSON output で field 不在 (omitempty)。
	FixtureSummary *FixtureSummary `json:"fixtureSummary,omitempty"`

	// ShadowSummaryRaw は `aag shadow` subcommand 時のみ articulate (= optional、Phase 9 で追加)。
	// raw JSON で持つことで shadow package との循環依存を回避 (= report が shadow を import せず、
	// CLI 側で shadow.Summary を marshal して RunResult に embed)。
	ShadowSummaryRaw json.RawMessage `json:"shadowSummary,omitempty"`

	// Note は engine 実装段階の articulate (= optional、Phase 1-3 skeleton で活用)。
	Note string `json:"note,omitempty"`
}

// FixtureSummary は `aag fixtures` の出力 (= fixtures/aag/ 配下 catalog)。
type FixtureSummary struct {
	// Total は discover された fixture 件数 (= readiness refactor Phase 5 deliverable で 8 件想定)。
	Total int `json:"total"`

	// Fixtures は per-fixture catalog entry。
	Fixtures []FixtureSummaryEntry `json:"fixtures"`
}

// FixtureSummaryEntry は単一 fixture の summary。
type FixtureSummaryEntry struct {
	// Name は fixture identifier (= "archive-v2/pass-minimal" 等、POSIX separator)。
	Name string `json:"name"`

	// ExpectedCount は expected.json 内の DetectorResult 件数。
	ExpectedCount int `json:"expectedCount"`
}

// NewEmptyRunResult は空 DetectorResult[] の RunResult を生成 (= Phase 1 skeleton 経路)。
func NewEmptyRunResult(repo string) RunResult {
	return RunResult{
		SchemaVersion:   RunResultSchemaVersion,
		Status:          "pass",
		Repo:            repo,
		DetectorResults: []contract.DetectorResult{},
	}
}

// DeriveStatus は DetectorResults の状態から status を articulate。
//
//   - violation 0 件               → "pass"
//   - gate / block-merge ≥ 1 件   → "fail"
//   - warn のみ                     → "pass" (= advisory、CI hard fail 引き起こさない)
func DeriveStatus(results []contract.DetectorResult) string {
	for _, r := range results {
		if r.Severity == contract.SeverityGate || r.Severity == contract.SeverityBlockMerge {
			return "fail"
		}
	}
	return "pass"
}

// RenderJSON は RunResult を indent=2 の JSON bytes に変換。
//
// 出力形式は TS 側 renderDetectorResultsAsJson() (= Phase 9 shadow mode で
// parity 比較対象) と互換。
func RenderJSON(r RunResult) ([]byte, error) {
	out, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("RenderJSON: marshal failed: %w", err)
	}
	return out, nil
}
