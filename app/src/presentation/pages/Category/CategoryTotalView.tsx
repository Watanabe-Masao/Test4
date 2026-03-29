import { useState } from 'react'
import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import type { MetricId } from '@/domain/models/analysis'
import type { Store } from '@/domain/models/record'
import type { StoreResult, CustomCategory } from '@/domain/models/storeTypes'
import { CUSTOM_CATEGORIES } from '@/domain/models/storeTypes'
import type { AppSettings } from '@/domain/models/storeTypes'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { calculateMarkupRate } from '@/domain/calculations/utils'
import {
  computeCategoryTotals,
  computeRowMetrics,
  computeStoreGrossProfit,
} from './CategoryTotalView.vm'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import { isUserCategory } from '@/domain/constants/customCategories'
import { palette } from '@/presentation/theme/tokens'
import {
  Section,
  SectionTitle,
  TableWrapper,
  Table,
  Th,
  Td,
  TrTotal,
  Badge,
  MarkupCell,
  GrossProfitCell,
  SectionHeader,
  CategorySelect,
  DrillTr,
  DrillToggle,
  DrillLabel,
} from './CategoryPage.styles'
import { CompositionChart } from './CategoryCharts'
import { CUSTOM_CATEGORY_COLORS, buildUnifiedCategoryData } from './categoryData'

interface CategoryTotalViewProps {
  readonly r: StoreResult
  readonly selectedResults: readonly StoreResult[]
  readonly stores: ReadonlyMap<string, Store>
  readonly settings: AppSettings
  readonly onExplain: (metricId: MetricId) => void
  readonly onCustomCategoryChange: (supplierCode: string, value: string) => void
}

