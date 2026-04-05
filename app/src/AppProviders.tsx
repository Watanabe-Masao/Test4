/**
 * アプリケーション全体の Provider ツリー
 *
 * 3段グループで構成:
 *   BootstrapProviders — テーマ + 国際化
 *   DomainProviders    — 認証 + データ基盤 + ライフサイクル
 *   UiProviders        — ルーティング + トースト
 */
import type { ReactNode } from 'react'
import { BootstrapProviders } from '@/BootstrapProviders'
import { DomainProviders } from '@/DomainProviders'
import { UiProviders } from '@/UiProviders'

interface Props {
  readonly children: ReactNode
}

export function AppProviders({ children }: Props) {
  return (
    <BootstrapProviders>
      <DomainProviders>
        <UiProviders>{children}</UiProviders>
      </DomainProviders>
    </BootstrapProviders>
  )
}
