/**
 * KPIテーブルウィジェット（店舗別KPI・部門別KPI）
 *
 * TableWidgets.tsx から分割。
 */
import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import type { DepartmentKpiRecord } from '@/domain/models'
import { useAppDispatch, useAppData } from '@/application/context'
import type { WidgetContext } from './types'
import { STableWrapper, STableTitle, STable, STh, STd } from '../DashboardPage.styles'
import { ScrollWrapper } from './DataTableWidgets'

/* ── 部門別KPI styled components ────────────────────── */

const KpiGroupTh = styled(STh)`
  text-align: center;
  font-size: 0.6rem;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const KpiSubTh = styled(STh)`
  text-align: center;
  font-size: 0.55rem;
  white-space: nowrap;
`

const BudgetTh = styled(KpiSubTh)`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.12)'};
`

const BudgetTd = styled(STd)`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.06)'};
`

function fmtPct(v: number): string {
  // 既に小数 (0.2220) なら %表示, 1超えなら既にパーセント値
  const pct = Math.abs(v) <= 1 ? v * 100 : v
  return `${pct.toFixed(2)}%`
}

function fmtPtDiff(v: number): string {
  // ポイント差異（例: 0.31 → +0.31pt）
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}`
}

function renderKpiRow(rec: DepartmentKpiRecord): ReactNode {
  const varColor = sc.cond(rec.gpRateVariance >= 0)
  const salesDiffColor = sc.cond(rec.salesVariance >= 0)
  const achColor = sc.achievement(Math.abs(rec.salesAchievement) <= 1 ? rec.salesAchievement : rec.salesAchievement / 100)
  const discColor = sc.negative

  return (
    <tr key={rec.deptCode}>
      <STd style={{ fontWeight: 600 }}>{rec.deptCode}</STd>
      <STd>{rec.deptName || '-'}</STd>
      <BudgetTd>{fmtPct(rec.gpRateBudget)}</BudgetTd>
      <STd>{fmtPct(rec.gpRateActual)}</STd>
      <STd style={{ color: varColor }}>{fmtPtDiff(rec.gpRateVariance)}</STd>
      <BudgetTd>{fmtPct(rec.markupRate)}</BudgetTd>
      <STd style={{ color: discColor }}>{fmtPct(rec.discountRate)}</STd>
      <BudgetTd>{formatCurrency(rec.salesBudget)}</BudgetTd>
      <STd>{formatCurrency(rec.salesActual)}</STd>
      <STd style={{ color: salesDiffColor }}>{formatCurrency(rec.salesVariance)}</STd>
      <STd style={{ color: achColor }}>{fmtPct(rec.salesAchievement)}</STd>
      <STd>{formatCurrency(rec.openingInventory)}</STd>
      <STd>{formatCurrency(rec.closingInventory)}</STd>
      <BudgetTd>{fmtPct(rec.gpRateLanding)}</BudgetTd>
      <STd>{rec.salesLanding ? formatCurrency(rec.salesLanding) : '-'}</STd>
    </tr>
  )
}

/* ── Editable cell styled components ────────────────── */

const EditableCell = styled(STd)`
  padding: 0;
  position: relative;
`
const CellInput = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.6rem;
  text-align: right;
  padding: 4px 8px;
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  box-sizing: border-box;
  &:focus {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'};
    box-shadow: inset 0 0 0 1.5px ${({ theme }) => theme.colors.palette.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text4};
    font-size: 0.55rem;
  }
  /* hide spin buttons */
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  -moz-appearance: textfield;
`
const EditHint = styled.span`
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 0.4rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.5;
  pointer-events: none;
`
const KpiTooltip = styled.div`
  position: absolute;
  z-index: 100;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.6rem;
  line-height: 1.6;
  white-space: nowrap;
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e1e2e' : '#fff'};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  pointer-events: none;
  bottom: calc(100% + 4px);
  right: 0;
