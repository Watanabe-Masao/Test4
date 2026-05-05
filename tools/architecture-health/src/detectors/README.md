# detectors/ — pure violation detection layer

> **位置付け**: `aag-engine-readiness-refactor` project Phase 2〜3 deliverable。
> 将来 Go / Rust engine への部分移行を想定した layered model の **detector 層**。

## 4 層 layered model

```
collector  →  detector  →  evaluator  →  renderer
   ↓            ↓             ↓            ↓
repo facts  DetectorResult  summary    json/md/AagResponse
(fs ok)      (pure)         (pure)      (renderer ok)
```

| 層 | 責務 | 物理 location | 純粋性 |
|---|---|---|---|
| **collector** | repo / 外部 system から facts を集める | `tools/architecture-health/src/collectors/*.ts` | fs / glob 依存可 |
| **detector** | facts から `DetectorResult[]` を作る | `tools/architecture-health/src/detectors/*.ts` (= 本 directory) | **pure** (= fs / glob 直接依存禁止、引数 facts のみ参照) |
| **evaluator** | `DetectorResult[]` から hard gate / KPI 判定を行う | `tools/architecture-health/src/detector-result.ts` の `evaluateDetectorResults()` | **pure** |
| **renderer** | `DetectorResult[]` / summary から output を生成 | `tools/architecture-health/src/detector-result.ts` の `aggregateDetectorResults` / `renderDetectorResultsAsJson` 等 | output 形式に依存 (= human-readable / json / AagResponse) |

## 設計原則

### 1. detector は pure function

`detect*Violations(facts) → DetectorResult[]` という signature を持つ。
fs / glob を直接呼ばず、collector layer から articulate された facts を引数として
受け取る。これにより:

- **engine 移行可能性**: Go / Rust に同じ pure logic を移植可能
- **fixture testing**: Phase 5 で landing する fixture corpus で parity test 可能
- **deterministic**: 同じ input は常に同じ output

### 2. 既存 production guard を置換しない (= parallel implementation)

各 detector は既存 production guard (`app/src/test/guards/*.test.ts`) と **同じ
violation 経路を pure function で articulate** する。production guard は
existing AagResponse 経路で動作継続、detector は engine 化対象として並存。

これは `aag-engine-readiness-refactor` plan.md 不可侵原則 2 (= 既存 guard の意味
は変えない) の strict adherence。Phase 6 (Pure Detector Extraction) で必要に
応じて production guard 内で detector を呼ぶ refactor を別 program で行う。

### 3. ruleId は production guard と 1:1 整合

例: project lifecycle C1 violation = `AR-PROJECT-LIFECYCLE-C1`。
既存 production guard `projectCompletionConsistencyGuard.test.ts` の C1 と同じ
violation を articulate するため、parity test で 意味的等価性 を機械検証可能。

## 現在の detector 一覧 (= Phase 6 完遂時点、5 系統 / 全 path-helpers adoption 済)

| 系統 | detector file | ruleId pattern | 既存 production guard | demonstration scope | path-helpers adoption |
|---|---|---|---|---|---|
| project lifecycle | `project-lifecycle-detector.ts` | `AR-PROJECT-LIFECYCLE-C1` | `projectCompletionConsistencyGuard.test.ts` | C1 (= completed but not archived) | ✅ Phase 4 |
| archive manifest | `archive-manifest-detector.ts` | `AR-ARCHIVE-MANIFEST-A2` | `archiveV2SchemaGuard.test.ts` | A2 (= top-level required field 欠落) | ✅ Phase 4 |
| doc registry | `doc-registry-detector.ts` | `AR-DOC-REGISTRY-D1` | `docRegistryGuard.test.ts` | D1 (= registered path が file system に存在しない) | ✅ Phase 4 |
| generated metadata | `generated-metadata-detector.ts` | `AR-GENERATED-METADATA-G2` | `generatedFileEditGuard.test.ts` | G2 (= GENERATED marker / ISO timestamp 欠落) | ✅ Phase 6 |
| schema validation | `schema-validation-detector.ts` | `AR-SCHEMA-VALIDATION-PZ2` | `projectizationPolicyGuard.test.ts` | PZ-2 (= level が 0〜4 範囲外) | ✅ Phase 6 |

