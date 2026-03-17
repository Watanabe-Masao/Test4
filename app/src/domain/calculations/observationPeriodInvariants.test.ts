import { describe, it, expect } from 'vitest'
import { evaluateObservationPeriod, worseObservationStatus } from './observationPeriod'
import type { ObservationThresholds } from './observationPeriod'
import type { ObservationStatus } from '@/domain/models/ObservationPeriod'

/**
 * 観測期間 不変条件テスト
 *
 * observation-period-spec.md の仕様を数学的・業務的性質として検証する。
 * WASM 移行後も TS テストで検証し続ける。
 */

// ── テストヘルパー ──

const DEFAULT_DAYS_IN_MONTH = 31

const DEFAULT_THRESHOLDS: ObservationThresholds = {
  minDaysForValid: 5,
  minDaysForOk: 10,
  staleDaysThreshold: 7,
  minSalesDays: 3,
}

/** 日別データを生成する（指定日に売上を設定） */
function makeDailyMap(
  salesByDay: Record<number, number>,
): ReadonlyMap<number, { readonly sales: number }> {
  const map = new Map<number, { readonly sales: number }>()
  for (const [day, sales] of Object.entries(salesByDay)) {
    map.set(Number(day), { sales })
  }
  return map
}

/** 連続する日に一律売上を設定 */
function makeConsecutiveDays(
  lastDay: number,
  dailySales: number = 100_000,
): ReadonlyMap<number, { readonly sales: number }> {
  const entries: Record<number, number> = {}
  for (let d = 1; d <= lastDay; d++) {
    entries[d] = dailySales
  }
  return makeDailyMap(entries)
}

