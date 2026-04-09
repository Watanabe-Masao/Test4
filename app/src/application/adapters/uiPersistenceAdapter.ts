/**
 * uiPersistenceAdapter — UI 永続化の統一アダプター
 *
 * アプリ内の全 localStorage 操作を一箇所に集約する。
 *
 * 責務:
 *   - localStorage の読み書きを一箇所に集約
 *   - schema version 管理 + safe fallback
 *   - テスト時のモック差し替え容易化
 *   - 永続化キーの一覧管理（STORAGE_KEYS）
 *
 * @guard C3 store は state 反映のみ（永続化ロジックをストアから分離）
 */

/**
 * アプリ全体で使用される localStorage キーの一覧。
 * 新しいキーを追加する場合は必ずここに登録する。
 */
export const STORAGE_KEYS = {
  /** カスタムページ一覧 */
  CUSTOM_PAGES: 'custom_pages_v1',
  /** ダッシュボード レイアウト（レガシー） */
  DASHBOARD_LAYOUT: 'dashboard_layout_v12',
  /** ダッシュボード レイアウト（新版） */
  DASHBOARD_LAYOUT_V14: 'dashboard_layout_v14',
  /** マルチページ widget レイアウト（ページキーを含む） */
  widgetLayout: (pageKey: string) => `widget_layout_${pageKey}_v1` as const,
  /** ダッシュボード アクティブプリセット */
  DASHBOARD_ACTIVE_PRESET: 'dashboard_active_preset',
  /** ダッシュボード カスタムプリセット */
  DASHBOARD_CUSTOM_PRESETS: 'dashboard_custom_presets_v1',
  /** ダッシュボード 自動注入済みウィジェット */
  DASHBOARD_AUTO_INJECTED: 'dashboard_auto_injected_v3',
  /** テーマ（dark / light） */
  THEME: 'theme',
  /** ロケール（ja / en） */
  LOCALE: 'shiire-arari-locale',
  /** Zustand 設定ストア */
  SETTINGS: 'shiire-arari-settings',
  /** WASM 実行モード */
  EXECUTION_MODE: 'factorDecomposition.executionMode',
} as const

/** localStorage 互換の最小インターフェース（テスト用モック対応） */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** デフォルトバックエンド: localStorage */
let _backend: StorageBackend =
  typeof localStorage !== 'undefined'
    ? localStorage
    : { getItem: () => null, setItem: () => {}, removeItem: () => {} }

/** テスト用: バックエンドを差し替える */
export function setStorageBackend(backend: StorageBackend): void {
  _backend = backend
}

/** テスト用: バックエンドをリセットする */
export function resetStorageBackend(): void {
  _backend =
    typeof localStorage !== 'undefined'
      ? localStorage
      : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
}

/**
 * 型安全な読み込み。
 * parse に失敗したら fallback を返す（safe fallback migration）。
 */
export function loadJson<T>(key: string, fallback: T, validate?: (raw: unknown) => T | null): T {
  try {
    const raw = _backend.getItem(key)
    if (raw == null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (validate) {
      const result = validate(parsed)
      return result ?? fallback
    }
    return parsed as T
  } catch {
    return fallback
  }
}

/** 型安全な保存 */
export function saveJson<T>(key: string, value: T): void {
  try {
    _backend.setItem(key, JSON.stringify(value))
  } catch {
    // storage quota exceeded — silently ignore
  }
}

/** キーの削除 */
export function removeKey(key: string): void {
  try {
    _backend.removeItem(key)
  } catch {
    // ignore
  }
}

/** 生の文字列を読み込む（JSON でない値用） */
export function loadRaw(key: string): string | null {
  try {
    return _backend.getItem(key)
  } catch {
    return null
  }
}

/** 生の文字列を保存する（JSON でない値用） */
export function saveRaw(key: string, value: string): void {
  try {
    _backend.setItem(key, value)
  } catch {
    // storage quota exceeded — silently ignore
  }
}

/**
 * Zustand persist middleware 互換の StorageBackend を返す。
 * テスト時は setStorageBackend() で差し替えたバックエンドが使われる。
 */
export function getZustandStorage(): StorageBackend {
  return {
    getItem: (key) => _backend.getItem(key),
    setItem: (key, value) => _backend.setItem(key, value),
    removeItem: (key) => _backend.removeItem(key),
  }
}
