/**
 * ストレージ永続化 API
 *
 * ブラウザの Persistent Storage API を利用して、ストレージの自動削除を抑止する。
 * IndexedDB + OPFS のデータが OS/ブラウザの容量管理で消されるリスクを低減。
 *
 * Chrome/Edge: ユーザー操作なしで許可される場合が多い（エンゲージメント基準）
 * Firefox: ユーザーにポップアップで許可を求める
 * Safari 15.2+: 対応
 */

export interface StorageEstimate {
  /** 使用量 (bytes) */
  readonly usage: number
  /** 割り当て上限 (bytes) */
  readonly quota: number
  /** 使用率 (0-1) */
  readonly usageRatio: number
}

/**
 * 永続ストレージを要求する。
 * 許可されると、ブラウザはストレージの自動クリーンアップからこのオリジンを除外する。
 *
 * @returns true=許可済み, false=拒否または未対応
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false
  }
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * 永続ストレージが既に許可されているか確認する。
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) {
    return false
  }
  try {
    return await navigator.storage.persisted()
  } catch {
    return false
  }
}

/**
 * ストレージ使用量と割り当て上限を取得する。
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) {
    return null
  }
  try {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage ?? 0
    const quota = estimate.quota ?? 0
    return {
      usage,
      quota,
      usageRatio: quota > 0 ? usage / quota : 0,
    }
  } catch {
    return null
  }
}

/**
 * OPFS (Origin Private File System) が利用可能か確認する。
 */
export async function isOpfsAvailable(): Promise<boolean> {
  try {
    await navigator.storage.getDirectory()
    return true
  } catch {
    return false
  }
}
