// property_test.go — v4.2 cluster C C3 (= property-based invariants)
//
// describe package の不変条件を property style で articulate (= 全 valid input に対して
// 性質が成立するか machine-verify)。期間 articulate ではなく **条件 articulate** で
// trustability を articulate。
//
// 各 invariant test:
//   - PropertyDescribeMatchesList: 全 List() entry で Describe(name) が同 metadata を articulate
//   - PropertyAllCommandsHaveRequiredFields: 全 entry が name/family/maturity/summary を articulate
//   - PropertyMaturityIsValid: maturity が controlled vocabulary articulate
//   - PropertyFailureModeReproductionConsistent: Reproduction articulate された FM は args 不在許容しない
package describe

import (
	"testing"
)

// 全 List() entry で Describe(name) が同 metadata を articulate する不変条件。
func TestProperty_DescribeMatchesList(t *testing.T) {
	list := List()
	for _, c := range list.Commands {
		desc, err := Describe(c.Name)
		if err != nil {
			t.Errorf("Describe(%q) failed: %v", c.Name, err)
			continue
		}
		if desc.Command.Name != c.Name {
			t.Errorf("name mismatch for %q: list=%q describe=%q", c.Name, c.Name, desc.Command.Name)
		}
		if desc.Command.Family != c.Family {
			t.Errorf("family mismatch for %q: list=%q describe=%q", c.Name, c.Family, desc.Command.Family)
		}
		if desc.Command.Maturity != c.Maturity {
			t.Errorf("maturity mismatch for %q: list=%q describe=%q", c.Name, c.Maturity, desc.Command.Maturity)
		}
	}
}

// 全 entry が required fields を articulate する不変条件。
func TestProperty_AllCommandsHaveRequiredFields(t *testing.T) {
	list := List()
	for _, c := range list.Commands {
		if c.Name == "" {
			t.Errorf("entry has empty Name: %+v", c)
		}
		if c.Family == "" {
			t.Errorf("entry %q has empty Family", c.Name)
		}
		if c.Maturity == "" {
			t.Errorf("entry %q has empty Maturity", c.Name)
		}
		if c.Summary == "" {
			t.Errorf("entry %q has empty Summary", c.Name)
		}
		if c.OutputKind == "" {
			t.Errorf("entry %q has empty OutputKind", c.Name)
		}
	}
}

// maturity field が controlled vocabulary に articulate される不変条件。
func TestProperty_MaturityIsValid(t *testing.T) {
	validMaturity := map[string]bool{
		"stable":      true,
		"provisional": true,
	}
	list := List()
	for _, c := range list.Commands {
		if !validMaturity[c.Maturity] {
			t.Errorf("entry %q has invalid Maturity %q (= must be 'stable' / 'provisional')", c.Name, c.Maturity)
		}
	}
}

// Reproduction articulate された FailureMode は ExpectedExitCode が articulate されている不変条件。
func TestProperty_FailureModeReproductionConsistent(t *testing.T) {
	list := List()
	for _, c := range list.Commands {
		for _, fm := range c.KnownFailureModes {
			if fm.Reproduction == nil {
				continue
			}
			if fm.Reproduction.ExpectedExitCode < 0 || fm.Reproduction.ExpectedExitCode > 2 {
				t.Errorf("command %q FM %q has invalid ExpectedExitCode %d (= must be 0/1/2)",
					c.Name, fm.Trigger, fm.Reproduction.ExpectedExitCode)
			}
			if len(fm.Reproduction.Args) == 0 {
				t.Errorf("command %q FM %q has Reproduction with empty Args", c.Name, fm.Trigger)
			}
		}
	}
}

// FailureMode の trigger / behavior が non-empty 不変条件。
func TestProperty_FailureModeFieldsNonEmpty(t *testing.T) {
	list := List()
	for _, c := range list.Commands {
		for _, fm := range c.KnownFailureModes {
			if fm.Trigger == "" {
				t.Errorf("command %q has FailureMode with empty Trigger", c.Name)
			}
			if fm.Behavior == "" {
				t.Errorf("command %q has FailureMode (trigger=%q) with empty Behavior", c.Name, fm.Trigger)
			}
		}
	}
}
