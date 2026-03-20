/**
 * MetricBreakdownPanel — 描画コンポーネント
 *
 * 指標の算出根拠を表示するモーダルパネル。
 * データ変換・状態管理・副作用は useMetricBreakdown フックに分離。
 * このコンポーネントは ViewModel を受け取り、描画のみを行う。
 *
 * @see useMetricBreakdown.ts — データ変換・状態管理フック
 * @see MetricBreakdownPanel.styles.ts — スタイル定義
 */
import React from 'react'
import type { Explanation, MetricId } from '@/domain/models/analysis'
import type { Store } from '@/domain/models/record'
import { useMetricBreakdown } from '@/application/hooks/useMetricBreakdown'
import {
  Overlay,
  Panel,
  MbpHeader,
  MbpTitle,
  ValueDisplay,
  CloseButton,
  MbpSection,
  MbpSectionTitle,
  FormulaBox,
  InputList,
  InputRow,
  InputName,
  InputValue,
  LinkIcon,
  ScopeInfo,
  BreadcrumbBar,
  BreadcrumbLink,
  BreadcrumbSep,
  RelatedMetricRow,
  RelatedMetricName,
  RelatedMetricValue,
  TableWrap,
  MbpTable,
  MbpTh,
  MbpTr,
  MbpTd,
  ExpandIcon,
  DetailRow,
  DetailTd,
  MbpTabBar,
  TabButton,
  EvidenceBadge,
  HeaderActions,
  ActionButton,
  CopiedFeedback,
  FormulaDetailBox,
  FormulaExpression,
  FormulaDescription,
  SourceTag,
  WarningAlertBox,
  WarningAlertLabel,
  DisplayModeBadge,
} from './MetricBreakdownPanel.styles'

interface MetricBreakdownPanelProps {
  readonly explanation: Explanation
  /** 全指標の説明マップ（指標間ジャンプ用） */
  readonly allExplanations: ReadonlyMap<MetricId, Explanation>
  /** 店舗マスタ（storeId→名前解決用） */
  readonly stores?: ReadonlyMap<string, Store>
  readonly onClose: () => void
}

