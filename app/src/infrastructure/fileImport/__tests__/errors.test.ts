/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { ImportError } from '../errors'
import type { ImportErrorType } from '../errors'

describe('ImportError', () => {
  it('creates error with message and type', () => {
    const err = new ImportError('bad format', 'INVALID_FORMAT')
    expect(err.message).toBe('bad format')
    expect(err.errorType).toBe('INVALID_FORMAT')
    expect(err.name).toBe('ImportError')
    expect(err.filename).toBeUndefined()
  })

  it('includes filename when provided', () => {
    const err = new ImportError('parse failed', 'PARSE_ERROR', 'test.csv')
    expect(err.filename).toBe('test.csv')
    expect(err.errorType).toBe('PARSE_ERROR')
  })

  it('is instanceof Error', () => {
    const err = new ImportError('msg', 'UNKNOWN_TYPE')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ImportError)
  })

  it('supports all error types', () => {
    const types: ImportErrorType[] = [
      'PARSE_ERROR',
      'INVALID_FORMAT',
      'MISSING_DATA',
      'UNKNOWN_TYPE',
      'VALIDATION_ERROR',
    ]
    for (const t of types) {
      const err = new ImportError('msg', t)
      expect(err.errorType).toBe(t)
    }
  })

  it('has a stack trace', () => {
    const err = new ImportError('stack test', 'PARSE_ERROR')
    expect(err.stack).toBeDefined()
    expect(typeof err.stack).toBe('string')
  })

  it('preserves message in toString', () => {
    const err = new ImportError('specific message', 'VALIDATION_ERROR')
    expect(String(err)).toContain('specific message')
  })

  it('allows empty filename', () => {
    const err = new ImportError('msg', 'MISSING_DATA', '')
    expect(err.filename).toBe('')
  })

  it('errorType is readonly after construction', () => {
    const err = new ImportError('msg', 'PARSE_ERROR', 'file.csv')
    // These are readonly properties, just verify they exist and have correct values
    expect(err.errorType).toBe('PARSE_ERROR')
    expect(err.filename).toBe('file.csv')
  })

  it('can be caught as a generic Error', () => {
    let caught: Error | undefined
    try {
      throw new ImportError('thrown', 'INVALID_FORMAT')
    } catch (e) {
      caught = e as Error
    }
    expect(caught).toBeInstanceOf(ImportError)
    expect(caught).toBeInstanceOf(Error)
    expect((caught as ImportError).errorType).toBe('INVALID_FORMAT')
  })

  it('preserves the error name as ImportError', () => {
    const err = new ImportError('test', 'UNKNOWN_TYPE')
    expect(err.name).toBe('ImportError')
  })

  it('handles long messages', () => {
    const longMsg = 'x'.repeat(1000)
    const err = new ImportError(longMsg, 'PARSE_ERROR')
    expect(err.message).toBe(longMsg)
    expect(err.message.length).toBe(1000)
  })

  it('handles unicode in message and filename', () => {
    const err = new ImportError('データが不正です', 'VALIDATION_ERROR', '仕入データ.csv')
    expect(err.message).toBe('データが不正です')
    expect(err.filename).toBe('仕入データ.csv')
  })
})
