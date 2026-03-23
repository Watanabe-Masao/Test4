/**
 * useClipExport — クリップエクスポート hook
 *
 * presentation 層が application/usecases/clipExport/ を直接参照しないよう、
 * hook 経由でエクスポート機能を提供する（A3: Presentation は描画専用）。
 */
import { useCallback, useState } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'
import { fetchCategoryTimeRecords } from '@/application/hooks/duckdb'
import { buildClipBundle } from '@/application/usecases/clipExport/buildClipBundle'
import { downloadClipHtml } from '@/application/usecases/clipExport/downloadClipHtml'

interface ClipExportParams {
  readonly result: StoreResult
  readonly prevYear: PrevYearData
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
  readonly storeKey: string
  readonly stores: ReadonlyMap<string, { name: string }>
  readonly duckConn: AsyncDuckDBConnection | null
  readonly selectedStoreIds: ReadonlySet<string>
  readonly comparisonFrame: { readonly dowOffset: number }
}

interface ClipExportState {
  readonly isExporting: boolean
  readonly exportClip: () => Promise<void>
}

export function useClipExport(params: ClipExportParams): ClipExportState {
  const [isExporting, setIsExporting] = useState(false)

  const exportClip = useCallback(async () => {
    setIsExporting(true)
    try {
      const {
        result,
        prevYear,
        year,
        month,
        daysInMonth,
        storeKey,
        stores,
        duckConn,
        selectedStoreIds,
        comparisonFrame,
      } = params

      const storeName = stores.get(storeKey)?.name ?? storeKey
      const curRange = { from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } }
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month - 1, daysInMonth)
      const offsetMs = comparisonFrame.dowOffset * 86400000
      const prevStartDate = new Date(startDate.getTime() + offsetMs)
      const prevEndDate = new Date(endDate.getTime() + offsetMs)
      const prevRange = {
        from: {
          year: prevStartDate.getFullYear(),
          month: prevStartDate.getMonth() + 1,
          day: prevStartDate.getDate(),
        },
        to: {
          year: prevEndDate.getFullYear(),
          month: prevEndDate.getMonth() + 1,
          day: prevEndDate.getDate(),
        },
      }

      let curCts: Awaited<ReturnType<typeof fetchCategoryTimeRecords>> = []
      let prevCts: Awaited<ReturnType<typeof fetchCategoryTimeRecords>> = []

      if (duckConn) {
        try {
          curCts = await fetchCategoryTimeRecords(duckConn, curRange, selectedStoreIds)
        } catch {
          // CTS 取得失敗時は空で継続
        }
        try {
          prevCts = await fetchCategoryTimeRecords(duckConn, prevRange, selectedStoreIds, true)
        } catch {
          // CTS 取得失敗時は空で継続
        }
      }

      const bundle = buildClipBundle({
        result,
        prevYear,
        year,
        month,
        storeName,
        ctsRecords: curCts,
        ctsPrevRecords: prevCts,
      })
      downloadClipHtml(bundle)
    } finally {
      setIsExporting(false)
    }
  }, [params])

  return { isExporting, exportClip }
}
