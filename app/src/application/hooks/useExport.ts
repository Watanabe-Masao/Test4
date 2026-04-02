/**
 * エクスポート機能フック
 *
 * AdapterContext 経由で ExportPort を取得する。
 * Presentation 層はこのフックを経由してエクスポート機能にアクセスする。
 */
import { useContext } from 'react'
import { AdapterContext } from '@/application/context/adapterContextDef'
import type { ExportPort } from '@/domain/ports/ExportPort'

export function useExport(): ExportPort {
  const adapters = useContext(AdapterContext)
  if (!adapters) {
    throw new Error('useExport must be used within an AdapterProvider')
  }
  return adapters.export
}
