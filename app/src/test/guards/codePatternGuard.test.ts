/**
 * コードパターンガードテスト — 禁止パターンの機械的検出
 *
 * @guard G4 テスト用 export 禁止
 * @guard C3 store は state 反映のみ
 * @guard C2 pure function は1仕様軸に閉じる
 * @guard A6 load 処理は3段階分離
 * @guard E4 欠損判定は `== null`
 * @guard E2 依存配列は省略しない（ESLint exhaustive-deps: error で強制）
 * @guard G3 コンパイラ警告を黙らせない（noUnusedLocals + eslint-disable 検出）
 * @guard B2 VIEW の LEFT JOIN は集約サブクエリ経由（行倍増防止）
 * @guard E1 境界で検証 — クエリの日付パラメータは validateDateKey 経由
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, collectTestFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  vmReactImport,
  reactImportExcludeDirs,
  sideEffectChain,
  buildAllowlistSet,
} from '../allowlists'

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

    expect(violations, formatViolationMessage(getRuleById('AR-G4-INTERNAL')!, violations)).toEqual(
      [],
    )
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

    expect(violations, formatViolationMessage(getRuleById('AR-C3-STORE')!, violations)).toEqual([])
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
    const PURE_PATTERNS = [/[Ll]ogic\.ts$/, /\.vm\.ts$/, /[Rr]educer\.ts$/, /[Bb]uilders\.ts$/]

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
          (/[Ll]ogic\.ts$/.test(s) || /[Bb]uilders\.ts$/.test(s)),
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

// ─── E4: 数値フィールドの truthiness チェック禁止 ───────

describe('E4: domain/calculations/ で数値の truthiness チェックがない', () => {
  const calcDir = path.join(SRC_DIR, 'domain/calculations')

  it('!result.numericField パターンがない（number 型に !value は E4 違反）', () => {
    const files = collectTsFiles(calcDir)
    const violations: string[] = []

    // result/entry/data/item のプロパティに対する truthiness チェックを検出
    // !obj.prop (where prop is likely numeric: rate, amount, sales, etc.)
    const NUMERIC_PROP_PATTERN =
      /if\s*\(\s*!(?:result|entry|data|item|row|record|d)\.\w*(?:rate|amount|sales|cost|price|budget|qty|count|total|profit|discount|revenue|customers|value)\b/i

    for (const file of files) {
      // テストファイルは除外
      if (file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (NUMERIC_PROP_PATTERN.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      formatViolationMessage(getRuleById('AR-E4-TRUTHINESS')!, violations),
    ).toEqual([])
  })
})

// ─── G3: eslint-disable / @ts-ignore 禁止 ──────────────

describe('G3: ソースコードに eslint-disable / @ts-ignore がない', () => {
  // 正当な例外（ライブラリ制約・非標準 API 対応）
  const G3_ALLOWLIST = new Set([
    'presentation/components/charts/EChart.tsx', // ECharts ライブラリの制約で exhaustive-deps を意図的に抑制
    'presentation/components/common/FileDropZone.tsx', // webkitdirectory は非標準 HTML 属性
  ])

  it('eslint-disable コメントが存在しない（許可リスト除く）', () => {
    const dirs = [
      path.join(SRC_DIR, 'domain'),
      path.join(SRC_DIR, 'application'),
      path.join(SRC_DIR, 'infrastructure'),
      path.join(SRC_DIR, 'presentation'),
    ]
    const violations: string[] = []
    const SUPPRESS_PATTERNS = [/eslint-disable/, /@ts-ignore/, /@ts-expect-error/]

    for (const dir of dirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        if (file.includes('.test.')) continue
        const relPath = rel(file)
        if (G3_ALLOWLIST.has(relPath)) continue

        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          for (const pattern of SUPPRESS_PATTERNS) {
            if (pattern.test(lines[i])) {
              violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
            }
          }
        }
      }
    }

    expect(violations, formatViolationMessage(getRuleById('AR-G3-SUPPRESS')!, violations)).toEqual(
      [],
    )
  })

  it('G3 許可リストは 2 件以下', () => {
    expect(G3_ALLOWLIST.size).toBeLessThanOrEqual(2)
  })
})

// ─── B2: VIEW DDL の LEFT JOIN は集約サブクエリ経由 ─────

describe('B2: store_day_summary VIEW の LEFT JOIN は全て集約サブクエリ', () => {
  it('非集約テーブルへの直接 LEFT JOIN がない', () => {
    // VIEW DDL を取得（ビルド時の実際の DDL 文字列を検証）
    // eslint-disable は不要: schemas.ts は通常の export
    const schemasPath = path.join(SRC_DIR, 'infrastructure/duckdb/schemas.ts')
    const content = fs.readFileSync(schemasPath, 'utf-8')

    // STORE_DAY_SUMMARY_VIEW_DDL のテンプレートリテラルを抽出
    const viewMatch = content.match(/STORE_DAY_SUMMARY_VIEW_DDL\s*=\s*`([\s\S]*?)`/)
    expect(viewMatch, 'STORE_DAY_SUMMARY_VIEW_DDL が見つからない').toBeTruthy()
    const viewDdl = viewMatch![1]

    // LEFT JOIN の直後がサブクエリ "(" か確認
    // 安全パターン: LEFT JOIN (\n  SELECT ... GROUP BY ...)\n  alias
    // 危険パターン: LEFT JOIN table_name alias
    const leftJoinPattern = /LEFT\s+JOIN\s+(?!\()/gi
    const violations: string[] = []
    let match: RegExpExecArray | null

    while ((match = leftJoinPattern.exec(viewDdl)) !== null) {
      // LEFT JOIN の直後にテーブル名が来ている = 非集約の直接JOIN
      const after = viewDdl.slice(match.index + match[0].length, match.index + match[0].length + 40)
      violations.push(`LEFT JOIN ${after.trim().split(/\s/)[0]}`)
    }

    expect(
      violations,
      `store_day_summary VIEW に非集約の直接 LEFT JOIN が検出されました。\n` +
        `LEFT JOIN は必ず GROUP BY サブクエリ経由にしてください（行倍増防止）。\n` +
        violations.join('\n'),
    ).toEqual([])
  })
})

// ─── E1: クエリファイルの日付パラメータ検証 ──────────────

describe('E1: infrastructure/duckdb/queries/ の日付文字列は validateDateKey 経由', () => {
  const queriesDir = path.join(SRC_DIR, 'infrastructure/duckdb/queries')

  it('date_key を文字列補間するファイルは queryParams から validate をインポートする', () => {
    const files = collectTsFiles(queriesDir)
    const violations: string[] = []

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      // date_key を文字列補間でSQLに埋め込んでいるか
      const hasDynamicDateKey =
        /date_key\s*(BETWEEN|>=|<=|=|>|<)\s*'\$\{/.test(content) || /'\$\{[^}]*Key\}'/.test(content)

      if (!hasDynamicDateKey) continue

      // queryParams からの import がなければ違反
      const hasValidateImport = /import\s.*from\s+['"]\.\.\/.*queryParams['"]/.test(content)
      if (!hasValidateImport) {
        violations.push(rel(filePath))
      }
    }

    expect(
      violations,
      `date_key を動的に埋め込むクエリファイルで queryParams の validate が未使用:\n` +
        `${violations.join('\n')}\n` +
        `→ validateDateKey() でバリデーションしてください`,
    ).toEqual([])
  })
})

// ─── クエリ複雑度バジェット ──────────────────────────────

describe('クエリ複雑度バジェット: infrastructure/duckdb/queries/', () => {
  const queriesDir = path.join(SRC_DIR, 'infrastructure/duckdb/queries')

  /** 単一クエリ文字列の JOIN 数を数える */
  function countJoins(sql: string): number {
    const matches = sql.match(/\b(LEFT\s+)?JOIN\b/gi)
    return matches ? matches.length : 0
  }

  it('個別の SQL テンプレートリテラルの JOIN 数が上限を超えない', () => {
    const MAX_JOINS_PER_QUERY = 10
    const files = collectTsFiles(queriesDir)
    const violations: string[] = []

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      // テンプレートリテラル内の SQL を抽出
      const sqlBlocks = content.match(/`[^`]*SELECT[^`]*`/gs) ?? []
      for (const block of sqlBlocks) {
        const joins = countJoins(block)
        if (joins > MAX_JOINS_PER_QUERY) {
          violations.push(`${rel(filePath)}: JOIN ${joins}回（上限: ${MAX_JOINS_PER_QUERY}）`)
        }
      }
    }

    expect(
      violations,
      `JOIN 数が上限を超えるクエリが検出されました:\n${violations.join('\n')}\n` +
        'クエリを分割するか、サブクエリ/CTE に変換してください。',
    ).toEqual([])
  })

  it('クエリファイルの行数が上限を超えない（許可リスト除く）', () => {
    const MAX_QUERY_FILE_LINES = 450
    const files = collectTsFiles(queriesDir)
    const violations: string[] = []
    // 許可リスト（size.ts の infraLargeFiles から）
    const allowlist = new Set(['infrastructure/duckdb/queries/purchaseComparison.ts'])

    for (const filePath of files) {
      const relPath = rel(filePath)
      if (allowlist.has(relPath)) continue
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').length
      if (lines > MAX_QUERY_FILE_LINES) {
        violations.push(`${relPath}: ${lines}行（上限: ${MAX_QUERY_FILE_LINES}）`)
      }
    }

    expect(
      violations,
      `行数が上限を超えるクエリファイルが検出されました:\n${violations.join('\n')}\n` +
        'クエリを分割してください。',
    ).toEqual([])
  })
})

