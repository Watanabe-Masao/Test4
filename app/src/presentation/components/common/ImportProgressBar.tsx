import styled from 'styled-components'
import type { ImportProgress } from '@/application/hooks/useImport'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: ${({ theme }) => theme.radii.full};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.full};
  transition: width 0.2s ease;
`

const ProgressText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  display: flex;
  justify-content: space-between;
`

export function ImportProgressBar({ progress }: { progress: ImportProgress }) {
  const percent = Math.round((progress.current / progress.total) * 100)
  return (
    <Container>
      <ProgressTrack>
        <ProgressFill $percent={percent} />
      </ProgressTrack>
      <ProgressText>
        <span>{progress.filename}</span>
        <span>{progress.current}/{progress.total}</span>
      </ProgressText>
    </Container>
  )
}
