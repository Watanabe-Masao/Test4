import type { Meta, StoryObj } from '@storybook/react'
import {
  DataTableWrapper,
  StickyTableWrapper,
  DataTableTitle,
  DataTable,
  DataTh,
  DataTd,
  DataTr,
} from '@/presentation/components/common/DataTable'

const meta: Meta = {
  title: 'Common/DataTable',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj

const SAMPLE_DATA = [
  { day: '1日', sales: 1_234_567, cost: 890_123, profit: 344_444, rate: 27.9 },
  { day: '2日', sales: 987_654, cost: 712_345, profit: 275_309, rate: 27.9 },
  { day: '3日', sales: 1_567_890, cost: 1_098_765, profit: 469_125, rate: 29.9 },
  { day: '4日', sales: 432_100, cost: 345_678, profit: 86_422, rate: 20.0 },
  { day: '5日', sales: 2_100_000, cost: 1_470_000, profit: 630_000, rate: 30.0 },
]

const fmt = (n: number) => n.toLocaleString()

export const Default: Story = {
  render: () => (
    <DataTableWrapper>
      <DataTable>
        <thead>
          <tr>
            <DataTh>日付</DataTh>
            <DataTh>売上</DataTh>
            <DataTh>原価</DataTh>
            <DataTh>粗利</DataTh>
            <DataTh>粗利率</DataTh>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_DATA.map((d) => (
            <DataTr key={d.day}>
              <DataTd>{d.day}</DataTd>
              <DataTd>{fmt(d.sales)}</DataTd>
              <DataTd>{fmt(d.cost)}</DataTd>
              <DataTd $positive={d.profit > 0}>{fmt(d.profit)}</DataTd>
              <DataTd $positive={d.rate >= 25} $negative={d.rate < 25}>
                {d.rate.toFixed(1)}%
              </DataTd>
            </DataTr>
          ))}
        </tbody>
      </DataTable>
    </DataTableWrapper>
  ),
}

export const WithTitle: Story = {
  render: () => (
    <>
      <DataTableTitle>日別売上サマリ</DataTableTitle>
      <DataTableWrapper>
        <DataTable>
          <thead>
            <tr>
              <DataTh>日付</DataTh>
              <DataTh>売上</DataTh>
              <DataTh>前年比</DataTh>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.map((d) => (
              <DataTr key={d.day}>
                <DataTd>{d.day}</DataTd>
                <DataTd>{fmt(d.sales)}</DataTd>
                <DataTd $positive={d.rate >= 25} $negative={d.rate < 25}>
                  {d.rate >= 25 ? '+' : ''}
                  {(d.rate - 25).toFixed(1)}%
                </DataTd>
              </DataTr>
            ))}
          </tbody>
        </DataTable>
      </DataTableWrapper>
    </>
  ),
}

export const StickyFirstColumn: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <StickyTableWrapper>
        <DataTable>
          <thead>
            <tr>
              <DataTh>店舗</DataTh>
              <DataTh>売上</DataTh>
              <DataTh>原価</DataTh>
              <DataTh>粗利</DataTh>
              <DataTh>粗利率</DataTh>
              <DataTh>客数</DataTh>
              <DataTh>客単価</DataTh>
            </tr>
          </thead>
          <tbody>
            {['A店', 'B店', 'C店'].map((store) => (
              <DataTr key={store}>
                <DataTd>{store}</DataTd>
                <DataTd>{fmt(1_234_567)}</DataTd>
                <DataTd>{fmt(890_123)}</DataTd>
                <DataTd $positive>{fmt(344_444)}</DataTd>
                <DataTd $positive>27.9%</DataTd>
                <DataTd>{fmt(456)}</DataTd>
                <DataTd>{fmt(2_707)}</DataTd>
              </DataTr>
            ))}
          </tbody>
        </DataTable>
      </StickyTableWrapper>
    </div>
  ),
}

export const PositiveNegativeValues: Story = {
  render: () => (
    <DataTableWrapper>
      <DataTable>
        <thead>
          <tr>
            <DataTh>指標</DataTh>
            <DataTh>当月</DataTh>
            <DataTh>前年差</DataTh>
          </tr>
        </thead>
        <tbody>
          <DataTr>
            <DataTd>売上</DataTd>
            <DataTd>{fmt(5_432_100)}</DataTd>
            <DataTd $positive>+{fmt(234_000)}</DataTd>
          </DataTr>
          <DataTr>
            <DataTd>原価</DataTd>
            <DataTd>{fmt(3_890_000)}</DataTd>
            <DataTd $negative>+{fmt(180_000)}</DataTd>
          </DataTr>
          <DataTr>
            <DataTd>粗利</DataTd>
            <DataTd>{fmt(1_542_100)}</DataTd>
            <DataTd $positive>+{fmt(54_000)}</DataTd>
          </DataTr>
          <DataTr>
            <DataTd>粗利率</DataTd>
            <DataTd>28.4%</DataTd>
            <DataTd $negative>-0.3pt</DataTd>
          </DataTr>
        </tbody>
      </DataTable>
    </DataTableWrapper>
  ),
}
