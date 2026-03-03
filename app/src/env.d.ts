/// <reference types="vite/client" />

// ─── File System Access API (Chromium 拡張) ─────────────
// queryPermission / requestPermission / entries は Chromium 系のみ。
// 標準 DOM types に含まれないため補完する。
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}
