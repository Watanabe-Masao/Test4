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
import { ALL_STORES_ID } from '@/domain/constants/defaults'
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

const uploadTypes: { type: DataType; label: string }[] = [
  { type: 'purchase', label: '仕入' },
  { type: 'sales', label: '売上' },
  { type: 'discount', label: '売変' },
  { type: 'initialSettings', label: '初期設定' },
  { type: 'budget', label: '予算' },
  { type: 'consumables', label: '消耗品' },
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
  const { currentStoreId, stores, selectStore, selectAllStores } = useStoreSelection()
  const { settings, updateSettings } = useSettings()
  const showToast = useToast()
  const [showSettings, setShowSettings] = useState(false)
  const { mode, toggle } = useThemeToggle()

  const handleFiles = useCallback(
    async (files: FileList) => {
      const summary = await importFiles(files)
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
    async (file: File) => {
      const list = new DataTransfer()
      list.items.add(file)
      await handleFiles(list.files)
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
  if (Object.keys(state.data.sales).length > 0) loadedTypes.add('sales')
  if (Object.keys(state.data.discount).length > 0) loadedTypes.add('discount')
  if (state.data.settings.size > 0) loadedTypes.add('initialSettings')
  if (state.data.budget.size > 0) loadedTypes.add('budget')
  if (Object.keys(state.data.consumables).length > 0) loadedTypes.add('consumables')

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
                {uploadTypes.map(({ type, label }) => (
                  <UploadCard
                    key={type}
                    dataType={type}
                    label={label}
                    loaded={loadedTypes.has(type)}
                    onFile={handleSingleFile}
                  />
                ))}
              </UploadGrid>
            </SidebarSection>

            {stores.size > 0 && (
              <SidebarSection>
                <SectionLabel>店舗選択</SectionLabel>
                <ChipGroup>
                  <Chip
                    $active={currentStoreId === ALL_STORES_ID}
                    onClick={selectAllStores}
                  >
                    全店
                  </Chip>
                  {Array.from(stores.values()).map((s) => (
                    <Chip
                      key={s.id}
                      $active={currentStoreId === s.id}
                      onClick={() => selectStore(s.id)}
                    >
                      {s.name}
                    </Chip>
                  ))}
                </ChipGroup>
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
