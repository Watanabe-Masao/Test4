/**
 * conditionPanelYoYDailyModal — buildCumulativeYoYData test
 *
 * 検証対象:
 * - getCurrent / getPrev 関数で値を引き、日別累計を構築するジェネリック
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildCumulativeYoYData } from '../conditionPanelYoYDailyModal'

type Row = { day: number; cur: number; prev: number }

describe('buildCumulativeYoYData', () => {
  const rows: readonly Row[] = [
    { day: 1, cur: 100, prev: 80 },
    { day: 2, cur: 200, prev: 150 },
    { day: 3, cur: 300, prev: 220 },
  ]

  it('空入力で空配列', () => {
    expect(
      buildCumulativeYoYData<Row>(
        [],
        (r) => r.cur,
        (r) => r.prev,
      ),
    ).toEqual([])
  })

  it('日別累計を昇順で構築する', () => {
    const result = buildCumulativeYoYData(
      rows,
      (r) => r.cur,
      (r) => r.prev,
    )
    expect(result).toEqual([
      { day: 1, cumCurrent: 100, cumPrev: 80 },
      { day: 2, cumCurrent: 300, cumPrev: 230 },
      { day: 3, cumCurrent: 600, cumPrev: 450 },
    ])
  })

  it('getter で値を切替可能（任意フィールド対応）', () => {
    const result = buildCumulativeYoYData(
      rows,
      (r) => r.cur * 2,
      () => 0,
    )
    expect(result[2].cumCurrent).toBe(1200) // (100+200+300) * 2
    expect(result[2].cumPrev).toBe(0)
  })

  it('day は入力順にそのまま写す（ソートなし）', () => {
    const unsorted: readonly Row[] = [
      { day: 5, cur: 10, prev: 5 },
      { day: 2, cur: 20, prev: 10 },
      { day: 8, cur: 30, prev: 15 },
    ]
    const result = buildCumulativeYoYData(
      unsorted,
      (r) => r.cur,
      (r) => r.prev,
    )
    expect(result.map((r) => r.day)).toEqual([5, 2, 8])
  })

  it('負の値も累計される', () => {
    const r = buildCumulativeYoYData(
      [
        { day: 1, cur: 10, prev: 20 },
        { day: 2, cur: -5, prev: -10 },
      ],
      (x) => x.cur,
      (x) => x.prev,
    )
    expect(r[1]).toEqual({ day: 2, cumCurrent: 5, cumPrev: 10 })
  })
})
