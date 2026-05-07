// Package taskcapsule — Prepare implementation.
//
// PrepareInput → TaskCapsule (= AI session が消費可能な operating layer 契約) を
// repo / project state から構築する read-only collector。
//
// Read-only first 原則 (= projects/active/reposteward-ai-ops-platform/plan.md
// §不可侵原則 3):
//   - file 走査のみ、書き換えなし
//   - generated artifact (= references/04-tracking/generated/*.json) は consumer
//     として参照のみ、再生成しない (= docs:generate は別 entry point の責務)
//   - 失敗時は error を返す (= silent fallback 禁止、producer 責務として errpath)
package taskcapsule

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// PrepareInput controls Prepare's behavior.
//
// RepoRoot must be the absolute path to the repo root (= where projects/ +
// references/ + docs/ live).
type PrepareInput struct {
	// RepoRoot is the absolute path to the repository root.
	RepoRoot string

	// ProjectID is the active project id (= projects/active/<id>/ must exist).
	ProjectID string

	// Intent is an optional free-form articulation of the task purpose.
	// When provided, populates TaskCapsule.Intent and feeds Goal default.
	Intent string

	// TaskID is an optional explicit kebab-case task id. When empty, derived
	// from Intent (slugified) or falls back to <ProjectID>-task.
	TaskID string
}

// Prepare reads project + repo state and constructs a TaskCapsule v1.
//
// Sources:
//   - projects/active/<ProjectID>/config/project.json → projectId / title /
//     projectization.{nonGoals, implementationScope}
//   - references/04-tracking/generated/architecture-health.json → repoHealth
//   - references/04-tracking/generated/project-health.json → currentState
//
// Defaults (= MVP scope):
//   - relatedCommands: 3 commands (= test:guards / docs:check / docs:generate)
//   - expectedOutputs: empty (= per-task articulate in producer extension)
//   - repairPolicy: 2 keys (= ifDocsObligationFails / ifGuardFails)
//   - requiredReads: 5 paths under projects/active/<ProjectID>/ (= AI_CONTEXT /
//     HANDOFF / plan / projectization / decision-audit)
func Prepare(input PrepareInput) (TaskCapsule, error) {
	if input.RepoRoot == "" {
		return TaskCapsule{}, fmt.Errorf("Prepare: RepoRoot must be set")
	}
	if input.ProjectID == "" {
		return TaskCapsule{}, fmt.Errorf("Prepare: ProjectID must be set")
	}

	projectDir := filepath.Join(input.RepoRoot, "projects", "active", input.ProjectID)
	if _, err := os.Stat(projectDir); err != nil {
		return TaskCapsule{}, fmt.Errorf("Prepare: project %q not found at %s: %w", input.ProjectID, projectDir, err)
	}

	config, err := readProjectConfig(filepath.Join(projectDir, "config", "project.json"))
	if err != nil {
		return TaskCapsule{}, err
	}

	repoHealth, err := readRepoHealth(filepath.Join(input.RepoRoot, "references", "04-tracking", "generated", "architecture-health.json"))
	if err != nil {
		return TaskCapsule{}, err
	}

	currentState, err := readCurrentState(
		filepath.Join(input.RepoRoot, "references", "04-tracking", "generated", "project-health.json"),
		input.ProjectID,
	)
	if err != nil {
		return TaskCapsule{}, err
	}

	taskID := input.TaskID
	if taskID == "" {
		if input.Intent != "" {
			taskID = slugify(input.Intent, 50)
		} else {
			taskID = input.ProjectID + "-task"
		}
	}

	goal := config.Title
	if input.Intent != "" {
		goal = input.Intent
	}
	if goal == "" {
		goal = fmt.Sprintf("Continue work on %s", input.ProjectID)
	}

	var intentPtr *string
	if input.Intent != "" {
		s := input.Intent
		intentPtr = &s
	}

	nonGoals := config.Projectization.NonGoals
	if nonGoals == nil {
		nonGoals = []string{}
	}
	targetFiles := config.Projectization.ImplementationScope
	if targetFiles == nil {
		targetFiles = []string{}
	}

	requiredReads := []string{
		fmt.Sprintf("projects/active/%s/AI_CONTEXT.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/HANDOFF.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/plan.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/projectization.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/decision-audit.md", input.ProjectID),
	}

	capsule := TaskCapsule{
		SchemaVersion:   SchemaVersion,
		TaskId:          taskID,
		ProjectId:       input.ProjectID,
		Intent:          intentPtr,
		RepoHealth:      repoHealth,
		CurrentState:    currentState,
		Goal:            goal,
		NonGoals:        nonGoals,
		RequiredReads:   requiredReads,
		TargetFiles:     targetFiles,
		RelatedCommands: defaultRelatedCommands(),
		ExpectedOutputs: []string{},
		RepairPolicy:    defaultRepairPolicy(),
		OpenQuestions:   []string{}, // v4.2 capsule-open-questions で institute (= 空配列で slot を articulate)
	}

	if err := capsule.Validate(); err != nil {
		return TaskCapsule{}, fmt.Errorf("Prepare: produced capsule failed self-validate: %w", err)
	}

	return capsule, nil
}

