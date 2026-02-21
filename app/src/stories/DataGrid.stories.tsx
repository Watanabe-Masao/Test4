import type { Meta, StoryObj } from '@storybook/react'
import { DataGrid, type ColumnDef } from '@/presentation/components/common'

interface SalesRow {
  store: string
  sales: number
  grossProfit: number
  grossProfitRate: number
  customers: number
}

const sampleData: SalesRow[] = [
  { store: '渋谷店', sales: 3456789, grossProfit: 1123456, grossProfitRate: 32.5, customers: 1234 },
  { store: '新宿店', sales: 4567890, grossProfit: 1456789, grossProfitRate: 31.9, customers: 1567 },
  { store: '池袋店', sales: 2345678, grossProfit: 789012, grossProfitRate: 33.6, customers: 987 },
  { store: '横浜店', sales: 1890123, grossProfit: 623456, grossProfitRate: 33.0, customers: 756 },
  { store: '大宮店', sales: 1567890, grossProfit: 498765, grossProfitRate: 31.8, customers: 623 },
  { store: '千葉店', sales: 1234567, grossProfit: 401234, grossProfitRate: 32.5, customers: 534 },
  { store: '川崎店', sales: 2012345, grossProfit: 654321, grossProfitRate: 32.5, customers: 812 },
  { store: '船橋店', sales: 987654, grossProfit: 321098, grossProfitRate: 32.5, customers: 412 },
]

const columns: ColumnDef<SalesRow, unknown>[] = [
  { accessorKey: 'store', header: '店舗' },
  {
    accessorKey: 'sales',
    header: '売上',
    cell: ({ getValue }) => `¥${(getValue() as number).toLocaleString()}`,
  },
  {
    accessorKey: 'grossProfit',
    header: '粗利',
    cell: ({ getValue }) => `¥${(getValue() as number).toLocaleString()}`,
  },
  {
    accessorKey: 'grossProfitRate',
    header: '粗利率',
    cell: ({ getValue }) => `${getValue()}%`,
  },
  {
    accessorKey: 'customers',
    header: '客数',
    cell: ({ getValue }) => `${(getValue() as number).toLocaleString()}人`,
  },
]

const meta: Meta<typeof DataGrid<SalesRow>> = {
  title: 'Common/DataGrid',
  component: DataGrid,
  tags: ['autodocs'],
}

export default meta

export const Default: StoryObj = {
  render: () => <DataGrid data={sampleData} columns={columns} title="店舗別売上" />,
}

export const Compact: StoryObj = {
  render: () => <DataGrid data={sampleData} columns={columns} title="コンパクト表示" compact />,
}

export const WithFiltering: StoryObj = {
  render: () => (
    <DataGrid
      data={sampleData}
      columns={columns}
      title="フィルター有効"
      enableFiltering
    />
  ),
}

export const WithPagination: StoryObj = {
  render: () => (
    <DataGrid
      data={sampleData}
      columns={columns}
      title="ページネーション (3件/ページ)"
      enablePagination
      pageSize={3}
    />
  ),
}

export const Empty: StoryObj = {
  render: () => (
    <DataGrid
      data={[]}
      columns={columns}
      title="データなし"
      emptyMessage="該当するデータがありません"
    />
  ),
}
