/**
 * Detector Result Module Guard
 *
 * `tools/architecture-health/src/detector-result.ts` (= DetectorResult TS
 * implementation) の動作 contract を機械検証する unit test。
 *
 * **位置付け** (= aag-engine-readiness-refactor Phase 2 deliverable):
 *   - `aagContractSchemaSyncGuard` は schema ↔ TS interface の structural
 *     equivalence を保証 (= field 集合 sync)。
 *   - 本 guard は **factory / aggregator / renderer の動作 contract** を保証
 *     (= behavior 検証 = 不可侵原則 2 の実 enforcement)。
 *
 * 検証項目:
 *   1. `createDetectorResult` の field validation (= ruleId / detectionType /
 *      sourceFile / messageSeed の 1 文字以上要求、severity enum)
 *   2. `aggregateDetectorResults` の severity 集約 (= gate / block-merge / warn の
 *      mix で fixNow が正しく articulate される)
 *   3. `detectorResultToAagResponse` (= 単一 violation → AagResponse) の field 整合
 *   4. `renderDetectorResultsAsJson` の deterministic ordering (= severity → ruleId
 *      → sourceFile)
 *   5. demonstration: `detectProjectLifecycleViolations` (= C1 violation 経路)
 *      が 既存 `projectCompletionConsistencyGuard` C1 と意味的に等価
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see tools/architecture-health/src/detector-result.ts
 * @see tools/architecture-health/src/detectors/project-lifecycle-detector.ts
 * @see app/src/test/guards/aagContractSchemaSyncGuard.test.ts (= schema ↔ TS sync)
 */

import { describe, it, expect } from 'vitest'
import {
  createDetectorResult,
  aggregateDetectorResults,
  detectorResultToAagResponse,
  renderDetectorResultsAsJson,
  evaluateDetectorResults,
  type DetectorResult,
} from '@tools/architecture-health/detector-result'
import { detectProjectLifecycleViolations } from '@tools/architecture-health/detectors/project-lifecycle-detector'
import { detectArchiveManifestViolations } from '@tools/architecture-health/detectors/archive-manifest-detector'
import { detectDocRegistryViolations } from '@tools/architecture-health/detectors/doc-registry-detector'
import { detectGeneratedMetadataViolations } from '@tools/architecture-health/detectors/generated-metadata-detector'
import { detectSchemaValidationViolations } from '@tools/architecture-health/detectors/schema-validation-detector'
import type { ProjectChecklistResult } from '@tools/architecture-health/collectors/project-checklist-collector'

