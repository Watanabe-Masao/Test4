// Package navigation holds Wave 3 (= reposteward-ai-ops-platform AI navigation MVP)
// commands. Wave 3 #10 (where-am-i) で landing。
//
// 各 navigation command は read-only で repo state を articulate する CLI surface。
// AI session が grep / search / 推測なしで「現在地 / project context / changed
// 影響範囲 / rule 参照先 / detector 参照先」に到達するための navigation layer。
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
//   1. JSON-first (= output は schema 準拠 JSON、Human UI 出さない)
//   2. AI-first (= primary consumer は AI session、ParseHandler 不要)
//   3. Read-only first (= file 走査 + git read のみ、書き換えなし)
//
// command surface 一覧 (= Wave 3 #10〜#14 で order に articulate):
//   - aag where-am-i    : Wave 3 #10 (= 本 file)
//   - aag context       : Wave 3 #11
//   - aag changed       : Wave 3 #12
//   - aag rule locate   : Wave 3 #13
//   - aag detector refs : Wave 3 #14
package navigation

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// where-am-i
// ───────────────────────────────────────────────────────────────────────

// WhereAmIOutput is the JSON shape emitted by `aag where-am-i`.
type WhereAmIOutput struct {
	SchemaVersion          string                 `json:"schemaVersion"`
	Branch                 string                 `json:"branch"`
	ActiveProject          *string                `json:"activeProject"`
	RepoHealth             map[string]interface{} `json:"repoHealth"`
	OpenObligations        int                    `json:"openObligations"`
	RecommendedNextCommand string                 `json:"recommendedNextCommand,omitempty"`
}

// WhereAmISchemaVersion is the schemaVersion const articulated in WhereAmIOutput.
const WhereAmISchemaVersion = "where-am-i-v1"

// WhereAmIInput controls WhereAmI behavior.
type WhereAmIInput struct {
	RepoRoot string
}

// WhereAmI returns the current branch + activeProject + repoHealth + obligations
// snapshot, plus a recommended next command for AI session bootstrapping.
//
// Sources (read-only):
//   - git branch (= current branch via `git rev-parse --abbrev-ref HEAD` or HEAD file)
//   - branch name pattern (= claude/<projectId>-<slug>) → activeProject
//   - references/04-tracking/generated/architecture-health.json → repoHealth + obligations
//
// Errors:
//   - RepoRoot empty → error
//   - .git missing → error (= not a git repo)
//   - branch detection failure → branch = "(unknown)"、activeProject = nil
//   - architecture-health.json missing → repoHealth.hardGate = "unknown"、openObligations = 0
func WhereAmI(input WhereAmIInput) (WhereAmIOutput, error) {
	if input.RepoRoot == "" {
		return WhereAmIOutput{}, fmt.Errorf("WhereAmI: RepoRoot must be set")
	}
	if _, err := os.Stat(filepath.Join(input.RepoRoot, ".git")); err != nil {
		return WhereAmIOutput{}, fmt.Errorf("WhereAmI: %s is not a git repository: %w", input.RepoRoot, err)
	}

	branch := detectBranch(input.RepoRoot)
	// active-dir-based derivation only. branch name pattern alone は projectId
	// と slug を分離不能 (= e.g., 'claude/foo-bar-extension' で projectId=foo-bar
	// なのか foo なのかは projects/active/ の実 dir なしには判断不能)。
	activeProject := DeriveActiveProjectFromActiveDirs(input.RepoRoot, branch)

	repoHealth, openObligations := readHealthSnapshot(input.RepoRoot)

	out := WhereAmIOutput{
		SchemaVersion:          WhereAmISchemaVersion,
		Branch:                 branch,
		ActiveProject:          activeProject,
		RepoHealth:             repoHealth,
		OpenObligations:        openObligations,
		RecommendedNextCommand: recommendNextCommand(activeProject, openObligations),
	}
	return out, nil
}

