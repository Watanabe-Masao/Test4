/**
 * Arrow IPC I/O ユーティリティ
 *
 * DuckDB クエリ結果を Apache Arrow IPC 形式で扱うためのヘルパー。
 * Worker ↔ メインスレッド間のデータ転送を Transferable (ArrayBuffer) で
 * 高速化するために使用する。
 *
 * DuckDB-WASM の conn.query() は Arrow Table を返すため、
 * これを IPC バイト列にシリアライズして Worker.postMessage() で転送し、
 * メインスレッド側でデシリアライズする。
 *
 * 依存: apache-arrow（@duckdb/duckdb-wasm のトランジティブ依存）
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { tableToIPC, tableFromIPC, type Table } from 'apache-arrow'

/**
 * SQL を実行し、結果を Arrow IPC バイト列として返す。
 * Worker 内でクエリ実行 → IPC シリアライズし、Transferable で転送するケースに使用。
 *
 * @returns ArrayBuffer（Arrow IPC 形式）
 */
export async function queryToArrowIPC(
  conn: AsyncDuckDBConnection,
  sql: string,
): Promise<ArrayBuffer> {
  const result = await conn.query(sql)
  const ipcBytes = tableToIPC(result)
  // Uint8Array → 独立した ArrayBuffer（Transferable に使えるようコピー）
  const copy = new ArrayBuffer(ipcBytes.byteLength)
  new Uint8Array(copy).set(ipcBytes)
  return copy
}

/**
 * Arrow IPC バイト列から Arrow Table を復元する。
 * メインスレッド側で Worker から受信した ArrayBuffer をデシリアライズするケースに使用。
 */
export function arrowIPCToTable(buffer: ArrayBuffer): Table {
  return tableFromIPC(new Uint8Array(buffer))
}

/**
 * snake_case → camelCase 変換
 */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Arrow Table を camelCase 変換済みの JS Object 配列に変換する。
 * queryToObjects と同等の結果を Arrow Table から生成する。
 */
export function arrowTableToObjects<T>(table: Table): readonly T[] {
  const rows = table.toArray()
  return rows.map((row) => {
    const obj: Record<string, unknown> = {}
    for (const key of Object.keys(row)) {
      const val = (row as Record<string, unknown>)[key]
      obj[snakeToCamel(key)] = typeof val === 'bigint' ? Number(val) : val
    }
    return obj as T
  })
}

/**
 * Arrow IPC バイト列を直接 JS Object 配列に変換する。
 * IPC → Table → Objects のショートカット。
 */
export function arrowIPCToObjects<T>(buffer: ArrayBuffer): readonly T[] {
  const table = arrowIPCToTable(buffer)
  return arrowTableToObjects<T>(table)
}
