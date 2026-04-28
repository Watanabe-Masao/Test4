/**
 * Taxonomy Interlock Guard — taxonomy-v2 子 Phase 3 (Guard 実装、共通 infra)
 *
 * 役割: 親 plan §taxonomy-interlock.md §2 完全マトリクスに基づき、
 * **R:tag が発行する test obligation** と **T:kind が検証する R:tag** の
 * **双方向契約**（原則 4: Tag ↔ Test は双方向契約）を機械検証する。
 *
 * **Phase D Wave 2 (2026-04-28)**: canonicalization-domain-consolidation Phase D で
 * `app-domain/integrity/` 経由の adapter 化。INTERLOCK-1 を checkInclusionByPredicate /
 * INTERLOCK-3 を checkUpperBound / INTERLOCK-4 を checkBidirectionalReference 経由に切替。
 * INTERLOCK-2 / 5 / 6 は値固有の assertion なので caller side に残置。
 * 動作同一性は 9 既存 test で検証済。
 *
 * 検出する違反 (本 Phase 3 共通 infra deliverable):
 *
 * - **INTERLOCK-1**: R⇔T registry の双方向整合 (両方向 inclusion)
 * - **INTERLOCK-2**: Anchor Slice 整合 (5 R + 6 T)
 * - **INTERLOCK-3**: Cognitive Load Ceiling 15 cap (軸ごと)
 * - **INTERLOCK-4**: Antibody Pair 双方向対称性 (原則 6)
 * - **INTERLOCK-5**: Obligation 強度の整合 (test 軸固有)
 *
 * Anchor Slice §OCS.5 Promotion Gate L4 (Guarded) 到達条件の主要項目:
 * - 本 guard が PASS している
 *
 * @responsibility R:guard
 * @see references/01-principles/taxonomy-interlock.md (R⇔T 完全マトリクス)
 * @see references/01-principles/responsibility-taxonomy-schema.md
 * @see references/01-principles/test-taxonomy-schema.md
 * @see app/src/test/responsibilityTaxonomyRegistryV2.ts
 * @see app/src/test/testTaxonomyRegistryV2.ts
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  RESPONSIBILITY_TAGS_V2,
  RESPONSIBILITY_TAG_REGISTRY_V2,
  ANCHOR_SLICE_R_TAGS,
  isAnchorSliceTag,
  COGNITIVE_LOAD_CEILING as R_CEILING,
} from '../responsibilityTaxonomyRegistryV2'
import {
  TEST_TAXONOMY_KINDS_V2,
  TEST_TAXONOMY_REGISTRY_V2,
  ANCHOR_SLICE_T_KINDS,
  isAnchorSliceKind,
  isTestTaxonomyKindV2,
  COGNITIVE_LOAD_CEILING as T_CEILING,
} from '../testTaxonomyRegistryV2'
import {
  checkInclusionByPredicate,
  checkUpperBound,
  checkBidirectionalReference,
} from '@app-domain/integrity'

const RULE_ID = 'taxonomyInterlockGuard'

describe('Taxonomy Interlock Guard (taxonomy-v2 Phase 3 共通 infra)', () => {
  it('INTERLOCK-1a: 全 R:tag の requiredTKinds が test registry V2 に存在する (R → T)', () => {
    // 全 R:tag が要求する T:kind の集合を集約
    const referencedTKinds = new Set<string>()
    for (const rTag of RESPONSIBILITY_TAGS_V2) {
      for (const tKind of RESPONSIBILITY_TAG_REGISTRY_V2[rTag].interlock.requiredTKinds) {
        referencedTKinds.add(tKind)
      }
    }
    const reports = checkInclusionByPredicate(referencedTKinds, isTestTaxonomyKindV2, {
      ruleId: RULE_ID,
      subsetLabel: 'R:tag.requiredTKinds',
      supersetLabel: 'test registry V2',
    })
    const violations = reports.map((r) => {
      const tKind = r.location.replace(/^test registry V2: /, '')
      // どの R:tag が参照していたかを再構築 (drift 報告精度維持)
      const referencer = RESPONSIBILITY_TAGS_V2.find((rTag) =>
        RESPONSIBILITY_TAG_REGISTRY_V2[rTag].interlock.requiredTKinds.some((k) => k === tKind),
      )
      return `${referencer ?? '<unknown>'} → ${tKind}: T:kind が test registry V2 に存在しない`
    })
    expect(
      violations,
      `双方向契約 R → T 違反 (${violations.length} 件):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('INTERLOCK-1b: 全 T:kind の verifies R:tag が responsibility registry V2 に存在する (T → R)', () => {
    const referencedRTags = new Set<string>()
    for (const tKind of TEST_TAXONOMY_KINDS_V2) {
      for (const rTag of TEST_TAXONOMY_REGISTRY_V2[tKind].interlock.verifies) {
        referencedRTags.add(rTag)
      }
    }
    const knownR = new Set<string>(RESPONSIBILITY_TAGS_V2)
    const reports = checkInclusionByPredicate(referencedRTags, (rTag) => knownR.has(rTag), {
      ruleId: RULE_ID,
      subsetLabel: 'T:kind.verifies',
      supersetLabel: 'responsibility registry V2',
    })
    const violations = reports.map((r) => {
      const rTag = r.location.replace(/^responsibility registry V2: /, '')
      const referencer = TEST_TAXONOMY_KINDS_V2.find((tKind) =>
        TEST_TAXONOMY_REGISTRY_V2[tKind].interlock.verifies.some((rt) => rt === rTag),
      )
      return `${referencer ?? '<unknown>'} verifies ${rTag}: R:tag が responsibility registry V2 に存在しない`
    })
    expect(
      violations,
      `双方向契約 T → R 違反 (${violations.length} 件):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('INTERLOCK-2a: Anchor Slice 5 R:tag が responsibility registry V2 に Anchor として登録', () => {
    expect(ANCHOR_SLICE_R_TAGS.length).toBe(5)
    for (const tag of ANCHOR_SLICE_R_TAGS) {
      expect(isAnchorSliceTag(tag), `${tag} が Anchor Slice として認識されない`).toBe(true)
    }
  })

  it('INTERLOCK-2b: Anchor Slice 6 T:kind が test registry V2 に Anchor として登録', () => {
    expect(ANCHOR_SLICE_T_KINDS.length).toBe(6)
    for (const kind of ANCHOR_SLICE_T_KINDS) {
      expect(isAnchorSliceKind(kind), `${kind} が Anchor Slice として認識されない`).toBe(true)
    }
  })

  it('INTERLOCK-3: Cognitive Load Ceiling 15 cap が両軸で satisfied', () => {
    const rViolations = checkUpperBound(RESPONSIBILITY_TAGS_V2.length, {
      ruleId: RULE_ID,
      counterLabel: '責務軸 vocabulary 数',
      upperBound: R_CEILING,
    })
    const tViolations = checkUpperBound(TEST_TAXONOMY_KINDS_V2.length, {
      ruleId: RULE_ID,
      counterLabel: 'test 軸 vocabulary 数',
      upperBound: T_CEILING,
    })
    expect(
      [...rViolations, ...tViolations].map((v) => v.actual),
      `Cognitive Load Ceiling 違反: ${rViolations.length + tViolations.length} 件`,
    ).toEqual([])
  })

  it('INTERLOCK-4a: 責務軸 Antibody Pair 双方向対称性 (原則 6)', () => {
    const reports = checkBidirectionalReference(
      RESPONSIBILITY_TAGS_V2,
      (rTag) => RESPONSIBILITY_TAG_REGISTRY_V2[rTag].antibodyPair,
      { ruleId: RULE_ID, registryLabel: '責務軸 Antibody Pair' },
    )
    const violations = reports.map((r) => `${r.location} — ${r.actual}`)
    expect(
      violations,
      `責務軸 Antibody Pair 非対称 (${violations.length} 件):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('INTERLOCK-4b: test 軸 Antibody Pair 双方向対称性 (原則 6)', () => {
    const reports = checkBidirectionalReference(
      TEST_TAXONOMY_KINDS_V2,
      (tKind) => TEST_TAXONOMY_REGISTRY_V2[tKind].antibodyPair,
      { ruleId: RULE_ID, registryLabel: 'test 軸 Antibody Pair' },
    )
    const violations = reports.map((r) => `${r.location} — ${r.actual}`)
    expect(
      violations,
      `test 軸 Antibody Pair 非対称 (${violations.length} 件):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('INTERLOCK-5: 全 T:kind の obligation strength が must/should/may のいずれか', () => {
    const valid = new Set(['must-have', 'should-have', 'may-have'])
    const violations: string[] = []
    for (const tKind of TEST_TAXONOMY_KINDS_V2) {
      const obligation = TEST_TAXONOMY_REGISTRY_V2[tKind].interlock.obligation
      if (!valid.has(obligation)) {
        violations.push(
          `${tKind}: obligation = ${obligation} (許容: must-have / should-have / may-have)`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('INTERLOCK-6: T:unclassified が may-have で sentinel として登録 (原則 1)', () => {
    expect(TEST_TAXONOMY_REGISTRY_V2['T:unclassified'].interlock.obligation).toBe('may-have')
    expect(TEST_TAXONOMY_REGISTRY_V2['T:unclassified'].tier).toBe('primary')
  })
})
