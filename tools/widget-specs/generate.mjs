#!/usr/bin/env node
/**
 * widget-specs frontmatter generator
 *
 * Phase A scope: Anchor Slice 5 件 (WID-002 / 006 / 018 / 033 / 040) の
 * `references/05-contents/widgets/WID-NNN.md` frontmatter を、対応する
 * registry source TSX から再生成する。
 *
 * 機械フィールド（上書き）:
 *   widgetDefId, contextType, registry, registrySource, registryLine,
 *   group, size, linkTo, label (label は frontmatter には書かないが照合用に抽出),
 *   consumedCtxFields, consumedReadModels, consumedQueryHandlers, children
 *
 * 手書きフィールド（保持）:
 *   id, kind, acquisitionPath, owner, reviewCadenceDays, lastReviewedAt,
 *   specVersion, lastVerifiedCommit
 *
 * CLI:
 *   node tools/widget-specs/generate.mjs              # 全 WID を再生成 (write)
 *   node tools/widget-specs/generate.mjs --check      # dry-run、drift があれば exit 1
 *   node tools/widget-specs/generate.mjs --wid WID-033  # 単一 WID
 *
 * 参照: projects/phased-content-specs-rollout/plan.md §Phase A
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const SPECS_DIR = resolve(REPO_ROOT, 'references/05-contents/widgets')

// `typescript` は app/node_modules にインストールされている。
// ESM の resolver はこの .mjs の場所から探索するため、
// createRequire(app/package.json) で明示的に解決する。
const requireFromApp = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const tsModulePath = requireFromApp.resolve('typescript')
const ts = (await import(pathToFileURL(tsModulePath).href)).default

// ---------------------------------------------------------------------------
// CLI 引数
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    check: false,
    wid: null,
    verbose: false,
    scope: null,
    injectJsdoc: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--check') args.check = true
    else if (a === '--verbose' || a === '-v') args.verbose = true
    else if (a === '--inject-jsdoc') args.injectJsdoc = true
    else if (a === '--wid') {
      args.wid = argv[++i]
    } else if (a.startsWith('--wid=')) {
      args.wid = a.slice('--wid='.length)
    } else if (a === '--scope') {
      args.scope = argv[++i]
    } else if (a.startsWith('--scope=')) {
      args.scope = a.slice('--scope='.length)
    }
  }
  return args
}

// Phase A Anchor Slice — projects/phased-content-specs-rollout/plan.md §3.3
const PHASE_A_ANCHOR_WIDS = ['WID-002', 'WID-006', 'WID-018', 'WID-033', 'WID-040']

// ---------------------------------------------------------------------------
// Frontmatter parser / serializer (widget spec 専用、最小)
// ---------------------------------------------------------------------------

/**
 * `references/05-contents/widgets/WID-NNN.md` の frontmatter を抽出。
 * 戻り値: { frontmatter: object, body: string, raw: string }
 */
function readSpec(specPath) {
  const raw = readFileSync(specPath, 'utf-8')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) throw new Error(`Invalid frontmatter: ${specPath}`)
  const frontmatter = parseFrontmatterYaml(m[1])
  return { frontmatter, body: m[2], raw }
}

/**
 * widget spec frontmatter YAML 専用パーサ。
 *
 * サポート:
 *   - `key: value` (string / number / null)
 *   - `key:` 直後に `  - item` 形式の list
 *   - `key:` 直後に `  subkey: value` 形式の object (1 階層)
 *   - 行頭 `# ...` コメント
 *
 * サポートしない:
 *   - 多重ネスト
 *   - 複数行 string (>-, |)
 *   - flow style ([1, 2, 3])
 */
