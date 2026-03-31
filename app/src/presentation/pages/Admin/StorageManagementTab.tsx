/**
 * StorageManagementTab — composition shell
 *
 * hook 呼び出しとセクション配置のみ。各セクションは独立コンポーネント。
 * section 実体は features/storage-admin に移動済み。
 */
import { useStorageAdmin } from '@/application/hooks/data'
import { useStoragePersistence } from '@/application/hooks/useStoragePersistence'
import { useBackup } from '@/application/hooks/useBackup'
import { useRepository } from '@/application/context/useRepository'
import { useStorageDuck } from '@/application/hooks/useStorageDuck'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDeviceSync } from '@/application/hooks/useDeviceSync'
import {
  useMonthDataManagement,
  StorageStatusSection,
  BackupSection,
  DeviceSyncSection,
  DuckDbCacheSection,
  MonthDataSection,
  ClearAllDataSection,
} from '@/features/storage-admin'
import { Section, SectionTitle, LoadingText } from './StorageManagementTab.styles'

export function StorageManagementTab() {
  const { loadSlice } = useStorageAdmin()
  const repo = useRepository()
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)

  const {
    status: storageStatus,
    isLoading: storageLoading,
    requestPersistence,
  } = useStoragePersistence()

  const { isExporting, isImporting, exportBackup, importBackup, previewBackup } = useBackup(repo)

  const {
    isCopied,
    importResult: syncImportResult,
    copySettingsCode,
    importFromText: importSettingsFromText,
    canShareFiles,
    shareBackupFile,
  } = useDeviceSync()

  const { rawFileGroups, canRebuild, isRebuilding, lastRebuildResult, rebuildDuckDB } =
    useStorageDuck(data, settings.targetYear, settings.targetMonth, repo)

  const {
    months,
    loading,
    expandedMonths,
    deleteTarget,
    deleting,
    loadData,
    toggleExpand,
    setDeleteTarget,
    handleDelete,
  } = useMonthDataManagement()

  if (loading) {
    return (
      <Section>
        <SectionTitle>保存データ管理</SectionTitle>
        <LoadingText>IndexedDB からデータを読み込み中...</LoadingText>
      </Section>
    )
  }

  const grandTotalRecords = months.reduce((sum, m) => sum + m.totalRecords, 0)

  return (
    <>
      <StorageStatusSection
        status={storageStatus}
        isLoading={storageLoading}
        onRequestPersistence={requestPersistence}
      />

      <BackupSection
        isExporting={isExporting}
        isImporting={isImporting}
        onExport={exportBackup}
        onImport={importBackup}
        onPreview={previewBackup}
        onImportComplete={loadData}
      />

      <DeviceSyncSection
        isCopied={isCopied}
        syncImportResult={syncImportResult}
        canShareFiles={canShareFiles}
        repo={repo}
        onCopySettingsCode={copySettingsCode}
        onImportFromText={importSettingsFromText}
        onShareBackupFile={shareBackupFile}
      />

      <DuckDbCacheSection
        canRebuild={canRebuild}
        isRebuilding={isRebuilding}
        lastRebuildResult={lastRebuildResult}
        rawFileGroups={rawFileGroups}
        onRebuild={rebuildDuckDB}
      />

      <MonthDataSection
        months={months}
        expandedMonths={expandedMonths}
        deleteTarget={deleteTarget}
        deleting={deleting}
        loadSlice={loadSlice}
        onToggleExpand={toggleExpand}
        onSetDeleteTarget={setDeleteTarget}
        onDelete={handleDelete}
      />

      <ClearAllDataSection
        monthCount={months.length}
        totalRecords={grandTotalRecords}
        onComplete={loadData}
      />
    </>
  )
}
