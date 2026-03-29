/**
 * AdapterProvider — 4 ポートアダプターを Context 経由で供給する
 *
 * application/adapters/ の実装を集約し、消費者は useXxxAdapter() hook で取得する。
 * テストでは mock adapter を注入可能。
 */
import type { ReactNode } from 'react'
import { AdapterContext, type AdapterSet } from './adapterContextDef'

interface Props {
  readonly adapters: AdapterSet
  readonly children: ReactNode
}

export function AdapterProvider({ adapters, children }: Props) {
  return <AdapterContext.Provider value={adapters}>{children}</AdapterContext.Provider>
}
