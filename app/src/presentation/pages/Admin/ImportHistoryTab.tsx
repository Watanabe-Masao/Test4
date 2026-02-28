import { useState, useCallback, useMemo, useEffect } from 'react'
import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import { useAppData } from '@/application/context'
import { useSettings } from '@/application/hooks'
import { useRepository } from '@/application/context/useRepository'
import type { ImportHistoryEntry } from '@/domain/models'
import { useDataSummary, type StoreDayStats } from '@/application/hooks/useDataSummary'
import { Modal } from '@/presentation/components/common/Modal'
import {
  Section,
  SectionTitle,
  Table,
  Th,
  Td,
  EmptyState,
  Badge,
  StoreIdBadge,
  HelpText,
} from './AdminShared'

// ─── 取込状況ヘルパー ──────────────────────────────────
// StoreDayStats, analyzeStoreDayRecord, analyzeClassifiedSales, buildDataOverview は
// application/services/dataSummary.ts に移動済み。useDataSummary フック経由で利用する。

// ─── Styled Components ───────────────────────────────────────

const DetailRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
`

const DetailCell = styled.td`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[8]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 0 ${({ theme }) => theme.spacing[1]};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

const ProgressBarContainer = styled.div`
  width: 60px;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-left: ${({ theme }) => theme.spacing[2]};
`

const ProgressBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.3s;
`

const ValidationSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`

const ValidationItem = styled.div<{ $level: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ $level }) =>
    $level === 'error'
      ? 'rgba(239,68,68,0.1)'
      : $level === 'warning'
        ? 'rgba(245,158,11,0.1)'
        : 'rgba(59,130,246,0.1)'};
  color: ${({ $level }) =>
    $level === 'error'
      ? palette.dangerDark
      : $level === 'warning'
        ? palette.warningDark
        : palette.blueDark};
`

const ValidationIcon = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: center;
`

const SummaryValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const SummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

// ─── クリック可能なバッジ ─────────────────────────────────

const ClickableBadge = styled(Badge)<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: opacity 0.15s;
  ${({ $clickable }) => $clickable && '&:hover { opacity: 0.7; }'}
`

// ─── インポート出所モーダル ──────────────────────────────

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  max-height: 400px;
  overflow-y: auto;
`

const HistoryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
`

const HistoryTimestamp = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const HistoryFileList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing[5]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.8;
`

const HistoryFileBadge = styled.span`
  display: inline-block;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ theme }) => `${theme.colors.palette.primary}15`};
  color: ${({ theme }) => theme.colors.palette.primary};
  margin-left: ${({ theme }) => theme.spacing[2]};
`

