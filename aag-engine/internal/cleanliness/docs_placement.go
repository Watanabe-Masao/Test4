package cleanliness

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// docs placement-check (= Wave 4 #17)
// ───────────────────────────────────────────────────────────────────────

// PlacementOutput is the JSON shape emitted by `aag docs placement-check`.
type PlacementOutput struct {
	SchemaVersion string                  `json:"schemaVersion"`
	Violations    []PlacementViolation    `json:"violations"`
	Stats         map[string]int          `json:"stats"`
	Conventions   []PlacementConvention   `json:"conventions"`
	Summary       string                  `json:"summary"`
}

type PlacementViolation struct {
	Path     string `json:"path"`
	Kind     string `json:"kind"`
	Reason   string `json:"reason"`
	Severity string `json:"severity"`
	Action   string `json:"action,omitempty"`
}

type PlacementConvention struct {
	Kind        string `json:"kind"`
	Description string `json:"description"`
	Path        string `json:"path"`
}

// PlacementSchemaVersion is the const articulated in PlacementOutput.
const PlacementSchemaVersion = "docs-placement-check-v1"

// Violation kinds for placement-check.
const (
	KindSchemaMisplaced    = "schema-misplaced"
	KindGeneratedMisplaced = "generated-misplaced"
)

// PlacementInput controls PlacementCheck.
type PlacementInput struct {
	RepoRoot string
}

// PlacementCheck scans the repo for doc placement convention violations.
//
// Conventions (= articulate される正しい配置):
//   - 長期方針 doc (.md):              references/
//   - active project doc:              projects/active/<id>/
//   - archived project doc:            projects/completed/<id>/ + Archive v2
//   - schema (.schema.json):           docs/contracts/
//   - generated artifact (*.generated.md, *.generated.json): references/04-tracking/generated/ or docs/generated/
//   - fixture:                         fixtures/
//
// Detection rules (MVP):
//   - schema-misplaced: *.schema.json outside of docs/contracts/
//   - generated-misplaced: *.generated.md outside of references/04-tracking/generated/ + docs/generated/
//
// Errors:
//   - RepoRoot empty → error
func PlacementCheck(input PlacementInput) (PlacementOutput, error) {
	if input.RepoRoot == "" {
		return PlacementOutput{}, fmt.Errorf("PlacementCheck: RepoRoot must be set")
	}

	violations := []PlacementViolation{}
	stats := map[string]int{}

	v1 := scanMisplacedSchemas(input.RepoRoot)
	violations = append(violations, v1...)
	stats[KindSchemaMisplaced] = len(v1)

	v2 := scanMisplacedGeneratedMd(input.RepoRoot)
	violations = append(violations, v2...)
	stats[KindGeneratedMisplaced] = len(v2)

	stats["total"] = len(violations)

	return PlacementOutput{
		SchemaVersion: PlacementSchemaVersion,
		Violations:    violations,
		Stats:         stats,
		Conventions:   placementConventions(),
		Summary:       summarizePlacement(stats),
	}, nil
}

func placementConventions() []PlacementConvention {
	return []PlacementConvention{
		{"long-term-policy", "長期方針 / 設計原則 / canonical 説明 doc", "references/"},
		{"active-project", "進行中 project の AI_CONTEXT / HANDOFF / plan / checklist 等", "projects/active/<id>/"},
		{"archived-project", "完了 project (= Archive v2 = ARCHIVE.md + archive.manifest.json)", "projects/completed/<id>/"},
		{"schema", "JSON Schema (= *.schema.json)", "docs/contracts/"},
		{"generated", "機械生成 artifact (= *.generated.md / *.json by docs:generate)", "references/04-tracking/generated/ or docs/generated/"},
		{"fixture", "test / detector fixture", "fixtures/"},
	}
}

func summarizePlacement(stats map[string]int) string {
	total := stats["total"]
	if total == 0 {
		return "Doc placement check: 0 violations. ✓"
	}
	parts := []string{}
	for _, k := range []string{KindSchemaMisplaced, KindGeneratedMisplaced} {
		if c := stats[k]; c > 0 {
			parts = append(parts, fmt.Sprintf("%s=%d", k, c))
		}
	}
	return fmt.Sprintf("%d violation(s): %s", total, strings.Join(parts, ", "))
}

// ───────────────────────────────────────────────────────────────────────
// scanners
// ───────────────────────────────────────────────────────────────────────

// schemaCanonicalDir = where *.schema.json files MUST live.
const schemaCanonicalDir = "docs/contracts"

