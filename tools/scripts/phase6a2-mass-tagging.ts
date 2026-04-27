/**
 * Mass Tagging Script — Phase 6a-2 (taxonomy-v2)
 *
 * 全 untagged file に `@responsibility R:unclassified` または
 * `@taxonomyKind T:unclassified` を能動付与する一回限りの migration script。
 *
 * 原則: Constitution 原則 1「未分類は能動タグ」。1750 file の "実は未分類"
 * 状態を **明示的な R:unclassified / T:unclassified 退避** に変換する。
 *
 * 使い方:
 *   cd app && npx tsx ../tools/scripts/phase6a2-mass-tagging.ts --axis responsibility --layer domain
 *   cd app && npx tsx ../tools/scripts/phase6a2-mass-tagging.ts --axis responsibility --layer application
 *   cd app && npx tsx ../tools/scripts/phase6a2-mass-tagging.ts --axis test
 *
 * 設計:
 * - file が既に @responsibility / @taxonomyKind を持っている場合は skip（idempotent）
 * - 先頭 JSDoc block (slash-star-star ... star-slash) がある場合: 末尾に `@responsibility / @taxonomyKind` 行を注入
 * - 先頭 JSDoc が無い場合: file 先頭に新 JSDoc を prepend
 * - shebang / "use client" / single-line // comment は保持
 *
 * 関連:
 * - projects/responsibility-taxonomy-v2/checklist.md Phase 6
 * - projects/test-taxonomy-v2/checklist.md Phase 6
 * - app/src/test/guards/responsibilityTagGuardV2.test.ts (V2-R-1 baseline)
 * - app/src/test/guards/testTaxonomyGuardV2.test.ts (V2-T-1 baseline)
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../..')
const APP_SRC = resolve(REPO_ROOT, 'app/src')

interface CliArgs {
  axis: 'responsibility' | 'test'
  layer: string | null
  dryRun: boolean
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { axis: 'responsibility', layer: null, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--axis' && argv[i + 1]) {
      const v = argv[i + 1]!
      if (v !== 'responsibility' && v !== 'test') {
        throw new Error(`--axis must be responsibility | test (got: ${v})`)
      }
      args.axis = v
      i++
    } else if (a === '--layer' && argv[i + 1]) {
      args.layer = argv[i + 1]!
      i++
    } else if (a === '--dry-run') {
      args.dryRun = true
    }
  }
  return args
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function* walkFiles(dir: string): Generator<string> {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const e of entries) {
    const p = join(dir, e)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) yield* walkFiles(p)
    else yield p
  }
}

// R 軸: production file (.ts/.tsx, exclude .test/.stories/.styles/__tests__/.d.ts)
function isResponsibilityProductionFile(file: string): boolean {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false
  if (file.includes('.test.')) return false
  if (file.includes('.stories.')) return false
  if (file.includes('.styles.')) return false
  if (file.includes('__tests__')) return false
  if (file.includes('.d.ts')) return false
  return true
}

// R 軸 test scope: test/guards/*.test.ts
function isResponsibilityGuardFile(file: string): boolean {
  return file.includes('/test/guards/') && file.endsWith('.test.ts')
}

// T 軸 scope: 全 .test.ts / .test.tsx
function isTestFile(file: string): boolean {
  return file.endsWith('.test.ts') || file.endsWith('.test.tsx')
}

// ---------------------------------------------------------------------------
// Tag injection
// ---------------------------------------------------------------------------

const RESPONSIBILITY_REGEX = /@responsibility\s+/
const TAXONOMY_KIND_REGEX = /@taxonomyKind\s+/

interface InjectionResult {
  readonly modified: string
  readonly action: 'inject' | 'prepend' | 'skip'
}

/**
 * file 内容の先頭付近に @<tag-key> <tag-value> を注入する。
 *
 * - 既に対象 annotation がある場合 → skip
 * - 先頭 JSDoc block がある場合 → block 末尾の (star-slash) 直前に空行 + @annotation 行を挿入
 * - JSDoc block が無い場合 → 先頭に新 JSDoc を prepend
 */
