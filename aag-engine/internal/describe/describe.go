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

	"aag-engine/internal/provenance"
)

// CommandMetadata は 1 command の metadata articulation。
//
// v4.2 seed (= reposteward-substrate-v4-2-seed) で 3 field を additive 追加:
//   - WhyExists: factual articulate of why this command exists (= 存在理由)
//   - Enables: factual articulate of capabilities this command unlocks (= 能力)
//   - RelatedCommands: factual articulate of compose-friendly commands (= 構成 hint)
//
// v4.2 failure-modes (= reposteward-substrate-v4-2-failure-modes) で 1 field を additive 追加:
//   - KnownFailureModes: 既知 failure 条件 + 期待 behavior + countermeasure test の articulate
//
// 全 field は **factual articulate のみ** (= marketing speak / opinion を articulate しない)。
// AI session が command を understand する際の re-grep を省略する substrate を articulate。
type CommandMetadata struct {
	Name              string        `json:"name"`
	Family            string        `json:"family"`
	Maturity          string        `json:"maturity"`
	Summary           string        `json:"summary"`
	Args              []string      `json:"args"`
	OutputKind        string        `json:"outputKind"`
	OutputShape       string        `json:"outputShape"`
	WaveStep          string        `json:"waveStep,omitempty"`
	WhyExists         string        `json:"whyExists,omitempty"`
	Enables           []string      `json:"enables,omitempty"`
	RelatedCommands   []string      `json:"relatedCommands,omitempty"`
	KnownFailureModes []FailureMode `json:"knownFailureModes,omitempty"`
}

// FailureMode は 1 件の既知 failure 条件 articulate。
//
// 期間 articulate (= "N ヶ月安定") ではなく **条件 articulate** で trustability を articulate。
// AI session が command 実行前に「ここで壊れる」を pre-articulate されているため、
// 想定外 failure を **新 FailureMode** として articulate する材料 (= adversarial substrate)。
//
// Permanent ID は articulate しない (= 軽量 doc 経路、registry overhead を避ける)。
// 必要 demand articulate されたら別 PR で permanent ID + chaos runner を articulate する。
type FailureMode struct {
	// Trigger は failure を起こす条件 (= 1 行 factual articulate)。
	Trigger string `json:"trigger"`

	// Behavior は trigger 時の期待 behavior (= ExitError + stderr 等、observable articulate)。
	Behavior string `json:"behavior"`

	// CountermeasureTest は behavior を verify する test 名 / file 参照 (= optional)。
	// articulate されている = 機械検証で守られている、不在 = 観察 articulate のみ。
	CountermeasureTest string `json:"countermeasureTest,omitempty"`
}

// DescribeSchemaVersion is the schemaVersion for `aag describe` output.
const DescribeSchemaVersion = "aag-describe-v1"

// ListSchemaVersion is the schemaVersion for `aag list` output.
const ListSchemaVersion = "aag-list-v1"

// DescribeOutput is the envelope for `aag describe <command>`。
//
// v4.2 seed (= reposteward-substrate-v4-2-introspect-provenance) で Provenance
// field を additive 追加 (= AI が computedAt / sourceCommit / confidence を
// articulate なしに判断するための substrate)。
type DescribeOutput struct {
	SchemaVersion string                 `json:"schemaVersion"`
	Command       CommandMetadata        `json:"command"`
	Provenance    provenance.Provenance  `json:"provenance"`
}

// ListOutput is the envelope for `aag list`。
//
// v4.2 seed で Provenance field を additive 追加。
type ListOutput struct {
	SchemaVersion string                 `json:"schemaVersion"`
	Total         int                    `json:"total"`
	Commands      []CommandMetadata      `json:"commands"`
	Provenance    provenance.Provenance  `json:"provenance"`
}

