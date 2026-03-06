import { useState } from 'react'
import { KpiCard, ChartErrorBoundary } from '@/presentation/components/common'
import type {
  MetricId,
  StoreResult,
  Store,
  CustomCategory,
  CategoryType,
  SupplierTotal,
} from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { AppSettings } from '@/domain/models'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import { isUserCategory } from '@/domain/constants/customCategories'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  ChartGrid,
  Section,
  SectionTitle,
  TableWrapper,
  Table,
  Th,
  Td,
  TrTotal,
  Badge,
  KpiRow,
  SortButton,
  MarkupCell,
  GrossProfitCell,
  SectionHeader,
  SupplierFilterInput,
  SupplierToolbar,
  CategorySelect,
  DrillTr,
  DrillToggle,
  DrillLabel,
} from './CategoryPage.styles'
import { CrossMultiplicationChart, CompositionChart } from './CategoryCharts'
import type { CategoryChartItem } from './categoryData'
import { CUSTOM_CATEGORY_COLORS, buildUnifiedCategoryData } from './categoryData'

type SortKey =
  | 'label'
  | 'cost'
  | 'price'
  | 'grossProfit'
  | 'markup'
  | 'costShare'
  | 'priceShare'
  | 'crossMult'
type SortDir = 'asc' | 'desc'

interface CategoryTotalViewProps {
  readonly r: StoreResult
  readonly selectedResults: readonly StoreResult[]
  readonly stores: ReadonlyMap<string, Store>
  readonly settings: AppSettings
  readonly filteredSupplierData: SupplierTotal[]
  readonly totalSupplierCost: number
  readonly totalSupplierPrice: number
  readonly totalSupplierAbsPrice: number
  readonly onExplain: (metricId: MetricId) => void
  readonly onCustomCategoryChange: (supplierCode: string, value: string) => void
  readonly supplierSort: { key: SortKey; dir: SortDir }
  readonly onToggleSort: (key: SortKey) => void
  readonly supplierFilter: string
  readonly onSupplierFilterChange: (value: string) => void
}

