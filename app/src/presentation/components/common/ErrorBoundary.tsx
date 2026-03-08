import React, { type ReactNode, type ErrorInfo } from 'react'
import { useI18n } from '@/application/hooks/useI18n'
import {
  ChartErrorDetail,
  ChartErrorIcon,
  ChartErrorText,
  ChartFallback,
  ChartRetryButton,
  DefaultFallback,
  ErrorHeading,
  ErrorIcon,
  ErrorMessage,
  PageErrorDescription,
  PageErrorHeading,
  PageErrorIcon,
  PageErrorMessage,
  PageFallback,
  PageRetryButton,
  RetryButton,
} from './ErrorBoundary.styles'

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
          {this.state.error.message && <ErrorMessage>{this.state.error.message}</ErrorMessage>}
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
  const { messages } = useI18n()

  return (
    <ErrorBoundary
      onError={onError}
      fallback={(error: Error, reset: () => void) => (
        <ChartFallback>
          <ChartErrorIcon>!</ChartErrorIcon>
          <ChartErrorText>{messages.errors.chartDisplayFailed}</ChartErrorText>
          {error.message && <ChartErrorDetail>{error.message}</ChartErrorDetail>}
          <ChartRetryButton onClick={reset}>{messages.errors.retry}</ChartRetryButton>
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
  const { messages } = useI18n()

  return (
    <ErrorBoundary
      onError={onError}
      fallback={(error: Error, reset: () => void) => (
        <PageFallback>
          <PageErrorIcon>!</PageErrorIcon>
          <PageErrorHeading>{messages.errors.occurred}</PageErrorHeading>
          <PageErrorDescription>{messages.errors.pageUnexpectedError}</PageErrorDescription>
          {error.message && <PageErrorMessage>{error.message}</PageErrorMessage>}
          <PageRetryButton onClick={reset}>{messages.errors.retry}</PageRetryButton>
        </PageFallback>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
