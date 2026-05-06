// Package obligation implements `aag obligation check --changed-only` —
// Wave 5 #20 (= reposteward-ai-ops-platform、premise contract obligation check)。
//
// `aag/parameters/premise-contracts.json` を read-only に消費し、git diff で
// 変更された file に対して trigger 一致する premise contract の requirements を
// articulate する。Wave 3 #12 `aag changed --explain` の補完 (= changed は live
// obligation map、本 command は structural premise contract 駆動)。
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
//   1. JSON-first
//   3. Read-only first (= file 走査 + git read のみ)
//   4. 主検出は構造 (= path prefix match で trigger 検出、annotation 駆動ではない)
package obligation

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

// CheckOutput is the JSON shape emitted by `aag obligation check`.
type CheckOutput struct {
	SchemaVersion    string                  `json:"schemaVersion"`
	Base             string                  `json:"base"`
	Head             string                  `json:"head"`
	ChangedFiles     []string                `json:"changedFiles"`
	MatchedContracts []MatchedContract       `json:"matchedContracts"`
	Stats            map[string]int          `json:"stats"`
	Summary          string                  `json:"summary"`
}

// MatchedContract articulates a premise contract whose triggers fired.
type MatchedContract struct {
	ContractId      string                  `json:"contractId"`
	Label           string                  `json:"label"`
	MatchedTriggers []string                `json:"matchedTriggers"`
	Requirements    []ContractRequirement   `json:"requirements"`
}

// ContractRequirement mirrors PremiseRequirement (= schema definition).
type ContractRequirement struct {
	Path      string `json:"path"`
	Mode      string `json:"mode"`
	Rationale string `json:"rationale,omitempty"`
}

// CheckSchemaVersion is the const articulated in CheckOutput.
const CheckSchemaVersion = "obligation-check-v1"

// CheckInput controls Check.
type CheckInput struct {
	RepoRoot    string
	Base        string // default "main"
	Head        string // default "HEAD"
	ChangedOnly bool   // legacy flag; default true (= --changed-only is the only mode)
}

// Check runs git diff and matches changed files against premise contracts.
//
// Sources:
//   - aag/parameters/premise-contracts.json (= contract definitions)
//   - git diff --name-only <base>..<head>
//
// Errors:
//   - RepoRoot empty → error
//   - premise-contracts.json missing → error
//   - git diff fails → error (= base/head invalid)
func Check(input CheckInput) (CheckOutput, error) {
	if input.RepoRoot == "" {
		return CheckOutput{}, fmt.Errorf("Check: RepoRoot must be set")
	}
	base := input.Base
	if base == "" {
		base = "main"
	}
	head := input.Head
	if head == "" {
		head = "HEAD"
	}

	contracts, err := loadPremiseContracts(input.RepoRoot)
	if err != nil {
		return CheckOutput{}, err
	}

	files, err := gitDiffNames(input.RepoRoot, base, head)
	if err != nil {
		return CheckOutput{}, err
	}

	matched := matchContracts(contracts, files)
	stats := map[string]int{
		"changedFiles":     len(files),
		"matchedContracts": len(matched),
		"requirements":     totalRequirements(matched),
	}

	return CheckOutput{
		SchemaVersion:    CheckSchemaVersion,
		Base:             base,
		Head:             head,
		ChangedFiles:     files,
		MatchedContracts: matched,
		Stats:            stats,
		Summary:          summarize(stats, len(contracts)),
	}, nil
}

func summarize(stats map[string]int, totalContracts int) string {
	if stats["changedFiles"] == 0 {
		return "No files changed."
	}
	return fmt.Sprintf("%d changed file(s) matched %d/%d premise contract(s) → %d requirement(s) to articulate.",
		stats["changedFiles"], stats["matchedContracts"], totalContracts, stats["requirements"])
}

func totalRequirements(matched []MatchedContract) int {
	total := 0
	for _, m := range matched {
		total += len(m.Requirements)
	}
	return total
}

