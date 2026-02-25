import { describe, it, expect } from 'vitest'
import { WIDGET_REGISTRY } from '../registry'
import { makeWidgetContext } from './widgetTestHelpers'
import { EMPTY_CTS_INDEX } from '@/domain/models'
import type { CategoryTimeSalesIndex } from '@/domain/models'

/** recordCount だけ設定した最小限の CTS インデックス */
function makeCtsIndex(recordCount: number): CategoryTimeSalesIndex {
  return { ...EMPTY_CTS_INDEX, recordCount }
}

describe('ウィジェット isVisible', () => {
  const dataWidgetIds = [
    'chart-category-hierarchy-explorer',
    'chart-timeslot-sales',
    'chart-timeslot-heatmap',
    'chart-dept-hourly-pattern',
  ]

  describe('分類別時間帯ウィジェット（ctsIndex 依存）', () => {
    it('データなしの場合は非表示', () => {
      const ctx = makeWidgetContext({ ctsIndex: EMPTY_CTS_INDEX })

      for (const id of dataWidgetIds) {
        const widget = WIDGET_REGISTRY.find((w) => w.id === id)
        expect(widget?.isVisible).toBeDefined()
        expect(widget!.isVisible!(ctx)).toBe(false)
      }
    })

    it('データありの場合は表示', () => {
      const ctx = makeWidgetContext({
        ctsIndex: makeCtsIndex(1),
      })

      for (const id of dataWidgetIds) {
        const widget = WIDGET_REGISTRY.find((w) => w.id === id)
        expect(widget!.isVisible!(ctx)).toBe(true)
      }
    })
  })

  // 注: chart-timeslot-yoy-comparison → TimeSlotSalesChart「前年比較」タブに統合

  describe('店舗別時間帯比較ウィジェット', () => {
    it('単一店舗・データなしの場合は非表示', () => {
      const ctx = makeWidgetContext({
        ctsIndex: EMPTY_CTS_INDEX,
        stores: new Map([['1', { id: '1', name: '店舗A', code: '0001' }]]),
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-store-timeslot-comparison')
      expect(widget!.isVisible!(ctx)).toBe(false)
    })

    it('複数店舗＋データありの場合は表示', () => {
      const ctx = makeWidgetContext({
        ctsIndex: makeCtsIndex(1),
        stores: new Map([
          ['1', { id: '1', name: '店舗A', code: '0001' }],
          ['2', { id: '2', name: '店舗B', code: '0002' }],
        ]),
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-store-timeslot-comparison')
      expect(widget!.isVisible!(ctx)).toBe(true)
    })
  })

  describe('前年比較ウォーターフォールウィジェット', () => {
    it('前年データなしの場合は非表示', () => {
      const ctx = makeWidgetContext({
        prevYear: { hasPrevYear: false, daily: new Map(), totalSales: 0, totalDiscount: 0, totalCustomers: 0 },
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'analysis-yoy-waterfall')
      expect(widget?.isVisible).toBeDefined()
      expect(widget!.isVisible!(ctx)).toBe(false)
    })

    it('前年データありの場合は表示', () => {
      const ctx = makeWidgetContext({
        prevYear: { hasPrevYear: true, daily: new Map(), totalSales: 100000, totalDiscount: 0, totalCustomers: 50 },
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'analysis-yoy-waterfall')
      expect(widget!.isVisible!(ctx)).toBe(true)
    })
  })

  describe('isVisible が未設定のウィジェットは常に表示', () => {
    it('通常ウィジェットには isVisible がない', () => {
      const nonDataWidgets = WIDGET_REGISTRY.filter(
        (w) => !w.id.includes('category') && !w.id.includes('timeslot') && !w.id.includes('dept-hourly') && !w.id.includes('store-timeslot') && !w.id.includes('yoy'),
      )
      for (const w of nonDataWidgets) {
        expect(w.isVisible).toBeUndefined()
      }
    })
  })
})
