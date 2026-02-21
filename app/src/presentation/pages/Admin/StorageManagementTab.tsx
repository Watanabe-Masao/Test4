import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { useStorageAdmin } from '@/application/hooks'

// ─── Styled Components ──────────────────────────────────

const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const MonthCardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const MonthCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

const MonthCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const MonthLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

const MonthTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const MonthBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  transition: transform 0.2s;
  transform: ${({ $expanded }) => ($expanded ? 'rotate(90deg)' : 'rotate(0deg)')};
`

const DeleteButton = styled.button`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.palette.danger ?? '#ef4444'};
  background: transparent;
  color: ${({ theme }) => theme.colors.palette.danger ?? '#ef4444'};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.palette.danger ?? '#ef4444'};
    color: #fff;
  }
`

const DetailPanel = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
`

const DataTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
`

const DataTypeRow = styled.div<{ $hasData: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $hasData, theme }) =>
    $hasData ? `${theme.colors.palette.primary}08` : 'transparent'};
  border: 1px solid ${({ $hasData, theme }) =>
    $hasData ? `${theme.colors.palette.primary}20` : theme.colors.border};
`

const DataTypeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
`

const DataTypeCount = styled.span<{ $hasData: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $hasData, theme }) =>
    $hasData ? theme.colors.palette.primary : theme.colors.text4};
`

const RawDataSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.spacing[4]};
`

const RawDataTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const RawDataChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const RawDataChip = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.colors.text3};
  font-size: 11px;
  border-radius: ${({ theme }) => theme.radii.pill};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const RawDataTableWrap = styled.div`
  overflow-x: auto;
  max-height: 400px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const RawTable = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const RawTh = styled.th<{ $sticky?: boolean }>`
  position: sticky;
  top: 0;
  z-index: ${({ $sticky }) => ($sticky ? 6 : 5)};
  ${({ $sticky }) => $sticky && 'left: 0;'}
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-align: right;
  white-space: nowrap;
`

const RawTd = styled.td<{ $sticky?: boolean; $zero?: boolean }>`
  ${({ $sticky }) => $sticky && 'position: sticky; left: 0; z-index: 3;'}
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $sticky, theme }) => ($sticky ? theme.colors.bg3 : 'transparent')};
  text-align: ${({ $sticky }) => ($sticky ? 'center' : 'right')};
  color: ${({ $zero, theme }) => ($zero ? theme.colors.text4 : theme.colors.text)};
  white-space: nowrap;
`

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ConfirmDialog = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 400px;
  width: 90%;
`

const ConfirmTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const ConfirmMessage = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`

const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
`

const CancelButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.bg3}; }
`

const ConfirmDeleteButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: none;
  background: ${({ theme }) => theme.colors.palette.danger ?? '#ef4444'};
  color: #fff;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  &:hover { opacity: 0.9; }
`

const LoadingText = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`

// ─── Types ──────────────────────────────────────────────

interface MonthEntry {
  year: number
  month: number
  summary: { dataType: string; label: string; recordCount: number }[]
  totalRecords: number
  dataTypeCount: number
}

// StoreDayRecord 型のデータ種別
const STORE_DAY_TYPES = [
  'purchase', 'sales', 'discount', 'prevYearSales', 'prevYearDiscount',
  'interStoreIn', 'interStoreOut', 'flowers', 'directProduce', 'consumables',
]

// ─── Raw Data Viewer ────────────────────────────────────

