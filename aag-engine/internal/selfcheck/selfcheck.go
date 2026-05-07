// Package selfcheck implements `aag self-check` — runtime substrate verification。
//
// AAG 自身の整合性を 1 command で articulate する。AI session が「AAG は trust できる
// 状態か?」を re-grep / 多 hop discovery 不要で articulate するための substrate。
//
// 検証 5 軸:
//   - V1: describe.commandTable ↔ introspect.implTable cross-sync (= 同数 + 同 name set)
//   - V2: introspect.implTable の handlerFile / dispatcherFile が実在
//   - V3: introspect.schemaTable の file-backed schema path が実在
//   - V4: introspect.testTable の test file path が実在 (= dir も accept)
//   - V5: introspect.schemaInfoTable の各 schema が producer or consumer を持つ
//         (= orphan schema 検出、ただし TS 側 / 共通 schema は例外 articulate)
//
// 不可侵原則:
//   1. JSON-first
//   3. Read-only first (= file 走査のみ、書き換えなし)
//   6. Additive-only (= 既存 mechanism を modify しない、新 substrate articulate)
//
// Substrate philosophy:
//   - 本 command は **AAG self-test** (= AAG 自身の正しさを machine-verify)
//   - registry guard (= TS 側、test phase で実行) と相補的:
//     - registry guard: dispatcher / usage / describe drift detection
//     - self-check: runtime substrate cross-table + file 実在 verification
//   - exit code は **常に 0** (= advisory observability、failure block しない)
//     violation は output `violations[]` で articulate、AI / human が判断
package selfcheck

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"aag-engine/internal/describe"
	"aag-engine/internal/introspect"
	"aag-engine/internal/provenance"
)

// SelfCheckSchemaVersion is the schemaVersion for `aag self-check` output.
const SelfCheckSchemaVersion = "aag-self-check-v1"

// SelfCheckOutput is the envelope for `aag self-check`。
type SelfCheckOutput struct {
	SchemaVersion string                `json:"schemaVersion"`
	Healthy       bool                  `json:"healthy"`
	Summary       Summary               `json:"summary"`
	Violations    []Violation           `json:"violations"`
	Provenance    provenance.Provenance `json:"provenance"`
}

// Summary は per-axis violation count + overall articulate。
type Summary struct {
	TotalChecks    int `json:"totalChecks"`
	TotalViolations int `json:"totalViolations"`
	V1CrossSync    int `json:"v1CrossSync"`
	V2ImplFiles    int `json:"v2ImplFiles"`
	V3SchemaFiles  int `json:"v3SchemaFiles"`
	V4TestPaths    int `json:"v4TestPaths"`
	V5OrphanSchema int `json:"v5OrphanSchema"`
}

// Violation は 1 件の整合性違反 articulate。
type Violation struct {
	Axis    string `json:"axis"`    // V1 / V2 / V3 / V4 / V5
	Subject string `json:"subject"` // 違反対象 (= command name / schema id / file path)
	Detail  string `json:"detail"`  // 違反 detail
}

// orphanSchemaExceptions は producer / consumer を意図的に持たない schema の articulate。
//
// 'aag-response-v1' は TS 側 (= guard / obligations / health 統一 response 契約) で
// articulate される schema、Go 側 command は produce / consume しない。
var orphanSchemaExceptions = map[string]string{
	"aag-response-v1": "TS-side schema (= guard / obligations / health 統一 response 契約)",
}

// Run は self-check の本体 (= 5 軸検証を articulate)。
//
// repoRoot は file 実在 check の base path (= 通常 cwd)。
func Run(repoRoot string) SelfCheckOutput {
	if repoRoot == "" {
		repoRoot = "."
	}

	violations := []Violation{}
	violations = append(violations, checkV1CrossSync()...)
	violations = append(violations, checkV2ImplFiles(repoRoot)...)
	violations = append(violations, checkV3SchemaFiles(repoRoot)...)
	violations = append(violations, checkV4TestPaths(repoRoot)...)
	violations = append(violations, checkV5OrphanSchemas()...)

	// per-axis count
	summary := Summary{TotalChecks: 5, TotalViolations: len(violations)}
	for _, v := range violations {
		switch v.Axis {
		case "V1":
			summary.V1CrossSync++
		case "V2":
			summary.V2ImplFiles++
		case "V3":
			summary.V3SchemaFiles++
		case "V4":
			summary.V4TestPaths++
		case "V5":
			summary.V5OrphanSchema++
		}
	}

	return SelfCheckOutput{
		SchemaVersion: SelfCheckSchemaVersion,
		Healthy:       len(violations) == 0,
		Summary:       summary,
		Violations:    violations,
		Provenance: provenance.Compute(
			provenance.Observed,
			"runtime cross-validation of describe.commandTable + introspect.implTable / schemaTable / testTable / schemaInfoTable + filesystem 実在",
		),
	}
}

