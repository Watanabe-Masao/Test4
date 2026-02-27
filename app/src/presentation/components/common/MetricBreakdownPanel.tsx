/**
 * MetricBreakdownPanel
 *
 * 指標の算出根拠を表示するモーダルパネル。
 * - 計算式
 * - 入力パラメータ（クリックで別指標へジャンプ可能）
 * - 日別内訳テーブル（ドリルダウン）
 * - データソース参照（EvidenceRef）
 */
import { useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import type { Explanation, MetricId, MetricUnit, Store } from '@/domain/models'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'

// ─── Styled Components ─────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
`

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  max-width: 640px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[6]};
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const ValueDisplay = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.palette.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const CloseButton = styled.button`
  all: unset;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text4};
  font-size: 18px;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const Section = styled.div`
  margin-top: ${({ theme }) => theme.spacing[5]};
`

const SectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
`

const FormulaBox = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.primary};
`

const InputList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const InputRow = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  ${({ $clickable, theme }) =>
    $clickable &&
    `
    &:hover {
      background: ${theme.colors.bg4};
    }
  `}
`

const InputName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
`

const InputValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

const LinkIcon = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.palette.primary};
  margin-left: ${({ theme }) => theme.spacing[1]};
`

const ScopeInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const BreadcrumbBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

const BreadcrumbLink = styled.button`
  all: unset;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.palette.primary};
  &:hover {
    text-decoration: underline;
  }
`

const BreadcrumbSep = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin: 0 2px;
`

const RelatedMetricRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const RelatedMetricName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.palette.primary};
`

const RelatedMetricValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

// ─── DrilldownTable ─────────────────────────────────────

const TableWrap = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const Th = styled.th`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: left;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    text-align: right;
  }
`

const Tr = styled.tr<{ $expandable?: boolean; $expanded?: boolean }>`
  cursor: ${({ $expandable }) => ($expandable ? 'pointer' : 'default')};
  background: ${({ $expanded, theme }) =>
    $expanded ? `${theme.colors.palette.primary}08` : 'transparent'};

  ${({ $expandable, theme }) =>
    $expandable &&
    `
    &:hover {
      background: ${theme.colors.bg4};
    }
  `}
`

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}08;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};

  &:last-child {
    text-align: right;
  }
`

const ExpandIcon = styled.span`
  font-size: 10px;
  margin-right: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text4};
`

const DetailRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
`

const DetailTd = styled.td`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  padding-left: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}04;

  &:last-child {
    text-align: right;
  }
`

const TabBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const TabButton = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}15` : 'transparent'};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const EvidenceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.palette.primary}10;
  color: ${({ theme }) => theme.colors.palette.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

// ─── Component ──────────────────────────────────────────

function formatValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'yen':
      return formatCurrency(value)
    case 'rate':
      return formatPercent(value)
    case 'count':
      return value.toLocaleString()
  }
}

type TabType = 'formula' | 'drilldown' | 'evidence'

interface MetricBreakdownPanelProps {
  explanation: Explanation
  /** 全指標の説明マップ（指標間ジャンプ用） */
  allExplanations: ReadonlyMap<MetricId, Explanation>
  /** 店舗マスタ（storeId→名前解決用） */
  stores?: ReadonlyMap<string, Store>
  onClose: () => void
}

function resolveStoreName(storeId: string, stores?: ReadonlyMap<string, Store>): string {
  if (storeId === 'aggregate') return '全店合計'
  if (!stores) return storeId
  const store = stores.get(storeId)
  return store ? `${store.name}（${store.code}）` : storeId
}

