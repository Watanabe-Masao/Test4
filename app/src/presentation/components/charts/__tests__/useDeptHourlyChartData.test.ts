/**
 * useDeptHourlyChartData は React hook なので直接テストしない。
 * このファイルから再エクスポートされる純粋な定数 TOP_N_OPTIONS のみ検証する。
 * 同ディレクトリの純粋ロジック DeptHourlyChartLogic.ts の helper も併せて検証する。
 */
import { describe, it, expect } from 'vitest'
import { TOP_N_OPTIONS } from '../useDeptHourlyChartData'
import { buildDeptHourlyData, detectCannibalization, type DeptInfo } from '../DeptHourlyChartLogic'
import type { CategoryHourlyRow } from '@/application/hooks/duckdb'

describe('useDeptHourlyChartData re-exports', () => {
  describe('TOP_N_OPTIONS', () => {
    it('昇順ソートされた 4 値の配列である', () => {
      expect(TOP_N_OPTIONS).toEqual([3, 5, 7, 10])
    })

    it('全て正の整数である', () => {
      for (const n of TOP_N_OPTIONS) {
        expect(Number.isInteger(n)).toBe(true)
        expect(n).toBeGreaterThan(0)
      }
    })
  })
})

const mkRow = (code: string, name: string, hour: number, amount: number): CategoryHourlyRow =>
  ({
    code,
    name,
    hour,
    amount,
  }) as unknown as CategoryHourlyRow

describe('buildDeptHourlyData', () => {
  it('topN で指定した部門までのみチャートデータに含める', () => {
    const rows: CategoryHourlyRow[] = [
      mkRow('D1', '鮮魚', 10, 500),
      mkRow('D1', '鮮魚', 11, 500),
      mkRow('D2', '青果', 10, 400),
      mkRow('D2', '青果', 11, 400),
      mkRow('D3', '精肉', 10, 100),
      mkRow('D3', '精肉', 11, 100),
    ]
    const result = buildDeptHourlyData(rows, 2, new Set(), 10, 11)

    expect(result.departments).toHaveLength(2)
    expect(result.departments[0].code).toBe('D1')
    expect(result.departments[0].totalAmount).toBe(1000)
    expect(result.departments[1].code).toBe('D2')
    expect(result.departments[1].totalAmount).toBe(800)
    expect(result.chartData).toHaveLength(2)
    expect(result.chartData[0].hour).toBe('10時')
    expect(result.chartData[0].hourNum).toBe(10)
    expect(result.chartData[0].dept_D1).toBe(500)
    expect(result.chartData[0].dept_D2).toBe(400)
  })

  it('hourMin..hourMax 範囲外の行は除外される', () => {
    const rows: CategoryHourlyRow[] = [
      mkRow('D1', '鮮魚', 8, 100), // 範囲外
      mkRow('D1', '鮮魚', 10, 200),
      mkRow('D1', '鮮魚', 15, 300), // 範囲外
    ]
    const result = buildDeptHourlyData(rows, 5, new Set(), 10, 12)
    // 10,11,12 の 3 hour 分のチャートデータが作られる
    expect(result.chartData).toHaveLength(3)
    expect(result.chartData[0].dept_D1).toBe(200)
    expect(result.chartData[1].dept_D1).toBe(0)
    expect(result.chartData[2].dept_D1).toBe(0)
  })

  it('activeDepts が非空の場合、含まれない部門は 0 で描画される', () => {
    const rows: CategoryHourlyRow[] = [mkRow('D1', '鮮魚', 10, 500), mkRow('D2', '青果', 10, 400)]
    const result = buildDeptHourlyData(rows, 5, new Set(['D1']), 10, 10)
    expect(result.chartData[0].dept_D1).toBe(500)
    expect(result.chartData[0].dept_D2).toBe(0)
  })

  it('空の入力では empty departments と空の chartData を返す', () => {
    const result = buildDeptHourlyData([], 5, new Set(), 10, 12)
    expect(result.departments).toEqual([])
    expect(result.chartData).toHaveLength(3)
    // データ無しでも hour slot は生成されている
    expect(result.chartData[0].hour).toBe('10時')
  })
})

describe('detectCannibalization', () => {
  it('部門が 2 未満ならカニバリ検出は空配列', () => {
    const depts: DeptInfo[] = [{ code: 'D1', name: '鮮魚', totalAmount: 100, color: '#000' }]
    const patterns = new Map<string, number[]>([['D1', [1, 2, 3]]])
    expect(detectCannibalization(depts, patterns)).toEqual([])
  })

  it('強い負相関（r < -0.3）のペアを検出する', () => {
    const depts: DeptInfo[] = [
      { code: 'A', name: 'A部門', totalAmount: 100, color: '#000' },
      { code: 'B', name: 'B部門', totalAmount: 100, color: '#111' },
    ]
    // 完全な負相関
    const patterns = new Map<string, number[]>([
      ['A', [1, 2, 3, 4, 5]],
      ['B', [5, 4, 3, 2, 1]],
    ])
    const result = detectCannibalization(depts, patterns)
    expect(result).toHaveLength(1)
    expect(result[0].deptA).toBe('A部門')
    expect(result[0].deptB).toBe('B部門')
    expect(result[0].r).toBeLessThan(-0.3)
  })

  it('正相関や微弱な相関は検出しない', () => {
    const depts: DeptInfo[] = [
      { code: 'A', name: 'A部門', totalAmount: 100, color: '#000' },
      { code: 'B', name: 'B部門', totalAmount: 100, color: '#111' },
    ]
    const patterns = new Map<string, number[]>([
      ['A', [1, 2, 3, 4, 5]],
      ['B', [2, 4, 6, 8, 10]],
    ])
    expect(detectCannibalization(depts, patterns)).toEqual([])
  })

  it('3 未満のデータポイントしか無いペアは除外される', () => {
    const depts: DeptInfo[] = [
      { code: 'A', name: 'A部門', totalAmount: 100, color: '#000' },
      { code: 'B', name: 'B部門', totalAmount: 100, color: '#111' },
    ]
    const patterns = new Map<string, number[]>([
      ['A', [1, 2]],
      ['B', [2, 1]],
    ])
    expect(detectCannibalization(depts, patterns)).toEqual([])
  })
})
