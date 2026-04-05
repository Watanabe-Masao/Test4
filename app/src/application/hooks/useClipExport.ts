/**
 * useClipExport — クリップエクスポート hook
 *
 * presentation 層が application/usecases/clipExport/ を直接参照しないよう、
 * hook 経由でエクスポート機能を提供する（A3: Presentation は描画専用）。
 *
 * CTS データの取得は useClipExportPlan に委譲し、
 * queryExecutor.execute() の直接呼び出しを廃止した。
 */
import { useCallback, useMemo, useState } from 'react'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DateRange } from '@/domain/models/CalendarDate'
import { buildClipBundle } from '@/application/usecases/clipExport/buildClipBundle'
import { downloadClipHtml } from '@/application/usecases/clipExport/downloadClipHtml'
import { useClipExportPlan } from '@/features/clip-export'

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
  readonly exportClip: () => void
}

export function useClipExport(params: ClipExportParams): ClipExportState {
  const [isExporting, setIsExporting] = useState(false)
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

  // 日付範囲を hook レベルで計算
  const { curDateRange, prevDateRange } = useMemo(() => {
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
    return { curDateRange: curRange, prevDateRange: prevRange }
  }, [year, month, daysInMonth, comparisonScope])

  // CTS データを plan 経由で事前取得
  const { currentCtsRecords, prevCtsRecords } = useClipExportPlan(queryExecutor, {
    curDateRange,
    prevDateRange,
    selectedStoreIds,
  })

  const exportClip = useCallback(() => {
    setIsExporting(true)
    try {
      const storeName = stores.get(storeKey)?.name ?? storeKey

      const bundle = buildClipBundle({
        result,
        prevYear,
        year,
        month,
        storeName,
        ctsRecords: currentCtsRecords,
        ctsPrevRecords: prevCtsRecords,
      })
      downloadClipHtml(bundle)
    } finally {
      setIsExporting(false)
    }
  }, [result, prevYear, year, month, storeKey, stores, currentCtsRecords, prevCtsRecords])

  return { isExporting, exportClip }
}
