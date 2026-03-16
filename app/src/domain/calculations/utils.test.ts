import { describe, it, expect } from 'vitest'
import { formatCurrency, formatManYen, formatPercent, formatPointDiff } from '@/domain/formatting'
import {
  safeNumber,
  safeDivide,
  calculateAchievementRate,
  calculateTransactionValue,
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
  it('Infinityは0', () => expect(safeNumber(Infinity)).toBe(0))
  it('-Infinityは0', () => expect(safeNumber(-Infinity)).toBe(0))
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

/* ── calculateAchievementRate（pragmatic: 数学的不変条件なし） ── */

describe('calculateAchievementRate (pragmatic)', () => {
  it('基本計算: actual / target', () => {
    expect(calculateAchievementRate(800_000, 1_000_000)).toBeCloseTo(0.8)
  })
  it('100%達成', () => {
    expect(calculateAchievementRate(1_000_000, 1_000_000)).toBe(1)
  })
  it('超過達成', () => {
    expect(calculateAchievementRate(1_200_000, 1_000_000)).toBeCloseTo(1.2)
  })
  it('target=0 は 0 を返す（ゼロ除算安全）', () => {
    expect(calculateAchievementRate(500_000, 0)).toBe(0)
  })
  it('actual=0 は 0 を返す', () => {
    expect(calculateAchievementRate(0, 1_000_000)).toBe(0)
  })
  it('both=0 は 0 を返す', () => {
    expect(calculateAchievementRate(0, 0)).toBe(0)
  })
})

/* ── calculateAchievementRate 不変条件 ── */

describe('calculateAchievementRate 不変条件', () => {
  /**
   * 証明可能な数学的性質。pragmatic 関数だが、以下は常に成立する。
   * 違反した場合は実装の破壊を意味する。
   */
  const scenarios = [
    { label: '標準', actual: 800_000, target: 1_000_000 },
    { label: '超過', actual: 1_200_000, target: 1_000_000 },
    { label: '微小', actual: 1, target: 3 },
    { label: '大規模', actual: 50_000_000, target: 45_000_000 },
    { label: '同値', actual: 999, target: 999 },
    { label: '低達成', actual: 100, target: 10_000_000 },
  ]

  // 不変条件 1: 再構成 — result × target = actual
  for (const s of scenarios) {
    it(`再構成: f(${s.actual}, ${s.target}) × target = actual [${s.label}]`, () => {
      const rate = calculateAchievementRate(s.actual, s.target)
      expect(rate * s.target).toBeCloseTo(s.actual, 5)
    })
  }

  // 不変条件 2: 自己同一性 — f(x, x) = 1
  for (const x of [1, 100, 999_999, 0.001]) {
    it(`自己同一性: f(${x}, ${x}) = 1`, () => {
      expect(calculateAchievementRate(x, x)).toBe(1)
    })
  }

  // 不変条件 3: 単調性 — a₁ > a₂ ⇒ f(a₁, t) > f(a₂, t)  (t > 0)
  it('単調性: actual が大きいほど rate が大きい', () => {
    const t = 1_000_000
    const r1 = calculateAchievementRate(500_000, t)
    const r2 = calculateAchievementRate(800_000, t)
    const r3 = calculateAchievementRate(1_200_000, t)
    expect(r1).toBeLessThan(r2)
    expect(r2).toBeLessThan(r3)
  })

  // 不変条件 4: ゼロ安全性 — target = 0 → 0（発散しない）
  it('ゼロ安全性: target=0 は常に 0', () => {
    for (const a of [-100, 0, 100, 1_000_000]) {
      expect(calculateAchievementRate(a, 0)).toBe(0)
    }
  })
})

/* ── calculateTransactionValue ── */

describe('calculateTransactionValue', () => {
  it('基本計算: Math.round(sales / customers)', () => {
    expect(calculateTransactionValue(250_000, 100)).toBe(2500)
  })
  it('端数は四捨五入', () => {
    expect(calculateTransactionValue(100, 3)).toBe(33) // 33.33.. → 33
  })
  it('customers=0 は 0 を返す（ゼロ除算安全）', () => {
    expect(calculateTransactionValue(250_000, 0)).toBe(0)
  })
  it('sales=0 は 0 を返す', () => {
    expect(calculateTransactionValue(0, 100)).toBe(0)
  })
})

/* ── calculateTransactionValue 不変条件 ── */

describe('calculateTransactionValue 不変条件', () => {
  /**
   * Math.round(sales / customers) の数学的性質。
   * 丸めにより完全再構成はできないが、誤差上限は保証される。
   */
  const scenarios = [
    { label: '割り切れる', sales: 250_000, cust: 100 },
    { label: '端数あり', sales: 100, cust: 3 },
    { label: '大規模', sales: 50_000_000, cust: 12_345 },
    { label: '1客', sales: 4_980, cust: 1 },
    { label: '低単価', sales: 500, cust: 200 },
    { label: '高単価', sales: 10_000_000, cust: 3 },
  ]

  // 不変条件 1: 丸め誤差上限 — |result × c - s| ≤ c × 0.5
  for (const s of scenarios) {
    it(`丸め誤差上限: |tv × c - s| ≤ c × 0.5 [${s.label}]`, () => {
      const tv = calculateTransactionValue(s.sales, s.cust)
      const error = Math.abs(tv * s.cust - s.sales)
      expect(error).toBeLessThanOrEqual(s.cust * 0.5)
    })
  }

  // 不変条件 2: 整数性 — 結果は常に整数
  for (const s of scenarios) {
    it(`整数性: result は整数 [${s.label}]`, () => {
      const tv = calculateTransactionValue(s.sales, s.cust)
      expect(Number.isInteger(tv)).toBe(true)
    })
  }

  // 不変条件 3: 近似精度 — |result - (sales/customers)| ≤ 0.5
  for (const s of scenarios) {
    it(`近似精度: |result - exact| ≤ 0.5 [${s.label}]`, () => {
      const tv = calculateTransactionValue(s.sales, s.cust)
      const exact = s.sales / s.cust
      expect(Math.abs(tv - exact)).toBeLessThanOrEqual(0.5)
    })
  }

  // 不変条件 4: 単調性 — s₁ > s₂ ⇒ tv(s₁, c) ≥ tv(s₂, c)  (c > 0)
  it('単調性: 売上が大きいほど客単価は大きいか同値', () => {
    const c = 100
    const tv1 = calculateTransactionValue(100_000, c)
    const tv2 = calculateTransactionValue(200_000, c)
    const tv3 = calculateTransactionValue(500_000, c)
    expect(tv1).toBeLessThanOrEqual(tv2)
    expect(tv2).toBeLessThanOrEqual(tv3)
  })

  // 不変条件 5: ゼロ安全性
  it('ゼロ安全性: customers=0 は常に 0', () => {
    for (const s of [0, 100, 1_000_000]) {
      expect(calculateTransactionValue(s, 0)).toBe(0)
    }
  })
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
