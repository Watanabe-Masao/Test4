// Package repaircontext implements `aag repair-context --from <file>` —
// Wave 5 #21 (= reposteward-ai-ops-platform、修復 context generator)。
//
// detector-results / obligation-check / clean-check / docs-placement-check 等の
// 検出 output JSON を read-only に消費し、AI session が修復に必要な
// repairReads (= 読むべき正本) + suggestedActions (= 取るべき action) +
// requiredChecks (= 検証 command) を JSON で articulate する。
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first (= 入力 JSON + rule registry を read-only に消費)
//   5. DetectorResult-first (= 既存 DetectorResult contract を主入力として articulate)
package repaircontext

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
)

// RepairOutput is the JSON shape emitted by `aag repair-context`.
type RepairOutput struct {
	SchemaVersion    string   `json:"schemaVersion"`
	InputFile        string   `json:"inputFile"`
	InputKind        string   `json:"inputKind"`
	ViolationCount   int      `json:"violationCount"`
	RepairReads      []string `json:"repairReads"`
	SuggestedActions []string `json:"suggestedActions"`
	RequiredChecks   []string `json:"requiredChecks"`
	Summary          string   `json:"summary"`
}

// RepairSchemaVersion is the const articulated in RepairOutput.
const RepairSchemaVersion = "repair-context-v1"

// RepairInput controls Repair.
type RepairInput struct {
	RepoRoot string
	From     string // path to detector-results / obligation / clean / placement JSON
}

// Repair reads the input JSON, classifies its kind, and articulates
// repairReads + suggestedActions + requiredChecks based on the kind.
//
// Input source:
//   - --from <file>: regular file path
//   - --from -     : stdin (= for `aag changed --explain | aag repair-context --from -` pipeline、improvement D)
//
// Supported input kinds (= autodetected from schemaVersion or shape):
//   - detector-results (= DetectorResult[] or { detectorResults: [...] })
//   - obligation-check-v1 (= Wave 5 #20 output)
//   - clean-check-v1 (= Wave 4 #15 output)
//   - docs-placement-check-v1 (= Wave 4 #17 output)
func Repair(input RepairInput) (RepairOutput, error) {
	if input.RepoRoot == "" {
		return RepairOutput{}, fmt.Errorf("Repair: RepoRoot must be set")
	}
	if input.From == "" {
		return RepairOutput{}, fmt.Errorf("Repair: --from must be set (= file path or '-' for stdin)")
	}

	raw, err := readFromInput(input.From)
	if err != nil {
		return RepairOutput{}, err
	}

	kind, count, reads, actions, checks := classify(raw, input.RepoRoot)

	return RepairOutput{
		SchemaVersion:    RepairSchemaVersion,
		InputFile:        input.From,
		InputKind:        kind,
		ViolationCount:   count,
		RepairReads:      dedup(reads),
		SuggestedActions: dedup(actions),
		RequiredChecks:   dedup(checks),
		Summary:          fmt.Sprintf("Input kind=%s with %d violation(s). %d read(s) / %d action(s) / %d check(s) articulated.", kind, count, len(dedup(reads)), len(dedup(actions)), len(dedup(checks))),
	}, nil
}

// readFromInput reads --from input. "-" means stdin (= improvement D)、それ以外は
// file path として articulate。stdin reading は AI session の pipeline articulation
// (= 例: aag changed --explain | aag repair-context --from -) を可能にする。
func readFromInput(from string) ([]byte, error) {
	if from == "-" {
		raw, err := io.ReadAll(os.Stdin)
		if err != nil {
			return nil, fmt.Errorf("Repair: failed to read stdin: %w", err)
		}
		if len(raw) == 0 {
			return nil, fmt.Errorf("Repair: stdin was empty (= --from - 指定だが pipe / redirect で入力が articulate されていない)")
		}
		return raw, nil
	}
	raw, err := os.ReadFile(from)
	if err != nil {
		return nil, fmt.Errorf("Repair: failed to read %s: %w", from, err)
	}
	return raw, nil
}

