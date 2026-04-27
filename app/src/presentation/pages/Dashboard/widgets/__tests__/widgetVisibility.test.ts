/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { WIDGET_REGISTRY } from '../registry'
import { makeWidgetContext } from './widgetTestHelpers'

/** queryExecutor.isReady = true のモック */
const READY_EXECUTOR = { isReady: true, dataVersion: 1, execute: async () => null }

describe('ウィジェット isVisible', () => {
  const dataWidgetIds = [
    // 注: chart-category-analysis → chart-daily-sales に統合
    // 注: chart-timeslot-sales → IntegratedSalesChart ドリルダウンに統合
    'chart-timeslot-heatmap',
    // 注: chart-dept-hourly-pattern → IntegratedSalesChart 孫に統合
  ]

  // 注: chart-discount-breakdown → IntegratedSalesChart 売変モードに統合

  describe('DuckDB 依存ウィジェット', () => {
    it('DuckDB 未準備の場合は非表示', () => {
      const ctx = makeWidgetContext({
        queryExecutor: { isReady: false, dataVersion: 0, execute: async () => null },
      })

      for (const id of dataWidgetIds) {
        const widget = WIDGET_REGISTRY.find((w) => w.id === id)
        expect(widget?.isVisible).toBeDefined()
        expect(widget!.isVisible!(ctx)).toBe(false)
      }
    })

    it('DuckDB 準備完了の場合は表示', () => {
      const ctx = makeWidgetContext({
        queryExecutor: READY_EXECUTOR,
      })

      for (const id of dataWidgetIds) {
        const widget = WIDGET_REGISTRY.find((w) => w.id === id)
        expect(widget!.isVisible!(ctx)).toBe(true)
      }
    })
  })

  // 注: chart-timeslot-yoy-comparison → TimeSlotSalesChart「前年比較」タブに統合

  describe('店舗別時間帯比較ウィジェット', () => {
    it('単一店舗・DuckDB 未準備の場合は非表示', () => {
      const ctx = makeWidgetContext({
        queryExecutor: { isReady: false, dataVersion: 0, execute: async () => null },
        stores: new Map([['1', { id: '1', name: '店舗A', code: '0001' }]]),
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-store-timeslot-comparison')
      expect(widget!.isVisible!(ctx)).toBe(false)
    })

    it('複数店舗＋DuckDB 準備完了の場合は表示', () => {
      const ctx = makeWidgetContext({
        queryExecutor: READY_EXECUTOR,
        stores: new Map([
          ['1', { id: '1', name: '店舗A', code: '0001' }],
          ['2', { id: '2', name: '店舗B', code: '0002' }],
        ]),
      })
      const widget = WIDGET_REGISTRY.find((w) => w.id === 'chart-store-timeslot-comparison')
      expect(widget!.isVisible!(ctx)).toBe(true)
    })
  })

  // 注: 前年比較ウォーターフォール → IntegratedSalesChart「要因分析」タブに統合
  // 注: 売変内訳ウィジェット → IntegratedSalesChart 売変モードに統合

  describe('isVisible が未設定のウィジェットは常に表示', () => {
    it('通常ウィジェットには isVisible がない', () => {
      const nonDataWidgets = WIDGET_REGISTRY.filter(
        (w) =>
          !w.id.includes('category') &&
          !w.id.includes('timeslot') &&
          !w.id.includes('dept-hourly') &&
          !w.id.includes('store-timeslot') &&
          !w.id.includes('yoy') &&
          !w.id.includes('discount-breakdown') &&
          !w.id.includes('duckdb') &&
          !w.id.includes('dow-gap') &&
          !w.id.includes('budget-achievement'),
      )
      for (const w of nonDataWidgets) {
        expect(w.isVisible).toBeUndefined()
      }
    })
  })
})
