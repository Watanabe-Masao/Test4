/**
 * presentation 層 periodSelectionStore 直接アクセスガード
 *
 * unify-period-analysis Phase 1: 固定期間ヘッダの実体である
 * `PeriodSelection` / `usePeriodSelectionStore` への presentation 層からの
 * 直接参照を allowlist 管理にし、新規参照を禁止する。
 *
 * 許可方針:
 *   - Phase 1 の正規配線点: `useUnifiedWidgetContext.ts`（唯一の reader）
 *   - 期間選択 UI コントロール: setPeriod1/setPeriod2/setPreset/
 *     setComparisonEnabled 等を呼ぶ writer 系 component
 *
 * 禁止方針:
 *   - 上記以外の presentation reader / component が store.selection を
 *     直接購読すること
 *   - store を経由せず `FreePeriodAnalysisFrame` 相当の情報を構築すること
 *
 * 新規違反が出たら、その場所を allowlist に加える前に
 * `useUnifiedWidgetContext.ctx.freePeriodLane` 経由での参照に書き換えるのが
 * 正しい解決経路。
 *
 * 将来 Phase 6（段階的画面載せ替え）で writers も含めて縮退させる前提。
 * その時にベースラインを減らす方向（ratchet-down）のみ許可する。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * presentation 層で `usePeriodSelectionStore` / `periodSelectionStore` を
 * 直接 import することを許容する path の集合。
 *
 * **新規追加は原則禁止**。追加が必要なら本 guard の doc を更新し、
 * 追加理由（reader / writer / 移行経路）を明示すること。
 */
const ALLOWLIST: readonly {
  readonly path: string
  readonly kind: 'reader' | 'writer' | 'reader+writer'
  readonly reason: string
}[] = [
  {
    path: 'presentation/hooks/useUnifiedWidgetContext.ts',
    kind: 'reader',
    reason:
      'Phase 1 正規配線点: PeriodSelection を読み buildFreePeriodFrame 経由で ctx.freePeriodLane に渡す唯一の reader',
  },
  {
    path: 'presentation/pages/Insight/useInsightData.ts',
    kind: 'reader',
    reason: 'Insight ページの従来経路。Phase 6 で ctx.freePeriodLane 経由へ移行する',
  },
  {
    path: 'presentation/pages/Mobile/MobileDashboardPage.tsx',
    kind: 'reader',
    reason: 'Mobile dashboard の従来経路。Phase 6 で ctx.freePeriodLane 経由へ移行する',
  },
  {
    path: 'presentation/components/DataManagementSidebar.tsx',
    kind: 'writer',
    reason: '期間選択 UI コントロール (setPeriod1 writer)',
  },
  {
    path: 'presentation/components/charts/useDualPeriodRange.ts',
    kind: 'reader+writer',
    reason: 'DualPeriodSlider と periodSelectionStore を連動する period picker',
  },
  {
    path: 'presentation/components/common/WidgetPeriodToggle.tsx',
    kind: 'reader',
    reason: 'widget 単位の期間選択トグル (global → local 切り替え)',
  },
]

const ALLOWLIST_PATHS = new Set(ALLOWLIST.map((e) => e.path))

const IMPORT_PATTERNS = [
  /from ['"]@\/application\/stores\/periodSelectionStore['"]/,
  /from ['"]\.\.\/(\.\.\/)*application\/stores\/periodSelectionStore['"]/,
]

describe('presentation 層 periodSelectionStore 直接アクセスガード', () => {
  it('presentation 配下の periodSelectionStore 直接 import は allowlist の範囲内に収まる', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (relPath.includes('__tests__') || relPath.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      const hasImport = IMPORT_PATTERNS.some((p) => p.test(content))
      if (!hasImport) continue

      if (!ALLOWLIST_PATHS.has(relPath)) {
        violations.push(relPath)
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            `[Phase 1] presentation 層からの periodSelectionStore 直接 import が allowlist 外で検出されました:`,
            ...violations.map((v) => `  - ${v}`),
            '',
            '解決方法:',
            '  1. reader なら useUnifiedWidgetContext の ctx.freePeriodLane.frame を経由する',
            '  2. writer なら本 guard の ALLOWLIST に reason と kind を添えて追加',
            '  3. どちらも妥当でなければ直接 import を削除',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('allowlist の各 entry が実在するファイルを指している', () => {
    const missing: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, `allowlist に orphan entry: ${missing.join(', ')}`).toEqual([])
  })

  it('allowlist の各 entry が実際に periodSelectionStore を import している', () => {
    const noLongerUsing: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const hasImport = IMPORT_PATTERNS.some((p) => p.test(content))
      if (!hasImport) noLongerUsing.push(entry.path)
    }
    expect(
      noLongerUsing,
      noLongerUsing.length > 0
        ? `allowlist に載っているが既に periodSelectionStore を使っていないファイル (削除してベースラインを下げてください): ${noLongerUsing.join(
            ', ',
          )}`
        : undefined,
    ).toEqual([])
  })

  it('ベースラインの現状件数が 6 である（ratchet-down 方針）', () => {
    // unify-period-analysis Phase 1 時点の現状件数を固定し、以後は減少のみ許可する
    expect(ALLOWLIST.length).toBeLessThanOrEqual(6)
  })
})
