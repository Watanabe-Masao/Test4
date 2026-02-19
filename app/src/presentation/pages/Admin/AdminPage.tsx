import { useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { useAppData, useAppDispatch } from '@/application/context'
import { useSettings } from '@/application/hooks'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { CustomCategory, Store, ImportedData } from '@/domain/models'

// ─── Styled Components ──────────────────────────────────
const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[6]};
  height: 100%;
  overflow-y: auto;
`

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const Tabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
`

const Tab = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border: none;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  background: ${({ $active, theme }) => ($active ? `${theme.colors.palette.primary}10` : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0 0;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg3};
  }
`

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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
`

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  width: 100%;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const Badge = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ $color }) => ($color ? `${$color}20` : 'rgba(255,255,255,0.1)')};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
`

const StoreIdBadge = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

// ─── Category Colors ────────────────────────────────────
const CATEGORY_COLORS: Record<CustomCategory, string> = {
  '市場仕入': '#f59e0b',
  'LFC': '#3b82f6',
  'サラダ': '#22c55e',
  '加工品': '#a855f7',
  '消耗品': '#f97316',
  '直伝': '#06b6d4',
  'その他': '#94a3b8',
}

type TabType = 'categories' | 'stores' | 'history'

// ─── カテゴリ管理タブ ─────────────────────────────────────
function CategoryManagementTab() {
  const { data } = useAppData()
  const { settings, updateSettings } = useSettings()

  const handleCategoryChange = useCallback(
    (supplierCode: string, category: CustomCategory) => {
      updateSettings({
        supplierCategoryMap: {
          ...settings.supplierCategoryMap,
          [supplierCode]: category,
        },
      })
    },
    [settings.supplierCategoryMap, updateSettings],
  )

  const suppliers = Array.from(data.suppliers.values())

  if (suppliers.length === 0) {
    return (
      <Section>
        <SectionTitle>取引先カテゴリ管理</SectionTitle>
        <EmptyState>データをインポートすると取引先一覧が表示されます</EmptyState>
      </Section>
    )
  }

  return (
    <Section>
      <SectionTitle>取引先カテゴリ管理</SectionTitle>
      <HelpText>
        取引先ごとのカテゴリ分類を設定します。カテゴリは粗利分析のグルーピングに使用されます。
      </HelpText>
      <Table>
        <thead>
          <tr>
            <Th>コード</Th>
            <Th>取引先名</Th>
            <Th>カテゴリ</Th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => {
            const current = settings.supplierCategoryMap[s.code]
            return (
              <tr key={s.code}>
                <Td>
                  <StoreIdBadge>{s.code}</StoreIdBadge>
                </Td>
                <Td>{s.name}</Td>
                <Td>
                  <Select
                    value={current ?? ''}
                    onChange={(e) =>
                      handleCategoryChange(s.code, e.target.value as CustomCategory)
                    }
                  >
                    <option value="">未分類</option>
                    {CUSTOM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                  {current && (
                    <Badge $color={CATEGORY_COLORS[current]} style={{ marginLeft: 8 }}>
                      {current}
                    </Badge>
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </Section>
  )
}

// ─── 店舗管理タブ ──────────────────────────────────────
function StoreManagementTab() {
  const { data } = useAppData()
  const dispatch = useAppDispatch()
  const stores = Array.from(data.stores.values())

  const [editingStore, setEditingStore] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleStartEdit = useCallback((store: Store) => {
    setEditingStore(store.id)
    setEditName(store.name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingStore && editName.trim()) {
      const current = data.stores.get(editingStore)
      if (current) {
        const updated = new Map(data.stores)
        updated.set(editingStore, { ...current, name: editName.trim() })
        dispatch({
          type: 'SET_IMPORTED_DATA',
          payload: { ...data, stores: updated },
        })
      }
    }
    setEditingStore(null)
  }, [editingStore, editName, data, dispatch])

  if (stores.length === 0) {
    return (
      <Section>
        <SectionTitle>店舗管理</SectionTitle>
        <EmptyState>データをインポートすると店舗一覧が表示されます</EmptyState>
      </Section>
    )
  }

  return (
    <Section>
      <SectionTitle>店舗管理</SectionTitle>
      <HelpText>
        インポートデータから検出された店舗の一覧です。店舗名をクリックして編集できます。
      </HelpText>
      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>コード</Th>
            <Th>店舗名</Th>
            <Th>在庫設定</Th>
            <Th>予算</Th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => {
            const inv = data.settings.get(s.id)
            const budget = data.budget.get(s.id)
            const isEditing = editingStore === s.id
            return (
              <tr key={s.id}>
                <Td>
                  <StoreIdBadge>{s.id}</StoreIdBadge>
                </Td>
                <Td>
                  <StoreIdBadge>{s.code}</StoreIdBadge>
                </Td>
                <Td>
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') setEditingStore(null)
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleStartEdit(s)}
                      title="クリックして編集"
                    >
                      {s.name}
                    </span>
                  )}
                </Td>
                <Td>
                  {inv ? (
                    <Badge $color="#0ea5e9">
                      期首: {inv.openingInventory?.toLocaleString() ?? '-'} /
                      期末: {inv.closingInventory?.toLocaleString() ?? '-'}
                    </Badge>
                  ) : (
                    <Badge>未設定</Badge>
                  )}
                </Td>
                <Td>
                  {budget ? (
                    <Badge $color="#a855f7">設定済</Badge>
                  ) : (
                    <Badge>未設定</Badge>
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </Section>
  )
}

// ─── 取込状況ヘルパー ──────────────────────────────────

interface StoreDayStats {
  label: string
  storeCount: number
  totalRecords: number
  dayRange: { min: number; max: number } | null
  perStore: { storeId: string; storeName: string; days: number; minDay: number; maxDay: number }[]
  hasCustomers: boolean
}

/** StoreDayRecord 型のデータから詳細統計を取得 */
function analyzeStoreDayRecord(
  record: Record<string, Record<number, unknown>>,
  label: string,
  storeNames: ReadonlyMap<string, Store>,
  checkCustomers = false,
): StoreDayStats {
  const storeIds = Object.keys(record)
  if (storeIds.length === 0) {
    return { label, storeCount: 0, totalRecords: 0, dayRange: null, perStore: [], hasCustomers: false }
  }

  let globalMin = Infinity
  let globalMax = -Infinity
  let totalRecords = 0
  let hasCustomers = false
  const perStore: StoreDayStats['perStore'] = []

  for (const sid of storeIds) {
    const days = Object.keys(record[sid]).map(Number).filter((d) => !isNaN(d))
    if (days.length === 0) continue
    const min = Math.min(...days)
    const max = Math.max(...days)
    if (min < globalMin) globalMin = min
    if (max > globalMax) globalMax = max
    totalRecords += days.length
    const store = storeNames.get(sid)
    perStore.push({
      storeId: sid,
      storeName: store?.name ?? `店舗${sid}`,
      days: days.length,
      minDay: min,
      maxDay: max,
    })

    if (checkCustomers && !hasCustomers) {
      for (const d of days) {
        const entry = record[sid][d] as Record<string, unknown>
        if (entry && typeof entry.customers === 'number' && entry.customers > 0) {
          hasCustomers = true
          break
        }
      }
    }
  }

  return {
    label,
    storeCount: storeIds.length,
    totalRecords,
    dayRange: globalMin <= globalMax ? { min: globalMin, max: globalMax } : null,
    perStore,
    hasCustomers,
  }
}

function buildDataOverview(data: ImportedData): StoreDayStats[] {
  const stores = data.stores
  return [
    analyzeStoreDayRecord(data.purchase, '仕入', stores),
    analyzeStoreDayRecord(data.sales, '売上', stores, true),
    analyzeStoreDayRecord(data.discount, '売変', stores, true),
    analyzeStoreDayRecord(data.flowers, '花', stores),
    analyzeStoreDayRecord(data.directProduce, '産直', stores),
    analyzeStoreDayRecord(data.interStoreIn, '店間入', stores),
    analyzeStoreDayRecord(data.interStoreOut, '店間出', stores),
    analyzeStoreDayRecord(data.consumables, '消耗品', stores),
    analyzeStoreDayRecord(data.prevYearSales, '前年売上', stores, true),
    analyzeStoreDayRecord(data.prevYearDiscount, '前年売変', stores, true),
  ]
}

// ─── 追加スタイル ───────────────────────────────────────

const DetailRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
`

