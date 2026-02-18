import { useState } from 'react'
import { Button } from '@/presentation/components/common'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import type { WidgetContext } from './types'
import {
  ExecRow, ExecDividerLine,
  ForecastToolsGrid, ToolCard, ToolCardTitle, ToolInputGroup, ToolInputField, ToolInputSub,
  ToolResultSection, ToolResultValue, ToolResultLabel,
  PinInputLabel,
} from '../DashboardPage.styles'

export function ForecastToolsWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result

  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  // デフォルト値（自動計算）
  const defaultSalesLanding = Math.round(r.projectedSales)
  const defaultRemainGPRate = actualGPRate
  const defaultTargetGPRate = r.grossProfitRateBudget

  const [salesEdited, setSalesEdited] = useState(false)
  const [gpRateEdited, setGpRateEdited] = useState(false)
  const [goalEdited, setGoalEdited] = useState(false)
  const [salesLandingInput, setSalesLandingInput] = useState('')
  const [remainGPRateInput, setRemainGPRateInput] = useState('')
  const [targetGPRateInput, setTargetGPRateInput] = useState('')

  // 有効値: ユーザー編集時はユーザー値、未編集時はデフォルト値
  const salesLanding = salesEdited
    ? (Number(salesLandingInput.replace(/,/g, '')) || 0)
    : defaultSalesLanding
  const remainGPRate = gpRateEdited
    ? (Number(remainGPRateInput) / 100 || 0)
    : defaultRemainGPRate

  const tool1Valid = salesLanding > 0 && remainGPRate > 0
  const remainingSales1 = salesLanding - actualSales
  const remainingGP1 = remainingSales1 * remainGPRate
  const totalGP1 = actualGP + remainingGP1
  const landingGPRate1 = salesLanding > 0 ? totalGP1 / salesLanding : 0

  // 自動計算との差異
  const salesDiff = salesLanding - defaultSalesLanding
  const gpRateDiff = remainGPRate - defaultRemainGPRate

  const targetGPRate = goalEdited
    ? (Number(targetGPRateInput) / 100 || 0)
    : defaultTargetGPRate
  const tool2Valid = targetGPRate > 0
  const projectedTotalSales2 = r.projectedSales
  const targetTotalGP2 = targetGPRate * projectedTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - actualGP
  const remainingSales2 = projectedTotalSales2 - actualSales
  const requiredRemainingGPRate2 = remainingSales2 > 0 ? requiredRemainingGP2 / remainingSales2 : 0
  const goalDiff = targetGPRate - defaultTargetGPRate

  return (
    <ForecastToolsGrid>
      <ToolCard $accent="#6366f1">
        <ToolCardTitle>着地見込み計算</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>売上着地見込み（円）</PinInputLabel>
          <ToolInputField
            type="text"
            value={salesEdited ? salesLandingInput : String(defaultSalesLanding)}
            onChange={(e) => { setSalesEdited(true); setSalesLandingInput(e.target.value) }}
            placeholder={`例: ${defaultSalesLanding}`}
          />
          {salesEdited && salesDiff !== 0 && (
            <ToolInputSub $color={salesDiff > 0 ? '#22c55e' : '#ef4444'}>
              自動予測比: {salesDiff > 0 ? '+' : ''}{formatCurrency(salesDiff)}
            </ToolInputSub>
          )}
          {!salesEdited && (
            <ToolInputSub>自動: 営業日平均 x 残日数</ToolInputSub>
          )}
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>残期間の粗利率予測（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={gpRateEdited ? remainGPRateInput : (defaultRemainGPRate * 100).toFixed(1)}
            onChange={(e) => { setGpRateEdited(true); setRemainGPRateInput(e.target.value) }}
            placeholder={`例: ${(defaultRemainGPRate * 100).toFixed(1)}`}
          />
          {gpRateEdited && gpRateDiff !== 0 && (
            <ToolInputSub $color={gpRateDiff > 0 ? '#22c55e' : '#ef4444'}>
              現在粗利率比: {formatPointDiff(gpRateDiff)}
            </ToolInputSub>
          )}
          {!gpRateEdited && (
            <ToolInputSub>自動: 現在の粗利率実績</ToolInputSub>
          )}
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
            <ExecRow>
              <ToolResultLabel>粗利率予算比</ToolResultLabel>
              <ToolResultValue $color={landingGPRate1 >= r.grossProfitRateBudget ? '#22c55e' : '#ef4444'}>
                {formatPointDiff(landingGPRate1 - r.grossProfitRateBudget)}
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
            value={goalEdited ? targetGPRateInput : (defaultTargetGPRate * 100).toFixed(1)}
            onChange={(e) => { setGoalEdited(true); setTargetGPRateInput(e.target.value) }}
            placeholder={`例: ${(defaultTargetGPRate * 100).toFixed(1)}`}
          />
          {goalEdited && goalDiff !== 0 && (
            <ToolInputSub $color={goalDiff > 0 ? '#22c55e' : '#ef4444'}>
              予算粗利率比: {formatPointDiff(goalDiff)}
            </ToolInputSub>
          )}
          {!goalEdited && (
            <ToolInputSub>自動: 月間粗利率予算</ToolInputSub>
          )}
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
