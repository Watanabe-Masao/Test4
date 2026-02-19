import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useAppData, useAppDispatch } from '@/application/context'
import { useImport, useStoreSelection, useSettings } from '@/application/hooks'
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
} from '@/presentation/components/common'
import { DiffConfirmModal } from '@/presentation/components/common/DiffConfirmModal'
import type { DiffConfirmResult } from '@/presentation/components/common/DiffConfirmModal'
import type { DataType, ImportedData, StoreDayRecord } from '@/domain/models'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { clearAllData } from '@/infrastructure/storage/IndexedDBStore'

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

/** StoreDayRecord から最大日を取得 */
function maxDayOf(record: StoreDayRecord<unknown>): number {
  let max = 0
  for (const storeId of Object.keys(record)) {
    for (const dayStr of Object.keys(record[storeId])) {
      const d = Number(dayStr)
      if (d > max) max = d
    }
  }
  return max
}

/** 予算以外の取込データの最大日を検出 */
function detectDataMaxDay(data: ImportedData): number {
  return Math.max(
    0,
    maxDayOf(data.purchase),
    maxDayOf(data.sales),
    maxDayOf(data.discount),
    maxDayOf(data.interStoreIn),
    maxDayOf(data.interStoreOut),
    maxDayOf(data.flowers),
    maxDayOf(data.directProduce),
    maxDayOf(data.consumables),
  )
}

// ─── DataEndDay スライダー styled ──────────────────────
const SliderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const SliderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SliderLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
`

const SliderTrackWrap = styled.div`
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
`

const SliderTrack = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
`

const SliderActive = styled.div<{ $width: number }>`
  position: absolute;
  left: 0;
  width: ${({ $width }) => $width}%;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.6;
`

const SliderInput = styled.input`
  position: absolute;
  width: 100%;
  height: 24px;
  appearance: none;
  background: transparent;
  margin: 0;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg3};
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg3};
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`

const SliderResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
`

const DetectedDayHint = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

const SliderNumRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
`

