// Package chaos implements `aag chaos` — adversarial substrate seed (= v4.2、A3 failure
// modes 上に build)。
//
// AI session が command 実行前に boundary を articulate なしに understand できるよう、
// 既知 failure modes (= describe.commandTable.KnownFailureModes) を adversarial 視点で
// articulate する CLI command。
//
// Usage:
//   aag chaos                # overview: 全 command の failure mode coverage articulate
//   aag chaos <command>      # per-command: 該当 command の failure modes 詳細 articulate
//
// 設計判断:
//   - 本 command は **listing version** (= seed)。実行 (= adversarial input 走らせて
//     verify) は 'aag chaos run <command>' として future PR で articulate 候補。
//   - failure modes の primary articulate source は describe.commandTable (= 既存)、
//     本 package は別 schema で同 data を adversarial 視点で project する
//   - countermeasureTest 不在 entry を articulate して "untested boundary" を
//     surface (= adversarial substrate axis 整合)
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first
//   6. Additive-only (= 既存 describe を modify しない、別 view articulate)
package chaos

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"
	"sort"
	"strings"

	"aag-engine/internal/describe"
	"aag-engine/internal/provenance"
)

// OverviewSchemaVersion is the schemaVersion for `aag chaos` overview output.
const OverviewSchemaVersion = "aag-chaos-overview-v1"

// PerCommandSchemaVersion is the schemaVersion for `aag chaos <command>` output.
const PerCommandSchemaVersion = "aag-chaos-command-v1"

// RunSchemaVersion is the schemaVersion for `aag chaos run <command>` output (= execution version)。
const RunSchemaVersion = "aag-chaos-run-v1"

// OverviewOutput は `aag chaos` (= no args) の output envelope。
//
// 全 command の adversarial coverage を articulate (= 何 commands が failure modes
// articulate されているか、何 entries が countermeasureTest 持つか)。
type OverviewOutput struct {
	SchemaVersion           string                `json:"schemaVersion"`
	TotalCommands           int                   `json:"totalCommands"`
	CommandsWithFailureModes int                  `json:"commandsWithFailureModes"`
	TotalFailureModes       int                   `json:"totalFailureModes"`
	WithCountermeasureCount int                   `json:"withCountermeasureCount"`
	UntestedCount           int                   `json:"untestedCount"`
	ByCommand               []CommandSummary      `json:"byCommand"`
	Provenance              provenance.Provenance `json:"provenance"`
}

// CommandSummary は overview 内 1 command の articulate。
type CommandSummary struct {
	Command            string `json:"command"`
	TotalFailureModes  int    `json:"totalFailureModes"`
	WithCountermeasure int    `json:"withCountermeasure"`
}

// PerCommandOutput は `aag chaos <command>` の output envelope。
//
// 該当 command の failure modes 詳細を adversarial 視点で articulate。
type PerCommandOutput struct {
	SchemaVersion           string                `json:"schemaVersion"`
	Command                 string                `json:"command"`
	TotalFailureModes       int                   `json:"totalFailureModes"`
	WithCountermeasureCount int                   `json:"withCountermeasureCount"`
	UntestedCount           int                   `json:"untestedCount"`
	Scenarios               []Scenario            `json:"scenarios"`
	Summary                 string                `json:"summary"`
	Provenance              provenance.Provenance `json:"provenance"`
}

// Scenario は 1 failure mode の adversarial 視点 articulate。
type Scenario struct {
	Trigger            string `json:"trigger"`
	Behavior           string `json:"behavior"`
	CountermeasureTest string `json:"countermeasureTest,omitempty"`
	HasCountermeasure  bool   `json:"hasCountermeasure"`
}