export function CategoryTotalView({
  r,
  selectedResults,
  stores,
  settings,
  onExplain,
  onCustomCategoryChange,
}: CategoryTotalViewProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  // ドリルダウン state: カテゴリ → 店舗 → 取引先 → 日別
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedStore, setExpandedStore] = useState<string | null>(null)
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null)

  // カテゴリ別データ
  const categoryData = buildUnifiedCategoryData(
    r,
    settings.supplierCategoryMap,
    settings.userCategoryLabels,
  )

  // 合計行用（vm に委譲）
  const totals = computeCategoryTotals(categoryData)
  const {
    totalCost: totalCatCost,
    totalPrice: totalCatPrice,
    totalGrossProfit,
    overallMarkupRate,
    totalAbsCost,
    totalAbsPrice,
  } = totals

  return (
    <>
      {/* チャート（構成比: 原価 / 売価 / 相乗積） */}
      <ChartErrorBoundary>
        <CompositionChart
          items={categoryData.map((d) => ({
            label: d.label,
            cost: d.cost,
            price: d.price,
            markup: d.markup,
            color: d.color,
          }))}
        />
      </ChartErrorBoundary>

      {/* ── カテゴリ明細テーブル（カテゴリ → 店舗 → 取引先 → 日別） ── */}
      <Section>
        <SectionHeader>
          <SectionTitle>カテゴリ明細</SectionTitle>
          <span style={{ fontSize: '0.7rem', color: palette.slate }}>
            標準カテゴリ + カスタムカテゴリの統合集計 / 相乗積合計 = 全体値入率
          </span>
        </SectionHeader>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>カテゴリ</Th>
                <Th>原価</Th>
                <Th>売価</Th>
                <Th>値入額</Th>
                <Th>値入率</Th>
                <Th>構成比（原価）</Th>
                <Th>売価構成比</Th>
                <Th>相乗積</Th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows: React.ReactNode[] = []

                for (const d of categoryData) {
                  const catKey = `${d.isCustom ? 'cc-' : ''}${d.category}`
                  const { grossProfit, costShare, priceShare } = computeRowMetrics(
                    d.cost,
                    d.price,
                    totalAbsCost,
                    totalAbsPrice,
                  )
                  const isExpanded = expandedCategory === catKey

                  rows.push(
                    <DrillTr
                      key={catKey}
                      $clickable
                      $expanded={isExpanded}
                      aria-expanded={isExpanded}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setExpandedCategory(isExpanded ? null : catKey)
                        setExpandedStore(null)
                        setExpandedSupplier(null)
                      }}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setExpandedCategory(isExpanded ? null : catKey)
                          setExpandedStore(null)
                          setExpandedSupplier(null)
                        }
                      }}
                    >
                      <Td>
                        <DrillToggle $expanded={isExpanded}>&#9654;</DrillToggle>
                        <Badge $color={d.color} />
                        {d.label}
                      </Td>
                      <Td>{fmtCurrency(d.cost)}</Td>
                      <Td>{fmtCurrency(d.price)}</Td>
                      <GrossProfitCell $positive={grossProfit >= 0}>
                        {fmtCurrency(grossProfit)}
                      </GrossProfitCell>
                      <MarkupCell $rate={d.markup}>{formatPercent(d.markup)}</MarkupCell>
                      <Td>{formatPercent(costShare)}</Td>
                      <Td>{formatPercent(priceShare)}</Td>
                      <Td>{formatPercent(d.crossMultiplication)}</Td>
                    </DrillTr>,
                  )

                  // 店舗別ドリルダウン (depth=1)
                  if (isExpanded) {
                    // 単一店舗の場合は店舗レベルをスキップして直接取引先を表示
                    const isSingleStore = selectedResults.length <= 1
                    const storeResults = isSingleStore ? [r] : selectedResults

                    for (const sr of storeResults) {
                      // このカテゴリに属する取引先を特定
                      const catSuppliers = new Map<
                        string,
                        { cost: number; price: number; name: string; category: string }
                      >()
                      for (const [code, st] of sr.supplierTotals) {
                        const belongsToCategory = d.isCustom
                          ? (settings.supplierCategoryMap[st.supplierCode] ?? 'uncategorized') ===
                            d.category
                          : st.category === d.category
                        if (belongsToCategory) {
                          catSuppliers.set(code, {
                            cost: st.cost,
                            price: st.price,
                            name: st.supplierName,
                            category: st.category,
                          })
                        }
                      }

                      if (isSingleStore) {
                        // 単一店舗: 店舗行なしで取引先を depth=1 で表示
                        renderSupplierRows(
                          rows,
                          catSuppliers,
                          sr,
                          catKey,
                          sr.storeId,
                          d.color,
                          1,
                          settings,
                          onCustomCategoryChange,
                          expandedSupplier,
                          setExpandedSupplier,
                          fmtCurrency,
                        )
                      } else {
                        // 複数店舗: 店舗行を表示
                        const sName = stores.get(sr.storeId)?.name ?? sr.storeId
                        let storeCost = 0,
                          storePrice = 0
                        for (const [, sup] of catSuppliers) {
                          storeCost += sup.cost
                          storePrice += sup.price
                        }
                        if (storeCost === 0 && storePrice === 0) continue

                        const { grossProfit: sGP, markupRate: sMarkup } = computeStoreGrossProfit(
                          storeCost,
                          storePrice,
                        )
                        const storeKey = `${catKey}:${sr.storeId}`
                        const isStoreExpanded = expandedStore === storeKey

                        rows.push(
                          <DrillTr
                            key={storeKey}
                            $depth={1}
                            $catColor={d.color}
                            $clickable
                            $expanded={isStoreExpanded}
                            aria-expanded={isStoreExpanded}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedStore(isStoreExpanded ? null : storeKey)
                              setExpandedSupplier(null)
                            }}
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                setExpandedStore(isStoreExpanded ? null : storeKey)
                                setExpandedSupplier(null)
                              }
                            }}
                          >
                            <Td>
                              <DrillLabel $depth={1}>
                                <DrillToggle $expanded={isStoreExpanded}>&#9654;</DrillToggle>
                                {sName}
                              </DrillLabel>
                            </Td>
                            <Td>{fmtCurrency(storeCost)}</Td>
                            <Td>{fmtCurrency(storePrice)}</Td>
                            <GrossProfitCell $positive={sGP >= 0}>
                              {fmtCurrency(sGP)}
                            </GrossProfitCell>
                            <MarkupCell $rate={sMarkup}>{formatPercent(sMarkup)}</MarkupCell>
                            <Td></Td>
                            <Td></Td>
                            <Td></Td>
                          </DrillTr>,
                        )

                        // 取引先ドリルダウン (depth=2)
                        if (isStoreExpanded) {
                          renderSupplierRows(
                            rows,
                            catSuppliers,
                            sr,
                            catKey,
                            sr.storeId,
                            d.color,
                            2,
                            settings,
                            onCustomCategoryChange,
                            expandedSupplier,
                            setExpandedSupplier,
                            fmtCurrency,
                          )
                        }
                      }
                    }
                  }
                }

                rows.push(
                  <TrTotal key="total">
                    <Td>合計</Td>
                    <Td>{fmtCurrency(totalCatCost)}</Td>
                    <Td>{fmtCurrency(totalCatPrice)}</Td>
                    <Td>{fmtCurrency(totalGrossProfit)}</Td>
                    <Td
                      style={{ cursor: 'pointer' }}
                      onClick={() => onExplain('averageMarkupRate')}
                      title="算出根拠を表示"
                    >
                      {formatPercent(overallMarkupRate)}
                    </Td>
                    <Td>{formatPercent(1)}</Td>
                    <Td>{formatPercent(1)}</Td>
                    <Td>
                      {formatPercent(categoryData.reduce((s, c) => s + c.crossMultiplication, 0))}
                    </Td>
                  </TrTotal>,
                )
                return rows
              })()}
            </tbody>
          </Table>
        </TableWrapper>
      </Section>
    </>
  )
}