describe('observationPeriod invariants', () => {
  // ── OP-INV-1: remainingDays = daysInMonth - elapsedDays ──
  describe('OP-INV-1: remainingDays == daysInMonth - elapsedDays', () => {
    it('通常ケース（14日経過）', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 14, DEFAULT_THRESHOLDS)
      expect(result.remainingDays).toBe(result.daysInMonth - result.elapsedDays)
    })

    it('月末（31日経過）', () => {
      const daily = makeConsecutiveDays(31)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 31, DEFAULT_THRESHOLDS)
      expect(result.remainingDays).toBe(result.daysInMonth - result.elapsedDays)
    })

    it('販売実績なし', () => {
      const daily = makeDailyMap({})
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 5, DEFAULT_THRESHOLDS)
      expect(result.remainingDays).toBe(result.daysInMonth - result.elapsedDays)
    })

    it('歯抜けデータ', () => {
      const daily = makeDailyMap({ 1: 1000, 5: 2000, 20: 3000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 20, DEFAULT_THRESHOLDS)
      expect(result.remainingDays).toBe(result.daysInMonth - result.elapsedDays)
    })
  })

  // ── OP-INV-2: elapsedDays = lastRecordedSalesDay ──
  describe('OP-INV-2: elapsedDays == lastRecordedSalesDay', () => {
    it('連続データ', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 14, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(result.lastRecordedSalesDay)
    })

    it('歯抜けデータ（最終日 = 20）', () => {
      const daily = makeDailyMap({ 1: 1000, 10: 2000, 20: 3000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 25, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(result.lastRecordedSalesDay)
      expect(result.lastRecordedSalesDay).toBe(20)
    })

    it('販売実績なし → 両方 0', () => {
      const daily = makeDailyMap({})
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 10, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(0)
      expect(result.lastRecordedSalesDay).toBe(0)
    })
  })

  // ── OP-INV-3: salesDays <= elapsedDays ──
  describe('OP-INV-3: salesDays <= elapsedDays', () => {
    it('連続データ（salesDays == elapsedDays）', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 14, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBeLessThanOrEqual(result.elapsedDays)
      expect(result.salesDays).toBe(result.elapsedDays)
    })

    it('歯抜けデータ（salesDays < elapsedDays）', () => {
      const daily = makeDailyMap({ 1: 1000, 5: 2000, 20: 3000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 20, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBeLessThanOrEqual(result.elapsedDays)
      expect(result.salesDays).toBe(3)
      expect(result.elapsedDays).toBe(20)
    })

    it('0売上の日がある（salesDays < entries）', () => {
      const daily = makeDailyMap({ 1: 1000, 2: 0, 3: 2000, 4: 0, 5: 3000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 5, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBeLessThanOrEqual(result.elapsedDays)
      expect(result.salesDays).toBe(3) // 0売上はカウントしない
    })
  })

  // ── OP-INV-4: salesDays === 0 → status === 'undefined' ──
  describe("OP-INV-4: salesDays === 0 → status === 'undefined'", () => {
    it('空 Map', () => {
      const daily = makeDailyMap({})
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 10, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBe(0)
      expect(result.status).toBe('undefined')
    })

    it('全日 0 売上', () => {
      const daily = makeDailyMap({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 5, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBe(0)
      expect(result.status).toBe('undefined')
    })
  })

  // ── OP-INV-5: 閾値境界テスト ──
  describe('OP-INV-5: threshold boundary tests', () => {
    it('4日 → invalid（minDaysForValid=5 未満）', () => {
      const daily = makeConsecutiveDays(4)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 4, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(4)
      expect(result.status).toBe('invalid')
    })

    it('5日 → partial（minDaysForValid=5 以上、minDaysForOk=10 未満）', () => {
      const daily = makeConsecutiveDays(5)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 5, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(5)
      expect(result.status).toBe('partial')
    })

    it('9日 → partial（minDaysForOk=10 未満）', () => {
      const daily = makeConsecutiveDays(9)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 9, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(9)
      expect(result.status).toBe('partial')
    })

    it('10日 → ok（minDaysForOk=10 以上）', () => {
      const daily = makeConsecutiveDays(10)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 10, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(10)
      expect(result.status).toBe('ok')
    })

    it('営業日数 2日（lastRecordedSalesDay=10） → invalid（minSalesDays=3 未満）', () => {
      const daily = makeDailyMap({ 3: 1000, 10: 2000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 10, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBe(2)
      expect(result.elapsedDays).toBe(10)
      expect(result.status).toBe('invalid')
    })

    it('営業日数 3日（lastRecordedSalesDay=10） → ok（minSalesDays=3 以上）', () => {
      const daily = makeDailyMap({ 3: 1000, 7: 2000, 10: 3000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 10, DEFAULT_THRESHOLDS)
      expect(result.salesDays).toBe(3)
      expect(result.elapsedDays).toBe(10)
      expect(result.status).toBe('ok')
    })
  })

  // ── OP-INV-6: staleness 判定は整数比較のみ ──
  describe('OP-INV-6: staleness detection uses integer comparison only', () => {
    it('停滞なし（currentElapsedDays - lastRecordedSalesDay < threshold）', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 20, DEFAULT_THRESHOLDS)
      // 20 - 14 = 6 < 7 → 停滞なし
      expect(result.warnings).not.toContain('obs_stale_sales_data')
    })

    it('停滞境界（currentElapsedDays - lastRecordedSalesDay == threshold）', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 21, DEFAULT_THRESHOLDS)
      // 21 - 14 = 7 >= 7 → 停滞
      expect(result.warnings).toContain('obs_stale_sales_data')
    })

    it('停滞あり（currentElapsedDays - lastRecordedSalesDay > threshold）', () => {
      const daily = makeConsecutiveDays(10)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 25, DEFAULT_THRESHOLDS)
      // 25 - 10 = 15 >= 7 → 停滞
      expect(result.warnings).toContain('obs_stale_sales_data')
    })

    it('販売実績なし → 停滞警告なし（obs_no_sales_data が代わりに出る）', () => {
      const daily = makeDailyMap({})
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 20, DEFAULT_THRESHOLDS)
      expect(result.warnings).not.toContain('obs_stale_sales_data')
      expect(result.warnings).toContain('obs_no_sales_data')
    })
  })

  // ── OP-INV-7: 全出力が finite ──
  describe('OP-INV-7: all outputs are finite integers', () => {
    it('通常ケース', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 14, DEFAULT_THRESHOLDS)
      expect(Number.isFinite(result.lastRecordedSalesDay)).toBe(true)
      expect(Number.isFinite(result.elapsedDays)).toBe(true)
      expect(Number.isFinite(result.salesDays)).toBe(true)
      expect(Number.isFinite(result.daysInMonth)).toBe(true)
      expect(Number.isFinite(result.remainingDays)).toBe(true)
      expect(Number.isInteger(result.lastRecordedSalesDay)).toBe(true)
      expect(Number.isInteger(result.elapsedDays)).toBe(true)
      expect(Number.isInteger(result.salesDays)).toBe(true)
      expect(Number.isInteger(result.remainingDays)).toBe(true)
    })

    it('空 Map', () => {
      const daily = makeDailyMap({})
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 0, DEFAULT_THRESHOLDS)
      expect(Number.isFinite(result.lastRecordedSalesDay)).toBe(true)
      expect(Number.isFinite(result.elapsedDays)).toBe(true)
      expect(Number.isFinite(result.salesDays)).toBe(true)
      expect(Number.isFinite(result.remainingDays)).toBe(true)
    })

    it('大量日数（月末）', () => {
      const daily = makeConsecutiveDays(31)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 31, DEFAULT_THRESHOLDS)
      expect(Number.isFinite(result.lastRecordedSalesDay)).toBe(true)
      expect(Number.isFinite(result.remainingDays)).toBe(true)
      expect(result.remainingDays).toBeGreaterThanOrEqual(0)
    })
  })

  // ── OP-INV-8: 月末 → remainingDays === 0 ──
  describe('OP-INV-8: month-end → remainingDays === 0', () => {
    it('elapsedDays === daysInMonth', () => {
      const daily = makeConsecutiveDays(31)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 31, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(DEFAULT_DAYS_IN_MONTH)
      expect(result.remainingDays).toBe(0)
    })

    it('28日月の月末', () => {
      const daily = makeConsecutiveDays(28)
      const result = evaluateObservationPeriod(daily, 28, 28, DEFAULT_THRESHOLDS)
      expect(result.elapsedDays).toBe(28)
      expect(result.remainingDays).toBe(0)
    })
  })

  // ── OP-INV-9: worseObservationStatus は重篤度順序を守る ──
  describe('OP-INV-9: worseObservationStatus severity ordering', () => {
    const statuses: ObservationStatus[] = ['ok', 'partial', 'invalid', 'undefined']

    it('同一ステータス同士は自身を返す', () => {
      for (const s of statuses) {
        expect(worseObservationStatus(s, s)).toBe(s)
      }
    })

    it('ok は全てに対して劣る（相手を返す）', () => {
      for (const s of statuses) {
        expect(worseObservationStatus('ok', s)).toBe(s)
      }
    })

    it('undefined は最も悪い', () => {
      for (const s of statuses) {
        expect(worseObservationStatus('undefined', s)).toBe('undefined')
      }
    })

    it('重篤度順序: ok < partial < invalid < undefined', () => {
      expect(worseObservationStatus('ok', 'partial')).toBe('partial')
      expect(worseObservationStatus('partial', 'invalid')).toBe('invalid')
      expect(worseObservationStatus('invalid', 'undefined')).toBe('undefined')
    })
  })

  // ── カスタム閾値テスト ──
  describe('custom thresholds', () => {
    it('閾値変更で判定が変わる', () => {
      const daily = makeConsecutiveDays(4)
      const customThresholds: ObservationThresholds = {
        minDaysForValid: 3,
        minDaysForOk: 5,
        staleDaysThreshold: 7,
        minSalesDays: 2,
      }
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 4, customThresholds)
      // minDaysForValid=3, minDaysForOk=5 → 4日は partial
      expect(result.status).toBe('partial')
    })

    it('デフォルト閾値省略時', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 14)
      expect(result.status).toBe('ok')
    })
  })

  // ── 警告コード生成の一貫性 ──
  describe('warning code consistency', () => {
    it('undefined → obs_no_sales_data のみ', () => {
      const daily = makeDailyMap({})
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 5, DEFAULT_THRESHOLDS)
      expect(result.status).toBe('undefined')
      expect(result.warnings).toContain('obs_no_sales_data')
      expect(result.warnings).not.toContain('obs_window_incomplete')
    })

    it('invalid（営業日数不足） → obs_insufficient_sales_days + obs_window_incomplete', () => {
      const daily = makeDailyMap({ 3: 1000, 10: 2000 })
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 10, DEFAULT_THRESHOLDS)
      expect(result.status).toBe('invalid')
      expect(result.warnings).toContain('obs_insufficient_sales_days')
      expect(result.warnings).toContain('obs_window_incomplete')
    })

    it('partial → obs_window_incomplete', () => {
      const daily = makeConsecutiveDays(7)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 7, DEFAULT_THRESHOLDS)
      expect(result.status).toBe('partial')
      expect(result.warnings).toContain('obs_window_incomplete')
    })

    it('ok → 警告なし', () => {
      const daily = makeConsecutiveDays(14)
      const result = evaluateObservationPeriod(daily, DEFAULT_DAYS_IN_MONTH, 14, DEFAULT_THRESHOLDS)
      expect(result.status).toBe('ok')
      expect(result.warnings).toHaveLength(0)
    })
  })
})
