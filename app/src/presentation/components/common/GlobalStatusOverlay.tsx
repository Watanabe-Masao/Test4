/**
 * グローバルステータスオーバーレイ
 *
 * App Lifecycle の blocking 状態時にフルスクリーンオーバーレイを表示する。
 * error フェーズは non-blocking だが、ユーザーにエラーを通知するため常に表示する。
 *
 * UI は application が決めた意味を描画するだけ。状態の生成・判断を行わない。
 * @responsibility R:widget
 */
import { useAppLifecycleContext } from '@/application/lifecycle'
import type { AppLifecyclePhase } from '@/application/lifecycle'
import { useI18n } from '@/application/hooks/useI18n'
import { Overlay, Spinner, Title, Detail, ErrorIcon } from './GlobalStatusOverlay.styles'

// ─── フェーズ → メッセージキーのマッピング ────────────────

type LifecycleMessageKey =
  | 'booting'
  | 'restoring'
  | 'initializingEngine'
  | 'loadingData'
  | 'applyingUpdate'
  | 'error'

const PHASE_MESSAGE_KEY: Record<AppLifecyclePhase, LifecycleMessageKey> = {
  booting: 'booting',
  restoring: 'restoring',
  initializing_engine: 'initializingEngine',
  loading_data: 'loadingData',
  applying_update: 'applyingUpdate',
  ready: 'booting', // 表示されないが型安全のため
  error: 'error',
}

// ─── コンポーネント ──────────────────────────────────────

export function GlobalStatusOverlay() {
  const status = useAppLifecycleContext()
  const { messages } = useI18n()

  // エラー時は blocking でなくても表示する
  if (status.phase === 'error') {
    return (
      <Overlay role="alert" aria-live="assertive">
        <ErrorIcon aria-hidden="true">!</ErrorIcon>
        <Title>{messages.lifecycle.error}</Title>
        {status.error && <Detail>{status.error}</Detail>}
      </Overlay>
    )
  }

  // blocking でない場合は表示しない
  if (!status.blocking) return null

  const messageKey = PHASE_MESSAGE_KEY[status.phase]

  return (
    <Overlay role="status" aria-live="polite">
      <Spinner aria-hidden="true" />
      <Title>{messages.lifecycle[messageKey]}</Title>
      {status.phase === 'applying_update' && (
        <Detail>{messages.lifecycle.applyingUpdateDetail}</Detail>
      )}
    </Overlay>
  )
}
