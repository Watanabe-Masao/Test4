/**
 * IndexedDB メタデータ操作
 *
 * セッション情報・保存済み月一覧の管理。
 */
import type { PersistedMeta } from '@/domain/models/analysis'
import type { ReadModifyWriteOp } from './dbHelpers'
import { dbGet, dbGetAllKeys, STORE_META, STORE_MONTHLY } from './dbHelpers'

/** sessions メタデータエントリの型 */
export interface SessionEntry {
  readonly year: number
  readonly month: number
  readonly savedAt: string
}

/**
 * sessions 一覧の read-modify-write 操作を生成する。
 * 単一トランザクション内で sessions を読み取り → 更新 → 書き戻しを行う。
 */
export function sessionsReadModifyOp(
  year: number,
  month: number,
  savedAt: string,
): ReadModifyWriteOp {
  return {
    storeName: STORE_META,
    key: 'sessions',
    modify: (existing) => {
      const sessions: SessionEntry[] = Array.isArray(existing)
        ? (existing as SessionEntry[]).filter((s) => !(s.year === year && s.month === month))
        : []
      sessions.push({ year, month, savedAt })
      sessions.sort((a, b) => b.year - a.year || b.month - a.month)
      return sessions
    },
  }
}

/**
 * 最後に保存したセッションのメタデータを取得する
 */
export async function getPersistedMeta(): Promise<PersistedMeta | null> {
  const meta = await dbGet<PersistedMeta>(STORE_META, 'lastSession')
  return meta ?? null
}

/**
 * IndexedDB に保存されている全ての年月を一覧取得する。
 * sessions メタデータがあれば高速に返し、なければキーをパースしてフォールバック。
 */
export async function listStoredMonths(): Promise<{ year: number; month: number }[]> {
  // 新形式: sessions メタデータから取得（高速）
  const sessions = await dbGet<SessionEntry[]>(STORE_META, 'sessions')
  if (Array.isArray(sessions) && sessions.length > 0) {
    return sessions.map((s) => ({ year: s.year, month: s.month }))
  }

  // 旧形式フォールバック: キーをパース
  const keys = await dbGetAllKeys(STORE_MONTHLY)
  const monthSet = new Set<string>()
  for (const key of keys) {
    const match = (key as string).match(/^(\d{4})-(\d{2})_/)
    if (match) {
      monthSet.add(`${match[1]}-${match[2]}`)
    }
  }
  return Array.from(monthSet)
    .map((ym) => {
      const [y, m] = ym.split('-')
      return { year: Number(y), month: Number(m) }
    })
    .sort((a, b) => b.year - a.year || b.month - a.month)
}
