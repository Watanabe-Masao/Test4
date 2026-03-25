/**
 * WHERE 句ビルダー拡充テスト
 *
 * queryRunner のユーティリティ関数と、各クエリモジュールの
 * フィルタ条件生成を組み合わせた統合テスト。
 * DuckDB 接続不要。
 */
import { describe, it, expect } from 'vitest'
import {
  buildTypedWhere,
  storeIdFilter,
  storeIdFilterWithAlias,
  type WhereCondition,
} from '../queryRunner'
import { validateDateKey, validateStoreId, validateCode } from '../queryParams'

// ─── storeIdFilterWithAlias ────────────────────────────────

describe('storeIdFilterWithAlias', () => {
  it('storeIds が空配列の場合は null を返す', () => {
    expect(storeIdFilterWithAlias([], 'ts')).toBeNull()
  })

  it('storeIds が undefined の場合は null を返す', () => {
    expect(storeIdFilterWithAlias(undefined, 'ts')).toBeNull()
  })

  it('単一の storeId でエイリアス付き IN 条件を生成', () => {
    expect(storeIdFilterWithAlias(['1'], 'ts')).toBe("ts.store_id IN ('1')")
  })

  it('複数の storeIds でエイリアス付き IN 条件を生成', () => {
    expect(storeIdFilterWithAlias(['1', '2', '3'], 'cts')).toBe("cts.store_id IN ('1', '2', '3')")
  })

  it('異なるエイリアスで正しく生成', () => {
    expect(storeIdFilterWithAlias(['1'], 'n')).toBe("n.store_id IN ('1')")
  })

  it('シングルクォートを含む storeId はバリデーションで拒否される', () => {
    expect(() => storeIdFilterWithAlias(["O'Brien"], 'ts')).toThrow('Invalid store ID')
  })
})

// ─── CTS WHERE 句の統合テスト ────────────────────────────────

