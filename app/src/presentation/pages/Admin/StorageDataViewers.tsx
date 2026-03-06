import { useState, useCallback } from 'react'
import { palette } from '@/presentation/theme/tokens'
import type { StorageDataType } from '@/domain/models'
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

// ─── Types ──────────────────────────────────────────────

export interface MonthEntry {
  year: number
  month: number
  summary: { dataType: StorageDataType; label: string; recordCount: number }[]
  totalRecords: number
  dataTypeCount: number
}

// StoreDayRecord 型のデータ種別
export const STORE_DAY_TYPES = [
  'purchase',
  'sales',
  'discount',
  'interStoreIn',
  'interStoreOut',
  'flowers',
  'directProduce',
  'consumables',
]

// ─── LoadSlice type ─────────────────────────────────────

export type LoadSliceFn = <T>(
  year: number,
  month: number,
  dataType: StorageDataType,
) => Promise<T | null>

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
  const [selectedType, setSelectedType] = useState<StorageDataType | null>(null)
  const [rawData, setRawData] = useState<Record<string, Record<string, unknown>> | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelectType = useCallback(
    async (dataType: StorageDataType) => {
      if (selectedType === dataType) {
        setSelectedType(null)
        setRawData(null)
        return
      }
      setSelectedType(dataType)
      setLoading(true)
      try {
        const data = await loadSlice<Record<string, Record<string, unknown>>>(year, month, dataType)
        setRawData(data)
      } catch {
        setRawData(null)
      } finally {
        setLoading(false)
      }
    },
    [year, month, selectedType, loadSlice],
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
  const [expanded, setExpanded] = useState(false)
  const [records, setRecords] = useState<readonly PreviewRecord[]>([])
  const [loading, setLoading] = useState(false)

  const handleToggle = useCallback(async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    setLoading(true)
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
        setRecords(transformCtsPreview(data.records))
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [year, month, dataType, expanded, loadSlice])

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