// generatedCanonicalDirs = where *.generated.md and *.generated.json MUST live.
//
// 既存 codebase の articulate された generated artifact 配置規約:
//   - `references/04-tracking/` family (= 全 subdir 含む = generated/ + dashboards/ +
//     elements/ + recent-changes.generated.md 等の root-level も含む)
//   - `docs/generated/`
//
// references/04-tracking/ 全体を canonical として articulate (= 既存 codebase が
// 複数 subdir で generated artifact を articulate しており、それぞれ
// generatedFileEditGuard 対象として既に articulate 済)。
var generatedCanonicalDirs = []string{
	"references/04-tracking",
	"docs/generated",
}

// placementScanRoots = where placement-check walks. Excludes node_modules, .git, etc.
var placementScanRoots = []string{
	"app",
	"aag",
	"aag-engine",
	"docs",
	"references",
	"projects",
	"tools",
	"fixtures",
	".github",
	".claude",
}

func scanMisplacedSchemas(repoRoot string) []PlacementViolation {
	out := []PlacementViolation{}
	walkPlacementRoots(repoRoot, func(rel string) {
		if !strings.HasSuffix(rel, ".schema.json") {
			return
		}
		if isUnder(rel, schemaCanonicalDir) {
			return
		}
		// Allow schemas that are part of fixtures (= test data, not canonical schema)
		if isUnder(rel, "fixtures") {
			return
		}
		// Allow project-internal derived schemas (= projects/<id>/derived/、project の
		// 生成物 dir、template 規約整合)。canonical schema ではない、project-specific。
		if strings.Contains(rel, "/derived/") && (strings.HasPrefix(rel, "projects/active/") || strings.HasPrefix(rel, "projects/completed/")) {
			return
		}
		out = append(out, PlacementViolation{
			Path:     rel,
			Kind:     KindSchemaMisplaced,
			Reason:   fmt.Sprintf("*.schema.json file should live under %s/, not under %s", schemaCanonicalDir, dirOf(rel)),
			Severity: SeverityWarn,
			Action:   fmt.Sprintf("Move file to %s/ or rename if it is not a canonical schema", schemaCanonicalDir),
		})
	})
	sort.SliceStable(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out
}

func scanMisplacedGeneratedMd(repoRoot string) []PlacementViolation {
	out := []PlacementViolation{}
	walkPlacementRoots(repoRoot, func(rel string) {
		isGeneratedMd := strings.HasSuffix(rel, ".generated.md")
		isGeneratedJson := strings.HasSuffix(rel, ".generated.json")
		if !isGeneratedMd && !isGeneratedJson {
			return
		}
		// Allow under canonical generated dirs
		for _, d := range generatedCanonicalDirs {
			if isUnder(rel, d) {
				return
			}
		}
		// Allow fixtures (= test corpus may articulate generated-style names)
		if isUnder(rel, "fixtures") {
			return
		}
		out = append(out, PlacementViolation{
			Path:     rel,
			Kind:     KindGeneratedMisplaced,
			Reason:   "*.generated.md / *.generated.json should live under references/04-tracking/generated/ or docs/generated/",
			Severity: SeverityWarn,
			Action:   "Move file to references/04-tracking/generated/ or docs/generated/, OR rename if it is hand-authored",
		})
	})
	sort.SliceStable(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out
}

func walkPlacementRoots(repoRoot string, visit func(rel string)) {
	for _, root := range placementScanRoots {
		abs := filepath.Join(repoRoot, root)
		_ = filepath.WalkDir(abs, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				if shouldSkipPlacementDir(d.Name()) {
					return filepath.SkipDir
				}
				return nil
			}
			rel, _ := filepath.Rel(repoRoot, path)
			rel = filepath.ToSlash(rel)
			visit(rel)
			return nil
		})
	}
}

var placementSkipDirs = map[string]bool{
	"node_modules": true,
	".git":         true,
	"dist":         true,
	"build":        true,
	"coverage":     true,
	".next":        true,
	".cache":       true,
	".vercel":      true,
}

func shouldSkipPlacementDir(name string) bool {
	if strings.HasPrefix(name, ".") {
		// keep .github / .claude — they're scan roots
		if name == ".github" || name == ".claude" {
			return false
		}
		return true
	}
	return placementSkipDirs[name]
}

func isUnder(path, dir string) bool {
	return strings.HasPrefix(path, strings.TrimSuffix(dir, "/")+"/")
}

func dirOf(path string) string {
	idx := strings.LastIndex(path, "/")
	if idx < 0 {
		return "."
	}
	return path[:idx]
}
