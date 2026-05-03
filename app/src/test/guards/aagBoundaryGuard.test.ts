/**
 * aagBoundaryGuard — AAG framework boundary 機械検証
 *
 * **役割**: aag/ tree と references/ tree の reader-別 structural separation を機械検証。
 *   主アプリ改修 AI / 人間が物理配置を見て「読む / 読まない」を即判断できる boundary を ratchet-down baseline=0 で守る。
 *
 * **landing**: aag-self-hosting-completion R1 (= 本 commit) で sub-invariant (a) active。
 *   R2 で sub-invariant (b) + (c) active、R5 で sub-invariant (d) active 予定。
 *
 * **sub-invariants**:
 *   - (a) AAG framework 内部 9 doc は aag/_internal/ にのみ存在 (= R1 で active)
 *   - (b) aag/ 配下に主アプリ改修者向け doc を置かない (= R2 で active 予定)
 *   - (c) references/05-aag-interface/ 外に AAG public interface doc を置かない (= R2 で active 予定)
 *   - (d) references/05-aag-interface/protocols/ 外に operational-protocol-system M1-M5 deliverable を置かない (= R5 で active 予定)
 *
 * **不可侵原則 5 application**: ratchet-down baseline=0、Hard fail、pre-commit hook 統合 (R7 で boundaryIntegrityGuard に集約)
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see projects/aag-self-hosting-completion/plan.md §6.2 (= guard 一覧)
 * @see aag/README.md (= boundary 警告)
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../../..')
const AAG_INTERNAL = 'aag/_internal'

/**
 * AAG framework 内部 9 doc (= aag/_internal/ にのみ存在すべき)
 *
 * ALL_DOCS = README.md + 8 unique-name doc。README.md は generic 名前のため uniqueness 検証対象外
 * (= 本 boundary guard は unique 名 doc が aag/_internal/ 外に出現することを検出)。
 */
const AAG_INTERNAL_DOCS_ALL = [
  'README.md',
  'meta.md',
  'strategy.md',
  'architecture.md',
  'evolution.md',
  'source-of-truth.md',
  'operational-classification.md',
  'layer-map.md',
  'display-rule-registry.md',
]

/**
 * AAG framework 内部 doc unique 名 (= boundary uniqueness check 対象)
 *   README.md は generic 名前で他にも多数存在のため除外
 */
const AAG_INTERNAL_UNIQUE_NAMES = AAG_INTERNAL_DOCS_ALL.filter((n) => n !== 'README.md')

/**
 * Sub-invariant (a) ALLOWLIST: 9 doc 名と同名でも別 location に置かれる正当な file
 *   - projects/_template/aag/execution-overlay.ts は AAG framework 内部 doc ではない (= overlay)
 *   - projects/<id>/aag/execution-overlay.ts も同様
 *   - aag/core/AAG_CORE_INDEX.md など top-level aag/core/ 配下は別 invariant
 *   - projects/completed/ 配下の archived doc は immutable archive (= 例外)
 */
const ALLOWLIST_PATHS_FOR_SAME_NAME = [
  /^projects\/.*\/aag\/execution-overlay\.ts$/,
  /^projects\/completed\//,
  /^references\/99-archive\//,
  /^aag\/core\//,
  /^aag\/_framework\//,
]

function shouldSkip(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/')
  return ALLOWLIST_PATHS_FOR_SAME_NAME.some((rx) => rx.test(norm))
}

/**
 * find all .md files with one of AAG_INTERNAL_DOCS names anywhere in repo
 * (excluding allowlist paths)
 */
function findAagInternalDocsOutside(): string[] {
  const matches: string[] = []
  function walk(dir: string, relBase: string) {
    let entries: import('node:fs').Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name)
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue
        walk(abs, rel)
      } else if (entry.isFile() && AAG_INTERNAL_UNIQUE_NAMES.includes(entry.name)) {
        // is in aag/_internal/ ?
        if (rel.startsWith(`${AAG_INTERNAL}/`)) continue
        // is in allowlist ?
        if (shouldSkip(rel)) continue
        matches.push(rel)
      }
    }
  }
  walk(REPO_ROOT, '')
  return matches
}

