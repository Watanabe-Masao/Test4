import { describe, it, expect } from 'vitest'
import { WIDGET_REGISTRY } from '../registry'
import { makeWidgetContext } from './widgetTestHelpers'

describe('ウィジェット isVisible', () => {
  const dataWidgetIds = [
    'chart-category-hierarchy-explorer',
    'chart-timeslot-sales',
    'chart-category-sales-breakdown',
    'chart-timeslot-heatmap',
    'chart-dept-hourly-pattern',
  ]

  describe('分類別時間帯ウィジェット（categoryTimeSales 依存）', () => {
    it('データなしの場合は非表示', () => {
      const ctx = makeWidgetContext({ categoryTimeSales: { records: [] } })

      for (const id of dataWidgetIds) {
        const widget = WIDGET_REGISTRY.find((w) => w.id === id)
        expect(widget?.isVisible).toBeDefined()
        expect(widget!.isVisible!(ctx)).toBe(false)
      }
    })

    it('データありの場合は表示', () => {
      const ctx = makeWidgetContext({
        categoryTimeSales: {
          records: [{
            day: 1,
            storeId: '1',
            department: { code: '01', name: '食品' },
            line: { code: '001', name: 'ライン' },
            klass: { code: '0001', name: 'クラス' },
            timeSlots: [{ hour: 10, quantity: 5, amount: 10000 }],
            totalQuantity: 5,
            totalAmount: 10000,
          }],
        },
      })

      for (const id of dataWidgetIds) {
        const widget = WIDGET_REGISTRY.find((w) => w.id === id)
        expect(widget!.isVisible!(ctx)).toBe(true)
      }
    })
  })

  describe('前年比較ウィジェット', () => {
    it('前年データなしの場合は非表示', () => {
      const ctx = makeWidgetContext({
        prevYearCategoryTimeSales: { hasPrevYear: false, records: [], offset: 0 },
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-timeslot-yoy-comparison')
      expect(widget?.isVisible).toBeDefined()
      expect(widget!.isVisible!(ctx)).toBe(false)
    })

    it('前年データありの場合は表示', () => {
      const ctx = makeWidgetContext({
        prevYearCategoryTimeSales: { hasPrevYear: true, records: [], offset: 1 },
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-timeslot-yoy-comparison')
      expect(widget!.isVisible!(ctx)).toBe(true)
    })
  })

  describe('店舗別時間帯比較ウィジェット', () => {
    it('単一店舗・データなしの場合は非表示', () => {
      const ctx = makeWidgetContext({
        categoryTimeSales: { records: [] },
        stores: new Map([['1', { id: '1', name: '店舗A', code: '0001' }]]),
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-store-timeslot-comparison')
      expect(widget!.isVisible!(ctx)).toBe(false)
    })

    it('複数店舗＋データありの場合は表示', () => {
      const ctx = makeWidgetContext({
        categoryTimeSales: {
          records: [{
            day: 1, storeId: '1',
            department: { code: '01', name: '食品' },
            line: { code: '001', name: 'ライン' },
            klass: { code: '0001', name: 'クラス' },
            timeSlots: [{ hour: 10, quantity: 5, amount: 10000 }],
            totalQuantity: 5, totalAmount: 10000,
          }],
        },
        stores: new Map([
          ['1', { id: '1', name: '店舗A', code: '0001' }],
          ['2', { id: '2', name: '店舗B', code: '0002' }],
        ]),
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-store-timeslot-comparison')
      expect(widget!.isVisible!(ctx)).toBe(true)
    })
  })

  describe('isVisible が未設定のウィジェットは常に表示', () => {
    it('通常ウィジェットには isVisible がない', () => {
      const nonDataWidgets = WIDGET_REGISTRY.filter(
        (w) => !w.id.includes('category') && !w.id.includes('timeslot') && !w.id.includes('dept-hourly') && !w.id.includes('store-timeslot'),
      )
      for (const w of nonDataWidgets) {
        expect(w.isVisible).toBeUndefined()
      }
    })
  })
})
