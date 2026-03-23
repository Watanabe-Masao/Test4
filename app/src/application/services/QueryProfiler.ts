/**
 * クエリプロファイラー
 *
 * 直近 N 件のクエリ実行ログをリングバッファで保持し、
 * 開発ツールパネルやデバッグコンソールから閲覧可能にする。
 *
 * Application 層に配置（infrastructure 固有依存なし）。
 * infrastructure/ からは後方互換 re-export で参照可能。
 *
 * 使い方:
 * ```
 * import { queryProfiler } from '@/application/services/QueryProfiler'
 *
 * const profile = queryProfiler.start('SELECT * FROM ...')
 * profile.end(rowCount)   // 成功時
 * profile.fail(error)     // エラー時
 * queryProfiler.getEntries() // readonly QueryProfileEntry[]
 * ```
 */

export interface QueryProfileEntry {
  /** 一意ID */
  readonly id: number
  /** SQL テキスト */
  readonly sql: string
  /** 開始時刻 (ms, performance.now()) */
  readonly startTime: number
  /** 終了時刻 (ms) */
  readonly endTime: number | null
  /** 実行時間 (ms) */
  readonly durationMs: number | null
  /** 結果行数 */
  readonly rowCount: number | null
  /** 成功/失敗 */
  readonly status: 'running' | 'success' | 'error'
  /** エラーメッセージ（status=error 時） */
  readonly errorMessage: string | null
  /** 呼び出し元情報（任意） */
  readonly source: string | null
}

export interface ActiveProfile {
  /** クエリ完了を記録する */
  end(rowCount?: number): void
  /** クエリ失敗を記録する */
  fail(error: unknown): void
}

type ProfilerListener = () => void

const DEFAULT_MAX_ENTRIES = 100

class QueryProfiler {
  private readonly _entries: QueryProfileEntry[] = []
  private _nextId = 1
  private readonly _maxEntries: number
  private readonly _listeners = new Set<ProfilerListener>()

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this._maxEntries = maxEntries
  }

  /**
   * クエリ実行を開始する。
   * 返却される ActiveProfile の end() または fail() を呼んで完了を記録する。
   */
  start(sql: string, source?: string): ActiveProfile {
    const id = this._nextId++
    const startTime = performance.now()

    const entry: QueryProfileEntry = {
      id,
      sql,
      startTime,
      endTime: null,
      durationMs: null,
      rowCount: null,
      status: 'running',
      errorMessage: null,
      source: source ?? null,
    }

    this._addEntry(entry)

    return {
      end: (rowCount?: number) => {
        const endTime = performance.now()
        this._updateEntry(id, {
          endTime,
          durationMs: endTime - startTime,
          rowCount: rowCount ?? null,
          status: 'success',
        })
      },
      fail: (error: unknown) => {
        const endTime = performance.now()
        this._updateEntry(id, {
          endTime,
          durationMs: endTime - startTime,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      },
    }
  }

  /**
   * 保持しているエントリ一覧を返す（新しい順）。
   */
  getEntries(): readonly QueryProfileEntry[] {
    return [...this._entries].reverse()
  }

  /**
   * 統計情報を返す。
   */
  getStats(): {
    totalQueries: number
    successCount: number
    errorCount: number
    avgDurationMs: number
    maxDurationMs: number
    totalDurationMs: number
  } {
    let successCount = 0
    let errorCount = 0
    let totalDuration = 0
    let maxDuration = 0

    for (const entry of this._entries) {
      if (entry.status === 'success') {
        successCount++
        if (entry.durationMs !== null) {
          totalDuration += entry.durationMs
          maxDuration = Math.max(maxDuration, entry.durationMs)
        }
      } else if (entry.status === 'error') {
        errorCount++
      }
    }

    return {
      totalQueries: this._entries.length,
      successCount,
      errorCount,
      avgDurationMs: successCount > 0 ? totalDuration / successCount : 0,
      maxDurationMs: maxDuration,
      totalDurationMs: totalDuration,
    }
  }

  /**
   * 全エントリをクリアする。
   */
  clear(): void {
    this._entries.length = 0
    this._notify()
  }

  /**
   * 変更通知リスナーを登録する。
   * @returns 購読解除関数
   */
  onChange(listener: ProfilerListener): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  // ── 内部メソッド ──

  private _addEntry(entry: QueryProfileEntry): void {
    this._entries.push(entry)
    // リングバッファ: 上限を超えたら先頭を削除
    while (this._entries.length > this._maxEntries) {
      this._entries.shift()
    }
    this._notify()
  }

  private _updateEntry(id: number, updates: Partial<QueryProfileEntry>): void {
    const idx = this._entries.findIndex((e) => e.id === id)
    if (idx === -1) return
    this._entries[idx] = { ...this._entries[idx], ...updates }
    this._notify()
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener()
    }
  }
}

/** グローバルシングルトン */
export const queryProfiler = new QueryProfiler()
