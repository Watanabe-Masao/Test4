import { ThemeProvider } from 'styled-components'
import { useState, useCallback, createContext, useContext } from 'react'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { AppStateProvider, useAppState, useAppDispatch } from '@/application/context'
import { useImport, useStoreSelection, useSettings } from '@/application/hooks'
import { AppShell, NavBar, Sidebar } from '@/presentation/components/Layout'
import {
  Button,
  FileDropZone,
  UploadCard,
  Chip,
  ChipGroup,
  ToastProvider,
  useToast,
  SettingsModal,
} from '@/presentation/components/common'
import { DashboardPage } from '@/presentation/pages/Dashboard/DashboardPage'
import { DailyPage } from '@/presentation/pages/Daily/DailyPage'
import { AnalysisPage } from '@/presentation/pages/Analysis/AnalysisPage'
import { CategoryPage } from '@/presentation/pages/Category/CategoryPage'
import { SummaryPage } from '@/presentation/pages/Summary/SummaryPage'
import { ForecastPage } from '@/presentation/pages/Forecast/ForecastPage'
import { ReportsPage } from '@/presentation/pages/Reports/ReportsPage'
import type { ViewType, DataType } from '@/domain/models'
import styled from 'styled-components'

// ─── テーマトグルコンテキスト ────────────────────────────────
const ThemeToggleContext = createContext<{ mode: ThemeMode; toggle: () => void }>({
  mode: 'dark',
  toggle: () => {},
})
export const useThemeToggle = () => useContext(ThemeToggleContext)

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'dark'
}

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
`

const SidebarActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`

const InventoryInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const InventoryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const InventoryLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  min-width: 48px;
`

const InventoryInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const StoreInventoryBlock = styled.div`
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const StoreInventoryTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const uploadTypes: { type: DataType; label: string; multi?: boolean }[] = [
  { type: 'budget', label: '0_売上予算' },
  { type: 'salesDiscount', label: '1_売上売変' },
  { type: 'purchase', label: '2_仕入' },
  { type: 'flowers', label: '3_花' },
  { type: 'directProduce', label: '4_産直' },
  { type: 'interStoreIn', label: '5_店間入' },
  { type: 'interStoreOut', label: '6_店間出' },
  { type: 'initialSettings', label: '7_初期設定' },
  { type: 'consumables', label: '8_消耗品', multi: true },
]

function ViewRouter({ view }: { view: ViewType }) {
  switch (view) {
    case 'dashboard':
      return <DashboardPage />
    case 'daily':
      return <DailyPage />
    case 'analysis':
      return <AnalysisPage />
    case 'category':
      return <CategoryPage />
    case 'summary':
      return <SummaryPage />
    case 'forecast':
      return <ForecastPage />
    case 'reports':
      return <ReportsPage />
    default:
      return <DashboardPage />
  }
}

