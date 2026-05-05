// Package fixture provides the AAG Engine fixture corpus runner.
//
// 位置付け (= aag-engine-go-mvp project Phase 3 deliverable):
//   - `fixtures/aag/` 配下の 8 fixture (= 5 系統 coverage) を Go 側で discover + load。
//   - 各 fixture は `input.json` (= detector facts) + `expected.json` (= 期待 DetectorResult[])
//     の 2 file pattern (= aag-engine-readiness-refactor Phase 5 deliverable と整合)。
//   - parity comparison primitive を提供 (= Phase 4-8 で各 detector が実装された後、
//     Phase 9 shadow mode で fixture parity 検証の主軸として使用)。
//
// 不可侵原則 (= aag-engine-go-mvp plan.md):
//   - 1 (= validator のみ): 本 package は fixture を **読むだけ** で書き換えない。
//   - 9 (= Go engine が source of truth にならない): fixture の正本は repo 配下の
//     fixtures/aag/ で TS 側 detectorResultModuleGuard test とも共有。
//   - 10 (= fixture parity を必須にする): 本 package が fixture parity の
//     primary metric の input。
//
// 参照:
//   - fixtures/aag/README.md (= 8 fixture 一覧 + parity test 経路)
//   - tools/architecture-health/src/detectors/README.md §「Logic Boundary Reference」
//     (= 各 detector の input facts shape)
//   - app/src/test/guards/detectorResultModuleGuard.test.ts §「fixture corpus parity」
//     (= TS 側 parity test mirror)
//   - projects/active/aag-engine-go-mvp/plan.md §Phase 3
package fixture

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"sort"

	"aag-engine/internal/contract"
)

// FixtureRoot returns the absolute path to fixtures/aag/ given a repo root.
func FixtureRoot(repoRoot string) string {
	return filepath.Join(repoRoot, "fixtures", "aag")
}

// Fixture は単一 fixture directory の articulate (= input.json + expected.json の pair)。
//
// Field shape:
//   - Name: fixtures/aag/ からの relative path (= "archive-v2/pass-minimal" 等)、
//     POSIX separator で articulate (= aag-engine-readiness-refactor path-helpers 4 規約継承)
//   - Path: 絶対 path (= os.ReadFile / detector wire-up で使用、loader 内部的)
//   - InputRaw: input.json の raw bytes (= detector ごとに facts shape が異なるため
//     loader は parse せず、各 detector が自身の facts type に unmarshal する)
//   - Expected: expected.json を contract.DetectorResult[] にparseした結果 (= canonical schema 準拠)
type Fixture struct {
	Name     string                     `json:"name"`
	Path     string                     `json:"-"`
	InputRaw json.RawMessage            `json:"-"`
	Expected []contract.DetectorResult  `json:"expected"`
}

// ExpectedCount は expected.json 内の DetectorResult 件数 (= summary metric)。
func (f Fixture) ExpectedCount() int {
	return len(f.Expected)
}

// LoadAll は fixtures/aag/ 配下を recursively walk し、input.json + expected.json の
// pair を持つ directory を Fixture として load する。
//
// Sort order: Name (= deterministic、parity test の安定性)。
func LoadAll(repoRoot string) ([]Fixture, error) {
	root := FixtureRoot(repoRoot)

	if _, err := os.Stat(root); err != nil {
		return nil, fmt.Errorf("LoadAll: fixture root not found at %s: %w", root, err)
	}

	var fixtures []Fixture
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if !d.IsDir() {
			return nil
		}

		inputPath := filepath.Join(path, "input.json")
		expectedPath := filepath.Join(path, "expected.json")

		// input.json が存在しない directory は fixture ではない (= sub-directory 等)
		if _, err := os.Stat(inputPath); os.IsNotExist(err) {
			return nil
		} else if err != nil {
			return fmt.Errorf("LoadAll: stat %s: %w", inputPath, err)
		}

		inputRaw, err := os.ReadFile(inputPath)
		if err != nil {
			return fmt.Errorf("LoadAll: read %s: %w", inputPath, err)
		}

		expectedRaw, err := os.ReadFile(expectedPath)
		if err != nil {
			return fmt.Errorf("LoadAll: read %s: %w", expectedPath, err)
		}

		var expected []contract.DetectorResult
		if err := json.Unmarshal(expectedRaw, &expected); err != nil {
			return fmt.Errorf("LoadAll: parse expected.json at %s: %w", expectedPath, err)
		}

		relPath, err := filepath.Rel(root, path)
		if err != nil {
			return fmt.Errorf("LoadAll: rel path: %w", err)
		}
		// POSIX separator に統一 (= readiness refactor path-helpers 4 規約)
		relPath = filepath.ToSlash(relPath)

		fixtures = append(fixtures, Fixture{
			Name:     relPath,
			Path:     path,
			InputRaw: inputRaw,
			Expected: expected,
		})
		return nil
	})

	if err != nil {
		return nil, err
	}

	sort.Slice(fixtures, func(i, j int) bool { return fixtures[i].Name < fixtures[j].Name })
	return fixtures, nil
}

