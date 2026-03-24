/**
 * YoYドリルダウンオーバーレイ — ConditionSummaryEnhanced から抽出
 *
 * 客数前年比・客単価前年比・販売点数前年比・必要ベース比の
 * 店別詳細パネルを統一的に表示する。
 */
import type { WidgetContext } from './types'
import type { StoreResult, AppSettings } from '@/domain/models/storeTypes'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { formatPercent } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import { CustomerYoYDetailTable } from './conditionPanelYoY'
import { TxValueDetailTable } from './conditionPanelSalesDetail'
import type { DisplayMode } from './conditionSummaryUtils'
import {
  DrillOverlay,
  DrillPanel,
  DrillCloseBtn,
  DrillHeader,
  DrillTitle,
  DrillBody,
  Footer,
  FooterNote,
  LegendDot,
  LegendGroup,
  LegendItem,
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
} from './ConditionSummaryEnhanced.styles'

// ─── Constants ──────────────────────────────────────────

const YOY_DRILL_LABELS: Record<string, string> = {
  customerYoY: '客数前年比',
  txValue: '客単価前年比',
  itemsYoY: '販売点数前年比',
  requiredPace: '必要ベース比',
}

const YOY_DRILL_FOOTER: Record<string, string> = {
  customerYoY: '前年同曜日比 • 単位：人',
  txValue: '客単価 = 売上 ÷ 客数 • 単位：円',
  itemsYoY: '前年同曜日比 • 単位：点',
  requiredPace: '必要日販 = (予算 - 累計実績) ÷ 残日数',
}

// ─── YoY Drill Overlay ──────────────────────────────────

export type YoYDrillType = 'customerYoY' | 'txValue' | 'itemsYoY' | 'requiredPace'

interface YoYDrillOverlayProps {
  readonly yoyDrill: YoYDrillType
  readonly ctx: WidgetContext
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly setDisplayMode: (m: DisplayMode) => void
  readonly settings: AppSettings
  readonly expandedStore: string | null
  readonly setExpandedStore: React.Dispatch<React.SetStateAction<string | null>>
  readonly ctsCurrentQty: number
  readonly ctsPrevQty: number
  readonly onClose: () => void
}

export function YoYDrillOverlay({
  yoyDrill,
  ctx,
  sortedStoreEntries,
  effectiveConfig,
  displayMode,
  setDisplayMode,
  settings,
  expandedStore,
  setExpandedStore,
  ctsCurrentQty,
  ctsPrevQty,
  onClose,
}: YoYDrillOverlayProps) {
  return (
    <DrillOverlay onClick={onClose}>
      <DrillPanel onClick={(e) => e.stopPropagation()}>
        <DrillHeader>
          <DrillTitle>{YOY_DRILL_LABELS[yoyDrill]} 店別詳細</DrillTitle>
          <DrillCloseBtn onClick={onClose} aria-label="閉じる">
            ✕
          </DrillCloseBtn>
        </DrillHeader>
        <DrillBody>
          {yoyDrill === 'customerYoY' && (
            <CustomerYoYDetailTable
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              result={ctx.result}
              effectiveConfig={effectiveConfig}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              settings={settings}
              prevYear={ctx.prevYear}
              prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
              expandedStore={expandedStore}
              onExpandToggle={(id) => setExpandedStore((prev) => (prev === id ? null : id))}
              dataMaxDay={ctx.dataMaxDay}
            />
          )}
          {yoyDrill === 'txValue' && (
            <TxValueDetailTable
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              result={ctx.result}
              effectiveConfig={effectiveConfig}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              settings={settings}
              expandedStore={expandedStore}
              onExpandToggle={(id) => setExpandedStore((prev) => (prev === id ? null : id))}
            />
          )}
          {yoyDrill === 'itemsYoY' && (
            <ItemsYoYContent ctsCurrentQty={ctsCurrentQty} ctsPrevQty={ctsPrevQty} />
          )}
          {yoyDrill === 'requiredPace' && (
            <RequiredPaceContent ctx={ctx} sortedStoreEntries={sortedStoreEntries} />
          )}
        </DrillBody>
        <Footer>
          <FooterNote>{YOY_DRILL_FOOTER[yoyDrill]}</FooterNote>
          <LegendGroup>
            {[
              { color: '#10b981', label: '達成' },
              { color: '#eab308', label: '微未達' },
              { color: '#ef4444', label: '未達' },
            ].map((item) => (
              <LegendItem key={item.label}>
                <LegendDot $color={item.color} />
                {item.label}
              </LegendItem>
            ))}
          </LegendGroup>
        </Footer>
      </DrillPanel>
    </DrillOverlay>
  )
}

// ─── Items YoY Content ──────────────────────────────────

function ItemsYoYContent({
  ctsCurrentQty,
  ctsPrevQty,
}: {
  readonly ctsCurrentQty: number
  readonly ctsPrevQty: number
}) {
  const yoy = ctsPrevQty > 0 ? ctsCurrentQty / ctsPrevQty : 0
  const yoyColor = yoy >= 1 ? '#10b981' : yoy >= 0.97 ? '#eab308' : '#ef4444'
  return (
    <TotalSection>
      <TotalGrid>
        <TotalCell>
          <SmallLabel>当年点数</SmallLabel>
          <BigValue>{ctsCurrentQty.toLocaleString()}点</BigValue>
        </TotalCell>
        <TotalCell $align="center">
          <SmallLabel>前年点数</SmallLabel>
          <BigValue>{ctsPrevQty > 0 ? `${ctsPrevQty.toLocaleString()}点` : '—'}</BigValue>
        </TotalCell>
        <TotalCell $align="right">
          <SmallLabel>前年比</SmallLabel>
          <AchValue $color={yoyColor}>{ctsPrevQty > 0 ? formatPercent(yoy) : '—'}</AchValue>
        </TotalCell>
      </TotalGrid>
    </TotalSection>
  )
}

// ─── Required Pace Content ──────────────────────────────

function RequiredPaceContent({
  ctx,
  sortedStoreEntries,
}: {
  readonly ctx: WidgetContext
  readonly sortedStoreEntries: readonly [string, StoreResult][]
}) {
  const paceRatio = safeDivide(ctx.result.requiredDailySales, ctx.result.averageDailySales, 0)
  const paceColor = paceRatio <= 1 ? '#10b981' : paceRatio <= 1.05 ? '#eab308' : '#ef4444'

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>実績日販</SmallLabel>
            <BigValue>{ctx.fmtCurrency(ctx.result.averageDailySales)}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>必要日販</SmallLabel>
            <BigValue>{ctx.fmtCurrency(ctx.result.requiredDailySales)}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>必要ベース比</SmallLabel>
            <AchValue $color={paceColor}>{formatPercent(paceRatio)}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {sortedStoreEntries.length > 1 && (
        <div style={{ padding: '8px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  店舗名
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  実績日販
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  必要日販
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  ベース比
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStoreEntries.map(([storeId, sr]) => {
                const storeName = ctx.stores.get(storeId)?.name ?? storeId
                const storeRatio = safeDivide(sr.requiredDailySales, sr.averageDailySales, 0)
                const color =
                  storeRatio <= 1 ? '#10b981' : storeRatio <= 1.05 ? '#eab308' : '#ef4444'
                return (
                  <tr key={storeId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 8px' }}>{storeName}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'monospace' }}>
                      {ctx.fmtCurrency(sr.averageDailySales)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'monospace' }}>
                      {ctx.fmtCurrency(sr.requiredDailySales)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '4px 8px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {sr.averageDailySales > 0 ? formatPercent(storeRatio) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