// Overview returns an articulate of failure mode coverage across all commands。
func Overview() OverviewOutput {
	all := describe.List()

	var byCommand []CommandSummary
	totalFailureModes := 0
	commandsWithFailureModes := 0
	withCountermeasure := 0

	for _, cmd := range all.Commands {
		if len(cmd.KnownFailureModes) == 0 {
			continue
		}
		commandsWithFailureModes++
		summary := CommandSummary{
			Command:           cmd.Name,
			TotalFailureModes: len(cmd.KnownFailureModes),
		}
		for _, fm := range cmd.KnownFailureModes {
			totalFailureModes++
			if fm.CountermeasureTest != "" {
				withCountermeasure++
				summary.WithCountermeasure++
			}
		}
		byCommand = append(byCommand, summary)
	}
	sort.Slice(byCommand, func(i, j int) bool { return byCommand[i].Command < byCommand[j].Command })

	return OverviewOutput{
		SchemaVersion:           OverviewSchemaVersion,
		TotalCommands:           all.Total,
		CommandsWithFailureModes: commandsWithFailureModes,
		TotalFailureModes:       totalFailureModes,
		WithCountermeasureCount: withCountermeasure,
		UntestedCount:           totalFailureModes - withCountermeasure,
		ByCommand:               byCommand,
		Provenance: provenance.Compute(
			provenance.Canonical,
			"projection of describe.commandTable.KnownFailureModes",
		),
	}
}

// PerCommand returns adversarial articulate for a specific command。
//
// command 名は describe.Describe() で resolve (= multi-word command も accept)。
//
// Errors:
//   - command 空 → error
//   - command が commandTable に articulate されていない → error
func PerCommand(command string) (PerCommandOutput, error) {
	if command == "" {
		return PerCommandOutput{}, fmt.Errorf("PerCommand: command must be non-empty")
	}
	desc, err := describe.Describe(command)
	if err != nil {
		return PerCommandOutput{}, fmt.Errorf("PerCommand: %w", err)
	}

	scenarios := make([]Scenario, 0, len(desc.Command.KnownFailureModes))
	withCountermeasure := 0
	for _, fm := range desc.Command.KnownFailureModes {
		s := Scenario{
			Trigger:            fm.Trigger,
			Behavior:           fm.Behavior,
			CountermeasureTest: fm.CountermeasureTest,
			HasCountermeasure:  fm.CountermeasureTest != "",
		}
		if s.HasCountermeasure {
			withCountermeasure++
		}
		scenarios = append(scenarios, s)
	}

	total := len(scenarios)
	summary := fmt.Sprintf("%d failure modes articulated, %d with countermeasure test, %d untested", total, withCountermeasure, total-withCountermeasure)
	if total == 0 {
		summary = "no failure modes articulated for this command (= demand-driven articulate 候補)"
	}

	return PerCommandOutput{
		SchemaVersion:           PerCommandSchemaVersion,
		Command:                 command,
		TotalFailureModes:       total,
		WithCountermeasureCount: withCountermeasure,
		UntestedCount:           total - withCountermeasure,
		Scenarios:               scenarios,
		Summary:                 summary,
		Provenance: provenance.Compute(
			provenance.Canonical,
			"projection of describe.commandTable.KnownFailureModes for "+command,
		),
	}, nil
}

// RunOutput は `aag chaos run <command>` の output envelope。
//
// 各 reproducible failure mode を実機械実行 (= subprocess spawn) し、
// actual exit code / stderr が expected behavior と整合するかを machine-verify。
//
// "あえて壊して証明する" の物理 articulate (= adversarial substrate execution version)。
type RunOutput struct {
	SchemaVersion          string                `json:"schemaVersion"`
	Command                string                `json:"command"`
	BinaryPath             string                `json:"binaryPath"`
	TotalReproducible      int                   `json:"totalReproducible"`
	MatchedCount           int                   `json:"matchedCount"`
	MismatchedCount        int                   `json:"mismatchedCount"`
	SkippedCount           int                   `json:"skippedCount"`
	Healthy                bool                  `json:"healthy"`
	Results                []RunResult           `json:"results"`
	Summary                string                `json:"summary"`
	Provenance             provenance.Provenance `json:"provenance"`
}

// RunResult は 1 reproduction の実行結果 articulate。
type RunResult struct {
	Trigger          string   `json:"trigger"`
	ExpectedExitCode int      `json:"expectedExitCode"`
	ActualExitCode   int      `json:"actualExitCode"`
	ExitCodeMatched  bool     `json:"exitCodeMatched"`
	StderrSnippet    string   `json:"stderrSnippet,omitempty"`
	StderrContains   []string `json:"expectedStderrContains,omitempty"`
	StderrMatched    bool     `json:"stderrMatched"`
	Matched          bool     `json:"matched"`
	Status           string   `json:"status"` // "matched" | "mismatched" | "skipped"
	Note             string   `json:"note,omitempty"`
}

