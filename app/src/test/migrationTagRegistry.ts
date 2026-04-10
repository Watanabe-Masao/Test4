/**
 * 移行タグレジストリ — 実装移行中の一時例外を構造化管理する
 *
 * ## 設計思想
 *
 * 移行タグは「便利なダグ」ではない。以下を必ず満たす:
 *
 * 1. **なぜ付いているか** — 移行の文脈と根拠
 * 2. **完了条件** — 何が達成されたら外せるか（測定可能）
 * 3. **外す時にやること** — チェックリスト（タグを外す人が迷わない）
 * 4. **いつ付けたか / 誰が付けたか** — トレーサビリティ
 * 5. **残っていたらどうなるか** — 放置した場合のリスク
 *
 * ## 運用ルール
 *
 * - CI で検知・集計するが **落とさない**
 * - ただし **マージは block-merge で阻止する**（入口で見落とさない）
 * - タグが不要になったら **completionChecklist を全て実行してから** 外す
 * - 外して終わりにしない。外した後の確認も checklist に含める
 * - 最後まで残さない。全タグに expiresAt を設定する
 *
 * @responsibility R:utility
 * @guard I3
 */

/** 移行タグのフェーズ。どの Phase の移行作業に関連するか */
export type MigrationPhase =
  | 'phase-0'
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4'
  | 'phase-5'
  | 'phase-6'
  | 'phase-7'

/** 移行タグのステータス */
export type MigrationTagStatus =
  | 'active' // 移行作業中。CI は warn、マージは block
  | 'ready-to-remove' // 完了条件を満たした。checklist 実行後に除去
  | 'removed' // 除去済み（履歴として残す）

/**
 * 移行タグエントリ
 *
 * **タグを付ける人の責務**: 全フィールドを埋める。completionChecklist は
 * 「自分以外の人がこのタグを外す時に困らない」レベルで書く。
 *
 * **タグを外す人の責務**: completionChecklist を全て実行し、
 * status を 'removed' に変更し、removedAt を記入する。
 */
export interface MigrationTagEntry {
  /** タグ ID: MT-XXX 形式 */
  readonly id: string
  /** 関連する Phase */
  readonly phase: MigrationPhase
  /** 対象ファイルパス（src/ からの相対パス） */
  readonly targetPath: string
  /** ステータス */
  readonly status: MigrationTagStatus

  // ── なぜ付いているか ──
  /** 移行の文脈。なぜこの例外が今必要か */
  readonly context: string
  /** どの Architecture Rule の一時例外か */
  readonly exemptRuleId: string

  // ── いつ / 誰が ──
  /** タグ付与日 */
  readonly createdAt: string
  /** 有効期限。これを過ぎたら強制レビュー */
  readonly expiresAt: string
  /** タグ付与者（セッション ID で十分） */
  readonly createdBy: string

  // ── 完了条件（測定可能） ──
  /** 何が達成されたらこのタグを外せるか。全て true になったら ready-to-remove */
  readonly completionCriteria: readonly string[]

  // ── 外す時にやること ──
  /**
   * タグを外す人が実行するチェックリスト。
   * 「自分以外の人が迷わず実行できる」レベルで書く。
   * 最後の項目は必ず「タグ除去後の確認」を含める。
   */
  readonly completionChecklist: readonly string[]

  // ── 放置リスク ──
  /** このタグが残り続けた場合のリスク */
  readonly stalenessRisk: string

  // ── 除去時の記録 ──
  /** 除去日（status が removed の場合のみ） */
  readonly removedAt?: string
  /** 除去理由 */
  readonly removalNote?: string
}

/**
 * 移行タグレジストリ
 *
 * 現時点では空。Phase 3 以降で移行作業が始まったらエントリを追加する。
 *
 * 例:
 * ```ts
 * {
 *   id: 'MT-001',
 *   phase: 'phase-3',
 *   targetPath: 'application/services/forecastBridge.ts',
 *   status: 'active',
 *   context: 'bridge の JSDoc を analytic-authoritative に書き換え中。依存先の型整理が先行必要',
 *   exemptRuleId: 'AR-TERM-AUTHORITATIVE-STANDALONE',
 *   createdAt: '2026-04-10',
 *   expiresAt: '2026-05-10',
 *   createdBy: 'session_xxx',
 *   completionCriteria: [
 *     'forecastBridge.ts の JSDoc が全て analytic-authoritative に修正されている',
 *     'wasmEngine.ts の forecast module が analytic-authoritative としてメタデータを持つ',
 *     'npm run test:guards が全通過する',
 *   ],
 *   completionChecklist: [
 *     '1. forecastBridge.ts の authoritative 単独使用を analytic-authoritative に書き換え',
 *     '2. wasmEngine.ts の moduleStatus に semanticClass: analytic を追加',
 *     '3. npm run test:guards で AR-TERM-AUTHORITATIVE-STANDALONE の baseline を更新',
 *     '4. authoritative-term-sweep.md の Bridge 系カウントを更新',
 *     '5. このエントリの status を removed に変更し removedAt を記入',
 *     '6. npm run test:guards で全通過を確認',
 *   ],
 *   stalenessRisk: 'authoritative 単独使用が残り続け、後続 AI が business/analytic を混同する',
 * }
 * ```
 */
export const MIGRATION_TAG_REGISTRY: readonly MigrationTagEntry[] = [
  // Phase 3 以降で追加
] as const