export function CategoryTotalView({
  r,
  selectedResults,
  stores,
  settings,
  filteredSupplierData,
  totalSupplierCost,
  totalSupplierPrice,
  totalSupplierAbsPrice,
  onExplain,
  onCustomCategoryChange,
  supplierSort,
  onToggleSort,
  supplierFilter,
  onSupplierFilterChange,
}: CategoryTotalViewProps) {
  // ドリルダウン state
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedStore, setExpandedStore] = useState<string | null>(null)
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null)
  const [expandedSupplierStore, setExpandedSupplierStore] = useState<string | null>(null)

  // カテゴリ別データ
  const categoryData = buildUnifiedCategoryData(
    r,
    settings.supplierCategoryMap,
    settings.userCategoryLabels,
  )

  // KPIサマリー
  const totalCatCost = categoryData.reduce((s, c) => s + c.cost, 0)
  const totalCatPrice = categoryData.reduce((s, c) => s + c.price, 0)
  const totalGrossProfit = totalCatPrice - totalCatCost
  const overallMarkupRate = safeDivide(totalGrossProfit, totalCatPrice, 0)

  const sortIcon = (key: SortKey) =>
    supplierSort.key === key ? (supplierSort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const supplierData = Array.from(r.supplierTotals.values())

  return (
    <>
      {/* KPIサマリーカード */}
      <KpiRow>
        <KpiCard
          label="全体値入率"
          value={formatPercent(overallMarkupRate)}
          accent={palette.primary}
          onClick={() => onExplain('averageMarkupRate')}
        />
        <KpiCard
          label="粗利額"
          value={formatCurrency(totalGrossProfit)}
          accent={sc.positive}
          onClick={
            r.invMethodGrossProfit != null ? () => onExplain('invMethodGrossProfit') : undefined
          }
        />
        <KpiCard
          label="原価合計"
          value={formatCurrency(totalCatCost)}
          accent={palette.warningDark}
          onClick={() => onExplain('purchaseCost')}
        />
        <KpiCard
          label="売価合計"
          value={formatCurrency(totalCatPrice)}
          accent={palette.blueDark}
          onClick={() => onExplain('salesTotal')}
        />
      </KpiRow>

      {/* チャート（相乗積 + 構成比） */}
      <ChartErrorBoundary>
        {(() => {
          const chartItems: CategoryChartItem[] = categoryData.map((d) => ({
            label: d.label,
            cost: d.cost,
            price: d.price,
            markup: d.markup,
            color: d.color,
          }))
          return (
            <ChartGrid>
              <CrossMultiplicationChart items={chartItems} />
              <CompositionChart items={chartItems} />
            </ChartGrid>
          )
        })()}
      </ChartErrorBoundary>

      {/* ── カテゴリ明細テーブル ── */}
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
                const totalAbsCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
                const totalAbsPrice = categoryData.reduce((s, c) => s + Math.abs(c.price), 0)
                const rows: React.ReactNode[] = []

                for (const d of categoryData) {
                  const catKey = `${d.isCustom ? 'cc-' : ''}${d.category}`
                  const grossProfit = d.price - d.cost
                  const costShare = safeDivide(Math.abs(d.cost), totalAbsCost, 0)
                  const priceShare = safeDivide(Math.abs(d.price), totalAbsPrice, 0)
                  const isExpanded = expandedCategory === catKey
                  const hasStores = selectedResults.length > 0

                  rows.push(
                    <DrillTr
                      key={catKey}
                      $clickable={hasStores}
                      $expanded={isExpanded}
                      aria-expanded={hasStores ? isExpanded : undefined}
                      role={hasStores ? 'button' : undefined}
                      tabIndex={hasStores ? 0 : undefined}
                      onClick={() => {
                        if (!hasStores) return
                        setExpandedCategory(isExpanded ? null : catKey)
                        setExpandedStore(null)
                      }}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (!hasStores) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setExpandedCategory(isExpanded ? null : catKey)
                          setExpandedStore(null)
                        }
                      }}
                    >
                      <Td>
                        {hasStores && <DrillToggle $expanded={isExpanded}>&#9654;</DrillToggle>}
                        <Badge $color={d.color} />
                        {d.label}
                      </Td>
                      <Td>{formatCurrency(d.cost)}</Td>
                      <Td>{formatCurrency(d.price)}</Td>
                      <GrossProfitCell $positive={grossProfit >= 0}>
                        {formatCurrency(grossProfit)}
                      </GrossProfitCell>
                      <MarkupCell $rate={d.markup}>{formatPercent(d.markup)}</MarkupCell>
                      <Td>{formatPercent(costShare)}</Td>
                      <Td>{formatPercent(priceShare)}</Td>
                      <Td>{formatPercent(d.crossMultiplication)}</Td>
                    </DrillTr>,
                  )

                  // 店舗別ドリルダウン行
                  if (isExpanded) {
                    for (const sr of selectedResults) {
                      const sName = stores.get(sr.storeId)?.name ?? sr.storeId
                      const pair = d.isCustom
                        ? (() => {
                            let c = 0,
                              p = 0
                            for (const [, st] of sr.supplierTotals) {
                              if (settings.supplierCategoryMap[st.supplierCode] === d.category) {
                                c += st.cost
                                p += st.price
                              }
                            }
                            return c !== 0 || p !== 0 ? { cost: c, price: p } : null
                          })()
                        : (sr.categoryTotals.get(d.category as CategoryType) ?? null)
                      if (!pair) continue
                      const sGP = pair.price - pair.cost
                      const sMarkup = safeDivide(sGP, pair.price, 0)
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
                          }}
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              setExpandedStore(isStoreExpanded ? null : storeKey)
                            }
                          }}
                        >
                          <Td>
                            <DrillLabel $depth={1}>
                              <DrillToggle $expanded={isStoreExpanded}>&#9654;</DrillToggle>
                              {sName}
                            </DrillLabel>
                          </Td>
                          <Td>{formatCurrency(pair.cost)}</Td>
                          <Td>{formatCurrency(pair.price)}</Td>
                          <GrossProfitCell $positive={sGP >= 0}>
                            {formatCurrency(sGP)}
                          </GrossProfitCell>
                          <MarkupCell $rate={sMarkup}>{formatPercent(sMarkup)}</MarkupCell>
                          <Td></Td>
                          <Td></Td>
                          <Td></Td>
                        </DrillTr>,
                      )

                      // 日別ドリルダウン行
                      if (isStoreExpanded) {
                        const catSuppliers = new Set<string>()
                        for (const [code, st] of sr.supplierTotals) {
                          if (d.isCustom) {
                            if (settings.supplierCategoryMap[st.supplierCode] === d.category)
                              catSuppliers.add(code)
                          } else if (st.category === d.category) {
                            catSuppliers.add(code)
                          }
                        }

                        const dayEntries = Array.from(sr.daily.entries())
                          .sort(([a], [b]) => a - b)
                          .map(([day, rec]) => {
                            let dayCost = 0,
                              dayPrice = 0
                            for (const [sup, sp] of rec.supplierBreakdown) {
                              if (catSuppliers.has(sup)) {
                                dayCost += sp.cost
                                dayPrice += sp.price
                              }
                            }
                            return { day, cost: dayCost, price: dayPrice }
                          })
                          .filter((e) => e.cost !== 0 || e.price !== 0)

                        for (const de of dayEntries) {
                          const dayGP = de.price - de.cost
                          const dayMarkup = safeDivide(dayGP, de.price, 0)
                          rows.push(
                            <DrillTr key={`${storeKey}:${de.day}`} $depth={2} $catColor={d.color}>
                              <Td>
                                <DrillLabel $depth={2}>{de.day}日</DrillLabel>
                              </Td>
                              <Td>{formatCurrency(de.cost)}</Td>
                              <Td>{formatCurrency(de.price)}</Td>
                              <GrossProfitCell $positive={dayGP >= 0}>
                                {formatCurrency(dayGP)}
                              </GrossProfitCell>
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
                }

                rows.push(
                  <TrTotal key="total">
                    <Td>合計</Td>
                    <Td>{formatCurrency(totalCatCost)}</Td>
                    <Td>{formatCurrency(totalCatPrice)}</Td>
                    <Td>{formatCurrency(totalGrossProfit)}</Td>
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

      {/* ── 取引先別集計テーブル ── */}
      {supplierData.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>取引先別集計（{filteredSupplierData.length}件）</SectionTitle>
            <SupplierToolbar>
              <SupplierFilterInput
                type="text"
                placeholder="取引先名 / コードで検索..."
                value={supplierFilter}
                onChange={(e) => onSupplierFilterChange(e.target.value)}
              />
            </SupplierToolbar>
          </SectionHeader>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>コード</Th>
                  <Th>取引先</Th>
                  <Th>
                    <SortButton onClick={() => onToggleSort('cost')}>
                      原価{sortIcon('cost')}
                    </SortButton>
                  </Th>
                  <Th>
                    <SortButton onClick={() => onToggleSort('price')}>
                      売価{sortIcon('price')}
                    </SortButton>
                  </Th>
                  <Th>
                    <SortButton onClick={() => onToggleSort('grossProfit')}>
                      値入額{sortIcon('grossProfit')}
                    </SortButton>
                  </Th>
                  <Th>
                    <SortButton onClick={() => onToggleSort('markup')}>
                      値入率{sortIcon('markup')}
                    </SortButton>
                  </Th>
                  <Th>
                    <SortButton onClick={() => onToggleSort('priceShare')}>
                      売価構成比{sortIcon('priceShare')}
                    </SortButton>
                  </Th>
                  <Th>
                    <SortButton onClick={() => onToggleSort('crossMult')}>
                      相乗積{sortIcon('crossMult')}
                    </SortButton>
                  </Th>
                  <Th>カテゴリ</Th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplierData.flatMap((s) => {
                  const supplierGP = s.price - s.cost
                  const supplierPriceShare = safeDivide(Math.abs(s.price), totalSupplierAbsPrice, 0)
                  const supplierCrossMult = safeDivide(s.price - s.cost, totalSupplierPrice, 0)
                  const assignedCategory = settings.supplierCategoryMap[s.supplierCode] as
                    | CustomCategory
                    | undefined
                  const isSupExpanded = expandedSupplier === s.supplierCode
                  const rows: React.ReactNode[] = []
                  rows.push(
                    <DrillTr
                      key={s.supplierCode}
                      $clickable={selectedResults.length > 0}
                      $expanded={isSupExpanded}
                      onClick={() => {
                        if (selectedResults.length === 0) return
                        setExpandedSupplier(isSupExpanded ? null : s.supplierCode)
                        setExpandedSupplierStore(null)
                      }}
                    >
                      <Td>{s.supplierCode}</Td>
                      <Td>
                        {selectedResults.length > 0 && (
                          <DrillToggle>{isSupExpanded ? '▾' : '▸'}</DrillToggle>
                        )}
                        {s.supplierName}
                      </Td>
                      <Td>{formatCurrency(s.cost)}</Td>
                      <Td>{formatCurrency(s.price)}</Td>
                      <GrossProfitCell $positive={supplierGP >= 0}>
                        {formatCurrency(supplierGP)}
                      </GrossProfitCell>
                      <MarkupCell $rate={s.markupRate}>{formatPercent(s.markupRate)}</MarkupCell>
                      <Td>{formatPercent(supplierPriceShare)}</Td>
                      <Td>{formatPercent(supplierCrossMult)}</Td>
                      <Td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <CategorySelect
                          value={assignedCategory ?? 'uncategorized'}
                          onChange={(e) => onCustomCategoryChange(s.supplierCode, e.target.value)}
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
                  // 店舗ドリルダウン
                  if (isSupExpanded) {
                    const catColor = assignedCategory
                      ? isUserCategory(assignedCategory)
                        ? '#14b8a6'
                        : (CUSTOM_CATEGORY_COLORS[assignedCategory as PresetCategoryId] ??
                          '#94a3b8')
                      : '#94a3b8'
                    for (const sr of selectedResults) {
                      const storeSupplier = sr.supplierTotals.get(s.supplierCode)
                      if (!storeSupplier) continue
                      const stGP = storeSupplier.price - storeSupplier.cost
                      const stMR = safeDivide(stGP, storeSupplier.price, 0)
                      const stKey = `${s.supplierCode}:${sr.storeId}`
                      const isStoreExpanded = expandedSupplierStore === stKey
                      const stName = stores.get(sr.storeId)?.name ?? sr.storeId
                      rows.push(
                        <DrillTr
                          key={stKey}
                          $depth={1}
                          $catColor={catColor}
                          $clickable
                          $expanded={isStoreExpanded}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedSupplierStore(isStoreExpanded ? null : stKey)
                          }}
                        >
                          <Td></Td>
                          <Td>
                            <DrillLabel $depth={1}>
                              <DrillToggle $expanded={isStoreExpanded}>&#9654;</DrillToggle>
                              {stName}
                            </DrillLabel>
                          </Td>
                          <Td>{formatCurrency(storeSupplier.cost)}</Td>
                          <Td>{formatCurrency(storeSupplier.price)}</Td>
                          <GrossProfitCell $positive={stGP >= 0}>
                            {formatCurrency(stGP)}
                          </GrossProfitCell>
                          <MarkupCell $rate={stMR}>{formatPercent(stMR)}</MarkupCell>
                          <Td></Td>
                          <Td></Td>
                          <Td></Td>
                        </DrillTr>,
                      )
                      // 日別ドリルダウン
                      if (isStoreExpanded) {
                        const dailyEntries = Array.from(sr.daily.entries())
                          .filter(([, dr]) => {
                            const sup = dr.supplierBreakdown.get(s.supplierCode)
                            return sup && (sup.cost !== 0 || sup.price !== 0)
                          })
                          .sort(([a], [b]) => a - b)
                        for (const [day, dr] of dailyEntries) {
                          const sup = dr.supplierBreakdown.get(s.supplierCode)
                          if (!sup) continue
                          const dayGP = sup.price - sup.cost
                          const dayMR = safeDivide(dayGP, sup.price, 0)
                          rows.push(
                            <DrillTr key={`${stKey}:${day}`} $depth={2} $catColor={catColor}>
                              <Td></Td>
                              <Td>
                                <DrillLabel $depth={2}>
                                  {settings.targetMonth}/{day}日
                                </DrillLabel>
                              </Td>
                              <Td>{formatCurrency(sup.cost)}</Td>
                              <Td>{formatCurrency(sup.price)}</Td>
                              <GrossProfitCell $positive={dayGP >= 0}>
                                {formatCurrency(dayGP)}
                              </GrossProfitCell>
                              <MarkupCell $rate={dayMR}>{formatPercent(dayMR)}</MarkupCell>
                              <Td></Td>
                              <Td></Td>
                              <Td></Td>
                            </DrillTr>,
                          )
                        }
                      }
                    }
                  }
                  return rows
                })}
                <TrTotal>
                  <Td>合計（{filteredSupplierData.length}件）</Td>
                  <Td></Td>
                  <Td>{formatCurrency(totalSupplierCost)}</Td>
                  <Td>{formatCurrency(totalSupplierPrice)}</Td>
                  <Td>{formatCurrency(totalSupplierPrice - totalSupplierCost)}</Td>
                  <Td>
                    {formatPercent(
                      safeDivide(totalSupplierPrice - totalSupplierCost, totalSupplierPrice, 0),
                    )}
                  </Td>
                  <Td>{formatPercent(1)}</Td>
                  <Td>
                    {formatPercent(
                      safeDivide(totalSupplierPrice - totalSupplierCost, totalSupplierPrice, 0),
                    )}
                  </Td>
                  <Td></Td>
                </TrTotal>
              </tbody>
            </Table>
          </TableWrapper>
        </Section>
      )}
    </>
  )
}