// checkV1CrossSync は describe.commandTable ↔ introspect.implTable の cross-sync を articulate。
//
// 両 table は同 name set を articulate する (= 22+ command が両側に articulate される) のが正常。
func checkV1CrossSync() []Violation {
	descNames := map[string]bool{}
	for _, c := range describe.List().Commands {
		descNames[c.Name] = true
	}
	implNames := introspect.ImplTableNames()

	violations := []Violation{}
	// describe table にあるが introspect impl table に articulate されていない
	for name := range descNames {
		if !implNames[name] {
			violations = append(violations, Violation{
				Axis:    "V1",
				Subject: name,
				Detail:  "describe.commandTable に articulate されているが introspect.implTable に articulate されていない (= cross-table drift)",
			})
		}
	}
	// introspect impl table にあるが describe table に articulate されていない
	for name := range implNames {
		if !descNames[name] {
			violations = append(violations, Violation{
				Axis:    "V1",
				Subject: name,
				Detail:  "introspect.implTable に articulate されているが describe.commandTable に articulate されていない",
			})
		}
	}
	sort.Slice(violations, func(i, j int) bool { return violations[i].Subject < violations[j].Subject })
	return violations
}

// checkV2ImplFiles は introspect.implTable の handlerFile / dispatcherFile が実在するか articulate。
func checkV2ImplFiles(repoRoot string) []Violation {
	violations := []Violation{}
	for name, ptr := range introspect.AllImplPointers() {
		for _, f := range []struct {
			path string
			kind string
		}{
			{ptr.DispatcherFile, "dispatcherFile"},
			{ptr.HandlerFile, "handlerFile"},
		} {
			if f.path == "" {
				continue
			}
			abs := filepath.Join(repoRoot, f.path)
			if _, err := os.Stat(abs); err != nil {
				violations = append(violations, Violation{
					Axis:    "V2",
					Subject: name,
					Detail:  fmt.Sprintf("%s が実在しない: %s (= %v)", f.kind, f.path, err),
				})
			}
		}
	}
	sort.Slice(violations, func(i, j int) bool {
		if violations[i].Subject != violations[j].Subject {
			return violations[i].Subject < violations[j].Subject
		}
		return violations[i].Detail < violations[j].Detail
	})
	return violations
}

// checkV3SchemaFiles は introspect.schemaTable の path が実在するか articulate。
//
// schema path が nil (= command に schema 不在) の entry は skip。
func checkV3SchemaFiles(repoRoot string) []Violation {
	violations := []Violation{}
	for name, schemaPath := range introspect.AllSchemaPaths() {
		if schemaPath == nil {
			continue
		}
		abs := filepath.Join(repoRoot, *schemaPath)
		if _, err := os.Stat(abs); err != nil {
			violations = append(violations, Violation{
				Axis:    "V3",
				Subject: name,
				Detail:  fmt.Sprintf("schema path が実在しない: %s (= %v)", *schemaPath, err),
			})
		}
	}
	sort.Slice(violations, func(i, j int) bool { return violations[i].Subject < violations[j].Subject })
	return violations
}

// checkV4TestPaths は introspect.testTable の path が実在するか articulate。
//
// path は file 直接 (= ".../foo_test.go") または directory (= ".../foo/") の両方を accept。
func checkV4TestPaths(repoRoot string) []Violation {
	violations := []Violation{}
	for name, paths := range introspect.AllTestPaths() {
		for _, p := range paths {
			abs := filepath.Join(repoRoot, p)
			if _, err := os.Stat(abs); err != nil {
				violations = append(violations, Violation{
					Axis:    "V4",
					Subject: name,
					Detail:  fmt.Sprintf("test path が実在しない: %s (= %v)", p, err),
				})
			}
		}
	}
	sort.Slice(violations, func(i, j int) bool {
		if violations[i].Subject != violations[j].Subject {
			return violations[i].Subject < violations[j].Subject
		}
		return violations[i].Detail < violations[j].Detail
	})
	return violations
}

// checkV5OrphanSchemas は schemaInfoTable の各 schema が producer or consumer を持つかを articulate。
//
// orphanSchemaExceptions に articulate された schema (= TS 側 / 共通 schema) は除外。
func checkV5OrphanSchemas() []Violation {
	violations := []Violation{}
	for id := range introspect.AllSchemaInfo() {
		if _, isException := orphanSchemaExceptions[id]; isException {
			continue
		}
		producers := introspect.SchemaProducers(id)
		consumers := introspect.SchemaConsumers(id)
		if len(producers) == 0 && len(consumers) == 0 {
			violations = append(violations, Violation{
				Axis:    "V5",
				Subject: id,
				Detail:  "schema は articulate されているが producer も consumer も articulate されていない (= orphan schema)",
			})
		}
	}
	sort.Slice(violations, func(i, j int) bool { return violations[i].Subject < violations[j].Subject })
	return violations
}

// MarshalJSON returns indented JSON without HTML escaping。
func MarshalJSON(out SelfCheckOutput) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		return nil, err
	}
	b := buf.Bytes()
	if n := len(b); n > 0 && b[n-1] == '\n' {
		b = b[:n-1]
	}
	return b, nil
}