function RawDataViewer({ year, month, summary, loadSlice }: { year: number; month: number; summary: MonthEntry['summary']; loadSlice: <T>(year: number, month: number, dataType: string) => Promise<T | null> }) {
  const typesWithData = summary.filter((s) => s.recordCount > 0 && STORE_DAY_TYPES.includes(s.dataType))
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [rawData, setRawData] = useState<Record<string, Record<string, unknown>> | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelectType = useCallback(async (dataType: string) => {
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
  }, [year, month, selectedType, loadSlice])

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
                      <RawTd key={sid} $zero={val === 0}>{fmt(val)}</RawTd>
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

function CTSViewer({ year, month, dataType, label, loadSlice }: { year: number; month: number; dataType: string; label: string; loadSlice: <T>(year: number, month: number, dataType: string) => Promise<T | null> }) {
  const [expanded, setExpanded] = useState(false)
  const [records, setRecords] = useState<{ day: number; storeId: string; dept: string; line: string; klass: string; amount: number; qty: number }[]>([])
  const [loading, setLoading] = useState(false)

  const handleToggle = useCallback(async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    setLoading(true)
    try {
      const data = await loadSlice<{ records: { day: number; storeId: string; department: { name: string }; line: { name: string }; klass: { name: string }; totalAmount: number; totalQuantity: number }[] }>(year, month, dataType)
      if (data?.records) {
        setRecords(data.records.slice(0, 200).map((r) => ({
          day: r.day,
          storeId: r.storeId,
          dept: r.department.name,
          line: r.line.name,
          klass: r.klass.name,
          amount: r.totalAmount,
          qty: r.totalQuantity,
        })))
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
                  <RawTd colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
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

// ─── Main Component ─────────────────────────────────────

export function StorageManagementTab() {
  const { listMonths, getDataSummary, deleteMonth, loadSlice } = useStorageAdmin()
  const [months, setMonths] = useState<MonthEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{ year: number; month: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const storedMonths = await listMonths()
      const entries: MonthEntry[] = []
      for (const { year, month } of storedMonths) {
        const summary = await getDataSummary(year, month)
        const totalRecords = summary.reduce((s, d) => s + d.recordCount, 0)
        const dataTypeCount = summary.filter((d) => d.recordCount > 0).length
        entries.push({ year, month, summary, totalRecords, dataTypeCount })
      }
      setMonths(entries)
    } catch {
      setMonths([])
    } finally {
      setLoading(false)
    }
  }, [listMonths, getDataSummary])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleExpand = useCallback((key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMonth(deleteTarget.year, deleteTarget.month)
      setDeleteTarget(null)
      await loadData()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadData, deleteMonth])

  if (loading) {
    return (
      <Section>
        <SectionTitle>保存データ管理</SectionTitle>
        <LoadingText>IndexedDB からデータを読み込み中...</LoadingText>
      </Section>
    )
  }

  return (
    <>
      <Section>
        <SectionTitle>保存データ管理</SectionTitle>
        <HelpText>
          IndexedDB に保存されている月別データの一覧です。各月のデータ内容を確認したり、不要なデータを削除できます。
        </HelpText>

        {months.length === 0 ? (
          <EmptyState>保存されたデータはありません</EmptyState>
        ) : (
          <MonthCardGrid>
            {months.map((entry) => {
              const key = `${entry.year}-${entry.month}`
              const isExpanded = expandedMonths.has(key)
              const ctsSummary = entry.summary.find((s) => s.dataType === 'categoryTimeSales')
              const prevCtsSummary = entry.summary.find((s) => s.dataType === 'prevYearCategoryTimeSales')

              return (
                <MonthCard key={key}>
                  <MonthCardHeader onClick={() => toggleExpand(key)}>
                    <MonthLabel>
                      <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                      <MonthTitle>{entry.year}年{entry.month}月</MonthTitle>
                      <MonthBadge>
                        {entry.dataTypeCount}種別 / {entry.totalRecords.toLocaleString()}件
                      </MonthBadge>
                    </MonthLabel>
                    <HeaderActions>
                      <DeleteButton
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget({ year: entry.year, month: entry.month })
                        }}
                      >
                        削除
                      </DeleteButton>
                    </HeaderActions>
                  </MonthCardHeader>

                  {isExpanded && (
                    <DetailPanel>
                      <DataTypeGrid>
                        {entry.summary.map((s) => (
                          <DataTypeRow key={s.dataType} $hasData={s.recordCount > 0}>
                            <DataTypeLabel>{s.label}</DataTypeLabel>
                            <DataTypeCount $hasData={s.recordCount > 0}>
                              {s.recordCount > 0 ? `${s.recordCount.toLocaleString()}件` : '-'}
                            </DataTypeCount>
                          </DataTypeRow>
                        ))}
                      </DataTypeGrid>

                      <RawDataViewer year={entry.year} month={entry.month} summary={entry.summary} loadSlice={loadSlice} />

                      {ctsSummary && ctsSummary.recordCount > 0 && (
                        <CTSViewer year={entry.year} month={entry.month} dataType="categoryTimeSales" label="分類別時間帯売上" loadSlice={loadSlice} />
                      )}
                      {prevCtsSummary && prevCtsSummary.recordCount > 0 && (
                        <CTSViewer year={entry.year} month={entry.month} dataType="prevYearCategoryTimeSales" label="前年分類別時間帯売上" loadSlice={loadSlice} />
                      )}
                    </DetailPanel>
                  )}
                </MonthCard>
              )
            })}
          </MonthCardGrid>
        )}
      </Section>

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <ConfirmOverlay onClick={() => !deleting && setDeleteTarget(null)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle>データ削除の確認</ConfirmTitle>
            <ConfirmMessage>
              {deleteTarget.year}年{deleteTarget.month}月の保存データを全て削除します。
              この操作は取り消せません。
            </ConfirmMessage>
            <ConfirmActions>
              <CancelButton onClick={() => setDeleteTarget(null)} disabled={deleting}>
                キャンセル
              </CancelButton>
              <ConfirmDeleteButton onClick={handleDelete} disabled={deleting}>
                {deleting ? '削除中...' : '削除する'}
              </ConfirmDeleteButton>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </>
  )
}
