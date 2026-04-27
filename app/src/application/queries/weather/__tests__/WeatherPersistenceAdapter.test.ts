/**
 * WeatherPersistenceAdapter — createWeatherPersister tests
 *
 * DuckDB 依存部分は mock で置換し、factory の条件分岐のみテストする。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { createWeatherPersister } from '../WeatherPersistenceAdapter'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'

describe('createWeatherPersister', () => {
  const mockConn = {} as AsyncDuckDBConnection
  const mockDb = {} as AsyncDuckDB

  it('conn=null で null を返す', () => {
    expect(createWeatherPersister(null, mockDb)).toBeNull()
  })

  it('db=null で null を返す', () => {
    expect(createWeatherPersister(mockConn, null)).toBeNull()
  })

  it('両方 null で null を返す', () => {
    expect(createWeatherPersister(null, null)).toBeNull()
  })

  it('両方あれば persister 関数を返す', () => {
    const persister = createWeatherPersister(mockConn, mockDb)
    expect(persister).not.toBeNull()
    expect(typeof persister).toBe('function')
  })
})
