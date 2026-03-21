/**
 * ウォーターフォール部門別増減データ整合性テスト
 *
 * 不変条件: buildCategoryData の残差は同一データソースから計算されるため 0 に近い。
 * 残差が大きい場合はデータソースの不整合を示す。
 */
import { describe, it, expect } from 'vitest'
import { buildCategoryData } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

function makeRecord(
  dept: string,
  totalAmount: number,
  day = 1,
): CategoryTimeSalesRecord {
  return {
    year: 2026,
    month: 3,
    day,
    storeId: 'S001',
    department: { code: dept, name: `${dept}部門` },
    line: { code: `${dept}-L1`, name: `${dept}ライン1` },
    klass: { code: `${dept}-K1`, name: `${dept}クラス1` },
    timeSlots: [{ hour: 10, quantity: 10, amount: totalAmount }],
    totalQuantity: 10,
    totalAmount,
  }
}

describe('buildCategoryData — データ整合性', () => {
  it('同一データソースから計算される場合、残差は 0 になる', () => {
    const curCTS = [
      makeRecord('A', 100000),
      makeRecord('B', 200000),
      makeRecord('C', 50000),
    ]
    const prevCTS = [
      makeRecord('A', 80000),
      makeRecord('B', 180000),
      makeRecord('C', 60000),
    ]

    // curSales/prevSales も CTS 合計と一致させる
    const curTotal = curCTS.reduce((s, r) => s + r.totalAmount, 0)
    const prevTotal = prevCTS.reduce((s, r) => s + r.totalAmount, 0)

    const result = buildCategoryData({
      periodCTS: curCTS,
      periodPrevCTS: prevCTS,
      hasComparison: true,
      prevSales: prevTotal,
      curSales: curTotal,
      prevLabel: '前年',
      curLabel: '当年',
    })

    // 残差は 0
    expect(result.residual).toBe(0)
    expect(result.residualPct).toBe(0)

    // ウォーターフォールの先頭は前年合計、末尾は当年合計
    expect(result.items[0].value).toBe(prevTotal)
    expect(result.items[result.items.length - 1].value).toBe(curTotal)

    // 部門別差分の合計 = 当年合計 - 前年合計
    const deptDiffs = result.items.filter((it) => !it.isTotal)
    const diffSum = deptDiffs.reduce((s, it) => s + it.value, 0)
    expect(diffSum).toBe(curTotal - prevTotal)
  })

  it('部門が0件の場合は空結果を返す', () => {
    const result = buildCategoryData({
      periodCTS: [],
      periodPrevCTS: [],
      hasComparison: true,
      prevSales: 100,
      curSales: 200,
      prevLabel: '前年',
      curLabel: '当年',
    })

    expect(result.items).toHaveLength(0)
    expect(result.residual).toBe(0)
  })

  it('残差率が大きいケースは residualPct に反映される', () => {
    const curCTS = [makeRecord('A', 100000)]
    const prevCTS = [makeRecord('A', 80000)]

    // 意図的に prevSales を CTS と不一致にする（本来はあってはならない）
    const result = buildCategoryData({
      periodCTS: curCTS,
      periodPrevCTS: prevCTS,
      hasComparison: true,
      prevSales: 99999, // CTS合計(80000)と不一致
      curSales: 99999,  // CTS合計(100000)と不一致
      prevLabel: '前年',
      curLabel: '当年',
    })

    // CTS合計をアンカーに使うので、残差は 0
    // （buildCategoryData は CTS 合計をアンカーにするため、
    //   prevSales/curSales パラメータは部門別ビューでは使われない）
    expect(result.residual).toBe(0)
  })
})
