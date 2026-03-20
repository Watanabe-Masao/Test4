import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import {
  CalcRow,
  CalcLabel,
  CalcValue,
  CalcHighlight,
  CalcPurpose,
  CalcNullGuide,
  VarianceRow,
  VarianceLabel,
  VarianceValue,
} from '@/presentation/components/common/tables'

const meta: Meta = {
  title: 'Common/CalcRow',
  tags: ['autodocs'],
}

export default meta

export const BasicRow: StoryObj = {
  render: () => (
    <Card>
      <CardTitle>損益構造</CardTitle>
      <CalcRow>
        <CalcLabel>総売上高</CalcLabel>
        <CalcValue>¥12,345,678</CalcValue>
      </CalcRow>
      <CalcRow>
        <CalcLabel>売上原価</CalcLabel>
        <CalcValue>¥8,234,567</CalcValue>
      </CalcRow>
      <CalcRow>
        <CalcLabel>粗利益</CalcLabel>
        <CalcHighlight>¥4,111,111</CalcHighlight>
      </CalcRow>
    </Card>
  ),
}

export const Clickable: StoryObj = {
  render: () => (
    <Card>
      <CardTitle>在庫法</CardTitle>
      <CalcPurpose>実績ベースの粗利計算（期首在庫＋仕入−期末在庫）</CalcPurpose>
      <CalcRow $clickable onClick={() => alert('根拠表示')}>
        <CalcLabel>売上原価</CalcLabel>
        <CalcValue>¥8,234,567</CalcValue>
      </CalcRow>
      <CalcRow $clickable onClick={() => alert('根拠表示')}>
        <CalcLabel>粗利益</CalcLabel>
        <CalcHighlight>¥4,111,111</CalcHighlight>
      </CalcRow>
      <CalcRow $clickable onClick={() => alert('根拠表示')}>
        <CalcLabel>粗利率</CalcLabel>
        <CalcHighlight $color="#34d399">33.3%</CalcHighlight>
      </CalcRow>
    </Card>
  ),
}

export const NullGuide: StoryObj = {
  render: () => (
    <Card>
      <CardTitle>在庫法</CardTitle>
      <CalcNullGuide>⚠ 期首在庫と期末在庫の設定が必要です</CalcNullGuide>
    </Card>
  ),
}

export const VarianceSeverity: StoryObj = {
  render: () => (
    <Card>
      <CardTitle>乖離分析</CardTitle>
      <VarianceRow $severity="low">
        <VarianceLabel>売上差異</VarianceLabel>
        <VarianceValue>+2.3%</VarianceValue>
      </VarianceRow>
      <VarianceRow $severity="mid">
        <VarianceLabel>粗利率差異</VarianceLabel>
        <VarianceValue>-4.1%</VarianceValue>
      </VarianceRow>
      <VarianceRow $severity="high">
        <VarianceLabel>在庫乖離</VarianceLabel>
        <VarianceValue>-12.8%</VarianceValue>
      </VarianceRow>
    </Card>
  ),
}