function parseFrontmatterYaml(yaml) {
  const lines = yaml.split('\n')
  const out = {}
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++
      continue
    }
    // key: value or key: (block follows)
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!m) {
      i++
      continue
    }
    const key = m[1]
    const valueRaw = m[2].trim()
    if (valueRaw === '') {
      // block scalar (list or object)
      const block = []
      let j = i + 1
      while (j < lines.length) {
        const next = lines[j]
        if (next.trim() === '' || next.trim().startsWith('#')) {
          j++
          continue
        }
        if (!next.startsWith('  ')) break
        block.push(next)
        j++
      }
      // detect list vs object
      if (block.length > 0 && block.every((l) => l.trim().startsWith('- '))) {
        out[key] = block.map((l) => parseScalar(l.trim().slice(2).trim()))
      } else if (block.length > 0) {
        const obj = {}
        for (const l of block) {
          const om = l.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/)
          if (om) obj[om[1]] = parseScalar(om[2].trim())
        }
        out[key] = obj
      } else {
        out[key] = []
      }
      i = j
    } else {
      out[key] = parseScalar(valueRaw)
      i++
    }
  }
  return out
}

function parseScalar(s) {
  if (s === 'null' || s === '~' || s === '') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === '[]') return []
  if (s === '{}') return {}
  if (/^-?\d+$/.test(s)) return Number(s)
  // strip surrounding quotes
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1)
  }
  return s
}

/**
 * frontmatter object を YAML に直列化 (widget spec 専用、最小、決定論的)。
 */
function serializeFrontmatter(fm, order) {
  const lines = []
  for (const key of order) {
    if (!(key in fm)) continue
    const v = fm[key]
    if (v === null) {
      lines.push(`${key}: null`)
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${key}: []`)
      } else {
        lines.push(`${key}:`)
        for (const item of v) {
          lines.push(`  - ${formatScalar(item)}`)
        }
      }
    } else if (typeof v === 'object') {
      lines.push(`${key}:`)
      for (const [k, val] of Object.entries(v)) {
        lines.push(`  ${k}: ${formatScalar(val)}`)
      }
    } else {
      lines.push(`${key}: ${formatScalar(v)}`)
    }
  }
  return lines.join('\n')
}

function formatScalar(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return String(v)
  if (typeof v === 'number') return String(v)
  const s = String(v)
  // quote if contains special chars
  if (/^[A-Za-z0-9_\-./:]+$/.test(s)) return s
  if (/[#:'"\\]/.test(s)) {
    // single-quote escape: ' → ''
    return `'${s.replace(/'/g, "''")}'`
  }
  return s
}

// canonical frontmatter field order (output)
const FIELD_ORDER = [
  'id',
  'kind',
  'widgetDefId',
  'contextType',
  'registry',
  'registrySource',
  'registryLine',
  'group',
  'size',
  'linkTo',
  'acquisitionPath',
  'consumedCtxFields',
  'consumedReadModels',
  'consumedQueryHandlers',
  'children',
  'lastVerifiedCommit',
  'owner',
  'reviewCadenceDays',
  'lastReviewedAt',
  'specVersion',
]

// fields the generator overwrites from source
const MACHINE_FIELDS = new Set([
  'widgetDefId',
  'contextType',
  'registry',
  'registrySource',
  'registryLine',
  'group',
  'size',
  'linkTo',
  'consumedCtxFields',
  'consumedReadModels',
  'consumedQueryHandlers',
  'children',
])

// ---------------------------------------------------------------------------
// Source extractor (TS Compiler API)
// ---------------------------------------------------------------------------

/**
 * registry source ファイルを parse し、指定 widgetDefId の widget def から
 * 機械フィールドを抽出する。
 *
 * 戻り値: { found: boolean, fields?: object, diagnostics: string[] }
 */
