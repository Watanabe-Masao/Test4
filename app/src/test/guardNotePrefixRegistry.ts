/**
 * Guard Note Prefix Registry — guardCategoryMap.ts note field の標準プレフィックス正本
 *
 * `architectureRuleGuard.test.ts` の VALID_PREFIXES が hardcoded だった状態を解消し、
 * AAG vocabulary 拡張が AAG-internal で完結する mechanism を提供する。
 *
 * 各 prefix は **semanticRole + 採用契機 (addedInCommit) + 用例** で articulate される。
 * 新 prefix の追加は PR review obligation を維持 (= bloat 抑制、Constitution 原則 3
 * 「語彙生成は高コスト儀式」と整合)。
 *
 * ## AAG-REQ-SELF-HOSTING precursor
 *
 * 本 registry は AAG framework の vocabulary を AAG-internal で管理する application
 * instance precursor。AAG が自分自身の prefix vocabulary を articulate し、
 * `architectureRuleGuard` がその registry を参照する self-hosting pattern。
 *
 * @see app/src/test/guards/architectureRuleGuard.test.ts — consumer
 * @see app/src/test/guardCategoryMap.ts — prefix が note field の標準として適用される対象
 *
 * @responsibility R:registry
 *
 * @taxonomyKind T:registry
 */

export interface GuardNotePrefix {
  /** プレフィックス文字列 (note field の冒頭にマッチ、`:` 含む) */
  readonly prefix: string
  /** プレフィックスの意味 — 1 行の役割 articulation */
  readonly semanticRole: string
  /** 採用契機 (= 本 prefix が registry に landing した commit / project) */
  readonly addedIn: string
  /** 用例 (= 既存 entry から抜粋、新 prefix 採用判断の reference) */
  readonly examples: readonly string[]
}

/**
 * GUARD_NOTE_PREFIXES — guardCategoryMap.ts note field の標準プレフィックス正本。
 *
 * - 列挙順は採用契機の chronological 順 (新 prefix は末尾に追加)
 * - 各 prefix は exclusive 関係 (= 1 entry の note は厳密に 1 prefix を持つ)
 * - 新 prefix 追加時は PR review で **意味の重複なし** + **既存 entry に retrofit 不要** を
 *   確認 (= bloat 抑制)
 */
export const GUARD_NOTE_PREFIXES: readonly GuardNotePrefix[] = [
  {
    prefix: 'core-rule:',
    semanticRole: 'カテゴリの中核ルール (= 該当 category の primary enforcer)',
    addedIn: 'AAG 5.0 Phase A3',
    examples: [
      'core-rule: terminology の中核。Constitution 層の用語定義を直接守る',
      'core-rule: AAG の正本ルートを facade 経由に固定する入口ルール',
    ],
  },
  {
    prefix: 'merge-candidate:',
    semanticRole: '他ルールとの統合候補 (= 観察期間後に統合判断)',
    addedIn: 'AAG 5.0 Phase A3',
    examples: [
      'merge-candidate: AR-STRUCT-DUAL-RUN-EXIT と関連。両方ともインフラ層 dual-run 禁止',
      'merge-candidate: AR-AAG-DERIVED-ONLY-IMPORT の具体化（BaseRule 直参照禁止）',
    ],
  },
  {
    prefix: 'duplicate-family:',
    semanticRole: '同系統ルール群 (= 共通の意図を分担実装している族)',
    addedIn: 'AAG 5.0 Phase A3',
    examples: [
      'duplicate-family: direct-import 系。AR-CURRENT-NO-DIRECT-IMPORT-GROWTH / AR-CAND-BIZ-NO-DIRECT-IMPORT / AR-CAND-ANA-NO-DIRECT-IMPORT と同系統',
      'duplicate-family: direct-import 系 4 ルールの統合検討',
    ],
  },
  {
    prefix: 'sunset-candidate:',
    semanticRole: '廃止検討対象 (= state-based trigger 待ち、AAG-REQ-NO-DATE-RITUAL 適用)',
    addedIn: 'AAG 5.0 Phase A3',
    examples: [],
  },
  {
    prefix: 'review-focus:',
    semanticRole: '観測期間後に要見直し (= experimental rule、observeForDays 適用範囲)',
    addedIn: 'AAG 5.0 Phase A3',
    examples: [],
  },
  {
    prefix: 'layer-2-bookbinding:',
    semanticRole:
      'Layer 2 製本 (= canonical doc に裏打ちされた実装制約、DFR / display-rule-registry 等)',
    addedIn: 'aag-friction-reduction 改善 #2 (2026-05-01)',
    examples: [
      'layer-2-bookbinding: DFR — chart semantic color (実績=緑 / 推定=オレンジ) — hex 直書き / theme.palette alias を gate で拒否、chartSemanticColors 経由を強制',
      'layer-2-bookbinding: DFR — chart axis formatter は useAxisFormatter 経由のみ',
      'layer-2-bookbinding: DFR — page identification icon は pageRegistry 経由のみ',
    ],
  },
] as const

/** 列の prefix 文字列のみを抽出した配列 (consumer guard で使用) */
export const GUARD_NOTE_VALID_PREFIXES: readonly string[] = GUARD_NOTE_PREFIXES.map((p) => p.prefix)