function injectTag(content: string, tagKey: string, tagValue: string): InjectionResult {
  const annotationRegex = tagKey === 'responsibility' ? RESPONSIBILITY_REGEX : TAXONOMY_KIND_REGEX
  if (annotationRegex.test(content)) {
    return { modified: content, action: 'skip' }
  }

  // 先頭の JSDoc block を検出
  // shebang や 'use client' を許容するため、先頭 1-2 行のスキップを許す
  const lines = content.split('\n')

  // JSDoc block の開始位置（/** で始まる行）を検索
  let jsdocStart = -1
  let jsdocEnd = -1
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i]!.trim()
    if (line.startsWith('/**')) {
      jsdocStart = i
      // 同行に */ があるか
      if (line.includes('*/') && line.length > 4) {
        jsdocEnd = i
      }
      break
    }
    // skip empty / shebang / use directives only
    if (line === '' || line.startsWith('#!') || line.startsWith("'use ") || line.startsWith('"use ')) continue
    // 通常コードに到達 → JSDoc 無し
    break
  }

  if (jsdocStart >= 0 && jsdocEnd === -1) {
    // 複数行 JSDoc を探索
    for (let i = jsdocStart + 1; i < lines.length; i++) {
      if (lines[i]!.includes('*/')) {
        jsdocEnd = i
        break
      }
    }
  }

  if (jsdocStart >= 0 && jsdocEnd >= 0) {
    if (jsdocStart === jsdocEnd) {
      // single-line JSDoc: /** description */
      // → 複数行に展開して @annotation 注入
      const lineText = lines[jsdocStart]!
      const m = lineText.match(/^(\s*)\/\*\*\s*(.*?)\s*\*\/\s*$/)
      if (m) {
        const indent = m[1] ?? ''
        const desc = m[2] ?? ''
        const newBlock = [
          `${indent}/**`,
          ...(desc ? [`${indent} * ${desc}`, `${indent} *`] : []),
          `${indent} * @${tagKey} ${tagValue}`,
          `${indent} */`,
        ]
        const newLines = [...lines.slice(0, jsdocStart), ...newBlock, ...lines.slice(jsdocStart + 1)]
        return { modified: newLines.join('\n'), action: 'inject' }
      }
    } else {
      // 複数行 JSDoc: */行の直前に注入
      // 既存 inner line の prefix（"  * " 等）を抽出して同じ indent を使う。
      // 単純に closeLine の `\s*\*\/` から `\s*` を取ると JSDoc の `*` 列を見失う
      // ため、jsdocStart+1 〜 jsdocEnd-1 の中で ` *` 行を探し prefix を借用する。
      let innerPrefix = ' * '
      for (let i = jsdocStart + 1; i < jsdocEnd; i++) {
        const m = lines[i]!.match(/^(\s*\*)\s*/)
        if (m) {
          innerPrefix = m[1]! + ' '
          break
        }
      }
      const innerEmpty = innerPrefix.replace(/\s+$/, '') // 空行用 ` *`
      const prevLine = lines[jsdocEnd - 1] ?? ''
      const prevTrim = prevLine.trim()
      const needsSeparator = prevTrim !== '*' && prevTrim !== ''
      const insertions = [
        ...(needsSeparator ? [innerEmpty] : []),
        `${innerPrefix}@${tagKey} ${tagValue}`,
      ]
      const newLines = [...lines.slice(0, jsdocEnd), ...insertions, ...lines.slice(jsdocEnd)]
      return { modified: newLines.join('\n'), action: 'inject' }
    }
  }

  // JSDoc 無し → 先頭に prepend（shebang や use directive は保持）
  let prependIdx = 0
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const line = lines[i]!.trim()
    if (line.startsWith('#!') || line.startsWith("'use ") || line.startsWith('"use ')) {
      prependIdx = i + 1
      continue
    }
    if (line === '') {
      prependIdx = i + 1
      continue
    }
    break
  }
  const newBlock = [`/**`, ` * @${tagKey} ${tagValue}`, ` */`]
  // 既存 line と境界に空行を入れる
  const after = lines.slice(prependIdx)
  const needsBlank = after.length > 0 && after[0]!.trim() !== ''
  const newLines = [
    ...lines.slice(0, prependIdx),
    ...newBlock,
    ...(needsBlank ? [''] : []),
    ...after,
  ]
  return { modified: newLines.join('\n'), action: 'prepend' }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv.slice(2))

  let scopeDirs: string[]
  let predicate: (f: string) => boolean
  let tagKey: string
  let tagValue: string

  if (args.axis === 'responsibility') {
    if (args.layer === 'test/guards') {
      scopeDirs = [resolve(APP_SRC, 'test/guards')]
      predicate = isResponsibilityGuardFile
    } else if (args.layer) {
      scopeDirs = [resolve(APP_SRC, args.layer)]
      predicate = isResponsibilityProductionFile
    } else {
      throw new Error('--layer required for --axis responsibility')
    }
    tagKey = 'responsibility'
    tagValue = 'R:unclassified'
  } else {
    // T 軸: 全 src 配下の .test.ts/.test.tsx
    scopeDirs = [APP_SRC]
    predicate = isTestFile
    tagKey = 'taxonomyKind'
    tagValue = 'T:unclassified'
  }

  let total = 0
  let injected = 0
  let prepended = 0
  let skipped = 0
  const modifiedPaths: string[] = []

  for (const dir of scopeDirs) {
    for (const f of walkFiles(dir)) {
      if (!predicate(f)) continue
      total++
      const content = readFileSync(f, 'utf-8')
      const result = injectTag(content, tagKey, tagValue)
      if (result.action === 'skip') {
        skipped++
        continue
      }
      if (result.action === 'inject') injected++
      if (result.action === 'prepend') prepended++
      modifiedPaths.push(f)
      if (!args.dryRun) {
        writeFileSync(f, result.modified, 'utf-8')
      }
    }
  }

  process.stdout.write(
    [
      `[mass-tagging] axis=${args.axis} layer=${args.layer ?? '(all-tests)'} dryRun=${args.dryRun}`,
      `  total=${total}`,
      `  injected (existing JSDoc)=${injected}`,
      `  prepended (new JSDoc)=${prepended}`,
      `  skipped (already tagged)=${skipped}`,
      ``,
    ].join('\n'),
  )
}

main()
