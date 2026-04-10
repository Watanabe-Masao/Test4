/**
 * ガードタグレジストリ — 設計原則タグの正式定義（一元管理）
 *
 * 新しいタグを追加する場合はここに登録する。
 * CI テストがこのレジストリとコード内のタグの整合性を検証する。
 *
 * examples には「何が壊れるか」「なぜこの制約が必要か」を具体的に記載する。
 * コード内のガードタグからここを参照することで文脈が辿れる。
 */

/** タグ定義の型。name（短い名前）+ examples（壊れるパターンの具体例） */
export interface GuardTagDef {
  readonly name: string
  readonly examples: readonly string[]
}

export const GUARD_TAG_REGISTRY: Record<string, GuardTagDef> = {
  // ═══ A: 層境界 ═══
  A1: {
    name: '4層依存ルール',
    examples: [
      'presentation/ → infrastructure/ の直接 import でデータ取得ロジックが分散',
      'domain/ → application/ の依存でドメインの純粋性が崩壊',
    ],
  },
  A2: {
    name: 'Domain は純粋',
    examples: [
      'domain/ に fetch/localStorage を持ち込むとテストにモックが必要になる',
      'domain/calculations/ に async を導入すると不変条件テストが実行困難になる',
    ],
  },
  A3: {
    name: 'Presentation は描画専用',
    examples: [
      'UI に直接 fetch を書くと God Component 化する（717行 MetricBreakdownPanel 事件）',
      'presentation/ から外部 API を直接呼ぶとデータ取得ロジックが分散する',
    ],
  },
  A4: {
    name: '取得対象の契約は Domain で定義',
    examples: ['application/ で型定義すると presentation/ が usecases/ を直接参照する必要が生じる'],
  },
  A5: {
    name: 'DI はコンポジションルート',
    examples: ['具体実装を知るのは App.tsx のみ。コンポーネントが infrastructure を直接参照しない'],
  },
  A6: {
    name: 'load 処理は3段階分離',
    examples: [
      '1関数で load + merge + setStore + cache clear + UI更新すると責務が密結合',
      'データ取得関数の中で store 更新すると副作用のテストが困難',
    ],
  },
  // ═══ B: 実行エンジン境界 ═══
  B1: {
    name: 'Authoritative 計算は domain/calculations のみ',
    examples: [
      'hooks/stores/usecases に純粋計算を実装すると正式値の定義元が分散',
      'TypeScript 制御層に authoritative ロジックを置くと責務境界が崩壊',
    ],
  },
  B2: {
    name: 'JS/SQL 二重実装禁止',
    examples: ['同じ集約ロジックを JS と DuckDB SQL の両方に実装すると不整合が生じる'],
  },
  B3: {
    name: '率は domain/calculations で算出',
    examples: [
      '率をパイプラインで持ち回すと加重平均が崩壊する',
      'SQL/VM で率を直接計算すると全店合計・経過日集約が不正確になる',
    ],
  },
  // ═══ C: 純粋性と責務分離 ═══
  C1: {
    name: '1ファイル = 1変更理由',
    examples: ['300行超のファイルは変更頻度の異なる責務が混在している兆候'],
  },
  C2: {
    name: 'pure function は1仕様軸に閉じる',
    examples: ['集計+補完+マッピング+上限制御を1関数に混在させるとテスト不能'],
  },
  C3: {
    name: 'store は state 反映のみ',
    examples: [
      'store action に算術式を埋め込むと業務ロジックが分散する',
      '派生値導出・不変条件判定は store の外に出す',
    ],
  },
  C4: {
    name: '描画は純粋',
    examples: ['memo + hook で描画と計算を分離しないとレンダリング最適化が不能'],
  },
  C5: {
    name: '最小セレクタ',
    examples: ['store 全体を購読すると無関係な state 変更で不要な再レンダリングが発生'],
  },
  C6: {
    name: 'facade は orchestration のみ',
    examples: [
      'facade に判断・分岐・派生計算を増やすと分岐 >5 で複雑化',
      'facade が業務判断の本体になると責務沈殿が発生',
    ],
  },
  C7: {
    name: '同義 API/action の併存禁止',
    examples: ['名前が違うが中身が同じ action が増えると保守コストが倍増'],
  },
  C8: {
    name: '1 文説明テスト',
    examples: [
      '責務を「〜を担う」の 1 文で説明できなければ分離候補',
      '説明に AND が入ったら複数責務が混在している',
      '行数ではなく変更理由の数で判定する',
    ],
  },
  C9: {
    name: '現実把握優先',
    examples: [
      '自動推定で全ファイルにタグを振ると嘘の単一責務が生まれる',
      '正確に分類できないものは未分類のまま残す',
      '形式的チェックより実効性のある機械的検出を優先する',
    ],
  },
  // ═══ D: 数学的不変条件 ═══
  D1: {
    name: '要因分解の合計は売上差に完全一致',
    examples: ['ウォーターフォールチャートが合計に到達しない → ユーザーの信頼喪失'],
  },
  D2: {
    name: '引数を無視して再計算しない',
    examples: [
      '別ソースから再計算するとシャープリー恒等式が崩壊（カテゴリ合計 ≠ 売上合計）',
      'prevSales/curSales を _ リネームして無視した事件',
    ],
  },
  D3: {
    name: '不変条件はテストで守る',
    examples: ['実装ではなく制約をテストする。実装の変更に強い'],
  },
  // ═══ E: 型安全と欠損処理 ═══
  E1: {
    name: '境界で検証',
    examples: ['検証していない文字列が SQL クエリに渡るとインジェクションリスク'],
  },
  E2: {
    name: '依存配列は省略しない',
    examples: ['ファイルインポート後にチャートが更新されないステールデータバグ'],
  },
  E3: {
    name: 'sourceDate を落とさない',
    examples: ['月跨ぎ時の出典追跡不能（buildPrevSameDowMap 事件）', '前年比が0表示になるバグ'],
  },
  E4: {
    name: '欠損判定は == null',
    examples: ['WMO天気コード 0（晴天）が欠損扱いされて天気表示が消える'],
  },
  // ═══ F: コード構造規約 ═══
  F1: {
    name: 'バレルで後方互換',
    examples: ['ファイル移動で外部 import が壊れると全消費者の修正が必要'],
  },
  F2: {
    name: '文字列はカタログ',
    examples: ['ハードコード文字列が散在すると i18n 移行が困難'],
  },
  F3: {
    name: '全パターンに例外なし',
    examples: ['チャート・Hook・Handler 構造が規模で変わると AI 開発で判断が必要になる'],
  },
  F4: {
    name: '配置はパスで決まる',
    examples: ['ファイルの配置先が曖昧だとレビューのたびに議論が発生'],
  },
  F5: {
    name: '横断的関心事は Contract で管理',
    examples: ['比較モード追加時の変更箇所が5ファイル以上に散在する'],
  },
  F6: {
    name: 'チャート間データは文脈継承',
    examples: ['子が比較文脈を再計算すると親との不整合が発生'],
  },
  F7: {
    name: 'View は ViewModel のみ受け取る',
    examples: ['weatherCode・DateRange・DuckDB 接続を View に渡すと描画以外の責務が混入'],
  },
  F8: {
    name: '独立互換で正本を汚さない',
    examples: ['暫定互換の独立ウィジェットのために正本の Props を曲げるとリファクタリング不能'],
  },
  F9: {
    name: 'Raw データは唯一の真実源',
    examples: ['DuckDB → IndexedDB の書き戻しでデータ破損時に復元不能'],
  },
  // ═══ G: 機械的防御 ═══
  G1: {
    name: 'ルールはテストに書く',
    examples: ['文書に書いただけのルールは守られない。違反したらテストが落ちる'],
  },
  G2: {
    name: 'エラーは伝播',
    examples: ['catch して握り潰すとサイレント失敗が最悪の失敗モードになる'],
  },
  G3: {
    name: 'コンパイラ警告を黙らせない',
    examples: ['_ リネームでバグがコンパイラの警告ごと隠蔽される（decompose5 事件）'],
  },
  G4: {
    name: 'テスト用 export 禁止',
    examples: [
      '@internal export は公開面を不正に拡張する',
      'カバレッジ回復のための実装変更は本末転倒',
    ],
  },
  G5: {
    name: 'サイズ上限',
    examples: [
      'hook が 300行を超えたら *Logic.ts に純粋関数を分離',
      'useMemo ≤7、useState ≤6 を超えると責務過多の兆候',
    ],
  },
  G6: {
    name: 'コンポーネントサイズ上限',
    examples: ['Presentation .tsx が 600行を超えたら ViewModel 分離を検討'],
  },
  G7: {
    name: 'キャッシュは本体より複雑にしない',
    examples: ['キャッシュ処理が本体より複雑になると保守コストが逆転する'],
  },
  G8: {
    name: '責務分離（AND テスト）',
    examples: [
      'P2: presentation で getState() を直接呼ぶと Store 構造に依存する',
      'P7: module-scope let はテスト困難なグローバル状態を生む',
      'P8: useMemo+useCallback 合計 ≤12 を超えると責務が AND で繋がっている',
      'P10: features/ にも useMemo ≤7、useState ≤6 を適用して全層カバレッジを確保',
      'P12: domain/models に export 8+ あると型と utility が同居している',
      'P17: storeIds 正規化パターンのコピペが増えると変更時に N 箇所修正が必要',
      'P18: fallback 定数が 7+ 個あると初期値戦略が分散している',
    ],
  },

  // ═══ Q: Query Access Architecture ═══
  Q3: {
    name: 'Chart は DuckDB hook / QueryExecutor / useAsyncQuery を直接 import しない',
    examples: [
      'Chart が useDuckDBXxx を直接 import すると query orchestration が Presentation に漏れる',
      'executor.execute() を Chart で直接呼ぶと QueryHandler の型安全が迂回される',
    ],
  },
  Q4: {
    name: 'alignment-aware access は handler/resolver に閉じる',
    examples: [
      'prevYear.daily.get() を Chart が直接呼ぶと alignment semantics の理解が消費側に要求される',
      'toDateKeyFromParts で前年の日付を渡すと Map キー（当期の日付）と不一致になる',
    ],
  },
  // ═══ F10: ページ正本 ═══
  F10: {
    name: 'ページ正本の整合性',
    examples: [
      'PAGE_REGISTRY と routes.tsx の PAGE_COMPONENT_MAP が不一致だとルートが欠落する',
      'navVisible と mobileNavVisible の subset 関係が崩れるとモバイル専用ページが出現する',
      'ViewType と PAGE_REGISTRY の standard ids が不一致だと型安全が崩壊する',
    ],
  },
  // ═══ H: Screen Runtime ═══
  H1: {
    name: 'Screen Plan 経由のみ',
    examples: [
      'ad-hoc 最適化が散在し取得責務が分散する',
      'Screen Plan を経由しない個別最適化が hidden fetch を生む',
    ],
  },
  H2: {
    name: '比較は pair/bundle 契約',
    examples: [
      'isPrevYear フラグの単発取得で current/prev の片側だけ失敗し比較意味論が壊れる',
      'pair 化されていない handler で comparison の loading/error が独立管理になる',
    ],
  },
  H3: {
    name: 'query input 正規化必須',
    examples: [
      'storeIds の順序違いで同じ query が別物扱いされ cache miss が発生する',
      'undefined と空配列の差異で不要な再実行が起きる',
    ],
  },
  H4: {
    name: 'component に acquisition logic 禁止',
    examples: [
      '子チャートの mount 順が取得順を決め waterfall が発生する',
      'chart component 内で PI 計算すると render のたびに再計算が走る',
    ],
  },
  H5: {
    name: 'visible-only は plan 宣言',
    examples: [
      'collapsible ChartCard 内で無条件に query が発火し帯域を浪費する',
      'visible-only query が required query を隠蔽し必須データが欠落する',
    ],
  },
  H6: {
    name: 'ChartCard は通知のみ',
    examples: [
      'UI コンポーネントに取得制御が混入し責務が肥大化する',
      'ChartCard が query enable を直接制御すると取得判断が UI 層に漏れる',
    ],
  },
  // ═══ I: 意味分類 ═══
  I1: {
    name: 'authoritative 単独使用禁止',
    examples: [
      'AI が business-authoritative と analytic-authoritative を区別できず誤実装する',
      '単独 authoritative のまま新規コードが追加され意味空間が混線する',
    ],
  },
  I2: {
    name: '意味責任で棚を分ける（business vs analytic）',
    examples: [
      'pure だからという理由で business と analytic を同じ棚に置き誤読を招く',
      'Rust にあるからという理由で意味分類を省略し管理が崩壊する',
    ],
  },
  I3: {
    name: 'current と candidate を混ぜない',
    examples: [
      'candidate を current view に載せ安定運用資産と実験資産の区別が消える',
      'current に candidate 状態遷移を追加し保守対象の安定性が損なわれる',
    ],
  },
  I4: {
    name: '正本は calculationCanonRegistry の1つだけ',
    examples: [
      'derived view を手編集し master と不一致が発生する',
      '別の registry を作り二重管理で AI がどちらを信じるべきか迷う',
    ],
  },
} as const
