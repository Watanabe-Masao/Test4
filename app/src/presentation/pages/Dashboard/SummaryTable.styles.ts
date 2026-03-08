/**
 * Dashboard — Summary Table スタイル
 *
 * DataTable ベースに Dashboard 固有のスタイルを上書き。
 */
import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTableTitle,
  DataTable,
  DataTh,
  DataTd,
} from '@/presentation/components/common'

export const ScrollWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

export const STableWrapper = styled(DataTableWrapper)`
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const STableTitle = DataTableTitle

export const STable = styled(DataTable)`
  font-family: inherit;
`

export const STh = styled(DataTh)`
  padding: ${({ theme }) => theme.spacing[3]};
  background: transparent;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  &:first-child {
    text-align: left;
  }
`

export const STd = styled(DataTd)`
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text2};
  &:first-child {
    text-align: left;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text};
  }
`
