// Package projectstatus implements `aag project stale` and helpers for
// `aag next` — Wave 5 #23 (= reposteward-ai-ops-platform、Wave 5 final step)。
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first (= file 走査 + git log のみ)
package projectstatus

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// StaleOutput is the JSON shape emitted by `aag project stale`.
type StaleOutput struct {
	SchemaVersion string         `json:"schemaVersion"`
	StaleDays     int            `json:"staleDays"`
	Today         string         `json:"today"`
	StaleProjects []StaleProject `json:"staleProjects"`
	FreshProjects []StaleProject `json:"freshProjects"`
	Summary       string         `json:"summary"`
}

// StaleProject articulates one project's staleness state.
type StaleProject struct {
	ProjectId       string `json:"projectId"`
	LastCommit      string `json:"lastCommit,omitempty"`
	LastCommitDate  string `json:"lastCommitDate,omitempty"`
	DaysSinceCommit int    `json:"daysSinceCommit"`
	IsStale         bool   `json:"isStale"`
}

// StaleSchemaVersion is the schemaVersion const articulated in StaleOutput.
const StaleSchemaVersion = "project-stale-v1"

// StaleInput controls the Stale function.
type StaleInput struct {
	RepoRoot  string
	StaleDays int       // threshold days; 0 → default 30
	Today     time.Time // 0 → time.Now() UTC
}

// Stale walks projects/active/ and articulates each project's staleness based
// on the last commit affecting that project's directory.
//
// quick-fixes is excluded (= long-running collection, never stale by design)。
func Stale(input StaleInput) (StaleOutput, error) {
	if input.RepoRoot == "" {
		return StaleOutput{}, fmt.Errorf("Stale: RepoRoot must be set")
	}
	staleDays := input.StaleDays
	if staleDays <= 0 {
		staleDays = 30
	}
	today := input.Today
	if today.IsZero() {
		today = time.Now().UTC()
	}

	activeDir := filepath.Join(input.RepoRoot, "projects", "active")
	entries, err := os.ReadDir(activeDir)
	if err != nil {
		return StaleOutput{}, fmt.Errorf("Stale: failed to read %s: %w", activeDir, err)
	}

	stale := []StaleProject{}
	fresh := []StaleProject{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if name == "_template" || name == "quick-fixes" {
			continue
		}
		projectDir := filepath.Join("projects", "active", name)
		commit, dateStr, days, ok := lastCommitInfo(input.RepoRoot, projectDir, today)
		entry := StaleProject{
			ProjectId:       name,
			DaysSinceCommit: days,
		}
		if ok {
			entry.LastCommit = commit
			entry.LastCommitDate = dateStr
		}
		if days > staleDays {
			entry.IsStale = true
			stale = append(stale, entry)
		} else {
			fresh = append(fresh, entry)
		}
	}

	sort.SliceStable(stale, func(i, j int) bool { return stale[i].DaysSinceCommit > stale[j].DaysSinceCommit })
	sort.SliceStable(fresh, func(i, j int) bool { return fresh[i].DaysSinceCommit < fresh[j].DaysSinceCommit })

	summary := fmt.Sprintf("%d stale project(s) (= no commit in last %d days). %d fresh project(s).",
		len(stale), staleDays, len(fresh))

	return StaleOutput{
		SchemaVersion: StaleSchemaVersion,
		StaleDays:     staleDays,
		Today:         today.Format("2006-01-02"),
		StaleProjects: stale,
		FreshProjects: fresh,
		Summary:       summary,
	}, nil
}

// lastCommitInfo returns the latest commit affecting the given project dir.
// Returns (sha, dateStr, daysSince, ok). When git log returns nothing, ok=false
// and daysSince = 9999 (= effectively very stale).
func lastCommitInfo(repoRoot, projectDir string, today time.Time) (string, string, int, bool) {
	cmd := exec.Command("git", "log", "-1", "--format=%H|%cd", "--date=short", "--", projectDir)
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err != nil {
		return "", "", 9999, false
	}
	line := strings.TrimSpace(string(out))
	if line == "" {
		return "", "", 9999, false
	}
	parts := strings.SplitN(line, "|", 2)
	if len(parts) != 2 {
		return "", "", 9999, false
	}
	sha := parts[0]
	dateStr := parts[1]
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return sha, dateStr, 9999, false
	}
	days := int(today.Truncate(24*time.Hour).Sub(t).Hours() / 24)
	if days < 0 {
		days = 0
	}
	return sha, dateStr, days, true
}