/** 取引先行 + 日別ドリルダウンを描画 */
function renderSupplierRows(
  rows: React.ReactNode[],
  catSuppliers: Map<string, { cost: number; price: number; name: string; category: string }>,
  sr: StoreResult,
  catKey: string,
  storeId: string,
  catColor: string,
  depth: number,
  settings: AppSettings,
  onCustomCategoryChange: (supplierCode: string, value: string) => void,
  expandedSupplier: string | null,
  setExpandedSupplier: (v: string | null) => void,
  fmtCurrency: (value: number) => string,
) {
  const sortedSuppliers = Array.from(catSuppliers.entries()).sort(([, a], [, b]) => b.cost - a.cost)

  for (const [code, sup] of sortedSuppliers) {
    const supGP = sup.price - sup.cost
    const supMarkup = calculateMarkupRate(supGP, sup.price)
    const supplierKey = `${catKey}:${storeId}:${code}`
    const isSupExpanded = expandedSupplier === supplierKey
    const assignedCategory = settings.supplierCategoryMap[code] as CustomCategory | undefined

    rows.push(
      <DrillTr
        key={supplierKey}
        $depth={depth}
        $catColor={catColor}
        $clickable
        $expanded={isSupExpanded}
        aria-expanded={isSupExpanded}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setExpandedSupplier(isSupExpanded ? null : supplierKey)
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setExpandedSupplier(isSupExpanded ? null : supplierKey)
          }
        }}
      >
        <Td>
          <DrillLabel $depth={depth}>
            <DrillToggle $expanded={isSupExpanded}>&#9654;</DrillToggle>
            {sup.name}
            <span
              style={{
                fontSize: '0.65rem',
                color: palette.slate,
                marginLeft: 4,
              }}
            >
              ({code})
            </span>
          </DrillLabel>
        </Td>
        <Td>{fmtCurrency(sup.cost)}</Td>
        <Td>{fmtCurrency(sup.price)}</Td>
        <GrossProfitCell $positive={supGP >= 0}>{fmtCurrency(supGP)}</GrossProfitCell>
        <MarkupCell $rate={supMarkup}>{formatPercent(supMarkup)}</MarkupCell>
        <Td></Td>
        <Td></Td>
        <Td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <CategorySelect
            value={assignedCategory ?? 'uncategorized'}
            onChange={(e) => onCustomCategoryChange(code, e.target.value)}
            style={{
              borderLeft: `3px solid ${assignedCategory ? (isUserCategory(assignedCategory) ? '#14b8a6' : (CUSTOM_CATEGORY_COLORS[assignedCategory as PresetCategoryId] ?? '#94a3b8')) : '#94a3b8'}`,
            }}
          >
            <option value="uncategorized">未分類</option>
            {CUSTOM_CATEGORIES.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.label}
              </option>
            ))}
            {Object.entries(settings.userCategoryLabels ?? {}).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </CategorySelect>
        </Td>
      </DrillTr>,
    )

    // 日別ドリルダウン
    if (isSupExpanded) {
      const dayDepth = depth + 1
      const dailyEntries = Array.from(sr.daily.entries())
        .filter(([, dr]) => {
          const s = dr.supplierBreakdown.get(code)
          return s && (s.cost !== 0 || s.price !== 0)
        })
        .sort(([a], [b]) => a - b)

      for (const [day, dr] of dailyEntries) {
        const daySup = dr.supplierBreakdown.get(code)
        if (!daySup) continue
        const dayGP = daySup.price - daySup.cost
        const dayMarkup = calculateMarkupRate(dayGP, daySup.price)
        rows.push(
          <DrillTr key={`${supplierKey}:${day}`} $depth={dayDepth} $catColor={catColor}>
            <Td>
              <DrillLabel $depth={dayDepth}>
                {settings.targetMonth}/{day}日
              </DrillLabel>
            </Td>
            <Td>{fmtCurrency(daySup.cost)}</Td>
            <Td>{fmtCurrency(daySup.price)}</Td>
            <GrossProfitCell $positive={dayGP >= 0}>{fmtCurrency(dayGP)}</GrossProfitCell>
            <MarkupCell $rate={dayMarkup}>{formatPercent(dayMarkup)}</MarkupCell>
            <Td></Td>
            <Td></Td>
            <Td></Td>
          </DrillTr>,
        )
      }
    }
  }
}
