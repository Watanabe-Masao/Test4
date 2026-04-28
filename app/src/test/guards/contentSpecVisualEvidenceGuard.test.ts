/**
 * Content Spec Visual Evidence Guard — AR-CONTENT-SPEC-VISUAL-EVIDENCE
 *
 * Phase G 着手 (2026-04-28): kind=chart / kind=ui-component の spec に対し、
 * Storybook story または visual regression test のいずれかが frontmatter に
 * 記録されていることを ratchet-down で要求する。
 *
 * 判定 logic:
 *   evidence あり = stories.length > 0 || visualTests.length > 0
 *   evidence なし = 上記いずれも空
 *
 * baseline=9 (Phase G 着手段階):
 *   cover 済 1 件 (UIC-002 KpiCard) / 対象 10 件 (5 CHART + 5 UIC)
 *   残 9 件は Phase G 後続 batch で story / visual test を整備して 0 化を目指す。
 *
 * 不可侵原則:
 *   chart / UIC は **見た目の変更が業務影響を持つ**（粗利率の色 / 警告 severity の
 *   赤色 / KPI 配置の段差等）。visual evidence なしで silent に変わる drift を
 *   構造的に許容しない。ratchet-down は増加方向に戻さない。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase G,
 * references/05-contents/{charts,ui-components}/README.md §「Visual Evidence」.
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs } from './contentSpecHelpers'
import type { SpecFrontmatter } from '@app-domain/integrity'

const VISUAL_EVIDENCE_TARGET_KINDS = new Set<SpecFrontmatter['kind']>(['chart', 'ui-component'])

function hasVisualEvidence(spec: SpecFrontmatter): boolean {
  const stories = (spec.raw.stories as readonly unknown[] | undefined) ?? []
  const visualTests = (spec.raw.visualTests as readonly unknown[] | undefined) ?? []
  return stories.length > 0 || visualTests.length > 0
}

describe('Content Spec Visual Evidence Guard (AR-CONTENT-SPEC-VISUAL-EVIDENCE)', () => {
  it('chart / ui-component spec の evidence 未整備件数が baseline を超えない（ratchet-down）', () => {
    // Phase G 着手段階で:
    //   - cover 済 (stories or visualTests あり、1 件): UIC-002 KpiCard
    //   - 未 cover (9 件): CHART-001〜005, UIC-001/003/004/005
    //
    // ratchet-down 戦略: Phase G 後続 batch で
    //   - 残 chart 5 件に Storybook story 整備
    //   - 残 UIC 4 件に visual baseline 設置
    //   - empty / loading / error 各 state の story 整備
    // を順次行い、本 baseline を 0 化する。
    //
    // baseline 増加（新 chart / UIC で evidence なし）は禁止。新規追加時は
    // 同 PR で stories / visualTests を整備するか、既存 baseline 内の cover 改善で
    // 相殺すること。
    const VISUAL_EVIDENCE_BASELINE = 9
    const target = loadAllSpecs().filter((s) => VISUAL_EVIDENCE_TARGET_KINDS.has(s.kind))
    const uncovered = target.filter((s) => !hasVisualEvidence(s))
    expect(
      uncovered.length,
      `evidence 未整備 ${uncovered.length} / baseline ${VISUAL_EVIDENCE_BASELINE}\n` +
        `  uncovered: ${uncovered.map((s) => s.id).join(', ')}\n` +
        `  ratchet-down: baseline 以上に増やしてはいけない (新規 chart / UIC は evidence 整備必須)`,
    ).toBeLessThanOrEqual(VISUAL_EVIDENCE_BASELINE)
  })

  it('cover 済 spec の stories / visualTests path が空文字列でない（形式検査）', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!VISUAL_EVIDENCE_TARGET_KINDS.has(spec.kind)) continue
      const stories = (spec.raw.stories as readonly unknown[] | undefined) ?? []
      const visualTests = (spec.raw.visualTests as readonly unknown[] | undefined) ?? []
      for (const item of stories) {
        if (typeof item !== 'string' || item.trim() === '') {
          violations.push(`${spec.id}: stories に空文字列または非 string 値`)
        }
      }
      for (const item of visualTests) {
        if (typeof item !== 'string' || item.trim() === '') {
          violations.push(`${spec.id}: visualTests に空文字列または非 string 値`)
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
