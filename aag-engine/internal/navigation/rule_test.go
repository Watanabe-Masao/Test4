// rule_test.go — Wave 3 #13 (= reposteward-ai-ops-platform、aag rule locate <ruleId>)
package navigation

import (
	"strings"
	"testing"
)

func TestRuleLocate_RejectsEmptyInput(t *testing.T) {
	if _, err := RuleLocate(RuleLocateInput{}); err == nil {
		t.Error("expected error for empty input, got nil")
	}
	if _, err := RuleLocate(RuleLocateInput{RepoRoot: "/tmp"}); err == nil {
		t.Error("expected error for missing RuleId, got nil")
	}
	if _, err := RuleLocate(RuleLocateInput{RuleId: "x"}); err == nil {
		t.Error("expected error for missing RepoRoot, got nil")
	}
}

func TestRuleLocate_RealRepo_KnownRule(t *testing.T) {
	out, err := RuleLocate(RuleLocateInput{
		RepoRoot: repoRoot(t),
		RuleId:   "AR-G5-HOOK-LINES",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.SchemaVersion != RuleLocateSchemaVersion {
		t.Errorf("schemaVersion = %q", out.SchemaVersion)
	}
	if out.RuleId != "AR-G5-HOOK-LINES" {
		t.Errorf("ruleId = %q", out.RuleId)
	}
	if out.Definition == "" {
		t.Error("Definition must be non-empty")
	}
	if !strings.Contains(out.Definition, "base-rules.ts") {
		t.Errorf("Definition should reference base-rules.ts, got: %q", out.Definition)
	}
	if len(out.Guards) == 0 {
		t.Error("expected at least 1 guard referencing AR-G5-HOOK-LINES (= sizeGuard.test.ts)")
	}
	hasSizeGuard := false
	for _, g := range out.Guards {
		if strings.Contains(g, "sizeGuard.test.ts") {
			hasSizeGuard = true
			break
		}
	}
	if !hasSizeGuard {
		t.Errorf("expected sizeGuard.test.ts in Guards, got: %v", out.Guards)
	}
	if out.What == "" {
		t.Error("expected non-empty 'what' for AR-G5-HOOK-LINES")
	}
	if out.Thresholds == nil {
		t.Error("expected non-nil Thresholds for AR-G5-HOOK-LINES (= lineMax)")
	}
}

func TestRuleLocate_UnknownRule_ReturnsHint(t *testing.T) {
	_, err := RuleLocate(RuleLocateInput{
		RepoRoot: repoRoot(t),
		RuleId:   "AR-G5-NONEXISTENT-XYZ",
	})
	if err == nil {
		t.Fatal("expected error for unknown ruleId, got nil")
	}
	msg := err.Error()
	if !strings.Contains(msg, "not found") {
		t.Errorf("expected 'not found' in error, got: %q", msg)
	}
	if !strings.Contains(msg, "Similar:") {
		t.Errorf("expected hint with 'Similar:', got: %q", msg)
	}
}

func TestSuggestSimilarRuleIds_PrefixMatching(t *testing.T) {
	rules := []mergedRule{
		{Id: "AR-G5-HOOK-LINES"},
		{Id: "AR-G5-HOOK-MEMO"},
		{Id: "AR-G6-COMPONENT"},
		{Id: "AR-C8-SIMPLE"},
	}
	out := suggestSimilarRuleIds(rules, "AR-G5-HOOK-XX", 5)
	if len(out) == 0 {
		t.Error("expected non-empty hint")
	}
	// AR-G5-HOOK-LINES and AR-G5-HOOK-MEMO should rank highest
	if out[0] != "AR-G5-HOOK-LINES" && out[0] != "AR-G5-HOOK-MEMO" {
		t.Errorf("expected G5-HOOK rule first, got: %v", out)
	}
}

func TestFindGuardsReferencingRule_KnownRule(t *testing.T) {
	guards := findGuardsReferencingRule(repoRoot(t), "AR-G5-HOOK-LINES")
	if len(guards) == 0 {
		t.Error("expected at least 1 guard, got 0")
	}
	for _, g := range guards {
		if !strings.HasPrefix(g, "app/src/test/") {
			t.Errorf("guard path should start with app/src/test/, got: %q", g)
		}
	}
}