// classify routes the raw JSON to the appropriate articulation logic.
func classify(raw []byte, repoRoot string) (kind string, count int, reads, actions, checks []string) {
	// Try schemaVersion-based dispatch first
	var probe struct {
		SchemaVersion string `json:"schemaVersion"`
	}
	_ = json.Unmarshal(raw, &probe)

	switch probe.SchemaVersion {
	case "obligation-check-v1":
		return classifyObligationCheck(raw, repoRoot)
	case "clean-check-v1":
		return classifyCleanCheck(raw, repoRoot)
	case "docs-placement-check-v1":
		return classifyPlacementCheck(raw, repoRoot)
	}

	// Fallback: try DetectorResult shape
	if dr, ok := tryDetectorResults(raw); ok {
		return classifyDetectorResults(dr, repoRoot)
	}

	return "unknown", 0, nil, []string{
		fmt.Sprintf("Input file %s is unrecognized. Supported: detector-results / obligation-check-v1 / clean-check-v1 / docs-placement-check-v1.", "(input)"),
	}, nil
}

// ───────────────────────────────────────────────────────────────────────
// detector-results (= aag-engine validate / shadow output)
// ───────────────────────────────────────────────────────────────────────

type detectorResult struct {
	RuleId        string  `json:"ruleId"`
	DetectionType string  `json:"detectionType"`
	SourceFile    string  `json:"sourceFile"`
	Severity      string  `json:"severity"`
	Evidence      *string `json:"evidence,omitempty"`
	MessageSeed   *string `json:"messageSeed,omitempty"`
}

func tryDetectorResults(raw []byte) ([]detectorResult, bool) {
	// Try array form
	var arr []detectorResult
	if err := json.Unmarshal(raw, &arr); err == nil && len(arr) > 0 && arr[0].RuleId != "" {
		return arr, true
	}
	// Try wrapped form
	var wrapped struct {
		DetectorResults []detectorResult `json:"detectorResults"`
	}
	if err := json.Unmarshal(raw, &wrapped); err == nil && len(wrapped.DetectorResults) > 0 {
		return wrapped.DetectorResults, true
	}
	return nil, false
}

func classifyDetectorResults(results []detectorResult, repoRoot string) (string, int, []string, []string, []string) {
	reads := []string{}
	actions := []string{}
	// Repo-relative command (= 環境依存 hardcoded path 回避、any clone location で機能)
	checks := []string{"cd aag-engine && go test ./... # rerun engine after fix"}

	rulesById := loadRulesById(repoRoot)

	for _, r := range results {
		// Read the rule's canonical doc + base-rules.ts
		if rule, ok := rulesById[r.RuleId]; ok && rule.Doc != "" {
			reads = append(reads, rule.Doc)
		}
		reads = append(reads, "app-domain/gross-profit/rule-catalog/base-rules.ts")
		// Read the offending source file
		if r.SourceFile != "" {
			reads = append(reads, r.SourceFile)
		}
		// Articulate action
		actions = append(actions,
			fmt.Sprintf("Inspect rule %s in app-domain/gross-profit/rule-catalog/base-rules.ts. Fix the violation in %s.", r.RuleId, r.SourceFile))
		if r.MessageSeed != nil && *r.MessageSeed != "" {
			actions = append(actions, fmt.Sprintf("Address messageSeed: %s", *r.MessageSeed))
		}
	}

	return "detector-results", len(results), reads, actions, checks
}

// ───────────────────────────────────────────────────────────────────────
// obligation-check
// ───────────────────────────────────────────────────────────────────────

func classifyObligationCheck(raw []byte, _ string) (string, int, []string, []string, []string) {
	var data struct {
		MatchedContracts []struct {
			ContractId   string `json:"contractId"`
			Label        string `json:"label"`
			Requirements []struct {
				Path      string `json:"path"`
				Mode      string `json:"mode"`
				Rationale string `json:"rationale"`
			} `json:"requirements"`
		} `json:"matchedContracts"`
	}
	_ = json.Unmarshal(raw, &data)

	reads := []string{"aag/parameters/premise-contracts.json"}
	actions := []string{}
	checks := []string{}

	for _, c := range data.MatchedContracts {
		actions = append(actions, fmt.Sprintf("Address contract %s: %s", c.ContractId, c.Label))
		for _, req := range c.Requirements {
			reads = append(reads, req.Path)
			switch req.Mode {
			case "must-pass":
				checks = append(checks, fmt.Sprintf("Re-run the test/guard at %s and ensure PASS", req.Path))
			case "review":
				actions = append(actions, fmt.Sprintf("Review %s for impact (= rationale: %s)", req.Path, req.Rationale))
			case "co-update":
				actions = append(actions, fmt.Sprintf("Co-update %s in the same PR (= rationale: %s)", req.Path, req.Rationale))
			}
		}
	}

	return "obligation-check-v1", len(data.MatchedContracts), reads, actions, checks
}

