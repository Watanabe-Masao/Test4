import {
  Skeleton,
  KpiCardWrapper,
  SkeletonLine,
  ChartWrapper,
  TableWrapper,
  TableHeaderRow,
  TableBodyRow,
  PageWrapper,
  KpiRow,
} from './Skeleton.styles'

export { Skeleton } from './Skeleton.styles'

/**
 * KpiCard のローディング状態を模倣するスケルトン。
 * ラベル行 + 値行 + オプションのサブテキスト行。
 * @responsibility R:widget
 */
export function KpiCardSkeleton() {
  return (
    <KpiCardWrapper>
      <SkeletonLine width="60%" height="10px" />
      <SkeletonLine width="80%" height="18px" />
      <SkeletonLine width="40%" height="10px" />
    </KpiCardWrapper>
  )
}

/**
 * チャート領域のローディング状態を模倣するスケルトン。
 */
export function ChartSkeleton({ height = '300px' }: { height?: string }) {
  return (
    <ChartWrapper>
      <SkeletonLine width="30%" height="12px" style={{ marginBottom: '12px' }} />
      <Skeleton variant="rectangular" height={height} $borderRadius="4px" />
    </ChartWrapper>
  )
}

/**
 * データテーブルのローディング状態を模倣するスケルトン。
 * ヘッダー行 + 指定行数のボディ行。
 */
export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <TableWrapper>
      <TableHeaderRow>
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonLine key={i} height="10px" />
        ))}
      </TableHeaderRow>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <TableBodyRow key={rowIdx}>
          {Array.from({ length: columns }, (_, colIdx) => (
            <SkeletonLine key={colIdx} height="10px" width={colIdx === 0 ? '70%' : '90%'} />
          ))}
        </TableBodyRow>
      ))}
    </TableWrapper>
  )
}

/**
 * ページ全体のローディング状態を模倣するスケルトン。
 * KPI カード群 + チャート + テーブル。
 */
export function PageSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <PageWrapper>
      <KpiRow>
        {Array.from({ length: kpiCount }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </KpiRow>
      <ChartSkeleton />
      <TableSkeleton />
    </PageWrapper>
  )
}
