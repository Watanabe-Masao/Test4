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
	"sort"

	"aag-engine/internal/describe"
	"aag-engine/internal/provenance"
)

// OverviewSchemaVersion is the schemaVersion for `aag chaos` overview output.
const OverviewSchemaVersion = "aag-chaos-overview-v1"

// PerCommandSchemaVersion is the schemaVersion for `aag chaos <command>` output.
const PerCommandSchemaVersion = "aag-chaos-command-v1"

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
