/**
 * File System Access API ラッパー
 *
 * ユーザーが選択したフォルダの FileSystemDirectoryHandle を IndexedDB に永続化し、
 * 自動バックアップ / 自動インポートの基盤を提供する。
 *
 * Chromium 系ブラウザ限定 (Chrome 86+, Edge 86+)。
 * Firefox / Safari は非対応 → isSupported() で判定して UI を切り替える。
 */

// ─── IndexedDB ストア（ハンドル専用） ────────────────────

const HANDLE_DB_NAME = 'shiire-arari-handles'
const HANDLE_DB_VERSION = 1
const HANDLE_STORE = 'directoryHandles'

/** バックアップ用 / インポート用の2スロット */
export type HandleSlot = 'backup' | 'import'

let handleDbPromise: Promise<IDBDatabase> | null = null

function openHandleDB(): Promise<IDBDatabase> {
  if (handleDbPromise) return handleDbPromise
  handleDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, HANDLE_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return handleDbPromise
}

// ─── 公開 API ────────────────────────────────────────────

/** File System Access API がサポートされているか */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * フォルダ選択ダイアログを表示して FileSystemDirectoryHandle を取得する。
 * ユーザーがキャンセルした場合は null を返す。
 */
export async function pickDirectory(slot: HandleSlot): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null
  try {
    // showDirectoryPicker は Chromium 系のみ
    const handle = await (
      window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
    ).showDirectoryPicker()
    await saveHandle(slot, handle)
    return handle
  } catch (err) {
    // AbortError = ユーザーキャンセル
    if (err instanceof DOMException && err.name === 'AbortError') return null
    throw err
  }
}

/**
 * 保存済みのディレクトリハンドルを IndexedDB から復元する。
 * 権限が失われている場合は再要求を試みる。
 */
export async function getStoredHandle(slot: HandleSlot): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDB()
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly')
    const store = tx.objectStore(HANDLE_STORE)
    const req = store.get(slot)
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null)
    req.onerror = () => reject(req.error)
  })
  if (!handle) return null

  // 権限確認: readwrite が必要（バックアップ書き込みのため）
  const mode = slot === 'backup' ? 'readwrite' : 'read'
  const permission = await handle.queryPermission({ mode })
  if (permission === 'granted') return handle

  // 権限を再要求（ユーザージェスチャが必要なため失敗する可能性がある）
  try {
    const result = await handle.requestPermission({ mode })
    return result === 'granted' ? handle : null
  } catch {
    return null
  }
}

/** ディレクトリハンドルを IndexedDB に保存 */
async function saveHandle(slot: HandleSlot, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite')
    const store = tx.objectStore(HANDLE_STORE)
    const req = store.put(handle, slot)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** 保存済みのディレクトリハンドルを削除する */
export async function removeHandle(slot: HandleSlot): Promise<void> {
  const db = await openHandleDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite')
    const store = tx.objectStore(HANDLE_STORE)
    const req = store.delete(slot)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * フォルダ内のファイル一覧を取得する。
 * glob パターンではなく拡張子フィルタで絞り込む。
 */
export async function listFiles(
  dirHandle: FileSystemDirectoryHandle,
  extensions?: readonly string[],
): Promise<{ name: string; handle: FileSystemFileHandle }[]> {
  const files: { name: string; handle: FileSystemFileHandle }[] = []
  for await (const [name, entryHandle] of dirHandle.entries()) {
    if (entryHandle.kind !== 'file') continue
    if (extensions && extensions.length > 0) {
      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
      if (!extensions.includes(ext)) continue
    }
    files.push({ name, handle: entryHandle as FileSystemFileHandle })
  }
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * フォルダにファイルを書き出す。
 * 既存ファイルは上書きされる。
 */
export async function writeFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  data: Blob | string,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(data)
  } finally {
    await writable.close()
  }
}

/**
 * フォルダ内の古いバックアップを世代管理する。
 * prefix に一致するファイルを日時降順でソートし、maxGenerations を超える分を削除する。
 */
export async function pruneOldFiles(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  maxGenerations: number,
): Promise<number> {
  const allFiles = await listFiles(dirHandle, ['.json'])
  const matching = allFiles
    .filter((f) => f.name.startsWith(prefix))
    .sort((a, b) => b.name.localeCompare(a.name)) // 新しい順（ファイル名に日時含む前提）

  let removed = 0
  for (let i = maxGenerations; i < matching.length; i++) {
    await dirHandle.removeEntry(matching[i].name)
    removed++
  }
  return removed
}
