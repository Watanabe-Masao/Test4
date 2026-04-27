/**
 * 月切替シーケンス — useMonthSwitcher から抽出した非同期手順
 *
 * 5段階: save → reset → settings → period → load
 * 各段階を個別関数化し、hook は thin wrapper として利用する。
 *
 * @responsibility R:unclassified
 */
import type { DataRepository } from '@/domain/repositories'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { invalidateAfterStateChange } from './stateInvalidation'

/** Step 1: 現在のデータを IndexedDB に保存 */
async function saveCurrentData(repo: DataRepository): Promise<void> {
  const currentMonthData = useDataStore.getState().currentMonthData
  if (!currentMonthData) return
  const { targetYear, targetMonth } = useSettingsStore.getState().settings
  const hasData =
    currentMonthData.classifiedSales.records.length > 0 ||
    currentMonthData.purchase.records.length > 0
  if (hasData && repo.isAvailable()) {
    await repo.saveMonthlyData(currentMonthData, targetYear, targetMonth)
  }
}

/** Step 2: ステートをリセット（空データ） */
function resetState(): void {
  useDataStore.getState().reset()
  invalidateAfterStateChange()
}

/** Step 3: 設定を更新（targetYear / targetMonth） */
function updateSettings(year: number, month: number): void {
  useSettingsStore.getState().updateSettings({ targetYear: year, targetMonth: month })
  invalidateAfterStateChange()
}

/** Step 4: 期間選択ストアを新しい月で初期化 */
function resetPeriodSelection(year: number, month: number): void {
  usePeriodSelectionStore.getState().resetToMonth(year, month)
}

/** Step 5: 新しい年月のデータを IndexedDB からロード */
async function loadNewMonthData(repo: DataRepository, year: number, month: number): Promise<void> {
  if (!repo.isAvailable()) return
  const monthlyData = await repo.loadMonthlyData(year, month)
  if (monthlyData) {
    useDataStore.getState().setCurrentMonthData(monthlyData)
    invalidateAfterStateChange()
  }
}

/** 月切替の全ステップを順番に実行 */
export async function executeMonthSwitch(
  repo: DataRepository,
  year: number,
  month: number,
): Promise<void> {
  await saveCurrentData(repo)
  resetState()
  updateSettings(year, month)
  resetPeriodSelection(year, month)
  await loadNewMonthData(repo, year, month)
}
