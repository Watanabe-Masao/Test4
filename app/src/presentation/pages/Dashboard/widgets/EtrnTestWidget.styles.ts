import styled from 'styled-components'

export const Wrapper = styled.div`
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px;
`

export const SectionTitle = styled.div`
  font-weight: 600;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 4px;
`

export const Row = styled.div`
  display: flex;
  gap: 8px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  line-height: 1.6;
`

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  min-width: 100px;
`

export const Val = styled.span`
  color: ${({ theme }) => theme.colors.text};
`

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.65rem;

  th,
  td {
    padding: 2px 4px;
    text-align: right;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  th {
    color: ${({ theme }) => theme.colors.text3};
    font-weight: 500;
  }

  td:first-child,
  th:first-child {
    text-align: left;
  }
`

export const ClickableDate = styled.td`
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.colors.palette.primary};
  &:hover {
    text-decoration: underline;
  }
`

export const HourlyRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg};
`

export const HourlyCell = styled.td`
  padding: 4px 8px !important;
  text-align: left !important;
`

export const HourlyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 2px;
  font-size: 0.6rem;
`

export const HourlyItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1px 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.bg2};
`
