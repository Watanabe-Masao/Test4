/**
 * App Lifecycle モジュール
 *
 * アプリ全体のライフサイクル状態を管理する。
 */
export type { AppLifecyclePhase, AppLifecycleStatus, AppReadiness } from './appLifecycleContract'
export { isBlockingPhase } from './appLifecycleContract'
export { AppLifecycleProvider } from './AppLifecycleProvider'
export { useAppLifecycleContext } from './appLifecycleContextDef'
export { notifySwUpdate } from './swUpdateSignal'
