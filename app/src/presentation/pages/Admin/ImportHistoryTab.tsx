/**
 * @responsibility R:unclassified
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { palette } from '@/presentation/theme/tokens'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettings } from '@/application/hooks/ui'
import { useRepository } from '@/application/context/useRepository'
import type { ImportHistoryEntry } from '@/domain/models/analysis'
import { useDataSummary, type StoreDayStats } from '@/application/hooks/useDataSummary'
import { Section, SectionTitle, Table, Th, Td, Badge, StoreIdBadge, HelpText } from './AdminShared'
import {
  DetailRow,
  DetailCell,
  ExpandButton,
  ProgressBarContainer,
  ProgressBarFill,
  ValidationSection,
  ValidationItem,
  ValidationIcon,
  SummaryGrid,
  SummaryCard,
  SummaryValue,
  SummaryLabel,
  ClickableBadge,
} from './ImportHistoryTab.styles'
import { ImportProvenanceModal } from './ImportProvenanceModal'

/** データ品質スコアの色分け閾値（%） */
const QUALITY_GOOD = 80
const QUALITY_FAIR = 50

// ─── インポート履歴タブ ────────────────────────────────
export function ImportHistoryTab() {
  const current = useDataStore((s) => s.currentMonthData)
  const validationMessages = useDataStore((s) => s.validationMessages)
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
      .catch((err: unknown) => {
        console.warn('インポート履歴の読み込みに失敗:', err)
      })
  }, [repo, settings.targetYear, settings.targetMonth, current])

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
  } = useDataSummary()

  // サマリー統計
  const loadedCount = overview.filter((d) => d.storeCount > 0).length
  const totalStores = current?.stores.size ?? 0
  const totalRecords = overview.reduce((s, d) => s + d.totalRecords, 0)
  const hasCustomerData = overview.some((d) => d.hasCustomers)

  // Map系データ
  const mapOverview = [
    { label: '在庫設定', count: current?.settings.size ?? 0 },
    { label: '予算', count: current?.budget.size ?? 0 },
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
                quality >= QUALITY_GOOD
                  ? palette.successDark
                  : quality >= QUALITY_FAIR
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
                              pct >= QUALITY_GOOD
                                ? palette.successDark
                                : pct >= QUALITY_FAIR
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
