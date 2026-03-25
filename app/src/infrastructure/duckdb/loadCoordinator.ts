/**
 * DuckDB ロード直列化コーディネーター
 *
 * 全 useDuckDB インスタンスが同一の DuckDB コネクションを共有するため、
 * resetTables/loadMonth のインターリーブを防ぐグローバルミューテックスを提供する。
 *
 * React 非依存・ドメイン非依存の並行制御プリミティブ。
 */

/**
 * ミューテックスを取得する。
 * 先行のロードが完了するまで待機し、release 関数を返す。
 * 呼び出し側は必ず finally で release() を呼ぶこと。
 */
export function acquireMutex(): Promise<() => void> {
  const prevLoad = globalLoadMutex
  let releaseMutex: () => void
  globalLoadMutex = new Promise<void>((resolve) => {
    releaseMutex = resolve
  })

  return prevLoad
    .catch(() => {
      // 先行ロードのエラーは無視（自身のロードに影響しない）
    })
    .then(() => releaseMutex!)
}

// グローバルミューテックス: 全 useDuckDB インスタンスの loadData を直列化する。
let globalLoadMutex: Promise<void> = Promise.resolve()

/** テスト用: ミューテックスをリセットする */
export function resetLoadMutex(): void {
  globalLoadMutex = Promise.resolve()
}
