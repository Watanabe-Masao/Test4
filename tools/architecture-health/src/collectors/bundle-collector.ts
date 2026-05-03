/**
 * Bundle Collector — dist/assets/ からバンドルサイズ KPI を収集
 *
 * vite build 後の dist/assets/*.js を解析し、
 * チャンク別・合計のサイズを KPI として報告する。
 *
 * ## 非破壊設計
 *
 * dist/ が存在しない場合（ローカルでビルド未実行等）は、
 * 既存の committed health.json から bundle KPI を引き継ぐ。
 * 「算出不能」であって「値を削除してよい」ではない。
 *
 * 全 bundle KPI は source: 'build-artifact' を持ち、
 * docs:check でビルド未実行環境を判別可能にする。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'

interface ChunkInfo {
  readonly name: string
  readonly file: string
  readonly sizeKb: number
}

function classifyChunk(filename: string): string {
  if (filename.startsWith('vendor-echarts')) return 'vendor-echarts'
  if (filename.startsWith('vendor-xlsx')) return 'vendor-xlsx'
  if (filename.startsWith('vendor-motion')) return 'vendor-motion'
  if (filename.startsWith('vendor-router')) return 'vendor-router'
  if (filename.startsWith('vendor-state')) return 'vendor-state'
  if (filename.startsWith('vendor-styled')) return 'vendor-styled'
  if (filename.startsWith('vendor-table')) return 'vendor-table'
  if (filename.startsWith('index-')) return 'main'
  if (filename.startsWith('unifiedRegistry')) return 'unified-registry'
  if (filename.includes('worker')) return 'worker'
  return 'page-chunk'
}

/**
 * 既存 health.json から bundle KPI を引き継ぐ。
 * dist/ が存在しない場合の非破壊フォールバック。
 */
function preserveFromCommitted(repoRoot: string): HealthKpi[] {
  try {
    const healthPath = resolve(
      repoRoot,
      'references/04-tracking/generated/architecture-health.json',
    )
    const existing = JSON.parse(readFileSync(healthPath, 'utf-8'))
    const preserved: HealthKpi[] = (existing.kpis ?? []).filter(
      (k: { id: string }) => k.id.startsWith('perf.bundle.'),
    )
    // source が未設定の場合は build-artifact を付与
    return preserved.map((k: HealthKpi) => ({
      ...k,
      source: 'build-artifact' as const,
    }))
  } catch {
    return []
  }
}

export function collectFromBundle(repoRoot: string): HealthKpi[] {
  const assetsDir = resolve(repoRoot, 'app/dist/assets')

  let jsFiles: string[]
  try {
    jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js') && !f.endsWith('.js.map'))
  } catch {
    // dist/ が存在しない → 既存値を非破壊で保持
    return preserveFromCommitted(repoRoot)
  }

  const kpis: HealthKpi[] = []

  const chunks: ChunkInfo[] = jsFiles.map((f) => {
    const fullPath = resolve(assetsDir, f)
    const stat = statSync(fullPath)
    return {
      name: classifyChunk(f),
      file: f,
      sizeKb: Math.round(stat.size / 1024),
    }
  })

  // --- 合計 JS サイズ ---
  const totalJsKb = chunks.reduce((sum, c) => sum + c.sizeKb, 0)
  kpis.push({
    id: 'perf.bundle.totalJsKb',
    label: 'JS バンドル合計サイズ',
    category: 'bundle_perf',
    value: totalJsKb,
    unit: 'kb',
    status: 'ok',
    owner: 'architecture',
    source: 'build-artifact',
    docRefs: [{ kind: 'source', path: 'app/dist/assets/', section: '*.js' }],
    implRefs: ['app/vite.config.ts'],
  })

  // --- main chunk ---
  const mainChunk = chunks.find((c) => c.name === 'main')
  if (mainChunk) {
    kpis.push({
      id: 'perf.bundle.mainJsKb',
      label: 'メインバンドルサイズ',
      category: 'bundle_perf',
      value: mainChunk.sizeKb,
      unit: 'kb',
      status: 'ok',
      owner: 'architecture',
      source: 'build-artifact',
      docRefs: [{ kind: 'source', path: 'app/dist/assets/', section: 'index-*.js' }],
      implRefs: ['app/vite.config.ts'],
    })
  }

  // --- vendor-echarts ---
  const echartsChunk = chunks.find((c) => c.name === 'vendor-echarts')
  if (echartsChunk) {
    kpis.push({
      id: 'perf.bundle.vendorEchartsKb',
      label: 'ECharts バンドルサイズ',
      category: 'bundle_perf',
      value: echartsChunk.sizeKb,
      unit: 'kb',
      status: 'ok',
      owner: 'architecture',
      source: 'build-artifact',
      docRefs: [{ kind: 'source', path: 'app/dist/assets/', section: 'vendor-echarts-*.js' }],
      implRefs: ['app/vite.config.ts'],
    })
  }

  // --- CSS ---
  try {
    const cssFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.css'))
    const totalCssKb = cssFiles.reduce((sum, f) => {
      return sum + Math.round(statSync(resolve(assetsDir, f)).size / 1024)
    }, 0)
    kpis.push({
      id: 'perf.bundle.cssKb',
      label: 'CSS 合計サイズ',
      category: 'bundle_perf',
      value: totalCssKb,
      unit: 'kb',
      status: 'ok',
      owner: 'architecture',
      source: 'build-artifact',
      docRefs: [],
      implRefs: [],
    })
  } catch {
    // CSS なしの場合はスキップ
  }

  return kpis
}
