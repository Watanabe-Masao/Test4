/// <reference types="vite/client" />

// ─── Vite 環境変数の型定義 ──────────────────────────────
interface ImportMetaEnv {
  readonly VITE_JMA_PROXY_URL?: string
}

// ─── File System Access API (Chromium 拡張) ─────────────
// queryPermission / requestPermission / entries は Chromium 系のみ。
// 標準 DOM types に含まれないため補完する。
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}
