/**
 * 自動取込の「処理済み指紋」台帳
 *
 * ファイル名 + サイズ + 最終更新日時 を連結した指紋を localStorage に永続化する。
 * useAutoImport から scan orchestration を切り離すために抽出した純粋モジュール。
 *
 * @responsibility R:unclassified
 */
import { loadJson, saveJson } from '@/application/adapters/uiPersistenceAdapter'
import type { ImportSummary } from '@/domain/models/ImportResult'

const PROCESSED_FILES_KEY = 'shiire-arari-import-processed'

/** 処理済みファイルの識別子（name + size + lastModified） */
export function fileFingerprint(name: string, size: number, lastModified: number): string {
  return `${name}|${size}|${lastModified}`
}

export function loadProcessedFingerprints(): Set<string> {
  return new Set(loadJson<string[]>(PROCESSED_FILES_KEY, []))
}

export function saveProcessedFingerprints(fingerprints: Set<string>): void {
  saveJson(PROCESSED_FILES_KEY, [...fingerprints])
}

/**
 * summary から「成功した file.name」の集合を抽出する。
 *
 * void / undefined の場合は「全件成功とみなして全件の fingerprint を commit する」
 * 互換動作。silent drop された空 summary（successCount=0, results=[]）は 0 件扱いとし、
 * 次回スキャンで再試行できるようにする。
 */
export function collectSuccessFilenames(
  summary: ImportSummary | void,
  submittedFiles: readonly File[],
): Set<string> {
  if (!summary) return new Set(submittedFiles.map((f) => f.name))
  if (summary.results.length === 0 && summary.successCount === 0) return new Set()
  const success = new Set<string>()
  for (const r of summary.results) if (r.ok) success.add(r.filename)
  return success
}
