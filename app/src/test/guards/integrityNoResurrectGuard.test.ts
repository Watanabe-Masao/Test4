/**
 * Integrity No Resurrect Guard — AR-INTEGRITY-NO-RESURRECT 検出
 *
 * canonicalization-domain-consolidation Phase I で landing (2026-04-29)。
 * `adoption-candidates.json` の `rejected[].originalSlot` 名と
 * `app-domain/integrity/{parsing,detection,reporting}/` 配下 file 名の
 * 衝突を hard fail で検出する。
 *
 * 永久不採用と決定された slot 名 (shapeSync / tokenInclusion / jsdocTag) を
 * 同名 primitive として復活させようとした場合の sneaky resurrection を防ぐ。
 *
 * **不採用判断を反転させたい場合**: rejected entry を削除して reason / decidedAt
 * を更新する PR を先に landing させる (`canonicalization-principles.md §P8` 適用)。
 *
 * @see app-domain/gross-profit/rule-catalog/base-rules.ts (AR-INTEGRITY-NO-RESURRECT)
 * @see projects/canonicalization-domain-consolidation/derived/adoption-candidates.json
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REJECTED_REGISTRY_PATH = path.join(
  PROJECT_ROOT,
  'projects/canonicalization-domain-consolidation/derived/adoption-candidates.json',
)
const INTEGRITY_DIR = path.join(PROJECT_ROOT, 'app-domain/integrity')

interface RejectedSlot {
  readonly originalSlot: string
  readonly replacedBy?: string
  readonly reason: string
  readonly decidedAt: string
}

interface AdoptionCandidates {
  readonly rejected?: readonly RejectedSlot[]
}

function loadRejectedSlots(): readonly RejectedSlot[] {
  if (!fs.existsSync(REJECTED_REGISTRY_PATH)) return []
  const data = JSON.parse(fs.readFileSync(REJECTED_REGISTRY_PATH, 'utf-8')) as AdoptionCandidates
  return data.rejected ?? []
}

function listIntegrityFileNames(): string[] {
  const result: string[] = []
  for (const subdir of ['parsing', 'detection', 'reporting']) {
    const dir = path.join(INTEGRITY_DIR, subdir)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.ts') && f !== 'index.ts') {
        result.push(`${subdir}/${f.replace(/\.ts$/, '')}`)
      }
    }
  }
  return result
}

describe('AR-INTEGRITY-NO-RESURRECT (rejected slot resurrection 検出)', () => {
  it('adoption-candidates.json に rejected[] section が存在する', () => {
    const slots = loadRejectedSlots()
    expect(slots.length, 'rejected[] が空 — 永久不採用 archive が消失している').toBeGreaterThan(0)
  })

  it('全 rejected entry が originalSlot / reason / decidedAt を持つ', () => {
    const slots = loadRejectedSlots()
    for (const s of slots) {
      expect(s.originalSlot, `rejected entry: originalSlot 必須`).toBeTruthy()
      expect(s.reason, `rejected entry ${s.originalSlot}: reason 必須`).toBeTruthy()
      expect(s.decidedAt, `rejected entry ${s.originalSlot}: decidedAt 必須 (YYYY-MM-DD)`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      )
    }
  })

  it('app-domain/integrity/ 配下に rejected[].originalSlot 名の primitive file が存在しない', () => {
    const slots = loadRejectedSlots()
    const rejectedNames = new Set(slots.map((s) => s.originalSlot))
    const existingNames = listIntegrityFileNames()

    const violations: string[] = []
    for (const name of existingNames) {
      const basename = name.split('/').pop()!
      if (rejectedNames.has(basename)) {
        violations.push(name)
      }
    }

    expect(
      violations,
      [
        `AR-INTEGRITY-NO-RESURRECT 違反: 永久不採用 slot が primitive として復活している。`,
        `違反 file: ${violations.join(', ')}`,
        `判断を反転させる場合は adoption-candidates.json の rejected entry を先に削除し、`,
        `reason / decidedAt を更新する PR を review window 経由で landing させること。`,
      ].join('\n'),
    ).toEqual([])
  })
})
