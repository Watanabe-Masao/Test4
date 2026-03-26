import styled from 'styled-components'

export const FCLayout = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const FCCalendarArea = styled.div`
  flex: 1;
  min-width: 0;

  /* FullCalendar CSS overrides */
  .fc {
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
    --fc-border-color: ${({ theme }) => theme.colors.border};
    --fc-page-bg-color: transparent;
    --fc-neutral-bg-color: ${({ theme }) => theme.colors.bg2};
    --fc-today-bg-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)'};
  }

  .fc .fc-col-header-cell {
    padding: ${({ theme }) => theme.spacing[3]} 0;
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    color: ${({ theme }) => theme.colors.text3};
  }

  .fc .fc-col-header-cell:nth-child(6) {
    color: ${({ theme }) => theme.colors.palette.primary};
  }
  .fc .fc-col-header-cell:nth-child(7) {
    color: ${({ theme }) => theme.colors.palette.danger};
  }

  .fc .fc-daygrid-day {
    min-height: 110px;
    vertical-align: top;
  }

  .fc .fc-daygrid-day-frame {
    padding: 0;
    min-height: 110px;
  }

  .fc .fc-daygrid-day-top {
    display: none;
  }

  .fc .fc-daygrid-day-events {
    display: none;
  }

  .fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-frame {
    opacity: 0.4;
  }

  .fc .fc-highlight {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.12)'};
    border: 2px dashed ${({ theme }) => theme.colors.palette.warningDark};
  }
`

export const FCWeekSummaryCol = styled.div`
  width: 76px;
  min-width: 76px;
  display: flex;
  flex-direction: column;
`

export const FCWeekSummaryHeader = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`

export const FCWeekSummaryCell = styled.div`
  flex: 1;
  min-height: 110px;
  padding: ${({ theme }) => theme.spacing[1]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'};
`

export const FCCellContent = styled.div`
  position: relative;
  padding: 2px;
  min-height: 96px;
  cursor: pointer;
`

export const FCDayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1px;
`

export const FCDayNum = styled.div<{ $dim?: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ $dim, theme }) => ($dim ? theme.colors.text4 : theme.colors.text)};
`

export const FCWeatherIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  line-height: 1;
  margin-left: 2px;
`

export const FCPreviewWrapper = styled.div`
  position: absolute;
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
`
