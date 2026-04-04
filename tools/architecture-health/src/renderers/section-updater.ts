/**
 * Section Updater — ドキュメント内の generated section を更新する
 *
 * マーカー:
 *   <!-- GENERATED:START <section-id> -->
 *   ...（CI が更新する）
 *   <!-- GENERATED:END <section-id> -->
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface SectionUpdate {
  readonly filePath: string
  readonly sectionId: string
  readonly content: string
}

/**
 * ファイル内の generated section を新しいコンテンツで置換する。
 * section が見つからなければ何もしない（warn を返す）。
 */
function updateSection(
  fileContent: string,
  sectionId: string,
  newContent: string,
): { updated: string; found: boolean } {
  const startTag = `<!-- GENERATED:START ${sectionId} -->`
  const endTag = `<!-- GENERATED:END ${sectionId} -->`

  const startIdx = fileContent.indexOf(startTag)
  const endIdx = fileContent.indexOf(endTag)

  if (startIdx === -1 || endIdx === -1) {
    return { updated: fileContent, found: false }
  }

  const before = fileContent.slice(0, startIdx + startTag.length)
  const after = fileContent.slice(endIdx)

  return {
    updated: `${before}\n${newContent}\n${after}`,
    found: true,
  }
}

export interface UpdateResult {
  readonly file: string
  readonly sectionId: string
  readonly status: 'updated' | 'not_found' | 'unchanged'
}

export function updateGeneratedSections(
  repoRoot: string,
  updates: readonly SectionUpdate[],
): UpdateResult[] {
  const results: UpdateResult[] = []

  for (const update of updates) {
    const absPath = resolve(repoRoot, update.filePath)
    const original = readFileSync(absPath, 'utf-8')
    const { updated, found } = updateSection(original, update.sectionId, update.content)

    if (!found) {
      results.push({ file: update.filePath, sectionId: update.sectionId, status: 'not_found' })
    } else if (updated === original) {
      results.push({ file: update.filePath, sectionId: update.sectionId, status: 'unchanged' })
    } else {
      writeFileSync(absPath, updated, 'utf-8')
      results.push({ file: update.filePath, sectionId: update.sectionId, status: 'updated' })
    }
  }

  return results
}
