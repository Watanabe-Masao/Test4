/**
 * Toast コンテキスト定義（型 + createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext と型定義を .ts ファイルに分離。
 * @responsibility R:utility
 */
import { createContext } from 'react'

export type ToastLevel = 'success' | 'error' | 'warning' | 'info'
export type ShowToast = (message: string, level?: ToastLevel) => void

export const ToastContext = createContext<ShowToast>(() => {})
