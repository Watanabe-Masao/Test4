/**
 * FileSystemPort — File System Access API の契約
 *
 * infrastructure/storage/folderAccess を隠蔽する。
 * 自動バックアップ・自動インポートで使用。
 */

export interface FileEntry {
  readonly name: string
  readonly handle: FileSystemFileHandle
}

export interface FileSystemPort {
  isFileSystemAccessSupported(): boolean
  pickDirectory(storageKey: string): Promise<FileSystemDirectoryHandle | null>
  getStoredHandle(storageKey: string): Promise<FileSystemDirectoryHandle | null>
  removeHandle(storageKey: string): Promise<void>
  listFiles(
    dirHandle: FileSystemDirectoryHandle,
    extensions?: readonly string[],
  ): Promise<readonly FileEntry[]>
}
