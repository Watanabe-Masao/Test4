/**
 * useToast フック（Toast から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（Provider）とフックを別ファイルに分離。
 * @responsibility R:context
 */
import { useContext } from 'react'
import { ToastContext } from './toastContextDef'
import type { ShowToast } from './toastContextDef'

export function useToast(): ShowToast {
  return useContext(ToastContext)
}
