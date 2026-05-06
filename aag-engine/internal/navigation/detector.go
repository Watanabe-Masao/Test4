package navigation

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ───────────────────────────────────────────────────────────────────────
// detector refs (= Wave 3 #14)
// ───────────────────────────────────────────────────────────────────────

// DetectorRefsOutput is the JSON shape emitted by `aag detector refs <detectorId>`.
type DetectorRefsOutput struct {
	SchemaVersion    string   `json:"schemaVersion"`
	DetectorId       string   `json:"detectorId"`
	GoImplementation string   `json:"goImplementation,omitempty"`
	GoTest           string   `json:"goTest,omitempty"`
	TsImplementation string   `json:"tsImplementation,omitempty"`
	Schema           string   `json:"schema,omitempty"`
	Fixtures         []string `json:"fixtures"`
	FixtureCount     int      `json:"fixtureCount"`
}

// DetectorRefsSchemaVersion is the const articulated in DetectorRefsOutput.
const DetectorRefsSchemaVersion = "detector-refs-v1"

// DetectorRefsInput controls DetectorRefs.
type DetectorRefsInput struct {
	RepoRoot   string
	DetectorId string
}

// detectorIdMappings articulates the canonical id mapping for the 5 detectors
// landed in aag-engine-go-mvp。各 detector は以下の path convention に articulate:
//
//   - Go impl:    aag-engine/internal/detectors/<id_snake>.go
//   - Go test:    aag-engine/internal/detectors/<id_snake>_test.go
//   - TS impl:    tools/architecture-health/src/detectors/<id-kebab>-detector.ts
//   - Fixtures:   fixtures/aag/<id-kebab>/
//
// id format conventions:
//   - input id (CLI surface) = kebab-case (e.g., "archive-manifest")
//   - Go file = snake_case (e.g., "archive_manifest.go")
//   - TS file = kebab-case + "-detector.ts"
//   - Fixture dir = kebab-case (= 但し archive-manifest は archive-v2/ を articulate)
type detectorIdMapping struct {
	id         string
	goName     string // snake_case base (e.g., "archive_manifest")
	tsName     string // kebab-case base (e.g., "archive-manifest")
	fixtureDir string // dir under fixtures/aag/ (= 通常 tsName と一致、archive-manifest は archive-v2/)
}

var detectorIdMappings = []detectorIdMapping{
	{"archive-manifest", "archive_manifest", "archive-manifest", "archive-v2"},
	{"doc-registry", "doc_registry", "doc-registry", "doc-registry"},
	{"generated-metadata", "generated_metadata", "generated-metadata", "generated"},
	{"project-lifecycle", "project_lifecycle", "project-lifecycle", "project-lifecycle"},
	{"schema-validation", "schema_validation", "schema-validation", "schema-validation"},
}

// DetectorRefs locates detector resources by id.
//
// Sources (= path-based、existence で articulate):
//   - aag-engine/internal/detectors/<snake>.go + _test.go
//   - tools/architecture-health/src/detectors/<kebab>-detector.ts
//   - fixtures/aag/<fixtureDir>/* (= each subdir = 1 fixture case)
//
// Errors:
//   - RepoRoot / DetectorId empty → error
//   - DetectorId not in mapping → error with hint listing all 5 known ids
func DetectorRefs(input DetectorRefsInput) (DetectorRefsOutput, error) {
	if input.RepoRoot == "" {
		return DetectorRefsOutput{}, fmt.Errorf("DetectorRefs: RepoRoot must be set")
	}
	if input.DetectorId == "" {
		return DetectorRefsOutput{}, fmt.Errorf("DetectorRefs: DetectorId must be set")
	}

	var mapping *detectorIdMapping
	for i := range detectorIdMappings {
		if detectorIdMappings[i].id == input.DetectorId {
			mapping = &detectorIdMappings[i]
			break
		}
	}
	if mapping == nil {
		known := make([]string, 0, len(detectorIdMappings))
		for _, m := range detectorIdMappings {
			known = append(known, m.id)
		}
		return DetectorRefsOutput{}, fmt.Errorf("DetectorRefs: detectorId %q not found. Known detectors: %s", input.DetectorId, strings.Join(known, ", "))
	}

	out := DetectorRefsOutput{
		SchemaVersion: DetectorRefsSchemaVersion,
		DetectorId:    input.DetectorId,
	}

	goImpl := filepath.Join("aag-engine", "internal", "detectors", mapping.goName+".go")
	if existsAt(input.RepoRoot, goImpl) {
		out.GoImplementation = filepath.ToSlash(goImpl)
	}
	goTest := filepath.Join("aag-engine", "internal", "detectors", mapping.goName+"_test.go")
	if existsAt(input.RepoRoot, goTest) {
		out.GoTest = filepath.ToSlash(goTest)
	}
	tsImpl := filepath.Join("tools", "architecture-health", "src", "detectors", mapping.tsName+"-detector.ts")
	if existsAt(input.RepoRoot, tsImpl) {
		out.TsImplementation = filepath.ToSlash(tsImpl)
	}

	// Schema: detector-result.schema.json は全 detector 共通の output contract
	// (= aag-engine-go-mvp Phase 2 で確立)。各 detector の input schema は
	// fixture / project-archive / doc-registry など別 schema family を参照する。
	commonSchema := filepath.Join("docs", "contracts", "aag", "detector-result.schema.json")
	if existsAt(input.RepoRoot, commonSchema) {
		out.Schema = filepath.ToSlash(commonSchema)
	}

	out.Fixtures = listFixtures(input.RepoRoot, mapping.fixtureDir)
	out.FixtureCount = len(out.Fixtures)

	return out, nil
}

func existsAt(repoRoot, relPath string) bool {
	_, err := os.Stat(filepath.Join(repoRoot, relPath))
	return err == nil
}

// listFixtures returns the list of fixture case dirs under fixtures/aag/<fixtureDir>/.
// Each case is a subdir name (sorted ascending).
func listFixtures(repoRoot, fixtureDir string) []string {
	out := []string{}
	abs := filepath.Join(repoRoot, "fixtures", "aag", fixtureDir)
	entries, err := os.ReadDir(abs)
	if err != nil {
		return out
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		rel := filepath.ToSlash(filepath.Join("fixtures", "aag", fixtureDir, e.Name()))
		out = append(out, rel)
	}
	sort.Strings(out)
	return out
}

// KnownDetectorIds returns the list of known detector ids (= 5 detector landed
// in aag-engine-go-mvp).
func KnownDetectorIds() []string {
	out := make([]string, 0, len(detectorIdMappings))
	for _, m := range detectorIdMappings {
		out = append(out, m.id)
	}
	return out
}