// ─── C5: 最小セレクタ — store 全体購読の防止 ─────────────
// @guard C5 最小セレクタ

describe('C5: Zustand store はセレクタ付きで呼ぶ', () => {
  // store.getState() は store 外からの非リアクティブアクセスなので許可
  const BARE_CALL_PATTERN = /\b(useDataStore|useSettingsStore|useUiStore)\(\s*\)/g

  it('セレクタなしの store 呼び出しが存在しない', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = [...collectTsFiles(appDir), ...collectTsFiles(presDir)]
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const matches = content.match(BARE_CALL_PATTERN)
      if (matches) {
        for (const m of matches) {
          violations.push(`${rel(file)}: ${m}`)
        }
      }
    }

    expect(violations, formatViolationMessage(getRuleById('AR-C5-SELECTOR')!, violations)).toEqual(
      [],
    )
  })
})

// ─── G2: エラーは伝播 — 空 catch の防止 ──────────────────
// @guard G2 エラーは伝播

describe('G2: 空の catch ブロックが存在しない', () => {
  // catch { } or .catch(() => {}) with truly empty body (no statements, only whitespace/comments)
  const EMPTY_CATCH_PATTERNS = [
    /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g, // .catch(() => {})
    /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\/\/[^\n]*\n\s*\}\s*\)/g, // .catch(() => { // comment })
  ]

  it('空の catch ハンドラが存在しない（コメントのみも禁止）', () => {
    const dirs = [
      path.join(SRC_DIR, 'application'),
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'infrastructure'),
    ]
    const files = dirs.flatMap((d) => collectTsFiles(d))
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of EMPTY_CATCH_PATTERNS) {
        const matches = [...content.matchAll(pattern)]
        for (const m of matches) {
          const line = content.slice(0, m.index).split('\n').length
          violations.push(`${rel(file)}:${line}: ${m[0].trim().slice(0, 40)}`)
        }
      }
    }

    expect(
      violations,
      formatViolationMessage(getRuleById('AR-G2-EMPTY-CATCH')!, violations),
    ).toEqual([])
  })
})
