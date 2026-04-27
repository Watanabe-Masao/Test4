/**
 * AlertPanel.helpers — pure formatter tests
 *
 * 検証対象:
 * - ALERT_METRIC_MAP: ruleId → MetricId 対応の 5 エントリ
 * - SEVERITY_ICONS: severity → アイコン文字の 3 エントリ
 * - isRateAlert: ルール ID 判定
 * - formatAlertValue / formatAlertThreshold: rate と金額で整形を切替
 * - formatAlertDelta: sign 付き差分表示 + % → pt 置換
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  ALERT_METRIC_MAP,
  SEVERITY_ICONS,
  isRateAlert,
  formatAlertValue,
  formatAlertThreshold,
  formatAlertDelta,
} from '../AlertPanel.helpers'
import type { Alert } from '@/application/hooks/analytics'

const fmtCurrency = (v: number) => `¥${v.toLocaleString('ja-JP')}`

function mkAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    ruleId: 'daily-sales-prev-year',
    severity: 'warning',
    message: 'test',
    value: 1000,
    threshold: 1200,
    ...overrides,
  } as Alert
}

describe('ALERT_METRIC_MAP', () => {
  it('5 種類の ruleId → MetricId マッピングを持つ', () => {
    expect(ALERT_METRIC_MAP['gp-rate-target']).toBe('invMethodGrossProfitRate')
    expect(ALERT_METRIC_MAP['daily-sales-prev-year']).toBe('salesTotal')
    expect(ALERT_METRIC_MAP['cost-inclusion-ratio']).toBe('totalCostInclusion')
    expect(ALERT_METRIC_MAP['budget-achievement']).toBe('budgetAchievementRate')
    expect(ALERT_METRIC_MAP['discount-rate']).toBe('discountRate')
  })

  it('未定義 ruleId は undefined', () => {
    expect(ALERT_METRIC_MAP['unknown-rule']).toBeUndefined()
  })
})

describe('SEVERITY_ICONS', () => {
  it('critical / warning / info の 3 種類を持つ', () => {
    expect(SEVERITY_ICONS.critical).toBe('!')
    expect(SEVERITY_ICONS.warning).toBe('!')
    expect(SEVERITY_ICONS.info).toBe('i')
  })
})

describe('isRateAlert', () => {
  it('比率系 ruleId で true', () => {
    expect(isRateAlert(mkAlert({ ruleId: 'gp-rate-target' }))).toBe(true)
    expect(isRateAlert(mkAlert({ ruleId: 'cost-inclusion-ratio' }))).toBe(true)
    expect(isRateAlert(mkAlert({ ruleId: 'budget-achievement' }))).toBe(true)
    expect(isRateAlert(mkAlert({ ruleId: 'discount-rate' }))).toBe(true)
  })

  it('金額系 ruleId で false', () => {
    expect(isRateAlert(mkAlert({ ruleId: 'daily-sales-prev-year' }))).toBe(false)
  })

  it('未定義 ruleId で false', () => {
    expect(isRateAlert(mkAlert({ ruleId: 'unknown-rule' }))).toBe(false)
  })
})

describe('formatAlertValue', () => {
  it('rate 系は formatPercent 形式', () => {
    const result = formatAlertValue(mkAlert({ ruleId: 'gp-rate-target', value: 0.32 }), fmtCurrency)
    expect(result).toContain('%')
  })

  it('金額系は fmtCurrency を使う', () => {
    expect(formatAlertValue(mkAlert({ value: 1234567 }), fmtCurrency)).toBe('¥1,234,567')
  })
})

describe('formatAlertThreshold', () => {
  it('rate 系は formatPercent 形式', () => {
    const result = formatAlertThreshold(
      mkAlert({ ruleId: 'discount-rate', threshold: 0.05 }),
      fmtCurrency,
    )
    expect(result).toContain('%')
  })

  it('金額系は fmtCurrency を使う', () => {
    expect(formatAlertThreshold(mkAlert({ threshold: 2000 }), fmtCurrency)).toBe('¥2,000')
  })
})

describe('formatAlertDelta', () => {
  it('金額系で + sign と差分を表示', () => {
    const delta = formatAlertDelta(mkAlert({ value: 1500, threshold: 1000 }), fmtCurrency)
    expect(delta).toBe('+¥500')
  })

  it('金額系で負の差分は sign 省略（fmtCurrency 内の - が出る）', () => {
    // delta = 1000-1500 = -500 → sign='' → fmtCurrency(-500)='¥-500'
    const delta = formatAlertDelta(mkAlert({ value: 1000, threshold: 1500 }), fmtCurrency)
    expect(delta).toContain('-500')
    expect(delta).not.toMatch(/^\+/)
  })

  it('rate 系は % を pt に置換', () => {
    const delta = formatAlertDelta(
      mkAlert({ ruleId: 'discount-rate', value: 0.07, threshold: 0.05 }),
      fmtCurrency,
    )
    expect(delta).toContain('pt')
    expect(delta).not.toContain('%')
    expect(delta).toMatch(/^\+/)
  })

  it('rate 系で value == threshold は +0pt（sign は +）', () => {
    const delta = formatAlertDelta(
      mkAlert({ ruleId: 'gp-rate-target', value: 0.3, threshold: 0.3 }),
      fmtCurrency,
    )
    expect(delta).toContain('pt')
    expect(delta).toMatch(/^\+/)
  })
})
