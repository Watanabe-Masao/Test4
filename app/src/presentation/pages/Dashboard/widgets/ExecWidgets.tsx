import { useState, type ReactNode } from 'react'
import { Button } from '@/presentation/components/common'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import { calculatePinIntervals } from '@/domain/calculations/pinIntervals'
import type { WidgetContext } from './types'
import {
  ExecGrid, ExecColumn, ExecColHeader, ExecColTag, ExecColTitle, ExecColSub,
  ExecBody, ExecRow, ExecLabel, ExecVal, ExecSub, ExecDividerLine,
  CalWrapper, CalSectionTitle, CalTable, CalTh, CalTd, CalDayNum, CalGrid, CalCell, CalDivider,
  CalDayCell, PinIndicator, IntervalSummary, IntervalCard, IntervalMetricLabel, IntervalMetricValue,
  PinModalOverlay, PinModalContent, PinModalTitle, PinInputField, PinButtonRow, PinInputLabel,
  ForecastToolsGrid, ToolCard, ToolCardTitle, ToolInputGroup, ToolInputField,
  ToolResultSection, ToolResultValue, ToolResultLabel,
} from '../DashboardPage.styles'

function ExecMetric({ label, value, sub, subColor }: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  return (
    <div>
      <ExecRow>
        <ExecLabel>{label}</ExecLabel>
        <ExecVal>{value}</ExecVal>
      </ExecRow>
      {sub && <ExecSub $color={subColor}>{sub}</ExecSub>}
    </div>
  )
}

