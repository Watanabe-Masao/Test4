/**
 * アーキテクチャ世代（epoch）管理 — コードの鮮度を構造的に追跡
 *
 * 問題: アーキテクチャが進化しても、触っていないファイルは旧パターンのまま残る。
 * 解決: 各ファイルが「どの世代のルールで書かれたか」を宣言し、
 *       現行世代との差分を検出する。
 *
 * 使い方:
 * 1. 新しいパターン/原則が導入されたら CURRENT_EPOCH を上げる
 * 2. ファイルの JSDoc に @epoch N を記載（そのファイルが準拠する世代）
 * 3. ガードが CURRENT_EPOCH > file epoch のファイルを「要レビュー」として報告
 *
 * @responsibility R:utility
 */

/** 現在のアーキテクチャ世代。新パターン導入時にインクリメントする */
export const CURRENT_EPOCH = 1

/**
 * 世代ごとの変更履歴。
 * 「epoch N で何が変わったか」を記録し、古い epoch のファイルが
 * 「何を知らないか」を判定する。
 */
export const EPOCH_CHANGELOG: readonly {
  readonly epoch: number
  readonly date: string
  readonly changes: readonly string[]
}[] = [
  {
    epoch: 1,
    date: '2026-04-06',
    changes: [
      'C8: 1文説明テスト — @responsibility タグ必須',
      'C9: 現実把握優先 — 嘘の分類より正直な未分類',
      'G8: 責務分離ガード — useMemo+useCallback 合計 ≤12',
      'TAG_EXPECTATIONS: タグと実態の不一致検出',
    ],
  },
  // 次の epoch 追加例:
  // {
  //   epoch: 2,
  //   date: '2026-05-xx',
  //   changes: [
  //     'R:タグ別の閾値連動（タグに応じて useMemo 上限が変わる）',
  //     'Screen Plan v2 — 全チャートが plan hook 経由必須',
  //   ],
  // },
]

/** ファイルから @epoch を読み取る。未記載なら 0（最古） */
export function readEpoch(content: string): number {
  const match = content.match(/@epoch\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

/** 指定 epoch 以降の全変更を取得（ファイルが知らない変更一覧） */
export function getUnknownChanges(fileEpoch: number): readonly string[] {
  return EPOCH_CHANGELOG.filter((e) => e.epoch > fileEpoch).flatMap((e) => e.changes)
}
