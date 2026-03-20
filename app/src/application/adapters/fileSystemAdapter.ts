/**
 * FileSystemAdapter — FileSystemPort の infrastructure 実装
 */
import {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
  listFiles,
} from '@/infrastructure/storage/folderAccess'
import type { FileSystemPort } from '@/application/ports/FileSystemPort'

export const fileSystemAdapter: FileSystemPort = {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
  listFiles,
}
