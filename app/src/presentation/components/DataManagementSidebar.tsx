import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
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
} from '@/presentation/components/common'
import type { ImportStage } from '@/presentation/components/common'
import type { ImportSummary } from '@/application/usecases/import'
import { DiffConfirmModal } from '@/presentation/components/common/DiffConfirmModal'
import type { DiffConfirmResult } from '@/presentation/components/common/DiffConfirmModal'
import type { DataType } from '@/domain/models'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { useExport } from '@/application/hooks/useExport'
import { useDataSummary } from '@/application/hooks/useDataSummary'
import { TEMPLATE_TYPES, TEMPLATE_LABELS } from '@/application/ports/ExportPort'

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

const InventoryDateBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: ${({ theme }) => theme.typography.fontWeight.normal};
  margin-left: ${({ theme }) => theme.spacing[2]};
`

const InventoryAutoValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: default;
`

const InventoryDayRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const InventoryDayInput = styled.input`
  width: 56px;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  text-align: center;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

// detectDataMaxDay は @/domain/calculations/utils から import

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
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
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
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg3};
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
`

const SliderResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
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
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
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

// ─── テンプレートセクション ──────────────────────────
const TemplateSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const TemplateToggle = styled.button`
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const TemplateToggleIcon = styled.span<{ $expanded: boolean }>`
  font-size: 0.6rem;
  transition: transform 0.2s;
  transform: ${({ $expanded }) => ($expanded ? 'rotate(90deg)' : 'rotate(0deg)')};
`

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[1]};
`

