/**
 * AdapterProvider — AdapterSet を Context 経由で供給する
 *
 * domain/ports/* に対応する adapter 実装を集約し、
 * 消費者は useXxxAdapter() hook で取得する。
 * テストでは mock adapter を注入可能。
 *
 * @responsibility R:unclassified
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