// detectBranch returns the current git branch name. Falls back to "(unknown)"
// when both `git rev-parse` and HEAD file read fail.
func detectBranch(repoRoot string) string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err == nil {
		return strings.TrimSpace(string(out))
	}
	headBytes, err := os.ReadFile(filepath.Join(repoRoot, ".git", "HEAD"))
	if err != nil {
		return "(unknown)"
	}
	head := strings.TrimSpace(string(headBytes))
	if strings.HasPrefix(head, "ref: refs/heads/") {
		return strings.TrimPrefix(head, "ref: refs/heads/")
	}
	return "(detached)"
}

// DeriveActiveProjectFromActiveDirs finds the longest matching active project
// for a branch name by scanning `projects/active/<id>/` directories.
//
// This is more accurate than regex-based extraction because project names can
// have varying numbers of kebab-case segments.
func DeriveActiveProjectFromActiveDirs(repoRoot, branch string) *string {
	if !strings.HasPrefix(branch, "claude/") {
		return nil
	}
	tail := strings.TrimPrefix(branch, "claude/")

	activeDir := filepath.Join(repoRoot, "projects", "active")
	entries, err := os.ReadDir(activeDir)
	if err != nil {
		return nil
	}
	var best string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if name == "_template" {
			continue
		}
		if strings.HasPrefix(tail, name+"-") || tail == name {
			if len(name) > len(best) {
				best = name
			}
		}
	}
	if best == "" {
		return nil
	}
	return &best
}

// healthSummary is a partial mirror of architecture-health.json `summary` + a few
// additional KPIs we want to surface in WhereAmI output.
type healthSummary struct {
	Summary struct {
		TotalKpis    int  `json:"totalKpis"`
		Ok           int  `json:"ok"`
		Warn         int  `json:"warn"`
		Fail         int  `json:"fail"`
		HardGatePass bool `json:"hardGatePass"`
	} `json:"summary"`
	Kpis []struct {
		Id     string  `json:"id"`
		Value  float64 `json:"value"`
		Status string  `json:"status"`
	} `json:"kpis"`
}

// readHealthSnapshot loads architecture-health.json and returns
// (repoHealth map, openObligations).
func readHealthSnapshot(repoRoot string) (map[string]interface{}, int) {
	path := filepath.Join(repoRoot, "references", "04-tracking", "generated", "architecture-health.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return map[string]interface{}{
			"hardGate": "unknown",
			"kpi":      "unknown (architecture-health.json not readable)",
		}, 0
	}
	var h healthSummary
	if err := json.Unmarshal(raw, &h); err != nil {
		return map[string]interface{}{
			"hardGate": "unknown",
			"kpi":      "unknown (architecture-health.json parse error)",
		}, 0
	}
	hardGate := "fail"
	if h.Summary.HardGatePass {
		hardGate = "pass"
	}
	repoHealth := map[string]interface{}{
		"hardGate": hardGate,
		"kpi":      fmt.Sprintf("%d/%d OK", h.Summary.Ok, h.Summary.TotalKpis),
	}
	if h.Summary.Warn > 0 {
		repoHealth["warn"] = h.Summary.Warn
	}
	if h.Summary.Fail > 0 {
		repoHealth["fail"] = h.Summary.Fail
	}

	// open obligations = sum of `docs.obligation.violations` value
	openObligations := 0
	for _, kpi := range h.Kpis {
		if kpi.Id == "docs.obligation.violations" {
			openObligations = int(kpi.Value)
			break
		}
	}
	return repoHealth, openObligations
}

// recommendNextCommand suggests the next command for the AI session based on
// the current state.
func recommendNextCommand(activeProject *string, openObligations int) string {
	if openObligations > 0 {
		return "cd app && npm run docs:generate  # then commit and re-push to clear obligations"
	}
	if activeProject != nil {
		return fmt.Sprintf("aag context --project %s", *activeProject)
	}
	return "aag stats files --above p95 --limit 10"
}

// MarshalJSON returns indented JSON without HTML escaping (= AI consumer 読了性、
// task prepare / stats files と同 idiom)。
func MarshalJSON(out interface{}) ([]byte, error) {
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
