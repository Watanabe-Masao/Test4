/**
 * WHERE 句ビルダー拡充テスト
 *
 * queryRunner のユーティリティ関数と、各クエリモジュールの
 * フィルタ条件生成を組み合わせた統合テスト。
 * DuckDB 接続不要。
 */
import { describe, it, expect } from 'vitest'
import { buildWhereClause, storeIdFilter, storeIdFilterWithAlias } from '../queryRunner'
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
    const a = alias
    const dateFrom = validateDateKey(params.dateFrom)
    const dateTo = validateDateKey(params.dateTo)
    const conditions: (string | null)[] = [
      `${a}.date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
      `${a}.is_prev_year = ${params.isPrevYear ?? false}`,
      storeIdFilterWithAlias(params.storeIds, a),
      params.deptCode ? `${a}.dept_code = '${validateCode(params.deptCode)}'` : null,
      params.lineCode ? `${a}.line_code = '${validateCode(params.lineCode)}'` : null,
      params.klassCode ? `${a}.klass_code = '${validateCode(params.klassCode)}'` : null,
      params.dow && params.dow.length > 0 ? `${a}.dow IN (${params.dow.join(', ')})` : null,
    ]
    return buildWhereClause(conditions)
  }

  it('エイリアス付き日付フィルタ', () => {
    const result = ctsWhereClause({ dateFrom: '2026-02-01', dateTo: '2026-02-28' }, 'cts')
    expect(result).toContain("cts.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(result).toContain('cts.is_prev_year = false')
  })

  it('前年フラグ TRUE', () => {
    const result = ctsWhereClause(
      { dateFrom: '2025-02-01', dateTo: '2025-02-28', isPrevYear: true },
      'cts',
    )
    expect(result).toContain('cts.is_prev_year = true')
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
    const dateFrom = validateDateKey(params.dateFrom)
    const dateTo = validateDateKey(params.dateTo)
    return buildWhereClause([
      `date_key BETWEEN '${dateFrom}' AND '${dateTo}'`,
      `is_prev_year = ${params.isPrevYear ?? false}`,
      storeIdFilter(params.storeIds),
    ])
  }

  it('日付と isPrevYear のデフォルト', () => {
    const result = summaryWhereClause({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    })
    expect(result).toBe(
      "WHERE date_key BETWEEN '2026-02-01' AND '2026-02-28' AND is_prev_year = false",
    )
  })

  it('前年データのフィルタ', () => {
    const result = summaryWhereClause({
      dateFrom: '2025-02-01',
      dateTo: '2025-02-28',
      isPrevYear: true,
    })
    expect(result).toContain('is_prev_year = true')
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