function extractWidgetFields(sourcePath, widgetDefId) {
  const fullPath = resolve(REPO_ROOT, sourcePath)
  const src = readFileSync(fullPath, 'utf-8')
  const sf = ts.createSourceFile(sourcePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const diagnostics = []

  // collect import map for readModel / queryHandler detection
  const imports = collectImports(sf)

  // find every export const FOO = [...] and within, the widget def matching widgetDefId
  let result = null
  ts.forEachChild(sf, function visit(node) {
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (!decl.initializer) continue
        if (!ts.isArrayLiteralExpression(decl.initializer)) continue
        const registryName = decl.name.getText(sf)
        for (const element of decl.initializer.elements) {
          // element is either a plain ObjectLiteralExpression (Dashboard-local pattern)
          // or a CallExpression like insightWidget({ ... }) (Unified wrapper pattern)
          let defObject = null
          let defWrapper = null
          if (ts.isObjectLiteralExpression(element)) {
            defObject = element
          } else if (ts.isCallExpression(element) && element.arguments.length >= 1) {
            const arg = element.arguments[0]
            if (ts.isObjectLiteralExpression(arg)) {
              defObject = arg
              defWrapper = element.expression.getText(sf)
            }
          }
          if (!defObject) continue
          const idValue = readStringProp(defObject, 'id')
          if (idValue !== widgetDefId) continue
          // match
          result = extractFromDef({
            sf,
            registryName,
            defObject,
            defWrapper,
            imports,
            sourcePath,
          })
          return
        }
      }
    }
    ts.forEachChild(node, visit)
  })

  if (!result) {
    diagnostics.push(`widget def with id='${widgetDefId}' not found in ${sourcePath}`)
    return { found: false, diagnostics }
  }
  return { found: true, fields: result, diagnostics }
}

function collectImports(sf) {
  const imports = []
  ts.forEachChild(sf, (node) => {
    if (!ts.isImportDeclaration(node)) return
    const moduleSpec = node.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpec)) return
    const from = moduleSpec.text
    const named = []
    if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const el of node.importClause.namedBindings.elements) {
        named.push(el.name.text)
      }
    }
    imports.push({ from, named })
  })
  return imports
}

function readStringProp(objExpr, propName) {
  for (const p of objExpr.properties) {
    if (!ts.isPropertyAssignment(p)) continue
    const name = p.name.getText()
    if (name !== propName) continue
    if (ts.isStringLiteral(p.initializer)) return p.initializer.text
    if (
      ts.isNoSubstitutionTemplateLiteral(p.initializer) ||
      ts.isTemplateExpression(p.initializer)
    ) {
      return p.initializer.getText().slice(1, -1)
    }
  }
  return null
}

