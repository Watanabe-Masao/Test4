import styled, { keyframes, css } from 'styled-components'

// ─── シマーアニメーション ─────────────────────────────────
export const shimmer = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
`

// ─── Skeleton バリアント型 ────────────────────────────────
export type SkeletonVariant = 'text' | 'rectangular' | 'circular'

export interface SkeletonProps {
  width?: string
  height?: string
  $borderRadius?: string
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
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)'};
  width: ${({ width }) => width ?? '100%'};
  height: ${({ height }) => height ?? '1em'};
  border-radius: ${({ $borderRadius, variant = 'text' }) =>
    $borderRadius ?? variantDefaults[variant].borderRadius};
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
export const KpiCardWrapper = styled.div`
  ${cardBase}
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const SkeletonLine = styled(Skeleton)``

// ─── ChartSkeleton ───────────────────────────────────────
export const ChartWrapper = styled.div`
  ${cardBase}
`

// ─── TableSkeleton ───────────────────────────────────────
export const TableWrapper = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const TableHeaderRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const TableBodyRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`

// ─── PageSkeleton ────────────────────────────────────────
export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[8]};
`

export const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`