// commandTable は全 command の metadata の embedded source-of-truth。
//
// 追加・削除時は本 table と usage.go / main.go dispatcher を同時に更新する。
var commandTable = []CommandMetadata{
	{
		Name:            "validate",
		Family:          "go-mvp",
		Maturity:        "provisional",
		Summary:         "repo を read-only で検証し DetectorResult[] を出力 (= Phase 1 skeleton)",
		Args:            []string{"--repo PATH", "--format json"},
		OutputKind:      "detector-result-array",
		OutputShape:     "DetectorResult[] (= empty in skeleton)",
		WaveStep:        "go-mvp",
		WhyExists:       "Go MVP 経路で repo を read-only に検証する CLI entrypoint",
		Enables:         []string{"DetectorResult schema 準拠 output 取得", "shadow / fixtures との parity 検証"},
		RelatedCommands: []string{"shadow", "fixtures", "repair-context"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "--format=yaml 指定 (= json 以外)",
				Behavior:           "ExitError + stderr で 'json のみ対応' を articulate",
				CountermeasureTest: "TestRun_Validate_RejectsYamlFormat",
			},
		},
	},
	{
		Name:            "fixtures",
		Family:          "go-mvp",
		Maturity:        "stable",
		Summary:         "fixtures/aag/ 配下を discover し catalog を出力",
		Args:            []string{"--repo PATH", "--format json"},
		OutputKind:      "fixture-catalog",
		OutputShape:     "{ count: N, fixtures: Fixture[] }",
		WaveStep:        "go-mvp",
		WhyExists:       "fixtures/aag/ の存在 articulate と count を AI に articulate するため",
		Enables:         []string{"fixture catalog の JSON 取得", "shadow command の事前 file 確認"},
		RelatedCommands: []string{"shadow", "validate"},
	},
	{
		Name:            "shadow",
		Family:          "go-mvp",
		Maturity:        "stable",
		Summary:         "5 detector × 8 fixture を全 dispatch、parity summary を出力",
		Args:            []string{"--repo PATH", "--format json"},
		OutputKind:      "parity-summary",
		OutputShape:     "{ totalCases, matched, mismatches[] }",
		WaveStep:        "go-mvp",
		WhyExists:       "Go detector と TS detector の parity を articulate (= primary success metric)",
		Enables:         []string{"parity drift 検出", "Go MVP の正当性 articulate"},
		RelatedCommands: []string{"validate", "fixtures"},
	},
	{
		Name:            "task prepare",
		Family:          "task-capsule",
		Maturity:        "stable",
		Summary:         "active project の Task Capsule を JSON で出力",
		Args:            []string{"--repo PATH", "--project ID", "--intent TEXT", "--task ID"},
		OutputKind:      "task-capsule",
		OutputShape:     "TaskCapsule (= task-capsule.schema.json)",
		WaveStep:        "Wave 1 #2",
		WhyExists:       "AI session が active project に対して Task Capsule を articulate するため",
		Enables:         []string{"task-capsule.schema.json 準拠 capsule 生成", "task validate / task close への stdin pipe 入力"},
		RelatedCommands: []string{"task validate", "task close", "context"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:  "--project ID 不在 / 未 articulate active project (= projects/active/<id>/ 不在)",
				Behavior: "ExitError + stderr で project not found を articulate",
			},
			{
				Trigger:            "--task ID が kebab-case 違反 (= camelCase / PascalCase)",
				Behavior:           "ExitError + stderr で kebab-case enforcement を articulate",
				CountermeasureTest: "TestTaskCapsule_Validate_KebabCaseEnforcement (= internal/taskcapsule)",
			},
		},
	},
	{
		Name:            "task validate",
		Family:          "task-capsule",
		Maturity:        "stable",
		Summary:         "TaskCapsule を schema 準拠 + value invariant で検証",
		Args:            []string{"--capsule FILE | -"},
		OutputKind:      "validate-result",
		OutputShape:     "{ valid, errors[], capsule }",
		WaveStep:        "Wave 5 #22",
		WhyExists:       "Task Capsule の schema 準拠 + invariant 整合を articulate するため",
		Enables:         []string{"capsule の machine-verify", "stdin pipe (= --capsule -) 経由の validation"},
		RelatedCommands: []string{"task prepare", "task close"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "--capsule - で stdin が空",
				Behavior:           "ExitError + stderr で 'stdin was empty' articulate",
				CountermeasureTest: "TestValidateCapsule_StdinEmpty (= improvement D で landing)",
			},
			{
				Trigger:  "schema field 不在 (= partial capsule)",
				Behavior: "ExitFail + structured error per missing field",
			},
		},
	},
	{
		Name:            "task close",
		Family:          "task-capsule",
		Maturity:        "stable",
		Summary:         "TaskCapsule を close 可能か articulate",
		Args:            []string{"--capsule FILE | -"},
		OutputKind:      "close-result",
		OutputShape:     "{ closeable, blockers[], capsule }",
		WaveStep:        "Wave 5 #22",
		WhyExists:       "Task Capsule の close 可能性 (= blockers 不在) を articulate するため",
		Enables:         []string{"capsule lifecycle 完了判定", "stdin pipe 経由の close check"},
		RelatedCommands: []string{"task prepare", "task validate"},
	},
	{
		Name:            "stats files",
		Family:          "stats",
		Maturity:        "stable",
		Summary:         "effectiveCodeLines を bucket / range / layer / percentile で query",
		Args:            []string{"--repo PATH", "--metric NAME", "--range N..M", "--bucket ID", "--layer NAME", "--above PNN", "--limit N"},
		OutputKind:      "stats-files",
		OutputShape:     "{ matched, files[] }",
		WaveStep:        "Wave 1 #6",
		WhyExists:       "size metric を bucket / range / layer / percentile で query するため",
		Enables:         []string{"上位 N file の size articulate", "bucket / range / layer 別 distribution 取得"},
		RelatedCommands: []string{"where-am-i", "rule locate"},
	},
	{
		Name:            "where-am-i",
		Family:          "navigation",
		Maturity:        "stable",
		Summary:         "branch / activeProject / repoHealth / openObligations / 推奨 next command",
		Args:            []string{"--repo PATH"},
		OutputKind:      "where-am-i",
		OutputShape:     "{ branch, activeProject, repoHealth, openObligations[], suggestedNext[] }",
		WaveStep:        "Wave 3 #10",
		WhyExists:       "AI session が現在 repo state を 1 command で articulate するため (= session bootstrap entrypoint)",
		Enables:         []string{"branch / activeProject articulate", "manifestContext snapshot 取得", "session 開始時の re-grep 省略"},
		RelatedCommands: []string{"context", "changed", "next"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "--repo が non-git directory",
				Behavior:           "ExitError + stderr で 'not a git repository' articulate",
				CountermeasureTest: "TestWhereAmI_RejectsNonGitDir (= internal/navigation)",
			},
			{
				Trigger:            ".claude/manifest.json が malformed JSON",
				Behavior:           "ExitPass、ManifestContext = null で graceful degradation (= 部分 fail を articulate しない)",
				CountermeasureTest: "TestReadManifestContext_ParseError (= internal/navigation)",
			},
		},
	},
	{
		Name:            "context",
		Family:          "navigation",
		Maturity:        "stable",
		Summary:         "active project の requiredReads / constraints / nextActions",
		Args:            []string{"--repo PATH"},
		OutputKind:      "context",
		OutputShape:     "{ projectId, requiredReads[], constraints[], nextActions[] }",
		WaveStep:        "Wave 3 #11",
		WhyExists:       "active project の作業 context を articulate するため",
		Enables:         []string{"requiredReads list 取得", "constraints articulate", "nextActions の articulate"},
		RelatedCommands: []string{"where-am-i", "task prepare"},
	},
	{
		Name:            "changed",
		Family:          "navigation",
		Maturity:        "stable",
		Summary:         "--base..--head の changed file を area / obligations / requiredReads で articulate",
		Args:            []string{"--repo PATH", "--base REV", "--head REV"},
		OutputKind:      "changed",
		OutputShape:     "{ files[], areas[], obligations[], requiredReads[] }",
		WaveStep:        "Wave 3 #12",
		WhyExists:       "git diff から area / obligations / requiredReads を articulate するため",
		Enables:         []string{"変更 file の area 分類", "premise contract trigger 検出", "co-change 必須 path articulate"},
		RelatedCommands: []string{"obligation check", "context"},
	},
	{
		Name:            "rule locate",
		Family:          "navigation",
		Maturity:        "stable",
		Summary:         "ruleId から rule の definition / guards / docs / thresholds を JSON で出力",
		Args:            []string{"--repo PATH", "<ruleId>"},
		OutputKind:      "rule-locate",
		OutputShape:     "{ ruleId, definition, guards[], docs[], thresholds }",
		WaveStep:        "Wave 3 #13",
		WhyExists:       "ruleId から rule の正本位置を articulate するため (= grep 省略)",
		Enables:         []string{"rule definition への直接 navigation", "関連 guard / docs / thresholds の articulate"},
		RelatedCommands: []string{"detector refs"},
	},
	{
		Name:            "detector refs",
		Family:          "navigation",
		Maturity:        "stable",
		Summary:         "detectorId から goImplementation / tsImplementation / schema / fixtures を JSON で出力",
		Args:            []string{"--repo PATH", "<detectorId>"},
		OutputKind:      "detector-refs",
		OutputShape:     "{ detectorId, goImplementation, tsImplementation, schema, fixtures[] }",
		WaveStep:        "Wave 3 #14",
		WhyExists:       "detectorId から detector の implementation pointer を articulate するため",
		Enables:         []string{"Go / TS 実装 file への直接 navigation", "schema + fixtures への navigation"},
		RelatedCommands: []string{"rule locate", "shadow"},
	},
	{
		Name:            "clean check",
		Family:          "cleanliness",
		Maturity:        "stable",
		Summary:         "generated 混入 / archive manifest 不在 / projectId 重複 等の cleanliness 違反",
		Args:            []string{"--repo PATH"},
		OutputKind:      "cleanliness-report",
		OutputShape:     "{ violations[], summary }",
		WaveStep:        "Wave 4 #15",
		WhyExists:       "repo の cleanliness 違反 (= 3 rule MVP) を articulate するため",
		Enables:         []string{"generated 混入 detect", "archive manifest 不在 detect", "projectId 重複 detect"},
		RelatedCommands: []string{"docs placement-check", "comments list"},
	},
	{
		Name:            "comments list",
		Family:          "cleanliness",
		Maturity:        "stable",
		Summary:         "--kind todo|suppression|expired のコメントを repo 全体から scan",
		Args:            []string{"--repo PATH", "--kind KIND"},
		OutputKind:      "comments-list",
		OutputShape:     "{ kind, count, comments[] }",
		WaveStep:        "Wave 4 #16",
		WhyExists:       "TODO / FIXME / suppression / expired コメントを machine-scan するため",
		Enables:         []string{"comment kind 別 list 取得", "暗黙 debt の articulate"},
		RelatedCommands: []string{"clean check"},
	},
	{
		Name:            "docs placement-check",
		Family:          "cleanliness",
		Maturity:        "stable",
		Summary:         "schema / generated artifact の配置規約違反",
		Args:            []string{"--repo PATH"},
		OutputKind:      "placement-report",
		OutputShape:     "{ violations[], summary }",
		WaveStep:        "Wave 4 #17",
		WhyExists:       "schema / generated artifact の配置規約違反を articulate するため",
		Enables:         []string{"schema misplacement detect", "generated artifact misplacement detect"},
		RelatedCommands: []string{"clean check"},
	},
	{
		Name:            "obligation check",
		Family:          "obligation",
		Maturity:        "stable",
		Summary:         "premise contract triggers を git diff で検出し requirements を JSON で出力",
		Args:            []string{"--repo PATH", "--base REV", "--head REV"},
		OutputKind:      "obligation-check",
		OutputShape:     "{ triggered[], requiredReads[], requiredCoChanges[] }",
		WaveStep:        "Wave 5 #20",
		WhyExists:       "git diff から premise contract trigger を検出し requirements を articulate するため",
		Enables:         []string{"requiredReads articulate", "co-change 必須 path articulate"},
		RelatedCommands: []string{"changed", "repair-context"},
	},
	{
		Name:            "repair-context",
		Family:          "repair",
		Maturity:        "stable",
		Summary:         "--from <file> の検出結果から repairReads / suggestedActions / requiredChecks",
		Args:            []string{"--from FILE | -"},
		OutputKind:      "repair-context",
		OutputShape:     "{ inputKind, repairReads[], suggestedActions[], requiredChecks[] }",
		WaveStep:        "Wave 5 #21",
		WhyExists:       "検出結果 (= DetectorResult / TaskCapsule 等) から repair context を articulate するため",
		Enables:         []string{"4 input kind classifier", "stdin pipe (= --from -) 経由の repair generation"},
		RelatedCommands: []string{"validate", "task validate", "obligation check"},
	},
	{
		Name:            "project stale",
		Family:          "project-status",
		Maturity:        "stable",
		Summary:         "active project の最終 commit から stale (= 30 日以上 commit なし) 状態",
		Args:            []string{"--repo PATH"},
		OutputKind:      "project-stale",
		OutputShape:     "{ projectId, lastCommitAt, daysSince, stale }",
		WaveStep:        "Wave 5 #23",
		WhyExists:       "active project の stale 状態を 30 日 threshold で articulate するため",
		Enables:         []string{"active project の最終 commit articulate", "stale 判定"},
		RelatedCommands: []string{"next", "where-am-i"},
	},
	{
		Name:            "next",
		Family:          "project-status",
		Maturity:        "stable",
		Summary:         "AI session の next action recommendation",
		Args:            []string{"--repo PATH"},
		OutputKind:      "next-action",
		OutputShape:     "{ recommendation, reasons[], suggestedCommands[] }",
		WaveStep:        "Wave 5 #23",
		WhyExists:       "where-am-i + working tree + checklist から AI session の next action を articulate するため",
		Enables:         []string{"recommendation articulate", "次 command の hint 取得"},
		RelatedCommands: []string{"where-am-i", "context", "project stale"},
	},
	{
		Name:            "wrap",
		Family:          "envelope",
		Maturity:        "provisional",
		Summary:         "stdin の JSON を pipeline envelope (= aag-pipeline-envelope-v1) で wrap",
		Args:            []string{"--command NAME"},
		OutputKind:      "wrapped-response",
		OutputShape:     "{ schemaVersion, command, source, timestamp, summary?, data }",
		WaveStep:        "improvement A",
		WhyExists:       "stdin pipeline で任意 command output を pipeline envelope で articulate するため",
		Enables:         []string{"AI consumer 向けの統一 envelope", "stdin pipe composition"},
		RelatedCommands: []string{"where-am-i", "stats files", "describe"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "--command flag 不在",
				Behavior:           "ExitError + stderr で '--command flag は required' articulate",
				CountermeasureTest: "TestWrap_RejectsEmptyCommand (= internal/responsewrap)",
			},
			{
				Trigger:            "stdin が空",
				Behavior:           "ExitError + stderr で 'stdin was empty' articulate",
				CountermeasureTest: "TestWrap_RejectsEmptyStdin (= internal/responsewrap)",
			},
			{
				Trigger:            "stdin が invalid JSON",
				Behavior:           "ExitError + stderr で 'stdin is not valid JSON' articulate (= envelope に invalid data を wrap しない)",
				CountermeasureTest: "TestWrap_RejectsInvalidJSON (= internal/responsewrap)",
			},
		},
	},
	{
		Name:            "describe",
		Family:          "self-describe",
		Maturity:        "provisional",
		Summary:         "指定 command の metadata (= maturity / args / output schema) を JSON で articulate",
		Args:            []string{"<command>"},
		OutputKind:      "describe",
		OutputShape:     "{ schemaVersion, command: CommandMetadata }",
		WaveStep:        "improvement E",
		WhyExists:       "指定 command の metadata を 1 command で articulate するため (= self-discover)",
		Enables:         []string{"command metadata の point lookup", "AI session の self-discovery"},
		RelatedCommands: []string{"list", "introspect"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "<command> 引数不在",
				Behavior:           "ExitError + stderr で '<command> 引数は required' articulate",
				CountermeasureTest: "describe.go runDescribe argument validation",
			},
			{
				Trigger:            "command が commandTable に articulate されていない",
				Behavior:           "ExitError + stderr で 'unknown command' articulate ('aag list' hint 付き)",
				CountermeasureTest: "TestDescribe_RejectsUnknownCommand (= internal/describe)",
			},
		},
	},
	{
		Name:            "list",
		Family:          "self-describe",
		Maturity:        "provisional",
		Summary:         "全 command 一覧 + maturity を JSON で articulate",
		Args:            []string{},
		OutputKind:      "list",
		OutputShape:     "{ schemaVersion, total, commands: CommandMetadata[] }",
		WaveStep:        "improvement E",
		WhyExists:       "全 command の metadata を 1 command で articulate するため",
		Enables:         []string{"全 command surface の articulate", "maturity / family 別 filter (= jq との compose)"},
		RelatedCommands: []string{"describe", "introspect"},
	},
	{
		Name:            "introspect command",
		Family:          "self-describe",
		Maturity:        "provisional",
		Summary:         "command の implementation pointer (= dispatcher / handler / package / schema / tests) を JSON で articulate",
		Args:            []string{"<command>"},
		OutputKind:      "introspect-command",
		OutputShape:     "{ schemaVersion, command: CommandMetadata, implementation, schema, tests, examples, provenance }",
		WaveStep:        "v4.2 seed",
		WhyExists:       "AI session が grep なしに command の Go 実装に navigate できるようにするため",
		Enables:         []string{"command source への direct navigation", "test / schema / fixture pointer の articulate"},
		RelatedCommands: []string{"describe", "list", "detector refs"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "command が implTable に articulate されていない (= cross-table drift signal)",
				Behavior:           "ExitError + stderr で 'implementation pointer not articulated' articulate",
				CountermeasureTest: "self-check V1 cross-sync 軸が事前に articulate (= drift detection)",
			},
		},
	},
	{
		Name:            "introspect schema",
		Family:          "self-describe",
		Maturity:        "provisional",
		Summary:         "schema id の path + virtual flag + producers + consumers を JSON で articulate",
		Args:            []string{"<schema-id>"},
		OutputKind:      "introspect-schema",
		OutputShape:     "{ schemaVersion, schema: { id, title, path, isVirtual, purpose }, producers[], consumers[], provenance }",
		WaveStep:        "v4.2 introspect-provenance",
		WhyExists:       "AI session が schema-graph.json を walk せずに 1 command で schema の relation を articulate するため",
		Enables:         []string{"schema producer / consumer の articulate", "virtual schema (= Go internal) と file-backed schema の articulate"},
		RelatedCommands: []string{"introspect command", "detector refs"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:            "schema id が schemaInfoTable に articulate されていない",
				Behavior:           "ExitError + stderr で 'unknown schema id' articulate (= 'aag list' / schema-graph.json hint 付き)",
				CountermeasureTest: "TestIntrospectSchema_RejectsUnknown (= internal/introspect)",
			},
		},
	},
	{
		Name:            "self-check",
		Family:          "self-describe",
		Maturity:        "provisional",
		Summary:         "AAG 自身の整合性 (= cross-table sync + file 実在 + orphan schema) を 5 軸で機械検証",
		Args:            []string{"--repo PATH"},
		OutputKind:      "self-check",
		OutputShape:     "{ schemaVersion, healthy, summary: { totalChecks, totalViolations, V1〜V5 counts }, violations[], provenance }",
		WaveStep:        "v4.2 introspect-provenance",
		WhyExists:       "AI session が AAG 自身の trustability (= 整合性) を 1 command で articulate するため",
		Enables:         []string{"AAG meta-substrate verification", "cross-table drift detection at runtime", "AAG infrastructure file 実在 confirmation"},
		RelatedCommands: []string{"introspect command", "introspect schema", "describe", "list"},
		KnownFailureModes: []FailureMode{
			{
				Trigger:  "--repo が articulate された path 不在 / 走査不能",
				Behavior: "V2/V3/V4 で path 不在 violation を articulate (= ExitPass、healthy=false で articulate)",
			},
			{
				Trigger:            "implTable / schemaTable / testTable 間の cross-table drift",
				Behavior:           "violations[] で V1〜V5 の articulate、healthy=false、ExitPass (= advisory)",
				CountermeasureTest: "TestRun_HealthyOnRealRepo (= internal/selfcheck)",
			},
		},
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
				Provenance: provenance.Compute(
					provenance.Canonical,
					"embedded commandTable source-of-truth",
				),
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
		Provenance: provenance.Compute(
			provenance.Canonical,
			"embedded commandTable source-of-truth",
		),
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
