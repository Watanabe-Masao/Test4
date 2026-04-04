/**
 * Doc Link Rules — KPI とドキュメントの対応関係
 *
 * 各 KPI ID に対して docRefs と implRefs を定義する。
 * ここが「リンク解決」の正本。
 */
import type { DocRef } from '../types.js'

type DocLinkEntry = {
  readonly docRefs: readonly DocRef[]
  readonly implRefs: readonly string[]
}

export const DOC_LINKS: Readonly<Record<string, DocLinkEntry>> = {
  'allowlist.total': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'totalAllowlistEntries' },
      { kind: 'definition', path: 'references/03-guides/allowlist-management.md' },
      { kind: 'roadmap', path: 'references/02-status/technical-debt-roadmap.md' },
    ],
    implRefs: ['app/src/test/allowlists/'],
  },
  'allowlist.frozen.nonZero': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'frozenLists' },
      { kind: 'guard', path: 'app/src/test/guards/layerBoundaryGuard.test.ts' },
    ],
    implRefs: ['app/src/test/allowlists/'],
  },
  'allowlist.active.count': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'activeLists' },
    ],
    implRefs: ['app/src/test/allowlists/'],
  },
  'compat.bridge.count': {
    docRefs: [
      { kind: 'definition', path: 'references/02-status/technical-debt-roadmap.md', section: '後方互換負債' },
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'activeBridges' },
      { kind: 'roadmap', path: 'references/02-status/open-issues.md' },
    ],
    implRefs: [
      'app/src/application/services/budgetAnalysisBridge.ts',
      'app/src/application/services/factorDecompositionBridge.ts',
      'app/src/application/services/forecastBridge.ts',
      'app/src/application/services/grossProfitBridge.ts',
      'app/src/application/services/timeSlotBridge.ts',
    ],
  },
  'compat.reexport.count': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'compatReexportCount' },
    ],
    implRefs: [],
  },
  'complexity.hotspot.count': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'complexityHotspots' },
      { kind: 'roadmap', path: 'references/02-status/open-issues.md', section: 'R-4' },
    ],
    implRefs: ['app/src/test/allowlists/complexity.ts'],
  },
  'complexity.nearLimit.count': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'nearLimitFiles' },
    ],
    implRefs: ['app/src/test/allowlists/size.ts'],
  },
  'complexity.vm.count': {
    docRefs: [
      { kind: 'source', path: 'references/02-status/generated/architecture-state-snapshot.json', section: 'vmFileCount' },
    ],
    implRefs: [],
  },
  'guard.files.count': {
    docRefs: [
      { kind: 'definition', path: 'CLAUDE.md', section: 'ガードテスト' },
      { kind: 'guard', path: 'app/src/test/guards/' },
    ],
    implRefs: ['app/src/test/guards/'],
  },
  'guard.reviewOnlyTags.count': {
    docRefs: [
      { kind: 'source', path: 'app/src/test/guardTagRegistry.ts', section: 'REVIEW_ONLY_TAGS' },
    ],
    implRefs: ['app/src/test/guardTagRegistry.ts'],
  },
  'docs.obsoleteTerms.count': {
    docRefs: [
      { kind: 'source', path: 'docs/contracts/principles.json', section: 'obsoleteTerms' },
      { kind: 'guard', path: 'app/src/test/documentConsistency.test.ts' },
    ],
    implRefs: [],
  },
  'docs.generatedSections.stale': {
    docRefs: [
      { kind: 'guard', path: 'app/src/test/documentConsistency.test.ts' },
    ],
    implRefs: ['tools/architecture-health/src/renderers/section-updater.ts'],
  },
  'boundary.presentationToInfra': {
    docRefs: [
      { kind: 'guard', path: 'app/src/test/guards/layerBoundaryGuard.test.ts' },
      { kind: 'definition', path: 'references/01-principles/design-principles.md', section: 'A1' },
    ],
    implRefs: ['app/src/test/allowlists/architecture.ts'],
  },
  'boundary.infraToApplication': {
    docRefs: [
      { kind: 'guard', path: 'app/src/test/guards/layerBoundaryGuard.test.ts' },
      { kind: 'definition', path: 'references/01-principles/design-principles.md', section: 'A1' },
    ],
    implRefs: ['app/src/test/allowlists/architecture.ts'],
  },

  // --- Bundle Perf ---
  'perf.bundle.totalJsKb': {
    docRefs: [
      { kind: 'source', path: 'app/dist/assets/', section: '*.js' },
    ],
    implRefs: ['app/vite.config.ts'],
  },
  'perf.bundle.mainJsKb': {
    docRefs: [
      { kind: 'source', path: 'app/dist/assets/', section: 'index-*.js' },
    ],
    implRefs: ['app/vite.config.ts'],
  },
  'perf.bundle.vendorEchartsKb': {
    docRefs: [
      { kind: 'source', path: 'app/dist/assets/', section: 'vendor-echarts-*.js' },
    ],
    implRefs: ['app/vite.config.ts'],
  },

  // --- Obligation ---
  'docs.obligation.violations': {
    docRefs: [
      { kind: 'definition', path: 'tools/architecture-health/src/collectors/obligation-collector.ts' },
    ],
    implRefs: [],
  },
}
