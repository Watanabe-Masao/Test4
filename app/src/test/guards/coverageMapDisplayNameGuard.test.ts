/**
 * Coverage Map Display Name Guard — AR-COVERAGE-MAP-DISPLAY-NAME-COUNT
 *
 * Phase K Option 1 後続 B (2026-04-29): integrity COVERAGE_MAP の各 pair の
 * `displayName` 末尾 `× N` 表記が `guardFiles.length` と一致することを機械検証する。
 *
 * 背景:
 *   PR #1207 着手時に `contentSpec*Guard × 11` を `× 12` に手作業で更新する
 *   作業を強いられた (新 guard `contentSpecLastSourceCommitGuard` 追加に伴う
 *   count drift)。この `× N` は coverage-map.json の displayName + APP_DOMAIN_INDEX.md /
 *   HANDOFF.md の prose に重複出現し、guard 追加・撤退のたびに手作業更新が必要で
 *   drift の温床。本 guard は coverage-map 内での自己整合 (displayName ↔ guardFiles
 *   count) を構造的に保証し、APP_DOMAIN_INDEX.md 等は同 displayName を参照する形に
 *   段階的に整備する道を開く。
 *
 * 検証内容:
 *   各 COVERAGE_MAP entry について displayName から `× <数字>` を抽出し、
 *   guardFiles.length と一致しなければ hard fail。
 *
 * @guard G1 テストに書く / governance-ops
 * @taxonomyKind T:meta-guard
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { COVERAGE_MAP } from '@app-domain/integrity'

interface DisplayNameMismatch {
  readonly pairId: string
  readonly displayName: string
  readonly declared: number
  readonly actual: number
}

function extractCountFromDisplayName(displayName: string): number | null {
  // 末尾の `× <数字>` を抽出 (全角/半角どちらも考慮)
  const m = displayName.match(/[×x]\s*(\d+)\s*$/)
  return m ? Number(m[1]) : null
}

describe('Coverage Map Display Name Guard (AR-COVERAGE-MAP-DISPLAY-NAME-COUNT)', () => {
  it('全 pair の displayName 末尾 `× N` が guardFiles.length と一致する', () => {
    const mismatches: DisplayNameMismatch[] = []
    for (const pair of COVERAGE_MAP) {
      const declared = extractCountFromDisplayName(pair.displayName)
      const actual = pair.guardFiles.length
      // displayName に `× N` が無い entry は対象外 (例: deferred / 単一 guard)
      if (declared === null) continue
      if (declared !== actual) {
        mismatches.push({
          pairId: pair.pairId,
          displayName: pair.displayName,
          declared,
          actual,
        })
      }
    }
    const messages = mismatches.map(
      (m) =>
        `pair=${m.pairId}: displayName="${m.displayName}" の × ${m.declared} と guardFiles.length=${m.actual} が不一致。\n` +
        `    → 修正: coverage-map.json の displayName 末尾を "× ${m.actual}" に更新`,
    )
    expect(mismatches.length, messages.join('\n')).toBe(0)
  })
})
