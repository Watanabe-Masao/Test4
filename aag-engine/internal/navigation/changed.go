package navigation

import (
	"fmt"
	"os/exec"
	"sort"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// changed --explain (= Wave 3 #12)
// ───────────────────────────────────────────────────────────────────────

// ChangedOutput is the JSON shape emitted by `aag changed --explain`.
type ChangedOutput struct {
	SchemaVersion string                 `json:"schemaVersion"`
	Base          string                 `json:"base"`
	Head          string                 `json:"head"`
	ChangedFiles  []string               `json:"changedFiles"`
	ByArea        map[string][]string    `json:"byArea"`
	Obligations   []ChangedObligation    `json:"obligations"`
	RequiredReads []string               `json:"requiredReads"`
	Summary       string                 `json:"summary"`
}

type ChangedObligation struct {
	ObligationId string   `json:"obligationId"`
	Label        string   `json:"label"`
	MatchedFiles []string `json:"matchedFiles"`
	Action       string   `json:"action"`
}

// ChangedSchemaVersion is the schemaVersion const articulated in ChangedOutput.
const ChangedSchemaVersion = "changed-explain-v1"

// ChangedInput controls Changed() behavior.
type ChangedInput struct {
	RepoRoot string
	Base     string // default: "main"
	Head     string // default: "HEAD"
}

// Changed runs git diff between base and head, classifies the changed files
// by path prefix, and articulates obligations / requiredReads / per-area summary.
//
// Sources:
//   - git diff --name-only <base>..<head>
//   - hardcoded OBLIGATION_RULES (= subset of TS-side obligation-collector.ts
//     OBLIGATION_MAP、AAG governance の実 obligation 集合の mirror)
//   - hardcoded AREA_RULES (= path prefix → area name 分類)
func Changed(input ChangedInput) (ChangedOutput, error) {
	if input.RepoRoot == "" {
		return ChangedOutput{}, fmt.Errorf("Changed: RepoRoot must be set")
	}
	base := input.Base
	if base == "" {
		base = "main"
	}
	head := input.Head
	if head == "" {
		head = "HEAD"
	}

	files, err := gitDiffNames(input.RepoRoot, base, head)
	if err != nil {
		return ChangedOutput{}, err
	}

	byArea := classifyByArea(files)
	obligations := matchObligations(files)
	requiredReads := collectRequiredReads(files)
	summary := summarizeChange(len(files), byArea, obligations)

	return ChangedOutput{
		SchemaVersion: ChangedSchemaVersion,
		Base:          base,
		Head:          head,
		ChangedFiles:  files,
		ByArea:        byArea,
		Obligations:   obligations,
		RequiredReads: requiredReads,
		Summary:       summary,
	}, nil
}

// gitDiffNames returns the list of changed file names between base and head.
// Errors when git is missing or refs are invalid.
func gitDiffNames(repoRoot, base, head string) ([]string, error) {
	cmd := exec.Command("git", "diff", "--name-only", base+".."+head)
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("Changed: git diff failed (= base=%s head=%s): %w", base, head, err)
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

// areaRule maps a path prefix to a short area name.
type areaRule struct {
	prefix string
	area   string
}

var areaRules = []areaRule{
	{"app/src/test/guards/", "guards"},
	{"app/src/test/audits/", "audits"},
	{"app/src/test/allowlists/", "allowlists"},
	{"app/src/test/", "test-infra"},
	{"app/src/domain/calculations/", "domain-calculations"},
	{"app/src/domain/", "domain"},
	{"app/src/application/readModels/", "application-readmodels"},
	{"app/src/application/hooks/", "application-hooks"},
	{"app/src/application/", "application"},
	{"app/src/infrastructure/", "infrastructure"},
	{"app/src/presentation/", "presentation"},
	{"app/src/features/", "features"},
	{"aag-engine/internal/", "aag-engine-internal"},
	{"aag-engine/cmd/", "aag-engine-cmd"},
	{"aag-engine/", "aag-engine"},
	{"tools/architecture-health/", "tools-health"},
	{"tools/", "tools"},
	{"docs/contracts/aag/", "aag-contracts"},
	{"docs/contracts/", "contracts"},
	{"docs/", "docs"},
	{"references/04-tracking/generated/", "generated"},
	{"references/04-tracking/", "tracking"},
	{"references/", "references"},
	{"projects/active/", "projects-active"},
	{"projects/completed/", "projects-completed"},
	{"projects/", "projects"},
	{".github/workflows/", "ci"},
	{".claude/", "harness"},
	{"aag/", "aag-framework"},
	{"wasm/", "wasm"},
}

func classifyByArea(files []string) map[string][]string {
	out := map[string][]string{}
	for _, f := range files {
		area := "other"
		for _, r := range areaRules {
			if strings.HasPrefix(f, r.prefix) {
				area = r.area
				break
			}
		}
		out[area] = append(out[area], f)
	}
	return out
}

// obligationRule mirrors a subset of TS-side OBLIGATION_MAP.
type obligationRule struct {
	id     string
	prefix string
	label  string
	action string
}

// obligationRules is the Go-side mirror subset of OBLIGATION_MAP.
//
// Wave 3 #12 MVP では governance 観点で AI session が即値で articulate したい
// path prefix を articulate。完全 mirror は別 step で検討 (= TS-side 18 rule
// すべての mirror は scope 大、本 MVP は core 9 rule で articulate)。
var obligationRules = []obligationRule{
	{"obligation.allowlist.health", "app/src/test/allowlists/", "Allowlist 変更時は health regeneration が必要", "cd app && npm run docs:generate"},
	{"obligation.guard.health", "app/src/test/guards/", "Guard 変更時は health regeneration が必要", "cd app && npm run docs:generate"},
	{"obligation.audit.health", "app/src/test/audits/", "Audit 変更時は health regeneration が必要", "cd app && npm run docs:generate"},
	{"obligation.calculation.registry", "app/src/domain/calculations/", "計算ファイル変更時は calculationCanonRegistry 確認が必要", "Inspect app/src/test/calculationCanonRegistry.ts"},
	{"obligation.readModel.definition", "app/src/application/readModels/", "readModel 変更時は定義書リンク確認が必要", "Cross-check references/01-foundation/<readModel>-definition.md"},
	{"obligation.principles.contracts", "references/01-foundation/", "設計原則変更時は principles.json 確認が必要", "Inspect docs/contracts/principles.json"},
	{"obligation.ci.metadata", ".github/workflows/", "CI workflow 変更時は project-metadata.json 確認が必要", "Inspect docs/contracts/project-metadata.json"},
	{"obligation.health-tool.regenerate", "tools/architecture-health/", "Health ツール変更時は docs:generate 再実行が必要", "cd app && npm run docs:generate"},
	{"obligation.aag-engine.gotest", "aag-engine/", "AAG Engine 変更時は go test 再実行が必要", "cd aag-engine && go test ./..."},
	{"obligation.aag-contracts.schema-sync", "docs/contracts/aag/", "AAG schema 変更時は対応する Go / TS bind の sync 確認が必要", "Re-run go test ./internal/contract/... + cd app && npx vitest run src/test/guards/aagContractSchemaSyncGuard.test.ts"},
	{"obligation.project.checklist-format", "projects/active/", "Active project 変更時は checklist format / docs:generate 確認が必要", "cd app && npm run docs:generate"},
}

func matchObligations(files []string) []ChangedObligation {
	out := []ChangedObligation{}
	for _, rule := range obligationRules {
		matched := []string{}
		for _, f := range files {
			if strings.HasPrefix(f, rule.prefix) {
				matched = append(matched, f)
			}
		}
		if len(matched) > 0 {
			out = append(out, ChangedObligation{
				ObligationId: rule.id,
				Label:        rule.label,
				MatchedFiles: matched,
				Action:       rule.action,
			})
		}
	}
	return out
}

// requiredReadsByPrefix mirrors a subset of PATH_TO_REQUIRED_READS for the
// changed-explain command。AI session が変更後に読むべき canonical doc を
// path prefix → reads でマップする。
var requiredReadsByPrefix = map[string][]string{
	"app/src/test/guards/":              {"references/03-implementation/architecture-rule-system.md", "references/03-implementation/allowlist-management.md"},
	"app/src/test/allowlists/":          {"references/03-implementation/allowlist-management.md"},
	"app/src/domain/calculations/":      {"references/01-foundation/calculation-canonicalization-map.md", "references/01-foundation/canonicalization-principles.md"},
	"app/src/application/readModels/":   {"references/01-foundation/canonicalization-principles.md"},
	"references/01-foundation/":         {"docs/contracts/principles.json"},
	"tools/architecture-health/":        {"references/04-tracking/generated/architecture-health.json"},
	"aag-engine/":                       {"projects/completed/aag-engine-go-mvp/ARCHIVE.md", "aag/CHANGELOG.md"},
	"docs/contracts/aag/":               {"aag/CHANGELOG.md", "aag/_internal/source-of-truth.md"},
	"projects/active/":                  {"references/05-aag-interface/operations/project-checklist-governance.md"},
	".github/workflows/":                {"docs/contracts/project-metadata.json"},
}

func collectRequiredReads(files []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, f := range files {
		for prefix, reads := range requiredReadsByPrefix {
			if strings.HasPrefix(f, prefix) {
				for _, r := range reads {
					if !seen[r] {
						seen[r] = true
						out = append(out, r)
					}
				}
			}
		}
	}
	sort.Strings(out)
	return out
}

func summarizeChange(totalFiles int, byArea map[string][]string, obligations []ChangedObligation) string {
	if totalFiles == 0 {
		return "No files changed."
	}
	areaCount := len(byArea)
	obligationCount := len(obligations)
	return fmt.Sprintf("%d file(s) changed across %d area(s). %d obligation(s) matched. Inspect requiredReads + obligations.action for next steps.", totalFiles, areaCount, obligationCount)
}
