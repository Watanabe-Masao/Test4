/**
 * Bundle Collector — dist/assets/ からバンドルサイズ KPI を収集
 *
 * vite build 後の dist/assets/*.js を解析し、
 * チャンク別・合計のサイズを KPI として報告する。
 */
import { readdirSync, statSync } from 'node:fs'
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

export function collectFromBundle(repoRoot: string): HealthKpi[] {
  const assetsDir = resolve(repoRoot, 'app/dist/assets')
  const kpis: HealthKpi[] = []

  let jsFiles: string[]
  try {
    jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js') && !f.endsWith('.js.map'))
  } catch {
    // dist/ が存在しない場合はスキップ
    return kpis
  }

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
    docRefs: [],
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
      docRefs: [],
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
      docRefs: [],
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
      docRefs: [],
      implRefs: [],
    })
  } catch {
    // CSS なしの場合はスキップ
  }

  return kpis
}
