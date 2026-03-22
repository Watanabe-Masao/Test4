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

/** 文字列リテラルを除去する（パターン検出の偽陽性防止用） */
export function stripStrings(line: string): string {
  return line
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '""')
}

// ─── @guard タグレジストリ ────────────────────────────────

/**
 * 設計原則タグの正式定義（一元管理）。
 * 新しいタグを追加する場合はここに登録する。
 * CI テストがこのレジストリとコード内のタグの整合性を検証する。
 */
export const GUARD_TAG_REGISTRY: Record<string, string> = {
  // A: 層境界
  A1: '4層依存ルール',
  A2: 'Domain は純粋',
  A3: 'Presentation は描画専用',
  A4: '取得対象の契約は Domain で定義',
  A5: 'DI はコンポジションルート',
  A6: 'load 処理は3段階分離',
  // B: 実行エンジン境界
  B1: 'Authoritative 計算は domain/calculations のみ',
  B2: 'JS/SQL 二重実装禁止',
  B3: '率は domain/calculations で算出',
  // C: 純粋性と責務分離
  C1: '1ファイル = 1変更理由',
  C2: 'pure function は1仕様軸に閉じる',
  C3: 'store は state 反映のみ',
  C4: '描画は純粋',
  C5: '最小セレクタ',
  C6: 'facade は orchestration のみ',
  C7: '同義 API/action の併存禁止',
  // D: 数学的不変条件
  D1: '要因分解の合計は売上差に完全一致',
  D2: '引数を無視して再計算しない',
  D3: '不変条件はテストで守る',
  // E: 型安全と欠損処理
  E1: '境界で検証',
  E2: '依存配列は省略しない',
  E3: 'sourceDate を落とさない',
  E4: '欠損判定は == null',
  // F: コード構造規約
  F1: 'バレルで後方互換',
  F2: '文字列はカタログ',
  F3: '全パターンに例外なし',
  F4: '配置はパスで決まる',
  F5: '横断的関心事は Contract で管理',
  F6: 'チャート間データは文脈継承',
  F7: 'View は ViewModel のみ受け取る',
  F8: '独立互換で正本を汚さない',
  F9: 'Raw データは唯一の真実源',
  // G: 機械的防御
  G1: 'ルールはテストに書く',
  G2: 'エラーは伝播',
  G3: 'コンパイラ警告を黙らせない',
  G4: 'テスト用 export 禁止',
  G5: 'サイズ上限',
  G6: 'コンポーネントサイズ上限',
  G7: 'キャッシュは本体より複雑にしない',
} as const
