import styled from 'styled-components'

// ─── デフォルトフォールバック スタイル ───────────────────

export const DefaultFallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const ErrorIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ theme }) => theme.colors.palette.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

export const ErrorHeading = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

export const ErrorMessage = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
  margin: 0;
  max-width: 400px;
  word-break: break-word;
`

export const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    background: ${({ theme }) => theme.colors.bg4};
  }
`

// ─── チャート用フォールバック スタイル ───────────────────

export const ChartFallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-height: 120px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const ChartErrorIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ theme }) => theme.colors.palette.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

export const ChartErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text2};
  margin: 0;
`

export const ChartErrorDetail = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin: 0;
  max-width: 300px;
  word-break: break-word;
`

export const ChartRetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: transparent;
  color: ${({ theme }) => theme.colors.text2};
  border: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

// ─── ページ用フォールバック スタイル ─────────────────────

export const PageFallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[5]};
  min-height: 300px;
`

export const PageErrorIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ theme }) => theme.colors.palette.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

export const PageErrorHeading = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

export const PageErrorDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  color: ${({ theme }) => theme.colors.text2};
  margin: 0;
`

export const PageErrorMessage = styled.code`
  display: block;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  max-width: 500px;
  word-break: break-word;
`

export const PageRetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[8]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.palette.primary},
    ${({ theme }) => theme.colors.palette.primaryDark}
  );
  color: white;
  border: none;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`
