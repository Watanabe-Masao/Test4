/**
 * Taxonomy Interlock Guard — taxonomy-v2 子 Phase 3 (Guard 実装、共通 infra)
 *
 * 役割: 親 plan §taxonomy-interlock.md §2 完全マトリクスに基づき、
 * **R:tag が発行する test obligation** と **T:kind が検証する R:tag** の
 * **双方向契約**（原則 4: Tag ↔ Test は双方向契約）を機械検証する。
 *
 * 検出する違反 (本 Phase 3 共通 infra deliverable):
 *
 * - **INTERLOCK-1: R⇔T registry の双方向整合**
 *   - responsibility registry V2 の各 R:tag が指定する `interlock.requiredTKinds` の全件が
 *     test registry V2 に存在する
 *   - test registry V2 の各 T:kind が指定する `interlock.verifies` の全件が
 *     responsibility registry V2 に存在する（または `R:unclassified`）
 *   - 双方向で参照が壊れていれば hard fail
 *
 * - **INTERLOCK-2: Anchor Slice 整合**
 *   - 親 plan §OCS.7 の Anchor 5 R:tag が責務 registry V2 で `isAnchorSliceTag` true
 *   - 親 plan §OCS.7 の Anchor 6 T:kind が test registry V2 で `isAnchorSliceKind` true
 *
 * - **INTERLOCK-3: Cognitive Load Ceiling 15 cap (両軸合算ではなく軸ごと)**
 *   - 責務軸 vocabulary 数 ≤ 15
 *   - test 軸 vocabulary 数 ≤ 15
 *
 * - **INTERLOCK-4: Antibody Pair 双方向対称性 (原則 6)**
 *   - 責務 registry V2 で `R:A.antibodyPair = R:B` なら `R:B.antibodyPair = R:A`（または null）
 *   - test registry V2 で同様
 *
 * - **INTERLOCK-5: Obligation 強度の整合 (test 軸固有)**
 *   - test registry V2 の各 T:kind の obligation strength は must/should/may のいずれか
 *   - sentinel (T:unclassified) は may-have
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

describe('Taxonomy Interlock Guard (taxonomy-v2 Phase 3 共通 infra)', () => {
  it('INTERLOCK-1a: 全 R:tag の requiredTKinds が test registry V2 に存在する (R → T)', () => {
    const violations: string[] = []
    for (const rTag of RESPONSIBILITY_TAGS_V2) {
      const entry = RESPONSIBILITY_TAG_REGISTRY_V2[rTag]
      for (const tKind of entry.interlock.requiredTKinds) {
        if (!isTestTaxonomyKindV2(tKind)) {
          violations.push(`${rTag} → ${tKind}: T:kind が test registry V2 に存在しない`)
        }
      }
    }
    expect(
      violations,
      `双方向契約 R → T 違反 (${violations.length} 件):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('INTERLOCK-1b: 全 T:kind の verifies R:tag が responsibility registry V2 に存在する (T → R)', () => {
    const violations: string[] = []
    for (const tKind of TEST_TAXONOMY_KINDS_V2) {
      const entry = TEST_TAXONOMY_REGISTRY_V2[tKind]
      for (const rTag of entry.interlock.verifies) {
        if (!RESPONSIBILITY_TAGS_V2.includes(rTag as (typeof RESPONSIBILITY_TAGS_V2)[number])) {
          violations.push(
            `${tKind} verifies ${rTag}: R:tag が responsibility registry V2 に存在しない`,
          )
        }
      }
    }
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
    expect(
      RESPONSIBILITY_TAGS_V2.length,
      `責務軸 vocabulary 数 ${RESPONSIBILITY_TAGS_V2.length} > ${R_CEILING}`,
    ).toBeLessThanOrEqual(R_CEILING)
    expect(
      TEST_TAXONOMY_KINDS_V2.length,
      `test 軸 vocabulary 数 ${TEST_TAXONOMY_KINDS_V2.length} > ${T_CEILING}`,
    ).toBeLessThanOrEqual(T_CEILING)
  })

  it('INTERLOCK-4a: 責務軸 Antibody Pair 双方向対称性 (原則 6)', () => {
    const violations: string[] = []
    for (const rTag of RESPONSIBILITY_TAGS_V2) {
      const pair = RESPONSIBILITY_TAG_REGISTRY_V2[rTag].antibodyPair
      if (pair === null) continue
      const reverse = RESPONSIBILITY_TAG_REGISTRY_V2[pair].antibodyPair
      if (reverse !== rTag) {
        violations.push(
          `${rTag}.antibodyPair = ${pair} だが ${pair}.antibodyPair = ${reverse} (期待: ${rTag})`,
        )
      }
    }
    expect(
      violations,
      `責務軸 Antibody Pair 非対称 (${violations.length} 件):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('INTERLOCK-4b: test 軸 Antibody Pair 双方向対称性 (原則 6)', () => {
    const violations: string[] = []
    for (const tKind of TEST_TAXONOMY_KINDS_V2) {
      const pair = TEST_TAXONOMY_REGISTRY_V2[tKind].antibodyPair
      if (pair === null) continue
      const reverse = TEST_TAXONOMY_REGISTRY_V2[pair].antibodyPair
      if (reverse !== tKind) {
        violations.push(
          `${tKind}.antibodyPair = ${pair} だが ${pair}.antibodyPair = ${reverse} (期待: ${tKind})`,
        )
      }
    }
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