export function renderPlanActualForecast(ctx: WidgetContext): ReactNode {
  const r = ctx.result
  const { daysInMonth } = ctx

  let elapsedBudget = 0
  for (let d = 1; d <= r.elapsedDays; d++) {
    elapsedBudget += r.budgetDaily.get(d) ?? 0
  }

  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  const elapsedGPBudget = r.grossProfitBudget > 0
    ? r.grossProfitBudget * safeDivide(r.elapsedDays, daysInMonth)
    : 0

  const remainingDays = daysInMonth - r.elapsedDays
  const dailyAvgGP = r.salesDays > 0 ? actualGP / r.salesDays : 0
  const projectedGP = actualGP + dailyAvgGP * remainingDays

  const salesAchievement = safeDivide(r.totalSales, elapsedBudget)
  const progressRatio = safeDivide(
    safeDivide(r.totalSales, r.budget),
    safeDivide(r.elapsedDays, daysInMonth),
  )
  const projectedGPAchievement = safeDivide(projectedGP, r.grossProfitBudget)

  return (
    <ExecGrid>
      <ExecColumn>
        <ExecColHeader $color="#6366f1">
          <ExecColTag>PLAN</ExecColTag>
          <ExecColTitle>前提</ExecColTitle>
          <ExecColSub>予算・在庫</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="月間売上予算" value={formatCurrency(r.budget)} />
          <ExecMetric label="月間粗利額予算" value={formatCurrency(r.grossProfitBudget)} />
          <ExecMetric label="月間粗利率予算" value={formatPercent(r.grossProfitRateBudget)} />
          <ExecDividerLine />
          <ExecMetric label="期首在庫" value={formatCurrency(r.openingInventory)} />
          <ExecMetric label="期末在庫目標" value={formatCurrency(r.closingInventory)} />
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color="#22c55e">
          <ExecColTag>ACTUAL</ExecColTag>
          <ExecColTitle>現在地</ExecColTitle>
          <ExecColSub>期中実績（{r.elapsedDays}日経過 / {r.salesDays}営業日）</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="期中売上予算" value={formatCurrency(elapsedBudget)} />
          <ExecMetric
            label="期中売上実績"
            value={formatCurrency(r.totalSales)}
            sub={`差異: ${formatCurrency(r.totalSales - elapsedBudget)}`}
            subColor={r.totalSales >= elapsedBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="売上達成率"
            value={formatPercent(salesAchievement)}
            sub={`進捗比: ${formatPercent(progressRatio)}`}
          />
          {ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0 && (() => {
            const pyRatio = r.totalSales / ctx.prevYear.totalSales
            return (
              <>
                <ExecDividerLine />
                <ExecMetric
                  label="前年同曜日売上"
                  value={formatCurrency(ctx.prevYear.totalSales)}
                />
                <ExecMetric
                  label="前年同曜日比"
                  value={formatPercent(pyRatio)}
                  subColor={pyRatio >= 1 ? '#22c55e' : '#ef4444'}
                />
              </>
            )
          })()}
          <ExecDividerLine />
          <ExecMetric
            label="期中粗利額実績"
            value={formatCurrency(actualGP)}
            sub={`差異: ${formatCurrency(actualGP - elapsedGPBudget)}`}
            subColor={actualGP >= elapsedGPBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="期中粗利率実績"
            value={formatPercent(actualGPRate)}
            sub={`予算比: ${formatPointDiff(actualGPRate - r.grossProfitRateBudget)}`}
            subColor={actualGPRate >= r.grossProfitRateBudget ? '#22c55e' : '#ef4444'}
          />
          {r.totalConsumable > 0 && (() => {
            // 在庫法: 現在の粗利率は消耗品控除前 → 控除後を計算
            // 推定法: 現在の粗利率は消耗品控除後 → 控除前を計算
            const isInvMethod = r.invMethodGrossProfitRate != null
            const beforeRate = isInvMethod
              ? r.invMethodGrossProfitRate!
              : safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
            const afterRate = isInvMethod
              ? safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
              : r.estMethodMarginRate
            return (
              <>
                <ExecMetric
                  label="原価算入比（消耗品費）"
                  value={formatCurrency(r.totalConsumable)}
                />
                <ExecMetric
                  label="粗利率（消耗品控除前）"
                  value={formatPercent(beforeRate)}
                />
                <ExecMetric
                  label="原算後粗利率"
                  value={formatPercent(afterRate)}
                  sub={`減算: ${formatPointDiff(beforeRate - afterRate)}`}
                />
              </>
            )
          })()}
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color="#f59e0b">
          <ExecColTag>FORECAST</ExecColTag>
          <ExecColTitle>着地</ExecColTitle>
          <ExecColSub>営業日ベース予測</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric
            label="月末売上着地"
            value={formatCurrency(r.projectedSales)}
            sub={`予算差: ${formatCurrency(r.projectedSales - r.budget)}`}
            subColor={r.projectedSales >= r.budget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="着地売上達成率"
            value={formatPercent(r.projectedAchievement)}
          />
          <ExecDividerLine />
          <ExecMetric
            label="月末粗利着地"
            value={formatCurrency(projectedGP)}
            sub={`予算差: ${formatCurrency(projectedGP - r.grossProfitBudget)}`}
            subColor={projectedGP >= r.grossProfitBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="着地粗利達成率"
            value={formatPercent(projectedGPAchievement)}
          />
        </ExecBody>
      </ExecColumn>
    </ExecGrid>
  )
}

export function MonthlyCalendarWidget({ ctx }: { ctx: WidgetContext }) {
  const { result: r, daysInMonth, year, month, prevYear } = ctx
  const [pins, setPins] = useState<Map<number, number>>(new Map())
  const [editDay, setEditDay] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  for (let i = 0; i < firstDow; i++) currentWeek.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const cumBudget = new Map<number, number>()
  const cumSales = new Map<number, number>()
  const cumPrevYear = new Map<number, number>()
  let runBudget = 0
  let runSales = 0
  let runPrevYear = 0
  for (let d = 1; d <= daysInMonth; d++) {
    runBudget += r.budgetDaily.get(d) ?? 0
    runSales += (r.daily.get(d)?.sales ?? 0)
    runPrevYear += prevYear.daily.get(d)?.sales ?? 0
    cumBudget.set(d, runBudget)
    cumSales.set(d, runSales)
    cumPrevYear.set(d, runPrevYear)
  }

  const sortedPins = [...pins.entries()].sort((a, b) => a[0] - b[0])
  const intervals = calculatePinIntervals(r.daily, r.openingInventory, sortedPins)
  const getIntervalForDay = (day: number) =>
    intervals.find(iv => day >= iv.startDay && day <= iv.endDay)

  const handleDayClick = (day: number) => {
    setEditDay(day)
    setInputVal(pins.has(day) ? String(pins.get(day)) : '')
  }

  const handlePinConfirm = () => {
    if (editDay == null) return
    const val = Number(inputVal.replace(/,/g, ''))
    if (isNaN(val) || val < 0) return
    setPins(prev => { const next = new Map(prev); next.set(editDay, val); return next })
    setEditDay(null)
  }

  const handlePinRemove = () => {
    if (editDay == null) return
    setPins(prev => { const next = new Map(prev); next.delete(editDay); return next })
    setEditDay(null)
  }

  return (
    <CalWrapper>
      <CalSectionTitle>月間カレンダー（{year}年{month}月）- 日付クリックで期末在庫を入力・粗利率ピン止め</CalSectionTitle>
      <CalTable>
        <thead>
          <tr>
            {DOW_LABELS.map((label, i) => (
              <CalTh key={label} $weekend={i >= 5}>{label}</CalTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (day == null) return <CalTd key={di} $empty />
                const rec = r.daily.get(day)
                const budget = r.budgetDaily.get(day) ?? 0
                const actual = rec?.sales ?? 0
                const diff = actual - budget
                const achievement = budget > 0 ? actual / budget : 0
                const isWeekend = di >= 5
                const diffColor = diff >= 0 ? '#22c55e' : '#ef4444'
                const achColor = achievement >= 1 ? '#22c55e' : achievement >= 0.9 ? '#f59e0b' : '#ef4444'
                const hasActual = actual > 0

                const cBudget = cumBudget.get(day) ?? 0
                const cSales = cumSales.get(day) ?? 0
                const cDiff = cSales - cBudget
                const cAch = cBudget > 0 ? cSales / cBudget : 0
                const cDiffColor = cDiff >= 0 ? '#22c55e' : '#ef4444'
                const cAchColor = cAch >= 1 ? '#22c55e' : cAch >= 0.9 ? '#f59e0b' : '#ef4444'

                const isPinned = pins.has(day)
                const interval = isPinned ? getIntervalForDay(day) : undefined
                return (
                  <CalTd key={di} $hasActual={hasActual}>
                    <CalDayCell
                      $pinned={isPinned}
                      $inInterval={!!getIntervalForDay(day)}
                      onClick={() => handleDayClick(day)}
                    >
                      <CalDayNum $weekend={isWeekend}>{day}</CalDayNum>
                      {(budget > 0 || actual > 0) && (
                        <CalGrid>
                          <CalCell>予 {formatCurrency(budget)}</CalCell>
                          <CalCell>実 {formatCurrency(actual)}</CalCell>
                          <CalCell $color={diffColor}>差 {formatCurrency(diff)}</CalCell>
                          <CalCell $color={achColor}>達 {budget > 0 ? formatPercent(achievement, 0) : '-'}</CalCell>
                          <CalDivider />
                          <CalCell>予累 {formatCurrency(cBudget)}</CalCell>
                          <CalCell>実累 {formatCurrency(cSales)}</CalCell>
                          <CalCell $color={cDiffColor}>差累 {formatCurrency(cDiff)}</CalCell>
                          <CalCell $color={cAchColor}>達累 {cBudget > 0 ? formatPercent(cAch, 0) : '-'}</CalCell>
                          {prevYear.hasPrevYear && (() => {
                            const pySales = prevYear.daily.get(day)?.sales ?? 0
                            const pyRatio = pySales > 0 ? actual / pySales : 0
                            const pyColor = pyRatio >= 1 ? '#22c55e' : pyRatio > 0 ? '#ef4444' : undefined
                            const cPy = cumPrevYear.get(day) ?? 0
                            const cPyRatio = cPy > 0 ? cSales / cPy : 0
                            const cPyColor = cPyRatio >= 1 ? '#22c55e' : cPyRatio > 0 ? '#ef4444' : undefined
                            return pySales > 0 || cPy > 0 ? (
                              <>
                                <CalDivider />
                                <CalCell $color="#9ca3af">前同 {formatCurrency(pySales)}</CalCell>
                                <CalCell $color={pyColor}>前比 {pySales > 0 ? formatPercent(pyRatio, 0) : '-'}</CalCell>
                                <CalCell $color="#9ca3af">前累 {formatCurrency(cPy)}</CalCell>
                                <CalCell $color={cPyColor}>累比 {cPy > 0 ? formatPercent(cPyRatio, 0) : '-'}</CalCell>
                              </>
                            ) : null
                          })()}
                        </CalGrid>
                      )}
                      {isPinned && interval && (
                        <PinIndicator>GP {formatPercent(interval.grossProfitRate, 1)}</PinIndicator>
                      )}
                    </CalDayCell>
                  </CalTd>
                )
              })}
            </tr>
          ))}
        </tbody>
      </CalTable>

      {intervals.length > 0 && (
        <IntervalSummary>
          <CalSectionTitle>区間別粗利率（ピン止め計算）</CalSectionTitle>
          {intervals.map((iv, i) => (
            <IntervalCard
              key={i}
              $color={iv.grossProfitRate >= ctx.targetRate ? '#22c55e' : iv.grossProfitRate >= ctx.warningRate ? '#f59e0b' : '#ef4444'}
            >
              <div>
                <IntervalMetricLabel>{iv.startDay}日 ～ {iv.endDay}日</IntervalMetricLabel>
                <IntervalMetricValue>{formatPercent(iv.grossProfitRate)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.totalSales)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>粗利</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.grossProfit)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上原価</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.cogs)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期首在庫</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.openingInventory)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期末在庫</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.closingInventory)}</IntervalMetricValue>
              </div>
            </IntervalCard>
          ))}
        </IntervalSummary>
      )}

      {editDay != null && (
        <PinModalOverlay onClick={() => setEditDay(null)}>
          <PinModalContent onClick={(e) => e.stopPropagation()}>
            <PinModalTitle>{month}月{editDay}日 - 期末在庫入力</PinModalTitle>
            <ToolInputGroup>
              <PinInputLabel>期末在庫（原価）</PinInputLabel>
              <PinInputField
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePinConfirm() }}
                placeholder="例: 2000000"
                autoFocus
              />
            </ToolInputGroup>
            <PinButtonRow>
              <Button $variant="primary" onClick={handlePinConfirm}>確定（ピン止め）</Button>
              {pins.has(editDay) && (
                <Button $variant="outline" onClick={handlePinRemove}>ピン解除</Button>
              )}
              <Button $variant="outline" onClick={() => setEditDay(null)}>キャンセル</Button>
            </PinButtonRow>
          </PinModalContent>
        </PinModalOverlay>
      )}
    </CalWrapper>
  )
}

