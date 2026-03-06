import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { usePwaInstall } from '@/presentation/hooks/usePwaInstall'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import { useSettings } from '@/application/hooks'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { CustomCategory, Store } from '@/domain/models'
import {
  PRESET_CATEGORY_LABELS,
  isUserCategory,
  createUserCategoryId,
} from '@/domain/constants/customCategories'
import type { PresetCategoryId, UserCategoryId } from '@/domain/constants/customCategories'
import { palette } from '@/presentation/theme/tokens'
import { StorageManagementTab } from './StorageManagementTab'
import { PrevYearMappingTab } from './PrevYearMappingTab'
import { ImportHistoryTab } from './ImportHistoryTab'
import { RawDataTab } from './RawDataTab'
import { QueryProfilePanel } from '@/presentation/components/DevTools/QueryProfilePanel'
import { Tab as CommonTab, TabBar as CommonTabBar } from '@/presentation/components/common'
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

const Tabs = CommonTabBar

const Tab = CommonTab

// ─── Category Colors ────────────────────────────────────
const CATEGORY_COLORS: Record<PresetCategoryId, string> = {
  market_purchase: palette.warningDark,
  lfc: palette.blueDark,
  salad: palette.successDark,
  processed: palette.purpleDeep,
  consumables: palette.orange,
  direct_delivery: palette.cyanDark,
  other: palette.slate,
  uncategorized: palette.slate,
}

const UserCategoryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} 0;
`

const AddCategoryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const SmallButton = styled.button<{ $variant?: 'danger' | 'primary' }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $variant, theme }) =>
    $variant === 'danger'
      ? theme.colors.palette.danger + '20'
      : $variant === 'primary'
        ? theme.colors.palette.primary + '20'
        : theme.colors.bg3};
  color: ${({ $variant, theme }) =>
    $variant === 'danger'
      ? theme.colors.palette.danger
      : $variant === 'primary'
        ? theme.colors.palette.primary
        : theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

/** ユーザーカテゴリのラベルを解決する（プリセット → PRESET_CATEGORY_LABELS、ユーザー → userCategoryLabels） */
function resolveCategoryLabel(
  id: string,
  userCategoryLabels: Readonly<Record<string, string>>,
): string {
  if (isUserCategory(id)) return userCategoryLabels[id] ?? id.replace('user:', '')
  return PRESET_CATEGORY_LABELS[id as PresetCategoryId] ?? id
}

/** カテゴリの色を解決する */
function resolveCategoryColor(id: string): string {
  if (isUserCategory(id)) return '#14b8a6'
  return CATEGORY_COLORS[id as PresetCategoryId] ?? palette.slate
}

type TabType = 'categories' | 'stores' | 'history' | 'rawdata' | 'storage' | 'prevyear'

// ─── カテゴリ管理タブ ─────────────────────────────────────
function CategoryManagementTab() {
  const data = useDataStore((s) => s.data)
  const { settings, updateSettings } = useSettings()
  const [newCategoryName, setNewCategoryName] = useState('')

  const userCategories: { id: UserCategoryId; label: string }[] = Object.entries(
    settings.userCategoryLabels ?? {},
  )
    .filter(([id]) => isUserCategory(id))
    .map(([id, label]) => ({ id: id as UserCategoryId, label }))

  const handleCategoryChange = useCallback(
    (supplierCode: string, value: string) => {
      if (!value || value === 'uncategorized') {
        const next = Object.fromEntries(
          Object.entries(settings.supplierCategoryMap).filter(([k]) => k !== supplierCode),
        )
        updateSettings({ supplierCategoryMap: next })
      } else {
        updateSettings({
          supplierCategoryMap: {
            ...settings.supplierCategoryMap,
            [supplierCode]: value as CustomCategory,
          },
        })
      }
    },
    [settings.supplierCategoryMap, updateSettings],
  )

  const handleAddCategory = useCallback(() => {
    const name = newCategoryName.trim()
    if (!name) return
    const id = createUserCategoryId(name)
    // 重複チェック
    if (settings.userCategoryLabels?.[id]) return
    updateSettings({
      userCategoryLabels: { ...(settings.userCategoryLabels ?? {}), [id]: name },
    })
    setNewCategoryName('')
  }, [newCategoryName, settings.userCategoryLabels, updateSettings])

  const handleDeleteCategory = useCallback(
    (id: UserCategoryId) => {
      // ラベルから削除
      const nextLabels = Object.fromEntries(
        Object.entries(settings.userCategoryLabels ?? {}).filter(([k]) => k !== id),
      )
      // このカテゴリに割り当てられた取引先を未分類に戻す
      const nextMap = Object.fromEntries(
        Object.entries(settings.supplierCategoryMap).filter(([, v]) => v !== id),
      )
      updateSettings({ userCategoryLabels: nextLabels, supplierCategoryMap: nextMap })
    },
    [settings.userCategoryLabels, settings.supplierCategoryMap, updateSettings],
  )

  const suppliers = Array.from(data.suppliers.values())

  return (
    <>
      {/* ユーザーカテゴリ管理セクション */}
      <Section>
        <SectionTitle>カテゴリ一覧</SectionTitle>
        <HelpText>
          プリセットカテゴリに加え、独自のカテゴリを作成できます。作成したカテゴリは取引先の分類に使用されます。
        </HelpText>
        {userCategories.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {userCategories.map((uc) => (
              <UserCategoryRow key={uc.id}>
                <Badge $color={'#14b8a6'}>{uc.label}</Badge>
                <SmallButton $variant="danger" onClick={() => handleDeleteCategory(uc.id)}>
                  削除
                </SmallButton>
              </UserCategoryRow>
            ))}
          </div>
        )}
        <AddCategoryRow>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory()
            }}
            placeholder="新しいカテゴリ名"
            style={{ width: 200 }}
          />
          <SmallButton
            $variant="primary"
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim()}
          >
            追加
          </SmallButton>
        </AddCategoryRow>
      </Section>

      {/* 取引先カテゴリ割当セクション */}
      <Section>
        <SectionTitle>取引先カテゴリ管理</SectionTitle>
        {suppliers.length === 0 ? (
          <EmptyState>データをインポートすると取引先一覧が表示されます</EmptyState>
        ) : (
          <>
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
                          value={current ?? 'uncategorized'}
                          onChange={(e) => handleCategoryChange(s.code, e.target.value)}
                        >
                          <option value="uncategorized">未分類</option>
                          {CUSTOM_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                          {userCategories.length > 0 && (
                            <optgroup label="ユーザーカテゴリ">
                              {userCategories.map((uc) => (
                                <option key={uc.id} value={uc.id}>
                                  {uc.label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </Select>
                        {current && (
                          <Badge $color={resolveCategoryColor(current)} style={{ marginLeft: 8 }}>
                            {resolveCategoryLabel(current, settings.userCategoryLabels ?? {})}
                          </Badge>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </>
        )}
      </Section>
    </>
  )
}

// ─── 店舗管理タブ ──────────────────────────────────────
function StoreManagementTab() {
  const data = useDataStore((s) => s.data)
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
        useDataStore.getState().setImportedData({ ...data, stores: updated })
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
      }
    }
    setEditingStore(null)
  }, [editingStore, editName, data])

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
                    <Badge $color={palette.infoDark}>
                      機首: {inv.openingInventory?.toLocaleString() ?? '-'} / 期末:{' '}
                      {inv.closingInventory?.toLocaleString() ?? '-'}
                      {inv.productInventory != null && (
                        <>
                          {' '}
                          (商品: {inv.productInventory.toLocaleString()} + 消耗品:{' '}
                          {(inv.costInclusionInventory ?? 0).toLocaleString()})
                        </>
                      )}
                    </Badge>
                  ) : (
                    <Badge>未設定</Badge>
                  )}
                </Td>
                <Td>
                  {budget ? (
                    <Badge $color={palette.purpleDeep}>設定済</Badge>
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

// ─── PWA インストールバナー ──────────────────────────────

const InstallBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'};
  border: 1px solid ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
`

const InstallButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.palette.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
  }
`

// ─── メインページ ──────────────────────────────────────
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('categories')
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()

  const handleInstall = useCallback(async () => {
    await promptInstall()
  }, [promptInstall])

  return (
    <Page>
      <PageTitle>管理</PageTitle>

      {canInstall && !isInstalled && (
        <InstallBanner>
          <span>このアプリをデバイスにインストールすると、オフラインでも利用できます。</span>
          <InstallButton onClick={handleInstall}>インストール</InstallButton>
        </InstallBanner>
      )}

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
      <QueryProfilePanel />
    </Page>
  )
}
