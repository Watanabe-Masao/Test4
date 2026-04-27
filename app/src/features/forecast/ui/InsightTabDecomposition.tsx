/**
 * 売上要因分解タブ (客数 × 客単価 / 比較期比)。
 * 元は InsightTabForecast.tsx に同居していた DecompositionTabContent を
 * 責務分離のため独立ファイルに切り出し (Phase 2-C / 2026-04-13)。
 *
 * @responsibility R:unclassified
 */
import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { computeDecompPct, computeDecompTotals } from './InsightTabForecast.vm'
import {
  DecompTrendChart,
  DecompDailyBarChart,
  DecompDowChart,
} from '@/presentation/pages/Forecast/ForecastCharts'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import {
  Section,
  SectionTitle,
  ChartGrid,
  EmptyState,
  FcTableWrapper,
  FcTable,
  FcTh,
  FcTd,
  FcTr,
  FcTrTotal,
} from '@/presentation/pages/Insight/InsightPage.styles'

interface DecompositionTabProps {
  readonly d: InsightData
}

export function DecompositionTabContent({ d }: DecompositionTabProps) {
  if (!d.customerData || !d.forecastData) return null

  return (
    <>
      {d.customerData.hasDecompData ? (
        <>
          <Section>
            <SectionTitle>売上要因分解（客数×客単価 / 比較期比）</SectionTitle>
            <ChartErrorBoundary>
              <ChartGrid>
                <DecompTrendChart data={d.customerData.dailyDecomp} />
                <DecompDailyBarChart data={d.customerData.dailyDecomp} />
              </ChartGrid>
              <ChartGrid>
                <DecompDowChart data={d.customerData.dowDecomp} dowColors={d.dowColors} />
              </ChartGrid>
            </ChartErrorBoundary>

            {/* 週別要因分解テーブル */}
            {d.customerData.weeklyDecomp.length > 0 && (
              <FcTableWrapper>
                <FcTable>
                  <thead>
                    <tr>
                      <FcTh>週</FcTh>
                      <FcTh>期間</FcTh>
                      <FcTh>売上差</FcTh>
                      <FcTh>客数効果</FcTh>
                      <FcTh>客単価効果</FcTh>
                      <FcTh>客数寄与率</FcTh>
                    </tr>
                  </thead>
                  <tbody>
                    {d.customerData.weeklyDecomp.map((w) => {
                      const custPct = computeDecompPct(w.custEffect, w.ticketEffect)
                      return (
                        <FcTr key={w.weekNumber}>
                          <FcTd>第{w.weekNumber}週</FcTd>
                          <FcTd>
                            {w.startDay}日〜{w.endDay}日
                          </FcTd>
                          <FcTd $highlight={w.salesDiff < 0}>{d.fmtCurrency(w.salesDiff)}</FcTd>
                          <FcTd $highlight={w.custEffect < 0}>{d.fmtCurrency(w.custEffect)}</FcTd>
                          <FcTd $highlight={w.ticketEffect < 0}>
                            {d.fmtCurrency(w.ticketEffect)}
                          </FcTd>
                          <FcTd>{d.formatPercent(custPct)}</FcTd>
                        </FcTr>
                      )
                    })}
                    {(() => {
                      const totals = computeDecompTotals(d.customerData!.weeklyDecomp)
                      return (
                        <FcTrTotal>
                          <FcTd>合計</FcTd>
                          <FcTd></FcTd>
                          <FcTd>{d.fmtCurrency(totals.salesDiff)}</FcTd>
                          <FcTd>{d.fmtCurrency(totals.custEffect)}</FcTd>
                          <FcTd>{d.fmtCurrency(totals.ticketEffect)}</FcTd>
                          <FcTd>{d.formatPercent(totals.custPct)}</FcTd>
                        </FcTrTotal>
                      )
                    })()}
                  </tbody>
                </FcTable>
              </FcTableWrapper>
            )}
          </Section>

          {/* 曜日別客数・客単価テーブル */}
          {d.customerData.hasCustomerData && (
            <Section>
              <SectionTitle>曜日別 客数・客単価 詳細</SectionTitle>
              <FcTableWrapper>
                <FcTable>
                  <thead>
                    <tr>
                      <FcTh>曜日</FcTh>
                      <FcTh>日数</FcTh>
                      <FcTh>平均客数</FcTh>
                      <FcTh>平均客単価</FcTh>
                      {d.customerData.hasPrevCustomers && <FcTh>比較期客数</FcTh>}
                      {d.customerData.hasPrevCustomers && <FcTh>比較期客単価</FcTh>}
                      {d.customerData.hasPrevCustomers && <FcTh>客数比較期比</FcTh>}
                      {d.customerData.hasPrevCustomers && <FcTh>客単価比較期比</FcTh>}
                    </tr>
                  </thead>
                  <tbody>
                    {d.customerData.dowCustomerAvg.map((a) => {
                      const custRatio =
                        a.prevAvgCustomers > 0 ? a.avgCustomers / a.prevAvgCustomers : 0
                      const txRatio = a.prevAvgTxValue > 0 ? a.avgTxValue / a.prevAvgTxValue : 0
                      return (
                        <FcTr key={a.dow}>
                          <FcTd>{a.dow}</FcTd>
                          <FcTd>{a.count}日</FcTd>
                          <FcTd>{a.avgCustomers > 0 ? `${a.avgCustomers}人` : '-'}</FcTd>
                          <FcTd>
                            {a.avgTxValue > 0 ? `${a.avgTxValue.toLocaleString()}円` : '-'}
                          </FcTd>
                          {d.customerData!.hasPrevCustomers && (
                            <FcTd>{a.prevAvgCustomers > 0 ? `${a.prevAvgCustomers}人` : '-'}</FcTd>
                          )}
                          {d.customerData!.hasPrevCustomers && (
                            <FcTd>
                              {a.prevAvgTxValue > 0
                                ? `${a.prevAvgTxValue.toLocaleString()}円`
                                : '-'}
                            </FcTd>
                          )}
                          {d.customerData!.hasPrevCustomers && (
                            <FcTd $highlight={custRatio > 0 && custRatio < 1}>
                              {custRatio > 0 ? d.formatPercent(custRatio) : '-'}
                            </FcTd>
                          )}
                          {d.customerData!.hasPrevCustomers && (
                            <FcTd $highlight={txRatio > 0 && txRatio < 1}>
                              {txRatio > 0 ? d.formatPercent(txRatio) : '-'}
                            </FcTd>
                          )}
                        </FcTr>
                      )
                    })}
                  </tbody>
                </FcTable>
              </FcTableWrapper>
            </Section>
          )}
        </>
      ) : (
        <EmptyState>比較期データがないため要因分解を表示できません</EmptyState>
      )}
    </>
  )
}