type projectConfig struct {
	ProjectId      string `json:"projectId"`
	Title          string `json:"title"`
	Projectization struct {
		ImplementationScope []string `json:"implementationScope"`
		NonGoals            []string `json:"nonGoals"`
	} `json:"projectization"`
}

func readProjectConfig(path string) (projectConfig, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return projectConfig{}, fmt.Errorf("Prepare: failed to read %s: %w", path, err)
	}
	var c projectConfig
	if err := json.Unmarshal(raw, &c); err != nil {
		return projectConfig{}, fmt.Errorf("Prepare: failed to parse %s: %w", path, err)
	}
	return c, nil
}

func readRepoHealth(path string) (map[string]interface{}, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		// generated artifact unavailable → articulate hardGate=unknown rather than
		// hard fail. AI session can still consume the capsule.
		return map[string]interface{}{
			"hardGate": string(HardGateUnknown),
			"kpi":      "unknown (architecture-health.json not readable)",
		}, nil
	}
	var h struct {
		Summary struct {
			TotalKpis    int  `json:"totalKpis"`
			Ok           int  `json:"ok"`
			Warn         int  `json:"warn"`
			Fail         int  `json:"fail"`
			HardGatePass bool `json:"hardGatePass"`
		} `json:"summary"`
	}
	if err := json.Unmarshal(raw, &h); err != nil {
		return nil, fmt.Errorf("Prepare: failed to parse %s: %w", path, err)
	}
	hardGate := HardGateFail
	if h.Summary.HardGatePass {
		hardGate = HardGatePass
	}
	out := map[string]interface{}{
		"hardGate": string(hardGate),
		"kpi":      fmt.Sprintf("%d/%d OK", h.Summary.Ok, h.Summary.TotalKpis),
	}
	if h.Summary.Warn > 0 {
		out["warn"] = h.Summary.Warn
	}
	if h.Summary.Fail > 0 {
		out["fail"] = h.Summary.Fail
	}
	return out, nil
}

func readCurrentState(path string, projectID string) (map[string]interface{}, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		// generated artifact unavailable → articulate empty currentState. AI
		// session can still consume the capsule.
		return map[string]interface{}{
			"projectStatus": "unknown",
			"checkboxes":    "unknown (project-health.json not readable)",
		}, nil
	}
	var ph struct {
		Projects []struct {
			ProjectID          string `json:"projectId"`
			DerivedStatus      string `json:"derivedStatus"`
			RequiredCheckboxes int    `json:"requiredCheckboxes"`
			CheckedCheckboxes  int    `json:"checkedCheckboxes"`
		} `json:"projects"`
	}
	if err := json.Unmarshal(raw, &ph); err != nil {
		return nil, fmt.Errorf("Prepare: failed to parse %s: %w", path, err)
	}
	out := map[string]interface{}{
		"projectStatus": "unknown",
		"checkboxes":    "unknown",
	}
	for _, p := range ph.Projects {
		if p.ProjectID == projectID {
			out["projectStatus"] = p.DerivedStatus
			out["checkboxes"] = fmt.Sprintf("%d/%d", p.CheckedCheckboxes, p.RequiredCheckboxes)
			break
		}
	}
	return out, nil
}

func defaultRelatedCommands() []string {
	return []string{
		"cd app && npm run test:guards",
		"cd app && npm run docs:check",
		"cd app && npm run docs:generate",
	}
}

func defaultRepairPolicy() map[string]interface{} {
	return map[string]interface{}{
		"ifDocsObligationFails": "Run `cd app && npm run docs:generate`. If obligation collector flags additional path updates, follow them and re-run `cd app && npm run docs:check`.",
		"ifGuardFails":          "Read the failing guard source and its linked AAG Response. Fix the underlying violation, then re-run `cd app && npm run test:guards`.",
	}
}

// slugify converts s to a kebab-case slug capped at maxLen runes.
//
// Rules:
//   - lowercase ASCII alnum kept as-is
//   - space / underscore / hyphen collapse to a single '-'
//   - leading / trailing '-' trimmed
//   - empty result → "task"
//   - cap to maxLen runes (= byte cap acceptable for ASCII slug)
func slugify(s string, maxLen int) string {
	s = strings.ToLower(s)
	var b strings.Builder
	prevDash := true
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			prevDash = false
		case r == ' ' || r == '-' || r == '_':
			if !prevDash {
				b.WriteRune('-')
				prevDash = true
			}
		}
	}
	out := strings.TrimRight(b.String(), "-")
	if maxLen > 0 && len(out) > maxLen {
		out = strings.TrimRight(out[:maxLen], "-")
	}
	if out == "" {
		out = "task"
	}
	return out
}

// MarshalJSON returns the indented JSON serialization used by `aag task prepare`.
//
// HTML escape を無効化して `&` / `<` / `>` を literal のまま articulate (= AI
// consumer 側で shell command 文字列等の readability を維持。functionally valid
// JSON は parser 互換だが、`&&` → `&&` 変換は AI session 読了性を低下)。
func MarshalJSON(capsule TaskCapsule) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(capsule); err != nil {
		return nil, err
	}
	// Encoder.Encode は末尾改行を追加する。MarshalIndent 互換のため末尾改行を除去。
	out := buf.Bytes()
	if n := len(out); n > 0 && out[n-1] == '\n' {
		out = out[:n-1]
	}
	return out, nil
}
