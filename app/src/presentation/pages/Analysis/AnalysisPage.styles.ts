import styled from 'styled-components'
import { DataTableWrapper, DataTable, DataTh, DataTd, DataTr } from '@/presentation/components/common'

export const ChartSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
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
