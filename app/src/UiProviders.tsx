/**
 * UI Providers — ルーティング + トースト通知
 *
 * プレゼンテーション層のインフラを提供する最内層。
 */
import type { ReactNode } from 'react'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from '@/presentation/components/common/feedback'

interface Props {
  readonly children: ReactNode
}

export function UiProviders({ children }: Props) {
  return (
    <HashRouter>
      <ToastProvider>{children}</ToastProvider>
    </HashRouter>
  )
}
