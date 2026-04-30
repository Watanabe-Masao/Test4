/**
 * Content Spec Co-Change Guard — AR-CONTENT-SPEC-CO-CHANGE
 *
 * Phase C scope (2026-04-27, static): 全 spec (widget + read-model) について、
 * frontmatter の line field (widget=`registryLine` / read-model=`sourceLine`) が
 * source 上の実 anchor 行と一致する。一致していない = source が変更されたのに
 * spec の line / lastVerifiedCommit が更新されていない、と解釈する。
 *
 * Phase A/B/C は静的検証のみ（git diff を持たない）。Phase I (PR Impact Report)
 * で base..HEAD diff ベースの真の co-change 検証に置き換える。
 *
 * 詳細: projects/completed/phased-content-specs-rollout/plan.md §Phase A / §Phase B / §Phase C,
 * references/05-contents/{widgets,read-models}/README.md §「構造軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs, readSourceContent } from './contentSpecHelpers'
import { findIdLine, findExportLine } from '@app-domain/integrity'

describe('Content Spec Co-Change Guard (AR-CONTENT-SPEC-CO-CHANGE)', () => {
  it('全 spec の anchor 行 (registryLine / sourceLine) が source の実 anchor 行と一致する', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      const source = readSourceContent(spec)
      if (source == null) {
        const path = spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
        violations.push(`${spec.id}: source not found: ${path}`)
        continue
      }
      let actualLine: number
      let declaredLine: number
      let anchorDesc: string
      let path: string
      if (spec.kind === 'widget') {
        actualLine = findIdLine(source, spec.widgetDefId)
        declaredLine = spec.registryLine
        anchorDesc = `widgetDefId='${spec.widgetDefId}'`
        path = spec.registrySource
      } else {
        actualLine = findExportLine(source, spec.exportName)
        declaredLine = spec.sourceLine
        anchorDesc = `export '${spec.exportName}'`
        path = spec.sourceRef
      }
      if (actualLine === 0) {
        violations.push(`${spec.id}: ${anchorDesc} が source に存在しない (${path})`)
        continue
      }
      if (actualLine !== declaredLine) {
        violations.push(
          `${spec.id}: line drift — frontmatter=${declaredLine}, actual=${actualLine} (${path}).` +
            ` \`node tools/widget-specs/generate.mjs\` を実行して同期すること。`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('全 spec の lastVerifiedCommit が空でない', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!spec.lastVerifiedCommit || spec.lastVerifiedCommit.trim() === '') {
        violations.push(
          `${spec.id}: lastVerifiedCommit が未設定。spec を生成した最後の commit hash を記録すること。`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
