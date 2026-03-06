import { describe, it, expect } from 'vitest'
import {
  safeNumber,
  safeDivide,
  formatCurrency,
  formatManYen,
  formatPercent,
  formatPointDiff,
  calculateMovingAverage,
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
  computeAverageDivisor,
  computeActiveDowDivisorMap,
  maxDayOfRecord,
  detectDataMaxDay,
} from './utils'

describe('safeNumber', () => {
  it('数値はそのまま', () => expect(safeNumber(42)).toBe(42))
  it('文字列の数値を変換', () => expect(safeNumber('123')).toBe(123))
  it('nullは0', () => expect(safeNumber(null)).toBe(0))
  it('undefinedは0', () => expect(safeNumber(undefined)).toBe(0))
  it('NaN文字列は0', () => expect(safeNumber('abc')).toBe(0))
  it('0は0', () => expect(safeNumber(0)).toBe(0))
  it('負の数', () => expect(safeNumber(-5)).toBe(-5))
  it('小数', () => expect(safeNumber(3.14)).toBe(3.14))
})

describe('safeDivide', () => {
  it('正常な除算', () => expect(safeDivide(10, 5)).toBe(2))
  it('ゼロ除算はフォールバック', () => expect(safeDivide(10, 0)).toBe(0))
  it('カスタムフォールバック', () => expect(safeDivide(10, 0, -1)).toBe(-1))
  it('0 / 0', () => expect(safeDivide(0, 0)).toBe(0))
  it('負の除算', () => expect(safeDivide(-10, 2)).toBe(-5))
  it('NaN 分子は NaN を返す（上流でガードすべき）', () => expect(safeDivide(NaN, 100)).toBeNaN())
  it('Infinity 分母は 0 を返す', () => expect(safeDivide(100, Infinity)).toBe(0))
})

describe('formatCurrency', () => {
  it('通常の金額', () => expect(formatCurrency(1234567)).toBe('1,234,567'))
  it('四捨五入', () => expect(formatCurrency(1234567.6)).toBe('1,234,568'))
  it('nullはハイフン', () => expect(formatCurrency(null)).toBe('-'))
  it('NaNはハイフン', () => expect(formatCurrency(NaN)).toBe('-'))
  it('0', () => expect(formatCurrency(0)).toBe('0'))
  it('負の値', () => expect(formatCurrency(-500000)).toBe('-500,000'))
})

describe('formatManYen', () => {
  it('プラス値', () => expect(formatManYen(1230000)).toBe('+123万円'))
  it('マイナス値', () => expect(formatManYen(-500000)).toBe('-50万円'))
  it('nullはハイフン', () => expect(formatManYen(null)).toBe('-'))
  it('ゼロ', () => expect(formatManYen(0)).toBe('0万円'))
})

describe('formatPercent', () => {
  it('通常の率', () => expect(formatPercent(0.2534)).toBe('25.34%'))
  it('小数1桁', () => expect(formatPercent(0.2534, 1)).toBe('25.3%'))
  it('nullはハイフン', () => expect(formatPercent(null)).toBe('-'))
  it('0%', () => expect(formatPercent(0)).toBe('0.00%'))
})

describe('formatPointDiff', () => {
  it('プラス差', () => expect(formatPointDiff(0.015)).toBe('+1.5pt'))
  it('マイナス差', () => expect(formatPointDiff(-0.02)).toBe('-2.0pt'))
  it('nullはハイフン', () => expect(formatPointDiff(null)).toBe('-'))
  it('ゼロ', () => expect(formatPointDiff(0)).toBe('0.0pt'))
})

