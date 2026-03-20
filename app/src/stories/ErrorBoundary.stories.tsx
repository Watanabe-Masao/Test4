import type { Meta, StoryObj } from '@storybook/react'
import type React from 'react'
import {
  ErrorBoundary,
  ChartErrorBoundary,
  PageErrorBoundary,
} from '@/presentation/components/common/feedback'
import { I18nProvider } from '@/infrastructure/i18n/I18nContext'

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Common/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <I18nProvider>
        <Story />
      </I18nProvider>
    ),
  ],
}

export default meta

/** エラーを発生させるコンポーネント */
function ThrowError({ message }: { message: string }): React.ReactNode {
  throw new Error(message)
}

export const DefaultFallback: StoryObj = {
  render: () => (
    <ErrorBoundary>
      <ThrowError message="予期しないエラーが発生しました" />
    </ErrorBoundary>
  ),
}

export const CustomFallback: StoryObj = {
  render: () => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>カスタムエラー: {error.message}</p>
          <button onClick={reset} style={{ marginTop: '1rem' }}>
            リトライ
          </button>
        </div>
      )}
    >
      <ThrowError message="カスタムフォールバックのデモ" />
    </ErrorBoundary>
  ),
}

export const ChartVariant: StoryObj = {
  render: () => (
    <div style={{ width: 400, height: 200 }}>
      <ChartErrorBoundary>
        <ThrowError message="チャート描画に失敗しました" />
      </ChartErrorBoundary>
    </div>
  ),
}

export const PageVariant: StoryObj = {
  render: () => (
    <PageErrorBoundary>
      <ThrowError message="ページの読み込みに失敗しました" />
    </PageErrorBoundary>
  ),
}

export const NoError: StoryObj = {
  render: () => (
    <ChartErrorBoundary>
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        正常に描画されたコンテンツ（エラーなし）
      </div>
    </ChartErrorBoundary>
  ),
}
