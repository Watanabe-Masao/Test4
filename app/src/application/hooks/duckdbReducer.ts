/**
 * useDuckDB の状態管理リデューサー（純粋関数）
 *
 * 9個の useState を1つの useReducer に集約し、
 * 状態遷移を明示的なアクションで管理する。
 *
 * @responsibility R:reducer
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface DuckDBReducerState {
  readonly engineState: import('@/infrastructure/duckdb/engine').DuckDBEngineState
  readonly isLoading: boolean
  readonly error: string | null
  readonly dataVersion: number
  readonly conn: AsyncDuckDBConnection | null
  readonly db: AsyncDuckDB | null
  readonly loadedMonthCount: number
  readonly storedMonthsKey: string
}

export type DuckDBAction =
  | {
      type: 'SET_ENGINE_STATE'
      engineState: import('@/infrastructure/duckdb/engine').DuckDBEngineState
    }
  | { type: 'SET_CONN_DB'; conn: AsyncDuckDBConnection; db: AsyncDuckDB | null }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; monthCount: number }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'LOAD_END' }
  | { type: 'SET_STORED_MONTHS_KEY'; key: string }

export const INITIAL_DUCKDB_STATE: DuckDBReducerState = {
  engineState: 'idle',
  isLoading: false,
  error: null,
  dataVersion: 0,
  conn: null,
  db: null,
  loadedMonthCount: 0,
  storedMonthsKey: '',
}

export function duckdbReducer(state: DuckDBReducerState, action: DuckDBAction): DuckDBReducerState {
  switch (action.type) {
    case 'SET_ENGINE_STATE':
      return { ...state, engineState: action.engineState }
    case 'SET_CONN_DB':
      return { ...state, conn: action.conn, db: action.db }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null }
    case 'LOAD_SUCCESS':
      return {
        ...state,
        loadedMonthCount: action.monthCount,
        dataVersion: state.dataVersion + 1,
      }
    case 'LOAD_ERROR':
      return { ...state, error: action.error }
    case 'LOAD_END':
      return { ...state, isLoading: false }
    case 'SET_STORED_MONTHS_KEY':
      return state.storedMonthsKey === action.key
        ? state
        : { ...state, storedMonthsKey: action.key }
  }
}
