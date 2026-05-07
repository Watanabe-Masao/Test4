// provenance_test.go — v4.2 seed (= reposteward-substrate-v4-2-introspect-provenance)
package provenance

import (
	"strings"
	"testing"
	"time"
)

func TestCompute_BasicShape(t *testing.T) {
	p := Compute(Canonical, "test source")
	if p.Confidence != Canonical {
		t.Errorf("confidence = %q, want canonical", p.Confidence)
	}
	if p.ComputedFrom != "test source" {
		t.Errorf("computedFrom = %q", p.ComputedFrom)
	}
	if p.ComputedAt == "" {
		t.Error("computedAt must be articulated")
	}
	// RFC3339 parse round-trip
	if _, err := time.Parse(time.RFC3339, p.ComputedAt); err != nil {
		t.Errorf("computedAt is not valid RFC3339: %v", err)
	}
}

func TestCompute_ConfidenceLevels(t *testing.T) {
	for _, conf := range []string{Canonical, Observed, Inferred, Heuristic} {
		t.Run(conf, func(t *testing.T) {
			p := Compute(conf, "x")
			if p.Confidence != conf {
				t.Errorf("confidence = %q, want %q", p.Confidence, conf)
			}
		})
	}
}

func TestCompute_SourceCommitBestEffort(t *testing.T) {
	// In test environment, git may or may not be available — sourceCommit
	// must be either empty (= git unavailable) or non-empty hex string.
	p := Compute(Observed, "x")
	if p.SourceCommit != "" {
		// SHA-1 is 40 hex chars; SHA-256 is 64 hex chars.
		if len(p.SourceCommit) < 7 {
			t.Errorf("sourceCommit too short: %q", p.SourceCommit)
		}
		// must be hex-only (= no whitespace, no path separator)
		if strings.ContainsAny(p.SourceCommit, " \t\n/") {
			t.Errorf("sourceCommit contains unexpected chars: %q", p.SourceCommit)
		}
	}
}
