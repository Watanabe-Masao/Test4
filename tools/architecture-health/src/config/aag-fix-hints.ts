/**
 * AAG Fix Hints — KPI / Hard Gate 違反時の修正手順マッピング
 *
 * Response 層の共通データ。PR comment と Health certificate の両方が参照する。
 * 修正手順を変更する場合はこの 1 箇所だけを更新する。
 */

export const AAG_FIX_HINTS: Readonly<
  Record<string, { action: string; doc?: string; slice?: string }>
> = {
  // ── docs / obligation ────────────────────────────────
  'docs.obligation.violations': {
    action: '`cd app && npm run docs:generate` を実行してコミット',
    doc: 'tools/architecture-health/src/collectors/obligation-collector.ts',
    slice: 'governance-ops',
  },
  'docs.generatedSections.stale': {
    action: '`cd app && npm run docs:generate` を実行してコミット',
    slice: 'governance-ops',
  },
  'docs.obsoleteTerms.count': {
    action: '旧体系の語彙を新体系に置換する（docs/contracts/principles.json の obsoleteTerms 参照）',
    doc: 'docs/contracts/principles.json',
    slice: 'governance-ops',
  },

  // ── boundary ────────────────────────────────────────
  'boundary.presentationToInfra': {
    action: 'presentation → infrastructure の直接 import を削除。application/hooks 経由に変更',
    doc: 'references/01-foundation/design-principles.md',
    slice: 'layer-boundary',
  },
  'boundary.infraToApplication': {
    action: 'infrastructure → application の import を削除。domain の契約型を使用',
    doc: 'references/01-foundation/design-principles.md',
    slice: 'layer-boundary',
  },

  // ── allowlist / debt ────────────────────────────────
  'allowlist.total': {
    action: 'allowlist エントリの removalCondition を確認し、条件を満たしたものを卒業',
    doc: 'references/03-implementation/allowlist-management.md',
    slice: 'governance-ops',
  },
  'allowlist.active.count': {
    action: 'active-debt エントリを解消する（useMemo 抽出、責務分離等）',
    doc: 'references/03-implementation/allowlist-management.md',
    slice: 'responsibility-separation',
  },

  // ── complexity ──────────────────────────────────────
  'complexity.hotspot.count': {
    action: 'hotspot ファイルを特定し、責務分離を実施（C8: 1文説明テスト）',
    doc: 'references/03-implementation/responsibility-separation-catalog.md',
    slice: 'responsibility-separation',
  },
  'complexity.nearLimit.count': {
    action: 'near-limit ファイルの行数・hook 数を削減し、上限未満に維持する',
    doc: 'app/src/test/allowlists/complexity.ts',
    slice: 'responsibility-separation',
  },

  // ── guard ───────────────────────────────────────────
  'guard.files.count': {
    action: 'ガードテストが不足している場合、新しいガードを追加する',
    doc: 'references/03-implementation/architecture-rule-system.md',
    slice: 'governance-ops',
  },

  // ── performance ─────────────────────────────────────
  'perf.bundle.totalJsKb': {
    action: 'バンドルサイズを削減する（dynamic import, tree shaking, lazy loading）',
    slice: 'layer-boundary',
  },
  'perf.bundle.mainJsKb': {
    action: 'メインバンドルから重い依存を dynamic import に分離する',
    slice: 'layer-boundary',
  },

  // ── temporal governance ─────────────────────────────
  'temporal.allowlist.activeDebt.count': {
    action: 'active-debt エントリの removalCondition を確認し、リファクタリングを実施',
    doc: 'references/03-implementation/allowlist-management.md',
    slice: 'governance-ops',
  },
  'temporal.allowlist.expired.count': {
    action: '期限切れ allowlist エントリを解消するか、renewalCount を増やして延長する',
    doc: 'references/03-implementation/allowlist-management.md',
    slice: 'governance-ops',
  },
}
