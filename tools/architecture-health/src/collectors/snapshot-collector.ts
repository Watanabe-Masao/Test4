/**
 * Snapshot Collector — architecture-state-snapshot.json から KPI を抽出
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ArchitectureSnapshot, HealthKpi } from '../types.js'

export function collectFromSnapshot(repoRoot: string): HealthKpi[] {
  const snapshotPath = resolve(
    repoRoot,
    'references/04-tracking/generated/architecture-state-snapshot.json',
  )
  const raw = readFileSync(snapshotPath, 'utf-8')
  const snapshot: ArchitectureSnapshot = JSON.parse(raw)

  const kpis: HealthKpi[] = []

  // --- Allowlist ---
  kpis.push({
    id: 'allowlist.total',
    label: '許可リスト総エントリ数',
    category: 'allowlist',
    value: snapshot.totalAllowlistEntries,
    unit: 'count',
    status: 'ok', // evaluator が上書き
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  // frozen list で count > 0 のものを数える
  const frozenNonZero = snapshot.frozenLists.filter((name) => {
    const entry = snapshot.listSummary[name]
    return entry && entry.count > 0
  }).length
  kpis.push({
    id: 'allowlist.frozen.nonZero',
    label: 'Frozen リスト非ゼロ',
    category: 'allowlist',
    value: frozenNonZero,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  kpis.push({
    id: 'allowlist.active.count',
    label: 'Active リスト数',
    category: 'allowlist',
    value: snapshot.activeLists,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  // --- Compatibility Debt ---
  kpis.push({
    id: 'compat.bridge.count',
    label: 'Active Bridge 数',
    category: 'compatibility_debt',
    value: snapshot.activeBridges.length,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: snapshot.activeBridges.map((b) => `app/src/${b.path}`),
  })

  kpis.push({
    id: 'compat.reexport.count',
    label: '後方互換 re-export 数',
    category: 'compatibility_debt',
    value: snapshot.compatReexportCount,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  // --- Complexity ---
  kpis.push({
    id: 'complexity.hotspot.count',
    label: '複雑性ホットスポット数',
    category: 'complexity',
    value: snapshot.complexityHotspots.length,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: snapshot.complexityHotspots.map((h) => `app/src/${h.file}`),
  })

  kpis.push({
    id: 'complexity.nearLimit.count',
    label: '上限間近ファイル数',
    category: 'complexity',
    value: snapshot.nearLimitFiles.length,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: snapshot.nearLimitFiles.map((n) => `app/src/${n.file}`),
  })

  kpis.push({
    id: 'complexity.vm.count',
    label: 'ViewModel ファイル数',
    category: 'complexity',
    value: snapshot.vmFileCount,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  // --- Boundary (frozen list の count で判定) ---
  const pToI = snapshot.listSummary['presentationToInfrastructure']
  kpis.push({
    id: 'boundary.presentationToInfra',
    label: 'Presentation→Infrastructure 違反',
    category: 'boundary',
    value: pToI?.count ?? 0,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  const iToA = snapshot.listSummary['infrastructureToApplication']
  kpis.push({
    id: 'boundary.infraToApplication',
    label: 'Infrastructure→Application 違反',
    category: 'boundary',
    value: iToA?.count ?? 0,
    unit: 'count',
    status: 'ok',
    owner: 'architecture',
    docRefs: [],
    implRefs: [],
  })

  return kpis
}
