import { useState, useCallback } from 'react'
import { palette } from '@/presentation/theme/tokens'
import type { StorageDataType } from '@/domain/models/storeTypes'
import { transformCtsPreview, type PreviewRecord } from '@/application/hooks/useDataPreview'
import {
  RawDataSection,
  RawDataTitle,
  RawDataChipGroup,
  RawDataChip,
  RawDataTableWrap,
  RawTable,
  RawTh,
  RawTd,
  LoadingText,
} from './StorageManagementTab.styles'
import { STORE_DAY_TYPES, type MonthEntry, type LoadSliceFn } from './StorageDataViewers.types'
export type { MonthEntry, LoadSliceFn } from './StorageDataViewers.types'

// ─── Raw Data Viewer ────────────────────────────────────

export function RawDataViewer({
  year,
  month,
  summary,
  loadSlice,
}: {
  year: number
  month: number
  summary: MonthEntry['summary']
  loadSlice: LoadSliceFn
}) {
  const typesWithData = summary.filter(
    (s) => s.recordCount > 0 && STORE_DAY_TYPES.includes(s.dataType),
  )
  const [viewer, setViewer] = useState<{
    selectedType: StorageDataType | null
    rawData: Record<string, Record<string, unknown>> | null
    loading: boolean
  }>({ selectedType: null, rawData: null, loading: false })
  const { selectedType, rawData, loading } = viewer

  const handleSelectType = useCallback(
    async (dataType: StorageDataType) => {
      if (viewer.selectedType === dataType) {
        setViewer({ selectedType: null, rawData: null, loading: false })
        return
      }
      setViewer({ selectedType: dataType, rawData: null, loading: true })
      try {
        const data = await loadSlice<Record<string, Record<string, unknown>>>(year, month, dataType)
        setViewer((prev) => ({ ...prev, rawData: data, loading: false }))
      } catch {
        setViewer((prev) => ({ ...prev, rawData: null, loading: false }))
      }
    },
    [year, month, viewer.selectedType, loadSlice],
  )

  if (typesWithData.length === 0) return null

  // Build table from rawData
  const storeIds = rawData ? Object.keys(rawData).sort() : []
  const allDays = new Set<number>()
  if (rawData) {
    for (const days of Object.values(rawData)) {
      for (const dayStr of Object.keys(days)) {
        allDays.add(Number(dayStr))
      }
    }
  }
  const sortedDays = Array.from(allDays).sort((a, b) => a - b)

  const extractMainValue = (entry: unknown): number => {
    if (!entry || typeof entry !== 'object') return 0
    const e = entry as Record<string, unknown>
    // Try common value fields
    if (typeof e.sales === 'number') return e.sales
    if (typeof e.discount === 'number') return e.discount
    if (typeof e.price === 'number') return e.price
    if (typeof e.cost === 'number') return e.cost
    if (e.total && typeof e.total === 'object') {
      const t = e.total as Record<string, unknown>
      if (typeof t.price === 'number') return t.price
    }
    return 0
  }

  const fmt = (v: number) => (v === 0 ? '-' : v.toLocaleString('ja-JP'))

  return (
    <RawDataSection>
      <RawDataTitle>データ内容プレビュー</RawDataTitle>
      <RawDataChipGroup>
        {typesWithData.map((t) => (
          <RawDataChip
            key={t.dataType}
            $active={selectedType === t.dataType}
            onClick={() => handleSelectType(t.dataType)}
          >
            {t.label}
          </RawDataChip>
        ))}
      </RawDataChipGroup>

      {loading && <LoadingText>読み込み中...</LoadingText>}

      {selectedType && rawData && !loading && storeIds.length > 0 && (
        <RawDataTableWrap>
          <RawTable>
            <thead>
              <tr>
                <RawTh $sticky>日</RawTh>
                {storeIds.map((sid) => (
                  <RawTh key={sid}>{sid}</RawTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDays.map((day) => (
                <tr key={day}>
                  <RawTd $sticky>{day}</RawTd>
                  {storeIds.map((sid) => {
                    const val = extractMainValue(rawData[sid]?.[day])
                    return (
                      <RawTd key={sid} $zero={val === 0}>
                        {fmt(val)}
                      </RawTd>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </RawTable>
        </RawDataTableWrap>
      )}

      {selectedType && rawData && !loading && storeIds.length === 0 && (
        <LoadingText>データがありません</LoadingText>
      )}
    </RawDataSection>
  )
}

// ─── CTS Viewer ─────────────────────────────────────────

export function CTSViewer({
  year,
  month,
  dataType,
  label,
  loadSlice,
}: {
  year: number
  month: number
  dataType: StorageDataType
  label: string
  loadSlice: LoadSliceFn
}) {
  const [cts, setCts] = useState<{
    expanded: boolean
    records: readonly PreviewRecord[]
    loading: boolean
  }>({ expanded: false, records: [], loading: false })
  const { expanded, records, loading } = cts

  const handleToggle = useCallback(async () => {
    if (cts.expanded) {
      setCts((prev) => ({ ...prev, expanded: false }))
      return
    }
    setCts((prev) => ({ ...prev, expanded: true, loading: true }))
    try {
      const data = await loadSlice<{
        records: {
          day: number
          storeId: string
          department: { name: string }
          line: { name: string }
          klass: { name: string }
          totalAmount: number
          totalQuantity: number
        }[]
      }>(year, month, dataType)
      if (data?.records) {
        setCts((prev) => ({ ...prev, records: transformCtsPreview(data.records), loading: false }))
      } else {
        setCts((prev) => ({ ...prev, loading: false }))
      }
    } catch {
      setCts((prev) => ({ ...prev, records: [], loading: false }))
    }
  }, [year, month, dataType, cts.expanded, loadSlice])

  return (
    <div style={{ marginTop: 8 }}>
      <RawDataChip $active={expanded} onClick={handleToggle}>
        {label} プレビュー {expanded ? '(閉じる)' : '(表示)'}
      </RawDataChip>
      {expanded && loading && <LoadingText>読み込み中...</LoadingText>}
      {expanded && !loading && records.length > 0 && (
        <RawDataTableWrap style={{ marginTop: 8 }}>
          <RawTable>
            <thead>
              <tr>
                <RawTh>日</RawTh>
                <RawTh>店舗</RawTh>
                <RawTh>部門</RawTh>
                <RawTh>ライン</RawTh>
                <RawTh>クラス</RawTh>
                <RawTh>金額</RawTh>
                <RawTh>数量</RawTh>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <RawTd>{r.day}</RawTd>
                  <RawTd>{r.storeId}</RawTd>
                  <RawTd style={{ textAlign: 'left' }}>{r.dept}</RawTd>
                  <RawTd style={{ textAlign: 'left' }}>{r.line}</RawTd>
                  <RawTd style={{ textAlign: 'left' }}>{r.klass}</RawTd>
                  <RawTd $zero={r.amount === 0}>{r.amount.toLocaleString('ja-JP')}</RawTd>
                  <RawTd $zero={r.qty === 0}>{r.qty.toLocaleString('ja-JP')}</RawTd>
                </tr>
              ))}
              {records.length >= 200 && (
                <tr>
                  <RawTd colSpan={7} style={{ textAlign: 'center', color: palette.slate }}>
                    先頭200件のみ表示しています
                  </RawTd>
                </tr>
              )}
            </tbody>
          </RawTable>
        </RawDataTableWrap>
      )}
    </div>
  )
}
