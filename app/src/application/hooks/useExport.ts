/**
 * エクスポート機能フック
 *
 * ExportPort インターフェースを返す。
 * Presentation 層はこのフックを経由してエクスポート機能にアクセスする。
 */
import { exportService } from '@/application/usecases/export/ExportService'
import type { ExportPort } from '@/domain/ports/ExportPort'

export function useExport(): ExportPort {
  return exportService
}