describe('aagBoundaryGuard — AAG framework boundary 機械検証', () => {
  describe('sub-invariant (a): AAG framework 内部 9 doc は aag/_internal/ にのみ存在', () => {
    it('aag/_internal/ に 9 doc 全件存在する', () => {
      const missing = AAG_INTERNAL_DOCS_ALL.filter(
        (name) => !existsSync(join(REPO_ROOT, AAG_INTERNAL, name)),
      )
      expect(missing, `aag/_internal/ に欠落: ${missing.join(', ')}`).toEqual([])
    })

    it('aag/_internal/ 外に AAG framework unique-name doc が存在しない (= 8 unique names ratchet-down baseline=0)', () => {
      const violations = findAagInternalDocsOutside()
      expect(
        violations,
        `AAG framework 内部 unique-name doc が aag/_internal/ 外に発見: ${violations.join(', ')}\n` +
          `aag/_internal/ にのみ存在すべき (= aag-self-hosting-completion R1 boundary articulate)。\n` +
          `archive 例外は ALLOWLIST_PATHS_FOR_SAME_NAME に追加してください。`,
      ).toEqual([])
    })
  })

  describe('sub-invariant (b): aag/ 配下に主アプリ改修者向け doc 配置 0 件 (= R2 で active)', () => {
    /**
     * AAG public interface 5 doc canonical names (= references/05-aag-interface/ 配下にのみ存在すべき)
     */
    const AAG_PUBLIC_INTERFACE_DOCS = [
      'decision-articulation-patterns.md',
      'projectization-policy.md',
      'project-checklist-governance.md',
      'new-project-bootstrap-guide.md',
      'deferred-decision-pattern.md',
    ]

    function findPublicInterfaceDocsInAag(): string[] {
      const matches: string[] = []
      function walk(dir: string, relBase: string) {
        let entries: import('node:fs').Dirent[]
        try {
          entries = readdirSync(dir, { withFileTypes: true })
        } catch {
          return
        }
        for (const entry of entries) {
          const abs = join(dir, entry.name)
          const rel = relBase ? `${relBase}/${entry.name}` : entry.name
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue
            walk(abs, rel)
          } else if (entry.isFile() && AAG_PUBLIC_INTERFACE_DOCS.includes(entry.name)) {
            matches.push(rel)
          }
        }
      }
      walk(join(REPO_ROOT, 'aag'), 'aag')
      return matches
    }

    it('aag/ 配下に AAG public interface doc が 0 件', () => {
      const violations = findPublicInterfaceDocsInAag()
      expect(
        violations,
        `aag/ 配下に主アプリ改修者向け doc 発見: ${violations.join(', ')}\n` +
          `references/05-aag-interface/ にのみ存在すべき (= reader-別 structural separation)。`,
      ).toEqual([])
    })
  })

  describe('sub-invariant (c): references/05-aag-interface/ 配下に AAG public interface doc 全件存在 (= R2 で active)', () => {
    const AAG_INTERFACE_BASE = 'references/05-aag-interface'

    it('drawer/decision-articulation-patterns.md 存在', () => {
      expect(
        existsSync(join(REPO_ROOT, AAG_INTERFACE_BASE, 'drawer/decision-articulation-patterns.md')),
        'drawer/decision-articulation-patterns.md 不在',
      ).toBe(true)
    })

    it('operations/ 4 doc 全件存在', () => {
      const operationsDocs = [
        'projectization-policy.md',
        'project-checklist-governance.md',
        'new-project-bootstrap-guide.md',
        'deferred-decision-pattern.md',
      ]
      const missing = operationsDocs.filter(
        (name) => !existsSync(join(REPO_ROOT, AAG_INTERFACE_BASE, 'operations', name)),
      )
      expect(missing, `operations/ 配下欠落: ${missing.join(', ')}`).toEqual([])
    })

    it('protocols/ skeleton (= README) 存在', () => {
      expect(
        existsSync(join(REPO_ROOT, AAG_INTERFACE_BASE, 'protocols/README.md')),
        'protocols/README.md 不在 (= R2 で skeleton landing 必要)',
      ).toBe(true)
    })
  })

  // sub-invariant (d) は R5 で active 化予定 (= operational-protocol-system M1-M5 deliverable landing と同時)
})