describe('calculateMovingAverage', () => {
  it('先頭 window-1 個は NaN', () => {
    const result = calculateMovingAverage([1, 2, 3, 4, 5], 3)
    expect(result[0]).toBeNaN()
    expect(result[1]).toBeNaN()
    expect(result[2]).toBeCloseTo(2) // (1+2+3)/3
  })

  it('ウィンドウサイズ1は元の値と同じ', () => {
    const result = calculateMovingAverage([10, 20, 30], 1)
    expect(result).toEqual([10, 20, 30])
  })

  it('正しい移動平均を計算', () => {
    const result = calculateMovingAverage([1, 2, 3, 4, 5], 3)
    expect(result[2]).toBeCloseTo(2) // (1+2+3)/3
    expect(result[3]).toBeCloseTo(3) // (2+3+4)/3
    expect(result[4]).toBeCloseTo(4) // (3+4+5)/3
  })

  it('空配列は空配列を返す', () => {
    expect(calculateMovingAverage([], 3)).toEqual([])
  })
})

/* ── PI値・点単価（decompose3 の構成要素） ──────────── */

describe('calculateItemsPerCustomer (PI値)', () => {
  it('基本計算: totalQty ÷ customers', () => {
    expect(calculateItemsPerCustomer(500, 100)).toBe(5)
  })
  it('客数0は0を返す（safeDivide）', () => {
    expect(calculateItemsPerCustomer(500, 0)).toBe(0)
  })
  it('点数0は0を返す', () => {
    expect(calculateItemsPerCustomer(0, 100)).toBe(0)
  })
  it('小数点を正しく計算', () => {
    expect(calculateItemsPerCustomer(660, 110)).toBeCloseTo(6, 10)
  })
})

describe('calculateAveragePricePerItem (点単価)', () => {
  it('基本計算: sales ÷ totalQty', () => {
    expect(calculateAveragePricePerItem(250_000, 500)).toBe(500)
  })
  it('点数0は0を返す（safeDivide）', () => {
    expect(calculateAveragePricePerItem(250_000, 0)).toBe(0)
  })
  it('売上0は0を返す', () => {
    expect(calculateAveragePricePerItem(0, 500)).toBe(0)
  })
  it('小数点を正しく計算', () => {
    expect(calculateAveragePricePerItem(396_000, 660)).toBe(600)
  })
})

describe('PI値・点単価の不変条件: C × Q × P̄ = S', () => {
  // S = C × Q × P̄ は decompose3 の分解前提。
  // calculateItemsPerCustomer(Q) × calculateAveragePricePerItem(P̄) × C = S が成立する。
  const scenarios = [
    { label: '標準ケース', sales: 250_000, cust: 100, qty: 500 },
    { label: '高PI・低単価', sales: 180_000, cust: 60, qty: 900 },
    { label: '低PI・高単価', sales: 500_000, cust: 200, qty: 400 },
    { label: '1客1点', sales: 100_000, cust: 100, qty: 100 },
    { label: '大規模', sales: 10_000_000, cust: 5000, qty: 50_000 },
    { label: '微小', sales: 1_000, cust: 2, qty: 3 },
  ]

  for (const s of scenarios) {
    it(`C × Q × P̄ = S: ${s.label}`, () => {
      const Q = calculateItemsPerCustomer(s.qty, s.cust)
      const P = calculateAveragePricePerItem(s.sales, s.qty)
      const reconstructed = s.cust * Q * P
      expect(reconstructed).toBeCloseTo(s.sales, 2)
    })
  }

  it('客数0のとき再構成は0（ゼロ除算安全）', () => {
    const Q = calculateItemsPerCustomer(500, 0)
    const P = calculateAveragePricePerItem(250_000, 500)
    expect(0 * Q * P).toBe(0) // C=0 なので再構成も0
  })

  it('点数0のとき再構成は0（ゼロ除算安全）', () => {
    const Q = calculateItemsPerCustomer(0, 100)
    const P = calculateAveragePricePerItem(250_000, 0)
    expect(100 * Q * P).toBe(0) // Q=0 なので再構成も0
  })
})