function extractFromDef({ sf, registryName, defObject, defWrapper, imports, sourcePath }) {
  const widgetDefId = readStringProp(defObject, 'id')
  const label = readStringProp(defObject, 'label')
  const group = readStringProp(defObject, 'group')
  const size = readStringProp(defObject, 'size')

  // linkTo: object expression like { view: 'daily', tab: 'x' } or absent
  let linkTo = null
  for (const p of defObject.properties) {
    if (!ts.isPropertyAssignment(p)) continue
    if (p.name.getText() !== 'linkTo') continue
    if (ts.isObjectLiteralExpression(p.initializer)) {
      const obj = {}
      for (const sp of p.initializer.properties) {
        if (!ts.isPropertyAssignment(sp)) continue
        const k = sp.name.getText()
        if (ts.isStringLiteral(sp.initializer)) obj[k] = sp.initializer.text
      }
      linkTo = obj
    }
  }

  // registryLine: line of the `id:` literal (1-indexed)
  let registryLine = null
  for (const p of defObject.properties) {
    if (!ts.isPropertyAssignment(p)) continue
    if (p.name.getText() !== 'id') continue
    const pos = p.getStart(sf)
    const { line } = sf.getLineAndCharacterOfPosition(pos)
    registryLine = line + 1
    break
  }

  // contextType: derive from registry array type annotation
  // DashboardWidgetDef → Dashboard-local, UnifiedWidgetDef → Unified
  const contextType = inferContextType(sf, registryName)

  // walk the def body to collect ctx accesses and JSX child tags
  const ctxFields = new Set()
  const jsxChildren = new Set()
  const readModelImports = new Set()
  const queryHandlerImports = new Set()

  function walk(node) {
    // ctx.X.Y access — match PropertyAccessExpression rooted at identifier 'ctx'.
    // 中間 path（ctx.A、ctx.A.B）は親がさらに access する場合 skip し、
    // 最も深い leaf path だけ収集する。optional chaining (ctx?.A?.B) も含める。
    if (ts.isPropertyAccessExpression(node)) {
      const parent = node.parent
      const isInnerOfDeeperAccess =
        parent &&
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node
      if (!isInnerOfDeeperAccess) {
        const path = readPropertyAccessPath(node)
        if (path && path[0] === 'ctx' && path.length >= 2) {
          ctxFields.add(path.slice(1).join('.'))
        }
      }
    }
    // body-level destructuring: `const { foo, bar } = ctx` — collect foo / bar as ctx fields
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer) &&
      node.initializer.text === 'ctx'
    ) {
      for (const el of node.name.elements) {
        const propName = el.propertyName?.getText() ?? el.name.getText()
        if (propName && /^[A-Za-z_]/.test(propName)) ctxFields.add(propName)
      }
    }
    // JSX child tag (PascalCase opening element / self-closing)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText()
      if (/^[A-Z]/.test(tag)) jsxChildren.add(tag)
    }
    // CallExpression — detect calls into readModel selectors / queryHandler entrypoints
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const fnName = node.expression.text
      const imp = imports.find((i) => i.named.includes(fnName))
      if (imp) {
        if (/^@\/application\/readModels\//.test(imp.from)) {
          // module path like '@/application/readModels/customerFact/selectors'
          const m = imp.from.match(/^@\/application\/readModels\/([^/]+)/)
          if (m) readModelImports.add(m[1])
        }
        if (/^@\/application\/queries\//.test(imp.from)) {
          const m = imp.from.match(/^@\/application\/queries\/([^/]+)/)
          if (m) queryHandlerImports.add(m[1])
        }
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(defObject)

  // Also: ctx fields touched by the def's own destructuring in render / isVisible
  // e.g. `render: ({ result, daysInMonth }) => ...`
  for (const p of defObject.properties) {
    if (!ts.isPropertyAssignment(p)) continue
    const propName = p.name.getText()
    if (propName !== 'render' && propName !== 'isVisible') continue
    if (
      ts.isArrowFunction(p.initializer) ||
      ts.isFunctionExpression(p.initializer)
    ) {
      const fn = p.initializer
      const param = fn.parameters[0]
      if (param && ts.isObjectBindingPattern(param.name)) {
        for (const el of param.name.elements) {
          // const { result, year } = ctx → each element is a BindingElement
          const propName0 = el.propertyName?.getText() ?? el.name.getText()
          if (propName0) ctxFields.add(propName0)
        }
      }
    }
  }

  return {
    widgetDefId,
    label,
    group,
    size,
    linkTo,
    registry: registryName,
    registryLine,
    registrySource: sourcePath,
    contextType,
    defWrapper,
    consumedCtxFields: [...ctxFields].sort(),
    consumedReadModels: [...readModelImports].sort(),
    consumedQueryHandlers: [...queryHandlerImports].sort(),
    children: [...jsxChildren].sort(),
  }
}

function readPropertyAccessPath(node) {
  // returns array like ['ctx', 'result', 'daily'] or null if non-identifier root
  const parts = []
  let cur = node
  while (ts.isPropertyAccessExpression(cur)) {
    parts.unshift(cur.name.text)
    cur = cur.expression
  }
  if (ts.isIdentifier(cur)) {
    parts.unshift(cur.text)
    return parts
  }
  // strip optional chain (cur.?.foo)
  if (ts.isNonNullExpression(cur) && ts.isIdentifier(cur.expression)) {
    parts.unshift(cur.expression.text)
    return parts
  }
  return null
}

function inferContextType(sf, registryName) {
  let result = 'Unified'
  ts.forEachChild(sf, function visit(node) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name.getText(sf) === registryName && decl.type) {
          const t = decl.type.getText(sf)
          if (/DashboardWidgetDef/.test(t)) result = 'Dashboard-local'
          else if (/UnifiedWidgetDef/.test(t)) result = 'Unified'
        }
      }
    }
    ts.forEachChild(node, visit)
  })
  return result
}

// ---------------------------------------------------------------------------
// Spec discovery + processing
// ---------------------------------------------------------------------------

