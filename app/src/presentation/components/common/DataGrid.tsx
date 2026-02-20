import styled, { css } from 'styled-components'
import { useState, useMemo, useCallback, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type TableOptions,
  type Row,
} from '@tanstack/react-table'

// ─── Types ────────────────────────────────────────────
export type { ColumnDef } from '@tanstack/react-table'

export interface DataGridProps<T> {
  /** テーブルデータ */
  data: T[]
  /** カラム定義 */
  columns: ColumnDef<T, unknown>[]
  /** テーブルタイトル */
  title?: string
  /** ページネーション有効化 (デフォルト: データ数が pageSize を超える場合) */
  enablePagination?: boolean
  /** 1ページあたりの行数 */
  pageSize?: number
  /** ソート有効化 */
  enableSorting?: boolean
  /** フィルター有効化 */
  enableFiltering?: boolean
  /** カラムリサイズ有効化 */
  enableColumnResizing?: boolean
  /** 行ごとの背景色 */
  rowClassName?: (row: Row<T>) => string | undefined
  /** テーブルの高さ (スクロール用) */
  maxHeight?: string
  /** 初期ソート状態 */
  initialSorting?: SortingState
  /** コンパクトモード */
  compact?: boolean
  /** フッター表示 */
  footer?: ReactNode
  /** 空時メッセージ */
  emptyMessage?: string
}

// ─── Styled Components ────────────────────────────────
const Wrapper = styled.div<{ $maxHeight?: string }>`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  ${({ $maxHeight }) => $maxHeight && css`max-height: ${$maxHeight};`}
`

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg2};
  margin: 0;
`

const TableScroll = styled.div`
  overflow: auto;
  flex: 1;
`

const Table = styled.table<{ $compact?: boolean }>`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ $compact, theme }) =>
    $compact ? theme.typography.fontSize.xs : theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const Thead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
`

const Th = styled.th<{ $sortable?: boolean; $compact?: boolean }>`
  padding: ${({ $compact, theme }) =>
    $compact
      ? `${theme.spacing[2]} ${theme.spacing[3]}`
      : `${theme.spacing[3]} ${theme.spacing[4]}`};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  user-select: none;
  position: relative;

  &:first-child { text-align: center; }

  ${({ $sortable }) =>
    $sortable &&
    css`
      cursor: pointer;
      &:hover { background: ${({ theme }) => theme.colors.bg3}; }
    `}
`

const SortIndicator = styled.span`
  margin-left: 4px;
  font-size: 0.65rem;
  opacity: 0.7;
`

const Td = styled.td<{ $compact?: boolean }>`
  padding: ${({ $compact, theme }) =>
    $compact
      ? `${theme.spacing[1]} ${theme.spacing[3]}`
      : `${theme.spacing[2]} ${theme.spacing[4]}`};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};

  &:first-child { text-align: center; color: ${({ theme }) => theme.colors.text2}; }
`

const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

const ResizeHandle = styled.div<{ $isResizing: boolean }>`
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 4px;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
  opacity: 0;
  background: ${({ theme }) => theme.colors.palette.primary};
  transition: opacity 0.15s;

  ${({ $isResizing }) =>
    $isResizing &&
    css`
      opacity: 1;
    `}

  th:hover > & { opacity: 0.5; }
`

// ─── フィルター ────────────────────────────────────────
const FilterRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
`

const FilterInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 2px 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ theme }) => theme.colors.bg1};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

// ─── ページネーション ─────────────────────────────────
const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[5]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg2};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

const PaginationInfo = styled.span``

const PaginationButtons = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const PageBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.palette.primary};
      color: white;
    `}
  &:hover:not(:disabled) {
    background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.bg4)};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const PageSizeSelect = styled.select`
  padding: 2px 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ theme }) => theme.colors.bg1};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
`

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const FooterBar = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[5]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg2};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

// ─── コンポーネント本体 ───────────────────────────────
export function DataGrid<T>({
  data,
  columns,
  title,
  enablePagination,
  pageSize = 25,
  enableSorting = true,
  enableFiltering = false,
  enableColumnResizing = false,
  maxHeight,
  initialSorting,
  compact = false,
  footer,
  emptyMessage = 'データがありません',
}: DataGridProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const showPagination = enablePagination ?? data.length > pageSize

  const tableOptions: TableOptions<T> = useMemo(
    () => ({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      ...(enableSorting && {
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
      }),
      ...(enableFiltering && {
        getFilteredRowModel: getFilteredRowModel(),
        onColumnFiltersChange: setColumnFilters,
      }),
      ...(showPagination && {
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
      }),
      ...(enableColumnResizing && {
        enableColumnResizing: true,
        columnResizeMode: 'onChange' as const,
      }),
      state: {
        sorting,
        columnFilters,
        ...(showPagination && { pagination }),
      },
    }),
    [data, columns, enableSorting, enableFiltering, showPagination, enableColumnResizing, sorting, columnFilters, pagination],
  )

  const table = useReactTable(tableOptions)

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }))
    },
    [],
  )

  const totalRows = enableFiltering ? table.getFilteredRowModel().rows.length : data.length

  return (
    <Wrapper $maxHeight={maxHeight}>
      {title && <Title>{title}</Title>}

      <TableScroll>
        <Table $compact={compact}>
          <Thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <Th
                    key={header.id}
                    $sortable={header.column.getCanSort()}
                    $compact={compact}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      width: header.getSize(),
                      ...(enableColumnResizing ? { position: 'relative' } : {}),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <SortIndicator>
                        {header.column.getIsSorted() === 'asc' ? '▲' : '▼'}
                      </SortIndicator>
                    )}
                    {enableColumnResizing && header.column.getCanResize() && (
                      <ResizeHandle
                        $isResizing={header.column.getIsResizing()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    )}
                  </Th>
                ))}
              </tr>
            ))}
            {enableFiltering && (
              <FilterRow>
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <Th key={`filter-${header.id}`} $compact={compact}>
                    {header.column.getCanFilter() ? (
                      <FilterInput
                        type="text"
                        value={(header.column.getFilterValue() as string) ?? ''}
                        onChange={(e) => header.column.setFilterValue(e.target.value)}
                        placeholder="..."
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : null}
                  </Th>
                ))}
              </FilterRow>
            )}
          </Thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState>{emptyMessage}</EmptyState>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      key={cell.id}
                      $compact={compact}
                      style={enableColumnResizing ? { width: cell.column.getSize() } : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </TableScroll>

      {footer && <FooterBar>{footer}</FooterBar>}

      {showPagination && (
        <PaginationBar>
          <PaginationInfo>
            {totalRows} 件中 {pagination.pageIndex * pagination.pageSize + 1}–
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows)} 件
          </PaginationInfo>
          <PaginationButtons>
            <PageBtn
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </PageBtn>
            <PageBtn
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </PageBtn>
            <span>
              {pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <PageBtn
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {'>'}
            </PageBtn>
            <PageBtn
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </PageBtn>
            <PageSizeSelect value={pagination.pageSize} onChange={handlePageSizeChange}>
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}件
                </option>
              ))}
            </PageSizeSelect>
          </PaginationButtons>
        </PaginationBar>
      )}
    </Wrapper>
  )
}
