/**
 * @responsibility R:unclassified
 */

import { useState, useCallback } from 'react'
import { useRepository } from '@/application/context/useRepository'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { clearAllData } from '@/application/usecases'
import { calculationCache } from '@/application/services/calculationCache'
import {
  Section,
  SectionTitle,
  HelpText,
  SubSection,
  ActionButton,
  ConfirmOverlay,
  ConfirmDialog,
  ConfirmTitle,
  ConfirmMessage,
  ConfirmDetail,
  ConfirmDetailRow,
  ConfirmWarning,
  ConfirmActions,
  CancelButton,
  ConfirmDeleteButton,
} from './StorageManagementTab.styles'

interface ClearAllDataSectionProps {
  readonly monthCount: number
  readonly totalRecords: number
  readonly onComplete: () => Promise<void>
}

export function ClearAllDataSection({
  monthCount,
  totalRecords,
  onComplete,
}: ClearAllDataSectionProps) {
  const repo = useRepository()
  const [showConfirm, setShowConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleClearAll = useCallback(async () => {
    setClearing(true)
    try {
      await clearAllData({
        repo,
        resetDataStore: () => useDataStore.getState().reset(),
        resetUiTransientState: () => useUiStore.getState().resetTransientState(),
        resetSettingsStore: () => useSettingsStore.getState().reset(),
        clearCalculationCache: () => calculationCache.clear(),
      })
      setShowConfirm(false)
      await onComplete()
    } catch {
      // ignore
    } finally {
      setClearing(false)
    }
  }, [repo, onComplete])

  return (
    <>
      <Section>
        <SectionTitle>全データ削除</SectionTitle>
        <HelpText>
          全月の保存データ・設定・計算キャッシュを完全に削除します。この操作は取り消せません。
        </HelpText>
        <SubSection>
          <ActionButton
            $variant="danger"
            onClick={() => setShowConfirm(true)}
            disabled={monthCount === 0}
          >
            全データを削除
          </ActionButton>
        </SubSection>
      </Section>

      {showConfirm && (
        <ConfirmOverlay onClick={() => !clearing && setShowConfirm(false)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle>全データ削除の確認</ConfirmTitle>
            <ConfirmMessage>
              全月の保存データ・設定・計算キャッシュを完全に削除します。
            </ConfirmMessage>
            <ConfirmDetail>
              <ConfirmDetailRow>
                <span>対象月数</span>
                <span>{monthCount} 月分</span>
              </ConfirmDetailRow>
              <ConfirmDetailRow>
                <span>総レコード数</span>
                <span>{totalRecords.toLocaleString()} 件</span>
              </ConfirmDetailRow>
            </ConfirmDetail>
            <ConfirmWarning>この操作は取り消せません。</ConfirmWarning>
            <ConfirmActions>
              <CancelButton onClick={() => setShowConfirm(false)} disabled={clearing}>
                キャンセル
              </CancelButton>
              <ConfirmDeleteButton onClick={handleClearAll} disabled={clearing}>
                {clearing ? '削除中...' : '全データを削除する'}
              </ConfirmDeleteButton>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </>
  )
}
