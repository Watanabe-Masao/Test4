/**
 * Archive v2 Schema Guard
 *
 * `archiveVersion: 2` を持つ archived project の `archive.manifest.json` が
 * `docs/contracts/project-archive.schema.json` に対して整合していることを機械検証。
 *
 * 役割:
 * - v2 圧縮形式 (= ARCHIVE.md + archive.manifest.json + config/project.json 残置) の構造的整合
 * - manifest 必須 field 全揃い (= archiveVersion / projectId / preCompressionCommit / restoreAllCommand 等)
 * - SHA format 整合 (= preCompressionCommit / decisionEntries[].commitSha / commitLineage[].commitSha)
 * - restoreAllCommand 形式整合 (= `git checkout <preCompressionCommit> --` で始まる)
 * - ARCHIVE.md 存在 + minimum sections
 * - config/project.json 残置 (= deletedFilesException articulation)
 *
 * 検証 scope:
 * - `projects/completed/<id>/archive.manifest.json` で `archiveVersion: 2` を持つ project に **限定**
 * - v1 archived project (= archive.manifest.json 不在 OR archiveVersion != 2) は **scope 外**
 * - active project は scope 外
 *
 * landed: archive-v2 program PR 4 (= 2026-05-04)
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see docs/contracts/project-archive.schema.json
 * @see references/05-aag-interface/operations/project-checklist-governance.md §6.4
 * @see projects/completed/aag-self-hosting-completion/archive.manifest.json (= PR 3 pilot)
 */

import path from 'path'
import fs from 'fs'
import { describe, it, expect } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../')
const COMPLETED_ROOT = path.join(PROJECT_ROOT, 'projects/completed')
const SHA_PATTERN = /^[a-f0-9]{40}$/

interface ManifestEntry {
  readonly projectId: string
  readonly manifestPath: string
  readonly manifest: Record<string, unknown>
}

function findV2Manifests(): ManifestEntry[] {
  const results: ManifestEntry[] = []
  if (!fs.existsSync(COMPLETED_ROOT)) return results
  for (const entry of fs.readdirSync(COMPLETED_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifestPath = path.join(COMPLETED_ROOT, entry.name, 'archive.manifest.json')
    if (!fs.existsSync(manifestPath)) continue
    let manifest: Record<string, unknown>
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>
    } catch {
      continue
    }
    if (manifest['archiveVersion'] !== 2) continue
    results.push({
      projectId: entry.name,
      manifestPath,
      manifest,
    })
  }
  return results
}

const REQUIRED_TOP_FIELDS = [
  'archiveVersion',
  'projectId',
  'title',
  'archivedAt',
  'preCompressionCommit',
  'deletedPaths',
  'compressedFiles',
  'restoreAllCommand',
  'decisionEntries',
  'commitLineage',
  'compressionRationale',
] as const

const REQUIRED_ARCHIVE_MD_SECTIONS = [
  '## 完遂内容',
  '## archive 経緯',
  '## restore 手順',
  '## 関連',
] as const