// ───────────────────────────────────────────────────────────────────────
// clean-check
// ───────────────────────────────────────────────────────────────────────

func classifyCleanCheck(raw []byte, _ string) (string, int, []string, []string, []string) {
	var data struct {
		Violations []struct {
			Kind   string `json:"kind"`
			Path   string `json:"path"`
			Reason string `json:"reason"`
			Action string `json:"action"`
		} `json:"violations"`
	}
	_ = json.Unmarshal(raw, &data)

	reads := []string{
		"references/05-aag-interface/operations/project-checklist-governance.md",
		"docs/contracts/project-archive.schema.json",
	}
	actions := []string{}
	checks := []string{"aag clean check  # rerun after fix to verify 0 violations"}

	for _, v := range data.Violations {
		reads = append(reads, v.Path)
		actions = append(actions, fmt.Sprintf("[%s] %s — %s", v.Kind, v.Path, v.Action))
	}

	return "clean-check-v1", len(data.Violations), reads, actions, checks
}

// ───────────────────────────────────────────────────────────────────────
// docs-placement-check
// ───────────────────────────────────────────────────────────────────────

func classifyPlacementCheck(raw []byte, _ string) (string, int, []string, []string, []string) {
	var data struct {
		Violations []struct {
			Path   string `json:"path"`
			Kind   string `json:"kind"`
			Reason string `json:"reason"`
			Action string `json:"action"`
		} `json:"violations"`
	}
	_ = json.Unmarshal(raw, &data)

	reads := []string{
		"references/03-implementation/detection-inventory-v2.md",
	}
	actions := []string{}
	checks := []string{"aag docs placement-check  # rerun after fix"}

	for _, v := range data.Violations {
		reads = append(reads, v.Path)
		actions = append(actions, fmt.Sprintf("[%s] %s — %s", v.Kind, v.Path, v.Action))
	}

	return "docs-placement-check-v1", len(data.Violations), reads, actions, checks
}

// ───────────────────────────────────────────────────────────────────────
// rule registry helpers
// ───────────────────────────────────────────────────────────────────────

type registryRule struct {
	Id  string `json:"id"`
	Doc string `json:"doc"`
}

func loadRulesById(repoRoot string) map[string]registryRule {
	out := map[string]registryRule{}
	path := filepath.Join(repoRoot, "docs", "generated", "aag", "merged-architecture-rules.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return out
	}
	var top struct {
		Rules []registryRule `json:"rules"`
	}
	if err := json.Unmarshal(raw, &top); err != nil {
		return out
	}
	for _, r := range top.Rules {
		out[r.Id] = r
	}
	return out
}

// ───────────────────────────────────────────────────────────────────────
// helpers
// ───────────────────────────────────────────────────────────────────────

func dedup(items []string) []string {
	if items == nil {
		return []string{}
	}
	seen := map[string]bool{}
	out := []string{}
	for _, s := range items {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	sort.Strings(out)
	return out
}

// IsKnownInputKind articulates whether the given schemaVersion is supported.
func IsKnownInputKind(schemaVersion string) bool {
	switch schemaVersion {
	case "obligation-check-v1", "clean-check-v1", "docs-placement-check-v1":
		return true
	}
	return false
}

// SupportedInputKinds returns the supported input kinds in human-readable form.
func SupportedInputKinds() []string {
	return []string{
		"detector-results (= DetectorResult[] or { detectorResults: [...] })",
		"obligation-check-v1",
		"clean-check-v1",
		"docs-placement-check-v1",
	}
}

// MarshalJSON-style helper provided by navigation package; the CLI caller uses
// navigation.MarshalJSON to articulate the output JSON.