export function MetricBreakdownPanel({
  explanation,
  allExplanations,
  stores,
  onClose,
}: MetricBreakdownPanelProps) {
  const [tab, setTab] = useState<TabType>('formula')
  const [history, setHistory] = useState<MetricId[]>([explanation.metric])
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  const currentMetric = history[history.length - 1]
  const current = allExplanations.get(currentMetric) ?? explanation

  const navigateTo = useCallback(
    (metric: MetricId | undefined) => {
      if (metric && allExplanations.has(metric)) {
        setHistory((prev) => [...prev, metric])
        setTab('formula')
        setExpandedDays(new Set())
      }
    },
    [allExplanations],
  )

  const navigateBack = useCallback((index: number) => {
    setHistory((prev) => prev.slice(0, index + 1))
    setExpandedDays(new Set())
  }, [])

  const toggleDay = useCallback((day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }, [])

  // 逆リンク: この指標を入力として参照している指標
  const reverseLinks = useMemo(() => {
    const links: { metric: MetricId; title: string; value: number; unit: MetricUnit }[] = []
    for (const [metricId, exp] of allExplanations) {
      if (metricId === currentMetric) continue
      const usesThis = exp.inputs.some((inp) => inp.metric === currentMetric)
      if (usesThis) {
        links.push({ metric: metricId, title: exp.title, value: exp.value, unit: exp.unit })
      }
    }
    return links
  }, [allExplanations, currentMetric])

  const hasBreakdown = current.breakdown && current.breakdown.length > 0
  const hasEvidence = current.evidenceRefs.length > 0

  // evidence summary
  const evidenceSummary = hasEvidence
    ? Array.from(
        current.evidenceRefs.reduce((acc, ref) => {
          const dt = ref.kind === 'daily' ? ref.dataType : ref.dataType
          acc.set(dt, (acc.get(dt) ?? 0) + 1)
          return acc
        }, new Map<string, number>()),
      )
    : []

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header>
          <div>
            <Title>{current.title}</Title>
            <ValueDisplay>{formatValue(current.value, current.unit)}</ValueDisplay>
            <ScopeInfo>
              {current.scope.year}年{current.scope.month}月 /{' '}
              {resolveStoreName(current.scope.storeId, stores)}
            </ScopeInfo>
          </div>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        {/* Breadcrumb for navigation history */}
        {history.length > 1 && (
          <BreadcrumbBar>
            {history.map((id, i) => {
              const exp = allExplanations.get(id)
              const isLast = i === history.length - 1
              return (
                <span key={`${id}-${i}`}>
                  {i > 0 && <BreadcrumbSep>&gt;</BreadcrumbSep>}
                  {isLast ? (
                    <span>{exp?.title ?? id}</span>
                  ) : (
                    <BreadcrumbLink onClick={() => navigateBack(i)}>
                      {exp?.title ?? id}
                    </BreadcrumbLink>
                  )}
                </span>
              )
            })}
          </BreadcrumbBar>
        )}

        <TabBar>
          <TabButton $active={tab === 'formula'} onClick={() => setTab('formula')}>
            算出根拠
          </TabButton>
          {hasBreakdown && (
            <TabButton $active={tab === 'drilldown'} onClick={() => setTab('drilldown')}>
              日別内訳
            </TabButton>
          )}
          {hasEvidence && (
            <TabButton $active={tab === 'evidence'} onClick={() => setTab('evidence')}>
              根拠を見る
            </TabButton>
          )}
        </TabBar>

        {tab === 'formula' && (
          <>
            <Section>
              <SectionTitle>計算式</SectionTitle>
              <FormulaBox>{current.formula}</FormulaBox>
            </Section>

            <Section>
              <SectionTitle>入力パラメータ</SectionTitle>
              <InputList>
                {current.inputs.map((input, i) => (
                  <InputRow
                    key={i}
                    $clickable={!!input.metric && allExplanations.has(input.metric)}
                    onClick={() => navigateTo(input.metric)}
                  >
                    <InputName>
                      {input.name}
                      {input.metric && allExplanations.has(input.metric) && <LinkIcon>→</LinkIcon>}
                    </InputName>
                    <InputValue>{formatValue(input.value, input.unit)}</InputValue>
                  </InputRow>
                ))}
              </InputList>
            </Section>

            {reverseLinks.length > 0 && (
              <Section>
                <SectionTitle>この指標を参照している指標</SectionTitle>
                <InputList>
                  {reverseLinks.map((link) => (
                    <RelatedMetricRow key={link.metric} onClick={() => navigateTo(link.metric)}>
                      <RelatedMetricName>
                        {link.title}
                        <LinkIcon>←</LinkIcon>
                      </RelatedMetricName>
                      <RelatedMetricValue>{formatValue(link.value, link.unit)}</RelatedMetricValue>
                    </RelatedMetricRow>
                  ))}
                </InputList>
              </Section>
            )}

            {hasEvidence && (
              <Section>
                <SectionTitle>データソース</SectionTitle>
                <InputList>
                  {evidenceSummary.map(([dt, count]) => (
                    <InputRow key={dt} $clickable onClick={() => setTab('evidence')}>
                      <InputName>
                        {dataTypeLabel(dt)}
                        <LinkIcon>→</LinkIcon>
                      </InputName>
                      <EvidenceBadge>{count}件</EvidenceBadge>
                    </InputRow>
                  ))}
                </InputList>
              </Section>
            )}
          </>
        )}

        {tab === 'drilldown' && hasBreakdown && (
          <Section>
            <SectionTitle>日別内訳</SectionTitle>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>日</Th>
                    <Th>{current.title}</Th>
                  </tr>
                </thead>
                <tbody>
                  {current.breakdown!.map((entry) => {
                    const hasDetails = entry.details && entry.details.length > 0
                    const isExpanded = expandedDays.has(entry.day)
                    return (
                      <>
                        <Tr
                          key={entry.day}
                          $expandable={hasDetails}
                          $expanded={isExpanded}
                          onClick={() => hasDetails && toggleDay(entry.day)}
                        >
                          <Td>
                            {hasDetails && <ExpandIcon>{isExpanded ? '▼' : '▶'}</ExpandIcon>}
                            {entry.day}日
                          </Td>
                          <Td>{formatValue(entry.value, current.unit)}</Td>
                        </Tr>
                        {isExpanded &&
                          entry.details!.map((detail, di) => (
                            <DetailRow key={`${entry.day}-${di}`}>
                              <DetailTd>{detail.label}</DetailTd>
                              <DetailTd>{formatValue(detail.value, detail.unit)}</DetailTd>
                            </DetailRow>
                          ))}
                      </>
                    )
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </Section>
        )}

        {tab === 'evidence' && hasEvidence && (
          <Section>
            <SectionTitle>根拠データ参照</SectionTitle>
            {evidenceSummary.map(([dt, count]) => (
              <div key={dt} style={{ marginBottom: 16 }}>
                <InputRow>
                  <InputName>{dataTypeLabel(dt)}</InputName>
                  <EvidenceBadge>{count}件</EvidenceBadge>
                </InputRow>
                <TableWrap style={{ marginTop: 8 }}>
                  <Table>
                    <thead>
                      <tr>
                        <Th>種別</Th>
                        <Th>店舗</Th>
                        <Th>日</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.evidenceRefs
                        .filter(
                          (ref) => (ref.kind === 'daily' ? ref.dataType : ref.dataType) === dt,
                        )
                        .slice(0, 31)
                        .map((ref, i) => (
                          <tr key={i}>
                            <Td>{ref.kind === 'daily' ? '日別' : '集計'}</Td>
                            <Td>{resolveStoreName(ref.storeId, stores)}</Td>
                            <Td>
                              {ref.kind === 'daily'
                                ? `${ref.day}日`
                                : ref.day
                                  ? `${ref.day}日`
                                  : '-'}
                            </Td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </div>
            ))}
          </Section>
        )}
      </Panel>
    </Overlay>
  )
}

function dataTypeLabel(dt: string): string {
  const labels: Record<string, string> = {
    sales: '売上データ',
    purchase: '仕入データ',
    discount: '売変データ',
    flowers: '花データ',
    directProduce: '産直データ',
    interStoreIn: '店間入データ',
    interStoreOut: '店間出データ',
    consumables: '消耗品データ',
    categoryTimeSales: '分類別時間帯売上',
    budget: '予算データ',
    settings: '初期設定（在庫）',
  }
  return labels[dt] ?? dt
}
