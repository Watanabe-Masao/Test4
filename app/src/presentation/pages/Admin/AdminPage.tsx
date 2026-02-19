import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { useAppData, useAppDispatch } from '@/application/context'
import { useSettings } from '@/application/hooks'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { CustomCategory, Store } from '@/domain/models'

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

// ─── インポート履歴タブ ────────────────────────────────
function ImportHistoryTab() {
  const { data } = useAppData()

  // 現在読み込まれているデータの概要を表示
  const dataOverview = [
    { label: '仕入', loaded: Object.keys(data.purchase).length > 0, stores: Object.keys(data.purchase).length },
    { label: '売上', loaded: Object.keys(data.sales).length > 0, stores: Object.keys(data.sales).length },
    { label: '売変', loaded: Object.keys(data.discount).length > 0, stores: Object.keys(data.discount).length },
    { label: '花', loaded: Object.keys(data.flowers).length > 0, stores: Object.keys(data.flowers).length },
    { label: '産直', loaded: Object.keys(data.directProduce).length > 0, stores: Object.keys(data.directProduce).length },
    { label: '店間入', loaded: Object.keys(data.interStoreIn).length > 0, stores: Object.keys(data.interStoreIn).length },
    { label: '店間出', loaded: Object.keys(data.interStoreOut).length > 0, stores: Object.keys(data.interStoreOut).length },
    { label: '消耗品', loaded: Object.keys(data.consumables).length > 0, stores: Object.keys(data.consumables).length },
    { label: '在庫設定', loaded: data.settings.size > 0, stores: data.settings.size },
    { label: '予算', loaded: data.budget.size > 0, stores: data.budget.size },
    { label: '前年売上売変', loaded: Object.keys(data.prevYearSales).length > 0, stores: Object.keys(data.prevYearSales).length },
  ]

  return (
    <Section>
      <SectionTitle>データ取込状況</SectionTitle>
      <HelpText>
        現在メモリに読み込まれているデータの概要です。再取り込みはサイドバーのファイル種別カードから行えます。
      </HelpText>
      <Table>
        <thead>
          <tr>
            <Th>データ種別</Th>
            <Th>状態</Th>
            <Th>店舗/件数</Th>
          </tr>
        </thead>
        <tbody>
          {dataOverview.map((d) => (
            <tr key={d.label}>
              <Td>{d.label}</Td>
              <Td>
                <Badge $color={d.loaded ? '#0ea5e9' : undefined}>
                  {d.loaded ? '取込済' : '未取込'}
                </Badge>
              </Td>
              <Td>
                {d.loaded ? <StoreIdBadge>{d.stores}</StoreIdBadge> : '-'}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Section>
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
