import { useState } from 'react'
import { KpiCard, ChartErrorBoundary } from '@/presentation/components/common'
import type { MetricId, StoreResult, Store, CustomCategory } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { AppSettings } from '@/domain/models'
import { formatCurrency, formatPercent } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import { isUserCategory } from '@/domain/constants/customCategories'
import { sc } from '@/presentation/theme/semanticColors'
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
  KpiRow,
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

  // KPIサマリー
  const totalCatCost = categoryData.reduce((s, c) => s + c.cost, 0)
  const totalCatPrice = categoryData.reduce((s, c) => s + c.price, 0)
  const totalGrossProfit = totalCatPrice - totalCatCost
  const overallMarkupRate = safeDivide(totalGrossProfit, totalCatPrice, 0)

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
                const totalAbsCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
                const totalAbsPrice = categoryData.reduce((s, c) => s + Math.abs(c.price), 0)
                const rows: React.ReactNode[] = []

                for (const d of categoryData) {
                  const catKey = `${d.isCustom ? 'cc-' : ''}${d.category}`
                  const grossProfit = d.price - d.cost
                  const costShare = safeDivide(Math.abs(d.cost), totalAbsCost, 0)
                  const priceShare = safeDivide(Math.abs(d.price), totalAbsPrice, 0)
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

                        const sGP = storePrice - storeCost
                        const sMarkup = safeDivide(sGP, storePrice, 0)
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
                            <Td>{formatCurrency(storeCost)}</Td>
                            <Td>{formatCurrency(storePrice)}</Td>
                            <GrossProfitCell $positive={sGP >= 0}>
                              {formatCurrency(sGP)}
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
) {
  const sortedSuppliers = Array.from(catSuppliers.entries()).sort(([, a], [, b]) => b.cost - a.cost)

  for (const [code, sup] of sortedSuppliers) {
    const supGP = sup.price - sup.cost
    const supMarkup = safeDivide(supGP, sup.price, 0)
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
        <Td>{formatCurrency(sup.cost)}</Td>
        <Td>{formatCurrency(sup.price)}</Td>
        <GrossProfitCell $positive={supGP >= 0}>{formatCurrency(supGP)}</GrossProfitCell>
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
        const dayMarkup = safeDivide(dayGP, daySup.price, 0)
        rows.push(
          <DrillTr key={`${supplierKey}:${day}`} $depth={dayDepth} $catColor={catColor}>
            <Td>
              <DrillLabel $depth={dayDepth}>
                {settings.targetMonth}/{day}日
              </DrillLabel>
            </Td>
            <Td>{formatCurrency(daySup.cost)}</Td>
            <Td>{formatCurrency(daySup.price)}</Td>
            <GrossProfitCell $positive={dayGP >= 0}>{formatCurrency(dayGP)}</GrossProfitCell>
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