// RunAdversarial executes all reproducible failure modes for a command and verifies them。
//
// binaryPath: aag binary の絶対 path (= os.Executable() で resolve、または test で build した path)。
// command: target command 名 (= describe.Describe() で resolve)。
//
// 各 FailureMode で Reproduction が articulate されている entry のみ実行。
// 実 exit code + stderr を expected と比較、結果を Articulate。
//
// Errors:
//   - binaryPath 空 → error
//   - command 空 → error
//   - command が commandTable に articulate されていない → error
func RunAdversarial(binaryPath, command string) (RunOutput, error) {
	if binaryPath == "" {
		return RunOutput{}, fmt.Errorf("RunAdversarial: binaryPath must be non-empty")
	}
	if command == "" {
		return RunOutput{}, fmt.Errorf("RunAdversarial: command must be non-empty")
	}
	desc, err := describe.Describe(command)
	if err != nil {
		return RunOutput{}, fmt.Errorf("RunAdversarial: %w", err)
	}

	results := make([]RunResult, 0, len(desc.Command.KnownFailureModes))
	matched, mismatched, skipped := 0, 0, 0

	for _, fm := range desc.Command.KnownFailureModes {
		if fm.Reproduction == nil {
			results = append(results, RunResult{
				Trigger: fm.Trigger,
				Status:  "skipped",
				Note:    "Reproduction recipe が articulate されていない",
			})
			skipped++
			continue
		}
		r := executeReproduction(binaryPath, fm)
		results = append(results, r)
		if r.Matched {
			matched++
		} else {
			mismatched++
		}
	}

	total := len(results) - skipped
	healthy := mismatched == 0 && total > 0
	if total == 0 {
		healthy = false // 実行可能 reproduction 0 件 = 検証失敗
	}

	summary := fmt.Sprintf("%d reproductions executed, %d matched, %d mismatched, %d skipped (= no recipe)",
		total, matched, mismatched, skipped)

	return RunOutput{
		SchemaVersion:     RunSchemaVersion,
		Command:           command,
		BinaryPath:        binaryPath,
		TotalReproducible: total,
		MatchedCount:      matched,
		MismatchedCount:   mismatched,
		SkippedCount:      skipped,
		Healthy:           healthy,
		Results:           results,
		Summary:           summary,
		Provenance: provenance.Compute(
			provenance.Observed,
			"actual subprocess execution + expected behavior comparison",
		),
	}, nil
}

// executeReproduction runs a single reproduction recipe and articulate the result。
func executeReproduction(binaryPath string, fm describe.FailureMode) RunResult {
	rep := fm.Reproduction
	cmd := exec.Command(binaryPath, rep.Args...)
	// 常に explicit stdin を articulate (= empty stdin も deterministic に articulate される)
	cmd.Stdin = strings.NewReader(rep.Stdin)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			exitCode = ee.ExitCode()
		} else {
			// non-exit error (= binary 不在等)
			return RunResult{
				Trigger:          fm.Trigger,
				ExpectedExitCode: rep.ExpectedExitCode,
				ActualExitCode:   -1,
				Status:           "mismatched",
				Note:             "subprocess spawn failed: " + err.Error(),
			}
		}
	}

	exitMatched := exitCode == rep.ExpectedExitCode
	stderrSnippet := stderr.String()
	if len(stderrSnippet) > 200 {
		stderrSnippet = stderrSnippet[:200] + "..."
	}
	stderrMatched := true
	for _, want := range rep.ExpectedStderrContains {
		if !strings.Contains(stderr.String(), want) {
			stderrMatched = false
			break
		}
	}

	overall := exitMatched && stderrMatched
	status := "matched"
	if !overall {
		status = "mismatched"
	}
	return RunResult{
		Trigger:          fm.Trigger,
		ExpectedExitCode: rep.ExpectedExitCode,
		ActualExitCode:   exitCode,
		ExitCodeMatched:  exitMatched,
		StderrSnippet:    stderrSnippet,
		StderrContains:   rep.ExpectedStderrContains,
		StderrMatched:    stderrMatched,
		Matched:          overall,
		Status:           status,
	}
}

// MarshalJSON returns indented JSON without HTML escaping。
func MarshalJSON(out any) ([]byte, error) {
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
