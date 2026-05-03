/**
 * Canonical Doc Ref Integrity Guard — Project B Phase 4 meta-guard #2
 *
 * 各 rule の canonicalDocRef.refs[].docPath が repository 内に実在 file を指すか
 * 機械検証する (forward direction = 実装 → 設計 doc binding の参照健全性)。
 * protocol §2.5 path 実在 を hard fail で実装。
 *
 * 検証:
 * - canonicalDocRef.status='bound' の rule で、refs[].docPath が repository root から
 *   resolve できる実在 file であること (deleted file は hard fail)
 *
 * archived doc (= references/99-archive/ 配下) も「実在」と扱う。重要なのは
 * 「指す先が物理的に存在するか」であり、refactor / archive 時の参照壊れの即座検出。
 *
 * @guard F8 正本保護
 * @guard G8 責務分離ガード
 * @see references/04-tracking/ar-rule-audit.md §2.5 (`AAG-REQ-SEMANTIC-ARTICULATION` + `AAG-REQ-BIDIRECTIONAL-INTEGRITY` の機械検証)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ARCHITECTURE_RULES } from '../architectureRules'

const REPO_ROOT = path.resolve(__dirname, '../../../..')

describe('Canonical Doc Ref Integrity Guard: forward direction の参照健全性', () => {
  it('全 rule の canonicalDocRef.refs[].docPath が実在 file を指す', () => {
    const violations: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      const binding = rule.canonicalDocRef
      if (!binding || binding.status !== 'bound') continue
      for (const ref of binding.refs) {
        const absPath = path.resolve(REPO_ROOT, ref.docPath)
        if (!fs.existsSync(absPath)) {
          violations.push(
            `${rule.id}.canonicalDocRef.refs[].docPath: '${ref.docPath}' が実在しない (resolved: ${absPath})`,
          )
        }
      }
    }
    expect(violations).toEqual([])
  })
})
