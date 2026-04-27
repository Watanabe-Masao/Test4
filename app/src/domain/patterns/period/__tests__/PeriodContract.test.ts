/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  createPeriodEntry,
  createCurrentEntry,
  createComparisonPeriodEntry,
  createPeriodResult,
  needsComparison,
  needsAdjacent,
  PRESET_LABELS,
} from '../PeriodContract'
import type { DateRange } from '@/domain/models/CalendarDate'
import { createDefaultPeriodSelection } from '@/domain/models/PeriodSelection'

const feb2026: DateRange = {
  from: { year: 2026, month: 2, day: 1 },
  to: { year: 2026, month: 2, day: 28 },
}

const feb2025: DateRange = {
  from: { year: 2025, month: 2, day: 1 },
  to: { year: 2025, month: 2, day: 28 },
}

describe('PeriodContract', () => {
  describe('createPeriodEntry', () => {
    it('全フィールドが正しく設定される', () => {
      const entry = createPeriodEntry('current', feb2026, 100, true, '当期', '当期')
      expect(entry.key).toBe('current')
      expect(entry.period).toEqual(feb2026)
      expect(entry.data).toBe(100)
      expect(entry.hasData).toBe(true)
      expect(entry.label).toBe('当期')
      expect(entry.shortLabel).toBe('当期')
    })
  })

  describe('createCurrentEntry', () => {
    it('key=current, ラベル=当期 で構築', () => {
      const entry = createCurrentEntry(feb2026, 42, true)
      expect(entry.key).toBe('current')
      expect(entry.label).toBe('当期')
      expect(entry.shortLabel).toBe('当期')
      expect(entry.data).toBe(42)
    })

    it('データなし: hasData=false', () => {
      const entry = createCurrentEntry(feb2026, 0, false)
      expect(entry.hasData).toBe(false)
      expect(entry.data).toBe(0)
    })
  })

  describe('createComparisonPeriodEntry', () => {
    it('prevYearSameMonth プリセットのラベルが適用される', () => {
      const entry = createComparisonPeriodEntry(feb2025, 80, true, 'prevYearSameMonth')
      expect(entry.key).toBe('comparison')
      expect(entry.label).toBe('比較期（前年同月）')
      expect(entry.shortLabel).toBe('前年同月')
    })

    it('prevYearSameDow プリセットのラベル', () => {
      const entry = createComparisonPeriodEntry(feb2025, 80, true, 'prevYearSameDow')
      expect(entry.label).toBe('比較期（前年同曜日）')
    })

    it('prevMonth プリセットのラベル', () => {
      const entry = createComparisonPeriodEntry(feb2025, 80, true, 'prevMonth')
      expect(entry.label).toBe('比較期（前月）')
    })

    it('custom プリセットのラベル', () => {
      const entry = createComparisonPeriodEntry(feb2025, 80, true, 'custom')
      expect(entry.label).toBe('比較期（カスタム）')
    })
  })

  describe('createPeriodResult', () => {
    it('比較あり: entries に current + comparison', () => {
      const current = createCurrentEntry(feb2026, 100, true)
      const comparison = createComparisonPeriodEntry(feb2025, 80, true, 'prevYearSameMonth')
      const selection = createDefaultPeriodSelection(2026, 2)
      const result = createPeriodResult(current, selection, comparison)

      expect(result.current).toBe(current)
      expect(result.comparison).toBe(comparison)
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].key).toBe('current')
      expect(result.entries[1].key).toBe('comparison')
      expect(result.selection).toBe(selection)
    })

    it('比較なし: entries に current のみ', () => {
      const current = createCurrentEntry(feb2026, 100, true)
      const selection = createDefaultPeriodSelection(2026, 2)
      const result = createPeriodResult(current, selection)

      expect(result.comparison).toBeUndefined()
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].key).toBe('current')
    })
  })

  describe('needsComparison', () => {
    it('current → false', () => expect(needsComparison('current')).toBe(false))
    it('comparison → true', () => expect(needsComparison('comparison')).toBe(true))
    it('adjacent → false', () => expect(needsComparison('adjacent')).toBe(false))
    it('comparisonFull → true', () => expect(needsComparison('comparisonFull')).toBe(true))
  })

  describe('needsAdjacent', () => {
    it('current → false', () => expect(needsAdjacent('current')).toBe(false))
    it('comparison → false', () => expect(needsAdjacent('comparison')).toBe(false))
    it('adjacent → true', () => expect(needsAdjacent('adjacent')).toBe(true))
    it('comparisonFull → true', () => expect(needsAdjacent('comparisonFull')).toBe(true))
  })

  describe('PRESET_LABELS', () => {
    it('全プリセットにラベルが定義されている', () => {
      const presets = ['prevYearSameMonth', 'prevYearSameDow', 'prevMonth', 'custom'] as const
      for (const preset of presets) {
        expect(PRESET_LABELS[preset]).toBeDefined()
        expect(PRESET_LABELS[preset].label).toBeTruthy()
        expect(PRESET_LABELS[preset].shortLabel).toBeTruthy()
      }
    })
  })
})
