// Package describe implements `aag describe <command>` and `aag list` —
// improvement E (= reposteward-ai-ops-platform、command metadata articulation)。
//
// 全 command の metadata (= maturity / args / output schema / family) を embedded
// table として articulate し、AI session が自己発見 (self-describe) 可能な状態を作る。
//
// 設計判断:
//   - metadata は本 file に embedded (= source-of-truth、JSON file 不要)
//   - maturity は plan.md / decision-audit.md DA-β-001 と整合
//   - 既存 command の output / behaviour は不変 (= additive-only、不可侵原則 6)
//   - reposteward-command-surface.md (= PR B doc) の maturity matrix と同期
//
// 不可侵原則:
//   1. JSON-first
//   2. AI-first (= AI session が自己発見可能)
//   6. Additive-only
package describe

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
)

// CommandMetadata は 1 command の metadata articulation。
type CommandMetadata struct {
	Name        string   `json:"name"`
	Family      string   `json:"family"`
	Maturity    string   `json:"maturity"`
	Summary     string   `json:"summary"`
	Args        []string `json:"args"`
	OutputKind  string   `json:"outputKind"`
	OutputShape string   `json:"outputShape"`
	WaveStep    string   `json:"waveStep,omitempty"`
}

// DescribeSchemaVersion is the schemaVersion for `aag describe` output.
const DescribeSchemaVersion = "aag-describe-v1"

// ListSchemaVersion is the schemaVersion for `aag list` output.
const ListSchemaVersion = "aag-list-v1"

// DescribeOutput is the envelope for `aag describe <command>`。
type DescribeOutput struct {
	SchemaVersion string          `json:"schemaVersion"`
	Command       CommandMetadata `json:"command"`
}

// ListOutput is the envelope for `aag list`。
type ListOutput struct {
	SchemaVersion string            `json:"schemaVersion"`
	Total         int               `json:"total"`
	Commands      []CommandMetadata `json:"commands"`
}

