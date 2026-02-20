import React, { type ReactNode, type ErrorInfo } from 'react'
import styled from 'styled-components'

// ─── 型定義 ──────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
  /** カスタムフォールバックUI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  /** エラー発生時コールバック */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ─── 汎用 ErrorBoundary クラスコンポーネント ────────────

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.handleReset)
      }
      if (fallback) {
        return fallback
      }
      return (
        <DefaultFallback>
          <ErrorIcon>!</ErrorIcon>
          <ErrorHeading>エラーが発生しました</ErrorHeading>
          {this.state.error.message && (
            <ErrorMessage>{this.state.error.message}</ErrorMessage>
          )}
          <RetryButton onClick={this.handleReset}>再試行</RetryButton>
        </DefaultFallback>
      )
    }
    return this.props.children
  }
}

// ─── ChartErrorBoundary（チャート用コンパクト版） ────────

export function ChartErrorBoundary({
  children,
  onError,
}: {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={(error: Error, reset: () => void) => (
        <ChartFallback>
          <ChartErrorIcon>!</ChartErrorIcon>
          <ChartErrorText>チャートの表示に失敗しました</ChartErrorText>
          {error.message && (
            <ChartErrorDetail>{error.message}</ChartErrorDetail>
          )}
          <ChartRetryButton onClick={reset}>再試行</ChartRetryButton>
        </ChartFallback>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// ─── PageErrorBoundary（ページ用フルサイズ版） ──────────

export function PageErrorBoundary({
  children,
  onError,
}: {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={(error: Error, reset: () => void) => (
        <PageFallback>
          <PageErrorIcon>!</PageErrorIcon>
          <PageErrorHeading>エラーが発生しました</PageErrorHeading>
          <PageErrorDescription>
            ページの表示中に予期しないエラーが発生しました。
          </PageErrorDescription>
          {error.message && (
            <PageErrorMessage>{error.message}</PageErrorMessage>
          )}
          <PageRetryButton onClick={reset}>再試行</PageRetryButton>
        </PageFallback>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// ─── デフォルトフォールバック スタイル ───────────────────

const DefaultFallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

const ErrorIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(248, 113, 113, 0.15)'
      : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ theme }) => theme.colors.palette.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

const ErrorHeading = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const ErrorMessage = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
  margin: 0;
  max-width: 400px;
  word-break: break-word;
`

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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

const ChartFallback = styled.div`
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

const ChartErrorIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(248, 113, 113, 0.15)'
      : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ theme }) => theme.colors.palette.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

const ChartErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text2};
  margin: 0;
`

const ChartErrorDetail = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin: 0;
  max-width: 300px;
  word-break: break-word;
`

const ChartRetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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

const PageFallback = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[5]};
  min-height: 300px;
`

const PageErrorIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(248, 113, 113, 0.15)'
      : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ theme }) => theme.colors.palette.danger};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

const PageErrorHeading = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const PageErrorDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text2};
  margin: 0;
`

const PageErrorMessage = styled.code`
  display: block;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  max-width: 500px;
  word-break: break-word;
`

const PageRetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[8]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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
