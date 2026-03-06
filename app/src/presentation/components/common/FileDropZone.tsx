import styled from 'styled-components'
import { useState, useCallback, useRef, type DragEvent } from 'react'

const Zone = styled.div<{ $isDragOver: boolean }>`
  border: 2px dashed
    ${({ $isDragOver, theme }) =>
      $isDragOver ? theme.colors.palette.success : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  text-align: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: ${({ $isDragOver, theme }) =>
    $isDragOver ? `${theme.colors.palette.success}10` : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    background: ${({ theme }) => theme.colors.palette.primary}08;
  }
`

const FolderButton = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.primary};
  border: 1px solid ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.palette.primary}12;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

const Icon = styled.div`
  font-size: 1.2rem;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const MainText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const HintText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[2]};
`

const ACCEPT_EXTENSIONS = ['.xlsx', '.xls', '.csv']

function isAcceptedFile(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPT_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** readEntries は1回で最大100件しか返さないため、空になるまで繰り返す */
function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = []
    const readBatch = () => {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(all)
        } else {
          all.push(...entries)
          readBatch()
        }
      }, reject)
    }
    readBatch()
  })
}

/** DataTransferItem のエントリからファイルを再帰的に収集する */
async function collectFilesFromEntries(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = []

  const readEntry = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const f = await new Promise<File>((resolve) => {
        ;(entry as FileSystemFileEntry).file(resolve)
      })
      if (isAcceptedFile(f.name)) files.push(f)
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const entries = await readAllEntries(reader)
      for (const e of entries) await readEntry(e)
    }
  }

  const entries: FileSystemEntry[] = []
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.()
    if (entry) entries.push(entry)
  }

  for (const entry of entries) await readEntry(entry)
  return files
}

/** input[webkitdirectory] から取得した FileList を拡張子フィルタする */
function filterAcceptedFiles(fileList: FileList): File[] {
  const result: File[] = []
  for (let i = 0; i < fileList.length; i++) {
    if (isAcceptedFile(fileList[i].name)) result.push(fileList[i])
  }
  return result
}

export function FileDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      // フォルダが含まれる場合は再帰的にファイルを収集
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const hasDirectory = Array.from(e.dataTransfer.items).some(
          (item) => item.webkitGetAsEntry?.()?.isDirectory,
        )

        if (hasDirectory) {
          const files = await collectFilesFromEntries(e.dataTransfer.items)
          if (files.length > 0) onFiles(files)
          return
        }
      }

      // 通常のファイルドロップ
      if (e.dataTransfer.files.length > 0) {
        onFiles(Array.from(e.dataTransfer.files))
      }
    },
    [onFiles],
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(Array.from(e.target.files))
        e.target.value = ''
      }
    },
    [onFiles],
  )

  const handleFolderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dirInputRef.current?.click()
  }, [])

  const handleDirChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const accepted = filterAcceptedFiles(e.target.files)
        if (accepted.length > 0) onFiles(accepted)
        e.target.value = ''
      }
    },
    [onFiles],
  )

  return (
    <Zone
      $isDragOver={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <Icon>📂</Icon>
      <MainText>ファイル/フォルダをドラッグ＆ドロップ</MainText>
      <HintText>Excel (.xlsx, .xls) / CSV (.csv) 対応</HintText>
      <FolderButton onClick={handleFolderClick} type="button">
        📁 フォルダを選択
      </FolderButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={dirInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is a non-standard attribute
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={handleDirChange}
      />
    </Zone>
  )
}
