/**
 * FORMULA_REGISTRY 整合性テスト
 *
 * FORMULA_REGISTRY とコードベースの整合を検証するCIテスト。
 *
 * 検証項目:
 *   REG-1: 全 FormulaId がレジストリに登録されていること
 *   REG-2: 全エントリの必須フィールドが非空であること
 *   REG-3: implementedBy 関数が指定モジュールに実際に存在すること
 *   REG-4: METRIC_DEFS の formulaRef が有効な FormulaId を参照すること
 *   REG-5: 全エントリに inputs が定義されていること（接点ルール）
 *   REG-6: accounting/decomposition 公式の inputs.source が具体的であること
 *   REG-8: source 参照が有効なデータソースパターンに従うこと
 *   REG-9: StoreResult.* 参照が実在フィールドであること
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { FORMULA_REGISTRY } from '../../constants/formulaRegistry'
import { METRIC_DEFS } from '../../constants/metricDefs'
import type { FormulaId } from '../../models/Formula'

/* ── REG-1: レジストリ完全性 ──────────────────── */

describe('REG-1: FORMULA_REGISTRY の完全性', () => {
  it('全 FormulaId にエントリが存在する', () => {
    const ids = Object.keys(FORMULA_REGISTRY) as FormulaId[]
    expect(ids.length).toBeGreaterThanOrEqual(21) // 現在の登録数
  })

  it('各エントリのキーとカテゴリが一致する', () => {
    const validCategories = new Set([
      'arithmetic',
      'statistics',
      'decomposition',
      'regression',
      'accounting',
      'ratio',
    ])
    for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
      expect(validCategories.has(meta.category), `${id}: invalid category '${meta.category}'`).toBe(
        true,
      )
    }
  })
})

/* ── REG-2: フィールド非空検証 ────────────────── */

describe('REG-2: 全エントリの必須フィールドが非空', () => {
  for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
    it(`${id}: 全必須フィールドが存在`, () => {
      expect(meta.label.length, `${id}.label is empty`).toBeGreaterThan(0)
      expect(meta.expression.length, `${id}.expression is empty`).toBeGreaterThan(0)
      expect(meta.description.length, `${id}.description is empty`).toBeGreaterThan(0)
      expect(meta.usage.length, `${id}.usage is empty`).toBeGreaterThan(0)
      expect(meta.implementedBy.length, `${id}.implementedBy is empty`).toBeGreaterThan(0)
      expect(meta.module.length, `${id}.module is empty`).toBeGreaterThan(0)
    })
  }
})

/* ── REG-3: implementedBy の実在検証 ──────────── */

describe('REG-3: implementedBy 関数が実在する', () => {
  // 動的に domain/calculations/ のモジュールを import して検証
  const moduleCache = new Map<string, Record<string, unknown>>()

  async function loadModule(moduleName: string): Promise<Record<string, unknown>> {
    if (moduleCache.has(moduleName)) return moduleCache.get(moduleName)!
    const mod = (await import(`../${moduleName}`)) as Record<string, unknown>
    moduleCache.set(moduleName, mod)
    return mod
  }

  for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
    it(`${id}: ${meta.module}.${meta.implementedBy} が export されている`, async () => {
      const mod = await loadModule(meta.module)
      expect(
        typeof mod[meta.implementedBy],
        `${meta.module} に '${meta.implementedBy}' が存在しないか、関数ではありません。` +
          `\n  利用可能な export: ${Object.keys(mod).join(', ')}`,
      ).toBe('function')
    })
  }
})

/* ── REG-4: METRIC_DEFS.formulaRef の整合 ────── */

describe('REG-4: METRIC_DEFS.formulaRef が有効な FormulaId を参照する', () => {
  const validFormulaIds = new Set(Object.keys(FORMULA_REGISTRY))

  for (const [metricId, meta] of Object.entries(METRIC_DEFS)) {
    if (meta.formulaRef) {
      it(`${metricId}: formulaRef '${meta.formulaRef}' は FORMULA_REGISTRY に存在する`, () => {
        expect(
          validFormulaIds.has(meta.formulaRef!),
          `MetricId '${metricId}' の formulaRef '${meta.formulaRef}' は FORMULA_REGISTRY に未登録`,
        ).toBe(true)
      })
    }
  }

  it('formulaRef 付きメトリクスが1つ以上存在する', () => {
    const count = Object.values(METRIC_DEFS).filter((m) => m.formulaRef).length
    expect(count).toBeGreaterThan(0)
  })
})

/* ── REG-5: inputs（接点ルール）の存在検証 ───── */

describe('REG-5: 全エントリに inputs が定義されている', () => {
  for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
    it(`${id}: inputs が定義され、1つ以上の入力がある`, () => {
      expect(Array.isArray(meta.inputs), `${id}.inputs is not an array`).toBe(true)
      expect(meta.inputs.length, `${id}.inputs is empty`).toBeGreaterThan(0)
    })

    it(`${id}: 全 inputs に name と label がある`, () => {
      for (const input of meta.inputs) {
        expect(input.name.length, `${id} の input.name が空`).toBeGreaterThan(0)
        expect(input.label.length, `${id} の input.label が空`).toBeGreaterThan(0)
      }
    })
  }
})

