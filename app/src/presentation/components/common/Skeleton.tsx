import styled, { keyframes, css } from 'styled-components'

// ─── シマーアニメーション ─────────────────────────────────
const shimmer = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
`

// ─── Skeleton バリアント型 ────────────────────────────────
type SkeletonVariant = 'text' | 'rectangular' | 'circular'

interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  variant?: SkeletonVariant
}

// ─── ベース Skeleton コンポーネント ──────────────────────
const variantDefaults: Record<SkeletonVariant, { borderRadius: string }> = {
  text: { borderRadius: '4px' },
  rectangular: { borderRadius: '0px' },
  circular: { borderRadius: '50%' },
}

export const Skeleton = styled.div<SkeletonProps>`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(0, 0, 0, 0.08)'};
  width: ${({ width }) => width ?? '100%'};
  height: ${({ height }) => height ?? '1em'};
  border-radius: ${({ borderRadius, variant = 'text' }) =>
    borderRadius ?? variantDefaults[variant].borderRadius};
  animation: ${shimmer} 1.8s ease-in-out infinite;
  display: block;
`

// ─── 内部ヘルパー ────────────────────────────────────────
const cardBase = css`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

// ─── KpiCardSkeleton ─────────────────────────────────────
const KpiCardWrapper = styled.div`
  ${cardBase}
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const SkeletonLine = styled(Skeleton)``

/**
 * KpiCard のローディング状態を模倣するスケルトン。
 * ラベル行 + 値行 + オプションのサブテキスト行。
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

// ─── ChartSkeleton ───────────────────────────────────────
const ChartWrapper = styled.div`
  ${cardBase}
`

/**
 * チャート領域のローディング状態を模倣するスケルトン。
 */
export function ChartSkeleton({ height = '300px' }: { height?: string }) {
  return (
    <ChartWrapper>
      <SkeletonLine width="30%" height="12px" style={{ marginBottom: '12px' }} />
      <Skeleton variant="rectangular" height={height} borderRadius="4px" />
    </ChartWrapper>
  )
}

// ─── TableSkeleton ───────────────────────────────────────
const TableWrapper = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const TableHeaderRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const TableBodyRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`

/**
 * データテーブルのローディング状態を模倣するスケルトン。
 * ヘッダー行 + 指定行数のボディ行。
 */
export function TableSkeleton({
  columns = 5,
  rows = 6,
}: {
  columns?: number
  rows?: number
}) {
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
            <SkeletonLine
              key={colIdx}
              height="10px"
              width={colIdx === 0 ? '70%' : '90%'}
            />
          ))}
        </TableBodyRow>
      ))}
    </TableWrapper>
  )
}

// ─── PageSkeleton ────────────────────────────────────────
const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[8]};
`

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

/**
 * ページ全体のローディング状態を模倣するスケルトン。
 * KPI カード群 + チャート + テーブル。
 */
export function PageSkeleton({
  kpiCount = 4,
}: {
  kpiCount?: number
}) {
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
