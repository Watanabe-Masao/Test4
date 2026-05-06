package navigation

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// rule locate (= Wave 3 #13)
// ───────────────────────────────────────────────────────────────────────

// RuleLocateOutput is the JSON shape emitted by `aag rule locate <ruleId>`.
type RuleLocateOutput struct {
	SchemaVersion string                 `json:"schemaVersion"`
	RuleId        string                 `json:"ruleId"`
	Slice         string                 `json:"slice,omitempty"`
	What          string                 `json:"what,omitempty"`
	Why           string                 `json:"why,omitempty"`
	Doc           string                 `json:"doc,omitempty"`
	PrincipleRefs []string               `json:"principleRefs,omitempty"`
	Thresholds    map[string]interface{} `json:"thresholds,omitempty"`
	Definition    string                 `json:"definition"`
	Guards        []string               `json:"guards"`
	Parameters    []string               `json:"parameters,omitempty"`
}

// RuleLocateSchemaVersion is the const articulated in RuleLocateOutput.
const RuleLocateSchemaVersion = "rule-locate-v1"

// RuleLocateInput controls RuleLocate.
type RuleLocateInput struct {
	RepoRoot string
	RuleId   string
}

// RuleLocate finds a rule by ruleId in the merged architecture rules registry
// and articulates its definition + guards + docs + thresholds.
//
// Sources:
//   - docs/generated/aag/merged-architecture-rules.json (= rule registry)
//   - app/src/test/guards/*.ts + app/src/test/audits/*.ts (= grep for ruleId references)
//   - canonical definition path: app-domain/gross-profit/rule-catalog/base-rules.ts
//
// Errors:
//   - RepoRoot / RuleId empty → error
//   - merged-architecture-rules.json missing → error
//   - ruleId not found → error with hint listing nearest matches
func RuleLocate(input RuleLocateInput) (RuleLocateOutput, error) {
	if input.RepoRoot == "" {
		return RuleLocateOutput{}, fmt.Errorf("RuleLocate: RepoRoot must be set")
	}
	if input.RuleId == "" {
		return RuleLocateOutput{}, fmt.Errorf("RuleLocate: RuleId must be set")
	}

	rules, err := loadMergedRules(input.RepoRoot)
	if err != nil {
		return RuleLocateOutput{}, err
	}

	rule := findRuleById(rules, input.RuleId)
	if rule == nil {
		hint := suggestSimilarRuleIds(rules, input.RuleId, 5)
		return RuleLocateOutput{}, fmt.Errorf("RuleLocate: ruleId %q not found in merged-architecture-rules.json (= %d rules registered). Similar: %s", input.RuleId, len(rules), strings.Join(hint, ", "))
	}

	guards := findGuardsReferencingRule(input.RepoRoot, input.RuleId)

	out := RuleLocateOutput{
		SchemaVersion: RuleLocateSchemaVersion,
		RuleId:        input.RuleId,
		Slice:         rule.Slice,
		What:          rule.What,
		Why:           rule.Why,
		Doc:           rule.Doc,
		PrincipleRefs: rule.PrincipleRefs,
		Thresholds:    rule.Thresholds,
		Definition:    "app-domain/gross-profit/rule-catalog/base-rules.ts",
		Guards:        guards,
	}
	if len(rule.PrincipleRefs) == 0 {
		out.PrincipleRefs = nil
	}
	if rule.Thresholds == nil {
		out.Thresholds = nil
	}
	return out, nil
}

// mergedRule mirrors a single rule entry in merged-architecture-rules.json.
// We only mirror the fields aag rule locate articulates.
type mergedRule struct {
	Id            string                 `json:"id"`
	Slice         string                 `json:"slice"`
	What          string                 `json:"what"`
	Why           string                 `json:"why"`
	Doc           string                 `json:"doc"`
	PrincipleRefs []string               `json:"principleRefs"`
	Thresholds    map[string]interface{} `json:"thresholds"`
}

// loadMergedRules reads the merged-architecture-rules.json registry.
func loadMergedRules(repoRoot string) ([]mergedRule, error) {
	path := filepath.Join(repoRoot, "docs", "generated", "aag", "merged-architecture-rules.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("RuleLocate: failed to read %s: %w", path, err)
	}
	var top struct {
		Rules []mergedRule `json:"rules"`
	}
	if err := json.Unmarshal(raw, &top); err != nil {
		return nil, fmt.Errorf("RuleLocate: failed to parse %s: %w", path, err)
	}
	return top.Rules, nil
}

func findRuleById(rules []mergedRule, id string) *mergedRule {
	for i := range rules {
		if rules[i].Id == id {
			return &rules[i]
		}
	}
	return nil
}

// suggestSimilarRuleIds returns up to maxN rule ids that share a common prefix
// or substring with the missing ruleId. Used in error message hint.
func suggestSimilarRuleIds(rules []mergedRule, ruleId string, maxN int) []string {
	upper := strings.ToUpper(ruleId)
	scored := make([]struct {
		id    string
		score int
	}, 0, len(rules))
	for _, r := range rules {
		s := commonPrefixLen(strings.ToUpper(r.Id), upper)
		if strings.Contains(strings.ToUpper(r.Id), upper) {
			s += 5
		}
		if s > 0 {
			scored = append(scored, struct {
				id    string
				score int
			}{r.Id, s})
		}
	}
	sort.SliceStable(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})
	out := make([]string, 0, maxN)
	for i := 0; i < len(scored) && i < maxN; i++ {
		out = append(out, scored[i].id)
	}
	return out
}

func commonPrefixLen(a, b string) int {
	n := 0
	for n < len(a) && n < len(b) && a[n] == b[n] {
		n++
	}
	return n
}

// findGuardsReferencingRule scans app/src/test/guards/ + app/src/test/audits/
// for files containing the ruleId as a string literal.
func findGuardsReferencingRule(repoRoot, ruleId string) []string {
	out := []string{}
	dirs := []string{
		filepath.Join(repoRoot, "app", "src", "test", "guards"),
		filepath.Join(repoRoot, "app", "src", "test", "audits"),
	}
	pattern := []byte("'" + ruleId + "'")
	patternDouble := []byte("\"" + ruleId + "\"")
	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if !strings.HasSuffix(name, ".ts") {
				continue
			}
			absPath := filepath.Join(dir, name)
			content, err := os.ReadFile(absPath)
			if err != nil {
				continue
			}
			if containsBytes(content, pattern) || containsBytes(content, patternDouble) {
				rel, _ := filepath.Rel(repoRoot, absPath)
				out = append(out, filepath.ToSlash(rel))
			}
		}
	}
	sort.Strings(out)
	return out
}

func containsBytes(haystack, needle []byte) bool {
	if len(needle) == 0 {
		return true
	}
	for i := 0; i+len(needle) <= len(haystack); i++ {
		matched := true
		for j := 0; j < len(needle); j++ {
			if haystack[i+j] != needle[j] {
				matched = false
				break
			}
		}
		if matched {
			return true
		}
	}
	return false
}