// ───────────────────────────────────────────────────────────────────────
// premise contract loading
// ───────────────────────────────────────────────────────────────────────

type premiseContract struct {
	Id      string `json:"id"`
	Label   string `json:"label"`
	Trigger struct {
		Paths []string `json:"paths"`
	} `json:"trigger"`
	Requires []struct {
		Path      string `json:"path"`
		Mode      string `json:"mode"`
		Rationale string `json:"rationale,omitempty"`
	} `json:"requires"`
}

func loadPremiseContracts(repoRoot string) ([]premiseContract, error) {
	path := filepath.Join(repoRoot, "aag", "parameters", "premise-contracts.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("Check: failed to read %s: %w (= hint: Wave 5 #19 で landing 済 must)", path, err)
	}
	var top struct {
		SchemaVersion string             `json:"schemaVersion"`
		Contracts     []premiseContract  `json:"contracts"`
	}
	if err := json.Unmarshal(raw, &top); err != nil {
		return nil, fmt.Errorf("Check: failed to parse %s: %w", path, err)
	}
	if top.SchemaVersion != "premise-contracts-v1" {
		return nil, fmt.Errorf("Check: schemaVersion must be 'premise-contracts-v1' (got %q)", top.SchemaVersion)
	}
	return top.Contracts, nil
}

// ───────────────────────────────────────────────────────────────────────
// matching
// ───────────────────────────────────────────────────────────────────────

func matchContracts(contracts []premiseContract, files []string) []MatchedContract {
	out := []MatchedContract{}
	for _, c := range contracts {
		matchedTriggers := []string{}
		for _, trigger := range c.Trigger.Paths {
			for _, f := range files {
				if pathMatchesTrigger(f, trigger) {
					matchedTriggers = append(matchedTriggers, f)
					break
				}
			}
		}
		if len(matchedTriggers) == 0 {
			continue
		}
		// Deduplicate trigger matches (= 同 file が複数 trigger に match した場合)
		matchedTriggers = dedupSorted(matchedTriggers)
		reqs := make([]ContractRequirement, 0, len(c.Requires))
		for _, r := range c.Requires {
			reqs = append(reqs, ContractRequirement{
				Path:      r.Path,
				Mode:      r.Mode,
				Rationale: r.Rationale,
			})
		}
		out = append(out, MatchedContract{
			ContractId:      c.Id,
			Label:           c.Label,
			MatchedTriggers: matchedTriggers,
			Requirements:    reqs,
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].ContractId < out[j].ContractId })
	return out
}

// pathMatchesTrigger checks whether a changed file matches a trigger path.
//
// Match rules:
//   - Exact match: trigger == file → true
//   - Prefix match: trigger ends with `/` (or no extension) → file starts with trigger + "/"
//   - Glob `**/*`: trigger ends with `**/*` or `/**` → prefix match
func pathMatchesTrigger(file, trigger string) bool {
	if file == trigger {
		return true
	}
	// Strip glob suffixes
	base := strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(trigger, "/**/*"), "/**"), "/*")
	if base != trigger {
		// trigger had a glob, do prefix match against base + "/"
		return strings.HasPrefix(file, base+"/")
	}
	// If trigger has no extension and not exact, treat as directory prefix
	if !strings.Contains(filepath.Base(trigger), ".") {
		return strings.HasPrefix(file, trigger+"/") || file == trigger
	}
	return false
}

func dedupSorted(items []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, s := range items {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	sort.Strings(out)
	return out
}

// ───────────────────────────────────────────────────────────────────────
// git
// ───────────────────────────────────────────────────────────────────────

func gitDiffNames(repoRoot, base, head string) ([]string, error) {
	cmd := exec.Command("git", "diff", "--name-only", base+".."+head)
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("Check: git diff failed (= base=%s head=%s): %w", base, head, err)
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	files := make([]string, 0, len(lines))
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l != "" {
			files = append(files, l)
		}
	}
	sort.Strings(files)
	return files, nil
}
