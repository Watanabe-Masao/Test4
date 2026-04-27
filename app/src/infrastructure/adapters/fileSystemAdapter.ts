/**
 * FileSystemAdapter — FileSystemPort の infrastructure 実装
 *
 * @guard A1 application/adapters/ 経由で infrastructure にアクセス
 * @see guards/layerBoundaryGuard.test.ts
 *
 * @responsibility R:unclassified
 */
import {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
  listFiles,
} from '@/infrastructure/storage/folderAccess'
import type { FileSystemPort } from '@/domain/ports/FileSystemPort'

export const fileSystemAdapter: FileSystemPort = {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
  listFiles,
}
