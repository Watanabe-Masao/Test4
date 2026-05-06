// Package commentscan implements `aag comments list` — Wave 4 #16
// (= reposteward-ai-ops-platform、Comment governance scan)。
//
// repo 内 TS/TSX/Go file を read-only に scan、articulate されたコメント (= TODO /
// FIXME / XXX / suppression / expired) を kind 別に list する。AI session が腐敗
// したコメントを検出して整理する起点。
//
// 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
//   1. JSON-first
//   3. Read-only first
//   4. 主検出は構造、annotation は補助 (= 本 command は annotation を articulate するが
//      detection は line pattern + path filter 駆動、annotation 解釈は補助 articulate のみ)
package commentscan

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// CommentKind enumerates the 3 kinds the command supports.
type CommentKind string

const (
	KindTodo        CommentKind = "todo"
	KindSuppression CommentKind = "suppression"
	KindExpired     CommentKind = "expired"
)

// IsValidKind reports whether k matches a supported kind.
func IsValidKind(k string) bool {
	switch CommentKind(k) {
	case KindTodo, KindSuppression, KindExpired:
		return true
	}
	return false
}

// ListOutput is the JSON shape emitted by `aag comments list`.
type ListOutput struct {
	SchemaVersion string         `json:"schemaVersion"`
	Kind          string         `json:"kind"`
	TotalScanned  int            `json:"totalScanned"`
	Items         []CommentEntry `json:"items"`
	Summary       string         `json:"summary"`
}

// CommentEntry articulates a single comment finding.
type CommentEntry struct {
	Path           string   `json:"path"`
	Line           int      `json:"line"`
	Text           string   `json:"text"`
	MissingFields  []string `json:"missingFields,omitempty"`
	Annotations    []string `json:"annotations,omitempty"`
	ExpiresAt      string   `json:"expiresAt,omitempty"`
}

// ListSchemaVersion is the const articulated in ListOutput.
const ListSchemaVersion = "comments-list-v1"

// ListInput controls List.
type ListInput struct {
	RepoRoot string
	Kind     CommentKind
	Today    time.Time // for expired check; default = time.Now() UTC
}

// List scans the repo and returns comments matching the requested kind.
//
// Errors:
//   - RepoRoot empty → error
//   - Kind invalid → error
func List(input ListInput) (ListOutput, error) {
	if input.RepoRoot == "" {
		return ListOutput{}, fmt.Errorf("List: RepoRoot must be set")
	}
	if !IsValidKind(string(input.Kind)) {
		return ListOutput{}, fmt.Errorf("List: invalid kind %q (= must be 'todo' / 'suppression' / 'expired')", input.Kind)
	}

	today := input.Today
	if today.IsZero() {
		today = time.Now().UTC()
	}

	scanned := 0
	items := []CommentEntry{}

	for _, dir := range scanDirs {
		abs := filepath.Join(input.RepoRoot, dir)
		_ = filepath.WalkDir(abs, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				if shouldSkipDir(d.Name()) {
					return filepath.SkipDir
				}
				return nil
			}
			if !isScannableFile(path) {
				return nil
			}
			scanned++
			rel, _ := filepath.Rel(input.RepoRoot, path)
			rel = filepath.ToSlash(rel)
			items = append(items, scanFile(path, rel, input.Kind, today)...)
			return nil
		})
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Path != items[j].Path {
			return items[i].Path < items[j].Path
		}
		return items[i].Line < items[j].Line
	})

	return ListOutput{
		SchemaVersion: ListSchemaVersion,
		Kind:          string(input.Kind),
		TotalScanned:  scanned,
		Items:         items,
		Summary:       fmt.Sprintf("%d comment(s) of kind=%s across %d scanned file(s).", len(items), input.Kind, scanned),
	}, nil
}

// ───────────────────────────────────────────────────────────────────────
// scanning
// ───────────────────────────────────────────────────────────────────────

var scanDirs = []string{
	"app/src",
	"aag-engine",
	"tools/architecture-health/src",
}

var alwaysSkipDirs = map[string]bool{
	"node_modules": true,
	".git":         true,
	"dist":         true,
	"build":        true,
	"coverage":     true,
	".next":        true,
}

func shouldSkipDir(name string) bool {
	if strings.HasPrefix(name, ".") && name != ".claude" {
		return true
	}
	return alwaysSkipDirs[name]
}

