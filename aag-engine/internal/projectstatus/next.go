package projectstatus

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"aag-engine/internal/navigation"
)

// gitCmd returns an *exec.Cmd configured to run from repoRoot.
func gitCmd(repoRoot string, args ...string) *exec.Cmd {
	cmd := exec.Command("git", args...)
	cmd.Dir = repoRoot
	return cmd
}

// ───────────────────────────────────────────────────────────────────────
// next (= Wave 5 #23、AI session の next action recommendation)
// ───────────────────────────────────────────────────────────────────────

// NextOutput is the JSON shape emitted by `aag next`.
type NextOutput struct {
	SchemaVersion       string   `json:"schemaVersion"`
	Branch              string   `json:"branch"`
	ActiveProject       *string  `json:"activeProject"`
	HardGate            string   `json:"hardGate"`
	WorkingTreeClean    bool     `json:"workingTreeClean"`
	UncheckedItemsCount int      `json:"uncheckedItemsCount"`
	RecommendedActions  []string `json:"recommendedActions"`
	Reasoning           []string `json:"reasoning"`
}

// NextSchemaVersion is the schemaVersion const articulated in NextOutput.
const NextSchemaVersion = "next-v1"

// NextInput controls the Next function.
type NextInput struct {
	RepoRoot string
}

// Next composes a recommendation for the AI session's next action by combining
// where-am-i state + working tree state + active project context.
//
// Recommendation rules (= priority order):
//   1. Working tree dirty → commit + push
//   2. openObligations > 0 → docs:generate + sync
//   3. activeProject + unchecked items → continue articulated checklist
//   4. activeProject + checklist clean → consider close / final review
//   5. main branch / no project → list active projects
func Next(input NextInput) (NextOutput, error) {
	if input.RepoRoot == "" {
		return NextOutput{}, fmt.Errorf("Next: RepoRoot must be set")
	}

	// Reuse where-am-i for branch / activeProject / repoHealth / openObligations
	wai, err := navigation.WhereAmI(navigation.WhereAmIInput{RepoRoot: input.RepoRoot})
	if err != nil {
		return NextOutput{}, fmt.Errorf("Next: WhereAmI failed: %w", err)
	}

	hardGate := "unknown"
	if hg, ok := wai.RepoHealth["hardGate"].(string); ok {
		hardGate = hg
	}

	dirty, err := isWorkingTreeDirty(input.RepoRoot)
	if err != nil {
		dirty = false
	}

	uncheckedCount := 0
	if wai.ActiveProject != nil {
		uncheckedCount = countUnchecked(input.RepoRoot, *wai.ActiveProject)
	}

	actions := []string{}
	reasoning := []string{}

	// Rule 1: working tree dirty
	if dirty {
		actions = append(actions, "git add -A && commit (= articulate the change with a 1-line summary)")
		actions = append(actions, "git push -u origin "+wai.Branch)
		reasoning = append(reasoning, "working tree has uncommitted changes — commit + push first")
	}

	// Rule 2: open obligations
	if wai.OpenObligations > 0 {
		actions = append(actions, "cd app && npm run docs:generate")
		actions = append(actions, "git add -A && commit + push (= sync obligation closure)")
		reasoning = append(reasoning, fmt.Sprintf("openObligations=%d — must clear before further work", wai.OpenObligations))
	}

	// Rule 3: active project + unchecked items
	if wai.ActiveProject != nil && uncheckedCount > 0 {
		actions = append(actions, fmt.Sprintf("aag context --project %s  # articulate next checklist item(s)", *wai.ActiveProject))
		reasoning = append(reasoning, fmt.Sprintf("activeProject=%s has %d unchecked item(s) — continue articulated work", *wai.ActiveProject, uncheckedCount))
	}

	// Rule 4: active project + checklist clean
	if wai.ActiveProject != nil && uncheckedCount == 0 && !dirty {
		actions = append(actions, "aag task prepare --project "+*wai.ActiveProject+" --intent 'final review'")
		actions = append(actions, "Run final checks: cd app && npm run test:guards / cd app && npm run docs:check / cd aag-engine && go test ./...")
		actions = append(actions, "Coordinate with user for final approval (= L3 + requiresHumanApproval)")
		reasoning = append(reasoning, fmt.Sprintf("activeProject=%s checklist clean — consider close phase", *wai.ActiveProject))
	}

	// Rule 5: no active project
	if wai.ActiveProject == nil && !dirty {
		actions = append(actions, "Inspect references/04-tracking/open-issues.md  # list active projects")
		actions = append(actions, "aag stats files --above p95 --limit 10  # find outlier files for refactor candidates")
		reasoning = append(reasoning, fmt.Sprintf("no active project on branch=%s — choose next focus", wai.Branch))
	}

	// Rule 6: hardGate fail → must fix
	if hardGate != "pass" {
		actions = append(actions, "Investigate Hard Gate failures via cd app && npm run docs:check")
		reasoning = append(reasoning, fmt.Sprintf("repoHealth.hardGate=%q — must restore PASS before close", hardGate))
	}

	// Default fallback
	if len(actions) == 0 {
		actions = append(actions, "aag where-am-i  # confirm current state")
		reasoning = append(reasoning, "no specific next action identified — re-examine state")
	}

	return NextOutput{
		SchemaVersion:       NextSchemaVersion,
		Branch:              wai.Branch,
		ActiveProject:       wai.ActiveProject,
		HardGate:            hardGate,
		WorkingTreeClean:    !dirty,
		UncheckedItemsCount: uncheckedCount,
		RecommendedActions:  actions,
		Reasoning:           reasoning,
	}, nil
}

// isWorkingTreeDirty returns true if `git status --porcelain` produces output.
func isWorkingTreeDirty(repoRoot string) (bool, error) {
	cmd := gitCmd(repoRoot, "status", "--porcelain")
	out, err := cmd.Output()
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(string(out)) != "", nil
}

// countUnchecked counts unchecked items in the project's checklist.md.
func countUnchecked(repoRoot, projectId string) int {
	path := filepath.Join(repoRoot, "projects", "active", projectId, "checklist.md")
	raw, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	count := 0
	skipSection := false
	for _, line := range strings.Split(string(raw), "\n") {
		trimmed := strings.TrimSpace(line)
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
		if strings.HasPrefix(trimmed, "- [ ] ") || strings.HasPrefix(trimmed, "* [ ] ") {
			count++
		}
	}
	return count
}