const DataVerifySection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const DataVerifyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const DataVerifyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const DataVerifyLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
`

const DataVerifyValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  text-align: right;
`

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${y}/${mo}/${day} ${h}:${mi}`
  } catch {
    return iso
  }
}

function ImportProvenanceModal({
  history,
  dataStats,
  onClose,
}: {
  history: readonly ImportHistoryEntry[]
  dataStats: StoreDayStats
  onClose: () => void
}) {
  return (
    <Modal title={`${dataStats.label} — 取込情報`} onClose={onClose}>
      {/* データ内容サマリー */}
      <DataVerifySection>
        <DataVerifyTitle>データ内容</DataVerifyTitle>
        <DataVerifyGrid>
          <DataVerifyLabel>店舗数</DataVerifyLabel>
          <DataVerifyValue>{dataStats.storeCount}</DataVerifyValue>
          <DataVerifyLabel>レコード数</DataVerifyLabel>
          <DataVerifyValue>{dataStats.totalRecords.toLocaleString()}</DataVerifyValue>
          <DataVerifyLabel>日付範囲</DataVerifyLabel>
          <DataVerifyValue>
            {dataStats.dayRange
              ? `${dataStats.dayRange.min}日 〜 ${dataStats.dayRange.max}日`
              : '-'}
          </DataVerifyValue>
        </DataVerifyGrid>
        {dataStats.perStore.length > 0 && (
          <Table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <Th>店舗</Th>
                <Th>日数</Th>
                <Th>範囲</Th>
              </tr>
            </thead>
            <tbody>
              {dataStats.perStore.map((ps) => (
                <tr key={ps.storeId}>
                  <Td style={{ fontSize: '0.75rem' }}>{ps.storeName}</Td>
                  <Td style={{ fontSize: '0.75rem' }}>{ps.days}日分</Td>
                  <Td style={{ fontSize: '0.75rem' }}>
                    {ps.minDay}日 〜 {ps.maxDay}日
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataVerifySection>

      {/* インポート履歴 */}
      {history.length > 0 ? (
        <HistoryList>
          {history.map((entry, i) => (
            <HistoryCard key={i}>
              <HistoryTimestamp>
                {formatTimestamp(entry.importedAt)}
                <Badge $color={palette.successDark} style={{ marginLeft: 8 }}>
                  {entry.successCount}件成功
                </Badge>
                {entry.failureCount > 0 && (
                  <Badge $color={palette.dangerDark} style={{ marginLeft: 4 }}>
                    {entry.failureCount}件失敗
                  </Badge>
                )}
              </HistoryTimestamp>
              <HistoryFileList>
                {entry.files.map((f, j) => (
                  <li key={j}>
                    {f.filename}
                    {f.typeName && <HistoryFileBadge>{f.typeName}</HistoryFileBadge>}
                    {f.rowCount != null && (
                      <span style={{ opacity: 0.6, marginLeft: 6 }}>{f.rowCount}行</span>
                    )}
                  </li>
                ))}
              </HistoryFileList>
            </HistoryCard>
          ))}
        </HistoryList>
      ) : (
        <EmptyState>インポート履歴がありません</EmptyState>
      )}
    </Modal>
  )
}

// ─── インポート履歴タブ ────────────────────────────────
export function ImportHistoryTab() {
  const { data, validationMessages } = useAppData()
  const { settings } = useSettings()
  const repo = useRepository()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([])
  const [provenanceTarget, setProvenanceTarget] = useState<StoreDayStats | null>(null)

  // インポート履歴を読み込む
  useEffect(() => {
    if (!repo.isAvailable()) return
    repo
      .loadImportHistory(settings.targetYear, settings.targetMonth)
      .then(setImportHistory)
      .catch(() => {})
  }, [repo, settings.targetYear, settings.targetMonth, data])

  const toggleExpand = useCallback((label: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  const handleBadgeClick = useCallback((e: React.MouseEvent, stats: StoreDayStats) => {
    e.stopPropagation()
    if (stats.storeCount > 0) {
      setProvenanceTarget(stats)
    }
  }, [])

  const {
    dataOverview: overview,
    categoryTimeSalesStats,
    prevYearCategoryTimeSalesStats,
  } = useDataSummary(data)

  // サマリー統計
  const loadedCount = overview.filter((d) => d.storeCount > 0).length
  const totalStores = data.stores.size
  const totalRecords = overview.reduce((s, d) => s + d.totalRecords, 0)
  const hasCustomerData = overview.some((d) => d.hasCustomers)

  // Map系データ
  const mapOverview = [
    { label: '在庫設定', count: data.settings.size },
    { label: '予算', count: data.budget.size },
  ]

  // 全体の最大日数レンジ（品質スコア用）
  const salesDayRange = overview.find((d) => d.label === '分類別売上')?.dayRange
  const daysInMonth = salesDayRange ? salesDayRange.max : 28

  // 特殊データの StoreDayStats（モーダル用）
  const ctsStats: StoreDayStats = useMemo(
    () => ({
      label: '分類別時間帯売上',
      storeCount: categoryTimeSalesStats.storeCount,
      totalRecords: categoryTimeSalesStats.recordCount,
      dayRange: categoryTimeSalesStats.dayRange,
      perStore: [],
      hasCustomers: false,
    }),
    [categoryTimeSalesStats],
  )

  const prevYearCTSStats: StoreDayStats = useMemo(
    () => ({
      label: '前年分類別時間帯売上',
      storeCount: prevYearCategoryTimeSalesStats.storeCount,
      totalRecords: prevYearCategoryTimeSalesStats.recordCount,
      dayRange: prevYearCategoryTimeSalesStats.dayRange,
      perStore: [],
      hasCustomers: false,
    }),
    [prevYearCategoryTimeSalesStats],
  )

  return (
    <>
      {/* サマリーカード */}
      <Section>
        <SectionTitle>データ概要</SectionTitle>
        <SummaryGrid>
          <SummaryCard>
            <SummaryValue>{totalStores}</SummaryValue>
            <SummaryLabel>登録店舗数</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>
              {loadedCount}
              <span style={{ fontSize: '0.6em', opacity: 0.6 }}> / {overview.length + 2 + 2}</span>
            </SummaryValue>
            <SummaryLabel>取込済データ種別</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>{totalRecords.toLocaleString()}</SummaryValue>
            <SummaryLabel>総レコード数</SummaryLabel>
          </SummaryCard>
          <SummaryCard>
            <SummaryValue>
              <Badge $color={hasCustomerData ? palette.successDark : undefined}>
                {hasCustomerData ? '有' : '無'}
              </Badge>
            </SummaryValue>
            <SummaryLabel>客数データ</SummaryLabel>
          </SummaryCard>
        </SummaryGrid>
      </Section>

      {/* 詳細テーブル */}
      <Section>
        <SectionTitle>日別データ取込状況</SectionTitle>
        <HelpText>店舗×日単位のデータです。行をクリックで店舗別の詳細を展開できます。</HelpText>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 30 }}></Th>
              <Th>データ種別</Th>
              <Th>状態</Th>
              <Th>店舗数</Th>
              <Th>レコード数</Th>
              <Th>日付範囲</Th>
              <Th>品質</Th>
            </tr>
          </thead>
          <tbody>
            {overview.map((d) => {
              const isExpanded = expandedRows.has(d.label)
              const loaded = d.storeCount > 0
              // 品質: 各店舗のカバー率（日数 / daysInMonth）の平均
              const quality =
                loaded && daysInMonth > 0
                  ? Math.round(
                      d.perStore.reduce((s, p) => s + (p.days / daysInMonth) * 100, 0) /
                        d.perStore.length,
                    )
                  : 0
              const qualityColor =
                quality >= 80
                  ? palette.successDark
                  : quality >= 50
                    ? palette.warningDark
                    : palette.dangerDark

              return (
                <>
                  <tr
                    key={d.label}
                    style={{ cursor: loaded ? 'pointer' : 'default' }}
                    onClick={() => loaded && toggleExpand(d.label)}
                  >
                    <Td>
                      {loaded && (
                        <ExpandButton
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpand(d.label)
                          }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </ExpandButton>
                      )}
                    </Td>
                    <Td>
                      {d.label}
                      {d.hasCustomers && (
                        <Badge $color={palette.successDark} style={{ marginLeft: 6 }}>
                          客数
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <ClickableBadge
                        $color={loaded ? palette.infoDark : undefined}
                        $clickable={loaded}
                        onClick={(e) => handleBadgeClick(e, d)}
                        title={loaded ? 'クリックで取込情報を表示' : undefined}
                      >
                        {loaded ? '取込済' : '未取込'}
                      </ClickableBadge>
                    </Td>
                    <Td>{loaded ? d.storeCount : '-'}</Td>
                    <Td>{loaded ? d.totalRecords.toLocaleString() : '-'}</Td>
                    <Td>{d.dayRange ? `${d.dayRange.min}日 〜 ${d.dayRange.max}日` : '-'}</Td>
                    <Td>
                      {loaded ? (
                        <>
                          <StoreIdBadge>{quality}%</StoreIdBadge>
                          <ProgressBarContainer>
                            <ProgressBarFill $pct={quality} $color={qualityColor} />
                          </ProgressBarContainer>
                        </>
                      ) : (
                        '-'
                      )}
                    </Td>
                  </tr>
                  {isExpanded &&
                    d.perStore.map((ps) => (
                      <DetailRow key={`${d.label}-${ps.storeId}`}>
                        <DetailCell></DetailCell>
                        <DetailCell colSpan={2}>
                          <StoreIdBadge>{ps.storeId}</StoreIdBadge> {ps.storeName}
                        </DetailCell>
                        <DetailCell>{ps.days}日分</DetailCell>
                        <DetailCell>
                          {ps.minDay}日 〜 {ps.maxDay}日
                        </DetailCell>
                        <DetailCell>
                          {(() => {
                            const pct =
                              daysInMonth > 0 ? Math.round((ps.days / daysInMonth) * 100) : 0
                            const c =
                              pct >= 80
                                ? palette.successDark
                                : pct >= 50
                                  ? palette.warningDark
                                  : palette.dangerDark
                            return (
                              <>
                                <StoreIdBadge>{pct}%</StoreIdBadge>
                                <ProgressBarContainer>
                                  <ProgressBarFill $pct={pct} $color={c} />
                                </ProgressBarContainer>
                              </>
                            )
                          })()}
                        </DetailCell>
                        <DetailCell></DetailCell>
                      </DetailRow>
                    ))}
                </>
              )
            })}
          </tbody>
        </Table>
      </Section>

      {/* 設定系・特殊データ */}
      <Section>
        <SectionTitle>設定・特殊データ取込状況</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>データ種別</Th>
              <Th>状態</Th>
              <Th>件数</Th>
              <Th>詳細</Th>
            </tr>
          </thead>
          <tbody>
            {mapOverview.map((d) => (
              <tr key={d.label}>
                <Td>{d.label}</Td>
                <Td>
                  <Badge $color={d.count > 0 ? palette.infoDark : undefined}>
                    {d.count > 0 ? '取込済' : '未取込'}
                  </Badge>
                </Td>
                <Td>{d.count > 0 ? `${d.count}店舗` : '-'}</Td>
                <Td>-</Td>
              </tr>
            ))}
            <tr>
              <Td>分類別時間帯売上</Td>
              <Td>
                <ClickableBadge
                  $color={categoryTimeSalesStats.recordCount > 0 ? palette.infoDark : undefined}
                  $clickable={categoryTimeSalesStats.recordCount > 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (categoryTimeSalesStats.recordCount > 0) setProvenanceTarget(ctsStats)
                  }}
                  title={
                    categoryTimeSalesStats.recordCount > 0 ? 'クリックで取込情報を表示' : undefined
                  }
                >
                  {categoryTimeSalesStats.recordCount > 0 ? '取込済' : '未取込'}
                </ClickableBadge>
              </Td>
              <Td>
                {categoryTimeSalesStats.recordCount > 0
                  ? `${categoryTimeSalesStats.recordCount.toLocaleString()}件`
                  : '-'}
              </Td>
              <Td>
                {categoryTimeSalesStats.recordCount > 0 ? (
                  <>
                    <StoreIdBadge>{categoryTimeSalesStats.storeCount}店舗</StoreIdBadge>
                    {categoryTimeSalesStats.dayRange && (
                      <span style={{ marginLeft: 8, fontSize: '0.8em', opacity: 0.7 }}>
                        {categoryTimeSalesStats.dayRange.min}日 〜{' '}
                        {categoryTimeSalesStats.dayRange.max}日
                      </span>
                    )}
                  </>
                ) : (
                  '-'
                )}
              </Td>
            </tr>
            <tr>
              <Td>前年分類別時間帯売上</Td>
              <Td>
                <ClickableBadge
                  $color={
                    prevYearCategoryTimeSalesStats.recordCount > 0 ? palette.infoDark : undefined
                  }
                  $clickable={prevYearCategoryTimeSalesStats.recordCount > 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (prevYearCategoryTimeSalesStats.recordCount > 0)
                      setProvenanceTarget(prevYearCTSStats)
                  }}
                  title={
                    prevYearCategoryTimeSalesStats.recordCount > 0
                      ? 'クリックで取込情報を表示'
                      : undefined
                  }
                >
                  {prevYearCategoryTimeSalesStats.recordCount > 0 ? '取込済' : '未取込'}
                </ClickableBadge>
              </Td>
              <Td>
                {prevYearCategoryTimeSalesStats.recordCount > 0
                  ? `${prevYearCategoryTimeSalesStats.recordCount.toLocaleString()}件`
                  : '-'}
              </Td>
              <Td>
                {prevYearCategoryTimeSalesStats.recordCount > 0 ? (
                  <>
                    <StoreIdBadge>{prevYearCategoryTimeSalesStats.storeCount}店舗</StoreIdBadge>
                    {prevYearCategoryTimeSalesStats.dayRange && (
                      <span style={{ marginLeft: 8, fontSize: '0.8em', opacity: 0.7 }}>
                        {prevYearCategoryTimeSalesStats.dayRange.min}日 〜{' '}
                        {prevYearCategoryTimeSalesStats.dayRange.max}日
                      </span>
                    )}
                  </>
                ) : (
                  '-'
                )}
              </Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      {/* バリデーションメッセージ */}
      {validationMessages.length > 0 && (
        <Section>
          <SectionTitle>
            バリデーション結果
            <Badge
              $color={
                validationMessages.some((m) => m.level === 'error')
                  ? palette.dangerDark
                  : palette.warningDark
              }
              style={{ marginLeft: 8 }}
            >
              {validationMessages.length}件
            </Badge>
          </SectionTitle>
          <ValidationSection>
            {validationMessages.map((msg, i) => (
              <ValidationItem key={i} $level={msg.level}>
                <ValidationIcon>
                  {msg.level === 'error' ? '!!' : msg.level === 'warning' ? '!' : 'i'}
                </ValidationIcon>
                <div>
                  <div>{msg.message}</div>
                  {msg.details && msg.details.length > 0 && (
                    <div style={{ marginTop: 2, opacity: 0.8 }}>
                      {msg.details.map((d, j) => (
                        <div key={j}>{d}</div>
                      ))}
                    </div>
                  )}
                </div>
              </ValidationItem>
            ))}
          </ValidationSection>
        </Section>
      )}

      {/* 取込出所モーダル */}
      {provenanceTarget && (
        <ImportProvenanceModal
          history={importHistory}
          dataStats={provenanceTarget}
          onClose={() => setProvenanceTarget(null)}
        />
      )}
    </>
  )
}
