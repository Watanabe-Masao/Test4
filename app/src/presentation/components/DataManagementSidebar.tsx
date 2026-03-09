import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
import {
  useImport,
  useStoreSelection,
  useSettings,
  usePersistence,
  useStorageAdmin,
  useAutoBackup,
  useAutoImport,
} from '@/application/hooks'
import { useRepository } from '@/application/context/useRepository'
import { Sidebar } from '@/presentation/components/Layout'
import {
  Button,
  FileDropZone,
  UploadCard,
  Chip,
  ChipGroup,
  useToast,
  SettingsModal,
  ValidationModal,
  ImportProgressBar,
  ImportProgressSteps,
  ImportSummaryCard,
  MonthSelector,
  DiffConfirmModal,
} from '@/presentation/components/common'
import type { ImportStage, DiffConfirmResult } from '@/presentation/components/common'
import type { ImportSummary } from '@/application/usecases/import'
import type { DataType } from '@/domain/models'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { useDataSummary } from '@/application/hooks/useDataSummary'
import {
  UploadGrid,
  SidebarSection,
  SectionLabel,
  SidebarActions,
  PrivacyInfoBox,
  PrivacyDot,
} from '@/presentation/components/DataManagementSidebar.styles'
import { DataEndDaySlider } from '@/presentation/components/DataEndDaySlider'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { InventorySettingsSection } from '@/presentation/components/InventorySettingsSection'

const uploadTypes: { type: DataType; label: string; multi?: boolean }[] = [
  { type: 'budget', label: '0_売上予算' },
  { type: 'classifiedSales', label: '1_分類別売上', multi: true },
  { type: 'flowers', label: '2_売上納品_花' },
  { type: 'directProduce', label: '3_売上納品_産直' },
  { type: 'interStoreOut', label: '4_店間出' },
  { type: 'interStoreIn', label: '5_店間入' },
  { type: 'purchase', label: '6_仕入' },
  { type: 'categoryTimeSales', label: '7.分類別時間帯売上', multi: true },
  { type: 'consumables', label: '8.原価算入費', multi: true },
  { type: 'initialSettings', label: '999_初期設定' },
]