各 detector は **1 violation rule の demonstration** に scope を絞っている。残り
violation rule (= 各 production guard の 5〜13 rule) は Phase 6 で systematic 抽出。

## path-helpers (= Phase 4 で landing)

`tools/architecture-health/src/path-helpers.ts` に **repo-relative POSIX path 規約**
を articulate。detector は出力 `DetectorResult.sourceFile` を `toRepoPath()` で
boundary validate し、不正 path で hard fail する。

### path 規約 (= 機械検証可能)

- POSIX separator のみ (= `\\` 禁止)
- repo-relative (= leading `/` 禁止、Windows drive letter 禁止)
- non-traversal (= `..` segment 禁止)
- non-empty

### 提供 API

| API | 役割 |
|---|---|
| `RepoPath` (= branded type) | type level での path 規約遵守保証 |
| `RepoFileEntry` (= type) | repo 内 file metadata articulation (= path + kind + sizeBytes + sha256?) |
| `isRepoPath(input)` | path 規約 predicate (= type narrowing 用) |
| `toRepoPath(input)` | validation factory (= 規約違反で throw) |
| `assertRepoPath(input)` | type assertion |
| `inferRepoFileKind(path)` | 拡張子から kind 推定 (`json` / `markdown` / `typescript` / `other`) |
| `createRepoFileEntry(input)` | RepoFileEntry factory (= path validation + kind 推定 + sha256 format check) |

### detector adoption pattern (= Phase 4 で確立)

```ts
import { toRepoPath } from '../path-helpers.js'

// detector 内で createDetectorResult に渡す sourceFile を boundary validate
results.push(
  createDetectorResult({
    ruleId: 'AR-X',
    detectionType: 'governance-ops',
    sourceFile: toRepoPath(facts.somePath),  // ← 不正 path で hard fail
    severity: 'gate',
    ...
  }),
)
```

これにより:
- DetectorResult 消費者は `sourceFile` が常に repo-relative POSIX であることを前提にできる
- engine 化対象側 (= Go / Rust) は同 path 規約を再現するだけで TS detector と parity 可能
- 各 detector が個別 path 正規化を実装する必要がない (= 「path 正規化処理が各 detector に散らばっていない」 = Phase 4 完了条件)

## 新 detector 追加手順

1. `tools/architecture-health/src/detectors/<system>-detector.ts` を作成
2. `Facts` interface 定義 (= collector layer から渡される input)
3. `detect*Violations(facts) → DetectorResult[]` pure function を export
4. ruleId は `AR-<SYSTEM>-<RULE>` 形式 (= 既存 production guard との 1:1 整合)
5. unit test を `app/src/test/guards/detectorResultModuleGuard.test.ts` に追加
6. `references/03-implementation/guard-test-map.md` の test 件数を update
7. 本 README の「現在の detector 一覧」table に row 追加

## Logic Boundary Reference (= Phase 6 articulation、engine 移行可能性 articulate)

> **位置付け**: 後続 engine 実装 project (= Go / Rust 等の engine MVP) が
> **再実装すべき pure logic boundary** を per-detector で articulate。
> 各 detector の input facts shape + violation 判定 logic + DetectorResult 出力
> shape の 3 軸を明示することで、engine が同じ pure mapping を再現できることを保証。

### project-lifecycle-detector

- **Input facts shape**: `{ checklistResults: ProjectChecklistResult[] }` (= collector layer から articulate された ProjectChecklistResult、`derivedStatus` / `meta.kind` / `checked` / `total` を参照)
- **判定 logic (= C1)**: `derivedStatus === 'completed' && meta.kind !== 'collection'` で violation emit
- **Output**: `AR-PROJECT-LIFECYCLE-C1` (severity=gate、actual=checked、baseline=total、sourceFile=projectRoot)
- **engine 再実装 boundary**: `derivedStatus` 計算 logic は collector 側にあり、本 detector は **判定のみ** を担う

### archive-manifest-detector

- **Input facts shape**: `Array<{ manifestPath: string; manifest: object | null }>` (= 複数 archived project の manifest を一括検証)
- **判定 logic (= A2)**: 12 required top-level field それぞれについて `field in manifest` を test、欠落で violation emit
- **Output**: 1 violation per missing field (= `evidence: "missing required field: <name>"`)
- **engine 再実装 boundary**: `REQUIRED_TOP_LEVEL_FIELDS` array は schema (`docs/contracts/aag/project-archive.schema.json`) と同期、engine は schema を canonical input にすることで drift 回避