export function MetricBreakdownPanel({
  explanation,
  allExplanations,
  stores,
  onClose,
}: MetricBreakdownPanelProps) {
  const vm = useMetricBreakdown({ explanation, allExplanations, stores })

  return (
    <Overlay onClick={onClose}>
      <Panel
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${vm.title} の算出根拠`}
      >
        <MbpHeader>
          <div>
            <MbpTitle>
              {vm.title}
              {vm.displayMode === 'reference' && (
                <DisplayModeBadge $mode="reference" title="参考値です">
                  参考値
                </DisplayModeBadge>
              )}
              {vm.displayMode === 'hidden' && (
                <DisplayModeBadge $mode="hidden" title="計算条件不足のため非表示">
                  非表示
                </DisplayModeBadge>
              )}
            </MbpTitle>
            <ValueDisplay>{vm.displayMode === 'hidden' ? '—' : vm.formattedValue}</ValueDisplay>
            <ScopeInfo>{vm.scopeLabel}</ScopeInfo>
          </div>
          <HeaderActions>
            <ActionButton onClick={vm.handleCsvExport}>CSV出力</ActionButton>
            <ActionButton onClick={vm.handleCopySummary}>
              {vm.copied ? <CopiedFeedback>コピー済み</CopiedFeedback> : 'テキスト要約'}
            </ActionButton>
            <CloseButton onClick={onClose}>✕</CloseButton>
          </HeaderActions>
        </MbpHeader>

        {vm.breadcrumb.length > 1 && (
          <BreadcrumbBar>
            {vm.breadcrumb.map((item, i) => (
              <span key={`${item.metric}-${i}`}>
                {i > 0 && <BreadcrumbSep>&gt;</BreadcrumbSep>}
                {item.isLast ? (
                  <span>{item.title}</span>
                ) : (
                  <BreadcrumbLink onClick={() => vm.navigateBack(i)}>{item.title}</BreadcrumbLink>
                )}
              </span>
            ))}
          </BreadcrumbBar>
        )}

        <MbpTabBar>
          <TabButton $active={vm.tab === 'formula'} onClick={() => vm.setTab('formula')}>
            算出根拠
          </TabButton>
          {vm.hasDrilldown && (
            <TabButton $active={vm.tab === 'drilldown'} onClick={() => vm.setTab('drilldown')}>
              日別内訳
            </TabButton>
          )}
          {vm.hasEvidence && (
            <TabButton $active={vm.tab === 'evidence'} onClick={() => vm.setTab('evidence')}>
              根拠を見る
            </TabButton>
          )}
        </MbpTabBar>

        {vm.tab === 'formula' && <FormulaTab vm={vm} />}
        {vm.tab === 'drilldown' && vm.hasDrilldown && <DrilldownTab vm={vm} />}
        {vm.tab === 'evidence' && vm.hasEvidence && <EvidenceTab vm={vm} />}
      </Panel>
    </Overlay>
  )
}

// ─── Sub-components (pure renderers) ─────────────────────

type VM = ReturnType<typeof useMetricBreakdown>

const FormulaTab = React.memo(function FormulaTab({ vm }: { vm: VM }) {
  return (
    <>
      {vm.resolvedWarnings.length > 0 && (
        <MbpSection>
          <MbpSectionTitle>警告</MbpSectionTitle>
          {vm.resolvedWarnings.map((w) => (
            <WarningAlertBox key={w.code} $severity={w.severity}>
              <WarningAlertLabel $severity={w.severity}>{w.label}</WarningAlertLabel>
              <span>{w.message}</span>
            </WarningAlertBox>
          ))}
        </MbpSection>
      )}

      <MbpSection>
        <MbpSectionTitle>計算式</MbpSectionTitle>
        <FormulaBox>{vm.formula}</FormulaBox>
      </MbpSection>

      {vm.formulaDetail && (
        <MbpSection>
          <MbpSectionTitle>数式詳細</MbpSectionTitle>
          <FormulaDetailBox>
            <FormulaExpression>{vm.formulaDetail.expression}</FormulaExpression>
            <FormulaDescription>{vm.formulaDetail.description}</FormulaDescription>
            <InputList>
              {vm.formulaDetail.inputBindings.map((binding, i) => (
                <InputRow key={i}>
                  <InputName>{binding.label}</InputName>
                  {binding.source && <SourceTag>{binding.source}</SourceTag>}
                </InputRow>
              ))}
            </InputList>
          </FormulaDetailBox>
        </MbpSection>
      )}

      <MbpSection>
        <MbpSectionTitle>入力パラメータ</MbpSectionTitle>
        <InputList>
          {vm.inputs.map((input, i) => (
            <InputRow
              key={i}
              $clickable={!!input.linkedMetric}
              onClick={() => input.linkedMetric && vm.navigateTo(input.linkedMetric)}
            >
              <InputName>
                {input.name}
                {input.linkedMetric && <LinkIcon>→</LinkIcon>}
              </InputName>
              <InputValue>{input.formattedValue}</InputValue>
            </InputRow>
          ))}
        </InputList>
      </MbpSection>

      {vm.reverseLinks.length > 0 && (
        <MbpSection>
          <MbpSectionTitle>この指標を参照している指標</MbpSectionTitle>
          <InputList>
            {vm.reverseLinks.map((link) => (
              <RelatedMetricRow key={link.metric} onClick={() => vm.navigateTo(link.metric)}>
                <RelatedMetricName>
                  {link.title}
                  <LinkIcon>←</LinkIcon>
                </RelatedMetricName>
                <RelatedMetricValue>{link.formattedValue}</RelatedMetricValue>
              </RelatedMetricRow>
            ))}
          </InputList>
        </MbpSection>
      )}

      {vm.evidenceSummary.length > 0 && (
        <MbpSection>
          <MbpSectionTitle>データソース</MbpSectionTitle>
          <InputList>
            {vm.evidenceSummary.map((entry) => (
              <InputRow key={entry.dataType} $clickable onClick={() => vm.setTab('evidence')}>
                <InputName>
                  {entry.label}
                  <LinkIcon>→</LinkIcon>
                </InputName>
                <EvidenceBadge>{entry.count}件</EvidenceBadge>
              </InputRow>
            ))}
          </InputList>
        </MbpSection>
      )}
    </>
  )
})

const DrilldownTab = React.memo(function DrilldownTab({ vm }: { vm: VM }) {
  return (
    <MbpSection>
      <MbpSectionTitle>日別内訳</MbpSectionTitle>
      <TableWrap>
        <MbpTable>
          <thead>
            <tr>
              <MbpTh>日</MbpTh>
              <MbpTh>{vm.breakdownTitle}</MbpTh>
            </tr>
          </thead>
          <tbody>
            {vm.breakdownRows.map((row) => {
              const isExpanded = vm.expandedDays.has(row.day)
              return (
                <React.Fragment key={row.day}>
                  <MbpTr
                    $expandable={row.hasDetails}
                    $expanded={isExpanded}
                    onClick={() => row.hasDetails && vm.toggleDay(row.day)}
                  >
                    <MbpTd>
                      {row.hasDetails && <ExpandIcon>{isExpanded ? '▼' : '▶'}</ExpandIcon>}
                      {row.dayLabel ?? `${row.day}日`}
                    </MbpTd>
                    <MbpTd>{row.formattedValue}</MbpTd>
                  </MbpTr>
                  {isExpanded &&
                    row.details?.map((detail, di) => (
                      <DetailRow key={`${row.day}-${di}`}>
                        <DetailTd>{detail.label}</DetailTd>
                        <DetailTd>{detail.formattedValue}</DetailTd>
                      </DetailRow>
                    ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </MbpTable>
      </TableWrap>
    </MbpSection>
  )
})

const EvidenceTab = React.memo(function EvidenceTab({ vm }: { vm: VM }) {
  return (
    <MbpSection>
      <MbpSectionTitle>根拠データ参照</MbpSectionTitle>
      {vm.evidenceSummary.map((entry) => {
        const refs = vm.evidenceRefsByType.get(entry.dataType)
        if (!refs || refs.length === 0) return null
        return (
          <div key={entry.dataType} style={{ marginBottom: 16 }}>
            <InputRow>
              <InputName>{entry.label}</InputName>
              <EvidenceBadge>{entry.count}件</EvidenceBadge>
            </InputRow>
            <TableWrap style={{ marginTop: 8 }}>
              <MbpTable>
                <thead>
                  <tr>
                    <MbpTh>種別</MbpTh>
                    <MbpTh>店舗</MbpTh>
                    <MbpTh>日</MbpTh>
                  </tr>
                </thead>
                <tbody>
                  {refs.map((ref, i) => (
                    <tr key={i}>
                      <MbpTd>{ref.kind}</MbpTd>
                      <MbpTd>{ref.storeName}</MbpTd>
                      <MbpTd>{ref.dayLabel}</MbpTd>
                    </tr>
                  ))}
                </tbody>
              </MbpTable>
            </TableWrap>
          </div>
        )
      })}
    </MbpSection>
  )
})
