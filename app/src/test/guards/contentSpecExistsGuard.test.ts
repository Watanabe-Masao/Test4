/**
 * Content Spec Existence Guard — AR-CONTENT-SPEC-EXISTS
 *
 * Phase D scope (2026-04-27): 全 spec (widget + read-model + calculation) について
 * 双方向の存在性を検証する。
 *
 * - 順方向: spec frontmatter の sourceRef / widgetDefId|exportName が示す source
 *   ファイルに、当該 entry が実在する。
 * - 逆方向: source の anchor 行（widget=`id:` literal / read-model|calculation=`export <name>`）
 *   の直前 3 行以内に対応する JSDoc tag (@widget-id / @rm-id / @calc-id) が付与されている。
 *
 * lifecycleStatus='proposed' は source 不在を許容（candidate 計画段階）。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A〜D,
 * references/05-contents/{widgets,read-models,calculations}/README.md §「存在軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs, readSourceContent } from './contentSpecHelpers'
import { findIdLine, findExportLine } from '@app-domain/integrity'

function jsdocTagFor(spec: { kind: string; id: string }): string {
  if (spec.kind === 'widget') return `@widget-id ${spec.id}`
  if (spec.kind === 'read-model') return `@rm-id ${spec.id}`
  if (spec.kind === 'calculation') return `@calc-id ${spec.id}`
  if (spec.kind === 'chart') return `@chart-id ${spec.id}`
  if (spec.kind === 'ui-component') return `@uic-id ${spec.id}`
  return `@id ${spec.id}`
}

describe('Content Spec Existence Guard (AR-CONTENT-SPEC-EXISTS)', () => {
  it('全 spec (widget + read-model + calculation) が source entry と双方向存在する', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      // proposed は source 不在を許容（candidate 計画段階）
      if (spec.lifecycleStatus === 'proposed') continue
      const source = readSourceContent(spec)
      if (source == null) {
        const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
        violations.push(`${spec.id}: source not found: ${path}`)
        continue
      }
      let anchorLine: number
      let anchorDesc: string
      const tag = jsdocTagFor(spec)
      if (spec.kind === 'widget') {
        anchorLine = findIdLine(source, spec.widgetDefId)
        anchorDesc = `widgetDefId='${spec.widgetDefId}'`
      } else {
        anchorLine = findExportLine(source, spec.exportName)
        anchorDesc = `export '${spec.exportName}'`
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
