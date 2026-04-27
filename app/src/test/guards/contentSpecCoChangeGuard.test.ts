/**
 * Content Spec Co-Change Guard — AR-CONTENT-SPEC-CO-CHANGE
 *
 * Phase A scope (static): Anchor Slice 5 widget について、frontmatter の
 * `registryLine` が source 上の実際の `id: '<widgetDefId>'` 行と一致する。
 * 一致していない = registry が変更されたのに spec の `lastVerifiedCommit` /
 * `registryLine` が更新されていない、と解釈する。
 *
 * Phase A は静的検証のみ（git diff を持たない）。Phase I (PR Impact Report)
 * で base..HEAD diff ベースの真の co-change 検証に置き換える。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A,
 * references/05-contents/widgets/README.md §「構造軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAnchorSpecs, readSourceContent, findIdLine } from './contentSpecHelpers'

describe('Content Spec Co-Change Guard (AR-CONTENT-SPEC-CO-CHANGE)', () => {
  it('Anchor Slice 5 件の registryLine が source の実 id 行と一致する', () => {
    const violations: string[] = []
    for (const spec of loadAnchorSpecs()) {
      const source = readSourceContent(spec)
      if (source == null) {
        violations.push(`${spec.id}: registrySource not found: ${spec.registrySource}`)
        continue
      }
      const actualLine = findIdLine(source, spec.widgetDefId)
      if (actualLine === 0) {
        violations.push(`${spec.id}: widgetDefId='${spec.widgetDefId}' が source に存在しない`)
        continue
      }
      if (actualLine !== spec.registryLine) {
        violations.push(
          `${spec.id}: registryLine drift — frontmatter=${spec.registryLine}, actual=${actualLine}` +
            ` (${spec.registrySource}). \`node tools/widget-specs/generate.mjs --wid ${spec.id}\` を実行して同期すること。`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('Anchor Slice 5 件の lastVerifiedCommit が空でない', () => {
    const violations: string[] = []
    for (const spec of loadAnchorSpecs()) {
      if (!spec.lastVerifiedCommit || spec.lastVerifiedCommit.trim() === '') {
        violations.push(
          `${spec.id}: lastVerifiedCommit が未設定。spec を生成した最後の commit hash を記録すること。`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