const SliderNumInput = styled.input`
  width: 42px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px 4px;
  text-align: center;
  appearance: textfield;
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const SliderNumUnit = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

const uploadTypes: { type: DataType; label: string; multi?: boolean }[] = [
  { type: 'budget', label: '0_売上予算' },
  { type: 'salesDiscount', label: '1_売上売変客数' },
  { type: 'purchase', label: '2_仕入' },
  { type: 'flowers', label: '3_花' },
  { type: 'directProduce', label: '4_産直' },
  { type: 'interStoreIn', label: '5_店間入' },
  { type: 'interStoreOut', label: '6_店間出' },
  { type: 'initialSettings', label: '7_初期設定' },
  { type: 'consumables', label: '8_消耗品', multi: true },
  { type: 'categoryTimeSales', label: '8.分類別時間帯売上', multi: true },
  { type: 'prevYearSalesDiscount', label: '998_前年売上売変客数' },
]

export function DataManagementSidebar({
  showSettingsExternal,
  onSettingsExternalClose,
}: {
  showSettingsExternal?: boolean
  onSettingsExternalClose?: () => void
} = {}) {
  const { data } = useAppData()
  const dispatch = useAppDispatch()
  const { importFiles, progress, validationMessages, pendingDiff, resolveDiff } = useImport()
  const { selectedStoreIds, stores, toggleStore, selectAllStores } = useStoreSelection()
  const { settings, updateSettings } = useSettings()
  const showToast = useToast()
  const [showSettings, setShowSettings] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  const isSettingsOpen = showSettings || showSettingsExternal
  const closeSettings = useCallback(() => {
    setShowSettings(false)
    onSettingsExternalClose?.()
  }, [onSettingsExternalClose])

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
      if (summary.successCount > 0) {
        setShowValidation(true)
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
    dispatch({ type: 'RESET' })
    try {
      await clearAllData()
      showToast('データをクリアしました', 'info')
    } catch {
      showToast('データクリアに失敗しました', 'error')
    }
  }, [dispatch, showToast])

  const daysInMonth = getDaysInMonth(settings.targetYear, settings.targetMonth)
  const detectedMaxDay = useMemo(() => detectDataMaxDay(data), [data])
  const hasNonBudgetData = detectedMaxDay > 0
  const currentEndDay = settings.dataEndDay != null
    ? Math.min(settings.dataEndDay, daysInMonth)
    : daysInMonth
  const sliderPct = ((currentEndDay - 1) / (daysInMonth - 1)) * 100

  const loadedTypes = useMemo(() => {
    const types = new Set<DataType>()
    if (Object.keys(data.purchase).length > 0) types.add('purchase')
    if (Object.keys(data.sales).length > 0) {
      types.add('sales')
      types.add('salesDiscount')
    }
    if (Object.keys(data.discount).length > 0) {
      types.add('discount')
      types.add('salesDiscount')
    }
    if (data.settings.size > 0) types.add('initialSettings')
    if (data.budget.size > 0) types.add('budget')
    if (Object.keys(data.consumables).length > 0) types.add('consumables')
    if (data.categoryTimeSales.records.length > 0) types.add('categoryTimeSales')
    if (Object.keys(data.flowers).length > 0) types.add('flowers')
    if (Object.keys(data.directProduce).length > 0) types.add('directProduce')
    if (Object.keys(data.interStoreIn).length > 0) types.add('interStoreIn')
    if (Object.keys(data.interStoreOut).length > 0) types.add('interStoreOut')
    if (Object.keys(data.prevYearSales).length > 0) types.add('prevYearSalesDiscount')
    return types
  }, [data])

  return (
    <>
      <Sidebar title="データ管理">
        <SidebarSection>
          <FileDropZone onFiles={handleFiles} />
          {progress && <ImportProgressBar progress={progress} />}
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

        {hasNonBudgetData && (
          <SidebarSection>
            <SectionLabel>取込データ有効期間</SectionLabel>
            <SliderSection>
              <SliderHeader>
                <SliderLabel>{currentEndDay}日 / {daysInMonth}日</SliderLabel>
                {detectedMaxDay > 0 && (
                  <DetectedDayHint>検出: {detectedMaxDay}日</DetectedDayHint>
                )}
                {settings.dataEndDay != null && (
                  <SliderResetBtn onClick={() => updateSettings({ dataEndDay: null })}>
                    月末まで
                  </SliderResetBtn>
                )}
              </SliderHeader>
              <SliderTrackWrap>
                <SliderTrack />
                <SliderActive $width={sliderPct} />
                <SliderInput
                  type="range"
                  min={1}
                  max={daysInMonth}
                  value={currentEndDay}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    updateSettings({ dataEndDay: v === daysInMonth ? null : v })
                  }}
                />
              </SliderTrackWrap>
              <SliderNumRow>
                <SliderNumUnit>有効末日:</SliderNumUnit>
                <SliderNumInput
                  type="number"
                  min={1}
                  max={daysInMonth}
                  value={currentEndDay}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!isNaN(v) && v >= 1 && v <= daysInMonth) {
                      updateSettings({ dataEndDay: v === daysInMonth ? null : v })
                    }
                  }}
                />
                <SliderNumUnit>日</SliderNumUnit>
              </SliderNumRow>
            </SliderSection>
          </SidebarSection>
        )}

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
                const cfg = data.settings.get(s.id)
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
        />
      )}
      {showValidation && validationMessages.length > 0 && (
        <ValidationModal
          messages={validationMessages}
          onClose={() => setShowValidation(false)}
        />
      )}
      {pendingDiff && (
        <DiffConfirmModal
          diffResult={pendingDiff.diffResult}
          onConfirm={handleDiffConfirm}
        />
      )}
    </>
  )
}
