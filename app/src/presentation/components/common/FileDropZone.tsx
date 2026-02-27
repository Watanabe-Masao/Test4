import styled from 'styled-components'
import { useState, useCallback, useRef, type DragEvent } from 'react'

const Zone = styled.div<{ $isDragOver: boolean }>`
  border: 2px dashed
    ${({ $isDragOver, theme }) =>
      $isDragOver ? theme.colors.palette.success : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[10]};
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

const Icon = styled.div`
  font-size: 1.8rem;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
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

/** DataTransferItem のエントリからファイルを再帰的に収集する */
async function collectFilesFromEntries(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = []

  const readEntry = (entry: FileSystemEntry): Promise<void> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        ;(entry as FileSystemFileEntry).file((f) => {
          if (isAcceptedFile(f.name)) files.push(f)
          resolve()
        })
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader()
        reader.readEntries(async (entries) => {
          for (const e of entries) await readEntry(e)
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  const entries: FileSystemEntry[] = []
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.()
    if (entry) entries.push(entry)
  }

  for (const entry of entries) await readEntry(entry)
  return files
}

export function FileDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(Array.from(e.target.files))
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
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </Zone>
  )
}
