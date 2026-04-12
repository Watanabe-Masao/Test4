/**
 * ページ正本ガードテスト
 *
 * PAGE_REGISTRY の整合性を機械検証する。
 * pageComponentMap.ts の PAGE_COMPONENT_MAP との一致も検証。
 *
 * @guard F10 ページ正本の整合性
 * ルール定義: architectureRules.ts (AR-STRUCT-PAGE-META)
 */
import { describe, it, expect } from 'vitest'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  PAGE_REGISTRY,
  REDIRECT_REGISTRY,
  getNavPages,
  getMobileNavPages,
  getStandardPageIds,
} from '@/application/navigation/pageRegistry'
import type { ViewType } from '@/domain/models/PageMeta'
import { PAGE_COMPONENT_MAP } from '@/presentation/pageComponentMap'

// ── ViewType の全メンバー（domain/models/PageMeta.ts の定義と一致させる） ──
const EXPECTED_VIEW_TYPES: readonly ViewType[] = [
  'dashboard',
  'store-analysis',
  'daily',
  'insight',
  'category',
  'cost-detail',
  'purchase-analysis',
  'reports',
  'weather',
  'admin',
]

describe('pageMetaGuard', () => {
  const rule = getRuleById('AR-STRUCT-PAGE-META')!

  // ── 1. navVisible なページは pathPattern を持つ ──
  it('navVisible ページは pathPattern を持つ', () => {
    const violations = PAGE_REGISTRY.filter((p) => p.navVisible && !p.pathPattern)
    expect(
      violations.map((p) => p.id),
      formatViolationMessage(
        rule,
        violations.map((p) => p.id),
      ),
    ).toEqual([])
  })

  // ── 2. shortcutIndex は重複しない ──
  it('shortcutIndex は重複しない', () => {
    const indices = PAGE_REGISTRY.filter((p) => p.shortcutIndex != null).map((p) => p.shortcutIndex)
    const duplicates = indices.filter((v, i) => indices.indexOf(v) !== i)
    expect(duplicates, formatViolationMessage(rule, duplicates.map(String))).toEqual([])
  })

  // ── 3. mobileNavVisible は navVisible の subset ──
  it('mobileNavVisible: true → navVisible: true', () => {
    const violations = PAGE_REGISTRY.filter((p) => p.mobileNavVisible && !p.navVisible)
    expect(
      violations.map((p) => p.id),
      formatViolationMessage(
        rule,
        violations.map((p) => p.id),
      ),
    ).toEqual([])
  })

  // ── 4. REDIRECT_REGISTRY.from は standard pathPattern と衝突しない ──
  it('redirect.from は standard pathPattern と衝突しない', () => {
    const standardPaths = new Set(
      PAGE_REGISTRY.filter((p) => p.kind === 'standard').map((p) => p.pathPattern),
    )
    const conflicts = REDIRECT_REGISTRY.filter((r) => standardPaths.has(r.from))
    expect(
      conflicts.map((r) => r.from),
      formatViolationMessage(
        rule,
        conflicts.map((r) => r.from),
      ),
    ).toEqual([])
  })

  // ── 5. preloadTargets の各 id は PAGE_REGISTRY に存在する ──
  it('preloadTargets の各 id は PAGE_REGISTRY に存在する', () => {
    const allIds = new Set(PAGE_REGISTRY.map((p) => p.id))
    const missing: string[] = []
    for (const page of PAGE_REGISTRY) {
      for (const target of page.preloadTargets ?? []) {
        if (!allIds.has(target)) {
          missing.push(`${page.id} → ${target}`)
        }
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  // ── 6. preloadTargets に self-reference がない ──
  // 注: 間接循環（A→B→C→A）は preloading が idempotent なため許容する
  it('preloadTargets に self-reference がない', () => {
    const violations: string[] = []
    for (const page of PAGE_REGISTRY) {
      if (page.preloadTargets?.includes(page.id)) {
        violations.push(`self-reference: ${page.id}`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  // ── 7. navOrder は重複しない ──
  it('navOrder は重複しない', () => {
    const orders = PAGE_REGISTRY.map((p) => p.navOrder)
    const duplicates = orders.filter((v, i) => orders.indexOf(v) !== i)
    expect(duplicates, formatViolationMessage(rule, duplicates.map(String))).toEqual([])
  })

  // ── 7b. mobile nav の相対順序は desktop nav と一致 ──
  it('getMobileNavPages() の相対順序は getNavPages() と一致する', () => {
    const desktopIds = getNavPages().map((p) => p.id)
    const mobileIds = getMobileNavPages().map((p) => p.id)

    // mobile の各 id は desktop にも存在し、相対順序が保持される
    let lastDesktopIndex = -1
    for (const mobileId of mobileIds) {
      const desktopIndex = desktopIds.indexOf(mobileId)
      expect(desktopIndex).toBeGreaterThan(-1) // mobile は desktop の subset
      expect(desktopIndex).toBeGreaterThan(lastDesktopIndex) // 相対順序保持
      lastDesktopIndex = desktopIndex
    }
  })

  // ── 8. PAGE_COMPONENT_MAP のキーは PAGE_REGISTRY の id と一致 ──
  it('PAGE_COMPONENT_MAP のキーは PAGE_REGISTRY の全 id と一致する', () => {
    const registryIds = new Set(PAGE_REGISTRY.map((p) => p.id))
    const componentIds = new Set(Object.keys(PAGE_COMPONENT_MAP))

    const missingInComponents = [...registryIds].filter((id) => !componentIds.has(id))
    const extraInComponents = [...componentIds].filter((id) => !registryIds.has(id))

    expect(missingInComponents, formatViolationMessage(rule, missingInComponents)).toEqual([])
    expect(extraInComponents, formatViolationMessage(rule, extraInComponents)).toEqual([])
  })

  // ── 9. ViewType と registry standard ids の一致 ──
  it('standard page ids は ViewType 定義と完全一致する', () => {
    const standardIds = [...getStandardPageIds()].sort()
    const expectedIds = [...EXPECTED_VIEW_TYPES].sort()
    expect(standardIds).toEqual(expectedIds)
  })

  // ── 追加: id は一意 ──
  it('PAGE_REGISTRY の id は一意', () => {
    const ids = PAGE_REGISTRY.map((p) => p.id)
    const duplicates = ids.filter((v, i) => ids.indexOf(v) !== i)
    expect(duplicates, formatViolationMessage(rule, duplicates)).toEqual([])
  })

  // ── 追加: pathPattern は一意 ──
  it('PAGE_REGISTRY の pathPattern は一意', () => {
    const patterns = PAGE_REGISTRY.map((p) => p.pathPattern)
    const duplicates = patterns.filter((v, i) => patterns.indexOf(v) !== i)
    expect(duplicates, formatViolationMessage(rule, duplicates)).toEqual([])
  })
})