const TemplateLink = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  text-align: center;
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  &:hover {
    color: ${({ theme }) => theme.colors.palette.primary};
    border-color: ${({ theme }) => theme.colors.palette.primary}40;
    background: ${({ theme }) => theme.colors.palette.primary}08;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

// ─── フォルダ連携 ──────────────────────────────────────
const FolderSyncRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const FolderName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`

const FolderStatus = styled.span<{ $ok: boolean }>`
  font-size: 0.6rem;
  color: ${({ theme, $ok }) => ($ok ? theme.colors.palette.success : theme.colors.text4)};
`

const FolderSmallBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

// ─── プライバシーインジケーター ──────────────────────
const PrivacyInfoBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

const PrivacyDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.palette.success};
  flex-shrink: 0;
`

/** フォルダ連携 API 非対応時の診断メッセージ */
function FolderSyncDiagnostic() {
  const isSecure = typeof window !== 'undefined' && window.isSecureContext
  const hasApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const inIframe = typeof window !== 'undefined' && window.self !== window.top

  return (
    <PrivacyInfoBox style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      <span>File System Access API を利用できません</span>
      {!isSecure && <span>- HTTPS または localhost でアクセスしてください</span>}
      {isSecure && !hasApi && (
        <span>- Chrome / Edge 86 以上が必要です（Firefox / Safari は非対応）</span>
      )}
      {inIframe && <span>- iframe 内では利用できません</span>}
      {isSecure && hasApi && !inIframe && (
        <span>- ブラウザのセキュリティポリシーで制限されています</span>
      )}
    </PrivacyInfoBox>
  )
}

/**
 * blur 時にのみ値を確定する数値入力コンポーネント。
 * onChange の度に再計算が走る問題を防ぐ。
 */
function BlurCommitInput({
  value,
  onCommit,
  placeholder,
  step,
  min,
  max,
  as: Component = InventoryInput,
}: {
  value: number | null | undefined
  onCommit: (value: number | null) => void
  placeholder?: string
  step?: string
  min?: number
  max?: number
  as?: React.ComponentType<React.ComponentPropsWithRef<'input'>>
}) {
  const [local, setLocal] = useState(value ?? '')
  const [prevValue, setPrevValue] = useState(value)

  // 外部（ストア）からの値変更を同期（React 推奨パターン: render 中の状態リセット）
  if (prevValue !== value) {
    setPrevValue(value)
    setLocal(value ?? '')
  }

  const commit = useCallback(() => {
    const str = String(local).trim()
    let parsed: number | null = str === '' ? null : Number(str)
    if (parsed != null && isNaN(parsed)) parsed = null
    if (parsed != null && min != null) parsed = Math.max(min, parsed)
    if (parsed != null && max != null) parsed = Math.min(max, parsed)
    onCommit(parsed)
    // clamp 後の値で表示を更新
    setLocal(parsed ?? '')
    setPrevValue(parsed)
  }, [local, onCommit, min, max])

  return (
    <Component
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={local}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
    />
  )
}

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

function TemplateSectionCollapsible() {
  const [expanded, setExpanded] = useState(false)
  const { downloadTemplate } = useExport()

  return (
    <SidebarSection>
      <TemplateToggle onClick={() => setExpanded((p) => !p)}>
        <TemplateToggleIcon $expanded={expanded}>&#9654;</TemplateToggleIcon>
        テンプレート
      </TemplateToggle>
      {expanded && (
        <TemplateSection>
          <TemplateGrid>
            {TEMPLATE_TYPES.map((type) => (
              <TemplateLink key={type} onClick={() => downloadTemplate(type)}>
                {TEMPLATE_LABELS[type]}
              </TemplateLink>
            ))}
          </TemplateGrid>
        </TemplateSection>
      )}
    </SidebarSection>
  )
}

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
      .catch(() => {
        /* ignore */
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
  const currentEndDay =
    settings.dataEndDay != null ? Math.min(settings.dataEndDay, daysInMonth) : daysInMonth

  // スライダー操作時にローカル状態で即座にUIを更新し、
  // 実際の設定更新はデバウンスして高速操作時の計算連発を防止
  const [localEndDay, setLocalEndDay] = useState(currentEndDay)
  const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    setLocalEndDay(currentEndDay)
  }, [currentEndDay])
  const debouncedUpdateEndDay = useCallback(
    (v: number) => {
      setLocalEndDay(v)
      clearTimeout(sliderTimerRef.current)
      sliderTimerRef.current = setTimeout(() => {
        updateSettings({ dataEndDay: v === daysInMonth ? null : v })
      }, 150)
    },
    [updateSettings, daysInMonth],
  )
  // クリーンアップ
  useEffect(() => () => clearTimeout(sliderTimerRef.current), [])

  const sliderPct = ((localEndDay - 1) / (daysInMonth - 1)) * 100

  // loadedTypes, maxDayByType は useDataSummary から取得済み

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

        <TemplateSectionCollapsible />

        <SidebarSection>
          <SectionLabel>フォルダ連携</SectionLabel>
          {autoBackup.supported ? (
            <>
              {/* 自動バックアップ */}
              <FolderSyncRow>
                <FolderStatus $ok={autoBackup.folderConfigured}>
                  {autoBackup.folderConfigured ? 'ON' : 'OFF'}
                </FolderStatus>
                {autoBackup.folderConfigured ? (
                  <>
                    <FolderName title={autoBackup.folderName ?? undefined}>
                      {autoBackup.folderName}
                    </FolderName>
                    <FolderSmallBtn
                      onClick={() => {
                        autoBackup.backupNow().then((f) => {
                          if (f) showToast(`バックアップ: ${f}`, 'success')
                        })
                      }}
                      disabled={autoBackup.isBacking}
                    >
                      {autoBackup.isBacking ? '...' : '保存'}
                    </FolderSmallBtn>
                    <FolderSmallBtn onClick={() => autoBackup.clearFolder()}>解除</FolderSmallBtn>
                  </>
                ) : (
                  <FolderSmallBtn onClick={() => autoBackup.selectFolder()}>
                    バックアップ先を選択
                  </FolderSmallBtn>
                )}
              </FolderSyncRow>
              {autoBackup.lastBackupAt && (
                <FolderStatus $ok>
                  最終: {new Date(autoBackup.lastBackupAt).toLocaleTimeString()}
                </FolderStatus>
              )}
              {autoBackup.error && <FolderStatus $ok={false}>{autoBackup.error}</FolderStatus>}

              {/* 自動インポート */}
              <FolderSyncRow>
                <FolderStatus $ok={autoImport.folderConfigured}>
                  {autoImport.folderConfigured ? 'ON' : 'OFF'}
                </FolderStatus>
                {autoImport.folderConfigured ? (
                  <>
                    <FolderName title={autoImport.folderName ?? undefined}>
                      {autoImport.folderName}
                    </FolderName>
                    <FolderSmallBtn
                      onClick={() => {
                        autoImport.scanNow().then((files) => {
                          if (files.length > 0) {
                            showToast(`${files.length}件取込`, 'success')
                          } else {
                            showToast('新規ファイルなし', 'info')
                          }
                        })
                      }}
                      disabled={autoImport.isScanning}
                    >
                      {autoImport.isScanning ? '...' : 'スキャン'}
                    </FolderSmallBtn>
                    <FolderSmallBtn onClick={() => autoImport.clearFolder()}>解除</FolderSmallBtn>
                  </>
                ) : (
                  <FolderSmallBtn onClick={() => autoImport.selectFolder()}>
                    取込元を選択
                  </FolderSmallBtn>
                )}
              </FolderSyncRow>
              {autoImport.folderConfigured && (
                <FolderSyncRow>
                  <FolderSmallBtn
                    onClick={() => autoImport.setAutoSync(!autoImport.autoSyncEnabled)}
                    style={{
                      background: autoImport.autoSyncEnabled ? '#22c55e20' : undefined,
                      borderColor: autoImport.autoSyncEnabled ? '#22c55e60' : undefined,
                    }}
                  >
                    {autoImport.autoSyncEnabled ? '自動同期 ON' : '自動同期 OFF'}
                  </FolderSmallBtn>
                  {autoImport.autoSyncEnabled && <FolderStatus $ok>5分間隔</FolderStatus>}
                </FolderSyncRow>
              )}
              {autoImport.lastScanAt && (
                <FolderStatus $ok={autoImport.lastImportCount > 0}>
                  最終スキャン: {new Date(autoImport.lastScanAt).toLocaleTimeString()} (
                  {autoImport.lastImportCount}件)
                </FolderStatus>
              )}
              {autoImport.error && <FolderStatus $ok={false}>{autoImport.error}</FolderStatus>}
            </>
          ) : (
            <FolderSyncDiagnostic />
          )}
        </SidebarSection>

        {hasNonBudgetData && (
          <SidebarSection>
            <SectionLabel>取込データ有効期間</SectionLabel>
            <SliderSection>
              <SliderHeader>
                <SliderLabel>
                  {localEndDay}日 / {daysInMonth}日
                </SliderLabel>
                {detectedMaxDay > 0 && <DetectedDayHint>検出: {detectedMaxDay}日</DetectedDayHint>}
                {localEndDay !== detectedMaxDay && detectedMaxDay > 0 && (
                  <SliderResetBtn
                    onClick={() => {
                      clearTimeout(sliderTimerRef.current)
                      updateSettings({
                        dataEndDay: detectedMaxDay >= daysInMonth ? null : detectedMaxDay,
                      })
                    }}
                  >
                    リセット
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
                  value={localEndDay}
                  onChange={(e) => debouncedUpdateEndDay(Number(e.target.value))}
                />
              </SliderTrackWrap>
              <SliderNumRow>
                <SliderNumUnit>有効末日:</SliderNumUnit>
                <SliderNumInput
                  type="number"
                  min={1}
                  max={daysInMonth}
                  value={localEndDay}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!isNaN(v) && v >= 1 && v <= daysInMonth) {
                      debouncedUpdateEndDay(v)
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
          <SidebarSection>
            <SectionLabel>
              在庫設定
              {(() => {
                const firstCfg = data.settings.values().next().value
                return firstCfg?.inventoryDate ? (
                  <InventoryDateBadge>{firstCfg.inventoryDate} 時点</InventoryDateBadge>
                ) : null
              })()}
            </SectionLabel>
            <InventoryInputGroup>
              {Array.from(stores.values()).map((s) => {
                const cfg = data.settings.get(s.id)
                const autoClosing =
                  cfg?.productInventory != null || cfg?.costInclusionInventory != null
                    ? (cfg.productInventory ?? 0) + (cfg.costInclusionInventory ?? 0)
                    : null
                const daysInMo = getDaysInMonth(settings.targetYear, settings.targetMonth)
                return (
                  <StoreInventoryBlock key={s.id}>
                    <StoreInventoryTitle>{s.name}</StoreInventoryTitle>
                    <InventoryRow>
                      <InventoryLabel>機首在庫</InventoryLabel>
                      <BlurCommitInput
                        value={cfg?.openingInventory}
                        placeholder="機首在庫"
                        onCommit={(val) => {
                          useDataStore.getState().updateInventory(s.id, { openingInventory: val })
                          calculationCache.clear()
                          useUiStore.getState().invalidateCalculation()
                        }}
                      />
                    </InventoryRow>
                    <InventoryRow>
                      <InventoryLabel>商品在庫</InventoryLabel>
                      <BlurCommitInput
                        value={cfg?.productInventory}
                        placeholder="商品在庫"
                        onCommit={(val) => {
                          useDataStore.getState().updateInventory(s.id, { productInventory: val })
                          calculationCache.clear()
                          useUiStore.getState().invalidateCalculation()
                        }}
                      />
                    </InventoryRow>
                    <InventoryRow>
                      <InventoryLabel>原価算入費</InventoryLabel>
                      <BlurCommitInput
                        value={cfg?.costInclusionInventory}
                        placeholder="原価算入費在庫"
                        onCommit={(val) => {
                          useDataStore
                            .getState()
                            .updateInventory(s.id, { costInclusionInventory: val })
                          calculationCache.clear()
                          useUiStore.getState().invalidateCalculation()
                        }}
                      />
                    </InventoryRow>
                    <InventoryRow>
                      <InventoryLabel>期末在庫</InventoryLabel>
                      <InventoryAutoValue>
                        {autoClosing != null
                          ? autoClosing.toLocaleString()
                          : (cfg?.closingInventory?.toLocaleString() ?? '—')}
                      </InventoryAutoValue>
                    </InventoryRow>
                    <InventoryDayRow>
                      <InventoryLabel>期末日</InventoryLabel>
                      <BlurCommitInput
                        as={InventoryDayInput}
                        value={cfg?.closingInventoryDay}
                        placeholder="末日"
                        min={1}
                        max={daysInMo}
                        onCommit={(val) => {
                          useDataStore
                            .getState()
                            .updateInventory(s.id, { closingInventoryDay: val })
                          calculationCache.clear()
                          useUiStore.getState().invalidateCalculation()
                        }}
                      />
                      <InventoryLabel style={{ minWidth: 'auto' }}>日</InventoryLabel>
                    </InventoryDayRow>
                    <InventoryRow>
                      <InventoryLabel>花掛率%</InventoryLabel>
                      <BlurCommitInput
                        value={cfg?.flowerCostRate != null ? cfg.flowerCostRate * 100 : null}
                        step="any"
                        placeholder={`${settings.flowerCostRate * 100}`}
                        onCommit={(val) => {
                          const rate = val != null ? val / 100 : undefined
                          useDataStore.getState().updateInventory(s.id, { flowerCostRate: rate })
                        }}
                      />
                    </InventoryRow>
                    <InventoryRow>
                      <InventoryLabel>産直掛率%</InventoryLabel>
                      <BlurCommitInput
                        value={
                          cfg?.directProduceCostRate != null
                            ? cfg.directProduceCostRate * 100
                            : null
                        }
                        step="any"
                        placeholder={`${settings.directProduceCostRate * 100}`}
                        onCommit={(val) => {
                          const rate = val != null ? val / 100 : undefined
                          useDataStore
                            .getState()
                            .updateInventory(s.id, { directProduceCostRate: rate })
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
        <SettingsModal settings={settings} onSave={updateSettings} onClose={closeSettings} />
      )}
      {pendingDiff ? (
        <DiffConfirmModal diffResult={pendingDiff.diffResult} onConfirm={handleDiffConfirm} />
      ) : showValidation && validationMessages.length > 0 ? (
        <ValidationModal messages={validationMessages} onClose={() => setShowValidation(false)} />
      ) : null}
    </>
  )
}
