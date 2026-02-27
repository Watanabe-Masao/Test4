import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { useAppData, useAppDispatch } from '@/application/context'
import { useSettings } from '@/application/hooks'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { CustomCategory, Store } from '@/domain/models'
import { StorageManagementTab } from './StorageManagementTab'
import { PrevYearMappingTab } from './PrevYearMappingTab'
import { ImportHistoryTab } from './ImportHistoryTab'
import { RawDataTab } from './RawDataTab'
import {
  Section,
  SectionTitle,
  Table,
  Th,
  Td,
  Select,
  Input,
  EmptyState,
  Badge,
  StoreIdBadge,
  HelpText,
} from './AdminShared'

// ─── Page Layout Styled Components ──────────────────────────────────
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
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}10` : 'transparent'};
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

// ─── Category Colors ────────────────────────────────────
const CATEGORY_COLORS: Record<CustomCategory, string> = {
  市場仕入: '#f59e0b',
  LFC: '#3b82f6',
  サラダ: '#22c55e',
  加工品: '#a855f7',
  消耗品: '#f97316',
  直伝: '#06b6d4',
  その他: '#94a3b8',
}

type TabType = 'categories' | 'stores' | 'history' | 'rawdata' | 'storage' | 'prevyear'

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
                    onChange={(e) => handleCategoryChange(s.code, e.target.value as CustomCategory)}
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
                      期首: {inv.openingInventory?.toLocaleString() ?? '-'} / 期末:{' '}
                      {inv.closingInventory?.toLocaleString() ?? '-'}
                    </Badge>
                  ) : (
                    <Badge>未設定</Badge>
                  )}
                </Td>
                <Td>{budget ? <Badge $color="#a855f7">設定済</Badge> : <Badge>未設定</Badge>}</Td>
              </tr>
            )
          })}
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
        <Tab $active={activeTab === 'rawdata'} onClick={() => setActiveTab('rawdata')}>
          データ一覧
        </Tab>
        <Tab $active={activeTab === 'storage'} onClick={() => setActiveTab('storage')}>
          保存データ管理
        </Tab>
        <Tab $active={activeTab === 'prevyear'} onClick={() => setActiveTab('prevyear')}>
          前年比設定
        </Tab>
      </Tabs>

      {activeTab === 'categories' && <CategoryManagementTab />}
      {activeTab === 'stores' && <StoreManagementTab />}
      {activeTab === 'history' && <ImportHistoryTab />}
      {activeTab === 'rawdata' && <RawDataTab />}
      {activeTab === 'storage' && <StorageManagementTab />}
      {activeTab === 'prevyear' && <PrevYearMappingTab />}
    </Page>
  )
}