// Diff は parity 比較の結果 articulate (= actual と expected の差分)。
type Diff struct {
	// FixtureName は fixture identifier (= LoadAll の Name と一致)。
	FixtureName string `json:"fixtureName"`

	// Match は actual と expected の deep equality 結果。
	Match bool `json:"match"`

	// Actual は detector が emit した DetectorResult[] (= 比較入力)。
	Actual []contract.DetectorResult `json:"actual"`

	// Expected は fixture の expected.json 内容。
	Expected []contract.DetectorResult `json:"expected"`

	// Missing は expected に存在するが actual にない要素 (= set-based diagnostics)。
	Missing []contract.DetectorResult `json:"missing,omitempty"`

	// Extra は actual に存在するが expected にない要素 (= set-based diagnostics)。
	Extra []contract.DetectorResult `json:"extra,omitempty"`
}

// Compare は actual と expected を deep equality で比較し Diff を articulate。
//
// Ordering policy:
//   - Match=true は要素 + 順序 が完全一致した場合のみ。
//   - Match=false の場合、Missing / Extra は set-based (= 順序を無視した残差)。
//
// detector 出力の deterministic ordering は detector 側責務 (= 通常は severity →
// ruleId → sourceFile で sort、aag-engine-readiness-refactor renderDetectorResultsAsJson
// と同 pattern)。本 Compare は ordering 自体は articulate せず、equal/missing/extra
// のみを return する。
func Compare(fixture Fixture, actual []contract.DetectorResult) Diff {
	d := Diff{
		FixtureName: fixture.Name,
		Actual:      actual,
		Expected:    fixture.Expected,
	}

	// 完全一致 (= deep equality + 順序維持) の早期判定
	if reflect.DeepEqual(actual, fixture.Expected) {
		d.Match = true
		return d
	}

	d.Match = false

	// Set-based diff (= 順序無視で missing / extra を articulate)
	expectedSet := make([]contract.DetectorResult, len(fixture.Expected))
	copy(expectedSet, fixture.Expected)
	actualSet := make([]contract.DetectorResult, len(actual))
	copy(actualSet, actual)

	// expected にあって actual にないもの
	for _, e := range fixture.Expected {
		if !containsResult(actualSet, e) {
			d.Missing = append(d.Missing, e)
		}
	}

	// actual にあって expected にないもの
	for _, a := range actual {
		if !containsResult(expectedSet, a) {
			d.Extra = append(d.Extra, a)
		}
	}

	return d
}

// containsResult は slice に target と deep equal な要素が存在するか判定。
func containsResult(slice []contract.DetectorResult, target contract.DetectorResult) bool {
	for _, s := range slice {
		if reflect.DeepEqual(s, target) {
			return true
		}
	}
	return false
}

// ParitySummary は複数 Diff を集約した summary。
type ParitySummary struct {
	Total      int    `json:"total"`
	Matched    int    `json:"matched"`
	Mismatched int    `json:"mismatched"`
	Diffs      []Diff `json:"diffs"`
}

// AllMatched returns true iff Total > 0 && Total == Matched。
func (s ParitySummary) AllMatched() bool {
	return s.Total > 0 && s.Total == s.Matched
}

// SummarizeParity は Diff[] を集約。
func SummarizeParity(diffs []Diff) ParitySummary {
	s := ParitySummary{
		Total: len(diffs),
		Diffs: diffs,
	}
	for _, d := range diffs {
		if d.Match {
			s.Matched++
		} else {
			s.Mismatched++
		}
	}
	return s
}