### doc-registry-detector

- **Input facts shape**: `{ entries: Array<{ path; label }>; existingPaths: ReadonlySet<string> }`
- **判定 logic (= D1)**: 各 entry について `existingPaths.has(entry.path) === false` で violation emit
- **Output**: 1 violation per non-existent path (= `evidence: "registered label: <label>"`)
- **engine 再実装 boundary**: `existingPaths` は collector layer (= filesystem read) で構築、本 detector は **set membership 判定のみ**

### generated-metadata-detector

- **Input facts shape**: `{ files: Array<{ path; content }> }`
- **判定 logic (= G2)**: 2 regex pattern (`/(>\s*生成:|<!--\s*GENERATED|GENERATED:START)/` + `/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`) で content match、両方欠落で violation emit
- **Output**: 1 violation per file missing both markers
- **engine 再実装 boundary**: regex pattern は detector 内部 constant、engine 側で同 pattern を articulate (= regex literal の同期義務)

### schema-validation-detector

- **Input facts shape**: `{ projects: Array<{ projectId; configPath; level: number | null }> }`
- **判定 logic (= PZ-2)**: `level !== null && (!Number.isInteger(level) || level < 0 || level > 4)` で violation emit
- **Output**: 1 violation per out-of-range level (= `actual: <level>`、`evidence: "level=<n> is not in [0, 1, 2, 3, 4]"`)
- **engine 再実装 boundary**: `[0, 4]` 範囲は AAG-COA Level 定義 (= `references/05-aag-interface/operations/projectization-policy.md` §3) に由来、engine は同 doc を canonical reference として 0-4 を articulate

### 共通 boundary (= 全 detector 共通)

- **path validation**: 各 detector が `createDetectorResult` 直前で `toRepoPath()` を呼び、`sourceFile` を repo-relative POSIX path として boundary validate
- **DetectorResult schema 整合**: 全 detector 出力は `docs/contracts/aag/detector-result.schema.json` に準拠 (= aagContractSchemaSyncGuard で機械検証)
- **immutability**: 全 detector 出力は `Object.freeze()` 済 (= consumer が誤って mutate できない)
- **deterministic**: 同 facts に対して常に同 DetectorResult[] を return (= test fixture corpus で機械検証、Phase 5 で landing)

### Vitest wrapper thin 化 reference (= production guard refactor 時の pattern)

production guard が pure detector を呼ぶ refactor pattern (= Phase 6 で理論 articulate、実 production guard 改変は別 program 所掌):

```ts
// before (= 既存 production guard、混合 pattern)
test('archive manifest is valid', () => {
  const files = readdirSync(...)
  for (const file of files) {
    const manifest = JSON.parse(readFileSync(file))
    expect(manifest).toHaveProperty('restoreAllCommand')  // 検出 logic + assertion 同居
    // ... 9 件の assertion
  }
})

// after (= pure detector + thin wrapper)
test('archive manifest is valid', () => {
  // collector layer (= fs read)
  const facts = collectArchiveManifestFacts(...)
  // detector layer (= pure)
  const violations = detectArchiveManifestViolations(facts)
  // wrapper layer (= 同 input/output、thin assertion)
  expect(violations).toEqual([])
})
```

= production guard refactor は別 program で行うが、本 README は **その時の reference pattern** を articulate (= 不可侵原則 2 整合 = 既存 guard 意味不変、refactor は schema-preserving のみ)。

## 関連

- `tools/architecture-health/src/detector-result.ts` — DetectorResult TS contract + evaluator
- `tools/architecture-health/src/path-helpers.ts` — RepoPath / RepoFileEntry (= Phase 4)
- `fixtures/aag/` — Phase 5 fixture corpus (= 8 fixture / 5 系統 coverage)
- `docs/contracts/aag/detector-result.schema.json` — canonical schema (= JSON Schema draft-07)
- `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` — schema ↔ TS sync 機械検証
- `app/src/test/guards/detectorResultModuleGuard.test.ts` — detector module 動作 contract
- `references/03-implementation/aag-engine-readiness-inventory.md` §6.1 — 5 系統 articulate
- `projects/active/aag-engine-readiness-refactor/plan.md` — 親 project plan (= Phase 0〜7)