function AppContent() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { importFiles } = useImport()
  const { selectedStoreIds, stores, toggleStore, selectAllStores } = useStoreSelection()
  const { settings, updateSettings } = useSettings()
  const showToast = useToast()
  const [showSettings, setShowSettings] = useState(false)
  const { mode, toggle } = useThemeToggle()

  const handleFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType) => {
      const summary = await importFiles(files, overrideType)
      summary.results.forEach((r) => {
        if (r.ok) {
          showToast(`${r.typeName}: ${r.filename}`, 'success')
        } else {
          showToast(`${r.filename}: ${r.error}`, 'error')
        }
      })
    },
    [importFiles, showToast],
  )

  const handleSingleFile = useCallback(
    async (files: File | File[], typeHint: string) => {
      const fileArray = Array.isArray(files) ? files : [files]
      await handleFiles(fileArray, typeHint as DataType)
    },
    [handleFiles],
  )

  const handleViewChange = useCallback(
    (view: ViewType) => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
    },
    [dispatch],
  )

  // Determine which data types are loaded
  const loadedTypes = new Set<DataType>()
  if (Object.keys(state.data.purchase).length > 0) loadedTypes.add('purchase')
  if (Object.keys(state.data.sales).length > 0) {
    loadedTypes.add('sales')
    loadedTypes.add('salesDiscount')
  }
  if (Object.keys(state.data.discount).length > 0) {
    loadedTypes.add('discount')
    loadedTypes.add('salesDiscount')
  }
  if (state.data.settings.size > 0) loadedTypes.add('initialSettings')
  if (state.data.budget.size > 0) loadedTypes.add('budget')
  if (Object.keys(state.data.consumables).length > 0) loadedTypes.add('consumables')
  if (Object.keys(state.data.flowers).length > 0) loadedTypes.add('flowers')
  if (Object.keys(state.data.directProduce).length > 0) loadedTypes.add('directProduce')
  if (Object.keys(state.data.interStoreIn).length > 0) loadedTypes.add('interStoreIn')
  if (Object.keys(state.data.interStoreOut).length > 0) loadedTypes.add('interStoreOut')

  return (
    <>
      <AppShell
        nav={
          <NavBar
            currentView={state.ui.currentView}
            onViewChange={handleViewChange}
            themeMode={mode}
            onThemeToggle={toggle}
          />
        }
        sidebar={
          <Sidebar title="データ管理">
            <SidebarSection>
              <FileDropZone onFiles={handleFiles} />
            </SidebarSection>

            <SidebarSection>
              <SectionLabel>ファイル種別</SectionLabel>
              <UploadGrid>
                {uploadTypes.map(({ type, label, multi }) => (
                  <UploadCard
                    key={type}
                    dataType={type}
                    label={label}
                    loaded={loadedTypes.has(type)}
                    onFile={handleSingleFile}
                    multiple={multi}
                  />
                ))}
              </UploadGrid>
            </SidebarSection>

            {stores.size > 0 && (
              <SidebarSection>
                <SectionLabel>店舗選択（複数可）</SectionLabel>
                <ChipGroup>
                  <Chip
                    $active={selectedStoreIds.size === 0}
                    onClick={selectAllStores}
                  >
                    全店
                  </Chip>
                  {Array.from(stores.values()).map((s) => (
                    <Chip
                      key={s.id}
                      $active={selectedStoreIds.has(s.id)}
                      onClick={() => toggleStore(s.id)}
                    >
                      {s.name}
                    </Chip>
                  ))}
                </ChipGroup>
              </SidebarSection>
            )}

            {stores.size > 0 && (
              <SidebarSection>
                <SectionLabel>在庫設定</SectionLabel>
                <InventoryInputGroup>
                  {Array.from(stores.values()).map((s) => {
                    const cfg = state.data.settings.get(s.id)
                    return (
                      <StoreInventoryBlock key={s.id}>
                        <StoreInventoryTitle>{s.name}</StoreInventoryTitle>
                        <InventoryRow>
                          <InventoryLabel>期首</InventoryLabel>
                          <InventoryInput
                            type="number"
                            placeholder="期首在庫"
                            value={cfg?.openingInventory ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value)
                              dispatch({
                                type: 'UPDATE_INVENTORY',
                                payload: {
                                  storeId: s.id,
                                  config: { openingInventory: val },
                                },
                              })
                            }}
                          />
                        </InventoryRow>
                        <InventoryRow>
                          <InventoryLabel>期末</InventoryLabel>
                          <InventoryInput
                            type="number"
                            placeholder="期末在庫"
                            value={cfg?.closingInventory ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value)
                              dispatch({
                                type: 'UPDATE_INVENTORY',
                                payload: {
                                  storeId: s.id,
                                  config: { closingInventory: val },
                                },
                              })
                            }}
                          />
                        </InventoryRow>
                      </StoreInventoryBlock>
                    )
                  })}
                </InventoryInputGroup>
              </SidebarSection>
            )}

            <SidebarSection>
              <SidebarActions>
                <Button $variant="outline" onClick={() => setShowSettings(true)}>
                  ⚙ 設定
                </Button>
              </SidebarActions>
            </SidebarSection>
          </Sidebar>
        }
      >
        <ViewRouter view={state.ui.currentView} />
      </AppShell>
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme)

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  const theme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeToggleContext.Provider value={{ mode: themeMode, toggle: toggleTheme }}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <AppStateProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AppStateProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}

export default App
