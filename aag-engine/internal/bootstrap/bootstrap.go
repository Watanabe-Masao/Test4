// Package bootstrap implements `aag bootstrap` — single-command session entry
// (= v4.2 cluster C C1 articulate)。
//
// AI session が session 開始時に 1 command で必要な substrate を articulate
// なしに取得できるための aggregate command。多 hop discovery (= where-am-i →
// context → obligation check → ...) を 1 call に articulate。
//
// 設計判断:
//   - 既存 commands の output を aggregate (= read-only composition、新 logic
//     を articulate しない)
//   - active project が articulate されている場合のみ context を articulate
//     (= optional field、不在は null)
//   - obligations / changes は brief snapshot (= 詳細は別 command で)
//   - 全 sub-output は schema-backed (= AI が parse 容易)
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first
//   6. Additive-only (= 既存 command を modify しない、composition のみ)
package bootstrap

import (
	"bytes"
	"encoding/json"
	"fmt"

	"aag-engine/internal/navigation"
	"aag-engine/internal/provenance"
)

// SchemaVersion is the schemaVersion for `aag bootstrap` output.
const SchemaVersion = "aag-bootstrap-v1"

// Output は `aag bootstrap` の output envelope (= AI session 開始時の aggregate snapshot)。
type Output struct {
	SchemaVersion string                       `json:"schemaVersion"`
	WhereAmI      *navigation.WhereAmIOutput   `json:"whereAmI"`
	Context       *navigation.ContextOutput    `json:"context"`
	SuggestedNext []SuggestedCommand           `json:"suggestedNext"`
	Provenance    provenance.Provenance        `json:"provenance"`
}

// SuggestedCommand は AI session が次に articulate する候補 command (= heuristic)。
type SuggestedCommand struct {
	Command   string `json:"command"`
	Rationale string `json:"rationale"`
}

// Input controls Run.
type Input struct {
	RepoRoot string
}

// Run aggregates substrate snapshots for AI session bootstrap。
//
// Errors:
//   - RepoRoot 空 → error
//   - .git 不在 → error (= where-am-i 経由で articulate)
//
// active project が articulate されている (= where-am-i.activeProject != nil) 場合、
// context も articulate する。それ以外では context = nil。
func Run(input Input) (Output, error) {
	if input.RepoRoot == "" {
		return Output{}, fmt.Errorf("Run: RepoRoot must be set")
	}

	whereAmI, err := navigation.WhereAmI(navigation.WhereAmIInput{RepoRoot: input.RepoRoot})
	if err != nil {
		return Output{}, fmt.Errorf("Run: WhereAmI failed: %w", err)
	}

	var ctx *navigation.ContextOutput
	if whereAmI.ActiveProject != nil {
		c, cerr := navigation.Context(navigation.ContextInput{
			RepoRoot:  input.RepoRoot,
			ProjectID: *whereAmI.ActiveProject,
		})
		if cerr == nil {
			ctx = &c
		}
		// context error は articulate しない (= bootstrap は graceful、whereAmI さえ取得できれば成功)
	}

	suggested := suggestNextCommands(whereAmI, ctx)

	return Output{
		SchemaVersion: SchemaVersion,
		WhereAmI:      &whereAmI,
		Context:       ctx,
		SuggestedNext: suggested,
		Provenance: provenance.Compute(
			provenance.Inferred,
			"aggregate of where-am-i + context (if active) + heuristic suggested commands",
		),
	}, nil
}

// suggestNextCommands articulate AI session の next action 候補 (= heuristic)。
//
// 期間 articulate ではなく **state-based articulate** (= openObligations / activeProject
// 等の現在 state から articulate)。confidence: heuristic で articulate (= AI 判断材料、
// 必須 follow ではない)。
func suggestNextCommands(w navigation.WhereAmIOutput, c *navigation.ContextOutput) []SuggestedCommand {
	out := make([]SuggestedCommand, 0, 4)

	if w.OpenObligations > 0 {
		out = append(out, SuggestedCommand{
			Command:   "aag obligation check --base main --head HEAD",
			Rationale: "openObligations が articulate されている (= changed file に対する requiredReads / co-changes 確認)",
		})
	}

	if w.ActiveProject != nil && c != nil && len(c.NextActions) > 0 {
		out = append(out, SuggestedCommand{
			Command:   "aag context --project " + *w.ActiveProject,
			Rationale: "active project の nextActions を articulate (= " + fmt.Sprintf("%d 件", len(c.NextActions)) + ")",
		})
	}

	if w.ActiveProject != nil {
		out = append(out, SuggestedCommand{
			Command:   "aag changed --base main --head HEAD",
			Rationale: "current branch の changed file を articulate",
		})
	}

	if len(out) == 0 {
		out = append(out, SuggestedCommand{
			Command:   "aag list",
			Rationale: "全 command surface を articulate (= AI session の self-discovery 起点)",
		})
	}

	return out
}

// MarshalJSON returns indented JSON without HTML escaping。
func MarshalJSON(out Output) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		return nil, err
	}
	b := buf.Bytes()
	if n := len(b); n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}
	return b, nil
}