const DetailCell = styled.td`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[8]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 0 ${({ theme }) => theme.spacing[1]};
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`

const ProgressBarContainer = styled.div`
  width: 60px;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-left: ${({ theme }) => theme.spacing[2]};
`

const ProgressBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.3s;
`

const ValidationSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`

const ValidationItem = styled.div<{ $level: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ $level }) =>
    $level === 'error' ? 'rgba(239,68,68,0.1)' :
    $level === 'warning' ? 'rgba(245,158,11,0.1)' :
    'rgba(59,130,246,0.1)'};
  color: ${({ $level }) =>
    $level === 'error' ? '#ef4444' :
    $level === 'warning' ? '#f59e0b' :
    '#3b82f6'};
`

const ValidationIcon = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: center;
`

const SummaryValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const SummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

// ─── インポート履歴タブ ────────────────────────────────
function ImportHistoryTab() {
  const { data, validationMessages } = useAppData()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((label: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  const overview = useMemo(() => buildDataOverview(data), [data])

  // サマリー統計
  const loadedCount = overview.filter((d) => d.storeCount > 0).length
  const totalStores = data.stores.size
  const totalRecords = overview.reduce((s, d) => s + d.totalRecords, 0)
  const hasCustomerData = overview.some((d) => d.hasCustomers)

  // Map系データ
  const mapOverview = [
    { label: '在庫設定', count: data.settings.size },
    { label: '予算', count: data.budget.size },
  ]

  // 時間帯売上
  const categoryTimeSalesCount = data.categoryTimeSales.records.length
  const categoryTimeSalesStores = new Set(data.categoryTimeSales.records.map((r) => r.storeId)).size
  const categoryTimeSalesDays = data.categoryTimeSales.records.length > 0
    ? (() => {
        const days = data.categoryTimeSales.records.map((r) => r.day)
        return { min: Math.min(...days), max: Math.max(...days) }
      })()
    : null

  // 全体の最大日数レンジ（品質スコア用）
  const salesDayRange = overview.find((d) => d.label === '売上')?.dayRange
  const daysInMonth = salesDayRange ? salesDayRange.max : 28

  return (
    <>
      {/* サマリーカード */}
      <Section>
        <SectionTitle>データ概要</SectionTitle>
        <SummaryGrid>
          <SummaryCard>
            <SummaryValue>{totalStores}</SummaryValue>
            <SummaryLabel>登録店舗数</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{loadedCount}<span style={{ fontSize: '0.6em', opacity: 0.6 }}> / {overview.length + 2 + 1}</span></SummaryValue>
            <SummaryLabel>取込済データ種別</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{totalRecords.toLocaleString()}</SummaryValue>
            <SummaryLabel>総レコード数</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>
              <Badge $color={hasCustomerData ? '#22c55e' : undefined}>
                {hasCustomerData ? '有' : '無'}
              </Badge>
            </SummaryValue>
            <SummaryLabel>客数データ</SummaryLabel>
          </SummaryCard>
        </SummaryGrid>
      </Section>

      {/* 詳細テーブル */}
      <Section>
        <SectionTitle>日別データ取込状況</SectionTitle>
        <HelpText>
          店舗×日単位のデータです。行をクリックで店舗別の詳細を展開できます。
        </HelpText>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 30 }}></Th>
              <Th>データ種別</Th>
              <Th>状態</Th>
              <Th>店舗数</Th>
              <Th>レコード数</Th>
              <Th>日付範囲</Th>
              <Th>品質</Th>
            </tr>
          </thead>
          <tbody>
            {overview.map((d) => {
              const isExpanded = expandedRows.has(d.label)
              const loaded = d.storeCount > 0
              // 品質: 各店舗のカバー率（日数 / daysInMonth）の平均
              const quality = loaded && daysInMonth > 0
                ? Math.round(d.perStore.reduce((s, p) => s + (p.days / daysInMonth) * 100, 0) / d.perStore.length)
                : 0
              const qualityColor = quality >= 80 ? '#22c55e' : quality >= 50 ? '#f59e0b' : '#ef4444'

              return (
                <>
                  <tr key={d.label} style={{ cursor: loaded ? 'pointer' : 'default' }} onClick={() => loaded && toggleExpand(d.label)}>
                    <Td>
                      {loaded && (
                        <ExpandButton onClick={(e) => { e.stopPropagation(); toggleExpand(d.label) }}>
                          {isExpanded ? '▼' : '▶'}
                        </ExpandButton>
                      )}
                    </Td>
                    <Td>
                      {d.label}
                      {d.hasCustomers && <Badge $color="#22c55e" style={{ marginLeft: 6 }}>客数</Badge>}
                    </Td>
                    <Td>
                      <Badge $color={loaded ? '#0ea5e9' : undefined}>
                        {loaded ? '取込済' : '未取込'}
                      </Badge>
                    </Td>
                    <Td>{loaded ? d.storeCount : '-'}</Td>
                    <Td>{loaded ? d.totalRecords.toLocaleString() : '-'}</Td>
                    <Td>
                      {d.dayRange ? `${d.dayRange.min}日 〜 ${d.dayRange.max}日` : '-'}
                    </Td>
                    <Td>
                      {loaded ? (
                        <>
                          <StoreIdBadge>{quality}%</StoreIdBadge>
                          <ProgressBarContainer>
                            <ProgressBarFill $pct={quality} $color={qualityColor} />
                          </ProgressBarContainer>
                        </>
                      ) : '-'}
                    </Td>
                  </tr>
                  {isExpanded && d.perStore.map((ps) => (
                    <DetailRow key={`${d.label}-${ps.storeId}`}>
                      <DetailCell></DetailCell>
                      <DetailCell colSpan={2}>
                        <StoreIdBadge>{ps.storeId}</StoreIdBadge>{' '}
                        {ps.storeName}
                      </DetailCell>
                      <DetailCell>{ps.days}日分</DetailCell>
                      <DetailCell>{ps.minDay}日 〜 {ps.maxDay}日</DetailCell>
                      <DetailCell>
                        {(() => {
                          const pct = daysInMonth > 0 ? Math.round((ps.days / daysInMonth) * 100) : 0
                          const c = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
                          return (
                            <>
                              <StoreIdBadge>{pct}%</StoreIdBadge>
                              <ProgressBarContainer>
                                <ProgressBarFill $pct={pct} $color={c} />
                              </ProgressBarContainer>
                            </>
                          )
                        })()}
                      </DetailCell>
                      <DetailCell></DetailCell>
                    </DetailRow>
                  ))}
                </>
              )
            })}
          </tbody>
        </Table>
      </Section>

      {/* 設定系・特殊データ */}
      <Section>
        <SectionTitle>設定・特殊データ取込状況</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>データ種別</Th>
              <Th>状態</Th>
              <Th>件数</Th>
              <Th>詳細</Th>
            </tr>
          </thead>
          <tbody>
            {mapOverview.map((d) => (
              <tr key={d.label}>
                <Td>{d.label}</Td>
                <Td>
                  <Badge $color={d.count > 0 ? '#0ea5e9' : undefined}>
                    {d.count > 0 ? '取込済' : '未取込'}
                  </Badge>
                </Td>
                <Td>{d.count > 0 ? `${d.count}店舗` : '-'}</Td>
                <Td>-</Td>
              </tr>
            ))}
            <tr>
              <Td>
                分類別時間帯売上
              </Td>
              <Td>
                <Badge $color={categoryTimeSalesCount > 0 ? '#0ea5e9' : undefined}>
                  {categoryTimeSalesCount > 0 ? '取込済' : '未取込'}
                </Badge>
              </Td>
              <Td>{categoryTimeSalesCount > 0 ? `${categoryTimeSalesCount.toLocaleString()}件` : '-'}</Td>
              <Td>
                {categoryTimeSalesCount > 0 ? (
                  <>
                    <StoreIdBadge>{categoryTimeSalesStores}店舗</StoreIdBadge>
                    {categoryTimeSalesDays && (
                      <span style={{ marginLeft: 8, fontSize: '0.8em', opacity: 0.7 }}>
                        {categoryTimeSalesDays.min}日 〜 {categoryTimeSalesDays.max}日
                      </span>
                    )}
                  </>
                ) : '-'}
              </Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      {/* バリデーションメッセージ */}
      {validationMessages.length > 0 && (
        <Section>
          <SectionTitle>
            バリデーション結果
            <Badge $color={validationMessages.some((m) => m.level === 'error') ? '#ef4444' : '#f59e0b'} style={{ marginLeft: 8 }}>
              {validationMessages.length}件
            </Badge>
          </SectionTitle>
          <ValidationSection>
            {validationMessages.map((msg, i) => (
              <ValidationItem key={i} $level={msg.level}>
                <ValidationIcon>
                  {msg.level === 'error' ? '!!' : msg.level === 'warning' ? '!' : 'i'}
                </ValidationIcon>
                <div>
                  <div>{msg.message}</div>
                  {msg.details && msg.details.length > 0 && (
                    <div style={{ marginTop: 2, opacity: 0.8 }}>
                      {msg.details.map((d, j) => (
                        <div key={j}>{d}</div>
                      ))}
                    </div>
                  )}
                </div>
              </ValidationItem>
            ))}
          </ValidationSection>
        </Section>
      )}
    </>
  )
}

// ─── メインページ ──────────────────────────────────────
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('categories')

  return (
    <Page>
      <PageTitle>管理</PageTitle>
      <Tabs>
        <Tab $active={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
          カテゴリ管理
        </Tab>
        <Tab $active={activeTab === 'stores'} onClick={() => setActiveTab('stores')}>
          店舗管理
        </Tab>
        <Tab $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          データ取込状況
        </Tab>
      </Tabs>

      {activeTab === 'categories' && <CategoryManagementTab />}
      {activeTab === 'stores' && <StoreManagementTab />}
      {activeTab === 'history' && <ImportHistoryTab />}
    </Page>
  )
}
