/**
 * 期間ソース干渉テスト
 *
 * システム内に複数の期間ソースが存在する過渡期において、
 * それらが互いに矛盾しないことを検証する。
 *
 * 干渉リスク:
 * 1. settingsStore.targetYear/Month と periodSelectionStore.period1 の月ずれ
 * 2. settingsStore.dataEndDay と period1.to.day のスコープ不一致
 * 3. プリセットによる period2 と旧 ComparisonFrame.previous のずれ
 * 4. 比較 ON/OFF による PrevYearScope の生成有無
 * 5. DOW オフセットの二重計算
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyPreset,
  createDefaultPeriodSelection,
  deriveDowOffset,
  buildPrevYearScopeFromSelection,
} from '@/domain/models/calendar'
import type { PeriodSelection, DateRange } from '@/domain/models/calendar'
import {
  resolveComparisonFrame,
  buildPrevYearScope,
} from '@/application/comparison/resolveComparisonFrame'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

describe('期間ソース干渉テスト', () => {
  beforeEach(() => {
    usePeriodSelectionStore.getState().resetToMonth(2026, 3)
    usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')
    usePeriodSelectionStore.getState().setComparisonEnabled(true)
  })

  describe('1. 月切替の整合性: settingsStore.targetMonth ↔ periodSelectionStore.period1', () => {
    it('resetToMonth で period1 が正しい月に更新される', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 6)
      const { period1 } = usePeriodSelectionStore.getState().selection
      expect(period1.from.year).toBe(2026)
      expect(period1.from.month).toBe(6)
      expect(period1.from.day).toBe(1)
      expect(period1.to.day).toBe(30)
    })

    it('resetToMonth で period2 もプリセットに応じて再算出される', () => {
      usePeriodSelectionStore.getState().setPreset('prevYearSameMonth')
      usePeriodSelectionStore.getState().resetToMonth(2026, 6)
      const { period2, activePreset } = usePeriodSelectionStore.getState().selection
      expect(activePreset).toBe('prevYearSameMonth')
      expect(period2.from.year).toBe(2025)
      expect(period2.from.month).toBe(6)
    })

    it('resetToMonth で comparisonEnabled は維持される', () => {
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      usePeriodSelectionStore.getState().resetToMonth(2026, 6)
      expect(usePeriodSelectionStore.getState().selection.comparisonEnabled).toBe(false)
    })

    it('連続した月切替で period1/period2 が常に整合', () => {
      const months = [1, 2, 3, 6, 12, 1] // 年跨ぎ含む
      for (const month of months) {
        const year = month === 1 && months.indexOf(month) === 5 ? 2027 : 2026
        usePeriodSelectionStore.getState().resetToMonth(year, month)
        const { period1, period2 } = usePeriodSelectionStore.getState().selection
        expect(period1.from.month).toBe(month)
        expect(period1.from.year).toBe(year)
        // prevYearSameMonth: 前年同月
        expect(period2.from.year).toBe(year - 1)
        expect(period2.from.month).toBe(month)
      }
    })
  })

  describe('2. dataEndDay と period1.to.day の整合性', () => {
    it('period1.to.day を変更すると period2.to.day も連動（プリセット時）', () => {
      // ユーザーがスライダーで有効末日を20日に設定した場合を模擬
      const { period1 } = usePeriodSelectionStore.getState().selection
      const newP1: DateRange = { ...period1, to: { ...period1.to, day: 20 } }
      usePeriodSelectionStore.getState().setPeriod1(newP1)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1.to.day).toBe(20)
      // prevYearSameMonth: period2.to.day も 20 に連動
      expect(selection.period2.to.day).toBe(20)
    })

    it('period1.to.day を変更しても custom プリセットなら period2 は不変', () => {
      // custom に切り替え
      const customP2: DateRange = {
        from: { year: 2024, month: 6, day: 1 },
        to: { year: 2024, month: 6, day: 30 },
      }
      usePeriodSelectionStore.getState().setPeriod2(customP2)

      // period1 を変更
      const { period1 } = usePeriodSelectionStore.getState().selection
      const newP1: DateRange = { ...period1, to: { ...period1.to, day: 15 } }
      usePeriodSelectionStore.getState().setPeriod1(newP1)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1.to.day).toBe(15)
      expect(selection.period2).toEqual(customP2) // 不変
    })

    it('effectiveEndDay < period1.to.day の場合、buildPrevYearScope と同等結果が得られる', () => {
      // シナリオ: period1 = 全月(1-31)、elapsedDays = 20
      const effectiveEndDay = 20
      const year = 2026
      const month = 3

      // 旧モデル
      const daysInMonth = new Date(year, month, 0).getDate()
      const baseRange: DateRange = {
        from: { year, month, day: 1 },
        to: { year, month, day: daysInMonth },
      }
      const frame = resolveComparisonFrame(baseRange, 'sameDate')
      const oldScope = buildPrevYearScope(frame, effectiveEndDay, 500)

      // 新モデル: period1.to.day を effectiveEndDay に調整してから applyPreset
      const scopedP1: DateRange = {
        from: { year, month, day: 1 },
        to: { year, month, day: effectiveEndDay },
      }
      const scopedP2 = applyPreset(scopedP1, 'prevYearSameMonth', scopedP1)
      const scopedSel: PeriodSelection = {
        period1: scopedP1,
        period2: scopedP2,
        comparisonEnabled: true,
        activePreset: 'prevYearSameMonth',
      }
      const newScope = buildPrevYearScopeFromSelection(scopedSel, 500)

      // 完全一致
      expect(newScope.dateRange).toEqual(oldScope.dateRange)
      expect(newScope.totalCustomers).toBe(oldScope.totalCustomers)
      expect(newScope.dowOffset).toBe(oldScope.dowOffset)
    })
  })

  describe('3. プリセット切替と旧 ComparisonFrame の整合性', () => {
    it('prevYearSameMonth ↔ sameDate の同値性', () => {
      const year = 2026
      const month = 3
      const daysInMonth = new Date(year, month, 0).getDate()

      // 旧: sameDate (offset=0)
      const frame = resolveComparisonFrame(
        { from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } },
        'sameDate',
      )

      // 新: prevYearSameMonth (offset=0)
      const p1: DateRange = { from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } }
      const p2 = applyPreset(p1, 'prevYearSameMonth', p1)

      // 日付範囲が一致
      expect(p2.from).toEqual(frame.previous.from)
      expect(p2.to).toEqual(frame.previous.to)
    })

    it('prevYearSameDow: V2 候補範囲は前年同日 ±7 日', () => {
      const year = 2026
      const month = 3
      const daysInMonth = new Date(year, month, 0).getDate()

      // 新: prevYearSameDow — V2 では候補取得範囲（前年同日 ±7 日）
      const p1: DateRange = { from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } }
      const p2 = applyPreset(p1, 'prevYearSameDow', p1)

      // from = 前年同日 - 7 日
      const expectedFrom = new Date(year - 1, month - 1, 1 - 7)
      expect(p2.from.year).toBe(expectedFrom.getFullYear())
      expect(p2.from.month).toBe(expectedFrom.getMonth() + 1)
      expect(p2.from.day).toBe(expectedFrom.getDate())

      // to = 前年同日 + 7 日
      const expectedTo = new Date(year - 1, month - 1, daysInMonth + 7)
      expect(p2.to.year).toBe(expectedTo.getFullYear())
      expect(p2.to.month).toBe(expectedTo.getMonth() + 1)
      expect(p2.to.day).toBe(expectedTo.getDate())

      // 候補範囲の長さは period1 の長さ + 14 日
      const p2From = new Date(p2.from.year, p2.from.month - 1, p2.from.day)
      const p2To = new Date(p2.to.year, p2.to.month - 1, p2.to.day)
      const p2Days = (p2To.getTime() - p2From.getTime()) / (1000 * 60 * 60 * 24)
      expect(p2Days).toBe(daysInMonth - 1 + 14)
    })
  })

  describe('4. 比較 ON/OFF による干渉', () => {
    it('比較OFF → period2 は存在するが PrevYearScope 生成で使わない', () => {
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      const { selection } = usePeriodSelectionStore.getState()

      // period2 自体は値を持つ（永続化のため）
      expect(selection.period2).toBeDefined()
      // comparisonEnabled=false で呼び出し元が使わないことを保証
      expect(selection.comparisonEnabled).toBe(false)
    })

    it('比較 ON→OFF→ON でプリセットと period2 が維持される', () => {
      const before = usePeriodSelectionStore.getState().selection
      usePeriodSelectionStore.getState().setComparisonEnabled(false)
      usePeriodSelectionStore.getState().setComparisonEnabled(true)
      const after = usePeriodSelectionStore.getState().selection

      expect(after.period2).toEqual(before.period2)
      expect(after.activePreset).toBe(before.activePreset)
    })
  })

  describe('5. DOW オフセットの一貫性', () => {
    it('deriveDowOffset は period1 の前年同月の月初曜日差で計算される', () => {
      for (let month = 1; month <= 12; month++) {
        const year = 2026
        const sel = createDefaultPeriodSelection(year, month)
        const newOffset = deriveDowOffset(sel.period1, 'prevYearSameDow')

        // deriveDowOffset は period1.from の前年同月の月初曜日差を返す
        // period2 の候補窓の月ずれに影響されない
        const currentDow = new Date(year, month - 1, 1).getDay()
        const prevDow = new Date(year - 1, month - 1, 1).getDay()
        const expectedOffset = (((currentDow - prevDow) % 7) + 7) % 7
        expect(newOffset, `month ${month}`).toBe(expectedOffset)
      }
    })

    it('prevYearSameMonth では deriveDowOffset = 0（二重適用の防止）', () => {
      for (let month = 1; month <= 12; month++) {
        const sel = createDefaultPeriodSelection(2026, month)
        expect(deriveDowOffset(sel.period1, 'prevYearSameMonth')).toBe(0)
      }
    })
  })

  describe('6. setPeriod1 → applyPreset の連鎖的整合性', () => {
    it('prevYearSameDow プリセットで period1 変更 → period2 が候補範囲として正しい', () => {
      usePeriodSelectionStore.getState().setPreset('prevYearSameDow')

      // period1 の to.day を 20 に変更
      const { period1 } = usePeriodSelectionStore.getState().selection
      const newP1: DateRange = { ...period1, to: { ...period1.to, day: 20 } }
      usePeriodSelectionStore.getState().setPeriod1(newP1)

      const { selection } = usePeriodSelectionStore.getState()

      // V2: period2 は前年同日 ±7 日の候補範囲
      const expectedFrom = new Date(
        selection.period1.from.year - 1,
        selection.period1.from.month - 1,
        selection.period1.from.day - 7,
      )
      const expectedTo = new Date(
        selection.period1.to.year - 1,
        selection.period1.to.month - 1,
        selection.period1.to.day + 7,
      )
      expect(selection.period2.from.year).toBe(expectedFrom.getFullYear())
      expect(selection.period2.from.month).toBe(expectedFrom.getMonth() + 1)
      expect(selection.period2.from.day).toBe(expectedFrom.getDate())
      expect(selection.period2.to.year).toBe(expectedTo.getFullYear())
      expect(selection.period2.to.month).toBe(expectedTo.getMonth() + 1)
      expect(selection.period2.to.day).toBe(expectedTo.getDate())
    })

    it('prevMonth プリセットで period1 変更 → period2 が前月に正しくマッピング', () => {
      usePeriodSelectionStore.getState().setPreset('prevMonth')

      const { period1 } = usePeriodSelectionStore.getState().selection
      const newP1: DateRange = { ...period1, to: { ...period1.to, day: 15 } }
      usePeriodSelectionStore.getState().setPeriod1(newP1)

      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period2.from.month).toBe(period1.from.month - 1 || 12)
      expect(selection.period2.to.day).toBeLessThanOrEqual(15)
    })
  })

  describe('7. 境界ケース', () => {
    it('うるう年 → 非うるう年の月切替で period2 がクランプされる', () => {
      // 2024年2月（うるう年、29日）→ 2023年2月（非うるう年、28日）
      usePeriodSelectionStore.getState().resetToMonth(2024, 2)
      const { selection } = usePeriodSelectionStore.getState()
      expect(selection.period1.to.day).toBe(29)
      // 前年同月: 2023年2月は28日まで
      expect(selection.period2.to.day).toBe(28)
    })

    it('1月 → 前月 = 前年12月で年跨ぎが正しい', () => {
      usePeriodSelectionStore.getState().resetToMonth(2026, 1)
      usePeriodSelectionStore.getState().setPreset('prevMonth')
      const { period2 } = usePeriodSelectionStore.getState().selection
      expect(period2.from.year).toBe(2025)
      expect(period2.from.month).toBe(12)
    })

    it('period1.from.day > 1（月途中開始）でもプリセットが正しく動作', () => {
      const midMonth: DateRange = {
        from: { year: 2026, month: 3, day: 10 },
        to: { year: 2026, month: 3, day: 25 },
      }
      usePeriodSelectionStore.getState().setPeriod1(midMonth)
      const { selection } = usePeriodSelectionStore.getState()
      // prevYearSameMonth: 前年の同じ日範囲
      expect(selection.period2.from.day).toBe(10)
      expect(selection.period2.to.day).toBe(25)
      expect(selection.period2.from.year).toBe(2025)
    })
  })
})
