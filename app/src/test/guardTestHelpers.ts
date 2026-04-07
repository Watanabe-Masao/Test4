/**
 * ガードテスト共有ヘルパー
 *
 * 複数のガードテストで重複していたユーティリティを集約。
 * テストファイルではないため vitest に拾われない。
 */
import * as fs from 'fs'
import * as path from 'path'

/** app/src/ ディレクトリの絶対パス */
export const SRC_DIR = path.resolve(__dirname, '..')

/**
 * 指定ディレクトリ以下の .ts/.tsx ファイルを再帰収集する。
 * node_modules, dist, __tests__ は除外。
 */
export function collectTsFiles(dir: string, excludeTests = true): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__')
        continue
      results.push(...collectTsFiles(fullPath, excludeTests))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      if (excludeTests && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')))
        continue
      results.push(fullPath)
    }
  }
  return results
}

/**
 * テストファイルのみを再帰収集する。
 */
export function collectTestFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      results.push(...collectTestFiles(fullPath))
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
      results.push(fullPath)
    }
  }
  return results
}

/** SRC_DIR からの相対パスを返す */
export function rel(filePath: string): string {
  return path.relative(SRC_DIR, filePath)
}

/**
 * ファイルから @/ 形式の import/export パスを抽出する（type import 含む）。
 */
export function extractImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports: string[] = []
  const regex =
    /(?:import\s+(?:.*?\s+from\s+)?['"](@\/[^'"]+)['"]|export\s+.*?\s+from\s+['"](@\/[^'"]+)['"])/g
  let match
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1] ?? match[2])
  }
  return imports
}

/**
 * ファイルから @/ 形式の値 import パスを抽出する（import type / export type は除外）。
 */
export function extractValueImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports: string[] = []
  const regex =
    /(?:import\s+(?!type\s)(?:.*?\s+from\s+)?['"](@\/[^'"]+)['"]|export\s+(?!type\s).*?\s+from\s+['"](@\/[^'"]+)['"])/g
  let match
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1] ?? match[2])
  }
  return imports
}

/** コメント行かどうかを判定する */
export function isCommentLine(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*/')
  )
}

/** コメント行を除外したコード部分のみを返す（hooks カウントの偽陽性防止） */
export function stripComments(content: string): string {
  return content
    .split('\n')
    .filter((line) => !isCommentLine(line))
    .join('\n')
}

/** 文字列リテラルを除去する（パターン検出の偽陽性防止用） */
export function stripStrings(line: string): string {
  return line
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '""')
}

// ─── 後方互換 re-export（F1: バレルで後方互換） ─────────
export { GUARD_TAG_REGISTRY } from './guardTagRegistry'
export type { GuardTagDef } from './guardTagRegistry'
