import type { ImportProgress } from '@/application/hooks/useImport'
import { Container, ProgressTrack, ProgressFill, ProgressText } from './ImportProgressBar.styles'

export function ImportProgressBar({ progress }: { progress: ImportProgress }) {
  const percent = Math.round((progress.current / progress.total) * 100)
  return (
    <Container>
      <ProgressTrack>
        <ProgressFill $percent={percent} />
      </ProgressTrack>
      <ProgressText>
        <span>{progress.filename}</span>
        <span>
          {progress.current}/{progress.total}
        </span>
      </ProgressText>
    </Container>
  )
}