`
const TipLabel = styled.span`color: ${({ theme }) => theme.colors.text4}; margin-right: 6px;`
const TipVal = styled.span<{ $color?: string }>`
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color }) => $color ?? 'inherit'};
`

/* Editable number cell */
function EditableNumberCell({
  value,
  placeholder,
  onChange,
  format = 'currency',
  tooltip,
  style,
}: {
  value: number | null
  placeholder?: string
  onChange: (v: number | null) => void
  format?: 'currency' | 'percent'
  tooltip?: ReactNode
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = useCallback(() => {
    setEditing(true)
    setDraft(value != null ? String(value) : '')
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft === '') { onChange(null); return }
    const n = Number(draft)
    if (!isNaN(n)) onChange(n)
  }, [draft, onChange])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const displayVal = value != null
    ? (format === 'percent' ? fmtPct(value) : formatCurrency(value))
    : '-'

  return (
    <EditableCell
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <CellInput
          ref={inputRef}
          type="number"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <div
          style={{
            padding: '4px 8px',
            textAlign: 'right',
            cursor: 'pointer',
            minHeight: '1.2em',
            fontFamily: 'var(--font-mono, monospace)',
          }}
          onClick={startEdit}
          title="クリックで編集"
        >
          {displayVal}
          <EditHint>✎</EditHint>
        </div>
      )}
      {hovered && !editing && tooltip && <KpiTooltip>{tooltip}</KpiTooltip>}
    </EditableCell>
  )
}

/* ── 店舗別KPI一覧テーブル ──────────────────────────── */

/* Store KPI Table as a proper component (needs hooks for dispatch) */
function StoreKpiTableInner({ ctx }: { ctx: WidgetContext }) {
  const dispatch = useAppDispatch()
  const appData = useAppData()
  const { result: agg, allStoreResults, stores } = ctx

  // 店舗をコード順でソート
  const storeEntries = [...allStoreResults.entries()]
    .sort(([, a], [, b]) => {
      const sa = stores.get(a.storeId)
      const sb = stores.get(b.storeId)
      return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
    })
    .map(([id, result]) => {
      const store = stores.get(id)
      return { id, label: store?.code ?? id, name: store?.name ?? id, result }
    })

  const handleInventoryChange = useCallback(
    (storeId: string, field: 'closingInventory' | 'openingInventory', val: number | null) => {
      dispatch({ type: 'UPDATE_INVENTORY', payload: { storeId, config: { [field]: val } } })
    },
    [dispatch],
  )

  const handleGPBudgetChange = useCallback(
    (storeId: string, val: number | null) => {
      dispatch({ type: 'UPDATE_INVENTORY', payload: { storeId, config: { grossProfitBudget: val } } })
    },
    [dispatch],
  )

  if (storeEntries.length === 0) {
    return (
      <STableWrapper>
        <STableTitle>店舗別KPI一覧</STableTitle>
        <div style={{ padding: '16px', fontSize: '0.7rem', color: '#888' }}>
          店舗データがありません。
        </div>
      </STableWrapper>
    )
  }

  const groupBorder = '2px solid rgba(99,102,241,0.25)'

  const renderStoreRow = (
    r: typeof agg,
    label: string,
    storeId?: string,
    isSummary?: boolean,
  ) => {
    const gpRateBudget = r.grossProfitRateBudget
    const gpRateActual = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
    const gpRateVariance = gpRateActual - gpRateBudget
    const salesVariance = r.totalSales - r.budget
    const gpLanding = r.estMethodMarginRate
    const salesLanding = r.projectedSales - r.budget

    const varColor = sc.cond(gpRateVariance >= 0)
    const salesDiffColor = sc.cond(salesVariance >= 0)
    const achColor = sc.achievement(r.budgetAchievementRate)
    const salesLandingColor = sc.cond(salesLanding >= 0)

    const rowStyle = isSummary
      ? { fontWeight: 700 as const, borderTop: '2px solid rgba(99,102,241,0.3)' }
      : undefined

    // Editable values read from settings (not from calculated StoreResult)
    const invConfig = storeId ? appData.data.settings.get(storeId) : undefined

    // Tooltip content builders
    const closingInvTooltip = storeId && r.estMethodClosingInventory != null ? (
      <div>
        <div><TipLabel>推定期末在庫:</TipLabel><TipVal>{formatCurrency(r.estMethodClosingInventory)}</TipVal></div>
        {r.closingInventory != null && r.estMethodClosingInventory != null && (
          <div>
            <TipLabel>推定との差:</TipLabel>
            <TipVal $color={sc.cond(r.closingInventory - r.estMethodClosingInventory <= 0)}>
              {formatCurrency(r.closingInventory - r.estMethodClosingInventory)}
            </TipVal>
          </div>
        )}
      </div>
    ) : undefined

    const gpBudgetTooltip = storeId && gpRateBudget > 0 ? (
      <div>
        <div><TipLabel>粗利率予算:</TipLabel><TipVal>{fmtPct(gpRateBudget)}</TipVal></div>
        <div><TipLabel>粗利率実績:</TipLabel><TipVal>{fmtPct(gpRateActual)}</TipVal></div>
        <div>
          <TipLabel>予実差異:</TipLabel>
          <TipVal $color={varColor}>{fmtPtDiff(gpRateVariance * 100)}</TipVal>
        </div>
        {r.budget > 0 && (
          <div><TipLabel>粗利予算額:</TipLabel><TipVal>{formatCurrency(r.grossProfitBudget)}</TipVal></div>
        )}
      </div>
    ) : undefined

    const salesLandingTooltip = storeId ? (
      <div>
        <div><TipLabel>売上予算:</TipLabel><TipVal>{formatCurrency(r.budget)}</TipVal></div>
        <div><TipLabel>売上実績:</TipLabel><TipVal>{formatCurrency(r.totalSales)}</TipVal></div>
        <div><TipLabel>着地予測:</TipLabel><TipVal>{formatCurrency(r.projectedSales)}</TipVal></div>
        <div>
          <TipLabel>予算差異:</TipLabel>
          <TipVal $color={salesLandingColor}>{formatCurrency(salesLanding)}</TipVal>
        </div>
        <div><TipLabel>達成率予測:</TipLabel><TipVal $color={sc.achievement(r.projectedAchievement)}>{formatPercent(r.projectedAchievement)}</TipVal></div>
      </div>
    ) : undefined

    const gpLandingTooltip = storeId ? (
      <div>
        <div><TipLabel>推定マージン率:</TipLabel><TipVal>{fmtPct(r.estMethodMarginRate)}</TipVal></div>
        {r.invMethodGrossProfitRate != null && (
          <div><TipLabel>在庫法粗利率:</TipLabel><TipVal>{fmtPct(r.invMethodGrossProfitRate)}</TipVal></div>
        )}
        <div>
          <TipLabel>予算差異:</TipLabel>
          <TipVal $color={sc.cond(gpLanding - gpRateBudget >= 0)}>
            {fmtPtDiff((gpLanding - gpRateBudget) * 100)}
          </TipVal>
        </div>
      </div>
    ) : undefined

    return (
      <tr key={label} style={rowStyle}>
        <STd style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</STd>
        {/* 粗利 */}
        {storeId && !isSummary ? (
          <EditableNumberCell
            value={invConfig?.grossProfitBudget ?? null}
            placeholder="粗利予算"
            format="currency"
            onChange={(v) => handleGPBudgetChange(storeId, v)}
            tooltip={gpBudgetTooltip}
            style={{ borderLeft: groupBorder, background: 'rgba(234,179,8,0.08)' }}
          />
        ) : (
          <BudgetTd style={{ borderLeft: groupBorder }}>{fmtPct(gpRateBudget)}</BudgetTd>
        )}
        <STd>{fmtPct(gpRateActual)}</STd>
        <STd style={{ color: varColor }}>{fmtPtDiff(gpRateVariance * 100)}</STd>
        {/* 値入/売変 */}
        <BudgetTd style={{ borderLeft: groupBorder }}>{fmtPct(r.coreMarkupRate)}</BudgetTd>
        <STd style={{ color: sc.negative }}>{`-${(r.discountRate * 100).toFixed(2)}%`}</STd>
        {/* 売上 */}
        <BudgetTd style={{ borderLeft: groupBorder }}>{formatCurrency(r.budget)}</BudgetTd>
        <STd>{formatCurrency(r.totalSales)}</STd>
        <STd style={{ color: salesDiffColor }}>{formatCurrency(salesVariance)}</STd>
        <STd style={{ color: achColor }}>{formatPercent(r.budgetAchievementRate)}</STd>
        {/* 在庫 */}
        <STd style={{ borderLeft: groupBorder }}>{r.openingInventory != null ? formatCurrency(r.openingInventory) : '-'}</STd>
        {storeId && !isSummary ? (
          <EditableNumberCell
            value={invConfig?.closingInventory ?? null}
            placeholder="期末在庫"
            format="currency"
            onChange={(v) => handleInventoryChange(storeId, 'closingInventory', v)}
            tooltip={closingInvTooltip}
          />
        ) : (
          <STd>{r.closingInventory != null ? formatCurrency(r.closingInventory) : '-'}</STd>
        )}
        {/* 着地 */}
        <EditableLandingCell
          r={r}
          groupBorder={groupBorder}
          gpLandingTooltip={gpLandingTooltip}
          salesLandingTooltip={salesLandingTooltip}
        />
      </tr>
    )
  }

  return (
    <STableWrapper>
      <STableTitle>店舗別KPI一覧</STableTitle>
      <ScrollWrapper>
        <STable>
          <thead>
            <tr>
              <KpiGroupTh rowSpan={2}>店舗</KpiGroupTh>
              <KpiGroupTh colSpan={3} style={{ borderLeft: groupBorder }}>粗利</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>値入/売変</KpiGroupTh>
              <KpiGroupTh colSpan={4} style={{ borderLeft: groupBorder }}>売上</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>在庫</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>着地</KpiGroupTh>
            </tr>
            <tr>
              {/* 粗利 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>粗利予算額</BudgetTh>
              <KpiSubTh>粗利率実績</KpiSubTh>
              <KpiSubTh>予算差異</KpiSubTh>
              {/* 値入/売変 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>値入</BudgetTh>
              <KpiSubTh>売変</KpiSubTh>
              {/* 売上 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>予算</BudgetTh>
              <KpiSubTh>実績</KpiSubTh>
              <KpiSubTh>差異</KpiSubTh>
              <KpiSubTh>達成率</KpiSubTh>
              {/* 在庫 */}
              <KpiSubTh style={{ borderLeft: groupBorder }}>期首在庫</KpiSubTh>
              <KpiSubTh>期末在庫 ✎</KpiSubTh>
              {/* 着地 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>最終粗利着地</BudgetTh>
              <KpiSubTh>最終売上着地</KpiSubTh>
            </tr>
          </thead>
          <tbody>
            {storeEntries.map((s) => renderStoreRow(s.result, s.label, s.id))}
            {storeEntries.length > 1 && renderStoreRow(agg, '合計', undefined, true)}
          </tbody>
        </STable>
      </ScrollWrapper>
    </STableWrapper>
  )
}

/* Landing cells with hover tooltip */
function EditableLandingCell({
  r,
  groupBorder,
  gpLandingTooltip,
  salesLandingTooltip,
}: {
  r: { estMethodMarginRate: number; grossProfitRateBudget: number; projectedSales: number; budget: number }
  groupBorder: string
  gpLandingTooltip?: ReactNode
  salesLandingTooltip?: ReactNode
}) {
  const [gpHover, setGpHover] = useState(false)
  const [slHover, setSlHover] = useState(false)
  const gpLanding = r.estMethodMarginRate
  const salesLanding = r.projectedSales - r.budget
  const salesLandingColor = sc.cond(salesLanding >= 0)

  return (
    <>
      <BudgetTd
        style={{ borderLeft: groupBorder, position: 'relative' }}
        onMouseEnter={() => setGpHover(true)}
        onMouseLeave={() => setGpHover(false)}
      >
        {fmtPct(gpLanding)}
        {gpHover && gpLandingTooltip && <KpiTooltip>{gpLandingTooltip}</KpiTooltip>}
      </BudgetTd>
      <STd
        style={{ color: salesLandingColor, position: 'relative' }}
        onMouseEnter={() => setSlHover(true)}
        onMouseLeave={() => setSlHover(false)}
      >
        {formatCurrency(salesLanding)}
        {slHover && salesLandingTooltip && <KpiTooltip>{salesLandingTooltip}</KpiTooltip>}
      </STd>
    </>
  )
}

export function renderStoreKpiTable(ctx: WidgetContext): ReactNode {
  return <StoreKpiTableInner ctx={ctx} />
}

export function renderDepartmentKpiTable(ctx: WidgetContext): ReactNode {
  const { departmentKpi } = ctx
  if (departmentKpi.records.length === 0) {
    return (
      <STableWrapper>
        <STableTitle>部門別KPI一覧</STableTitle>
        <div style={{ padding: '16px', fontSize: '0.7rem', color: '#888' }}>
          部門別KPIデータが取り込まれていません。「部門別」を含むCSV/Excelファイルをドロップしてください。
        </div>
      </STableWrapper>
    )
  }

  const groupBorder = '2px solid rgba(99,102,241,0.25)'

  return (
    <STableWrapper>
      <STableTitle>部門別KPI一覧</STableTitle>
      <ScrollWrapper>
        <STable>
          <thead>
            <tr>
              <KpiGroupTh rowSpan={2}>部門</KpiGroupTh>
              <KpiGroupTh rowSpan={2}>名称</KpiGroupTh>
              <KpiGroupTh colSpan={3} style={{ borderLeft: groupBorder }}>粗利</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>値入/売変</KpiGroupTh>
              <KpiGroupTh colSpan={4} style={{ borderLeft: groupBorder }}>売上</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>在庫</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>着地</KpiGroupTh>
            </tr>
            <tr>
              {/* 粗利 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>粗利率予算</BudgetTh>
              <KpiSubTh>粗利率実績</KpiSubTh>
              <KpiSubTh>予算差異</KpiSubTh>
              {/* 値入/売変 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>値入</BudgetTh>
              <KpiSubTh>売変</KpiSubTh>
              {/* 売上 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>予算</BudgetTh>
              <KpiSubTh>実績</KpiSubTh>
              <KpiSubTh>差異</KpiSubTh>
              <KpiSubTh>達成率</KpiSubTh>
              {/* 在庫 */}
              <KpiSubTh style={{ borderLeft: groupBorder }}>機首在庫</KpiSubTh>
              <KpiSubTh>期末在庫</KpiSubTh>
              {/* 着地 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>最終粗利着地</BudgetTh>
              <KpiSubTh>最終売上着地</KpiSubTh>
            </tr>
          </thead>
          <tbody>
            {departmentKpi.records.map((rec) => renderKpiRow(rec))}
          </tbody>
        </STable>
      </ScrollWrapper>
    </STableWrapper>
  )
}