describe('Archive v2 Schema Guard (= archive-v2 PR 4)', () => {
  const v2Manifests = findV2Manifests()

  it('A1: v2 archived project が 1 件以上存在 (= PR 3 pilot 後の sanity)', () => {
    expect(v2Manifests.length).toBeGreaterThanOrEqual(1)
  })

  it('A2: 全 v2 manifest が必須 top-level field を持つ', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      for (const field of REQUIRED_TOP_FIELDS) {
        if (!(field in entry.manifest)) {
          violations.push(`${entry.projectId}: 必須 field '${field}' 不在`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('A3: archiveVersion === 2 + projectId が compressedDirectory basename と一致', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      if (entry.manifest['archiveVersion'] !== 2) {
        violations.push(`${entry.projectId}: archiveVersion is not 2`)
      }
      if (entry.manifest['projectId'] !== entry.projectId) {
        violations.push(
          `${entry.projectId}: manifest projectId '${String(entry.manifest['projectId'])}' != directory basename`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('A4: preCompressionCommit が 40-char SHA format', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const sha = entry.manifest['preCompressionCommit']
      if (typeof sha !== 'string' || !SHA_PATTERN.test(sha)) {
        violations.push(
          `${entry.projectId}: preCompressionCommit '${String(sha)}' is not a 40-char SHA`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('A5: restoreAllCommand が `git checkout <preCompressionCommit> --` で始まる', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const sha = entry.manifest['preCompressionCommit']
      const cmd = entry.manifest['restoreAllCommand']
      if (typeof cmd !== 'string') {
        violations.push(`${entry.projectId}: restoreAllCommand is not a string`)
        continue
      }
      const expectedPrefix = `git checkout ${String(sha)} --`
      if (!cmd.startsWith(expectedPrefix)) {
        violations.push(
          `${entry.projectId}: restoreAllCommand does not start with '${expectedPrefix}'`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('A6: decisionEntries の commitSha が SHA format または null', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const decisions = entry.manifest['decisionEntries']
      if (!Array.isArray(decisions)) {
        violations.push(`${entry.projectId}: decisionEntries is not an array`)
        continue
      }
      for (const d of decisions) {
        if (typeof d !== 'object' || d === null) continue
        const obj = d as Record<string, unknown>
        const id = obj['id']
        const sha = obj['commitSha']
        if (typeof id !== 'string' || id.length === 0) {
          violations.push(`${entry.projectId}: decisionEntries entry missing id`)
        }
        if (sha !== null && (typeof sha !== 'string' || !SHA_PATTERN.test(sha))) {
          violations.push(
            `${entry.projectId}: decisionEntries '${String(id)}' commitSha '${String(sha)}' is not a 40-char SHA or null`,
          )
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('A7: commitLineage の commitSha が SHA format', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const lineage = entry.manifest['commitLineage']
      if (!Array.isArray(lineage)) {
        violations.push(`${entry.projectId}: commitLineage is not an array`)
        continue
      }
      for (const l of lineage) {
        if (typeof l !== 'object' || l === null) continue
        const obj = l as Record<string, unknown>
        const phase = obj['phase']
        const sha = obj['commitSha']
        if (typeof phase !== 'string' || phase.length === 0) {
          violations.push(`${entry.projectId}: commitLineage entry missing phase`)
        }
        if (typeof sha !== 'string' || !SHA_PATTERN.test(sha)) {
          violations.push(
            `${entry.projectId}: commitLineage '${String(phase)}' commitSha '${String(sha)}' is not a 40-char SHA`,
          )
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('A8: ARCHIVE.md 存在 + minimum sections を含む', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const archivePath = path.join(COMPLETED_ROOT, entry.projectId, 'ARCHIVE.md')
      if (!fs.existsSync(archivePath)) {
        violations.push(`${entry.projectId}: ARCHIVE.md does not exist`)
        continue
      }
      const content = fs.readFileSync(archivePath, 'utf-8')
      for (const section of REQUIRED_ARCHIVE_MD_SECTIONS) {
        if (!content.includes(section)) {
          violations.push(`${entry.projectId}: ARCHIVE.md missing section '${section}'`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('A9: config/project.json が残置 (= deletedFilesException、AAG identification key)', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const configPath = path.join(COMPLETED_ROOT, entry.projectId, 'config/project.json')
      if (!fs.existsSync(configPath)) {
        violations.push(
          `${entry.projectId}: config/project.json missing (= AAG identification key、v2 圧縮対象から除外必須)`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('A10: deletedPaths が config/project.json を含まない (= 例外 articulation 整合)', () => {
    const violations: string[] = []
    for (const entry of v2Manifests) {
      const deletedPaths = entry.manifest['deletedPaths']
      if (!Array.isArray(deletedPaths)) continue
      for (const p of deletedPaths) {
        if (typeof p !== 'string') continue
        if (p.endsWith('/config/project.json')) {
          violations.push(
            `${entry.projectId}: deletedPaths contains config/project.json (= 残置必須、削除禁止)`,
          )
        }
      }
    }
    expect(violations).toEqual([])
  })
})