// commandTable は全 command の metadata の embedded source-of-truth。
//
// 追加・削除時は本 table と usage.go / main.go dispatcher を同時に更新する。
var commandTable = []CommandMetadata{
	{
		Name:        "validate",
		Family:      "go-mvp",
		Maturity:    "provisional",
		Summary:     "repo を read-only で検証し DetectorResult[] を出力 (= Phase 1 skeleton)",
		Args:        []string{"--repo PATH", "--format json"},
		OutputKind:  "detector-result-array",
		OutputShape: "DetectorResult[] (= empty in skeleton)",
		WaveStep:    "go-mvp",
	},
	{
		Name:        "fixtures",
		Family:      "go-mvp",
		Maturity:    "stable",
		Summary:     "fixtures/aag/ 配下を discover し catalog を出力",
		Args:        []string{"--repo PATH", "--format json"},
		OutputKind:  "fixture-catalog",
		OutputShape: "{ count: N, fixtures: Fixture[] }",
		WaveStep:    "go-mvp",
	},
	{
		Name:        "shadow",
		Family:      "go-mvp",
		Maturity:    "stable",
		Summary:     "5 detector × 8 fixture を全 dispatch、parity summary を出力",
		Args:        []string{"--repo PATH", "--format json"},
		OutputKind:  "parity-summary",
		OutputShape: "{ totalCases, matched, mismatches[] }",
		WaveStep:    "go-mvp",
	},
	{
		Name:        "task prepare",
		Family:      "task-capsule",
		Maturity:    "stable",
		Summary:     "active project の Task Capsule を JSON で出力",
		Args:        []string{"--repo PATH", "--project ID", "--intent TEXT", "--task ID"},
		OutputKind:  "task-capsule",
		OutputShape: "TaskCapsule (= task-capsule.schema.json)",
		WaveStep:    "Wave 1 #2",
	},
	{
		Name:        "task validate",
		Family:      "task-capsule",
		Maturity:    "stable",
		Summary:     "TaskCapsule を schema 準拠 + value invariant で検証",
		Args:        []string{"--capsule FILE | -"},
		OutputKind:  "validate-result",
		OutputShape: "{ valid, errors[], capsule }",
		WaveStep:    "Wave 5 #22",
	},
	{
		Name:        "task close",
		Family:      "task-capsule",
		Maturity:    "stable",
		Summary:     "TaskCapsule を close 可能か articulate",
		Args:        []string{"--capsule FILE | -"},
		OutputKind:  "close-result",
		OutputShape: "{ closeable, blockers[], capsule }",
		WaveStep:    "Wave 5 #22",
	},
	{
		Name:        "stats files",
		Family:      "stats",
		Maturity:    "stable",
		Summary:     "effectiveCodeLines を bucket / range / layer / percentile で query",
		Args:        []string{"--repo PATH", "--metric NAME", "--range N..M", "--bucket ID", "--layer NAME", "--above PNN", "--limit N"},
		OutputKind:  "stats-files",
		OutputShape: "{ matched, files[] }",
		WaveStep:    "Wave 1 #6",
	},
	{
		Name:        "where-am-i",
		Family:      "navigation",
		Maturity:    "stable",
		Summary:     "branch / activeProject / repoHealth / openObligations / 推奨 next command",
		Args:        []string{"--repo PATH"},
		OutputKind:  "where-am-i",
		OutputShape: "{ branch, activeProject, repoHealth, openObligations[], suggestedNext[] }",
		WaveStep:    "Wave 3 #10",
	},
	{
		Name:        "context",
		Family:      "navigation",
		Maturity:    "stable",
		Summary:     "active project の requiredReads / constraints / nextActions",
		Args:        []string{"--repo PATH"},
		OutputKind:  "context",
		OutputShape: "{ projectId, requiredReads[], constraints[], nextActions[] }",
		WaveStep:    "Wave 3 #11",
	},
	{
		Name:        "changed",
		Family:      "navigation",
		Maturity:    "stable",
		Summary:     "--base..--head の changed file を area / obligations / requiredReads で articulate",
		Args:        []string{"--repo PATH", "--base REV", "--head REV"},
		OutputKind:  "changed",
		OutputShape: "{ files[], areas[], obligations[], requiredReads[] }",
		WaveStep:    "Wave 3 #12",
	},
	{
		Name:        "rule locate",
		Family:      "navigation",
		Maturity:    "stable",
		Summary:     "ruleId から rule の definition / guards / docs / thresholds を JSON で出力",
		Args:        []string{"--repo PATH", "<ruleId>"},
		OutputKind:  "rule-locate",
		OutputShape: "{ ruleId, definition, guards[], docs[], thresholds }",
		WaveStep:    "Wave 3 #13",
	},
	{
		Name:        "detector refs",
		Family:      "navigation",
		Maturity:    "stable",
		Summary:     "detectorId から goImplementation / tsImplementation / schema / fixtures を JSON で出力",
		Args:        []string{"--repo PATH", "<detectorId>"},
		OutputKind:  "detector-refs",
		OutputShape: "{ detectorId, goImplementation, tsImplementation, schema, fixtures[] }",
		WaveStep:    "Wave 3 #14",
	},
	{
		Name:        "clean check",
		Family:      "cleanliness",
		Maturity:    "stable",
		Summary:     "generated 混入 / archive manifest 不在 / projectId 重複 等の cleanliness 違反",
		Args:        []string{"--repo PATH"},
		OutputKind:  "cleanliness-report",
		OutputShape: "{ violations[], summary }",
		WaveStep:    "Wave 4 #15",
	},
	{
		Name:        "comments list",
		Family:      "cleanliness",
		Maturity:    "stable",
		Summary:     "--kind todo|suppression|expired のコメントを repo 全体から scan",
		Args:        []string{"--repo PATH", "--kind KIND"},
		OutputKind:  "comments-list",
		OutputShape: "{ kind, count, comments[] }",
		WaveStep:    "Wave 4 #16",
	},
	{
		Name:        "docs placement-check",
		Family:      "cleanliness",
		Maturity:    "stable",
		Summary:     "schema / generated artifact の配置規約違反",
		Args:        []string{"--repo PATH"},
		OutputKind:  "placement-report",
		OutputShape: "{ violations[], summary }",
		WaveStep:    "Wave 4 #17",
	},
	{
		Name:        "obligation check",
		Family:      "obligation",
		Maturity:    "stable",
		Summary:     "premise contract triggers を git diff で検出し requirements を JSON で出力",
		Args:        []string{"--repo PATH", "--base REV", "--head REV"},
		OutputKind:  "obligation-check",
		OutputShape: "{ triggered[], requiredReads[], requiredCoChanges[] }",
		WaveStep:    "Wave 5 #20",
	},
	{
		Name:        "repair-context",
		Family:      "repair",
		Maturity:    "stable",
		Summary:     "--from <file> の検出結果から repairReads / suggestedActions / requiredChecks",
		Args:        []string{"--from FILE | -"},
		OutputKind:  "repair-context",
		OutputShape: "{ inputKind, repairReads[], suggestedActions[], requiredChecks[] }",
		WaveStep:    "Wave 5 #21",
	},
	{
		Name:        "project stale",
		Family:      "project-status",
		Maturity:    "stable",
		Summary:     "active project の最終 commit から stale (= 30 日以上 commit なし) 状態",
		Args:        []string{"--repo PATH"},
		OutputKind:  "project-stale",
		OutputShape: "{ projectId, lastCommitAt, daysSince, stale }",
		WaveStep:    "Wave 5 #23",
	},
	{
		Name:        "next",
		Family:      "project-status",
		Maturity:    "stable",
		Summary:     "AI session の next action recommendation",
		Args:        []string{"--repo PATH"},
		OutputKind:  "next-action",
		OutputShape: "{ recommendation, reasons[], suggestedCommands[] }",
		WaveStep:    "Wave 5 #23",
	},
	{
		Name:        "wrap",
		Family:      "envelope",
		Maturity:    "provisional",
		Summary:     "stdin の JSON を AagResponse-v2 envelope で wrap",
		Args:        []string{"--command NAME"},
		OutputKind:  "wrapped-response",
		OutputShape: "{ schemaVersion, command, source, timestamp, summary?, data }",
		WaveStep:    "improvement A",
	},
	{
		Name:        "describe",
		Family:      "self-describe",
		Maturity:    "provisional",
		Summary:     "指定 command の metadata (= maturity / args / output schema) を JSON で articulate",
		Args:        []string{"<command>"},
		OutputKind:  "describe",
		OutputShape: "{ schemaVersion, command: CommandMetadata }",
		WaveStep:    "improvement E",
	},
	{
		Name:        "list",
		Family:      "self-describe",
		Maturity:    "provisional",
		Summary:     "全 command 一覧 + maturity を JSON で articulate",
		Args:        []string{},
		OutputKind:  "list",
		OutputShape: "{ schemaVersion, total, commands: CommandMetadata[] }",
		WaveStep:    "improvement E",
	},
}

