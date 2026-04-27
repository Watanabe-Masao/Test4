/**
 * Content Spec Existence Guard — AR-CONTENT-SPEC-EXISTS
 *
 * Phase C scope (2026-04-27): 全 spec (widget + read-model) について双方向の存在性を検証する。
 *
 * - 順方向: spec frontmatter の sourceRef / widgetDefId|exportName が示す source
 *   ファイルに、当該 entry が実在する。
 * - 逆方向: source の anchor 行（widget=`id:` literal / read-model=`export <name>`）
 *   の直前 3 行以内に対応する JSDoc tag (@widget-id / @rm-id) が付与されている。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A / §Phase B / §Phase C,
 * references/05-contents/{widgets,read-models}/README.md §「存在軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs, readSourceContent, findIdLine, findExportLine } from './contentSpecHelpers'

describe('Content Spec Existence Guard (AR-CONTENT-SPEC-EXISTS)', () => {
  it('全 spec (widget + read-model) が source entry と双方向存在する', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      const source = readSourceContent(spec)
      if (source == null) {
        const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
        violations.push(`${spec.id}: source not found: ${path}`)
        continue
      }
      let anchorLine: number
      let anchorDesc: string
      let tag: string
      if (spec.kind === 'widget') {
        anchorLine = findIdLine(source, spec.widgetDefId)
        anchorDesc = `widgetDefId='${spec.widgetDefId}'`
        tag = `@widget-id ${spec.id}`
      } else {
        anchorLine = findExportLine(source, spec.exportName)
        anchorDesc = `export '${spec.exportName}'`
        tag = `@rm-id ${spec.id}`
      }
      if (anchorLine === 0) {
        const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
        violations.push(`${spec.id}: ${anchorDesc} が ${path} に存在しない`)
        continue
      }
      const sourceLines = source.split('\n')
      let found = false
      for (let i = Math.max(0, anchorLine - 4); i < anchorLine; i++) {
        if (sourceLines[i]?.includes(tag)) {
          found = true
          break
        }
      }
      if (!found) {
        const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
        violations.push(
          `${spec.id}: ${path}:${anchorLine} の anchor 直前 3 行以内に \`/** ${tag} */\` JSDoc が見当たらない`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
