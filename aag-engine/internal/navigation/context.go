package navigation

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// context --project (= Wave 3 #11)
// ───────────────────────────────────────────────────────────────────────

// ContextOutput is the JSON shape emitted by `aag context --project <id>`.
//
// 用途: AI session が project 着手時に読むべき正本 path / 不可触の constraints /
// 次に取るべき action を 1 JSON に articulate する light-weight bootstrap surface
// (= task prepare の subset、Task Capsule をフルで生成しない場合の simplified entry)。
type ContextOutput struct {
	SchemaVersion string   `json:"schemaVersion"`
	ProjectId     string   `json:"projectId"`
	Title         string   `json:"title,omitempty"`
	RequiredReads []string `json:"requiredReads"`
	Constraints   []string `json:"constraints"`
	NextActions   []string `json:"nextActions"`
}

// ContextSchemaVersion is the const articulated in ContextOutput.schemaVersion.
const ContextSchemaVersion = "context-project-v1"

// ContextInput controls the Context() function.
type ContextInput struct {
	RepoRoot  string
	ProjectID string

	// MaxNextActions caps the number of next actions returned (= unchecked
	// checklist entries). 0 → default 5.
	MaxNextActions int
}

// Context reads the project config + checklist and returns a slim navigation
// context. Sources:
//   - projects/active/<id>/config/project.json → title + projectization.nonGoals
//   - projects/active/<id>/AI_CONTEXT.md / HANDOFF.md / plan.md / projectization.md /
//     decision-audit.md → fixed required-reads list (= 5 standard files、Wave 1 #2
//     task prepare と同 idiom)
//   - projects/active/<id>/checklist.md → unchecked entries → nextActions (= top N)
//
// Errors:
//   - RepoRoot / ProjectID empty → error
//   - project dir not found → error
//   - config/project.json missing → error
//   - checklist.md missing → nextActions = empty (graceful degrade)
func Context(input ContextInput) (ContextOutput, error) {
	if input.RepoRoot == "" {
		return ContextOutput{}, fmt.Errorf("Context: RepoRoot must be set")
	}
	if input.ProjectID == "" {
		return ContextOutput{}, fmt.Errorf("Context: ProjectID must be set")
	}

	projectDir := filepath.Join(input.RepoRoot, "projects", "active", input.ProjectID)
	if _, err := os.Stat(projectDir); err != nil {
		return ContextOutput{}, fmt.Errorf("Context: project %q not found at %s: %w", input.ProjectID, projectDir, err)
	}

	configPath := filepath.Join(projectDir, "config", "project.json")
	cfg, err := readContextProjectConfig(configPath)
	if err != nil {
		return ContextOutput{}, err
	}

	requiredReads := []string{
		fmt.Sprintf("projects/active/%s/AI_CONTEXT.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/HANDOFF.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/plan.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/projectization.md", input.ProjectID),
		fmt.Sprintf("projects/active/%s/decision-audit.md", input.ProjectID),
	}

	constraints := cfg.Projectization.NonGoals
	if constraints == nil {
		constraints = []string{}
	}

	maxN := input.MaxNextActions
	if maxN <= 0 {
		maxN = 5
	}
	nextActions := readUncheckedChecklistItems(filepath.Join(projectDir, "checklist.md"), maxN)

	return ContextOutput{
		SchemaVersion: ContextSchemaVersion,
		ProjectId:     input.ProjectID,
		Title:         cfg.Title,
		RequiredReads: requiredReads,
		Constraints:   constraints,
		NextActions:   nextActions,
	}, nil
}

type contextProjectConfig struct {
	Title          string `json:"title"`
	Projectization struct {
		NonGoals []string `json:"nonGoals"`
	} `json:"projectization"`
}

func readContextProjectConfig(path string) (contextProjectConfig, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return contextProjectConfig{}, fmt.Errorf("Context: failed to read %s: %w", path, err)
	}
	var c contextProjectConfig
	if err := json.Unmarshal(raw, &c); err != nil {
		return contextProjectConfig{}, fmt.Errorf("Context: failed to parse %s: %w", path, err)
	}
	return c, nil
}

// readUncheckedChecklistItems scans checklist.md and returns up to maxN
// unchecked items (= lines starting with "- [ ]" or "* [ ]").
//
// AI 自己レビュー / 最終レビュー section の checkbox は articulate 上「終了直前
// の儀式」であり、Wave 着手中の next action には不適合のため skip。
func readUncheckedChecklistItems(path string, maxN int) []string {
	out := []string{}
	f, err := os.Open(path)
	if err != nil {
		return out
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	skipSection := false
	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		// Skip AI 自己レビュー / 最終レビュー sections (= terminal review、not actionable nextAction)
		if strings.HasPrefix(trimmed, "## ") {
			lower := strings.ToLower(trimmed)
			if strings.Contains(lower, "ai 自己レビュー") || strings.Contains(lower, "最終レビュー") {
				skipSection = true
				continue
			}
			skipSection = false
			continue
		}
		if skipSection {
			continue
		}

		// Match unchecked checkboxes
		if strings.HasPrefix(trimmed, "- [ ] ") {
			out = append(out, strings.TrimSpace(strings.TrimPrefix(trimmed, "- [ ] ")))
		} else if strings.HasPrefix(trimmed, "* [ ] ") {
			out = append(out, strings.TrimSpace(strings.TrimPrefix(trimmed, "* [ ] ")))
		}
		if len(out) >= maxN {
			break
		}
	}
	return out
}