export function DataManagementSidebar({
  showSettingsExternal,
  onSettingsExternalClose,
}: {
  showSettingsExternal?: boolean
  onSettingsExternalClose?: () => void
} = {}) {
  const data = useDataStore((s) => s.data)
  const { importFiles, progress, validationMessages, pendingDiff, resolveDiff } = useImport()
  const { selectedStoreIds, stores, toggleStore, selectAllStores } = useStoreSelection()
  const { settings, updateSettings } = useSettings()
  const showToast = useToast()
  const { clearAll } = usePersistence()
  const { listMonths } = useStorageAdmin()
  const repo = useRepository()
  const { loadedTypes, maxDayByType } = useDataSummary(data)

  // 自動バックアップ: データ変更のたびにフォルダへ書き出し
  const backupTrigger = useMemo(
    () =>
      `${data.stores.size}:${data.budget.size}:${data.settings.size}:${data.classifiedSales.records.length}`,
    [data.stores.size, data.budget.size, data.settings.size, data.classifiedSales.records.length],
  )
  const autoBackup = useAutoBackup(repo, backupTrigger)

  // 自動インポート: フォルダ内のファイルを自動取込
  const handleAutoImportFiles = useCallback(
    async (files: File[]) => {
      await importFiles(files)
    },
    [importFiles],
  )
  const autoImport = useAutoImport(handleAutoImportFiles)
  const [storedMonths, setStoredMonths] = useState<readonly { year: number; month: number }[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [importStage, setImportStage] = useState<ImportStage>('idle')
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null)

  // 保存済み月リストを取得（MonthSelector のデータ有無表示用）
  useEffect(() => {
    let cancelled = false
    listMonths()
      .then((months) => {
        if (!cancelled) setStoredMonths(months)
      })
      .catch((err: unknown) => {
        console.warn('保存済み月リストの取得に失敗:', err)
      })
    return () => {
      cancelled = true
    }
  }, [listMonths, data]) // data 変更時にも再取得（インポート後に反映）

  const isSettingsOpen = showSettings || showSettingsExternal
  const closeSettings = useCallback(() => {
    setShowSettings(false)
    onSettingsExternalClose?.()
  }, [onSettingsExternalClose])

  const handleFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType) => {
      setImportStage('reading')
      setLastSummary(null)
      try {
        const summary = await importFiles(files, overrideType)
        setImportStage('validating')

        summary.results.forEach((r) => {
          if (r.ok) {
            showToast(`${r.typeName}: ${r.filename}`, 'success')
          } else {
            showToast(`${r.filename}: ${r.error}`, 'error')
          }
        })

        setImportStage('saving')
        // 保存は useImport 内で処理されるので少し待つ
        await new Promise((r) => setTimeout(r, 300))
        setImportStage('done')
        setLastSummary(summary)

        if (summary.successCount > 0) {
          setShowValidation(true)
        }

        // 完了ステージを3秒後にリセット
        setTimeout(() => setImportStage('idle'), 3000)
      } catch {
        setImportStage('idle')
      }
    },
    [importFiles, showToast],
  )

  const handleSingleFile = useCallback(
    async (files: File | File[], typeHint: DataType) => {
      const fileArray = Array.isArray(files) ? files : [files]
      await handleFiles(fileArray, typeHint)
    },
    [handleFiles],
  )

  const handleDiffConfirm = useCallback(
    (result: DiffConfirmResult) => {
      resolveDiff(result.action)
      if (result.action !== 'cancel') {
        showToast(
          result.action === 'overwrite'
            ? '新規データで上書きしました'
            : '既存データを維持し、新規分のみ追加しました',
          'success',
        )
        setShowValidation(true)
      } else {
        showToast('インポートをキャンセルしました', 'info')
      }
    },
    [resolveDiff, showToast],
  )

  const handleClearData = useCallback(async () => {
    useDataStore.getState().reset()
    useUiStore.getState().reset()
    useSettingsStore.getState().reset()
    calculationCache.clear()
    try {
      await clearAll()
      showToast('データをクリアしました', 'info')
    } catch {
      showToast('データクリアに失敗しました', 'error')
    }
  }, [clearAll, showToast])

  const daysInMonth = getDaysInMonth(settings.targetYear, settings.targetMonth)
  const detectedMaxDay = useMemo(() => detectDataMaxDay(data), [data])
  const hasNonBudgetData = detectedMaxDay > 0

  // 期間選択ストアへの双方向同期（DataEndDaySlider → periodSelectionStore）
  const setPeriod1 = usePeriodSelectionStore((s) => s.setPeriod1)
  const period1 = usePeriodSelectionStore((s) => s.selection.period1)
  const handlePeriodEndDayChange = useCallback(
    (endDay: number) => {
      setPeriod1({ ...period1, to: { ...period1.to, day: endDay } })
    },
    [setPeriod1, period1],
  )

  return (
    <>
      <Sidebar title="データ管理">
        <SidebarSection>
          <SectionLabel>対象年月</SectionLabel>
          <MonthSelector storedMonths={storedMonths} />
        </SidebarSection>

        <SidebarSection>
          <FileDropZone onFiles={handleFiles} />
          {importStage !== 'idle' && (
            <ImportProgressSteps progress={progress} stage={importStage} />
          )}
          {importStage === 'idle' && progress && <ImportProgressBar progress={progress} />}
          {lastSummary && importStage === 'idle' && (
            <ImportSummaryCard summary={lastSummary} onDismiss={() => setLastSummary(null)} />
          )}
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
                maxDay={maxDayByType.get(type)}
                onFile={handleSingleFile}
                multiple={multi}
              />
            ))}
          </UploadGrid>
          <PrivacyInfoBox>
            <PrivacyDot />
            ローカル保存 | サーバー送信なし
          </PrivacyInfoBox>
        </SidebarSection>

        {hasNonBudgetData && (
          <DataEndDaySlider
            daysInMonth={daysInMonth}
            detectedMaxDay={detectedMaxDay}
            settings={settings}
            updateSettings={updateSettings}
            onPeriodEndDayChange={handlePeriodEndDayChange}
          />
        )}

        {stores.size > 0 && (
          <SidebarSection>
            <SectionLabel>店舗選択（複数可）</SectionLabel>
            <ChipGroup>
              <Chip $active={selectedStoreIds.size === 0} onClick={selectAllStores}>
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
          <InventorySettingsSection
            stores={stores}
            settings={settings}
            settingsMap={data.settings}
          />
        )}

        <SidebarSection>
          <SidebarActions>
            <Button $variant="outline" onClick={() => setShowSettings(true)}>
              ⚙ 設定
            </Button>
            {loadedTypes.size > 0 && (
              <Button $variant="ghost" onClick={handleClearData}>
                データクリア
              </Button>
            )}
          </SidebarActions>
        </SidebarSection>
      </Sidebar>

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={closeSettings}
          autoBackup={autoBackup}
          autoImport={autoImport}
          showToast={showToast}
        />
      )}
      {pendingDiff ? (
        <DiffConfirmModal diffResult={pendingDiff.diffResult} onConfirm={handleDiffConfirm} />
      ) : showValidation && validationMessages.length > 0 ? (
        <ValidationModal messages={validationMessages} onClose={() => setShowValidation(false)} />
      ) : null}
    </>
  )
}
