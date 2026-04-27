/**
 * Content Spec Existence Guard — AR-CONTENT-SPEC-EXISTS
 *
 * Phase B scope (2026-04-27): 全 45 WID について双方向の存在性を検証する。
 *
 * - 順方向: spec frontmatter の registrySource / widgetDefId が示す source
 *   ファイルに、当該 widget def が実在する。
 * - 逆方向: source の `id: '<widgetDefId>'` 行の直前に
 *   `@widget-id WID-NNN` JSDoc が付与されている。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A / §Phase B,
 * references/05-contents/widgets/README.md §「存在軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs, readSourceContent, findIdLine } from './contentSpecHelpers'

describe('Content Spec Existence Guard (AR-CONTENT-SPEC-EXISTS)', () => {
  it('全 WID-NNN.md spec が source の widget def と双方向存在する', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      const source = readSourceContent(spec)
      if (source == null) {
        violations.push(`${spec.id}: registrySource not found: ${spec.registrySource}`)
        continue
      }
      const idLine = findIdLine(source, spec.widgetDefId)
      if (idLine === 0) {
        violations.push(
          `${spec.id}: widgetDefId='${spec.widgetDefId}' が ${spec.registrySource} に存在しない`,
        )
        continue
      }
      // verify @widget-id JSDoc is present near the id line (within 3 lines above)
      const sourceLines = source.split('\n')
      const widTag = `@widget-id ${spec.id}`
      let found = false
      for (let i = Math.max(0, idLine - 4); i < idLine; i++) {
        if (sourceLines[i]?.includes(widTag)) {
          found = true
          break
        }
      }
      if (!found) {
        violations.push(
          `${spec.id}: ${spec.registrySource}:${idLine} の id 直前 3 行以内に \`/** ${widTag} */\` JSDoc が見当たらない`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