func isScannableFile(path string) bool {
	switch {
	case strings.HasSuffix(path, ".ts"):
	case strings.HasSuffix(path, ".tsx"):
	case strings.HasSuffix(path, ".go"):
	default:
		return false
	}
	return true
}

// todoPattern matches `// TODO` / `// FIXME` / `// XXX` where the keyword
// appears **immediately after** the `//` (= start of comment) AND is followed
// by actual content (= `:` または `[A-Za-z]`、not by `/` / end-of-line). This
// excludes false positives where the keyword is mentioned inside prose
// (e.g., `// FIXME / XXX / ...` という docstring 記述)。
var todoPattern = regexp.MustCompile(`(?i)//\s*(TODO|FIXME|XXX)\b\s*[:(]|//\s*(TODO|FIXME|XXX)\s+[A-Za-z]`)

// suppressionPattern matches common suppression idioms.
var suppressionPattern = regexp.MustCompile(`//\s*(eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck)`)

// expiresAtPattern matches `expiresAt: YYYY-MM-DD` or `@expiresAt YYYY-MM-DD`
// inside a comment line.
var expiresAtPattern = regexp.MustCompile(`(?i)(?:expires[Aa]t|@expires[Aa]t)\s*[:=]?\s*(\d{4}-\d{2}-\d{2})`)

// projectIdPattern matches `projectId: <kebab>` or `@projectId <kebab>` inside a comment.
var projectIdPattern = regexp.MustCompile(`(?i)(?:projectId|@projectId)\s*[:=]?\s*([a-z0-9][a-z0-9-]*)`)

// reviewAfterPattern matches `reviewAfter: YYYY-MM-DD`.
var reviewAfterPattern = regexp.MustCompile(`(?i)(?:reviewAfter|@reviewAfter)\s*[:=]?\s*(\d{4}-\d{2}-\d{2})`)

// reasonPattern matches `reason: <text>` or `@reason <text>`.
var reasonPattern = regexp.MustCompile(`(?i)(?:reason|@reason)\s*[:=]\s*\S`)

func scanFile(absPath, relPath string, kind CommentKind, today time.Time) []CommentEntry {
	out := []CommentEntry{}
	f, err := os.Open(absPath)
	if err != nil {
		return out
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		switch kind {
		case KindTodo:
			if todoPattern.MatchString(line) {
				out = append(out, makeTodoEntry(relPath, lineNum, line))
			}
		case KindSuppression:
			if suppressionPattern.MatchString(line) {
				out = append(out, makeSuppressionEntry(relPath, lineNum, line))
			}
		case KindExpired:
			if m := expiresAtPattern.FindStringSubmatch(line); m != nil {
				if expired, expDate := isExpired(m[1], today); expired {
					out = append(out, CommentEntry{
						Path:      relPath,
						Line:      lineNum,
						Text:      strings.TrimSpace(line),
						ExpiresAt: expDate,
					})
				}
			}
		}
	}
	return out
}

func makeTodoEntry(path string, line int, text string) CommentEntry {
	missing := []string{}
	hasProjectId := projectIdPattern.MatchString(text)
	hasReviewAfter := reviewAfterPattern.MatchString(text)
	if !hasProjectId && !hasReviewAfter {
		missing = append(missing, "projectId or reviewAfter")
	}
	annotations := []string{}
	if hasProjectId {
		annotations = append(annotations, "projectId")
	}
	if hasReviewAfter {
		annotations = append(annotations, "reviewAfter")
	}
	return CommentEntry{
		Path:          path,
		Line:          line,
		Text:          strings.TrimSpace(text),
		MissingFields: missing,
		Annotations:   annotations,
	}
}

func makeSuppressionEntry(path string, line int, text string) CommentEntry {
	missing := []string{}
	hasReason := reasonPattern.MatchString(text)
	hasExpires := expiresAtPattern.MatchString(text)
	if !hasReason {
		missing = append(missing, "reason")
	}
	if !hasExpires {
		missing = append(missing, "expiresAt")
	}
	annotations := []string{}
	if hasReason {
		annotations = append(annotations, "reason")
	}
	if hasExpires {
		annotations = append(annotations, "expiresAt")
	}
	return CommentEntry{
		Path:          path,
		Line:          line,
		Text:          strings.TrimSpace(text),
		MissingFields: missing,
		Annotations:   annotations,
	}
}

func isExpired(dateStr string, today time.Time) (bool, string) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return false, ""
	}
	if t.Before(today.Truncate(24 * time.Hour)) {
		return true, dateStr
	}
	return false, dateStr
}
