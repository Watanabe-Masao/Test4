/**
 * Phase 7.1: PWA インストールプロンプトフック
 *
 * - beforeinstallprompt イベントをキャプチャし、
 *   ユーザーの任意のタイミングでインストールを促すことができる。
 * - インストール状態を追跡する。
 */
import { useState, useEffect, useCallback, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export interface UsePwaInstallResult {
  /** インストール可能な状態か */
  canInstall: boolean
  /** 既にインストール済みか */
  isInstalled: boolean
  /** インストールプロンプトを表示する */
  promptInstall: () => Promise<boolean>
}

export function usePwaInstall(): UsePwaInstallResult {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    if (isInstalled) return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      deferredPrompt.current = null
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt.current) return false

    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    setCanInstall(false)

    return outcome === 'accepted'
  }, [])

  return { canInstall, isInstalled, promptInstall }
}