function listSpecs(filterWid, scope) {
  const files = readdirSync(SPECS_DIR)
    .filter((f) => /^WID-\d{3}\.md$/.test(f))
    .sort()
  if (filterWid) {
    return files.filter((f) => f === `${filterWid}.md`)
  }
  if (scope === 'anchor') {
    const anchorFiles = new Set(PHASE_A_ANCHOR_WIDS.map((w) => `${w}.md`))
    return files.filter((f) => anchorFiles.has(f))
  }
  return files
}

/**
 * 1 つの WID-NNN.md について sync 処理。
 * 戻り値: { changed: boolean, drifted: string[], errors: string[] }
 */
function processSpec(specFile, opts) {
  const specPath = resolve(SPECS_DIR, specFile)
  const wid = specFile.replace(/\.md$/, '')
  const { frontmatter, body, raw } = readSpec(specPath)
  const errors = []
  const drifted = []

  if (frontmatter.id !== wid) {
    errors.push(`${wid}: frontmatter id "${frontmatter.id}" mismatches filename`)
  }
  const widgetDefId = frontmatter.widgetDefId
  const sourcePath = frontmatter.registrySource
  if (!widgetDefId || !sourcePath) {
    errors.push(`${wid}: missing widgetDefId or registrySource`)
    return { changed: false, drifted, errors }
  }
  if (!existsSync(resolve(REPO_ROOT, sourcePath))) {
    errors.push(`${wid}: registrySource not found: ${sourcePath}`)
    return { changed: false, drifted, errors }
  }

  const ext = extractWidgetFields(sourcePath, widgetDefId)
  if (!ext.found) {
    errors.push(`${wid}: ${ext.diagnostics.join('; ')}`)
    return { changed: false, drifted, errors }
  }
  const ext0 = ext.fields

  // build merged frontmatter
  const merged = { ...frontmatter }
  // defaults for required machine fields
  merged.id = wid
  merged.kind = frontmatter.kind ?? 'widget'

  const machineUpdates = {
    widgetDefId: ext0.widgetDefId,
    contextType: ext0.contextType,
    registry: ext0.registry,
    registrySource: ext0.registrySource,
    registryLine: ext0.registryLine,
    group: ext0.group,
    size: ext0.size,
    linkTo: ext0.linkTo,
    consumedCtxFields: ext0.consumedCtxFields,
    consumedReadModels: ext0.consumedReadModels,
    consumedQueryHandlers: ext0.consumedQueryHandlers,
    children: ext0.children,
  }
  for (const [k, v] of Object.entries(machineUpdates)) {
    if (!fieldEqual(merged[k], v)) {
      drifted.push(`${k}: ${formatVal(merged[k])} → ${formatVal(v)}`)
      merged[k] = v
    }
  }

  // preserved manual fields default if missing
  if (merged.acquisitionPath === undefined) merged.acquisitionPath = 'ctx-direct'
  if (merged.owner === undefined) merged.owner = 'implementation'
  if (merged.reviewCadenceDays === undefined) merged.reviewCadenceDays = 90
  if (merged.specVersion === undefined) merged.specVersion = 1

  // serialize
  const serialized = serializeFrontmatter(merged, FIELD_ORDER)
  const newRaw = `---\n${serialized}\n---\n${body.startsWith('\n') ? body : '\n' + body}`
  // normalize trailing newlines on body to match input style
  const finalRaw = newRaw.replace(/\n{3,}$/g, '\n\n').replace(/\n+$/, '\n')

  const changed = finalRaw !== raw
  if (changed && !opts.check) {
    writeFileSync(specPath, finalRaw)
  }
  return { changed, drifted, errors }
}

function fieldEqual(a, b) {
  if (a === b) return true
  if (a == null && b == null) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => fieldEqual(v, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a).sort()
    const bk = Object.keys(b).sort()
    if (ak.length !== bk.length) return false
    return ak.every((k, i) => k === bk[i] && fieldEqual(a[k], b[k]))
  }
  return false
}

