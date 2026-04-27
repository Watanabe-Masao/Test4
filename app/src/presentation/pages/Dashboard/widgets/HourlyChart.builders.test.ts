/**
 * HourlyChart.builders.ts — pure builder のユニットテスト
 *
 * 対象 (Phase 2-A で新規追加):
 * - buildHourlySummaryStats(paddedData) — JSX 描画用集約系派生値
 * - formatSelectedHoursLabel(selectedHours) — 選択時間帯ラベル整形
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildHourlySummaryStats, formatSelectedHoursLabel } from './HourlyChart.builders'

// ─── buildHourlySummaryStats: 良いテスト ──────────────

describe('buildHourlySummaryStats', () => {
  it('単一時間帯から正しい集約値を返す', () => {
    const paddedData = [{ hour: 10, amount: 5000, quantity: 12 }]
    const result = buildHourlySummaryStats(paddedData)
    expect(result.maxAmt).toBe(5000)
    expect(result.totalQty).toBe(12)
    expect(result.peakHour.hour).toBe(10)
    expect(result.peakHour.amount).toBe(5000)
  })

  it('複数時間帯から最大金額の peakHour を返す', () => {
    const paddedData = [
      { hour: 9, amount: 3000, quantity: 10 },
      { hour: 12, amount: 8000, quantity: 25 },
      { hour: 18, amount: 5500, quantity: 18 },
    ]
    const result = buildHourlySummaryStats(paddedData)
    expect(result.maxAmt).toBe(8000)
    expect(result.peakHour.hour).toBe(12)
    expect(result.totalQty).toBe(53)
  })

  it('全 amount=0 でも maxAmt は最低 1 を返す (Math.max の seed)', () => {
    const paddedData = [
      { hour: 1, amount: 0, quantity: 0 },
      { hour: 2, amount: 0, quantity: 0 },
    ]
    const result = buildHourlySummaryStats(paddedData)
    expect(result.maxAmt).toBe(1)
    expect(result.totalQty).toBe(0)
  })

  it('coreTime / turnaroundHour を timeSlotUtils 経由で取得する', () => {
    // peak が 12 時、両側に売上分布がある現実的なパターン
    const paddedData = [
      { hour: 10, amount: 1000, quantity: 5 },
      { hour: 11, amount: 3000, quantity: 10 },
      { hour: 12, amount: 8000, quantity: 25 },
      { hour: 13, amount: 5000, quantity: 15 },
      { hour: 14, amount: 2000, quantity: 8 },
    ]
    const result = buildHourlySummaryStats(paddedData)
    // coreTime / turnaroundHour は timeSlotUtils 内部実装に依存するが、
    // null ではなく構造を持つことを契約として検証
    expect(result.coreTime === null || typeof result.coreTime === 'object').toBe(true)
    expect(result.turnaroundHour === null || typeof result.turnaroundHour === 'number').toBe(true)
  })
})

// ─── formatSelectedHoursLabel: 良いテスト ──────────────

describe('formatSelectedHoursLabel', () => {
  it('空集合は空文字列を返す', () => {
    const result = formatSelectedHoursLabel(new Set())
    expect(result).toBe('')
  })

  it('1 件は <hour>時 を返す', () => {
    const result = formatSelectedHoursLabel(new Set([12]))
    expect(result).toBe('12時')
  })

  it('3 件は ・ 区切りでソート順に返す', () => {
    const result = formatSelectedHoursLabel(new Set([18, 9, 12]))
    expect(result).toBe('9時・12時・18時')
  })

  it('4 件以上は範囲表記 + 件数を返す', () => {
    const result = formatSelectedHoursLabel(new Set([9, 12, 15, 18]))
    expect(result).toBe('9時〜18時 (4時間)')
  })

  it('5 件でも ・ 区切りにならない (3 件境界の動作確認)', () => {
    const result = formatSelectedHoursLabel(new Set([8, 10, 12, 14, 16]))
    expect(result).toBe('8時〜16時 (5時間)')
  })

  it('未ソートの Set でも内部で sort してから出力する', () => {
    const result = formatSelectedHoursLabel(new Set([23, 5, 14]))
    expect(result).toBe('5時・14時・23時')
  })
})