describe('Detector Result Module Guard', () => {
  // ─────────────────────────────────────────────────────────────────
  // 1. createDetectorResult — factory validation
  // ─────────────────────────────────────────────────────────────────

  describe('createDetectorResult', () => {
    it('required field を articulate した instance を生成する', () => {
      const result = createDetectorResult({
        ruleId: 'AR-EXAMPLE',
        detectionType: 'layer-boundary',
        sourceFile: 'app/src/example.ts',
        severity: 'gate',
      })
      expect(result.ruleId).toBe('AR-EXAMPLE')
      expect(result.detectionType).toBe('layer-boundary')
      expect(result.sourceFile).toBe('app/src/example.ts')
      expect(result.severity).toBe('gate')
    })

    it('optional field (evidence / actual / baseline / messageSeed) を articulate できる', () => {
      const result = createDetectorResult({
        ruleId: 'AR-EXAMPLE',
        detectionType: 'governance-ops',
        sourceFile: 'projects/active/example/',
        severity: 'warn',
        evidence: 'sample evidence string',
        actual: 3,
        baseline: 5,
        messageSeed: 'sample seed message',
      })
      expect(result.evidence).toBe('sample evidence string')
      expect(result.actual).toBe(3)
      expect(result.baseline).toBe(5)
      expect(result.messageSeed).toBe('sample seed message')
    })

    it('ruleId / detectionType / sourceFile が空文字なら throw する', () => {
      expect(() =>
        createDetectorResult({
          ruleId: '',
          detectionType: 'x',
          sourceFile: 'x',
          severity: 'gate',
        }),
      ).toThrow(/ruleId/)
      expect(() =>
        createDetectorResult({
          ruleId: 'x',
          detectionType: '',
          sourceFile: 'x',
          severity: 'gate',
        }),
      ).toThrow(/detectionType/)
      expect(() =>
        createDetectorResult({
          ruleId: 'x',
          detectionType: 'x',
          sourceFile: '',
          severity: 'gate',
        }),
      ).toThrow(/sourceFile/)
    })

    it('optional field が空文字なら throw する (= undefined を strict に handle)', () => {
      expect(() =>
        createDetectorResult({
          ruleId: 'x',
          detectionType: 'x',
          sourceFile: 'x',
          severity: 'gate',
          evidence: '',
        }),
      ).toThrow(/evidence/)
      expect(() =>
        createDetectorResult({
          ruleId: 'x',
          detectionType: 'x',
          sourceFile: 'x',
          severity: 'gate',
          messageSeed: '',
        }),
      ).toThrow(/messageSeed/)
    })

    it('生成 instance は frozen (= immutable)', () => {
      const result = createDetectorResult({
        ruleId: 'x',
        detectionType: 'x',
        sourceFile: 'x',
        severity: 'gate',
      })
      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 2. aggregateDetectorResults — severity 集約
  // ─────────────────────────────────────────────────────────────────

  describe('aggregateDetectorResults', () => {
    const gateResult = createDetectorResult({
      ruleId: 'AR-G1',
      detectionType: 'gate',
      sourceFile: 'a.ts',
      severity: 'gate',
    })
    const blockResult = createDetectorResult({
      ruleId: 'AR-B1',
      detectionType: 'block',
      sourceFile: 'b.ts',
      severity: 'block-merge',
    })
    const warnResult = createDetectorResult({
      ruleId: 'AR-W1',
      detectionType: 'warn',
      sourceFile: 'c.ts',
      severity: 'warn',
    })

    it('gate severity が 1 件でもあれば fixNow=now', () => {
      const resp = aggregateDetectorResults([gateResult, warnResult])
      expect(resp.fixNow).toBe('now')
    })

    it('block-merge severity が 1 件でもあれば fixNow=now', () => {
      const resp = aggregateDetectorResults([blockResult, warnResult])
      expect(resp.fixNow).toBe('now')
    })

    it('全件 warn なら fixNow=debt', () => {
      const resp = aggregateDetectorResults([warnResult, warnResult])
      expect(resp.fixNow).toBe('debt')
    })

    it('violations 配列に DetectorResult 1 件ごとの 1 行 articulate を含む', () => {
      const resp = aggregateDetectorResults([gateResult, blockResult])
      expect(resp.violations).toHaveLength(2)
      expect(resp.violations[0]).toContain('AR-G1')
      expect(resp.violations[0]).toContain('a.ts')
      expect(resp.violations[1]).toContain('AR-B1')
      expect(resp.violations[1]).toContain('b.ts')
    })

    it('options で summary / reason / slice / steps / source を override できる', () => {
      const resp = aggregateDetectorResults([gateResult], {
        summary: 'custom summary',
        reason: 'custom reason',
        slice: 'governance-ops',
        steps: ['step 1', 'step 2'],
        source: 'guard',
      })
      expect(resp.summary).toBe('custom summary')
      expect(resp.reason).toBe('custom reason')
      expect(resp.slice).toBe('governance-ops')
      expect(resp.steps).toEqual(['step 1', 'step 2'])
      expect(resp.source).toBe('guard')
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 3. detectorResultToAagResponse — 単一 violation 経路
  // ─────────────────────────────────────────────────────────────────

  describe('detectorResultToAagResponse', () => {
    it('messageSeed を summary の default に articulate', () => {
      const result = createDetectorResult({
        ruleId: 'AR-X',
        detectionType: 'x',
        sourceFile: 'a.ts',
        severity: 'gate',
        messageSeed: 'X violation detected',
      })
      const resp = detectorResultToAagResponse(result)
      expect(resp.summary).toBe('X violation detected')
    })

    it('messageSeed が無い場合は ruleId から default summary 生成', () => {
      const result = createDetectorResult({
        ruleId: 'AR-X',
        detectionType: 'x',
        sourceFile: 'a.ts',
        severity: 'gate',
      })
      const resp = detectorResultToAagResponse(result)
      expect(resp.summary).toContain('AR-X')
    })

    it('source の default は health', () => {
      const result = createDetectorResult({
        ruleId: 'AR-X',
        detectionType: 'x',
        sourceFile: 'a.ts',
        severity: 'gate',
      })
      const resp = detectorResultToAagResponse(result)
      expect(resp.source).toBe('health')
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 4. renderDetectorResultsAsJson — deterministic ordering
  // ─────────────────────────────────────────────────────────────────

  describe('renderDetectorResultsAsJson', () => {
    it('severity → ruleId → sourceFile の順で sort', () => {
      const results: DetectorResult[] = [
        createDetectorResult({
          ruleId: 'AR-Z',
          detectionType: 'x',
          sourceFile: 'z.ts',
          severity: 'warn',
        }),
        createDetectorResult({
          ruleId: 'AR-A',
          detectionType: 'x',
          sourceFile: 'a.ts',
          severity: 'gate',
        }),
        createDetectorResult({
          ruleId: 'AR-A',
          detectionType: 'x',
          sourceFile: 'b.ts',
          severity: 'gate',
        }),
        createDetectorResult({
          ruleId: 'AR-B',
          detectionType: 'x',
          sourceFile: 'b.ts',
          severity: 'block-merge',
        }),
      ]
      const json = renderDetectorResultsAsJson(results)
      const parsed = JSON.parse(json) as DetectorResult[]
      // expected: gate AR-A a.ts, gate AR-A b.ts, block-merge AR-B b.ts, warn AR-Z z.ts
      expect(parsed[0].ruleId).toBe('AR-A')
      expect(parsed[0].sourceFile).toBe('a.ts')
      expect(parsed[1].ruleId).toBe('AR-A')
      expect(parsed[1].sourceFile).toBe('b.ts')
      expect(parsed[2].ruleId).toBe('AR-B')
      expect(parsed[3].ruleId).toBe('AR-Z')
    })

    it('input が空でも valid JSON ([])', () => {
      expect(renderDetectorResultsAsJson([])).toBe('[]')
    })

    it('indent option が反映される', () => {
      const result = createDetectorResult({
        ruleId: 'x',
        detectionType: 'x',
        sourceFile: 'x',
        severity: 'gate',
      })
      const json = renderDetectorResultsAsJson([result], { indent: 4 })
      // 4-space indent の存在を articulate
      expect(json).toContain('    "ruleId"')
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 5. detectProjectLifecycleViolations — demonstration parity
  // ─────────────────────────────────────────────────────────────────

  describe('detectProjectLifecycleViolations (= 1 系統 demonstration)', () => {
    function makeChecklistResult(
      overrides: Partial<ProjectChecklistResult['meta']> & {
        readonly checked: number
        readonly total: number
        readonly derivedStatus: ProjectChecklistResult['derivedStatus']
      },
    ): ProjectChecklistResult {
      const projectId = overrides.projectId ?? 'sample-project'
      const baseRoot = `projects/active/${projectId}`
      return {
        meta: {
          projectId,
          title: overrides.title ?? 'Sample',
          status: overrides.status ?? 'active',
          kind: overrides.kind ?? 'project',
          parent: overrides.parent,
          projectRoot: overrides.projectRoot ?? baseRoot,
          checklistPath: overrides.checklistPath ?? `${baseRoot}/checklist.md`,
          aiContextPath: overrides.aiContextPath ?? `${baseRoot}/AI_CONTEXT.md`,
          handoffPath: overrides.handoffPath ?? `${baseRoot}/HANDOFF.md`,
          planPath: overrides.planPath ?? `${baseRoot}/plan.md`,
        },
        checked: overrides.checked,
        total: overrides.total,
        derivedStatus: overrides.derivedStatus,
      }
    }

    it('completed 状態だが archive 未実施の project を C1 として emit', () => {
      const facts = {
        checklistResults: [
          makeChecklistResult({
            projectId: 'completed-but-not-archived',
            checked: 5,
            total: 5,
            derivedStatus: 'completed' as const,
          }),
        ],
      }
      const results = detectProjectLifecycleViolations(facts)
      expect(results).toHaveLength(1)
      expect(results[0].ruleId).toBe('AR-PROJECT-LIFECYCLE-C1')
      expect(results[0].severity).toBe('gate')
      expect(results[0].actual).toBe(5)
      expect(results[0].baseline).toBe(5)
      expect(results[0].sourceFile).toContain('completed-but-not-archived')
    })

    it('in_progress / archived / collection / empty では C1 を emit しない', () => {
      const facts = {
        checklistResults: [
          makeChecklistResult({
            projectId: 'in-progress',
            checked: 3,
            total: 5,
            derivedStatus: 'in_progress' as const,
          }),
          makeChecklistResult({
            projectId: 'already-archived',
            checked: 5,
            total: 5,
            derivedStatus: 'archived' as const,
          }),
          makeChecklistResult({
            projectId: 'collection-project',
            kind: 'collection',
            checked: 0,
            total: 0,
            derivedStatus: 'collection' as const,
          }),
          makeChecklistResult({
            projectId: 'empty-project',
            checked: 0,
            total: 0,
            derivedStatus: 'empty' as const,
          }),
        ],
      }
      const results = detectProjectLifecycleViolations(facts)
      expect(results).toEqual([])
    })

    it('複数 violation を all detect (= 既存 guard と意味的に等価)', () => {
      const facts = {
        checklistResults: [
          makeChecklistResult({
            projectId: 'completed-1',
            checked: 3,
            total: 3,
            derivedStatus: 'completed' as const,
          }),
          makeChecklistResult({
            projectId: 'completed-2',
            checked: 7,
            total: 7,
            derivedStatus: 'completed' as const,
          }),
          makeChecklistResult({
            projectId: 'in-progress',
            checked: 1,
            total: 5,
            derivedStatus: 'in_progress' as const,
          }),
        ],
      }
      const results = detectProjectLifecycleViolations(facts)
      expect(results).toHaveLength(2)
      expect(results.map((r) => r.sourceFile)).toEqual([
        expect.stringContaining('completed-1'),
        expect.stringContaining('completed-2'),
      ])
    })

    it('input が空 array なら 違反 0 件を返す', () => {
      const results = detectProjectLifecycleViolations({ checklistResults: [] })
      expect(results).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 6. detectArchiveManifestViolations — Phase 3 demonstration
  // ─────────────────────────────────────────────────────────────────

  describe('detectArchiveManifestViolations (= Phase 3、archive manifest 系)', () => {
    function makeValidManifest(
      overrides: Partial<Record<string, unknown>> = {},
    ): Readonly<Record<string, unknown>> {
      return {
        archiveVersion: 2,
        projectId: 'sample-archived',
        title: 'Sample Archived',
        archivedAt: '2026-05-04',
        preCompressionCommit: 'a'.repeat(40),
        deletedPaths: [],
        compressedFiles: [],
        restoreAllCommand: 'git checkout ...',
        decisionEntries: [],
        commitLineage: [],
        relatedPrograms: [],
        compressionRationale: 'sample rationale',
        ...overrides,
      }
    }

    it('完全 articulate manifest なら 違反 0 件', () => {
      const facts = [
        {
          manifestPath: 'projects/completed/sample/archive.manifest.json',
          manifest: makeValidManifest(),
        },
      ]
      const results = detectArchiveManifestViolations(facts)
      expect(results).toEqual([])
    })

    it('1 field 欠落で 1 violation emit', () => {
      const partial: Record<string, unknown> = makeValidManifest()
      delete partial.restoreAllCommand
      const facts = [
        {
          manifestPath: 'projects/completed/sample/archive.manifest.json',
          manifest: partial,
        },
      ]
      const results = detectArchiveManifestViolations(facts)
      expect(results).toHaveLength(1)
      expect(results[0].ruleId).toBe('AR-ARCHIVE-MANIFEST-A2')
      expect(results[0].severity).toBe('gate')
      expect(results[0].evidence).toContain('restoreAllCommand')
    })

    it('複数 field 欠落で 複数 violation emit', () => {
      const partial: Record<string, unknown> = makeValidManifest()
      delete partial.restoreAllCommand
      delete partial.decisionEntries
      delete partial.commitLineage
      const facts = [
        {
          manifestPath: 'projects/completed/sample/archive.manifest.json',
          manifest: partial,
        },
      ]
      const results = detectArchiveManifestViolations(facts)
      expect(results).toHaveLength(3)
      const fields = results.map((r) => r.evidence)
      expect(fields).toEqual(
        expect.arrayContaining([
          expect.stringContaining('restoreAllCommand'),
          expect.stringContaining('decisionEntries'),
          expect.stringContaining('commitLineage'),
        ]),
      )
    })

    it('manifest=null (= collector layer 読み込み失敗) は scope 外で skip', () => {
      const facts = [
        {
          manifestPath: 'projects/completed/broken/archive.manifest.json',
          manifest: null,
        },
      ]
      const results = detectArchiveManifestViolations(facts)
      expect(results).toEqual([])
    })

    it('input が空 array なら 違反 0 件', () => {
      expect(detectArchiveManifestViolations([])).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 7. detectDocRegistryViolations — Phase 3 demonstration
  // ─────────────────────────────────────────────────────────────────

  describe('detectDocRegistryViolations (= Phase 3、doc registry 系)', () => {
    it('全 entry が existingPaths に含まれていれば 違反 0 件', () => {
      const facts = {
        entries: [
          { path: 'references/01-foundation/x.md', label: 'X' },
          { path: 'references/03-implementation/y.md', label: 'Y' },
        ],
        existingPaths: new Set([
          'references/01-foundation/x.md',
          'references/03-implementation/y.md',
        ]),
      }
      const results = detectDocRegistryViolations(facts)
      expect(results).toEqual([])
    })

    it('non-existent path 1 件で 1 violation emit', () => {
      const facts = {
        entries: [
          { path: 'references/01-foundation/exists.md', label: 'Exists' },
          { path: 'references/01-foundation/missing.md', label: 'Missing' },
        ],
        existingPaths: new Set(['references/01-foundation/exists.md']),
      }
      const results = detectDocRegistryViolations(facts)
      expect(results).toHaveLength(1)
      expect(results[0].ruleId).toBe('AR-DOC-REGISTRY-D1')
      expect(results[0].sourceFile).toBe('references/01-foundation/missing.md')
      expect(results[0].severity).toBe('gate')
      expect(results[0].evidence).toContain('Missing')
    })

    it('input が空なら 違反 0 件', () => {
      expect(
        detectDocRegistryViolations({ entries: [], existingPaths: new Set() }),
      ).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 8. detectGeneratedMetadataViolations — Phase 3 demonstration
  // ─────────────────────────────────────────────────────────────────

  describe('detectGeneratedMetadataViolations (= Phase 3、generated metadata 系)', () => {
    it('GENERATED marker + ISO timestamp 両方持つ file は違反なし', () => {
      const facts = {
        files: [
          {
            path: 'references/04-tracking/generated/sample.generated.md',
            content: '# Generated\n\n> 生成: 2026-05-04T22:15:37.681Z\n\nbody',
          },
        ],
      }
      expect(detectGeneratedMetadataViolations(facts)).toEqual([])
    })

    it('GENERATED marker だけ持つ file は違反なし', () => {
      const facts = {
        files: [
          {
            path: 'references/04-tracking/generated/sample.generated.md',
            content: '# Generated\n\n<!-- GENERATED -->\n\nbody',
          },
        ],
      }
      expect(detectGeneratedMetadataViolations(facts)).toEqual([])
    })

    it('marker / timestamp なし file で 1 violation emit', () => {
      const facts = {
        files: [
          {
            path: 'references/04-tracking/generated/orphan.generated.md',
            content: '# Body\n\nno markers here',
          },
        ],
      }
      const results = detectGeneratedMetadataViolations(facts)
      expect(results).toHaveLength(1)
      expect(results[0].ruleId).toBe('AR-GENERATED-METADATA-G2')
      expect(results[0].severity).toBe('gate')
    })

    it('input が空なら 違反 0 件', () => {
      expect(detectGeneratedMetadataViolations({ files: [] })).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 9. detectSchemaValidationViolations — Phase 3 demonstration
  // ─────────────────────────────────────────────────────────────────

  describe('detectSchemaValidationViolations (= Phase 3、schema validation 系)', () => {
    it('全 project の level が 0〜4 範囲内なら 違反 0 件', () => {
      const facts = {
        projects: [
          { projectId: 'p0', configPath: 'p0/config.json', level: 0 },
          { projectId: 'p1', configPath: 'p1/config.json', level: 1 },
          { projectId: 'p2', configPath: 'p2/config.json', level: 2 },
          { projectId: 'p3', configPath: 'p3/config.json', level: 3 },
          { projectId: 'p4', configPath: 'p4/config.json', level: 4 },
        ],
      }
      expect(detectSchemaValidationViolations(facts)).toEqual([])
    })

    it('level=5 は範囲外で violation emit', () => {
      const facts = {
        projects: [{ projectId: 'p5', configPath: 'p5/config.json', level: 5 }],
      }
      const results = detectSchemaValidationViolations(facts)
      expect(results).toHaveLength(1)
      expect(results[0].ruleId).toBe('AR-SCHEMA-VALIDATION-PZ2')
      expect(results[0].actual).toBe(5)
      expect(results[0].severity).toBe('gate')
    })

    it('level=-1 は範囲外で violation emit', () => {
      const facts = {
        projects: [{ projectId: 'p-1', configPath: 'p-1/config.json', level: -1 }],
      }
      const results = detectSchemaValidationViolations(facts)
      expect(results).toHaveLength(1)
      expect(results[0].actual).toBe(-1)
    })

    it('level=2.5 (非 integer) は range 外で violation emit', () => {
      const facts = {
        projects: [{ projectId: 'p2.5', configPath: 'p2.5/config.json', level: 2.5 }],
      }
      const results = detectSchemaValidationViolations(facts)
      expect(results).toHaveLength(1)
    })

    it('level=null (= field 不在) は別 rule (PZ-1) で本 detector scope 外、skip', () => {
      const facts = {
        projects: [{ projectId: 'pNull', configPath: 'pNull/config.json', level: null }],
      }
      expect(detectSchemaValidationViolations(facts)).toEqual([])
    })

    it('input が空なら 違反 0 件', () => {
      expect(detectSchemaValidationViolations({ projects: [] })).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 10. evaluateDetectorResults — Phase 3 evaluator layer
  // ─────────────────────────────────────────────────────────────────

  describe('evaluateDetectorResults (= Phase 3、layered model evaluator 層)', () => {
    it('空 input なら hardGatePass=true / mergeBlockPass=true / totalCount=0', () => {
      const summary = evaluateDetectorResults([])
      expect(summary.totalCount).toBe(0)
      expect(summary.hardGatePass).toBe(true)
      expect(summary.mergeBlockPass).toBe(true)
      expect(summary.countBySeverity).toEqual({ gate: 0, 'block-merge': 0, warn: 0 })
      expect(summary.countByRuleId.size).toBe(0)
    })

    it('gate severity 1 件で hardGatePass=false', () => {
      const r = createDetectorResult({
        ruleId: 'AR-X',
        detectionType: 'x',
        sourceFile: 'a.ts',
        severity: 'gate',
      })
      const summary = evaluateDetectorResults([r])
      expect(summary.hardGatePass).toBe(false)
      expect(summary.mergeBlockPass).toBe(true)
      expect(summary.countBySeverity.gate).toBe(1)
    })

    it('block-merge severity 1 件で hardGatePass=true / mergeBlockPass=false', () => {
      const r = createDetectorResult({
        ruleId: 'AR-X',
        detectionType: 'x',
        sourceFile: 'a.ts',
        severity: 'block-merge',
      })
      const summary = evaluateDetectorResults([r])
      expect(summary.hardGatePass).toBe(true)
      expect(summary.mergeBlockPass).toBe(false)
    })

    it('warn 複数件は hardGatePass=true / mergeBlockPass=true', () => {
      const results = [
        createDetectorResult({
          ruleId: 'AR-X',
          detectionType: 'x',
          sourceFile: 'a.ts',
          severity: 'warn',
        }),
        createDetectorResult({
          ruleId: 'AR-Y',
          detectionType: 'y',
          sourceFile: 'b.ts',
          severity: 'warn',
        }),
      ]
      const summary = evaluateDetectorResults(results)
      expect(summary.totalCount).toBe(2)
      expect(summary.hardGatePass).toBe(true)
      expect(summary.mergeBlockPass).toBe(true)
      expect(summary.countBySeverity.warn).toBe(2)
    })

    it('countByRuleId が rule ごとの 件数を集計', () => {
      const results = [
        createDetectorResult({
          ruleId: 'AR-X',
          detectionType: 'x',
          sourceFile: 'a.ts',
          severity: 'gate',
        }),
        createDetectorResult({
          ruleId: 'AR-X',
          detectionType: 'x',
          sourceFile: 'b.ts',
          severity: 'gate',
        }),
        createDetectorResult({
          ruleId: 'AR-Y',
          detectionType: 'y',
          sourceFile: 'c.ts',
          severity: 'warn',
        }),
      ]
      const summary = evaluateDetectorResults(results)
      expect(summary.countByRuleId.get('AR-X')).toBe(2)
      expect(summary.countByRuleId.get('AR-Y')).toBe(1)
    })

    it('summary は frozen (= immutable)', () => {
      const summary = evaluateDetectorResults([])
      expect(Object.isFrozen(summary)).toBe(true)
      expect(Object.isFrozen(summary.countBySeverity)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // 11. layered model parity — renderer 変更で detector logic が変わらない
  // ─────────────────────────────────────────────────────────────────

  describe('layered model parity (= Phase 3 完了条件)', () => {
    const sample: DetectorResult[] = [
      createDetectorResult({
        ruleId: 'AR-X',
        detectionType: 'x',
        sourceFile: 'a.ts',
        severity: 'gate',
        messageSeed: 'X violation',
      }),
      createDetectorResult({
        ruleId: 'AR-Y',
        detectionType: 'y',
        sourceFile: 'b.ts',
        severity: 'warn',
        messageSeed: 'Y violation',
      }),
    ]

    it('JSON renderer と AagResponse renderer は同じ DetectorResult[] から異なる output を articulate', () => {
      const json = renderDetectorResultsAsJson(sample)
      const aag = aggregateDetectorResults(sample)

      // JSON は array、AagResponse は object: 異なる shape
      expect(JSON.parse(json)).toBeInstanceOf(Array)
      expect(aag.violations).toHaveLength(2)
      expect(aag.fixNow).toBe('now') // gate severity 含むため

      // 同じ source data を articulate する: ruleId が両方に出現
      expect(json).toContain('AR-X')
      expect(json).toContain('AR-Y')
      expect(aag.violations[0]).toContain('AR-X')
      expect(aag.violations[1]).toContain('AR-Y')
    })

    it('detector output (= DetectorResult[]) は renderer 選択に依存しない (= layered model 整合)', () => {
      // 同じ sample に対して JSON / AagResponse / evaluator の 3 経路が並存
      const json = renderDetectorResultsAsJson(sample)
      const aag = aggregateDetectorResults(sample)
      const summary = evaluateDetectorResults(sample)

      // detector output 自体は不変 (= sample は frozen)
      expect(sample).toHaveLength(2)
      expect(sample[0].ruleId).toBe('AR-X')

      // 各 renderer / evaluator は独立に動作
      expect(JSON.parse(json)).toHaveLength(2)
      expect(aag.violations).toHaveLength(2)
      expect(summary.totalCount).toBe(2)
      expect(summary.hardGatePass).toBe(false)
    })
  })
})