function formatVal(v) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return `[${v.join(', ')}]`
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// ---------------------------------------------------------------------------
// JSDoc 注入: source の `id: '<defId>'` 直前に `/** @widget-id WID-NNN */` を
// 付与する（idempotent: 既に同 WID の JSDoc があれば skip）。
// 同一 source に複数 WID がある場合は 1 ファイル 1 回読み書きで一括処理する。
// ---------------------------------------------------------------------------

function injectJsdocAll(specFiles) {
  const editsBySource = new Map()
  for (const file of specFiles) {
    const wid = file.replace(/\.md$/, '')
    const { frontmatter } = readSpec(resolve(SPECS_DIR, file))
    const widgetDefId = frontmatter.widgetDefId
    const sourcePath = frontmatter.registrySource
    if (!widgetDefId || !sourcePath) continue
    const list = editsBySource.get(sourcePath) ?? []
    list.push({ wid, widgetDefId })
    editsBySource.set(sourcePath, list)
  }

  let injected = 0
  let skipped = 0
  for (const [sourcePath, edits] of editsBySource) {
    const fullPath = resolve(REPO_ROOT, sourcePath)
    if (!existsSync(fullPath)) {
      console.error(`  ERROR source not found: ${sourcePath}`)
      continue
    }
    const original = readFileSync(fullPath, 'utf-8')
    const lines = original.split('\n')
    // collect (lineIndex, indent, wid) for each edit; reverse-order inject to keep indices stable
    const insertions = []
    for (const { wid, widgetDefId } of edits) {
      const re = new RegExp(`^(\\s*)id:\\s*['"\`]${escapeRegex(widgetDefId)}['"\`]`)
      let foundAt = -1
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(re)
        if (!m) continue
        foundAt = i
        const indent = m[1]
        const widTag = `@widget-id ${wid}`
        let alreadyHas = false
        for (let j = Math.max(0, i - 4); j < i; j++) {
          if (lines[j]?.includes(widTag)) {
            alreadyHas = true
            break
          }
        }
        if (alreadyHas) {
          skipped++
        } else {
          insertions.push({ at: i, indent, wid })
        }
        break
      }
      if (foundAt < 0) {
        console.error(`  ERROR ${wid}: id literal not found in ${sourcePath}`)
      }
    }
    if (insertions.length === 0) continue
    // reverse order so earlier insertions don't shift later indices
    insertions.sort((a, b) => b.at - a.at)
    for (const ins of insertions) {
      lines.splice(ins.at, 0, `${ins.indent}/** @widget-id ${ins.wid} */`)
      injected++
    }
    writeFileSync(fullPath, lines.join('\n'))
    console.log(
      `INJECT ${sourcePath} (+${insertions.length})`,
    )
  }
  console.log(`\n${injected} injection(s), ${skipped} already present`)
  return { injected, skipped }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv)
  const specs = listSpecs(args.wid, args.scope)
  if (specs.length === 0) {
    const where = args.wid ?? (args.scope ? `scope=${args.scope}` : 'all')
    console.error(`No spec files found (${where})`)
    process.exit(2)
  }
  if (args.injectJsdoc) {
    const r = injectJsdocAll(specs)
    process.exit(0)
  }
  let totalChanged = 0
  let totalErrors = 0
  for (const file of specs) {
    const r = processSpec(file, { check: args.check })
    if (r.errors.length > 0) {
      totalErrors += r.errors.length
      for (const e of r.errors) console.error(`  ERROR ${e}`)
      continue
    }
    if (r.changed) {
      totalChanged++
      console.log(`${args.check ? 'DRIFT' : 'WROTE'} ${file}`)
      if (args.verbose || args.check) {
        for (const d of r.drifted) console.log(`    ${d}`)
      }
    } else if (args.verbose) {
      console.log(`OK    ${file}`)
    }
  }
  if (args.check) {
    console.log(
      `\n${specs.length} spec(s) checked, ${totalChanged} drift, ${totalErrors} error`,
    )
    process.exit(totalChanged > 0 || totalErrors > 0 ? 1 : 0)
  } else {
    console.log(
      `\n${specs.length} spec(s) processed, ${totalChanged} written, ${totalErrors} error`,
    )
    process.exit(totalErrors > 0 ? 2 : 0)
  }
}

main()
