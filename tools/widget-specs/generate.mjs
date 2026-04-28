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
const SPECS_BASE = resolve(REPO_ROOT, 'references/05-contents')
const SPECS_DIR = resolve(SPECS_BASE, 'widgets') // widget スペックの正本ディレクトリ（後方互換）

// kind → サブディレクトリ
const KIND_DIRS = {
  widget: 'widgets',
  'read-model': 'read-models',
  calculation: 'calculations',
  chart: 'charts',
  'ui-component': 'ui-components',
}

// id prefix → kind 推定
function inferKindFromId(id) {
  if (/^WID-\d{3}$/.test(id)) return 'widget'
  if (/^RM-\d{3}$/.test(id)) return 'read-model'
  if (/^CALC-\d{3}$/.test(id)) return 'calculation'
  if (/^CHART-\d{3}$/.test(id)) return 'chart'
  if (/^UIC-\d{3}$/.test(id)) return 'ui-component'
  return null
}

function specPathFor(id) {
  const kind = inferKindFromId(id)
  if (!kind) throw new Error(`Unknown id format: ${id}`)
  return resolve(SPECS_BASE, KIND_DIRS[kind], `${id}.md`)
}

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

// canonical frontmatter field order (output) — kind 別
const FIELD_ORDER_WIDGET = [
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

const FIELD_ORDER_READ_MODEL = [
  'id',
  'kind',
  'exportName',
  'sourceRef',
  'sourceLine',
  'definitionDoc',
  // lifecycle (optional, Phase D で active 化)
  'lifecycleStatus',
  'canonicalRegistration',
  'replacedBy',
  'supersedes',
  'sunsetCondition',
  'deadline',
  'lastVerifiedCommit',
  'owner',
  'reviewCadenceDays',
  'lastReviewedAt',
  'specVersion',
]

const FIELD_ORDER_CALCULATION = [
  'id',
  'kind',
  'exportName',
  'sourceRef',
  'sourceLine',
  'definitionDoc',
  // calculation 固有: registry との双方向同期軸
  'contractId',
  'semanticClass',
  'authorityKind',
  'methodFamily',
  'canonicalRegistration', // calculationCanonRegistry.runtimeStatus と同期 (current/candidate/non-target)
  // lifecycle
  'lifecycleStatus',
  'replacedBy',
  'supersedes',
  'sunsetCondition',
  'deadline',
  'lastVerifiedCommit',
  'owner',
  'reviewCadenceDays',
  'lastReviewedAt',
  'specVersion',
]

const FIELD_ORDER_CHART = [
  'id',
  'kind',
  'exportName',
  'sourceRef',
  'sourceLine',
  // Chart Input Builder Pattern (optional triple)
  'inputBuilder',
  'logic',
  'viewModel',
  'optionBuilder',
  'styles',
  // 状態カバレッジ (Phase G visual evidence)
  'states',
  'stories',
  'visualTests',
  // 業務意味の正本リンク
  'definitionDoc',
  // lifecycle (kind 横断、Phase D で active 化)
  'lifecycleStatus',
  'replacedBy',
  'supersedes',
  'sunsetCondition',
  'deadline',
  'lastVerifiedCommit',
  'owner',
  'reviewCadenceDays',
  'lastReviewedAt',
  'specVersion',
]

const FIELD_ORDER_UI_COMPONENT = [
  'id',
  'kind',
  'exportName',
  'sourceRef',
  'sourceLine',
  // 用途分類
  'category',
  // hooks 使用 (state ownership 透明化)
  'hooks',
  // children に渡す主な component 名
  'children',
  // side effects (DOM access / portal / global state 等)
  'sideEffects',
  // 状態カバレッジ
  'states',
  'stories',
  'visualTests',
  // lifecycle
  'lifecycleStatus',
  'replacedBy',
  'supersedes',
  'sunsetCondition',
  'deadline',
  'lastVerifiedCommit',
  'owner',
  'reviewCadenceDays',
  'lastReviewedAt',
  'specVersion',
]

function fieldOrderFor(kind) {
  if (kind === 'read-model') return FIELD_ORDER_READ_MODEL
  if (kind === 'calculation') return FIELD_ORDER_CALCULATION
  if (kind === 'chart') return FIELD_ORDER_CHART
  if (kind === 'ui-component') return FIELD_ORDER_UI_COMPONENT
  return FIELD_ORDER_WIDGET
}

// 後方互換用 (旧コードが直接参照していた場合に向けた alias)
const FIELD_ORDER = FIELD_ORDER_WIDGET

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
// Read-Model extractor (kind=read-model)
// ---------------------------------------------------------------------------

/**
 * source TS ファイルを parse し、指定 exportName の宣言開始行を抽出する。
 * 対応する宣言:
 *   - `export function <name>(...)` / `export async function <name>(...)`
 *   - `export const <name> = ...`
 *   - `export class <name> {}`
 *
 * 戻り値: { found: boolean, fields?: { exportName, sourceLine }, diagnostics }
 */
function extractReadModelFields(sourcePath, exportName) {
  const fullPath = resolve(REPO_ROOT, sourcePath)
  const src = readFileSync(fullPath, 'utf-8')
  const sf = ts.createSourceFile(sourcePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const diagnostics = []
  let sourceLine = null

  ts.forEachChild(sf, (node) => {
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return
    let matched = false
    if (ts.isFunctionDeclaration(node) && node.name?.text === exportName) {
      matched = true
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === exportName) {
          matched = true
          break
        }
      }
    } else if (ts.isClassDeclaration(node) && node.name?.text === exportName) {
      matched = true
    }
    if (matched) {
      const pos = node.getStart(sf)
      const { line } = sf.getLineAndCharacterOfPosition(pos)
      sourceLine = line + 1
    }
  })

  if (sourceLine == null) {
    diagnostics.push(`export '${exportName}' not found in ${sourcePath}`)
    return { found: false, diagnostics }
  }
  return { found: true, fields: { exportName, sourceLine }, diagnostics }
}

