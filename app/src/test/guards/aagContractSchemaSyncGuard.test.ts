/**
 * AAG Contract Schema Sync Guard
 *
 * `docs/contracts/aag/aag-response.schema.json` + `detector-result.schema.json`
 * (JSON Schema draft-07 canonical contracts) と TS interface (現状の
 * `tools/architecture-health/src/aag-response.ts` `AagResponse` 等) が
 * structurally identical であることを機械保証する sync guard。
 *
 * **canonical contracts** (Phase 1 / A3 で landing):
 *   - `docs/contracts/aag/aag-response.schema.json` = AagResponse contract
 *   - `docs/contracts/aag/detector-result.schema.json` = DetectorResult contract
 *     (forward-looking、actual integration は post-Pilot)
 *
 * 検証項目:
 * 1. 両 schema file が存在 + valid JSON
 * 2. AagResponse schema の required fields = TS interface の field と一致
 * 3. AagResponse 実 instance (buildObligationResponse 出力等) が schema を pass
 * 4. AagResponse 不正 instance (required field 欠落) が schema で fail
 * 5. DetectorResult schema が forward-looking 構造を articulate (placeholder valid)
 * 6. 既存 `aagResponseFeedbackUnificationGuard` 維持 (schema 化が drift を起こさない)
 *
 * drift 検出時の修復: schema または TS interface のいずれかを update し本 sync を回復。
 *
 * @responsibility R:guard
 * @see docs/contracts/aag/aag-response.schema.json
 * @see docs/contracts/aag/detector-result.schema.json
 * @see tools/architecture-health/src/aag-response.ts
 *
 * @taxonomyKind T:meta-guard
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv from 'ajv'
import { buildObligationResponse } from '@tools/architecture-health/aag-response'
import type { AagResponse } from '@tools/architecture-health/aag-response'
import {
  createDetectorResult,
  type DetectorResult,
} from '@tools/architecture-health/detector-result'

const REPO_ROOT = resolve(__dirname, '../../../..')
const RESPONSE_SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/aag/aag-response.schema.json')
const DETECTOR_SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/aag/detector-result.schema.json')

interface JsonSchema {
  $schema?: string
  $id?: string
  title?: string
  required?: readonly string[]
  properties?: Readonly<Record<string, unknown>>
  [k: string]: unknown
}

function loadSchema(path: string): JsonSchema {
  return JSON.parse(readFileSync(path, 'utf-8')) as JsonSchema
}

// AagResponse の TS field set (canonical from aag-response.ts interface)
const AAG_RESPONSE_TS_FIELDS = [
  'source',
  'fixNow',
  'slice',
  'summary',
  'reason',
  'steps',
  'exceptions',
  'deepDive',
  'violations',
] as const

// DetectorResult の TS field set (canonical from detector-result.ts interface)
// schema の required + properties 並び順と一致させる (= aag-engine-readiness-refactor Phase 2 articulate)
const DETECTOR_RESULT_TS_REQUIRED_FIELDS = [
  'ruleId',
  'detectionType',
  'sourceFile',
  'severity',
] as const

const DETECTOR_RESULT_TS_OPTIONAL_FIELDS = [
  'evidence',
  'actual',
  'baseline',
  'messageSeed',
] as const

describe('AAG Contract Schema Sync Guard', () => {
  it('aag-response.schema.json + detector-result.schema.json が存在する', () => {
    expect(existsSync(RESPONSE_SCHEMA_PATH), `missing: ${RESPONSE_SCHEMA_PATH}`).toBe(true)
    expect(existsSync(DETECTOR_SCHEMA_PATH), `missing: ${DETECTOR_SCHEMA_PATH}`).toBe(true)
  })

  it('AagResponse schema の required fields が TS interface field と一致', () => {
    const schema = loadSchema(RESPONSE_SCHEMA_PATH)
    const schemaRequired: ReadonlySet<string> = new Set(schema.required ?? [])
    const tsFields: ReadonlySet<string> = new Set(AAG_RESPONSE_TS_FIELDS)

    const missingInSchema = [...tsFields].filter((f) => !schemaRequired.has(f))
    const extraInSchema = [...schemaRequired].filter((f) => !tsFields.has(f))

    expect(missingInSchema, 'TS interface field が schema required に未articulate').toEqual([])
    expect(extraInSchema, 'schema required に articulate されているが TS interface に無い').toEqual(
      [],
    )
  })

  it('AagResponse schema の properties が TS interface field と一致', () => {
    const schema = loadSchema(RESPONSE_SCHEMA_PATH)
    const schemaProps: ReadonlySet<string> = new Set(Object.keys(schema.properties ?? {}))
    const tsFields: ReadonlySet<string> = new Set(AAG_RESPONSE_TS_FIELDS)

    const missingInSchema = [...tsFields].filter((f) => !schemaProps.has(f))
    const extraInSchema = [...schemaProps].filter((f) => !tsFields.has(f))

    expect(missingInSchema, 'TS field が schema properties に未articulate').toEqual([])
    expect(
      extraInSchema,
      'schema properties に articulate されているが TS interface に無い',
    ).toEqual([])
  })

  it('実 AagResponse instance (buildObligationResponse 出力) が schema validation を通る', () => {
    const ajv = new Ajv({ allErrors: true })
    const schema = loadSchema(RESPONSE_SCHEMA_PATH)
    const validate = ajv.compile(schema)

    const sample: AagResponse = buildObligationResponse(
      'Test obligation',
      'projects/completed/aag-platformization/aag/execution-overlay.ts',
    )
    const valid = validate(sample)
    expect(valid, `schema validation failed: ${JSON.stringify(validate.errors)}`).toBe(true)
  })

  it('AagResponse 不正 instance (required field 欠落) が schema で fail', () => {
    const ajv = new Ajv({ allErrors: true })
    const schema = loadSchema(RESPONSE_SCHEMA_PATH)
    const validate = ajv.compile(schema)

    const invalid = {
      source: 'guard',
      // fixNow / slice / summary / etc. すべて欠落
    }
    const valid = validate(invalid)
    expect(valid, `不正 instance が誤って valid 判定された`).toBe(false)
  })

  it('DetectorResult schema が forward-looking 構造を articulate (sample valid)', () => {
    const ajv = new Ajv({ allErrors: true })
    const schema = loadSchema(DETECTOR_SCHEMA_PATH)
    const validate = ajv.compile(schema)

    // 最低限の DetectorResult sample (= aag-engine-readiness-refactor Phase 2 で TS implementation 整備済)
    const sample = {
      ruleId: 'AR-EXAMPLE',
      detectionType: 'layer-boundary',
      sourceFile: 'app/src/example.ts',
      severity: 'gate',
    }
    const valid = validate(sample)
    expect(
      valid,
      `DetectorResult schema が sample を reject: ${JSON.stringify(validate.errors)}`,
    ).toBe(true)
  })

  it('DetectorResult schema が required field 欠落を reject', () => {
    const ajv = new Ajv({ allErrors: true })
    const schema = loadSchema(DETECTOR_SCHEMA_PATH)
    const validate = ajv.compile(schema)

    const invalid = { ruleId: 'AR-EXAMPLE' /* detectionType / sourceFile / severity 欠落 */ }
    const valid = validate(invalid)
    expect(valid, `不正 DetectorResult が誤って valid 判定された`).toBe(false)
  })

  // ─────────────────────────────────────────────────────────────────
  // DetectorResult TS interface ↔ schema sync (aag-engine-readiness-refactor Phase 2 で extend)
  // ─────────────────────────────────────────────────────────────────

  it('DetectorResult schema の required fields が TS interface の required field と一致', () => {
    const schema = loadSchema(DETECTOR_SCHEMA_PATH)
    const schemaRequired: ReadonlySet<string> = new Set(schema.required ?? [])
    const tsRequired: ReadonlySet<string> = new Set(DETECTOR_RESULT_TS_REQUIRED_FIELDS)

    const missingInSchema = [...tsRequired].filter((f) => !schemaRequired.has(f))
    const extraInSchema = [...schemaRequired].filter((f) => !tsRequired.has(f))

    expect(
      missingInSchema,
      'TS DetectorResult の required field が schema required に未articulate',
    ).toEqual([])
    expect(
      extraInSchema,
      'schema required に articulate されているが TS DetectorResult に無い',
    ).toEqual([])
  })

  it('DetectorResult schema の properties が TS interface field (required + optional) と一致', () => {
    const schema = loadSchema(DETECTOR_SCHEMA_PATH)
    const schemaProps: ReadonlySet<string> = new Set(Object.keys(schema.properties ?? {}))
    const tsAllFields: ReadonlySet<string> = new Set([
      ...DETECTOR_RESULT_TS_REQUIRED_FIELDS,
      ...DETECTOR_RESULT_TS_OPTIONAL_FIELDS,
    ])

    const missingInSchema = [...tsAllFields].filter((f) => !schemaProps.has(f))
    const extraInSchema = [...schemaProps].filter((f) => !tsAllFields.has(f))

    expect(missingInSchema, 'TS DetectorResult field が schema properties に未articulate').toEqual(
      [],
    )
    expect(
      extraInSchema,
      'schema properties に articulate されているが TS DetectorResult に無い',
    ).toEqual([])
  })

  it('実 DetectorResult instance (createDetectorResult 出力) が schema validation を通る', () => {
    const ajv = new Ajv({ allErrors: true })
    const schema = loadSchema(DETECTOR_SCHEMA_PATH)
    const validate = ajv.compile(schema)

    const sample: DetectorResult = createDetectorResult({
      ruleId: 'AR-PROJECT-LIFECYCLE-C1',
      detectionType: 'governance-ops',
      sourceFile: 'projects/active/example/',
      severity: 'gate',
      actual: 5,
      baseline: 5,
      messageSeed: 'completed but not archived',
    })
    const valid = validate(sample)
    expect(valid, `schema validation failed: ${JSON.stringify(validate.errors)}`).toBe(true)
  })
})