describe('computeAverageDivisor', () => {
  it('total モードは常に1を返す', () => {
    expect(
      computeAverageDivisor({
        mode: 'total',
        activeDays: [1, 2, 3],
        year: 2026,
        month: 3,
      }),
    ).toBe(1)
  })

  it('dailyAvg モードはアクティブ日数を返す', () => {
    expect(
      computeAverageDivisor({
        mode: 'dailyAvg',
        activeDays: [1, 2, 3, 4, 5],
        year: 2026,
        month: 3,
      }),
    ).toBe(5)
  })

  it('dailyAvg モード + dowFilter で該当曜日のみカウント', () => {
    // 2026-03: 1=日, 2=月, 3=火, 4=水, 5=木, 6=金, 7=土, 8=日
    const result = computeAverageDivisor({
      mode: 'dailyAvg',
      activeDays: [1, 2, 3, 4, 5, 6, 7, 8],
      year: 2026,
      month: 3,
      dowFilter: [0], // Sunday only
    })
    // 1日(日) and 8日(日) = 2
    expect(result).toBe(2)
  })

  it('アクティブ日がない場合は1を返す（0除算防止）', () => {
    expect(
      computeAverageDivisor({
        mode: 'dailyAvg',
        activeDays: [],
        year: 2026,
        month: 3,
      }),
    ).toBe(1)
  })

  it('dowFilter に該当日がない場合は1を返す', () => {
    // 2026-03-02 is Monday(1), filter for Saturday(6) → 0 matches → 1
    expect(
      computeAverageDivisor({
        mode: 'dailyAvg',
        activeDays: [2],
        year: 2026,
        month: 3,
        dowFilter: [6],
      }),
    ).toBe(1)
  })

  it('Iterable（Set）をサポートする', () => {
    expect(
      computeAverageDivisor({
        mode: 'dailyAvg',
        activeDays: new Set([1, 2, 3]),
        year: 2026,
        month: 3,
      }),
    ).toBe(3)
  })
})

describe('computeActiveDowDivisorMap', () => {
  it('各曜日の日数を正しくカウントする', () => {
    // 2026-03: 1=日, 2=月, 3=火, 8=日
    const result = computeActiveDowDivisorMap([1, 2, 3, 8], 2026, 3)
    expect(result.get(0)).toBe(2) // Sunday: 1, 8
    expect(result.get(1)).toBe(1) // Monday: 2
    expect(result.get(2)).toBe(1) // Tuesday: 3
  })

  it('空のアクティブ日は空マップを返す', () => {
    const result = computeActiveDowDivisorMap([], 2026, 3)
    expect(result.size).toBe(0)
  })
})

describe('maxDayOfRecord', () => {
  it('レコードから最大日を取得する', () => {
    const record = {
      S001: { 1: {}, 5: {}, 3: {} },
      S002: { 2: {}, 10: {} },
    }
    expect(maxDayOfRecord(record)).toBe(10)
  })

  it('null は 0 を返す', () => {
    expect(maxDayOfRecord(null)).toBe(0)
  })

  it('undefined は 0 を返す', () => {
    expect(maxDayOfRecord(undefined)).toBe(0)
  })

  it('空のオブジェクトは 0 を返す', () => {
    expect(maxDayOfRecord({})).toBe(0)
  })
})

describe('detectDataMaxDay', () => {
  it('全データソースの最大日を返す', () => {
    const data = {
      purchase: { records: [{ day: 15 }] },
      classifiedSales: { records: [{ day: 20 }, { day: 10 }] },
      interStoreIn: { records: [{ day: 5 }] },
      interStoreOut: { records: [] },
      flowers: { records: [{ day: 25 }] },
      directProduce: { records: [] },
    }
    expect(detectDataMaxDay(data)).toBe(25)
  })

  it('全てのデータが空なら 0', () => {
    const data = {
      purchase: { records: [] },
      classifiedSales: { records: [] },
      interStoreIn: { records: [] },
      interStoreOut: { records: [] },
      flowers: { records: [] },
      directProduce: { records: [] },
    }
    expect(detectDataMaxDay(data)).toBe(0)
  })
})