// ---------------------------------------------------------------------------
// Spec discovery + processing
// ---------------------------------------------------------------------------

/**
 * 全 kind の spec ファイルを列挙する。
 * 戻り値: { id, kind, dir, fileName, fullPath }[]
 */
function listSpecs(filterWid, scope) {
  const out = []
  for (const [kind, dir] of Object.entries(KIND_DIRS)) {
    const fullDir = resolve(SPECS_BASE, dir)
    if (!existsSync(fullDir)) continue
    const re =
      kind === 'widget'
        ? /^WID-\d{3}\.md$/
        : kind === 'read-model'
          ? /^RM-\d{3}\.md$/
          : kind === 'calculation'
            ? /^CALC-\d{3}\.md$/
            : kind === 'chart'
              ? /^CHART-\d{3}\.md$/
              : kind === 'ui-component'
                ? /^UIC-\d{3}\.md$/
                : null
    if (!re) continue
    const files = readdirSync(fullDir).filter((f) => re.test(f))
    for (const f of files) {
      out.push({
        id: f.replace(/\.md$/, ''),
        kind,
        dir,
        fileName: f,
        fullPath: resolve(fullDir, f),
      })
    }
  }
  out.sort((a, b) => a.id.localeCompare(b.id))
  if (filterWid) {
    return out.filter((s) => s.id === filterWid)
  }
  if (scope === 'anchor') {
    const anchor = new Set(PHASE_A_ANCHOR_WIDS)
    return out.filter((s) => anchor.has(s.id))
  }
  return out
}

/**
 * 1 つの spec (WID-NNN.md / RM-NNN.md) について sync 処理。
 * 戻り値: { changed: boolean, drifted: string[], errors: string[] }
 */
function processSpec(spec, opts) {
  const specPath = spec.fullPath
  const id = spec.id
  const { frontmatter, body, raw } = readSpec(specPath)
  const errors = []
  const drifted = []

  if (frontmatter.id !== id) {
    errors.push(`${id}: frontmatter id "${frontmatter.id}" mismatches filename`)
  }
  const kind = spec.kind
  if (kind === 'widget') {
    return processWidgetSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts })
  }
  if (kind === 'read-model') {
    return processReadModelSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts })
  }
  if (kind === 'calculation') {
    return processCalculationSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts })
  }
  if (kind === 'chart') {
    return processChartSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts })
  }
  if (kind === 'ui-component') {
    return processUiComponentSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts })
  }
  errors.push(`${id}: unknown kind "${kind}"`)
  return { changed: false, drifted, errors }
}

function processUiComponentSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts }) {
  const exportName = frontmatter.exportName
  const sourcePath = frontmatter.sourceRef
  if (!exportName || !sourcePath) {
    errors.push(`${id}: missing exportName or sourceRef`)
    return { changed: false, drifted, errors }
  }
  if (!existsSync(resolve(REPO_ROOT, sourcePath))) {
    errors.push(`${id}: sourceRef not found: ${sourcePath}`)
    return { changed: false, drifted, errors }
  }
  const ext = extractReadModelFields(sourcePath, exportName)
  if (!ext.found) {
    errors.push(`${id}: ${ext.diagnostics.join('; ')}`)
    return { changed: false, drifted, errors }
  }
  const ext0 = ext.fields

  const merged = { ...frontmatter }
  merged.id = id
  merged.kind = 'ui-component'
  const machineUpdates = {
    exportName: ext0.exportName,
    sourceRef: sourcePath,
    sourceLine: ext0.sourceLine,
  }
  for (const [k, v] of Object.entries(machineUpdates)) {
    if (!fieldEqual(merged[k], v)) {
      drifted.push(`${k}: ${formatVal(merged[k])} → ${formatVal(v)}`)
      merged[k] = v
    }
  }
  if (merged.lifecycleStatus === undefined) merged.lifecycleStatus = 'active'
  if (merged.owner === undefined) merged.owner = 'implementation'
  if (merged.reviewCadenceDays === undefined) merged.reviewCadenceDays = 90
  if (merged.specVersion === undefined) merged.specVersion = 1

  return finalizeSpecWrite({
    specPath,
    merged,
    body,
    raw,
    fieldOrder: FIELD_ORDER_UI_COMPONENT,
    drifted,
    errors,
    opts,
  })
}

function processChartSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts }) {
  const exportName = frontmatter.exportName
  const sourcePath = frontmatter.sourceRef
  if (!exportName || !sourcePath) {
    errors.push(`${id}: missing exportName or sourceRef`)
    return { changed: false, drifted, errors }
  }
  if (!existsSync(resolve(REPO_ROOT, sourcePath))) {
    errors.push(`${id}: sourceRef not found: ${sourcePath}`)
    return { changed: false, drifted, errors }
  }
  const ext = extractReadModelFields(sourcePath, exportName)
  if (!ext.found) {
    errors.push(`${id}: ${ext.diagnostics.join('; ')}`)
    return { changed: false, drifted, errors }
  }
  const ext0 = ext.fields

  const merged = { ...frontmatter }
  merged.id = id
  merged.kind = 'chart'
  const machineUpdates = {
    exportName: ext0.exportName,
    sourceRef: sourcePath,
    sourceLine: ext0.sourceLine,
  }
  for (const [k, v] of Object.entries(machineUpdates)) {
    if (!fieldEqual(merged[k], v)) {
      drifted.push(`${k}: ${formatVal(merged[k])} → ${formatVal(v)}`)
      merged[k] = v
    }
  }
  if (merged.lifecycleStatus === undefined) merged.lifecycleStatus = 'active'
  if (merged.owner === undefined) merged.owner = 'implementation'
  if (merged.reviewCadenceDays === undefined) merged.reviewCadenceDays = 90
  if (merged.specVersion === undefined) merged.specVersion = 1

  return finalizeSpecWrite({
    specPath,
    merged,
    body,
    raw,
    fieldOrder: FIELD_ORDER_CHART,
    drifted,
    errors,
    opts,
  })
}

function processCalculationSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts }) {
  const exportName = frontmatter.exportName
  const sourcePath = frontmatter.sourceRef
  if (!exportName || !sourcePath) {
    errors.push(`${id}: missing exportName or sourceRef`)
    return { changed: false, drifted, errors }
  }
  if (!existsSync(resolve(REPO_ROOT, sourcePath))) {
    errors.push(`${id}: sourceRef not found: ${sourcePath}`)
    return { changed: false, drifted, errors }
  }
  const ext = extractReadModelFields(sourcePath, exportName)
  if (!ext.found) {
    errors.push(`${id}: ${ext.diagnostics.join('; ')}`)
    return { changed: false, drifted, errors }
  }
  const ext0 = ext.fields

  const merged = { ...frontmatter }
  merged.id = id
  merged.kind = 'calculation'
  const machineUpdates = {
    exportName: ext0.exportName,
    sourceRef: sourcePath,
    sourceLine: ext0.sourceLine,
  }
  for (const [k, v] of Object.entries(machineUpdates)) {
    if (!fieldEqual(merged[k], v)) {
      drifted.push(`${k}: ${formatVal(merged[k])} → ${formatVal(v)}`)
      merged[k] = v
    }
  }
  if (merged.lifecycleStatus === undefined) merged.lifecycleStatus = 'active'
  if (merged.owner === undefined) merged.owner = 'architecture'
  if (merged.reviewCadenceDays === undefined) merged.reviewCadenceDays = 90
  if (merged.specVersion === undefined) merged.specVersion = 1

  return finalizeSpecWrite({
    specPath,
    merged,
    body,
    raw,
    fieldOrder: FIELD_ORDER_CALCULATION,
    drifted,
    errors,
    opts,
  })
}

function processWidgetSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts }) {
  const widgetDefId = frontmatter.widgetDefId
  const sourcePath = frontmatter.registrySource
  if (!widgetDefId || !sourcePath) {
    errors.push(`${id}: missing widgetDefId or registrySource`)
    return { changed: false, drifted, errors }
  }
  if (!existsSync(resolve(REPO_ROOT, sourcePath))) {
    errors.push(`${id}: registrySource not found: ${sourcePath}`)
    return { changed: false, drifted, errors }
  }
  const ext = extractWidgetFields(sourcePath, widgetDefId)
  if (!ext.found) {
    errors.push(`${id}: ${ext.diagnostics.join('; ')}`)
    return { changed: false, drifted, errors }
  }
  const ext0 = ext.fields

  const merged = { ...frontmatter }
  merged.id = id
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
  if (merged.acquisitionPath === undefined) merged.acquisitionPath = 'ctx-direct'
  if (merged.owner === undefined) merged.owner = 'implementation'
  if (merged.reviewCadenceDays === undefined) merged.reviewCadenceDays = 90
  if (merged.specVersion === undefined) merged.specVersion = 1

  return finalizeSpecWrite({
    specPath,
    merged,
    body,
    raw,
    fieldOrder: FIELD_ORDER_WIDGET,
    drifted,
    errors,
    opts,
  })
}

function processReadModelSpec({ id, specPath, frontmatter, body, raw, errors, drifted, opts }) {
  const exportName = frontmatter.exportName
  const sourcePath = frontmatter.sourceRef
  if (!exportName || !sourcePath) {
    errors.push(`${id}: missing exportName or sourceRef`)
    return { changed: false, drifted, errors }
  }
  if (!existsSync(resolve(REPO_ROOT, sourcePath))) {
    errors.push(`${id}: sourceRef not found: ${sourcePath}`)
    return { changed: false, drifted, errors }
  }
  const ext = extractReadModelFields(sourcePath, exportName)
  if (!ext.found) {
    errors.push(`${id}: ${ext.diagnostics.join('; ')}`)
    return { changed: false, drifted, errors }
  }
  const ext0 = ext.fields

  const merged = { ...frontmatter }
  merged.id = id
  merged.kind = 'read-model'
  const machineUpdates = {
    exportName: ext0.exportName,
    sourceRef: sourcePath,
    sourceLine: ext0.sourceLine,
  }
  for (const [k, v] of Object.entries(machineUpdates)) {
    if (!fieldEqual(merged[k], v)) {
      drifted.push(`${k}: ${formatVal(merged[k])} → ${formatVal(v)}`)
      merged[k] = v
    }
  }
  if (merged.owner === undefined) merged.owner = 'implementation'
  if (merged.reviewCadenceDays === undefined) merged.reviewCadenceDays = 90
  if (merged.specVersion === undefined) merged.specVersion = 1

  return finalizeSpecWrite({
    specPath,
    merged,
    body,
    raw,
    fieldOrder: FIELD_ORDER_READ_MODEL,
    drifted,
    errors,
    opts,
  })
}