export function ForecastToolsWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result

  const [salesLandingInput, setSalesLandingInput] = useState('')
  const [remainGPRateInput, setRemainGPRateInput] = useState('')
  const [targetGPRateInput, setTargetGPRateInput] = useState('')

  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  const salesLanding = Number(salesLandingInput.replace(/,/g, '')) || 0
  const remainGPRate = Number(remainGPRateInput) / 100 || 0
  const tool1Valid = salesLanding > 0 && remainGPRate > 0
  const remainingSales1 = salesLanding - actualSales
  const remainingGP1 = remainingSales1 * remainGPRate
  const totalGP1 = actualGP + remainingGP1
  const landingGPRate1 = salesLanding > 0 ? totalGP1 / salesLanding : 0

  const targetGPRate = Number(targetGPRateInput) / 100 || 0
  const tool2Valid = targetGPRate > 0
  const projectedTotalSales2 = r.projectedSales
  const targetTotalGP2 = targetGPRate * projectedTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - actualGP
  const remainingSales2 = projectedTotalSales2 - actualSales
  const requiredRemainingGPRate2 = remainingSales2 > 0 ? requiredRemainingGP2 / remainingSales2 : 0

  return (
    <ForecastToolsGrid>
      <ToolCard $accent="#6366f1">
        <ToolCardTitle>着地見込み計算</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>売上着地見込み（円）</PinInputLabel>
          <ToolInputField
            type="text"
            value={salesLandingInput}
            onChange={(e) => setSalesLandingInput(e.target.value)}
            placeholder={`例: ${Math.round(r.projectedSales)}`}
          />
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>残期間の粗利率予測（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={remainGPRateInput}
            onChange={(e) => setRemainGPRateInput(e.target.value)}
            placeholder={`例: ${(actualGPRate * 100).toFixed(1)}`}
          />
        </ToolInputGroup>
        {tool1Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>現在売上実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualSales)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間粗利見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingGP1)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終売上着地</ToolResultLabel>
              <ToolResultValue $color="#6366f1">{formatCurrency(salesLanding)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利額着地</ToolResultLabel>
              <ToolResultValue $color="#22c55e">{formatCurrency(totalGP1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利率着地</ToolResultLabel>
              <ToolResultValue $color={landingGPRate1 >= ctx.targetRate ? '#22c55e' : '#ef4444'}>
                {formatPercent(landingGPRate1)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>

      <ToolCard $accent="#f59e0b">
        <ToolCardTitle>ゴールシーク（必要粗利率逆算）</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>目標着地粗利率（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={targetGPRateInput}
            onChange={(e) => setTargetGPRateInput(e.target.value)}
            placeholder={`例: ${(r.grossProfitRateBudget * 100).toFixed(1)}`}
          />
        </ToolInputGroup>
        {tool2Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>予測月末売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(projectedTotalSales2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>目標粗利総額</ToolResultLabel>
              <ToolResultValue>{formatCurrency(targetTotalGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間必要粗利</ToolResultLabel>
              <ToolResultValue>{formatCurrency(requiredRemainingGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales2)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>残期間必要粗利率</ToolResultLabel>
              <ToolResultValue $color={requiredRemainingGPRate2 <= actualGPRate ? '#22c55e' : '#ef4444'}>
                {formatPercent(requiredRemainingGPRate2)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利率との差</ToolResultLabel>
              <ToolResultValue $color={requiredRemainingGPRate2 <= actualGPRate ? '#22c55e' : '#ef4444'}>
                {formatPointDiff(requiredRemainingGPRate2 - actualGPRate)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
}
