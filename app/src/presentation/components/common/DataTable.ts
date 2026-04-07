import styled from 'styled-components'

/**
 * 共通データテーブルスタイル
 *
 * AnalysisPage, DashboardPage (TableWidgets) などで共通利用する
 * ベーステーブルコンポーネント。
 * @responsibility R:utility
 */

export const DataTableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

/** スティッキー第1列付きテーブルラッパー */
export const StickyTableWrapper = styled(DataTableWrapper)`
  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: ${({ theme }) => theme.colors.bg2};
  }
  thead th:first-child {
    z-index: 2;
  }
`

export const DataTableTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  @media print {
    thead {
      display: table-header-group;
    }
  }
`

export const DataTh = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;

  &:first-child {
    text-align: center;
  }
`

export const DataTd = styled.td<{ $positive?: boolean; $negative?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $positive, $negative, theme }) =>
    $positive
      ? theme.colors.palette.success
      : $negative
        ? theme.colors.palette.danger
        : theme.colors.text};

  &:first-child {
    text-align: center;
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const DataTr = styled.tr`
  transition: background ${({ theme }) => theme.transitions.fast};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`