describe('CTS WHERE 句統合テスト', () => {
  /** categoryTimeSales.ts の ctsWhereClause を再現する内部関数 */
  function ctsWhereClause(
    params: {
      dateFrom: string
      dateTo: string
      storeIds?: readonly string[]
      deptCode?: string
      lineCode?: string
      klassCode?: string
      dow?: readonly number[]
      isPrevYear?: boolean
    },
    alias: string,
  ): string {
    const conditions: WhereCondition[] = [
      { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo, alias },
      { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false, alias },
      { type: 'storeIds', storeIds: params.storeIds, alias },
    ]
    if (params.deptCode)
      conditions.push({ type: 'code', column: 'dept_code', value: params.deptCode, alias })
    if (params.lineCode)
      conditions.push({ type: 'code', column: 'line_code', value: params.lineCode, alias })
    if (params.klassCode)
      conditions.push({ type: 'code', column: 'klass_code', value: params.klassCode, alias })
    if (params.dow && params.dow.length > 0)
      conditions.push({ type: 'in', column: 'dow', values: params.dow, alias })
    return buildTypedWhere(conditions)
  }

  it('エイリアス付き日付フィルタ', () => {
    const result = ctsWhereClause({ dateFrom: '2026-02-01', dateTo: '2026-02-28' }, 'cts')
    expect(result).toContain("cts.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(result).toContain('cts.is_prev_year = FALSE')
  })

  it('前年フラグ TRUE', () => {
    const result = ctsWhereClause(
      { dateFrom: '2025-02-01', dateTo: '2025-02-28', isPrevYear: true },
      'cts',
    )
    expect(result).toContain('cts.is_prev_year = TRUE')
  })

  it('店舗フィルタ付き', () => {
    const result = ctsWhereClause(
      { dateFrom: '2026-01-01', dateTo: '2026-01-31', storeIds: ['1', '2'] },
      'cts',
    )
    expect(result).toContain("cts.store_id IN ('1', '2')")
  })

  it('階層フィルタの組み合わせ', () => {
    const result = ctsWhereClause(
      {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        deptCode: 'D01',
        lineCode: 'L02',
        klassCode: 'K03',
      },
      'cts',
    )
    expect(result).toContain("cts.dept_code = 'D01'")
    expect(result).toContain("cts.line_code = 'L02'")
    expect(result).toContain("cts.klass_code = 'K03'")
  })

  it('曜日フィルタ', () => {
    const result = ctsWhereClause(
      { dateFrom: '2026-01-01', dateTo: '2026-01-31', dow: [0, 6] },
      'cts',
    )
    expect(result).toContain('cts.dow IN (0, 6)')
  })

  it('不正な日付で例外', () => {
    expect(() =>
      ctsWhereClause({ dateFrom: "2026-01-01' OR '1'='1", dateTo: '2026-01-31' }, 'cts'),
    ).toThrow('Invalid date key')
  })

  it('不正な deptCode で例外', () => {
    expect(() =>
      ctsWhereClause(
        { dateFrom: '2026-01-01', dateTo: '2026-01-31', deptCode: "D01'; DROP TABLE--" },
        'cts',
      ),
    ).toThrow('Invalid code')
  })
})

// ─── storeDaySummary WHERE 句テスト ────────────────────────────────

describe('storeDaySummary WHERE 句テスト', () => {
  /** storeDaySummary.ts の summaryWhereClause を再現 */
  function summaryWhereClause(params: {
    dateFrom: string
    dateTo: string
    storeIds?: readonly string[]
    isPrevYear?: boolean
  }): string {
    return buildTypedWhere([
      { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
      { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
      { type: 'storeIds', storeIds: params.storeIds },
    ])
  }

  it('日付と isPrevYear のデフォルト', () => {
    const result = summaryWhereClause({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    })
    expect(result).toBe(
      "WHERE date_key BETWEEN '2026-02-01' AND '2026-02-28' AND is_prev_year = FALSE",
    )
  })

  it('前年データのフィルタ', () => {
    const result = summaryWhereClause({
      dateFrom: '2025-02-01',
      dateTo: '2025-02-28',
      isPrevYear: true,
    })
    expect(result).toContain('is_prev_year = TRUE')
  })

  it('店舗フィルタなし（全店）', () => {
    const result = summaryWhereClause({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      storeIds: [],
    })
    expect(result).not.toContain('store_id')
  })

  it('月跨ぎ日付範囲', () => {
    const result = summaryWhereClause({
      dateFrom: '2025-12-15',
      dateTo: '2026-01-15',
    })
    expect(result).toContain("date_key BETWEEN '2025-12-15' AND '2026-01-15'")
  })
})

// ─── YoY WHERE 句テスト ────────────────────────────────

describe('YoY パラメータバリデーション', () => {
  it('4つの日付パラメータが全てバリデーションされる', () => {
    const validParams = {
      curDateFrom: '2026-01-01',
      curDateTo: '2026-01-31',
      prevDateFrom: '2025-01-01',
      prevDateTo: '2025-01-31',
    }
    // 全て正常
    expect(() => {
      validateDateKey(validParams.curDateFrom)
      validateDateKey(validParams.curDateTo)
      validateDateKey(validParams.prevDateFrom)
      validateDateKey(validParams.prevDateTo)
    }).not.toThrow()
  })

  it('curDateFrom が不正で例外', () => {
    expect(() => validateDateKey("2026-01-01'; DROP TABLE")).toThrow('Invalid date key')
  })

  it('prevDateTo が不正で例外', () => {
    expect(() => validateDateKey('2025/01/31')).toThrow('Invalid date key')
  })

  it('storeIdFilter で店舗条件を安全に生成', () => {
    const filter = storeIdFilter(['1', '2'])
    expect(filter).toBe("store_id IN ('1', '2')")
  })

  it('storeIds なしの場合は全店対象', () => {
    expect(storeIdFilter(undefined)).toBeNull()
  })
})

// ─── バリデーション境界テスト ────────────────────────────────

describe('バリデーション境界テスト', () => {
  it('validateDateKey: 先頭・末尾にスペース', () => {
    expect(() => validateDateKey(' 2024-01-01')).toThrow('Invalid date key')
    expect(() => validateDateKey('2024-01-01 ')).toThrow('Invalid date key')
  })

  it('validateStoreId: 空文字列は許可される（フィルタレベルで除外）', () => {
    // 空文字にSQL injection文字がないので validateStoreId は通す
    expect(validateStoreId('')).toBe('')
  })

  it('validateStoreId: 日本語を含むIDは許可', () => {
    expect(validateStoreId('店舗01')).toBe('店舗01')
    expect(validateStoreId('東京本店')).toBe('東京本店')
  })

  it('validateCode: ハイフン・アンダースコアは許可', () => {
    expect(validateCode('DEPT-01')).toBe('DEPT-01')
    expect(validateCode('LINE_A')).toBe('LINE_A')
  })

  it('storeIdFilter: 大量の storeIds でも正常に動作', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `store${i + 1}`)
    const result = storeIdFilter(ids)
    expect(result).toContain("store_id IN ('store1'")
    expect(result).toContain("'store100')")
  })
})

// ─── buildTypedWhere — 型安全 WHERE 句ビルダー ────────────

describe('buildTypedWhere', () => {
  it('dateRange 条件を BETWEEN 句に変換する', () => {
    const result = buildTypedWhere([
      { type: 'dateRange', column: 'date_key', from: '2026-01-01', to: '2026-01-31' },
    ])
    expect(result).toBe("WHERE date_key BETWEEN '2026-01-01' AND '2026-01-31'")
  })

  it('dateRange にエイリアスを適用する', () => {
    const result = buildTypedWhere([
      { type: 'dateRange', column: 'date_key', from: '2026-02-01', to: '2026-02-28', alias: 's' },
    ])
    expect(result).toBe("WHERE s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })

  it('boolean 条件を TRUE/FALSE に変換する', () => {
    const result = buildTypedWhere([{ type: 'boolean', column: 'is_prev_year', value: false }])
    expect(result).toBe('WHERE is_prev_year = FALSE')
  })

  it('storeIds 条件を IN 句に変換する', () => {
    const result = buildTypedWhere([{ type: 'storeIds', storeIds: ['S001', 'S002'] }])
    expect(result).toBe("WHERE store_id IN ('S001', 'S002')")
  })

  it('storeIds が空の場合は条件をスキップする', () => {
    const result = buildTypedWhere([
      { type: 'dateRange', column: 'date_key', from: '2026-01-01', to: '2026-01-31' },
      { type: 'storeIds', storeIds: [] },
    ])
    expect(result).toBe("WHERE date_key BETWEEN '2026-01-01' AND '2026-01-31'")
  })

  it('storeIds にエイリアスを適用する', () => {
    const result = buildTypedWhere([{ type: 'storeIds', storeIds: ['S001'], alias: 'cts' }])
    expect(result).toBe("WHERE cts.store_id IN ('S001')")
  })

  it('code 条件をバリデーション付きで変換する', () => {
    const result = buildTypedWhere([{ type: 'code', column: 'dept_code', value: 'D01' }])
    expect(result).toBe("WHERE dept_code = 'D01'")
  })

  it('in 条件を数値配列で変換する', () => {
    const result = buildTypedWhere([{ type: 'in', column: 'dow', values: [0, 6] }])
    expect(result).toBe('WHERE dow IN (0, 6)')
  })

  it('raw 条件をそのまま出力する', () => {
    const result = buildTypedWhere([{ type: 'raw', sql: "custom_col = 'value'" }])
    expect(result).toBe("WHERE custom_col = 'value'")
  })

  it('複数条件を AND で結合する', () => {
    const conditions: WhereCondition[] = [
      { type: 'dateRange', column: 'date_key', from: '2026-01-01', to: '2026-01-31', alias: 's' },
      { type: 'boolean', column: 'is_prev_year', value: false, alias: 's' },
      { type: 'storeIds', storeIds: ['S001', 'S002'], alias: 's' },
    ]
    const result = buildTypedWhere(conditions)
    expect(result).toContain("s.date_key BETWEEN '2026-01-01' AND '2026-01-31'")
    expect(result).toContain('s.is_prev_year = FALSE')
    expect(result).toContain("s.store_id IN ('S001', 'S002')")
    // WHERE + 3条件 = AND が2つ
    expect(result).toMatch(/^WHERE .+ AND .+ AND .+$/)
  })

  it('全条件が null に評価される場合は空文字を返す', () => {
    const result = buildTypedWhere([
      { type: 'storeIds', storeIds: undefined },
      { type: 'storeIds', storeIds: [] },
    ])
    expect(result).toBe('')
  })

  it('不正な日付で例外を投げる', () => {
    expect(() =>
      buildTypedWhere([
        { type: 'dateRange', column: 'date_key', from: "2026-01-01' OR '1'='1", to: '2026-01-31' },
      ]),
    ).toThrow('Invalid date key')
  })

  it('不正なコードで例外を投げる', () => {
    expect(() =>
      buildTypedWhere([{ type: 'code', column: 'dept_code', value: "D01'; DROP TABLE--" }]),
    ).toThrow('Invalid code')
  })
})
