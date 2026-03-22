/**
 * フック複雑度ガードテスト
 *
 * 過剰複雑性ルールを機械的に検証する。
 * ソースコードの静的解析でパターン違反・サイズ超過を検出する。
 *
 * @guard C2 pure function は1仕様軸に閉じる
 * @guard C3 store は state 反映のみ
 * @guard C6 facade は orchestration のみ
 * @guard C7 同義 API/action の併存禁止
 * @guard G4 テスト用 export 禁止
 * @guard G5 サイズ上限（hook ≤300行、useMemo ≤7、useState ≤6）
 * @guard G6 コンポーネントサイズ上限（.tsx ≤600行）
 * @guard G7 キャッシュは本体より複雑にしない
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, collectTestFiles, rel } from './guardTestHelpers'
import {
  vmReactImport,
  reactImportExcludeDirs,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  largeComponentTier2,
  infraLargeFiles,
  domainLargeFiles,
  usecasesLargeFiles,
  sideEffectChain,
  buildAllowlistSet,
  buildQuantitativeAllowlist,
} from './allowlists'

// ─── R3: @internal export 禁止 ──────────────────────────

describe('R3: hooks/ に @internal export がない', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  it('@internal コメント付き export が存在しない', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('@internal')) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(violations, `@internal export が検出されました:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── R3 補完: typeof テスト禁止 ─────────────────────────

describe('R3: テストに typeof === "function" アサーションがない', () => {
  const hooksTestDir = path.join(SRC_DIR, 'application/hooks')

  it('typeof === "function" パターンのアサーションが存在しない', () => {
    const testFiles = collectTestFiles(hooksTestDir)
    const violations: string[] = []

    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (/typeof\s+\w+.*===?\s*['"]function['"]/.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `typeof === 'function' テストが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R7: store action に業務ロジック（算術式）を埋め込まない ──

describe('R7: stores/ の set() コールバック内に算術式がない', () => {
  const storesDir = path.join(SRC_DIR, 'application/stores')

  it('set() コールバック内の算術代入が存在しない', () => {
    const files = collectTsFiles(storesDir)
    const violations: string[] = []

    // 算術代入パターン: something = expr + expr, expr - expr, expr * expr
    // ただし ?? 0, || 0, += のみの累積、Map/Set 操作は許可
    const arithmeticAssignPattern = /\w+\s*=\s*\([^)]*\)\s*[+\-*/]\s*\([^)]*\)/

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')

      // set() コールバック内のコードを検出
      // 簡易的: set( の後の (state) => { ... } ブロック内を検査
      const lines = content.split('\n')
      let inSetCallback = false
      let braceDepth = 0

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (/\bset\s*\(\s*$/.test(line) || /\bset\s*\(\s*\(state\)/.test(line)) {
          inSetCallback = true
          braceDepth = 0
        }

        if (inSetCallback) {
          braceDepth += (line.match(/{/g) || []).length
          braceDepth -= (line.match(/}/g) || []).length

          // 算術代入を検出（??0, ||0 は除外）
          if (arithmeticAssignPattern.test(line) && !line.includes('??') && !line.includes('||')) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
          }

          if (braceDepth <= 0 && line.includes(')')) {
            inSetCallback = false
          }
        }
      }
    }

    expect(
      violations,
      `store action 内の算術式が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R10: カバレッジ目的の export 禁止 ──────────────────

describe('R10: hooks/ の export にカバレッジ目的のコメントがない', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  it('カバレッジ・coverage を理由とする export コメントが存在しない', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase()
        if (
          (line.includes('coverage') || line.includes('カバレッジ')) &&
          (line.includes('export') || line.includes('テスト用'))
        ) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `カバレッジ目的の export が検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R1: 純粋モジュール自動検出 — React import 禁止 ─────────

describe('R1: 純粋モジュールに React import がない', () => {
  it('*Logic.ts / *.vm.ts / *Reducer.ts / *Builders.ts は React-free', () => {
    const dirs = [
      path.join(SRC_DIR, 'application'),
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'infrastructure'),
      path.join(SRC_DIR, 'domain'),
    ]
    const violations: string[] = []

    // ファイル名パターンで純粋モジュールを自動検出
    const PURE_PATTERNS = [/Logic\.ts$/, /\.vm\.ts$/, /Reducer\.ts$/, /Builders\.ts$/]

    // React を使う VM ファイルの許容リスト（Recharts の ResponsiveContainer 等が必要）
    const vmAllowlist = buildAllowlistSet(vmReactImport)

    for (const dir of dirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const basename = path.basename(file)
        if (!PURE_PATTERNS.some((p) => p.test(basename))) continue
        const relPath = rel(file)
        if (vmAllowlist.has(relPath)) continue

        const content = fs.readFileSync(file, 'utf-8')
        if (/import\s.*from\s+['"]react['"]/.test(content)) {
          violations.push(`${relPath}: React import が含まれています`)
        }
      }
    }

    expect(violations, `純粋モジュールに React import:\n${violations.join('\n')}`).toEqual([])
  })

  it('domain/ と infrastructure/ の全ファイルは React-free', () => {
    const dirs = [path.join(SRC_DIR, 'domain'), path.join(SRC_DIR, 'infrastructure')]
    const violations: string[] = []

    // i18n モジュールは React Context を使用するため除外
    const excludeDirs = buildAllowlistSet(reactImportExcludeDirs)

    for (const dir of dirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const relPath = rel(file)
        if ([...excludeDirs].some((d) => relPath.startsWith(d))) continue

        const content = fs.readFileSync(file, 'utf-8')
        if (/import\s.*from\s+['"]react['"]/.test(content)) {
          violations.push(`${relPath}: React import が含まれています`)
        }
      }
    }

    expect(violations, `React import が検出されました:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── R1: hook ファイルに build*/compute* 関数定義が残っていない ────

describe('R1: hook ファイルに抽出済み build* 関数が残っていない', () => {
  // hook ファイル（use*.ts）のうち、同ディレクトリに対応する *Builders.ts / *Logic.ts が
  // ある場合、元の hook に build*/compute* 関数が残っていたら violation
  it('分離先がある hook ファイルに build*/compute* 関数定義がない', () => {
    const hooksDir = path.join(SRC_DIR, 'application/hooks')
    const allFiles = collectTsFiles(hooksDir)
    const violations: string[] = []

    // hook ファイルのうち、名前ベースで対応する分離先ファイルが存在するものを検査
    const hookFiles = allFiles.filter((f) => {
      const basename = path.basename(f)
      if (!basename.startsWith('use') || !basename.endsWith('.ts')) return false
      const dir = path.dirname(f)
      // useXxxQuery.ts → xxxBuilders.ts / xxxLogic.ts を探す
      const stem = basename
        .replace(/^use/, '')
        .replace(/\.ts$/, '')
        .replace(/Query$/, '')
      const siblings = fs.readdirSync(dir)
      return siblings.some(
        (s) =>
          s.toLowerCase().includes(stem.toLowerCase()) &&
          (/Logic\.ts$/.test(s) || /Builders\.ts$/.test(s)),
      )
    })

    for (const file of hookFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (
          /^(export\s+)?function\s+(build|compute)\w+/.test(line.trim()) &&
          !line.includes('re-export')
        ) {
          violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(violations, `抽出済み関数が残っています:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── R11: hook ファイルの useMemo カウント上限 ──────────────

describe('R11: hooks/ の useMemo 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(useMemoLimits)

  it('useMemo 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? 7

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, `useMemo 過多のファイルが検出されました:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })
})

// ─── R11: hook ファイルの useState カウント上限 ──────────────

describe('R11: hooks/ の useState 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(useStateLimits)

  it('useState 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\buseState\b/g) || []).length
      const limit = allowlist[relPath] ?? 6

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `useState 過多のファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R11: hook ファイルの汎用行数上限（300行） ──────────────

describe('R11: hooks/ の .ts ファイルが行数上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(hookLineLimits)

  it('hook ファイルが行数上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const lineCount = content.split('\n').length
      const limit = allowlist[relPath] ?? 300

      if (lineCount > limit) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `行数超過の hook ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R12: Presentation コンポーネントの行数制限（汎用600行上限）─

describe('R12: Presentation コンポーネントの行数制限', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')

  // Tier 2: 600行超の大型コンポーネント — 次回改修時に分割義務
  const largeComponentExclusions = buildAllowlistSet(largeComponentTier2)

  it('Presentation .tsx は 600 行以下', () => {
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue
      // styles, stories ファイルは除外
      if (file.includes('.styles.') || file.includes('.stories.')) continue
      const relPath = rel(file)
      if (largeComponentExclusions.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 600) {
        violations.push(`${relPath}: ${lineCount}行 (上限: 600)`)
      }
    }

    expect(
      violations,
      `600行超のコンポーネントが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('大型コンポーネント（Tier 2）は個別上限以下', () => {
    const limits: [string, number][] = [['presentation/components/charts/TimeSlotChart.tsx', 660]]
    for (const [relPath, maxLines] of limits) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      const lineCount = content.split('\n').length
      expect(
        lineCount,
        `${relPath} は ${lineCount} 行 (上限: ${maxLines})。分割してから機能追加すること`,
      ).toBeLessThanOrEqual(maxLines)
    }
  })
})

// ─── 層別汎用行数制限 ──────────────────────────────────

describe('Infrastructure 層の行数制限', () => {
  it('infrastructure .ts ファイルが 400 行以下', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    const excludeFiles = buildAllowlistSet(infraLargeFiles)

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 400)`)
      }
    }

    expect(
      violations,
      `400行超の infrastructure ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

describe('Domain 層の行数制限', () => {
  it('domain .ts ファイルが 300 行以下', () => {
    const domainDir = path.join(SRC_DIR, 'domain')
    const files = collectTsFiles(domainDir)
    const violations: string[] = []

    const excludeFiles = buildAllowlistSet(domainLargeFiles)

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 300) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 300)`)
      }
    }

    expect(
      violations,
      `300行超の domain ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

describe('Application usecases 層の行数制限', () => {
  it('application/usecases .ts ファイルが 400 行以下', () => {
    const usecasesDir = path.join(SRC_DIR, 'application/usecases')
    if (!fs.existsSync(usecasesDir)) return
    const files = collectTsFiles(usecasesDir)
    const violations: string[] = []

    const excludeFiles = buildAllowlistSet(usecasesLargeFiles)

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 400)`)
      }
    }

    expect(
      violations,
      `400行超の usecases ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R5: facade ファイルの分岐数制限 ─────────────────────

describe('R5: facade ファイルの分岐が 5 以下', () => {
  it('facade/ファサード コメント付きファイルの if/switch が 5 以下', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // facade / ファサード をコメントで宣言しているファイルのみ対象
      if (!content.includes('facade') && !content.includes('ファサード')) continue

      const lines = content.split('\n')
      let branchCount = 0
      for (const line of lines) {
        // コメント行は除外
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue
        // if / switch をカウント
        if (/\bif\s*\(/.test(trimmed)) branchCount++
        if (/\bswitch\s*\(/.test(trimmed)) branchCount++
      }

      if (branchCount > 5) {
        violations.push(`${rel(file)}: 分岐 ${branchCount}回 (上限: 5)`)
      }
    }

    expect(violations, `facade に分岐ロジックが混入しています:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })
})

// ─── R2: useEffect 内の副作用チェーン検出 ────────────────

describe('R2: useEffect 内に fetch→store→cache の密結合がない', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  // 既存で許容するファイル（凍結。次回改修時に分離義務）
  const allowlist = buildAllowlistSet(sideEffectChain)

  it('useEffect 内に非同期+store更新+キャッシュ操作の3点セットがない', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      if (allowlist.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      let inEffect = false
      let braceDepth = 0
      let effectStart = 0
      let hasAsync = false
      let hasStoreUpdate = false
      let hasCacheOp = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // useEffect の開始を検出
        if (/\buseEffect\s*\(/.test(line)) {
          inEffect = true
          braceDepth = 0
          effectStart = i + 1
          hasAsync = false
          hasStoreUpdate = false
          hasCacheOp = false
        }

        if (inEffect) {
          braceDepth += (line.match(/{/g) || []).length
          braceDepth -= (line.match(/}/g) || []).length

          // 非同期処理
          if (/\bawait\b/.test(line) || /\.then\s*\(/.test(line)) hasAsync = true
          // store 更新
          if (/\bsetState\b/.test(line) || /\bset\s*\(/.test(line) || /\bgetState\s*\(/.test(line))
            hasStoreUpdate = true
          // キャッシュ操作
          if (/\bcache\b/i.test(line) || /\binvalidate\b/i.test(line)) hasCacheOp = true

          // useEffect の終了を検出
          if (braceDepth <= 0 && i > effectStart) {
            if (hasAsync && hasStoreUpdate && hasCacheOp) {
              violations.push(
                `${relPath}:${effectStart}: useEffect 内に非同期+store更新+キャッシュ操作が密結合`,
              )
            }
            inEffect = false
          }
        }
      }
    }

    expect(violations, `副作用チェーンが検出されました:\n${violations.join('\n')}`).toEqual([])
  })
})
