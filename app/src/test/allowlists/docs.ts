/**
 * ドキュメント品質の許可リスト
 *
 * コード品質（architecture, complexity, size 等）とは分離して管理する。
 * 文書中の静的数値（「N ルール」「N テスト」等）のうち、
 * 正当な理由で残すものを例外として登録する。
 *
 * @see docStaticNumberGuard.test.ts
 * @see AR-DOC-STATIC-NUMBER
 */

/**
 * 文書中の静的数値の例外エントリ
 *
 * fileName: 対象ファイルの basename（例: 'CLAUDE.md'）
 * pattern: その行に含まれる文字列パターン（部分一致）
 * reason: なぜ静的数値が正当か
 */
export interface DocStaticNumberException {
  readonly fileName: string
  readonly pattern: string
  readonly reason: string
}

/**
 * 文書中の静的数値の例外リスト
 *
 * 分類:
 * - 原則定義: 設計原則の定義文（C1: 1ファイル=1変更理由）。原則が変わらない限り不変
 * - 構造定義: AAG の構造（4層/5スライス）。構造が変わらない限り不変
 * - 運用区分見出し: 運用区分表のセクション見出し。ルール追加時に文書ごと更新する義務がある
 * - 序数: 第 N 原則のような番号。件数ではなく識別子
 */
export const DOC_STATIC_NUMBER_EXCEPTIONS: readonly DocStaticNumberException[] = [
  // ── CLAUDE.md: 原則定義 ──
  {
    fileName: 'CLAUDE.md',
    pattern: '1ファイル変更',
    reason: '原則定義: タスク規模 Small の定義（1ファイル変更）',
  },
  {
    fileName: 'CLAUDE.md',
    pattern: '1ファイル=1変更理由',
    reason: '原則定義: C1 原則の定義',
  },
  {
    fileName: 'CLAUDE.md',
    pattern: '8カテゴリ',
    reason: '原則定義: 設計原則の安定したカテゴリ数',
  },
  {
    fileName: 'CLAUDE.md',
    pattern: '4原則',
    reason: '原則定義: UI/UX 4原則のセクション見出し',
  },

  // ── adaptive-architecture-governance.md: 構造定義 ──
  {
    fileName: 'adaptive-architecture-governance.md',
    pattern: '4 層',
    reason: '構造定義: AAG の 4 層アーキテクチャ',
  },
  {
    fileName: 'adaptive-architecture-governance.md',
    pattern: '5 スライス',
    reason: '構造定義: AAG の 5 縦スライス',
  },
  {
    fileName: 'adaptive-architecture-governance.md',
    pattern: '第 7 原則',
    reason: '序数: 原則の番号であり件数ではない',
  },
  {
    fileName: 'adaptive-architecture-governance.md',
    pattern: '第 8 原則',
    reason: '序数: 原則の番号であり件数ではない',
  },
  {
    fileName: 'adaptive-architecture-governance.md',
    pattern: '第 9 原則',
    reason: '序数: 原則の番号であり件数ではない',
  },

  // ── aag-operational-classification.md: 運用区分見出し ──
  // これらはセクション見出しに含まれるルール数。
  // ルール追加時に文書自体を更新する obligation がある。
  {
    fileName: 'aag-operational-classification.md',
    pattern: '即修正（31 ルール',
    reason: '運用区分見出し: セクション見出し。ルール追加時に文書更新義務あり',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '構造負債（33 ルール',
    reason: '運用区分見出し: セクション見出し。ルール追加時に文書更新義務あり',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '観測（20 ルール',
    reason: '運用区分見出し: セクション見出し。ルール追加時に文書更新義務あり',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '7 ルール — invariant',
    reason: '運用区分見出し: サブセクション。ルール追加時に文書更新義務あり',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '8 ルール）',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '14 ルール — 主に',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '2 ルール）',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '7 ルール — heuristic',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '20 ルール — heuristic',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '6 ルール — default',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '12 ルール — default',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '4 ルール — default',
    reason: '運用区分見出し: サブセクション',
  },
  {
    fileName: 'aag-operational-classification.md',
    pattern: '4 ルール — heuristic',
    reason: '運用区分見出し: サブセクション',
  },

  // ── architecture-rule-system.md: 原則定義 ──
  {
    fileName: 'architecture-rule-system.md',
    pattern: '1 ルール = 1 つ',
    reason: '原則定義: 「1 ルール = 1 つの害」は設計原則の定義',
  },
] as const