// Describe は command 名から metadata を lookup する。
//
// command 名は full name (= 'task prepare' / 'rule locate' / 'detector refs' /
// 'docs placement-check' / 'comments list' / 'clean check' / 'project stale' /
// 'stats files' / 'task validate' / 'task close') または single-word name を accept。
//
// Errors:
//   - command が空 → error
//   - command が table に見つからない → error
func Describe(command string) (DescribeOutput, error) {
	if command == "" {
		return DescribeOutput{}, fmt.Errorf("Describe: command must be non-empty")
	}
	for _, m := range commandTable {
		if m.Name == command {
			return DescribeOutput{
				SchemaVersion: DescribeSchemaVersion,
				Command:       m,
			}, nil
		}
	}
	return DescribeOutput{}, fmt.Errorf("Describe: unknown command %q (= 'aag list' で全 command を articulate)", command)
}

// List は全 command の metadata を name 順で articulate する。
func List() ListOutput {
	out := make([]CommandMetadata, len(commandTable))
	copy(out, commandTable)
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return ListOutput{
		SchemaVersion: ListSchemaVersion,
		Total:         len(out),
		Commands:      out,
	}
}

// MarshalJSON returns indented JSON without HTML escaping (= AI consumer 読了性、
// `&` / `<` / `>` literal articulate)。
func MarshalJSON(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	b := buf.Bytes()
	if n := len(b); n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}
	return b, nil
}
