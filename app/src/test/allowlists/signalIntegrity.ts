/**
 * ガードテスト許可リスト — Test Signal Integrity
 *
 * 役割: G3 (eslint-disable / @ts-ignore / @ts-expect-error 抑制禁止) と
 *       Test Signal Integrity 系ガードの **構造化された** 許可リスト。
 *
 * 上位原則: `references/01-principles/test-signal-integrity.md`
 * 関連 project: `projects/test-signal-integrity` Phase 3
 *
 * == 設計方針 ==
 * - 旧 G3 では `codePatternGuard.test.ts` 内に inline `Set<string>` で 2 件のみ
 *   を保持していたが、Phase 3 で本ファイルに切り出して reason / removalCondition
 *   を構造化必須化する
 * - 新規 entry を追加する場合は **必ず** reason: と removalCondition を構造化
 *   フォーマットで記述する（自由文の補助コメントは可、ただし機械可読フィールドは
 *   必須）
 * - 「黙らせる手段」を構造化された rationale enforcement に格上げする
 *   = この allowlist に登録する = "なぜ" と "いつ消せるか" を必ず書く
 *
 * == 関連実装 ==
 * - `app/src/test/guards/codePatternGuard.test.ts` G3 ブロック (consumer)
 * - `tools/scripts/test-signal-baseline.ts` (Phase 3 baseline 採取)
 * - `references/02-status/generated/test-signal-baseline.md` (現状件数)
 */
import type { AllowlistEntry } from './types'

/**
 * G3 SUPPRESS — eslint-disable / @ts-ignore / @ts-expect-error の許容例外
 *
 * 旧 inline G3_ALLOWLIST から移行 (Phase 3 step 2 — 2026-04-13)。
 * 既存 2 件はライブラリ制約 / 非標準 HTML 属性 という構造的理由で permanent。
 *
 * 今後の追加には以下を必須とする:
 * - reason: なぜ抑制が必要か（library constraint / non-standard API / migration 等）
 * - removalCondition: いつ削除可能になるか（バージョン / PR / イベント）
 * - category: 'justified' (恒久) / 'migration' (一時) / 'structural' (構造的限界)
 * - lifecycle: 'permanent' (恒久) / 'retirement' (条件付き除去可) / 'active-debt' (要設計作業)
 */
export const g3SuppressAllowlist: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/EChart.tsx',
    ruleId: 'AR-G3-SUPPRESS',
    reason:
      'ECharts ライブラリの制約: themeName 変更時に option を再適用する必要があるが、' +
      'echartsInstance は mount 時に確保され lifetime 中安定しているため依存配列に含めると' +
      'stale closure ループが発生する。react-hooks/exhaustive-deps の安定 ref アノテーション' +
      'が利用可能になるまで意図的に抑制している',
    category: 'justified',
    removalCondition:
      'react-hooks rule が stable-ref annotation を natively support するか、' +
      'ECharts の React wrapper を導入して useEffect 自体を不要にする',
    lifecycle: 'permanent',
    retentionReason: 'structural',
    createdAt: '2026-04-13',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'presentation/components/common/FileDropZone.tsx',
    ruleId: 'AR-G3-SUPPRESS',
    reason:
      'webkitdirectory は HTML5 標準ではないが Chrome / Firefox / Safari で実装されている' +
      '非標準属性。TypeScript の DOM 型定義に存在しないため @ts-expect-error が必要。' +
      'ファイルアップロード UX のためにフォルダ選択を可能にする要件があり、' +
      '代替 API は存在しない',
    category: 'justified',
    removalCondition:
      'TypeScript DOM lib に webkitdirectory が追加される、または File System Access API' +
      'への移行で folder picker を再実装する',
    lifecycle: 'permanent',
    retentionReason: 'structural',
    createdAt: '2026-04-13',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
] as const

/**
 * G3 SUPPRESS allowlist の Set 形式（codePatternGuard.test.ts の consumer 用）
 *
 * 既存の G3 ガードは `Set<string>` 形式の path 集合を期待するため、
 * 構造化された AllowlistEntry[] から path のみを抽出した Set を提供する。
 */
export const G3_SUPPRESS_PATH_SET: ReadonlySet<string> = new Set(
  g3SuppressAllowlist.map((e) => e.path),
)

/**
 * G3 ratchet-down 上限。新規追加で増やせないようにする。
 *
 * 履歴:
 * - 2026-04: inline 時代から 2 件
 * - 2026-04-13: signalIntegrity.ts 切り出し時にも 2 件維持
 */
export const G3_SUPPRESS_MAX_ENTRIES = 2