function finalizeSpecWrite({ specPath, merged, body, raw, fieldOrder, drifted, errors, opts }) {
  const serialized = serializeFrontmatter(merged, fieldOrder)
  const newRaw = `---\n${serialized}\n---\n${body.startsWith('\n') ? body : '\n' + body}`
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
// JSDoc 注入:
//   widget: source の `id: '<defId>'` 直前に `/** @widget-id WID-NNN */`
//   read-model: source の export 行直前に `/** @rm-id RM-NNN */`
// idempotent (既に同 id の JSDoc があれば skip)。
// 同一 source 内に複数 entry がある場合は 1 ファイル 1 回読み書きで一括処理。
// ---------------------------------------------------------------------------

function injectJsdocAll(specs) {
  const editsBySource = new Map()
  for (const spec of specs) {
    const { frontmatter } = readSpec(spec.fullPath)
    if (spec.kind === 'widget') {
      const widgetDefId = frontmatter.widgetDefId
      const sourcePath = frontmatter.registrySource
      if (!widgetDefId || !sourcePath) continue
      const list = editsBySource.get(sourcePath) ?? []
      list.push({ id: spec.id, kind: 'widget', match: { widgetDefId } })
      editsBySource.set(sourcePath, list)
    } else if (spec.kind === 'read-model') {
      const exportName = frontmatter.exportName
      const sourcePath = frontmatter.sourceRef
      if (!exportName || !sourcePath) continue
      const list = editsBySource.get(sourcePath) ?? []
      list.push({ id: spec.id, kind: 'read-model', match: { exportName } })
      editsBySource.set(sourcePath, list)
    } else if (spec.kind === 'calculation') {
      const exportName = frontmatter.exportName
      const sourcePath = frontmatter.sourceRef
      if (!exportName || !sourcePath) continue
      const list = editsBySource.get(sourcePath) ?? []
      list.push({ id: spec.id, kind: 'calculation', match: { exportName } })
      editsBySource.set(sourcePath, list)
    } else if (spec.kind === 'chart') {
      const exportName = frontmatter.exportName
      const sourcePath = frontmatter.sourceRef
      if (!exportName || !sourcePath) continue
      const list = editsBySource.get(sourcePath) ?? []
      list.push({ id: spec.id, kind: 'chart', match: { exportName } })
      editsBySource.set(sourcePath, list)
    } else if (spec.kind === 'ui-component') {
      const exportName = frontmatter.exportName
      const sourcePath = frontmatter.sourceRef
      if (!exportName || !sourcePath) continue
      const list = editsBySource.get(sourcePath) ?? []
      list.push({ id: spec.id, kind: 'ui-component', match: { exportName } })
      editsBySource.set(sourcePath, list)
    }
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
    const insertions = []
    for (const edit of edits) {
      const matchRe = buildInjectMatcher(edit)
      let foundAt = -1
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(matchRe)
        if (!m) continue
        foundAt = i
        const indent = m[1]
        const tag = jsdocTagFor(edit)
        let alreadyHas = false
        for (let j = Math.max(0, i - 4); j < i; j++) {
          if (lines[j]?.includes(tag)) {
            alreadyHas = true
            break
          }
        }
        if (alreadyHas) skipped++
        else insertions.push({ at: i, indent, tag })
        break
      }
      if (foundAt < 0) {
        console.error(`  ERROR ${edit.id}: anchor not found in ${sourcePath}`)
      }
    }
    if (insertions.length === 0) continue
    insertions.sort((a, b) => b.at - a.at)
    for (const ins of insertions) {
      lines.splice(ins.at, 0, `${ins.indent}/** ${ins.tag} */`)
      injected++
    }
    writeFileSync(fullPath, lines.join('\n'))
    console.log(`INJECT ${sourcePath} (+${insertions.length})`)
  }
  console.log(`\n${injected} injection(s), ${skipped} already present`)
  return { injected, skipped }
}

function buildInjectMatcher(edit) {
  if (edit.kind === 'widget') {
    return new RegExp(`^(\\s*)id:\\s*['"\`]${escapeRegex(edit.match.widgetDefId)}['"\`]`)
  }
  if (
    edit.kind === 'read-model' ||
    edit.kind === 'calculation' ||
    edit.kind === 'chart' ||
    edit.kind === 'ui-component'
  ) {
    const n = escapeRegex(edit.match.exportName)
    // matches: `export function NAME`, `export async function NAME`, `export const NAME`,
    //          `export class NAME`, `export interface NAME`, `export type NAME`
    return new RegExp(
      `^(\\s*)export\\s+(?:async\\s+)?(?:function|const|let|var|class|interface|type)\\s+${n}\\b`,
    )
  }
  throw new Error(`Unknown edit kind: ${edit.kind}`)
}

function jsdocTagFor(edit) {
  if (edit.kind === 'widget') return `@widget-id ${edit.id}`
  if (edit.kind === 'read-model') return `@rm-id ${edit.id}`
  if (edit.kind === 'calculation') return `@calc-id ${edit.id}`
  if (edit.kind === 'chart') return `@chart-id ${edit.id}`
  if (edit.kind === 'ui-component') return `@uic-id ${edit.id}`
  throw new Error(`Unknown edit kind: ${edit.kind}`)
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
  for (const spec of specs) {
    const r = processSpec(spec, { check: args.check })
    if (r.errors.length > 0) {
      totalErrors += r.errors.length
      for (const e of r.errors) console.error(`  ERROR ${e}`)
      continue
    }
    if (r.changed) {
      totalChanged++
      console.log(`${args.check ? 'DRIFT' : 'WROTE'} ${spec.fileName}`)
      if (args.verbose || args.check) {
        for (const d of r.drifted) console.log(`    ${d}`)
      }
    } else if (args.verbose) {
      console.log(`OK    ${spec.fileName}`)
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
