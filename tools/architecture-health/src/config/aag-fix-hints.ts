/**
 * AAG Fix Hints — KPI / Hard Gate 違反時の修正手順マッピング
 *
 * Response 層の共通データ。PR comment と Health certificate の両方が参照する。
 * 修正手順を変更する場合はこの 1 箇所だけを更新する。
 */

export const AAG_FIX_HINTS: Readonly<Record<string, { action: string; doc?: string }>> = {
  'docs.obligation.violations': {
    action: '`cd app && npm run docs:generate` を実行してコミット',
    doc: 'tools/architecture-health/src/collectors/obligation-collector.ts',
  },
  'docs.generatedSections.stale': {
    action: '`cd app && npm run docs:generate` を実行してコミット',
  },
  'boundary.presentationToInfra': {
    action: 'presentation → infrastructure の直接 import を削除',
    doc: 'references/01-principles/design-principles.md',
  },
  'boundary.infraToApplication': {
    action: 'infrastructure → application の import を削除',
    doc: 'references/01-principles/design-principles.md',
  },
}