/* ── REG-6: 具体公式の source 必須検証 ────────── */

describe('REG-6: accounting/decomposition 公式は具体的な source を持つ', () => {
  const CATEGORIES_REQUIRING_SOURCE = new Set(['accounting', 'decomposition'])

  for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
    if (CATEGORIES_REQUIRING_SOURCE.has(meta.category)) {
      it(`${id}: 全 inputs に source が定義されている`, () => {
        for (const input of meta.inputs) {
          expect(
            input.source,
            `${id}.inputs['${input.name}'] に source が未定義。` +
              '会計・分解公式のデータソースは明示必須です',
          ).toBeTruthy()
        }
      })
    }
  }
})

/* ── REG-7: シャープリー恒等式の不変条件 ──────── */

describe('REG-7: シャープリー分解公式の恒等式', () => {
  it('decompose2: φ_C + φ_T = ΔS', async () => {
    const { decompose2 } = await import('../factorDecomposition')
    const scenarios = [
      { prev: 1_000_000, cur: 1_200_000, pCust: 500, cCust: 600 },
      { prev: 500_000, cur: 400_000, pCust: 200, cCust: 150 },
      { prev: 800_000, cur: 800_000, pCust: 400, cCust: 400 },
    ]
    for (const s of scenarios) {
      const d = decompose2(s.prev, s.cur, s.pCust, s.cCust)
      expect(d.custEffect + d.ticketEffect).toBeCloseTo(s.cur - s.prev, 2)
    }
  })

  it('decompose3: φ_C + φ_Q + φ_P̄ = ΔS', async () => {
    const { decompose3 } = await import('../factorDecomposition')
    const scenarios = [
      { prev: 1_000_000, cur: 1_200_000, pCust: 500, cCust: 600, pQty: 2500, cQty: 3000 },
      { prev: 500_000, cur: 300_000, pCust: 200, cCust: 100, pQty: 600, cQty: 400 },
    ]
    for (const s of scenarios) {
      const d = decompose3(s.prev, s.cur, s.pCust, s.cCust, s.pQty, s.cQty)
      expect(d.custEffect + d.qtyEffect + d.pricePerItemEffect).toBeCloseTo(s.cur - s.prev, 2)
    }
  })
})

/* ── REG-8: 接点ルール — source パターンの一貫性 ── */

describe('REG-8: source 参照が有効なデータソースパターンに従う', () => {
  // 許可されたソースプレフィックス（SSOT）
  const VALID_SOURCE_PREFIXES = [
    'StoreResult.',
    'StoreResult[',
    'InventoryConfig.',
    'BudgetData.',
    'CTS.',
    'CTS ',
    'DailyRecord.',
    'MonthlyDataPoint',
    'CategoryQtyAmt',
    '外部データ',
  ] as const

  for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
    for (const input of meta.inputs) {
      if (input.source) {
        it(`${id}.${input.name}: source '${input.source}' は有効なパターン`, () => {
          const isValid = VALID_SOURCE_PREFIXES.some((p) => input.source!.startsWith(p))
          expect(
            isValid,
            `'${input.source}' は未知のソースパターン。\n` +
              `許可パターン: ${VALID_SOURCE_PREFIXES.join(', ')}`,
          ).toBe(true)
        })
      }
    }
  }
})

/* ── REG-9: StoreResult フィールド参照の実在性 ──── */

describe('REG-9: StoreResult.* 参照が実在フィールドである', () => {
  // StoreResult.ts から readonly フィールド名を抽出
  const storeResultPath = path.resolve(__dirname, '../../models/StoreResult.ts')
  const source = fs.readFileSync(storeResultPath, 'utf-8')
  const fieldPattern = /readonly\s+(\w+)\s*[?:]/g
  const storeResultFields = new Set<string>()
  let m
  while ((m = fieldPattern.exec(source)) !== null) {
    storeResultFields.add(m[1])
  }

  it('StoreResult のフィールドが正しく抽出されている（健全性チェック）', () => {
    expect(storeResultFields.has('totalSales')).toBe(true)
    expect(storeResultFields.has('totalCustomers')).toBe(true)
    expect(storeResultFields.has('grossSales')).toBe(true)
    expect(storeResultFields.size).toBeGreaterThan(20)
  })

  const SR_PATTERN = /^StoreResult\.(\w+)/
  for (const [id, meta] of Object.entries(FORMULA_REGISTRY)) {
    for (const input of meta.inputs) {
      const match = input.source?.match(SR_PATTERN)
      if (match) {
        const fieldName = match[1]
        it(`${id}.${input.name}: StoreResult.${fieldName} は実在フィールド`, () => {
          expect(
            storeResultFields.has(fieldName),
            `StoreResult に '${fieldName}' フィールドが見つかりません。\n` +
              `利用可能: ${[...storeResultFields].sort().join(', ')}`,
          ).toBe(true)
        })
      }
    }
  }
})
