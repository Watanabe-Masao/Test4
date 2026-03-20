import styled from 'styled-components'
import {
  DataTableWrapper,
  DataTable,
  DataTh,
  DataTd,
  DataTr,
} from '@/presentation/components/common/tables'
export { EmptyState } from '@/presentation/components/common/layout'

export const ChartSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const TableWrapper = styled(DataTableWrapper)`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const Table = DataTable

export const Th = DataTh

export const Td = DataTd

export const Tr = DataTr

export const ToggleSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
