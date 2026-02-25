import { describe, it, expect } from 'vitest'
import { processDepartmentKpi, mergeDepartmentKpiData } from './DepartmentKpiProcessor'

/* ── ヘルパー ───────────────────────────────── */

function kpiRow(code: string, name: string, values: number[]) {
  return [code, name, ...values]
}

// 14列のデータ: gpRateBudget, gpRateActual, gpRateVariance, markupRate, discountRate,
//               salesBudget, salesActual, salesVariance, salesAchievement,
//               openingInventory, closingInventory, gpRateLanding, salesLanding
const SAMPLE_VALUES = [22.2, 21.5, -0.7, 25.0, 3.5, 1000000, 950000, -50000, 95.0, 500000, 480000, 22.0, 980000]

/* ── processDepartmentKpi ──────────────────── */

describe('processDepartmentKpi', () => {
  it('正常データからKPI recordsを生成する', () => {
    const rows = [
      ['部門', '部門名', '粗利率予算', '粗利率実績'],
      kpiRow('01', '青果', SAMPLE_VALUES),
    ]
    const result = processDepartmentKpi(rows)

    expect(result.records).toHaveLength(1)
    expect(result.records[0].deptCode).toBe('01')
    expect(result.records[0].deptName).toBe('青果')
  })

  it('パーセント値 > 1 が自動的に小数に変換される', () => {
    const rows = [
      ['部門', '部門名'],
      kpiRow('01', '青果', SAMPLE_VALUES),
    ]
    const result = processDepartmentKpi(rows)

    // 22.2 → 0.222 (> 1 なので /100)
    expect(result.records[0].gpRateBudget).toBeCloseTo(0.222, 3)
    // 25.0 → 0.25
    expect(result.records[0].markupRate).toBeCloseTo(0.25, 3)
  })

  it('空データで空配列を返す', () => {
    expect(processDepartmentKpi([]).records).toHaveLength(0)
    expect(processDepartmentKpi([['header']]).records).toHaveLength(0)
  })

  it('ヘッダー行（非数値先頭）をスキップする', () => {
    const rows = [
      ['部門コード', '部門名', '粗利率予算'],
      ['グループ', 'サブヘッダー', '(%)'],
      kpiRow('01', '青果', SAMPLE_VALUES),
    ]
    const result = processDepartmentKpi(rows)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].deptCode).toBe('01')
  })

  it('部門名なし（2列目が数値）の場合も処理できる', () => {
    const rows = [
      ['部門'],
      ['01', ...SAMPLE_VALUES],
    ]
    const result = processDepartmentKpi(rows)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].deptName).toBe('')
    expect(result.records[0].gpRateBudget).toBeCloseTo(0.222, 3)
  })
})

/* ── mergeDepartmentKpiData ────────────────── */

describe('mergeDepartmentKpiData', () => {
  it('既存データとのマージ（後勝ち）', () => {
    const existing = {
      records: [{
        deptCode: '01', deptName: '青果',
        gpRateBudget: 0.2, gpRateActual: 0.18, gpRateVariance: -0.02,
        markupRate: 0.25, discountRate: 0.03,
        salesBudget: 1000000, salesActual: 900000, salesVariance: -100000, salesAchievement: 0.9,
        openingInventory: 500000, closingInventory: 450000, gpRateLanding: 0.19, salesLanding: 950000,
      }],
    }
    const incoming = {
      records: [{
        deptCode: '01', deptName: '青果（更新）',
        gpRateBudget: 0.22, gpRateActual: 0.21, gpRateVariance: -0.01,
        markupRate: 0.26, discountRate: 0.035,
        salesBudget: 1100000, salesActual: 1050000, salesVariance: -50000, salesAchievement: 0.95,
        openingInventory: 500000, closingInventory: 480000, gpRateLanding: 0.22, salesLanding: 1080000,
      }],
    }
    const result = mergeDepartmentKpiData(existing, incoming)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].deptName).toBe('青果（更新）')
    expect(result.records[0].salesActual).toBe(1050000)
  })

  it('異なる部門コードは両方保持する', () => {
    const existing = { records: [{ deptCode: '01', deptName: '青果', gpRateBudget: 0.2, gpRateActual: 0.18, gpRateVariance: -0.02, markupRate: 0.25, discountRate: 0.03, salesBudget: 1000000, salesActual: 900000, salesVariance: -100000, salesAchievement: 0.9, openingInventory: 500000, closingInventory: 450000, gpRateLanding: 0.19, salesLanding: 950000 }] }
    const incoming = { records: [{ deptCode: '02', deptName: '鮮魚', gpRateBudget: 0.3, gpRateActual: 0.28, gpRateVariance: -0.02, markupRate: 0.35, discountRate: 0.04, salesBudget: 800000, salesActual: 750000, salesVariance: -50000, salesAchievement: 0.94, openingInventory: 300000, closingInventory: 280000, gpRateLanding: 0.29, salesLanding: 780000 }] }
    const result = mergeDepartmentKpiData(existing, incoming)
    expect(result.records).toHaveLength(2)
  })
})
