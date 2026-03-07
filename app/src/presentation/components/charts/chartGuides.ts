/**
 * チャート解釈ガイド
 *
 * 各チャートの目的・読み方・注目ポイントを定義する。
 * ChartHelpButton と組み合わせてインラインヘルプを表示する。
 */

export interface ChartGuide {
  /** グラフの目的（1行） */
  readonly purpose: string
  /** 読み方ガイド（箇条書き） */
  readonly howToRead: readonly string[]
  /** 注目ポイント */
  readonly keyPoints?: readonly string[]
  /**
   * 関連する MetricId の一覧。
   * ChartGuidePanel が Explanation サービスの L1 要約を引いて表示する。
   * 例: ['salesTotal', 'invMethodGrossProfitRate']
   */
  readonly relatedMetrics?: readonly string[]
}

/**
 * チャートID → ガイドのマッピング。
 * チャートIDはウィジェットIDまたはコンポーネント名を使用。
 */
export const CHART_GUIDES: Readonly<Record<string, ChartGuide>> = {
  // ─── 専門性の高いチャート（優先対応） ───────────────────

  'yoy-waterfall': {
    purpose: '前年比の売上差をシャープリー分解し、各要因の寄与度を表示します',
    howToRead: [
      '棒が上向き → その要因がプラスに寄与',
      '棒が下向き → その要因がマイナスに寄与',
      '全ての棒の合計 = 実際の売上差（前年比）',
    ],
    keyPoints: [
      '合計が売上差と完全一致することがこのグラフの信頼性の証拠です',
      '客数効果と客単価効果のバランスに注目してください',
    ],
    relatedMetrics: ['salesTotal', 'totalCustomers'],
  },

  'performance-index': {
    purpose: '日別売上のZスコア（標準偏差からの乖離度）で異常値を検出します',
    howToRead: [
      'Zスコア = (当日売上 - 平均) ÷ 標準偏差',
      '|Z| ≥ 2 の日は統計的に異常値（全体の約5%）',
      '赤い点線は ±2σ の閾値ライン',
    ],
    keyPoints: [
      '異常値の日はイベント・天候・競合要因を確認してください',
      '連続して閾値を超える場合はトレンド変化の可能性があります',
    ],
  },

  'sensitivity-dashboard': {
    purpose: '各指標が1%変動した場合の粗利への影響度を比較します',
    howToRead: [
      '棒の長さ = その指標が1%変動した時の粗利変動額',
      '上位の指標ほど経営インパクトが大きい',
      '正負で改善方向と悪化方向を区別',
    ],
    keyPoints: ['最も感度の高い指標を優先的に管理することで効率的な改善が可能です'],
    relatedMetrics: ['invMethodGrossProfitRate', 'discountRate', 'averageMarkupRate'],
  },

  'causal-chain': {
    purpose: '売上→原価→粗利の因果連鎖を可視化し、利益構造の全体像を把握します',
    howToRead: [
      '左から右へ: 売上 → 原価要素 → 粗利の流れ',
      '各ノードの色: 前年比プラス/マイナスを表示',
      'ノードをクリックすると詳細な内訳に遷移',
    ],
    keyPoints: ['売変ロスと原価算入費が粗利に与える影響に注目してください'],
  },

  'regression-insight': {
    purpose: '売上と各要因（客数・気温・曜日等）の相関を回帰分析で可視化します',
    howToRead: [
      '散布図の傾き = 相関の強さと方向',
      'R² 値 = 説明力（1に近いほど強い相関）',
      '回帰線から大きく外れた点は外れ値',
    ],
    keyPoints: [
      'R² が 0.5 以上なら実用的な相関とみなせます',
      '相関は因果ではないことに注意してください',
    ],
  },

  'seasonal-benchmark': {
    purpose: '過去月のデータと比較し、当月の売上が季節パターンに沿っているか検証します',
    howToRead: [
      '灰色バンド = 過去月の範囲（上限〜下限）',
      '実線 = 当月の実績',
      'バンドの外に出た日は季節パターンからの逸脱',
    ],
    keyPoints: ['季節パターンを大きく下回る日は要因調査の対象です'],
  },

  'structural-overview': {
    purpose: '売上→仕入→粗利の構造を俯瞰し、収益構造の全体バランスを把握します',
    howToRead: [
      '左列: 売上構成（コア売上、花、産直、売上納品）',
      '中央: 仕入・原価構造',
      '右列: 粗利（在庫法・推定法）',
      '前年比バッジで各項目の変動を確認',
    ],
    keyPoints: ['在庫法の粗利率が推定法と大きく乖離する場合、在庫異常の可能性があります'],
    relatedMetrics: [
      'salesTotal',
      'purchaseCost',
      'invMethodGrossProfit',
      'invMethodGrossProfitRate',
    ],
  },

  'estimated-inventory-detail': {
    purpose: '推定在庫の日次推移を表示し、在庫異常の早期発見を支援します',
    howToRead: [
      '折れ線 = 推定在庫残高の日次推移',
      '急激な変動は仕入タイミングや棚卸ロスの影響',
      '前年同月と比較して異常な推移を検出',
    ],
    keyPoints: [
      'この指標は推定値です。在庫法の実績値がある場合はそちらを優先してください',
      '推定在庫が急減する日は棚卸ロスや売変の影響を確認してください',
    ],
    relatedMetrics: ['estMethodClosingInventory', 'estMethodMarginRate'],
  },

  // ─── 基本チャート ──────────────────────────────────────

  'daily-sales': {
    purpose: '日別の売上推移を表示し、日次トレンドと前年比を把握します',
    howToRead: [
      '実線 = 当月の日別売上',
      '破線 = 前年同月の日別売上（あれば）',
      '棒グラフ = 日別の売上額',
    ],
    relatedMetrics: ['salesTotal'],
  },

  'budget-vs-actual': {
    purpose: '予算と実績の累計推移を比較し、予算達成の進捗を把握します',
    howToRead: [
      '実線 = 売上累計（実績）',
      '破線 = 予算累計',
      '面積 = 乖離幅（プラスなら予算超過、マイナスなら未達）',
    ],
    relatedMetrics: ['salesTotal', 'budget', 'budgetAchievementRate'],
  },

  'category-pie': {
    purpose: 'カテゴリ別の売上構成比を表示します',
    howToRead: ['各セグメント = カテゴリの売上シェア', 'ホバーで詳細金額を表示'],
  },

  'gross-profit-rate': {
    purpose: '日別の粗利率推移を表示し、収益性のトレンドを把握します',
    howToRead: [
      '折れ線 = 日別の粗利率（在庫法 or 推定法）',
      '赤線 = 目標粗利率',
      '目標を下回る日は原因調査の対象',
    ],
    relatedMetrics: ['invMethodGrossProfitRate'],
  },

  'sales-purchase-comparison': {
    purpose: '売上と仕入のバランスを日別に比較します',
    howToRead: [
      '棒グラフ = 日別の売上額と仕入額',
      '売上に対して仕入が過大な日は在庫積み増し',
      '折れ線 = 売買比率（仕入÷売上）',
    ],
  },

  'discount-trend': {
    purpose: '日別の売変額・売変率の推移を表示します',
    howToRead: [
      '棒 = 日別の売変額',
      '折れ線 = 売変率（売変額÷粗売上）',
      '売変率の急上昇は値引き増加のシグナル',
    ],
    relatedMetrics: ['discountTotal', 'discountRate'],
  },

  'customer-trend': {
    purpose: '日別の来店客数推移を表示します',
    howToRead: ['棒 = 日別の来店客数', '曜日パターンに注目（週末が多い傾向）'],
  },

  'time-slot-sales': {
    purpose: '時間帯別の売上分布を表示します',
    howToRead: ['棒の高さ = その時間帯の売上額', 'ピーク時間帯の把握と人員配置の参考に'],
  },

  'time-slot-heatmap': {
    purpose: '曜日×時間帯の売上をヒートマップで表示します',
    howToRead: ['色の濃さ = 売上の大きさ', '行 = 曜日、列 = 時間帯', '最も濃いセルが売上のピーク'],
  },

  'heatmap-hour-dow': {
    purpose: '時間帯×曜日の売上日平均をヒートマップで可視化し、営業パターンを把握します',
    howToRead: [
      '行 = 時間帯（6〜22時）、列 = 曜日（月〜日）',
      'セルの色が濃いほど売上が大きい',
      '赤枠 = 統計的異常値（Z-score > 2.0の時間帯）',
      '各曜日の日平均は「実際のその曜日の営業日数」で割って算出',
    ],
    keyPoints: [
      '特定曜日の特定時間帯に集中がある場合、人員配置の最適化に活用できます',
      '前年比増減モードでは、どの時間帯・曜日が改善/悪化したかを把握できます',
      '日平均は営業日数ベースなので、祝日がある週でも正確に比較できます',
    ],
  },

  'category-hierarchy-explorer': {
    purpose:
      'カテゴリ階層（部門→ライン→クラス）をドリルダウンし、売上構成と時間帯パターンを分析します',
    howToRead: [
      'パンくずリストでカテゴリ階層を上下にナビゲーション',
      'トレーマップ = カテゴリごとの売上構成比（面積比例）',
      '構成比 = そのカテゴリの売上 ÷ 表示階層の合計売上',
      'PI値 = そのカテゴリの売上 ÷ 全店客数 × 1000（千人あたり売上）',
      'ピーク = 売上が最大となる時間帯、コア = 売上の上位80%を占める時間帯',
      '折返 = 売上累計が50%に達する時間帯（午後の売上減速ポイント）',
    ],
    keyPoints: [
      '構成比の大きいカテゴリの前年比に注目 — 構成比が大きい分だけ全体への影響が大きい',
      'ピーク時間のシフト（前年比±2時間以上）は⚠️アイコンで警告されます',
      '時間帯パターンのスパークラインで、カテゴリごとの売れ方の違いを一目で把握',
    ],
  },

  'customer-scatter': {
    purpose: '日別の客数と客単価の関係を散布図で可視化し、売上構造を分析します',
    howToRead: [
      'X軸 = 客数、Y軸 = 客単価（1人あたりの購入金額）',
      'バブルの大きさ = その日の売上額（客数×客単価）',
      'バブルの色 = 曜日（日〜土で色分け）',
      '点線の十字 = 平均客数・平均客単価の交差ライン',
      '右上（高客数+高単価）= 好調日、左下（低客数+低単価）= 不調日',
    ],
    keyPoints: [
      '曜日ごとの色パターンで、特定曜日が特定象限に偏っていないか確認',
      '「前年比変化率」ビューでは、前年からの改善・悪化方向を把握できます',
      '右上象限（客数↑単価↑）が多い曜日は好調パターンです',
    ],
    relatedMetrics: ['totalCustomers', 'salesTotal'],
  },
}
