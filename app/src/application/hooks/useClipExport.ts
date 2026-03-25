/**
 * useClipExport — クリップエクスポート hook
 *
 * presentation 層が application/usecases/clipExport/ を直接参照しないよう、
 * hook 経由でエクスポート機能を提供する（A3: Presentation は描画専用）。
 */
import { useCallback, useState } from 'react'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  categoryTimeRecordsHandler,
  type CategoryTimeRecordsInput,
} from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { DateRange } from '@/domain/models/CalendarDate'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
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
  readonly queryExecutor: QueryExecutor | null
  readonly selectedStoreIds: ReadonlySet<string>
  readonly comparisonScope: { readonly dowOffset: number } | null
}

interface ClipExportState {
  readonly isExporting: boolean
  readonly exportClip: () => Promise<void>
}

/** DateRange → CategoryTimeRecordsInput を構築する */
function buildCtsInput(
  range: DateRange,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): CategoryTimeRecordsInput {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds: storeIds.size > 0 ? [...storeIds] : undefined,
    isPrevYear,
  }
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
        queryExecutor,
        selectedStoreIds,
        comparisonScope,
      } = params

      const storeName = stores.get(storeKey)?.name ?? storeKey
      const curRange: DateRange = {
        from: { year, month, day: 1 },
        to: { year, month, day: daysInMonth },
      }
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month - 1, daysInMonth)
      const offsetMs = (comparisonScope?.dowOffset ?? 0) * 86400000
      const prevStartDate = new Date(startDate.getTime() + offsetMs)
      const prevEndDate = new Date(endDate.getTime() + offsetMs)
      const prevRange: DateRange = {
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

      let curCts: readonly CategoryTimeSalesRecord[] = []
      let prevCts: readonly CategoryTimeSalesRecord[] = []

      if (queryExecutor?.isReady) {
        try {
          const curResult = await queryExecutor.execute(
            categoryTimeRecordsHandler,
            buildCtsInput(curRange, selectedStoreIds),
          )
          curCts = curResult?.records ?? []
        } catch {
          // CTS 取得失敗時は空で継続
        }
        try {
          const prevResult = await queryExecutor.execute(
            categoryTimeRecordsHandler,
            buildCtsInput(prevRange, selectedStoreIds, true),
          )
          prevCts = prevResult?.records ?? []
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
