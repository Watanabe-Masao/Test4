/**
 * Architecture Rule — 実行可能なアーキテクチャ仕様
 *
 * 各ルールが「禁止」「あるべき姿」「なぜ」「修正手順」「判断基準」「因果関係」を
 * セットで定義する。AI が検出 → 判断 → 修正 → 蓄積のサイクルを
 * 1 箇所で完結できるようにする。
 *
 * **ルールは書かれるのではなく、育つ。**
 * 毎セッションの修正・判断がルールに蓄積され、次のセッションがより賢くなる。
 *
 * ルールはデータ層。検出ロジックはテストファイルに残す。
 *
 * @responsibility R:utility
 */

// ─── 型定義 ─────────────────────────────────────────────

/** 検出方法の種別 */
export type DetectionType =
  | 'import' // 禁止 import の検出
  | 'regex' // コードパターンの検出
  | 'count' // 数値上限（行数、hook 数等）
  | 'must-include' // A を含む必須（Zod parse 必須等）
  | 'must-only' // A 以外禁止（barrel は re-export のみ等）
  | 'co-change' // A を変えたら B も変える（型 → schema 等）
  | 'must-not-coexist' // A と B は同居禁止（useState と SQL 等）
  | 'custom' // 上記に当てはまらない特殊検出

/** ルールの成熟度。新しいルールは experimental から始め、安定したら stable に昇格する */
export type RuleMaturity = 'experimental' | 'stable' | 'deprecated'

/**
 * AAG 縦スライス — 関心ごとの完結したルール群
 * 各スライスが Domain/Application/Infrastructure/Presentation の 4 層を持つ
 */
export type AagSlice =
  | 'layer-boundary' // 層境界、依存方向、描画専用原則
  | 'canonicalization' // 正本経路、readModel、Zod、path guard
  | 'query-runtime' // QueryHandler、AnalysisFrame、ComparisonScope
  | 'responsibility-separation' // size / hook complexity / responsibility tags
  | 'governance-ops' // allowlist、health、obligation、generated docs

/** slice ごとの短い誘導文 — 違反時に「向かう先」を 1 行で示す */
export const SLICE_GUIDANCE: Readonly<Record<AagSlice, string>> = {
  'layer-boundary': 'hook / adapter / interface 経由に変更する',
  canonicalization: 'readModel / 正本関数 / path guard 経由に変更する',
  'query-runtime': 'QueryHandler / AnalysisFrame 経由に変更する',
  'responsibility-separation': '責務分離（分割 or active-debt）で対応する',
  'governance-ops': 'docs:generate / rule review で対応する',
}

/**
 * 設計原則 ID — CLAUDE.md §設計原則 の A1〜H6 + Q3〜Q4
 * ルールがどの思想から生まれたかを辿るトレーサビリティ
 */
export type PrincipleId =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4'
  | 'C5'
  | 'C6'
  | 'C7'
  | 'C8'
  | 'C9'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'E1'
  | 'E2'
  | 'E3'
  | 'E4'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'G1'
  | 'G2'
  | 'G3'
  | 'G4'
  | 'G5'
  | 'G6'
  | 'G7'
  | 'G8'
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'Q3'
  | 'Q4'
  | 'I1'
  | 'I2'
  | 'I3'
  | 'I4'

export interface ArchitectureRule {
  // ── 識別 ──
  readonly id: string
  /** どの設計原則から生まれたか（トレーサビリティ） */
  readonly principleRefs?: readonly PrincipleId[]
  readonly guardTags: readonly string[]
  readonly responsibilityTags?: readonly string[]
  readonly epoch?: number
  /** ルールの成熟度。未指定は stable 扱い */
  readonly maturity?: RuleMaturity

  // ── 定義 ──
  readonly what: string
  readonly why: string
  readonly doc?: string

  // ── あるべき姿 ──
  readonly correctPattern: {
    readonly description: string
    readonly example?: string
    readonly imports?: readonly string[]
  }

  // ── 禁止/旧パターン ──
  readonly outdatedPattern: {
    readonly description: string
    readonly imports?: readonly string[]
    readonly codeSignals?: readonly string[]
  }

  // ── 閾値（タグ連動） ──
  readonly thresholds?: {
    readonly [key: string]: number | undefined
  }

  // ── 検出 ──
  readonly detection: {
    readonly type: DetectionType
    /**
     * gate: CI fail + マージ block（即修正必須）
     * block-merge: CI warn（集計）+ マージ block（入口で止める。移行途中の検知用）
     * warn: CI warn + マージ allow（注意喚起のみ）
     */
    readonly severity: 'gate' | 'warn' | 'block-merge'
    readonly baseline?: number
  }

  // ── 修正手順（自動改善用） ──
  readonly migrationPath?: {
    readonly steps: readonly string[]
    readonly effort: 'trivial' | 'small' | 'medium'
    readonly priority: number // 低い = 先にやる
  }

  // ── 判断基準（脱属人化） ──
  readonly decisionCriteria?: {
    readonly when: string // いつこのルールが適用されるか
    readonly exceptions: string // 例外が許容される条件
    readonly escalation: string // 判断に迷ったときの行動
  }

  // ── ルール間の因果関係 ──
  readonly relationships?: {
    readonly dependsOn?: readonly string[] // 前提ルール
    readonly enables?: readonly string[] // 守ると有効になるルール
    readonly conflicts?: readonly string[] // 同時適用不可
  }

  // ── ルール統治（壊れ方の制御） ──
  /** ルールの性質。invariant=絶対、default=原則+例外、heuristic=観測 */
  readonly ruleClass?: 'invariant' | 'default' | 'heuristic'
  /** ルールの確信度。low + gate の組み合わせは禁止 */
  readonly confidence?: 'high' | 'medium' | 'low'
  /** いつこのルールが不要になるか（反証可能性） */
  readonly sunsetCondition?: string
  /** このルールが防いでいる害（efficacy 評価の根拠） */
  readonly protectedHarm?: {
    readonly prevents: readonly string[]
  }
  /** ルールの再点検ポリシー（時間軸の導入） */
  readonly reviewPolicy?: {
    readonly owner: string // 'solo-maintainer' | 'ai-system'
    readonly lastReviewedAt: string // YYYY-MM-DD
    readonly reviewCadenceDays: number // 再点検間隔（日数）
  }
  // ── AAG 4層（Response / Judgment） ──
  /** ルールが属する関心スライス */
  readonly slice?: AagSlice
  /** 違反時の運用区分: now=今すぐ直す / debt=構造負債管理 / review=観測 */
  readonly fixNow?: 'now' | 'debt' | 'review'

  /** experimental ルールの出口（昇格 / 撤回の対称性） */
  readonly lifecyclePolicy?: {
    readonly introducedAt: string // 導入日（YYYY-MM-DD）
    readonly observeForDays: number // 観測期間（日数）
    readonly promoteIf: readonly string[] // gate 化する条件
    readonly withdrawIf: readonly string[] // 撤回する条件
  }
}

// ─── ルール定義 ──────────────────────────────────────────

export const ARCHITECTURE_RULES: readonly ArchitectureRule[] = [
  // ── noNewDebtGuard 由来 ──

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-001',
    principleRefs: ['G1'],
    ruleClass: 'invariant',
    guardTags: ['G1'],
    epoch: 1,
    what: 'bridge ファイルに dual-run compare コードの再導入を禁止する',
    why: 'Phase 1-2 で解消した dual-run 比較は退役済み。復活させると実行モード分岐が再び散在する',
    doc: 'references/03-guides/safety-first-architecture-plan.md',
    correctPattern: {
      description:
        'ExecutionMode は ts-only | wasm-only の 2 モードのみ。bridge は直接 engine を呼ぶ',
    },
    outdatedPattern: {
      description: 'bridge 内で getExecutionMode / recordCall / recordMismatch を使用する',
      codeSignals: ['getExecutionMode', 'recordCall', 'recordMismatch', 'dual-run-compare'],
    },
    decisionCriteria: {
      when: 'bridge ファイルを変更するとき',
      exceptions: '例外なし。dual-run は退役済み',
      escalation: '該当コードを発見したら即削除',
    },
    detection: {
      type: 'regex',
      severity: 'gate',
      baseline: 0,
    },
    migrationPath: {
      steps: [
        '1. getExecutionMode / recordCall / recordMismatch の import を削除',
        '2. bridge から直接 wasmEngine または TS fallback を呼ぶように変更',
        '3. dual-run-compare 文字列リテラルがあれば ts-only | wasm-only に置換',
      ],
      effort: 'small',
      priority: 1,
    },
    sunsetCondition: 'bridge パターンが存在しなくなった',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-002',
    principleRefs: ['A1', 'B1'],
    ruleClass: 'invariant',
    guardTags: ['G1', 'A3'],
    epoch: 1,
    what: 'presentation 層が wasmEngine を直接 import することを禁止する',
    why: 'presentation は描画専用。engine の詳細は application 層が隠蔽する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'application/hooks 経由で計算結果を受け取る',
    },
    outdatedPattern: {
      description: 'presentation/ から wasmEngine を import する',
      imports: ['wasmEngine'],
    },
    decisionCriteria: {
      when: 'presentation/ で計算結果が必要なとき',
      exceptions: '例外なし',
      escalation: 'application/hooks/ の hook 経由に変更',
    },
    detection: {
      type: 'import',
      severity: 'gate',
      baseline: 0,
    },
    migrationPath: {
      steps: [
        '1. wasmEngine の import を削除',
        '2. application/hooks/ の対応する hook を探す（例: useCalculation）',
        '3. hook 経由で計算結果を受け取るように変更',
      ],
      effort: 'small',
      priority: 1,
    },
    sunsetCondition: 'presentation → wasmEngine の経路が構造的に存在しなくなった',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'debt',
    slice: 'governance-ops',
    id: 'AR-003',
    principleRefs: ['C1', 'A5'],
    ruleClass: 'default',
    guardTags: ['G1', 'C1'],
    epoch: 1,
    doc: 'references/03-guides/widget-coordination-architecture.md',
    what: 'UnifiedWidgetContext のフィールド数を凍結し shared hub の肥大化を防ぐ',
    why: '共有コンテキストが肥大化すると全ウィジェットの結合度が上がり変更コストが増大する',
    correctPattern: {
      description: '新規フィールドは feature slice のローカルコンテキストに寄せる',
    },
    outdatedPattern: {
      description: 'UnifiedWidgetContext に readonly フィールドを追加する',
    },
    thresholds: { fieldMax: 47 },
    decisionCriteria: {
      when: 'UnifiedWidgetContext にフィールドを追加したいとき',
      exceptions: '全ウィジェット共通のフィールドのみ許容',
      escalation: 'feature slice のローカル context に配置',
    },
    detection: {
      type: 'count',
      severity: 'gate',
      baseline: 47,
    },
    migrationPath: {
      steps: [
        '1. 追加しようとしているフィールドが本当に全ウィジェット共通か確認',
        '2. 特定の feature でのみ使うなら features/<feature>/ のローカル context に移動',
        '3. 共通なら既存フィールドの統合（類似フィールドのマージ）を検討',
      ],
      effort: 'medium',
      priority: 3,
    },
    sunsetCondition: 'UnifiedWidgetContext が feature slice に完全分割された',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-004',
    principleRefs: ['G1'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: '@deprecated wrapper の新規追加を禁止する',
    why: 'deprecated wrapper が増えると間接層が膨張し削除可能性の追跡が困難になる',
    correctPattern: {
      description: '新しい wrapper を作らず、呼び出し元を直接新 API に移行する',
    },
    outdatedPattern: {
      description: 'application/services/ や domain/ に @deprecated を追加する',
      codeSignals: ['@deprecated'],
    },
    decisionCriteria: {
      when: '互換性のために wrapper を作りたいとき',
      exceptions: '例外なし。呼び出し元を直接新 API に移行する',
      escalation: '既存 @deprecated の呼び出し元移行を優先',
    },
    detection: {
      type: 'count',
      severity: 'gate',
      baseline: 7,
    },
    migrationPath: {
      steps: [
        '1. 新しい wrapper を作る代わりに、呼び出し元を直接新 API に移行',
        '2. 既存の @deprecated は呼び出し元の移行が完了次第削除',
        '3. 移行完了したら baseline を減らす',
      ],
      effort: 'small',
      priority: 2,
    },
    sunsetCondition: 'deprecated が全て削除された',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'debt',
    slice: 'governance-ops',
    id: 'AR-005',
    principleRefs: ['H1'],
    ruleClass: 'default',
    guardTags: ['G1', 'H1'],
    epoch: 1,
    doc: 'references/01-principles/modular-monolith-evolution.md',
    what: 'application/hooks/plans/ の shared plan hook 数を凍結する',
    why: 'category/time-slot 等は features/ に移行済み。共有 plan hook の増加は feature slice 原則に反する',
    correctPattern: {
      description: '新規 plan は features/<feature>/application/plans/ に作成する',
    },
    outdatedPattern: {
      description: 'application/hooks/plans/ に新規 *Plan.ts を追加する',
    },
    decisionCriteria: {
      when: '新しい plan hook を作りたいとき',
      exceptions: 'cross-cutting（全ページ共通）の plan のみ shared に配置可能',
      escalation: 'features/<feature>/application/plans/ に配置',
    },
    detection: {
      type: 'count',
      severity: 'gate',
      baseline: 13,
    },
    migrationPath: {
      steps: [
        '1. 新規 plan が特定 feature に属するか確認',
        '2. features/<feature>/application/plans/ に配置',
        '3. shared な plan が本当に cross-cutting か再確認',
      ],
      effort: 'trivial',
      priority: 1,
    },
    sunsetCondition: 'shared plan が全て features/ に移行された',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },
  // ── layerBoundaryGuard 由来 ──

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-DOMAIN',
    principleRefs: ['A1', 'A2'],
    ruleClass: 'invariant',
    guardTags: ['A1', 'A2'],
    epoch: 1,
    what: 'domain/ は外部層に依存しない（純粋なビジネスロジック）',
    why: 'domain/ がフレームワークやインフラに依存すると、テスト容易性と移植性が失われる',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description:
        'domain/ は domain/ 内のみ import する。外部データが必要なら契約（interface）を domain/ に定義する',
    },
    outdatedPattern: {
      description: 'domain/ から application/ / infrastructure/ / presentation/ を import する',
      imports: ['@/application/', '@/infrastructure/', '@/presentation/'],
    },
    relationships: {
      enables: [
        'AR-STRUCT-PURITY',
        'AR-TAG-CALCULATION',
        'AR-TAG-UTILITY',
        'AR-TAG-REDUCER',
        'AR-TAG-TRANSFORM',
      ],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    decisionCriteria: {
      when: 'domain/ のファイルが外部層のモジュールを必要としたとき',
      exceptions: '例外なし。domain/ は純粋でなければならない',
      escalation:
        '外部データが必要なら domain/ に interface を定義し、application/ で実装を注入する',
    },
    migrationPath: {
      steps: [
        '1. 外部層への import を特定',
        '2. 必要なデータがあれば domain/ に interface（契約）を定義',
        '3. 実装は infrastructure/ に置き、application/ が DI で注入',
      ],
      effort: 'medium',
      priority: 1,
    },
    protectedHarm: {
      prevents: [
        'domain が外部層に依存し純粋性が崩壊',
        'テストにモックが必要になる',
        '計算結果の信頼性低下',
      ],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-APP-INFRA',
    principleRefs: ['A1'],
    ruleClass: 'invariant',
    guardTags: ['A1'],
    epoch: 1,
    what: 'application/ は infrastructure/ に直接依存しない',
    why: 'application 層はドメインロジックの調停を行う。インフラ詳細は adapter パターンで隠蔽する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description:
        'adapter パターンまたは allowlists/architecture.ts に正当理由を記載する。DuckDB hooks / QueryHandler / runtime-adapters は構造的に許容',
    },
    decisionCriteria: {
      when: 'application/ から infrastructure/ を import しようとしたとき',
      exceptions:
        'hooks/duckdb/ / queries/ / runtime-adapters/ は構造的に許容。それ以外は allowlist に正当理由が必要',
      escalation: 'architecture ロールに相談。adapter パターンへの移行を検討',
    },
    outdatedPattern: {
      description: 'application/ から infrastructure/ を直接 import する（許可された経路以外）',
      imports: ['@/infrastructure/'],
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. infrastructure/ への import が DuckDB hooks / QueryHandler / runtime-adapters 経由か確認',
        '2. 上記以外なら allowlists/architecture.ts に追加するか adapter パターンに移行',
        '3. adapter パターン: domain/ に interface を定義 → infrastructure/ で実装 → application/ が DI',
      ],
      effort: 'medium',
      priority: 2,
    },
    protectedHarm: {
      prevents: ['application と infrastructure の密結合', 'インフラ変更時の影響範囲拡大'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-APP-PRES',
    principleRefs: ['A1'],
    ruleClass: 'invariant',
    guardTags: ['A1'],
    epoch: 1,
    what: 'application/ は presentation/ に依存しない',
    why: '依存方向は Presentation → Application。逆方向は循環依存を生む',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'application/ から presentation/ への依存を削除し、依存方向を逆転する',
    },
    outdatedPattern: {
      description: 'application/ から presentation/ を import する',
      imports: ['@/presentation/'],
    },
    decisionCriteria: {
      when: 'application/ から presentation/ の型を参照したいとき',
      exceptions: '例外なし。依存方向は逆',
      escalation: '共有型は domain/ に定義する',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. presentation/ への import を削除',
        '2. 共有が必要なデータは domain/ の型として定義',
        '3. presentation → application → domain の依存方向に従って参照を逆転',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: { prevents: ['application と presentation の循環依存', 'ビルド順序の破壊'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-PRES-INFRA',
    principleRefs: ['A1', 'A3'],
    ruleClass: 'invariant',
    guardTags: ['A1', 'A3', 'A5'],
    epoch: 1,
    what: 'presentation/ は infrastructure/ に直接依存しない',
    why: 'presentation は描画専用。データ取得は application 層の hook を経由する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'application/ の hook 経由でデータを取得する。useQueryWithHandler を推奨',
      imports: ['@/application/hooks/'],
    },
    decisionCriteria: {
      when: 'presentation/ から infrastructure/ を import しようとしたとき',
      exceptions:
        'import type は許容（実行時依存を生まない）。value import は allowlist に正当理由が必要',
      escalation: 'application/ に hook を作成し、presentation/ はそれを使う',
    },
    outdatedPattern: {
      description: 'presentation/ から infrastructure/ を value import する',
      imports: ['@/infrastructure/'],
    },
    relationships: {
      enables: [
        'AR-STRUCT-PRES-ISOLATION',
        'AR-STRUCT-RENDER-SIDE-EFFECT',
        'AR-Q3-CHART-NO-DUCKDB',
      ],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. infrastructure/ への value import を削除（import type は許容）',
        '2. application/hooks/ に対応する hook があるか確認',
        '3. なければ useQueryWithHandler で新規 hook を作成',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: {
      prevents: ['presentation からの直接データ取得', '取得ロジックの散在', 'テスト困難化'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-PRES-USECASE',
    principleRefs: ['A1'],
    ruleClass: 'invariant',
    guardTags: ['A1', 'A3'],
    epoch: 1,
    doc: 'references/01-principles/design-principles.md',
    what: 'presentation/ は application/usecases/ を直接 import しない',
    why: 'usecase はデータ構築の内部実装。presentation は hook 経由でのみアクセスする',
    correctPattern: {
      description: 'application/ の hook 経由でデータを取得する',
    },
    outdatedPattern: {
      description: 'presentation/ から application/usecases/ を value import する',
      imports: ['@/application/usecases/'],
    },
    decisionCriteria: {
      when: 'presentation/ から usecase の関数を直接呼びたいとき',
      exceptions: 'import type は許容',
      escalation: 'application/hooks/ の hook 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-A1-PRES-INFRA'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 1 },
    migrationPath: {
      steps: [
        '1. usecases/ への value import を削除（import type は許容）',
        '2. application/hooks/ の hook 経由でデータを取得するように変更',
        '3. allowlist の残り 1 件を解消して baseline を 0 にする',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-INFRA-APP',
    principleRefs: ['A1'],
    ruleClass: 'invariant',
    guardTags: ['A1'],
    epoch: 1,
    what: 'infrastructure/ は application/ に依存しない',
    why: 'infrastructure/ は domain/ のみに依存する。application/ への依存は循環を生む',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: '依存を domain/ 経由の契約（interface）に変更する',
    },
    outdatedPattern: {
      description: 'infrastructure/ から application/ を import する',
      imports: ['@/application/'],
    },
    decisionCriteria: {
      when: 'infrastructure/ から application/ の型を使いたいとき',
      exceptions: '例外なし',
      escalation: '必要な型は domain/ に契約として定義',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. application/ への import を削除',
        '2. 必要な型は domain/ に契約（interface）として定義',
        '3. infrastructure/ は domain/ のみに依存するよう変更',
      ],
      effort: 'medium',
      priority: 1,
    },
    protectedHarm: {
      prevents: ['infrastructure から application への逆方向依存', '循環依存の発生'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-A1-INFRA-PRES',
    principleRefs: ['A1'],
    ruleClass: 'invariant',
    guardTags: ['A1'],
    epoch: 1,
    what: 'infrastructure/ は presentation/ に依存しない',
    why: 'infrastructure/ と presentation/ は直接依存しない。application/ を経由する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'infrastructure/ から presentation/ への依存を削除する',
    },
    outdatedPattern: {
      description: 'infrastructure/ から presentation/ を import する',
      imports: ['@/presentation/'],
    },
    decisionCriteria: {
      when: 'infrastructure/ から presentation/ を参照しようとしたとき',
      exceptions: '例外なし',
      escalation: '共有データは domain/ 経由',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. presentation/ への import を削除', '2. 共有データは domain/ の型経由で参照'],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: { prevents: ['infrastructure と presentation の直接結合'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  // ── codePatternGuard 由来 ──

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-G4-INTERNAL',
    principleRefs: ['G4'],
    ruleClass: 'default',
    guardTags: ['G4'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'hooks/ に @internal export を作らない',
    why: 'テスト用 export は本番 API を汚染する。テストは public API 経由で行う',
    correctPattern: {
      description: 'public API のみを export する。内部関数はファイル内に閉じる',
    },
    outdatedPattern: {
      description: '@internal コメント付きの export を作成する',
      codeSignals: ['@internal'],
    },
    decisionCriteria: {
      when: 'テストのために内部関数を export したいとき',
      exceptions: '例外なし',
      escalation: 'public API 経由でテストする',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. @internal コメントを削除',
        '2. export を削除し、関数をファイル内に閉じる',
        '3. テストは public API 経由で間接的に検証する',
      ],
      effort: 'trivial',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-C3-STORE',
    principleRefs: ['C3'],
    ruleClass: 'default',
    guardTags: ['C3'],
    epoch: 1,
    what: 'store action 内に業務ロジック（算術式）を埋め込まない',
    why: 'store は state の反映のみ。計算は domain 層に委譲する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description:
        'store action は set() で値を反映するだけ。算術計算は domain/calculations/ で行う',
    },
    outdatedPattern: {
      description: 'set() コールバック内で (a) + (b) のような算術代入を行う',
    },
    decisionCriteria: {
      when: 'store action 内で計算が必要なとき',
      exceptions: '例外なし',
      escalation: 'domain/calculations/ で計算し結果を set() する',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. set() コールバック内の算術式を特定',
        '2. 計算を domain/calculations/ の純粋関数に抽出',
        '3. store action は計算結果を set() するだけに変更',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-G3-SUPPRESS',
    principleRefs: ['G3', 'E2'],
    ruleClass: 'default',
    guardTags: ['G3', 'E2'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'コンパイラ警告を黙殺しない（eslint-disable / @ts-ignore 禁止）',
    why: '警告を黙殺すると型安全性やリント規約が形骸化する',
    correctPattern: {
      description: '根本原因を修正する。どうしても必要な���合は allowlist に正当理由を記載',
    },
    outdatedPattern: {
      description: 'eslint-disable / @ts-ignore / @ts-expect-error コメントを追加する',
      codeSignals: ['eslint-disable', '@ts-ignore', '@ts-expect-error'],
    },
    decisionCriteria: {
      when: 'eslint-disable や @ts-ignore を追加しようとしたとき',
      exceptions: 'ライブラリ制約（ECharts 等）や非標準 HTML 属性の場合は G3_ALLOWLIST に追加可能',
      escalation: '根本原因を修正する。型を正しく定義する',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. eslint-disable / @ts-ignore / @ts-expect-error を削除',
        '2. 警告の根本原因を修正（型エラー → 型を正しく定義、lint → コードを修正）',
        '3. どうしても必要なら codePatternGuard の G3_ALLOWLIST に正当理由を記載',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: { prevents: ['型安全性の形骸化', 'lint 規約の無効化', 'バグの隠蔽'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-E4-TRUTHINESS',
    principleRefs: ['E4'],
    ruleClass: 'default',
    guardTags: ['E4'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: '数値フィールドの truthiness チェックを禁止する',
    why: '0 が有効値のフィールドで !value を使うと欠損扱いされ計算が狂う',
    correctPattern: {
      description: '欠損判定は value == null を使う',
      example: 'if (result.salesAmount == null) { /* 欠損 */ }',
    },
    outdatedPattern: {
      description: '!result.numericField のような truthiness チェック',
      codeSignals: ['!result.', '!entry.', '!data.'],
    },
    decisionCriteria: {
      when: '数値フィールドの存在チェックを書くとき',
      exceptions: '例外なし',
      escalation: '!value を value == null に書き換え',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. !result.field を result.field == null に変更',
        '2. 0 が有効値のフィールド（金額、数量等）は特に注意',
      ],
      effort: 'trivial',
      priority: 1,
    },
    protectedHarm: {
      prevents: ['0 が有効値のフィールドで欠損扱い', '金額ゼロの正当な取引が消える'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-C5-SELECTOR',
    principleRefs: ['C5'],
    ruleClass: 'default',
    guardTags: ['C5'],
    epoch: 1,
    doc: 'references/01-principles/design-principles.md',
    what: 'Zustand store はセレクタ付きで呼ぶ',
    why: 'セレクタなしの store 呼び出しは全フィールドの変更で再レンダリングが発生する',
    correctPattern: {
      description: 'useDataStore((s) => s.field) のようにセレクタを指定する',
      example: 'const field = useDataStore((s) => s.field)',
    },
    outdatedPattern: {
      description: 'useDataStore() のようにセレクタなしで呼ぶ',
      codeSignals: ['useDataStore()', 'useSettingsStore()', 'useUiStore()'],
    },
    decisionCriteria: {
      when: 'Zustand store を使うとき',
      exceptions: '例外なし',
      escalation: 'セレクタを指定して必要なフィールドのみ購読',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. useDataStore() → useDataStore((s) => s.必要なフィールド) に変更',
        '2. 複数フィールドが必要なら useDataStore((s) => ({ a: s.a, b: s.b })) を使用',
      ],
      effort: 'trivial',
      priority: 1,
    },
    protectedHarm: { prevents: ['全フィールド変更で再レンダリング', 'パフォーマンス劣化'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-G2-EMPTY-CATCH',
    principleRefs: ['G2'],
    ruleClass: 'default',
    guardTags: ['G2'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: '空の catch ブロックでエラーを握り潰さない',
    why: 'エラーを無視するとデバッグ不能な不具合につながる',
    correctPattern: {
      description: 'catch 内で最低でも console.warn を入れるか、エラーを伝播する',
    },
    outdatedPattern: {
      description: '.catch(() => {}) のような空のエラーハンドラ',
      codeSignals: ['.catch(() => {})'],
    },
    decisionCriteria: {
      when: 'catch ブロックを書くとき',
      exceptions: '例外なし',
      escalation: '最低でも console.warn(error) を入れる',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 空の catch に console.warn(error) を追加',
        '2. 可能なら呼び出し元にエラーを伝播する（throw / return Result）',
      ],
      effort: 'trivial',
      priority: 1,
    },
    protectedHarm: { prevents: ['エラーの握り潰し', 'デバッグ不能な不具合'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  // ── sizeGuard 由来 ──

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G5-HOOK-MEMO',
    principleRefs: ['G5', 'C8'],
    ruleClass: 'heuristic',
    guardTags: ['G5'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'application/hooks/ の useMemo 呼び出しを上限以下に保つ',
    why: 'useMemo が多いファイルは複数の導出値を抱えており責務が混在している',
    correctPattern: {
      description:
        'useMemo ≤ 7。超える場合は hook を分割するか allowlists/complexity.ts に正当理由を記載',
    },
    outdatedPattern: {
      description: '1 つの hook ファイルに大量の useMemo を詰め込む',
    },
    thresholds: { memoMax: 7 },
    decisionCriteria: {
      when: 'hook の useMemo が 7 を超えそうなとき',
      exceptions:
        'allowlists/complexity.ts に理由・lifecycle・removalCondition を記載すれば個別上限を設定可能',
      escalation: 'hook を分割するか、pure builder に計算を抽出する',
    },
    relationships: {},
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. useMemo の依存値を分析し、責務ごとにグループ化',
        '2. 関連する useMemo を新しい hook（use*Derived.ts）に抽出',
        '3. 純粋な計算は *Builders.ts / *Logic.ts に抽出',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G5-HOOK-STATE',
    principleRefs: ['G5', 'C8'],
    ruleClass: 'heuristic',
    guardTags: ['G5'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'application/hooks/ の useState 呼び出しを上限以下に保つ',
    why: 'useState が多いファイルは複数の状態責務を抱えており God Hook の兆候',
    correctPattern: {
      description:
        'useState ≤ 6。超える場合は状態管理を分離するか allowlists/complexity.ts に正当理由を記載',
    },
    outdatedPattern: {
      description: '1 つの hook に大量の useState を詰め込む',
    },
    thresholds: { stateMax: 6 },
    decisionCriteria: {
      when: 'hook の useState が 6 を超えそうなとき',
      exceptions: 'allowlists/complexity.ts に登録可能。useReducer 統合も検討',
      escalation: '状態管理 hook を分割するか useReducer に統合する',
    },
    relationships: {},
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. useState を責務ごとにグループ化（UI状態 / データ状態 / フォーム状態）',
        '2. 関連する useState を新しい hook（use*State.ts）に抽出',
        '3. useReducer に統合できる場合は *Reducer.ts に抽出',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G5-HOOK-LINES',
    principleRefs: ['G5'],
    ruleClass: 'heuristic',
    guardTags: ['G5'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'application/hooks/ のファイルを 300 行以下に保つ',
    why: '長い hook ファイルは複数の責務を持つ兆候。分割して単一責務を維持する',
    correctPattern: {
      description:
        '300 行以下。超える場合は hook を分割するか allowlists/complexity.ts に正当理由を記載',
    },
    outdatedPattern: {
      description: '1 つの hook ファイルに大量のロジックを詰め込む',
    },
    thresholds: { lineMax: 300 },
    decisionCriteria: {
      when: 'hook ファイルが 300 行に近づいたとき',
      exceptions: 'allowlists/complexity.ts に登録可能',
      escalation: 'hook の分割を検討',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. ファイルの責務を 1 文で説明できるか確認（C8）',
        '2. AND が入るなら責務ごとに hook を分割',
        '3. 純粋な計算は *Builders.ts / *Logic.ts に抽出',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G6-COMPONENT',
    principleRefs: ['G6'],
    ruleClass: 'heuristic',
    guardTags: ['G6'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'presentation/ の .tsx コンポーネントを 600 行以下に保つ',
    why: '大きなコンポーネントは描画・状態・ロジックが混在している兆候',
    correctPattern: {
      description: '600 行以下。超える場合は子コンポーネントに分割する',
    },
    outdatedPattern: {
      description: '1 つのコンポーネントファイルに全ての描画ロジックを詰め込む',
    },
    thresholds: { lineMax: 600 },
    decisionCriteria: {
      when: 'コンポーネントが 600 行を超えそうなとき',
      exceptions: 'allowlists/size.ts の Tier 2 に登録可能（次回改修時に分割義務）',
      escalation: '子コンポーネントに分割。状態は hook に抽出',
    },
    relationships: {},
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 描画・状態・ロジックのどれが肥大化しているか特定',
        '2. 状態管理 → use*State hook に抽出、ロジック → *Logic.ts に抽出',
        '3. 描画が長い → 子コンポーネントに分割',
      ],
      effort: 'medium',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G5-DOMAIN-LINES',
    principleRefs: ['G5'],
    ruleClass: 'heuristic',
    guardTags: ['G5', 'A2'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'domain/ のファイルを 300 行以下に保つ',
    why: 'domain/ は純粋関数。短く保つことでテスト容易性と可読性を維持する',
    correctPattern: {
      description: '300 行以下。超える場合は関数を分割する',
    },
    outdatedPattern: {
      description: '1 つの domain ファイルに大量の関数を詰め込む',
    },
    thresholds: { lineMax: 300 },
    decisionCriteria: {
      when: 'domain ファイルが 300 行に近づいたとき',
      exceptions: 'allowlists/size.ts に登録可能（permanent のみ）',
      escalation: '関数を別ファイルに分割',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 関連する計算関数を別ファイルに分割',
        '2. 共通ユーティリティは domain/utils/ に移動',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G5-INFRA-LINES',
    principleRefs: ['G5'],
    ruleClass: 'heuristic',
    guardTags: ['G5'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'infrastructure/ のファイルを 400 行以下に保つ',
    why: 'インフラ層のファイルが大きくなると外部依存の影響範囲が広がる',
    correctPattern: {
      description: '400 行以下。超える場合は adapter を分割する',
    },
    outdatedPattern: {
      description: '1 つのインフラファイルに大量のクエリや処理を詰め込む',
    },
    thresholds: { lineMax: 400 },
    decisionCriteria: {
      when: 'infrastructure ファイルが 400 行に近づいたとき',
      exceptions: 'allowlists/size.ts に登録可能',
      escalation: 'クエリやアダプタを分割',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. クエリやアダプタを責務ごとに分割', '2. 共通処理は infrastructure/shared/ に抽出'],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-G5-USECASE-LINES',
    principleRefs: ['G5'],
    ruleClass: 'heuristic',
    guardTags: ['G5'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'application/usecases/ のファイルを 400 行以下に保つ',
    why: 'usecase が肥大化するとデータ構築の責務が不明確になる',
    correctPattern: {
      description: '400 行以下。超える場合は usecase を分割する',
    },
    outdatedPattern: {
      description: '1 つの usecase に大量のインデックス構築を詰め込む',
    },
    thresholds: { lineMax: 400 },
    decisionCriteria: {
      when: 'usecase ファイルが 400 行に近づいたとき',
      exceptions: 'allowlists/size.ts に登録可能',
      escalation: 'usecase を分割',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. usecase のインデックス構築を責務ごとに分割',
        '2. 共通の builder は application/usecases/shared/ に抽出',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-C6-FACADE',
    principleRefs: ['C6'],
    ruleClass: 'heuristic',
    guardTags: ['C6'],
    epoch: 1,
    doc: 'references/01-principles/design-principles.md',
    what: 'facade ファイルの分岐を 5 以下に保つ（orchestration のみ）',
    why: 'facade に分岐ロジックが混入すると単なる委譲ではなくなり責務が曖昧になる',
    correctPattern: {
      description: 'facade は hook の組み立てのみ。分岐は呼び出し先に委譲する',
    },
    outdatedPattern: {
      description: 'facade 内で if/switch による条件分岐を多用する',
    },
    thresholds: { branchMax: 5 },
    decisionCriteria: {
      when: 'facade ファイルに if/switch を追加しようとしたとき',
      exceptions: '分岐が 5 以下なら許容。超える場合は呼び出し先に委譲',
      escalation: 'Strategy パターンを検討する',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. if/switch の分岐を呼び出し先の hook に委譲',
        '2. facade は hook の組み立て（orchestration）のみにする',
        '3. 条件分岐が必要なら呼び出し先で Strategy パターンを使う',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  // ── パスガード由来（正本取得経路の保護） ──

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-SALES',
    principleRefs: ['B1', 'F8'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '売上データは readSalesFact / salesFactHandler 経由でのみ取得する',
    why: '旧クエリの直接利用は正本の一貫性を破壊する',
    doc: 'references/01-principles/sales-definition.md',
    correctPattern: {
      description: 'readSalesFact() または useWidgetDataOrchestrator 経由で取得',
      imports: ['@/application/readModels/salesFact/readSalesFact'],
    },
    outdatedPattern: {
      description:
        'presentation/ から categoryTimeSales / timeSlots / salesFactQueries を直接 import',
      imports: [
        '@/infrastructure/duckdb/queries/categoryTimeSales',
        '@/infrastructure/duckdb/queries/timeSlots',
        '@/infrastructure/duckdb/queries/salesFactQueries',
      ],
    },
    decisionCriteria: {
      when: '売上データを取得するコードを書くとき',
      exceptions: 'application 層の salesFactHandler 直接使用は許容',
      escalation: 'readSalesFact() または useWidgetDataOrchestrator 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CANONICALIZATION'],
      enables: ['AR-PATH-GROSS-PROFIT', 'AR-PATH-PI-VALUE', 'AR-PATH-FACTOR-DECOMPOSITION'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 旧クエリへの import を削除',
        '2. readSalesFact() または useWidgetDataOrchestrator 経由に変更',
        '3. SalesFactReadModel 型を使用',
      ],
      effort: 'small',
      priority: 2,
    },
    protectedHarm: { prevents: ['売上データの不整合', '旧クエリと新正本の値の乖離'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-DISCOUNT',
    principleRefs: ['B1', 'F8'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '値引きデータは readDiscountFact / discountFactHandler 経由でのみ取得する',
    why: '旧クエリの直接利用は正本の一貫性を破壊する',
    doc: 'references/01-principles/discount-definition.md',
    correctPattern: {
      description: 'readDiscountFact() または useWidgetDataOrchestrator 経由で取得',
      imports: ['@/application/readModels/discountFact/readDiscountFact'],
    },
    outdatedPattern: {
      description: 'presentation/ から旧値引きクエリを直接 import',
    },
    decisionCriteria: {
      when: '値引きデータを取得するとき',
      exceptions: 'application 層の discountFactHandler 直接使用は許容',
      escalation: 'readDiscountFact() 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CANONICALIZATION'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 旧クエリへの import を削除', '2. readDiscountFact() 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-GROSS-PROFIT',
    principleRefs: ['B1', 'B3'],
    ruleClass: 'invariant',
    guardTags: ['F9', 'D1'],
    epoch: 1,
    what: '粗利計算は calculateGrossProfit 経由でのみ実行する',
    why: '粗利の計算方法が散在すると不変条件（売上−原価=粗利）が破壊される',
    doc: 'references/01-principles/gross-profit-definition.md',
    correctPattern: {
      description: 'calculateGrossProfit() で全 4 種の粗利を統一的に計算',
      imports: ['@/domain/calculations/grossProfit'],
    },
    outdatedPattern: {
      description: '独自の粗利計算や旧関数を使用する',
    },
    decisionCriteria: {
      when: '粗利を取得・計算するコードを書くとき',
      exceptions:
        '例外なし。全ての粗利は calculateGrossProfit → getEffectiveGrossProfit の 2 層構造を使う',
      escalation: '独自計算を発見したら即座に正本関数に置き換える',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-PURITY'],
      enables: ['AR-PATH-GROSS-PROFIT-CONSISTENCY'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 独自の粗利計算を削除',
        '2. calculateGrossProfit() に置き換え',
        '3. GrossProfitResult 型を使用',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: {
      prevents: ['粗利計算の散在', '売上−原価=粗利の不変条件破壊', '店舗間の粗利不整合'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-PURCHASE-COST',
    principleRefs: ['B1', 'F8'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '仕入原価は readPurchaseCost 経由でのみ取得する',
    why: '3 独立正本（通常仕入・売上納品・移動原価）の一貫性を保証する',
    doc: 'references/01-principles/purchase-cost-definition.md',
    correctPattern: {
      description: 'readPurchaseCost() / usePurchaseCost() 経由で取得',
      imports: ['@/application/readModels/purchaseCost/readPurchaseCost'],
    },
    decisionCriteria: {
      when: '仕入原価データが必要になったとき',
      exceptions: 'application 層の purchaseCostHandler / readPurchaseCost() の直接使用は許容',
      escalation: '旧 7 関数（queryPurchaseTotal 等）は廃止済み。復活禁止',
    },
    outdatedPattern: {
      description: '旧 queryPurchaseTotal 等 7 関数の使用（廃止済み）',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CANONICALIZATION'],
      enables: ['AR-PATH-GROSS-PROFIT'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 旧クエリ関数の呼び出しを削除',
        '2. readPurchaseCost() に置き換え',
        '3. PurchaseCostReadModel 型を使用',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: { prevents: ['仕入原価の二重計上', '移動原価の方向ミス（IN のみで OUT 漏れ）'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-CUSTOMER',
    principleRefs: ['B1', 'F8'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '客数データは readCustomerFact 経由でのみ取得する',
    why: '客数の正本が散在すると集計の一貫性が失われる',
    doc: 'references/01-principles/customer-definition.md',
    correctPattern: {
      description: 'readCustomerFact() 経由で取得',
      imports: ['@/application/readModels/customerFact/readCustomerFact'],
    },
    outdatedPattern: {
      description: 'presentation/ から旧客数クエリを直接 import',
    },
    decisionCriteria: {
      when: '客数データを取得するとき',
      exceptions: 'application 層の customerFactHandler 直接使用は許容',
      escalation: 'readCustomerFact() 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CANONICALIZATION'],
      enables: ['AR-PATH-PI-VALUE', 'AR-PATH-CUSTOMER-GAP'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 旧クエリへの import を削除', '2. readCustomerFact() 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    protectedHarm: { prevents: ['客数集計の不一致', 'PI 値計算への不正確な入力'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-CUSTOMER-GAP',
    principleRefs: ['B1', 'D1'],
    ruleClass: 'invariant',
    guardTags: ['F9', 'D1'],
    epoch: 1,
    what: '客数 GAP は calculateCustomerGap 経由でのみ計算する',
    why: 'インライン計算は GAP の定義（昨対差）との不整合を生む',
    doc: 'references/01-principles/customer-gap-definition.md',
    correctPattern: {
      description: 'calculateCustomerGap() を使用',
      imports: ['@/domain/calculations/customerGap'],
    },
    outdatedPattern: {
      description: 'インラインで客数差を計算する（例: current - previous）',
      codeSignals: ['customers.*-.*customers', 'customerCount.*-'],
    },
    decisionCriteria: {
      when: '客数差を計算するとき',
      exceptions: '例外なし',
      escalation: 'calculateCustomerGap() を使用',
    },
    relationships: {
      dependsOn: ['AR-PATH-CUSTOMER'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. インラインの差分計算を削除', '2. calculateCustomerGap() に置き換え'],
      effort: 'trivial',
      priority: 2,
    },
    protectedHarm: { prevents: ['客数 GAP の定義不一致', 'インライン計算による精度劣化'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-PI-VALUE',
    principleRefs: ['B1'],
    ruleClass: 'invariant',
    guardTags: ['F9', 'D1'],
    epoch: 1,
    what: 'PI 値は calculateQuantityPI / calculateAmountPI 経由でのみ計算する',
    why: 'インラインの除算は 0 除算ガードの欠落やフォーマット不統一を招く',
    doc: 'references/01-principles/pi-value-definition.md',
    correctPattern: {
      description: 'calculateQuantityPI() / calculateAmountPI() を使用',
      imports: ['@/domain/calculations/piValue'],
    },
    outdatedPattern: {
      description: 'インラインで売上÷客数の除算を行う',
      codeSignals: ['sales.*\\/.*customers', 'amount.*\\/.*count'],
    },
    decisionCriteria: {
      when: 'PI 値（売上÷客数）を計算するとき',
      exceptions: '例外なし。0 除算ガードが組み込まれている',
      escalation: 'calculateQuantityPI() / calculateAmountPI() を使用',
    },
    relationships: {
      dependsOn: ['AR-PATH-SALES', 'AR-PATH-CUSTOMER'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. インラインの除算を削除',
        '2. calculateQuantityPI() / calculateAmountPI() に置き換え',
      ],
      effort: 'trivial',
      priority: 2,
    },
    protectedHarm: { prevents: ['0 除算ガードの欠落', 'PI 値フォーマットの不統一'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-FREE-PERIOD',
    principleRefs: ['B1'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '自由期間分析データは readFreePeriodFact 経由でのみ取得する',
    why: '自由期間の正本が散在すると期間スコープの一貫性が失われる',
    doc: 'references/01-principles/free-period-analysis-definition.md',
    correctPattern: {
      description: 'readFreePeriodFact() / freePeriodHandler 経由で取得',
      imports: ['@/application/readModels/freePeriod/readFreePeriodFact'],
    },
    outdatedPattern: {
      description: 'presentation/ から旧自由期間クエリを直接 import',
    },
    decisionCriteria: {
      when: '自由期間分析データを取得するとき',
      exceptions: 'application 層の freePeriodHandler 直接使用は許容',
      escalation: 'readFreePeriodFact() 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CANONICALIZATION'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 旧クエリへの import を削除', '2. readFreePeriodFact() 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-FREE-PERIOD-BUDGET',
    principleRefs: ['B1'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '自由期間予算は readFreePeriodBudgetFact 経由でのみ取得する',
    why: '予算データの取得経路を統一し、集計の一貫性を保証する',
    doc: 'references/01-principles/free-period-budget-kpi-contract.md',
    correctPattern: {
      description: 'readFreePeriodBudgetFact() 経由で取得',
      imports: ['@/application/readModels/freePeriodBudget/readFreePeriodBudgetFact'],
    },
    outdatedPattern: {
      description: '旧予算クエリを直接利用',
    },
    decisionCriteria: {
      when: '自由期間予算データを取得するとき',
      exceptions: 'application 層の handler 直接使用は許容',
      escalation: 'readFreePeriodBudgetFact() 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-PATH-FREE-PERIOD'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 旧クエリへの import を削除', '2. readFreePeriodBudgetFact() 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-FREE-PERIOD-DEPT-KPI',
    principleRefs: ['B1'],
    ruleClass: 'invariant',
    guardTags: ['F9'],
    epoch: 1,
    what: '自由期間部門 KPI は readFreePeriodDeptKPI 経由でのみ取得する',
    why: '部門 KPI の取得経路を統一し、集計の一貫性を保証する',
    doc: 'references/01-principles/free-period-budget-kpi-contract.md',
    correctPattern: {
      description: 'readFreePeriodDeptKPI() 経由で取得',
      imports: ['@/application/readModels/freePeriodDeptKPI/readFreePeriodDeptKPI'],
    },
    outdatedPattern: {
      description: '旧部門 KPI クエリを直接利用',
    },
    decisionCriteria: {
      when: '自由期間部門 KPI を取得するとき',
      exceptions: 'application 層の handler 直接使用は許容',
      escalation: 'readFreePeriodDeptKPI() 経由に変更',
    },
    relationships: {
      dependsOn: ['AR-PATH-FREE-PERIOD'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 旧クエリへの import を削除', '2. readFreePeriodDeptKPI() 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-FACTOR-DECOMPOSITION',
    principleRefs: ['B1', 'D1', 'D2'],
    ruleClass: 'invariant',
    guardTags: ['F9', 'D1', 'D2'],
    epoch: 1,
    what: '要因分解は calculateFactorDecomposition 経由でのみ実行する',
    why: '要因分解の合計値は実際の売上差に完全一致しなければならない（D1 不変条件）',
    doc: 'references/01-principles/authoritative-calculation-definition.md',
    correctPattern: {
      description:
        'calculateFactorDecomposition() を使用。WASM ready なら WASM、そうでなければ TS fallback',
      imports: ['@/domain/calculations/factorDecomposition'],
    },
    outdatedPattern: {
      description: '独自の要因分解計算やインラインのシャープリー値計算',
    },
    decisionCriteria: {
      when: '要因分解を実行するとき',
      exceptions: '例外なし。シャープリー恒等式の不変条件を破壊する',
      escalation: 'calculateFactorDecomposition() を使用',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-PURITY', 'AR-PATH-SALES'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 独自の要因分解計算を削除',
        '2. calculateFactorDecomposition() に置き換え',
        '3. FactorDecompositionResult 型を使用',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: { prevents: ['要因分解の合計値が売上差と不一致（D1 不変条件違反）'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'now',
    slice: 'canonicalization',
    id: 'AR-PATH-GROSS-PROFIT-CONSISTENCY',
    principleRefs: ['B1', 'D3'],
    ruleClass: 'invariant',
    guardTags: ['F9', 'D1'],
    epoch: 1,
    what: '粗利計算の一貫性を保証する（全経路で同一値）',
    why: '異なる経路で粗利を取得すると値の不整合が発生する',
    doc: 'references/01-principles/gross-profit-definition.md',
    correctPattern: {
      description:
        'calculateGrossProfit → getEffectiveGrossProfit → grossProfitFromStoreResult の 2 層構造',
    },
    outdatedPattern: {
      description: '独自の粗利取得関数を作成する',
    },
    decisionCriteria: {
      when: '粗利を取得する経路を選ぶとき',
      exceptions: '例外なし。全経路で同一値でなければならない',
      escalation: 'calculateGrossProfit → getEffectiveGrossProfit の 2 層構造を使用',
    },
    relationships: {
      dependsOn: ['AR-PATH-GROSS-PROFIT'],
    },
    detection: { type: 'custom', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 粗利を取得している箇所を特定',
        '2. calculateGrossProfit() の 2 層構造に従っているか確認',
        '3. 独自経路があれば getEffectiveGrossProfit / grossProfitFromStoreResult に移行',
      ],
      effort: 'small',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  // ── 構造・純粋性・移行ガード由来 ──

  {
    fixNow: 'review',
    slice: 'query-runtime',
    id: 'AR-STRUCT-ANALYSIS-FRAME',
    principleRefs: ['H1'],
    ruleClass: 'default',
    guardTags: ['H3'],
    epoch: 1,
    doc: 'references/01-principles/safe-performance-principles.md',
    what: 'AnalysisFrame / CalculationFrame が分析の唯一の入口',
    why: '分析フレームを経由しないクエリはキャッシュキーの不整合や期間スコープの矛盾を招く',
    correctPattern: { description: 'AnalysisFrame / CalculationFrame 経由でクエリ入力を構築する' },
    outdatedPattern: { description: 'presentation/ で直接クエリ入力を組み立てる' },
    decisionCriteria: {
      when: 'クエリ入力を構築するとき',
      exceptions: '例外なし',
      escalation: 'AnalysisFrame / CalculationFrame 経由で構築',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-QUERY-PATTERN'],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. 直接クエリ入力の構築を AnalysisFrame 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'canonicalization',
    id: 'AR-STRUCT-CALC-CANON',
    principleRefs: ['B1'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    doc: 'references/01-principles/calculation-canonicalization-map.md',
    what: 'domain/calculations/ の全ファイルが CALCULATION_CANON_REGISTRY に登録されている',
    why: '未登録ファイルは正本化体系の管理外となり品質保証が及ばない',
    correctPattern: {
      description: '新規ファイル追加時に calculationCanonRegistry.ts に分類を登録する',
    },
    outdatedPattern: { description: 'domain/calculations/ にファイルを追加してレジストリに未登録' },
    decisionCriteria: {
      when: 'domain/calculations/ にファイルを追加・変更するとき',
      exceptions: '例外なし。全ファイルが calculationCanonRegistry に登録必須',
      escalation: 'required なら Zod 契約も追加。不明なら review 分類で登録',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'must-include', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. calculationCanonRegistry.ts に分類を追加（required/review/not-needed）',
        '2. required なら Zod 契約を追加',
      ],
      effort: 'trivial',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'canonicalization',
    id: 'AR-CANON-ZOD-REQUIRED',
    principleRefs: ['E1', 'F5'],
    ruleClass: 'default',
    guardTags: ['G1', 'E1'],
    epoch: 1,
    doc: 'references/01-principles/canonicalization-principles.md',
    what: 'required 分類の domain/calculations/ ファイルは Zod 入出力契約を持つ',
    why: 'Zod 契約なしの計算は型安全な境界検証が欠落し、実行時エラーを招く',
    correctPattern: {
      description: 'z.object(...).parse() で入力を検証し、結果型を Zod schema で定義する',
    },
    outdatedPattern: { description: 'required 分類なのに Zod parse がないファイル' },
    decisionCriteria: {
      when: 'domain/calculations/ の required ファイルを変更するとき',
      exceptions: '例外なし。required は全て Zod 契約必須（現在 13/13 達成済み）',
      escalation: 'Zod schema を追加してから機能を追加する',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CALC-CANON'],
      enables: ['AR-PATH-GROSS-PROFIT', 'AR-PATH-FACTOR-DECOMPOSITION'],
    },
    detection: { type: 'must-include', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. 入力型の Zod schema を定義',
        '2. 関数の先頭で .parse() を呼ぶ',
        '3. 出力型の Zod schema を定義',
      ],
      effort: 'small',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'canonicalization',
    id: 'AR-CANON-ZOD-REVIEW',
    principleRefs: ['E1'],
    ruleClass: 'default',
    guardTags: ['G1', 'E1'],
    epoch: 1,
    doc: 'references/01-principles/canonicalization-principles.md',
    what: 'review 分類の Zod 未済ファイルを段階的に解消する',
    why: 'review 分類の Zod 化が進むと正本化体系の信頼性が向上する',
    correctPattern: { description: 'review ファイルに Zod 契約を追加し zodAdded: true に更新する' },
    outdatedPattern: { description: 'review 分類で zodAdded: false のまま放置する' },
    decisionCriteria: {
      when: 'review 分類のファイルを変更するとき',
      exceptions: '出力型が外部定義（domain/models）に依存する場合は外部スキーマ整備後に対応',
      escalation: '可能なら Zod 契約を追加し zodAdded を true に更新する',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CALC-CANON'],
    },
    detection: { type: 'count', severity: 'gate', baseline: 3 },
    migrationPath: {
      steps: [
        '1. review ファイルの入出力を分析',
        '2. Zod schema を定義',
        '3. zodAdded: true に更新',
        '4. baseline を減らす',
      ],
      effort: 'small',
      priority: 3,
    },
    sunsetCondition: 'review 分類の Zod 未済が 0 になった',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'canonicalization',
    id: 'AR-STRUCT-CANONICAL-INPUT',
    principleRefs: ['B1', 'E1'],
    ruleClass: 'default',
    guardTags: ['G1', 'D1'],
    epoch: 1,
    doc: 'references/01-principles/canonical-input-sets.md',
    what: 'PI値・客数GAPは正本 input builder 経由でのみ計算する',
    why: 'presentation/ でのインライン計算は不変条件を破壊する',
    correctPattern: { description: 'canonical input builder を使用して正本関数に渡す' },
    outdatedPattern: { description: 'presentation/ で独自に PI値や GAP を計算する' },
    decisionCriteria: {
      when: 'PI値・客数GAPの入力を構築するとき',
      exceptions: '例外なし',
      escalation: 'canonical input builder 経由に変更',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. インライン計算を削除', '2. canonical input builder 経由に変更'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'canonicalization',
    id: 'AR-STRUCT-CANONICALIZATION',
    principleRefs: ['B1', 'E1', 'F5'],
    ruleClass: 'default',
    guardTags: ['G1', 'E3', 'F5', 'F8'],
    epoch: 1,
    what: '全 readModel と calculation canonical が正本化原則に従っている',
    why: '正本化体系の整合性が崩れると、異なる経路で異なる値が計算される',
    doc: 'references/01-principles/canonicalization-principles.md',
    correctPattern: { description: 'readModels/ に配置、Zod 契約、パスガード、定義書を揃える' },
    outdatedPattern: { description: '正本化手順を省略して readModel を追加する' },
    decisionCriteria: {
      when: '新しい readModel を追加するとき',
      exceptions: '例外なし。正本化手順を全て実施する',
      escalation: 'readModels/ 配置 → Zod 契約 → パスガード → 定義書',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CALC-CANON', 'AR-STRUCT-FALLBACK-METADATA'],
      enables: [
        'AR-PATH-SALES',
        'AR-PATH-DISCOUNT',
        'AR-PATH-GROSS-PROFIT',
        'AR-PATH-PURCHASE-COST',
        'AR-PATH-CUSTOMER',
        'AR-PATH-FREE-PERIOD',
      ],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. readModels/ に配置', '2. Zod 契約追加', '3. パスガード追加', '4. 定義書作成'],
      effort: 'medium',
      priority: 1,
    },
    protectedHarm: { prevents: ['readModel の体系的品質保証の欠落', '異なる経路で異なる値'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'query-runtime',
    id: 'AR-STRUCT-COMPARISON-SCOPE',
    principleRefs: ['H2'],
    ruleClass: 'default',
    guardTags: ['H2'],
    epoch: 1,
    doc: 'references/01-principles/safe-performance-principles.md',
    what: 'ComparisonScope は buildComparisonScope() のみで生成する',
    why: 'ad-hoc な比較スコープ生成はペア/バンドル契約の一貫性を破壊する',
    correctPattern: { description: 'buildComparisonScope() factory 経由で生成する' },
    outdatedPattern: { description: 'presentation/ で直接 ComparisonScope を構築する' },
    decisionCriteria: {
      when: '比較スコープを生成するとき',
      exceptions: '例外なし',
      escalation: 'buildComparisonScope() factory を使用',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-QUERY-PATTERN'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 直接構築を削除', '2. buildComparisonScope() に置き換え'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'governance-ops',
    id: 'AR-STRUCT-DATA-INTEGRITY',
    principleRefs: ['D3', 'E1'],
    ruleClass: 'default',
    guardTags: ['G1', 'E1'],
    epoch: 1,
    doc: 'references/03-guides/invariant-catalog.md',
    what: '既知のバグパターン（二重計上、is_prev_year 不整合、state リセット漏れ）を防止する',
    why: '過去に発生したバグの再発を機械的に防止する',
    correctPattern: { description: '定義書の集計ルールに従い、state リセットを忘れない' },
    outdatedPattern: { description: '二重計上、DuckDB is_prev_year の不整合、state リセット漏れ' },
    decisionCriteria: {
      when: '集計クエリや state リセットを書くとき',
      exceptions: '例外なし',
      escalation: '二重計上チェック、is_prev_year 整合確認、useEffect クリーンアップ確認',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-CANONICALIZATION'],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 二重計上: 集約サブクエリ経由にする',
        '2. state リセット: useEffect のクリーンアップで確実にリセット',
      ],
      effort: 'small',
      priority: 1,
    },
    protectedHarm: { prevents: ['二重計上', 'DuckDB is_prev_year 不整合', 'state リセット漏れ'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'governance-ops',
    id: 'AR-STRUCT-DUAL-RUN-EXIT',
    principleRefs: ['B1'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    what: 'WASM 全 5 engine が authoritative に昇格済み。dual-run は退役',
    why: 'dual-run infrastructure は全面退役済み。復活させない',
    doc: 'references/03-guides/safety-first-architecture-plan.md',
    correctPattern: { description: 'WASM ready なら WASM、そうでなければ TS fallback の 2 モード' },
    outdatedPattern: { description: 'dual-run-compare モードの復活やブリッジコードの追加' },
    decisionCriteria: {
      when: 'WASM 関連コードを変更するとき',
      exceptions: '例外なし。dual-run は退役済み',
      escalation: 'ts-only | wasm-only の 2 モードのみ',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. dual-run 関連コードを発見したら削除'],
      effort: 'trivial',
      priority: 1,
    },
    sunsetCondition: 'dual-run 関連コードが完全に削除された',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'canonicalization',
    id: 'AR-STRUCT-FALLBACK-METADATA',
    principleRefs: ['E3'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    doc: 'references/03-guides/invariant-catalog.md',
    what: 'クリティカルな readModel は usedFallback フィールドを持つ',
    why: 'サイレントフォールバックは計算結果の信頼性を損なう',
    correctPattern: {
      description: 'readModel に usedFallback: boolean を含め、フォールバック時に true を設定する',
    },
    outdatedPattern: { description: 'フォールバックの発生を隠蔽する' },
    decisionCriteria: {
      when: 'readModel を新規作成するとき',
      exceptions: '非クリティカルな readModel は省略可能',
      escalation: 'usedFallback: boolean を追加',
    },
    detection: { type: 'must-include', severity: 'gate' },
    migrationPath: {
      steps: ['1. readModel 型に usedFallback を追加', '2. builder でフォールバック判定を実装'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'debt',
    slice: 'governance-ops',
    id: 'AR-MIG-OLD-PATH',
    principleRefs: ['F4'],
    ruleClass: 'default',
    guardTags: ['F4', 'F1'],
    epoch: 1,
    doc: 'references/01-principles/modular-monolith-evolution.md',
    what: 'features/ に移行済みのモジュールは旧パス経由の新規 import を受け付けない',
    why: '移行後に旧パスの import が増えると移行が巻き戻る',
    correctPattern: { description: 'features/<feature>/ 経由で import する' },
    outdatedPattern: {
      description: '旧パス（application/hooks/ 等）経由で移行済みモジュールを import する',
    },
    decisionCriteria: {
      when: 'features/ に移行済みモジュールを import するとき',
      exceptions: '移行中の過渡期のみ旧パス許容。移行完了後は禁止',
      escalation: 'features/<feature>/ のパスに変更する',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-TOPOLOGY'],
    },
    detection: { type: 'import', severity: 'gate' },
    migrationPath: {
      steps: ['1. 旧パスの import を features/<feature>/ のパスに変更'],
      effort: 'trivial',
      priority: 1,
    },
    sunsetCondition: 'features/ 移行が 100% 完了した',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'governance-ops',
    id: 'AR-STRUCT-PAGE-META',
    principleRefs: ['F4'],
    ruleClass: 'default',
    guardTags: ['F10'],
    epoch: 1,
    doc: 'references/03-guides/new-page-checklist.md',
    what: 'PAGE_REGISTRY と PAGE_COMPONENT_MAP が整合している',
    why: 'ページメタデータの不整合はナビゲーション・breadcrumb の不具合を招く',
    correctPattern: {
      description:
        'PAGE_REGISTRY にメタデータを追加し、routes.tsx の PAGE_COMPONENT_MAP と一致させる',
    },
    outdatedPattern: { description: 'PAGE_REGISTRY なしでページを追加する' },
    decisionCriteria: {
      when: '新規ページを追加するとき',
      exceptions: '例外なし',
      escalation: 'PAGE_REGISTRY と routes.tsx の PAGE_COMPONENT_MAP を両方更新',
    },
    detection: { type: 'co-change', severity: 'gate' },
    migrationPath: {
      steps: ['1. PAGE_REGISTRY にエントリ追加', '2. routes.tsx の PAGE_COMPONENT_MAP と整合確認'],
      effort: 'trivial',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'debt',
    slice: 'layer-boundary',
    id: 'AR-STRUCT-PRES-ISOLATION',
    principleRefs: ['A3', 'H4', 'B2'],
    ruleClass: 'default',
    guardTags: ['A3', 'B2'],
    epoch: 1,
    what: 'presentation 層は描画専用。infrastructure 直接アクセスや JS/SQL 二重実装を禁止',
    why: 'presentation にデータ取得が混入すると責務が曖昧になりテストが困難になる',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'application/ の hook 経由でデータを取得。SQL は infrastructure 層に閉じる',
    },
    outdatedPattern: { description: 'presentation/ から DuckDB クエリを直接実行する' },
    decisionCriteria: {
      when: 'presentation/ でデータ取得したいとき',
      exceptions: '例外なし',
      escalation: 'application/hooks/ の hook 経由',
    },
    relationships: {
      dependsOn: ['AR-A1-PRES-INFRA'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. infrastructure/ への直接 import を削除',
        '2. application/hooks/ の hook 経由に変更',
      ],
      effort: 'small',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-STRUCT-PURITY',
    principleRefs: ['A2', 'C2', 'A6'],
    ruleClass: 'invariant',
    guardTags: ['A2', 'B1', 'C3', 'A6', 'B3', 'D3'],
    epoch: 1,
    what: 'domain/ は純粋（副作用なし・async なし）、率は domain で算出',
    why: 'domain の純粋性はテスト容易性・移植性・正確性の基盤',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'domain/ は同期純粋関数のみ。async/副作用は application 層に置く',
    },
    outdatedPattern: { description: 'domain/ に async 関数や副作用を含む' },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
      enables: [
        'AR-PATH-GROSS-PROFIT',
        'AR-PATH-FACTOR-DECOMPOSITION',
        'AR-PATH-PI-VALUE',
        'AR-PATH-CUSTOMER-GAP',
      ],
    },
    detection: { type: 'must-not-coexist', severity: 'gate' },
    decisionCriteria: {
      when: 'domain/ に async 関数や外部 API 呼び出しを追加しようとしたとき',
      exceptions: '例外なし。domain/ は純粋でなければならない',
      escalation: 'async は application/ に、外部 API は infrastructure/ に配置する',
    },
    migrationPath: {
      steps: [
        '1. async を application 層に移動',
        '2. 副作用を infrastructure 層に移動',
        '3. domain は純粋関数のみに',
      ],
      effort: 'medium',
      priority: 1,
    },
    protectedHarm: { prevents: ['domain に副作用が混入', '計算の再現性喪失', 'WASM 移行の阻害'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  {
    fixNow: 'debt',
    slice: 'query-runtime',
    id: 'AR-STRUCT-QUERY-PATTERN',
    principleRefs: ['H1', 'H3', 'H5'],
    ruleClass: 'default',
    guardTags: ['H2', 'H3', 'H4', 'H5'],
    epoch: 1,
    doc: 'references/01-principles/safe-performance-principles.md',
    what: 'クエリは正規化入力・pair/bundle 契約・handler 経由で実行する',
    why: 'クエリパターンの統一は保守性とキャッシュの一貫性を保証する',
    correctPattern: { description: 'QueryHandler + useQueryWithHandler 経由。input は正規化必須' },
    outdatedPattern: { description: 'コンポーネント内で直接クエリを組み立て実行する' },
    decisionCriteria: {
      when: 'DuckDB クエリを追加・変更するとき',
      exceptions: '例外なし。全クエリは QueryHandler + useQueryWithHandler 経由',
      escalation: 'コンポーネントで直接クエリを組み立てていたら handler に移行',
    },
    relationships: {
      dependsOn: ['AR-A1-PRES-INFRA'],
      enables: [
        'AR-STRUCT-ANALYSIS-FRAME',
        'AR-STRUCT-COMPARISON-SCOPE',
        'AR-STRUCT-TEMPORAL-SCOPE',
      ],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. クエリ実行を QueryHandler に移行',
        '2. useQueryWithHandler 経由に変更',
        '3. input 正規化を追加',
      ],
      effort: 'medium',
      priority: 2,
    },
    protectedHarm: { prevents: ['クエリ入力の不正規化', 'キャッシュの不整合', '比較結果の不一致'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'layer-boundary',
    id: 'AR-STRUCT-RENDER-SIDE-EFFECT',
    principleRefs: ['A3'],
    ruleClass: 'default',
    guardTags: ['A3', 'H4'],
    epoch: 1,
    doc: 'references/01-principles/design-principles.md',
    what: 'presentation/ は localStorage/sessionStorage を直接使用しない',
    why: 'ストレージ操作は副作用であり presentation 層の責務外',
    correctPattern: { description: 'uiPersistenceAdapter 経由でストレージにアクセスする' },
    outdatedPattern: {
      description: 'localStorage.getItem / sessionStorage.setItem を直接呼ぶ',
      codeSignals: ['localStorage.', 'sessionStorage.'],
    },
    decisionCriteria: {
      when: 'presentation/ でストレージにアクセスしたいとき',
      exceptions: '例外なし',
      escalation: 'uiPersistenceAdapter 経由',
    },
    relationships: {
      dependsOn: ['AR-A1-PRES-INFRA'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. localStorage/sessionStorage の直接呼び出しを削除',
        '2. uiPersistenceAdapter 経由に変更',
      ],
      effort: 'small',
      priority: 2,
    },
    protectedHarm: { prevents: ['描画時のストレージ副作用', 'SSR 互換性の喪失'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  // ─── 責務分離ルール（旧 AR-STRUCT-RESP-SEPARATION を 7 分割） ─

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-STORE-COUPLING',
    principleRefs: ['A3', 'C1'],
    ruleClass: 'default',
    guardTags: ['G8'],
    epoch: 1,
    what: 'presentation 層で getState() を直接呼ばない（P2）',
    why: 'Store への直接結合は描画層の独立性を破壊する',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: { description: 'Zustand selector hook または callback props 経由でアクセス' },
    outdatedPattern: {
      description: 'useDataStore.getState() / useUiStore.getState() の直接呼び出し',
    },
    decisionCriteria: {
      when: 'presentation 層から store のデータや action が必要なとき',
      exceptions: 'allowlists/responsibility.ts presentationGetStateLimits に登録可能',
      escalation: 'callback props パターンまたは Zustand selector に変更',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. getState() 呼び出しを特定',
        '2. Zustand selector (useStore(s => s.action)) に置換',
        '3. 複数 action は親コンポーネントで callback にまとめる',
      ],
      effort: 'small',
      priority: 2,
    },
    protectedHarm: { prevents: ['presentation 層の store 直接結合', 'テスト困難な副作用'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-MODULE-STATE',
    principleRefs: ['C1', 'G8'],
    ruleClass: 'default',
    guardTags: ['G8'],
    epoch: 1,
    what: 'module-scope let（グローバル変数）を禁止する（P7）',
    why: 'module-scope の可変状態はテスト困難で副作用の温床',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: { description: 'const object / WeakMap / useRef / Zustand store' },
    outdatedPattern: { description: 'let _cache = null; let _initialized = false;' },
    decisionCriteria: {
      when: 'モジュールレベルでキャッシュやフラグが必要なとき',
      exceptions: 'allowlists/responsibility.ts moduleScopeLetLimits に登録可能',
      escalation: 'const { cache: null } パターンまたは Zustand atom に変更',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. module-scope let を特定',
        '2. const object パターンに変換: const holder = { value: null }',
        '3. React 内なら useRef、永続なら Zustand store',
      ],
      effort: 'small',
      priority: 3,
    },
    protectedHarm: { prevents: ['グローバル変数の散在', 'テスト間の状態リーク'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-HOOK-COMPLEXITY',
    principleRefs: ['C1', 'C8', 'G5'],
    ruleClass: 'heuristic',
    guardTags: ['G8'],
    epoch: 1,
    what: 'useMemo + useCallback の合計を上限以下に保つ（P8）',
    why: 'hook の合計数は責務の複雑性を示す。12 を超えたら分割候補',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: { description: 'sub-hook 抽出で合計 ≤12。thin wrapper は plain function 化' },
    outdatedPattern: { description: 'useMemo + useCallback が 12 を超えるコンポーネント/hook' },
    decisionCriteria: {
      when: 'useMemo/useCallback を追加して合計が 12 に近づいたとき',
      exceptions: 'allowlists/complexity.ts combinedHookComplexityLimits に登録可能',
      escalation: 'useWeatherDaySelection のような sub-hook に関連 hooks を抽出',
    },
    detection: { type: 'count', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. useMemo + useCallback の合計を計測',
        '2. thin wrapper useCallback を plain function 化',
        '3. 関連する state + handler を sub-hook に抽出',
      ],
      effort: 'medium',
      priority: 3,
    },
    protectedHarm: { prevents: ['God Hook の発生', 'レンダリング依存配列の爆発'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-FEATURE-COMPLEXITY',
    principleRefs: ['C1', 'G5'],
    ruleClass: 'heuristic',
    guardTags: ['G8'],
    epoch: 1,
    what: 'features/ の useMemo/useState を上限以下に保つ（P10）',
    why: 'feature hook の複雑性を制御し、責務の肥大化を防ぐ',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: {
      description: 'useMemo ≤7 / useState ≤6。超えたら builder 抽出 or useReducer',
    },
    outdatedPattern: { description: 'features/ 内で useMemo/useState が上限を超えるファイル' },
    decisionCriteria: {
      when: 'features/ の hook に useMemo/useState を追加するとき',
      exceptions: 'allowlists/complexity.ts featuresMemoLimits / featuresStateLimits に登録可能',
      escalation: 'useMemo → builder 関数抽出。useState → useReducer 統合',
    },
    detection: { type: 'count', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. features/ の useMemo/useState 数を計測',
        '2. 関連する useMemo を 1 つに統合（destructuring で分配）',
        '3. 関連する useState を useReducer に統合',
      ],
      effort: 'small',
      priority: 3,
    },
    protectedHarm: { prevents: ['feature hook の責務肥大化'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-EXPORT-DENSITY',
    principleRefs: ['C1', 'C8'],
    ruleClass: 'heuristic',
    guardTags: ['G8'],
    epoch: 1,
    what: 'domain/models/ の export 数を上限以下に保つ（P12）',
    why: 'export 過多はモデルの責務混在を示す。型と操作を分離すべき',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: { description: 'export ≤8。超えたら操作関数を別ファイルに分離' },
    outdatedPattern: { description: 'domain/models/ で export が 8 を超えるファイル' },
    decisionCriteria: {
      when: 'domain/models/ に export を追加するとき',
      exceptions: 'allowlists/responsibility.ts domainModelExportLimits に登録可能',
      escalation: 'DiscountEntry.ts / AsyncStateFactories.ts のようにファイル分割',
    },
    detection: { type: 'count', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. export 数を計測',
        '2. 操作関数（builder/aggregator）を別ファイルに抽出',
        '3. 型定義のみを元ファイルに残す',
      ],
      effort: 'small',
      priority: 3,
    },
    protectedHarm: { prevents: ['モデルの責務肥大化', '変更理由の複数化'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-NORMALIZATION',
    principleRefs: ['C1', 'G8'],
    ruleClass: 'heuristic',
    guardTags: ['G8'],
    epoch: 1,
    what: 'storeIds 正規化パターンの散在を上限以下に保つ（P17）',
    why: '正規化ロジックの重複はデータ不整合の温床',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: { description: '正規化は集約モジュールで一元管理' },
    outdatedPattern: { description: 'storeIds 正規化が複数ファイルにコピーされている' },
    decisionCriteria: {
      when: 'storeIds の正規化が必要なとき',
      exceptions: '散在ファイル数が STORE_IDS_NORMALIZATION_MAX_FILES 以下',
      escalation: '正規化を共通ユーティリティに集約',
    },
    detection: { type: 'count', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. 散在ファイルを特定', '2. 共通ユーティリティに集約'],
      effort: 'medium',
      priority: 4,
    },
    protectedHarm: { prevents: ['正規化ロジックの重複', 'データ不整合'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-RESP-FALLBACK-SPREAD',
    principleRefs: ['C1', 'G8'],
    ruleClass: 'heuristic',
    guardTags: ['G8'],
    epoch: 1,
    what: 'fallback 定数密度を上限以下に保つ（P18）',
    why: 'ZERO_/EMPTY_/IDLE_ 定数の散在は初期値管理の責務分散を示す',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: {
      description: 'ファイルあたり ≤7。超えたらローカルエイリアスまたは共通モジュールに集約',
    },
    outdatedPattern: { description: 'DUMMY_/EMPTY_/ZERO_/IDLE_ が 7 を超えるファイル' },
    decisionCriteria: {
      when: 'fallback 定数を追加するとき',
      exceptions: 'allowlists/responsibility.ts fallbackConstantDensityLimits に登録可能',
      escalation: 'ローカルエイリアス化（const zeroPair = ZERO_COST_PRICE_PAIR）',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: [
        '1. ZERO_/EMPTY_ パターンの出現数を計測',
        '2. 重複定数をローカルエイリアスに置換',
        '3. 共通定数は application/constants/ に集約',
      ],
      effort: 'small',
      priority: 3,
    },
    protectedHarm: { prevents: ['初期値管理の責務分散', 'fallback 忘れによるランタイムエラー'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'canonicalization',
    id: 'AR-STRUCT-STORE-RESULT-INPUT',
    principleRefs: ['B1'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    doc: 'references/01-principles/customer-definition.md',
    what: 'StoreResult.totalCustomers を分析入力に使わない（CustomerFact を使う）',
    why: 'StoreResult の totalCustomers は表示用集計値であり分析精度が異なる',
    correctPattern: { description: 'readCustomerFact() から CustomerFact を取得して分析に使う' },
    outdatedPattern: { description: 'StoreResult.totalCustomers を分析・計算の入力に使用する' },
    decisionCriteria: {
      when: '分析で客数が必要なとき',
      exceptions: '表示用途のみ StoreResult.totalCustomers 許容',
      escalation: '分析には readCustomerFact() を使用',
    },
    relationships: {
      dependsOn: ['AR-PATH-CUSTOMER'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. StoreResult.totalCustomers の参照を削除', '2. readCustomerFact() に置き換え'],
      effort: 'small',
      priority: 2,
    },
    sunsetCondition: 'StoreResult.totalCustomers が削除された',
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  // ─── 構造規約ルール（旧 AR-STRUCT-CONVENTION を 3 分割） ──────

  {
    fixNow: 'debt',
    slice: 'governance-ops',
    id: 'AR-CONVENTION-BARREL',
    principleRefs: ['F1', 'F9'],
    ruleClass: 'default',
    guardTags: ['F1', 'F9'],
    epoch: 1,
    what: 'バレルは re-export のみ。ロジック・計算・副作用を含まない',
    why: 'バレルにロジックが混入すると import 解決と tree-shaking が崩壊する',
    doc: 'references/03-guides/coding-conventions.md',
    correctPattern: { description: 'export { foo } from "./foo" のみ' },
    outdatedPattern: { description: 'バレルファイルに関数定義や計算ロジックが含まれている' },
    decisionCriteria: {
      when: 'バレルファイル（index.ts）を変更するとき',
      exceptions: 'type re-export は許容',
      escalation: 'ロジックを専用ファイルに抽出し re-export のみにする',
    },
    detection: { type: 'must-only', severity: 'gate' },
    migrationPath: {
      steps: ['1. バレルから関数/const 定義を別ファイルに移動', '2. re-export に置き換え'],
      effort: 'small',
      priority: 2,
    },
    protectedHarm: { prevents: ['import 解決の循環', 'tree-shaking 崩壊'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'governance-ops',
    id: 'AR-CONVENTION-FEATURE-BOUNDARY',
    principleRefs: ['F4'],
    ruleClass: 'default',
    guardTags: ['F4'],
    epoch: 1,
    what: 'feature 間の直接依存を禁止。shared/ 経由のみ',
    why: 'feature 間の直接依存は topology を崩壊させ循環依存の温床になる',
    doc: 'references/03-guides/coding-conventions.md',
    correctPattern: { description: 'features/A → shared/ → features/B' },
    outdatedPattern: { description: 'features/ 配下が別の features/ を直接 import' },
    decisionCriteria: {
      when: 'feature モジュール間でコードを共有するとき',
      exceptions: '例外なし。必ず shared/ に共通化する',
      escalation: '共通コードを shared/ に抽出',
    },
    detection: { type: 'import', severity: 'gate' },
    migrationPath: {
      steps: ['1. features/ 間の直接 import を特定', '2. 共通部分を shared/ に抽出'],
      effort: 'medium',
      priority: 2,
    },
    protectedHarm: { prevents: ['feature 間の循環依存', 'topology 崩壊'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'debt',
    slice: 'governance-ops',
    id: 'AR-CONVENTION-CONTEXT-SINGLE-SOURCE',
    principleRefs: ['F2', 'F3', 'F6'],
    ruleClass: 'default',
    guardTags: ['F2', 'F3', 'F6'],
    epoch: 1,
    what: 'ctx 提供データの独自取得を禁止。コンテキストから受け取る',
    why: 'ウィジェットが ctx の提供データを独自に取得するとデータの不一致が生じる',
    doc: 'references/03-guides/coding-conventions.md',
    correctPattern: { description: 'ctx.result / ctx.prevYear 等を使う' },
    outdatedPattern: {
      description: 'ウィジェットが ctx 提供済みデータの hook を独自に呼び出している',
    },
    decisionCriteria: {
      when: 'ウィジェットやチャートがデータを必要とするとき',
      exceptions: 'ctx に含まれないデータのみ独自取得可',
      escalation: 'ctx に必要なデータを追加し ctx 経由で受け取る',
    },
    detection: { type: 'regex', severity: 'gate' },
    migrationPath: {
      steps: ['1. 独自 hook 呼び出しを特定', '2. ctx に同等データがあれば ctx 経由に変更'],
      effort: 'small',
      priority: 3,
    },
    protectedHarm: { prevents: ['データの不一致', 'キャッシュの二重管理'] },
    reviewPolicy: { owner: 'solo-maintainer', lastReviewedAt: '2026-04-08', reviewCadenceDays: 90 },
  },

  {
    fixNow: 'review',
    slice: 'query-runtime',
    id: 'AR-STRUCT-TEMPORAL-ROLLING',
    principleRefs: ['H1'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    doc: 'references/03-guides/temporal-analysis-policy.md',
    what: 'ローリング計算パスの逆流を禁止（UI/hooks/comparison への逆流なし）',
    why: 'temporal ロジックの逆流はデータフローの一方向性を破壊する',
    correctPattern: { description: 'temporal 計算は一方向。結果は hook 経由で消費のみ' },
    outdatedPattern: { description: 'temporal 計算結果を UI や比較ロジックに逆流させる' },
    decisionCriteria: {
      when: 'temporal 計算結果を使うとき',
      exceptions: '例外なし',
      escalation: 'hook 経由で結果を消費する。逆流禁止',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-TEMPORAL-SCOPE'],
    },
    detection: { type: 'import', severity: 'gate' },
    migrationPath: {
      steps: ['1. 逆流 import を削除', '2. 結果は hook 経由で受け取る'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'query-runtime',
    id: 'AR-STRUCT-TEMPORAL-SCOPE',
    principleRefs: ['H1'],
    ruleClass: 'default',
    guardTags: ['G1'],
    epoch: 1,
    what: '期間スコープの分離ルール（sameDate/sameDow 混在禁止等）',
    why: '期間スコープの混在は比較結果の信頼性を損なう',
    doc: 'references/01-principles/temporal-scope-semantics.md',
    correctPattern: {
      description: 'sameDate と sameDow は排他。予算比較に alignment を持ち込まない',
    },
    outdatedPattern: { description: 'sameDate と sameDow を同一コンテキストで混在使用する' },
    decisionCriteria: {
      when: '期間比較のクエリ入力を構築するとき',
      exceptions: '例外なし。sameDate と sameDow は排他',
      escalation: '比較モードを確認し、適切なスコープを選択する',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-QUERY-PATTERN'],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. sameDate/sameDow の混在を分離', '2. 比較モードごとに適切なスコープを選択'],
      effort: 'medium',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'now',
    slice: 'layer-boundary',
    id: 'AR-STRUCT-TOPOLOGY',
    principleRefs: ['A1'],
    ruleClass: 'invariant',
    guardTags: ['F4'],
    epoch: 1,
    doc: 'references/01-principles/modular-monolith-evolution.md',
    what: 'src/ 直下は承認済みディレクトリのみ（domain/application/infrastructure/presentation/features/stories/test）',
    why: '未承認ディレクトリの追加は層構造の破壊を招く',
    correctPattern: { description: '新機能は features/<feature>/ に配置。共通は既存 4 層に配置' },
    outdatedPattern: { description: 'src/ 直下に新規ディレクトリを作成する' },
    decisionCriteria: {
      when: 'src/ に新規ディレクトリを作りたいとき',
      exceptions: '例外なし。承認済みディレクトリのみ',
      escalation: 'features/<feature>/ または既存 4 層に配置',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. 新規ディレクトリを features/<feature>/ または既存層に移動'],
      effort: 'trivial',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 90,
    },
  },

  // ── 追加ルール（未参照タグのカバー） ──

  {
    fixNow: 'now',
    slice: 'governance-ops',
    id: 'AR-C7-NO-DUAL-API',
    principleRefs: ['C7'],
    ruleClass: 'default',
    guardTags: ['C7'],
    epoch: 1,
    doc: 'references/01-principles/design-principles.md',
    what: '同義の API を併存させない（1 つの責務に 1 つの API）',
    why: '同じことをする 2 つの関数が存在すると、どちらを使うべきか判断コストが発生する',
    correctPattern: {
      description: '旧 API を @deprecated にして新 API に一本化。併存期間は最短にする',
    },
    outdatedPattern: {
      description: '同じ目的の関数を 2 つ export する（例: getData と fetchData）',
    },
    decisionCriteria: {
      when: '既存機能の代替 API を作りたいとき',
      exceptions: '移行期間中のみ併存許容（@deprecated 付き）',
      escalation: '旧 API の呼び出し元を新 API に移行してから旧を削除',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 旧 API を @deprecated にする',
        '2. 呼び出し元を新 API に移行',
        '3. 旧 API を削除',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'responsibility-separation',
    id: 'AR-C9-HONEST-UNCLASSIFIED',
    principleRefs: ['C9'],
    ruleClass: 'heuristic',
    guardTags: ['C9'],
    epoch: 1,
    what: '正確に分類できないファイルは未分類のまま残す（嘘の分類より正直な未分類）',
    why: '自動推定で全ファイルにタグを振ると「嘘の単一責務」が生まれ、信頼性が損なわれる',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: {
      description: '確信がないファイルには @responsibility を付けない。未分類数を正確に把握する',
    },
    outdatedPattern: { description: '分類のカバレッジを上げるために不正確なタグを付ける' },
    decisionCriteria: {
      when: '@responsibility タグを付けようとするとき',
      exceptions: '確信がある場合のみタグ付け。不明なら未分類のまま残す',
      escalation: '未分類のまま残して UNCLASSIFIED_BASELINE で管理する',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 未分類ファイルを確認',
        '2. 責務が明確なものだけタグ付け',
        '3. 不明なものは未分類のまま残す',
      ],
      effort: 'trivial',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'review',
    slice: 'responsibility-separation',
    id: 'AR-G7-CACHE-BODY',
    principleRefs: ['G7'],
    ruleClass: 'heuristic',
    guardTags: ['G7'],
    epoch: 1,
    doc: 'references/01-principles/cache-responsibility.md',
    what: 'キャッシュコードは本体コード以下に保つ',
    why: 'キャッシュ最適化が本体より複雑になると保守コストが逆転する',
    correctPattern: { description: 'キャッシュ行数 ≤ 本体行数。超えたらキャッシュ戦略を見直す' },
    outdatedPattern: { description: 'キャッシュ制御（invalidation, memo, dedup）が本体より大きい' },
    decisionCriteria: {
      when: 'キャッシュ最適化を追加するとき',
      exceptions: 'パフォーマンス要件が明確な場合は許容',
      escalation: 'キャッシュ行数が本体を超えたら戦略を見直す',
    },
    detection: { type: 'count', severity: 'warn' },
    migrationPath: {
      steps: ['1. キャッシュ行数と本体行数を比較', '2. 超過していたらキャッシュ戦略を簡素化'],
      effort: 'medium',
      priority: 4,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'review',
    slice: 'query-runtime',
    id: 'AR-Q3-CHART-NO-DUCKDB',
    principleRefs: ['Q3', 'A3'],
    ruleClass: 'default',
    guardTags: ['Q3'],
    epoch: 1,
    doc: 'references/01-principles/safe-performance-principles.md',
    what: 'Chart コンポーネントは DuckDB hook を直接 import しない',
    why: 'チャートは描画に専念。データ取得は plan/handler 経由で行う',
    correctPattern: {
      description: 'useWidgetQueryContext / useWidgetDataOrchestrator 経由でデータを受け取る',
    },
    outdatedPattern: {
      description: 'Chart コンポーネントから useDuckDB* hook を直接 import する',
      imports: ['useDuckDB'],
    },
    decisionCriteria: {
      when: 'Chart コンポーネントでデータ取得が必要になったとき',
      exceptions: '例外なし。Chart は描画に専念',
      escalation: 'plan hook または useWidgetQueryContext 経由でデータを受け取る',
    },
    relationships: {
      dependsOn: ['AR-A1-PRES-INFRA'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    migrationPath: {
      steps: ['1. DuckDB hook の import を削除', '2. plan hook 経由でデータを受け取るよう変更'],
      effort: 'small',
      priority: 2,
    },
    protectedHarm: { prevents: ['チャートにデータ取得責務が混入', 'テスト困難化'] },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  {
    fixNow: 'review',
    slice: 'query-runtime',
    id: 'AR-Q4-ALIGNMENT-HANDLER',
    principleRefs: ['Q4'],
    ruleClass: 'default',
    guardTags: ['Q4'],
    epoch: 1,
    doc: 'references/01-principles/safe-performance-principles.md',
    what: 'alignment-aware access は handler/resolver に閉じる',
    why: 'alignment ロジックが散在すると比較結果の一貫性が失われる',
    correctPattern: { description: 'QueryHandler または resolver 内でのみ alignment を処理する' },
    outdatedPattern: { description: 'コンポーネントや hook で直接 alignment を判定する' },
    decisionCriteria: {
      when: '比較データの alignment を処理するとき',
      exceptions: '例外なし',
      escalation: 'handler/resolver 内でのみ alignment を処理',
    },
    relationships: {
      dependsOn: ['AR-STRUCT-QUERY-PATTERN'],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. alignment 判定をコンポーネントから handler に移動'],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 60,
    },
  },

  // ── タグ選択ガイド ──

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-SELECTION-GUIDE',
    principleRefs: ['C8'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'C9'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: '@responsibility タグはファイルの特徴に基づいて正確に選択する',
    why: '不正確なタグは TAG_EXPECTATIONS との不一致を生み、ガードの信頼性を損なう',
    correctPattern: {
      description: 'ファイルの特徴から適切なタグを判定する',
      example: [
        'JSX を返す + チャート描画 → R:chart-view',
        'ECharts option 構築のみ（React なし） → R:chart-option',
        'domain/calculations/ の純粋関数 → R:calculation',
        'use*Plan hook（クエリ入力組み立て） → R:query-plan',
        'useQueryWithHandler 呼び出し → R:query-exec',
        'ブラウザ API ラップ（IntersectionObserver, PWA 等） → R:adapter',
        'Context.Provider + 値提供 → R:context',
        'useReducer の reducer 関数（純粋） → R:reducer',
        'export { } from のみ → R:barrel',
        'データ変換の純粋関数（React なし） → R:transform',
        'useState 主体の状態管理 → R:state-machine',
        '複数 hook の組み立て（useState なし） → R:orchestration',
        'ページコンポーネント（route 先） → R:page',
        'ウィジェット（ダッシュボード部品） → R:widget',
        'フォーム入力処理 → R:form',
        'レイアウト構造（Header, NavBar 等） → R:layout',
        'localStorage/DB 操作 → R:persistence',
        '上記に当てはまらない純粋関数 → R:utility',
      ].join('\n'),
    },
    outdatedPattern: {
      description: 'ファイルの特徴を確認せずに R:utility を付ける（最も多い誤分類パターン）',
    },
    decisionCriteria: {
      when: '新規ファイルに @responsibility タグを付けるとき、または既存タグを見直すとき',
      exceptions: '確信がない場合はタグを付けない（C9: 嘘の分類より正直な未分類）',
      escalation:
        'correctPattern.example の判定テーブルに従う。複数該当する場合は複数タグ（AND）を付ける',
    },
    detection: { type: 'custom', severity: 'warn' },
    migrationPath: {
      steps: [
        '1. ファイルの import を確認（React あり? hooks あり? JSX あり?）',
        '2. correctPattern.example の判定テーブルに照合',
        '3. 該当するタグに変更。複数該当なら AND（分離候補）',
        '4. 確信がなければ未分類のまま残す',
      ],
      effort: 'trivial',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  // ── 責務タグ別の閾値（TAG_EXPECTATIONS 由来） ──

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-CHART-VIEW',
    principleRefs: ['C1', 'C8', 'C4', 'F7'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'G8', 'C4', 'F7'],
    responsibilityTags: ['R:chart-view'],
    epoch: 1,
    what: 'chart-view は描画に専念する。状態・計算を持ちすぎない',
    why: 'チャート描画と状態管理が混在すると変更理由が 2 つになる',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: {
      description: 'useMemo ≤ 4, useCallback ≤ 4, useState ≤ 2, 400 行以内',
    },
    outdatedPattern: {
      description: 'チャートコンポーネント内にデータ取得・状態管理・計算ロジックを混在させる',
    },
    thresholds: { memoMax: 4, callbackMax: 4, stateMax: 2, lineMax: 400 },
    decisionCriteria: {
      when: 'チャートコンポーネントに状態管理やデータ取得を追加したいとき',
      exceptions: 'useMemo ≤ 4, useCallback ≤ 4, useState ≤ 2 の範囲内なら許容',
      escalation:
        '超える場合は use*ChartState hook に状態を抽出し、データ取得は plan hook 経由に変更',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. チャートの状態管理が混在しているか確認',
        '2. 状態管理は use*ChartState hook に抽出',
        '3. データ取得は plan hook 経由に変更',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-CHART-OPTION',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'G8'],
    responsibilityTags: ['R:chart-option'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'chart-option は ECharts オプション構築のみ。React hooks を含まない',
    why: 'オプション構築は純粋関数であるべき。React 依存を持つと再利用性が下がる',
    correctPattern: {
      description: 'useMemo ≤ 2, useCallback = 0, useState = 0, 600 行以内',
    },
    outdatedPattern: {
      description: 'オプション構築ファイルに useState や useCallback を含む',
    },
    thresholds: { memoMax: 2, callbackMax: 0, stateMax: 0, lineMax: 600 },
    decisionCriteria: {
      when: 'チャートオプション構築ファイルに hooks を追加したいとき',
      exceptions: 'useMemo ≤ 2 のみ許容。useState/useCallback は禁止',
      escalation: 'hooks は chart-view 側に配置する',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. useState/useCallback があれば hook に抽出',
        '2. オプション構築は純粋関数として維持',
        '3. React 依存を排除',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-CALCULATION',
    principleRefs: ['A2', 'C2'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'B1', 'C2'],
    responsibilityTags: ['R:calculation'],
    epoch: 1,
    what: 'calculation は純粋関数。React hooks を一切含まない',
    why: '計算ロジックはフレームワーク非依存。テスト容易性と再利用性を保証する',
    doc: 'references/01-principles/engine-boundary-policy.md',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 400 行以内。純粋な入力→出力',
    },
    outdatedPattern: {
      description: '計算ファイルに React hooks や副作用を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 400 },
    decisionCriteria: {
      when: 'domain/calculations/ のファイルに React hooks を追加しようとしたとき',
      exceptions: '例外なし。calculation は純粋関数でなければならない',
      escalation: 'hooks は application 層に移動する',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'must-not-coexist', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. React hooks の import を削除',
        '2. 副作用がある場合は application 層に移動',
        '3. 純粋な入力→出力の関数として維持',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-TRANSFORM',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:transform'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'transform はデータ変換のみ。状態を持たない',
    why: 'データ変換は純粋関数であるべき。状態を持つと副作用が混入する',
    correctPattern: {
      description: 'useMemo ≤ 2, useCallback = 0, useState = 0, 300 行以内',
    },
    outdatedPattern: {
      description: '変換ファイルに useState や副作用を含む',
    },
    thresholds: { memoMax: 2, callbackMax: 0, stateMax: 0, lineMax: 300 },
    decisionCriteria: {
      when: 'データ変換ファイルに state を追加したいとき',
      exceptions: '例外なし。transform は純粋関数',
      escalation: 'state は hook に移動',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. useState があれば hook に抽出', '2. データ変換は純粋関数として維持'],
      effort: 'trivial',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-STATE-MACHINE',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'C3'],
    responsibilityTags: ['R:state-machine'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'state-machine は状態管理に専念する。短く保つ',
    why: '状態管理が肥大化すると状態遷移の追跡が困難になる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 12, useState ≤ 8, 200 行以内',
    },
    outdatedPattern: {
      description: '状態管理ファイルに描画ロジックやデータ取得を混在させる',
    },
    thresholds: { memoMax: 3, callbackMax: 12, stateMax: 8, lineMax: 200 },
    decisionCriteria: {
      when: '状態管理ファイルが 200 行を超えそうなとき',
      exceptions: '例外なし',
      escalation: '状態遷移のみに専念させる。描画ロジックは分離',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. 200 行を超えていたら描画ロジックとの分離を確認', '2. 状態遷移のみに専念させる'],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-QUERY-PLAN',
    principleRefs: ['H1', 'C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'H1'],
    responsibilityTags: ['R:query-plan'],
    epoch: 1,
    doc: 'references/01-principles/safe-performance-principles.md',
    what: 'query-plan はクエリ入力の組み立てのみ。実行しない',
    why: 'クエリの組み立てと実行を分離することで、テスト容易性と再利用性を保証する',
    correctPattern: {
      description: 'useMemo ≤ 5, useCallback = 0, useState = 0, 200 行以内',
    },
    outdatedPattern: {
      description: 'plan ファイル内でクエリを実行する、または状態を持つ',
    },
    thresholds: { memoMax: 5, callbackMax: 0, stateMax: 0, lineMax: 200 },
    decisionCriteria: {
      when: 'plan ファイルにクエリ実行を追加したいとき',
      exceptions: '例外なし。plan は入力の組み立てのみ',
      escalation: '実行は useQueryWithHandler に委譲',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. useState/useCallback があれば別 hook に抽出',
        '2. plan はクエリ入力の組み立てのみに専念',
        '3. 実行ロジックは useQueryWithHandler に委譲',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-QUERY-EXEC',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:query-exec'],
    epoch: 1,
    doc: 'references/03-guides/runtime-data-path.md',
    what: 'query-exec はクエリ実行とキャッシュ管理に専念する',
    why: 'クエリ実行にビジネスロジックが混入すると責務が不明確になる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 1, useState ≤ 1, 300 行以内',
    },
    outdatedPattern: {
      description: 'クエリ実行ファイルに計算ロジックや描画を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 1, stateMax: 1, lineMax: 300 },
    decisionCriteria: {
      when: 'クエリ実行ファイルにビジネスロジックを追加したいとき',
      exceptions: '例外なし',
      escalation: '計算は domain 層に委譲',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. ビジネスロジックが混入していないか確認',
        '2. 計算は domain 層に委譲',
        '3. キャッシュ管理のみに専念',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-WIDGET',
    principleRefs: ['C1', 'H6'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'H6'],
    responsibilityTags: ['R:widget'],
    epoch: 1,
    doc: 'references/03-guides/widget-coordination-architecture.md',
    what: 'widget は通知と表示の統合点。過度に状態を持たない',
    why: 'ウィジェットが状態を持ちすぎると再利用性が下がり、テストが困難になる',
    correctPattern: {
      description: 'useMemo ≤ 4, useCallback ≤ 4, useState ≤ 3, 400 行以内',
    },
    outdatedPattern: {
      description: 'ウィジェット内にデータ取得・計算・状態管理を詰め込む',
    },
    thresholds: { memoMax: 4, callbackMax: 4, stateMax: 3, lineMax: 400 },
    decisionCriteria: {
      when: 'ウィジェットにデータ取得を追加したいとき',
      exceptions: '例外なし',
      escalation: 'plan hook 経由でデータを受け取る',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. データ取得が混在していれば plan hook に抽出',
        '2. 計算ロジックは domain 層に委譲',
        '3. 表示と通知のみに専念',
      ],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-PAGE',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:page'],
    epoch: 1,
    doc: 'references/03-guides/new-page-checklist.md',
    what: 'page は統合点。hooks 数は多いが行数は抑える',
    why: 'ページは子コンポーネントの組み立て。ロジックは hooks に委譲する',
    correctPattern: {
      description: 'useMemo ≤ 8, useCallback ≤ 10, useState ≤ 8, 500 行以内',
    },
    outdatedPattern: {
      description: 'ページ内にインライン計算や長いレンダリングロジックを含む',
    },
    thresholds: { memoMax: 8, callbackMax: 10, stateMax: 8, lineMax: 500 },
    decisionCriteria: {
      when: 'ページファイルが 500 行を超えそうなとき',
      exceptions: '例外なし',
      escalation: '子コンポーネントに分割。ロジックは hook に委譲',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. インライン計算を hook に抽出',
        '2. 長いレンダリングロジックを子コンポーネントに分割',
        '3. ページは組み立てのみ',
      ],
      effort: 'medium',
      priority: 4,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-FORM',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:form'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'form は入力処理に専念する',
    why: 'フォームにビジネスロジックが混入すると変更理由が増える',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 6, useState ≤ 6, 300 行以内',
    },
    outdatedPattern: {
      description: 'フォーム内に計算ロジックやデータ取得を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 6, stateMax: 6, lineMax: 300 },
    decisionCriteria: {
      when: 'フォームにビジネスロジックを追加したいとき',
      exceptions: '例外なし',
      escalation: 'ロジックは hook に抽出',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. ビジネスロジックを hook に抽出', '2. フォームは入力処理に専念'],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-LAYOUT',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:layout'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'layout はレイアウト構造のみ。ビジネスロジックを持たない',
    why: 'レイアウトにロジックが混入すると UI の再構成が困難になる',
    correctPattern: {
      description: 'useMemo ≤ 2, useCallback ≤ 3, useState ≤ 3, 300 行以内',
    },
    outdatedPattern: {
      description: 'レイアウト内にデータ取得や状態管理を含む',
    },
    thresholds: { memoMax: 2, callbackMax: 3, stateMax: 3, lineMax: 300 },
    decisionCriteria: {
      when: 'レイアウトにデータ取得を追加したいとき',
      exceptions: '例外なし',
      escalation: 'hook に抽出',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. データ取得や状態管理が混在していれば hook に抽出', '2. レイアウトは構造のみ'],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-ORCHESTRATION',
    principleRefs: ['C6'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'C6'],
    responsibilityTags: ['R:orchestration'],
    epoch: 1,
    doc: 'references/03-guides/runtime-data-path.md',
    what: 'orchestration は hook の組み立てのみ。状態を直接持たない',
    why: 'オーケストレーションが状態を持つと facade が God Object 化する',
    correctPattern: {
      description: 'useMemo ≤ 8, useCallback ≤ 2, useState = 0, 300 行以内',
    },
    outdatedPattern: {
      description: 'オーケストレーション hook 内で useState や副作用を直接管理する',
    },
    thresholds: { memoMax: 8, callbackMax: 2, stateMax: 0, lineMax: 300 },
    decisionCriteria: {
      when: 'orchestration hook に useState を追加したいとき',
      exceptions: '例外なし。orchestration は組み立てのみ',
      escalation: '状態管理は別 hook に分離',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. useState があれば状態管理 hook に抽出',
        '2. 副作用は呼び出し先に委譲',
        '3. orchestration は hook の組み立てのみ',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-UTILITY',
    principleRefs: ['A2'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'A2'],
    responsibilityTags: ['R:utility'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'utility は純粋関数。React hooks を一切含まない',
    why: 'ユーティリティはフレームワーク非依存。どの層からも安全に呼べる',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 300 行以内',
    },
    outdatedPattern: {
      description: 'ユーティリティに React hooks や副作用を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 300 },
    decisionCriteria: {
      when: 'utility ファイルに React hooks を追加したいとき',
      exceptions: '例外なし。utility は純粋関数',
      escalation: 'R:utility → R:orchestration にタグ変更するか hooks を別ファイルに抽出',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'must-not-coexist', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. React hooks を使っているなら R:utility → R:orchestration にタグ変更',
        '2. hooks を使わない純粋関数なら hooks を別ファイルに抽出',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-CONTEXT',
    principleRefs: ['C1', 'F6'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:context'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'context は値の提供のみ。過度なロジックを持たない',
    why: 'Context Provider が肥大化すると再レンダリング範囲が広がる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 3, useState ≤ 3, 200 行以内',
    },
    outdatedPattern: {
      description: 'Context 内にビジネスロジックや複雑な計算を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 3, stateMax: 3, lineMax: 200 },
    decisionCriteria: {
      when: 'Context にロジックを追加したいとき',
      exceptions: '例外なし',
      escalation: 'ロジックは hook に抽出。Context は値の提供のみ',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. ビジネスロジックを hook に抽出', '2. Context は値の提供のみ'],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-PERSISTENCE',
    principleRefs: ['C1'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:persistence'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'persistence は永続化操作に専念する',
    why: '永続化にビジネスロジックが混入するとデータ層の責務が不明確になる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 6, useState ≤ 6, 300 行以内',
    },
    outdatedPattern: {
      description: '永続化ファイルに計算ロジックや UI 制御を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 6, stateMax: 6, lineMax: 300 },
    decisionCriteria: {
      when: '永続化ファイルに計算を追加したいとき',
      exceptions: '例外なし',
      escalation: '計算は domain 層に委譲',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. 計算ロジックを domain 層に抽出', '2. 永続化操作に専念'],
      effort: 'small',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-ADAPTER',
    principleRefs: ['C1', 'A4'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'A4'],
    responsibilityTags: ['R:adapter'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'adapter は外部 API との変換のみ。小さく保つ',
    why: 'アダプタが肥大化すると外部依存の影響範囲が広がる',
    correctPattern: {
      description: 'useMemo ≤ 1, useCallback ≤ 2, useState ≤ 1, 200 行以内',
    },
    outdatedPattern: {
      description: 'アダプタにビジネスロジックや状態管理を含む',
    },
    thresholds: { memoMax: 1, callbackMax: 2, stateMax: 1, lineMax: 200 },
    decisionCriteria: {
      when: 'アダプタにビジネスロジックを追加したいとき',
      exceptions: '例外なし',
      escalation: 'ロジックは呼び出し元に移動',
    },
    detection: { type: 'count', severity: 'gate' },
    migrationPath: {
      steps: ['1. ビジネスロジックを抽出', '2. 外部 API との変換のみに専念'],
      effort: 'trivial',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-REDUCER',
    principleRefs: ['C2'],
    ruleClass: 'heuristic',
    guardTags: ['C8'],
    responsibilityTags: ['R:reducer'],
    epoch: 1,
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    what: 'reducer は純粋な状態遷移関数。hooks を含まない',
    why: 'reducer は (state, action) => state の純粋関数であるべき',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 200 行以内',
    },
    outdatedPattern: {
      description: 'reducer に React hooks や副作用を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 200 },
    decisionCriteria: {
      when: 'reducer に hooks を追加したいとき',
      exceptions: '例外なし。reducer は純粋関数',
      escalation: 'hooks は hook ファイルに分離',
    },
    relationships: {
      dependsOn: ['AR-A1-DOMAIN'],
    },
    detection: { type: 'must-not-coexist', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. React hooks が混入していれば別ファイルに抽出',
        '2. reducer は (state, action) => state のみ',
      ],
      effort: 'trivial',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  {
    fixNow: 'debt',
    slice: 'responsibility-separation',
    id: 'AR-TAG-BARREL',
    principleRefs: ['F1'],
    ruleClass: 'heuristic',
    guardTags: ['C8', 'F1'],
    responsibilityTags: ['R:barrel'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'barrel は re-export のみ。ロジックを含まない',
    why: 'バレルにロジックが混入すると import 解決が複雑化し tree-shaking を阻害する',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 50 行以内。export 文のみ',
    },
    outdatedPattern: {
      description: 'バレルに関数定義や変数宣言を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 50 },
    decisionCriteria: {
      when: 'barrel にロジックを追加したいとき',
      exceptions: '例外なし。barrel は re-export のみ',
      escalation: 'ロジックは別ファイルに移動',
    },
    relationships: {
      conflicts: ['AR-TAG-CALCULATION'],
    },
    detection: { type: 'must-only', severity: 'gate' },
    migrationPath: {
      steps: ['1. 関数定義や変数宣言を別ファイルに移動', '2. barrel は export 文のみに'],
      effort: 'trivial',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-08',
      reviewCadenceDays: 45,
    },
  },

  // ── 文書品質（governance-ops） ────────────────────────────────

  {
    id: 'AR-DOC-STATIC-NUMBER',
    principleRefs: ['G1'],
    ruleClass: 'default',
    guardTags: ['G1', 'F8'],
    slice: 'governance-ops',
    fixNow: 'now',
    epoch: 1,
    doc: 'references/01-principles/adaptive-architecture-governance.md',
    what: '文書中のハードコード数値は generated section か例外リストで管理する',
    why: '静的数値は code と乖離して嘘になる。drift を機械的に検出する',
    correctPattern: {
      description: '件数は generated section から自動埋め込み。例外は理由付きで EXCEPTIONS に登録',
    },
    outdatedPattern: {
      description: '文書に「N ルール」「N テスト」等をハードコードする',
      codeSignals: ['ルール', 'テスト', 'ガード', 'KPI'],
    },
    decisionCriteria: {
      when: '文書にルール数やテスト数を書きたいとき',
      exceptions:
        'バージョン履歴のスナップショット、設計原則の定義（C1: 1ファイル=1変更理由）、構造定義（4層/5スライス）',
      escalation: 'generated section に寄せるか EXCEPTIONS に理由付きで登録',
    },
    detection: { type: 'regex', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 数値を generated section に移動するか、件数を除去して定性表現に変更',
        '2. 除去できない場合は EXCEPTIONS に理由付きで追加',
      ],
      effort: 'trivial',
      priority: 3,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-09',
      reviewCadenceDays: 90,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // Pipeline Safety — データパイプラインの壊れ方を定義し機械的に防ぐ
  // ═══════════════════════════════════════════════════════════

  {
    id: 'AR-SAFETY-SILENT-CATCH',
    principleRefs: ['G2', 'G3'],
    guardTags: ['G2', 'G3'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/design-principles.md',
    what: 'catch ブロックでエラーを握り潰さない（ログなし catch 禁止）',
    why: 'サイレント catch はエラーを不可視にし、データ不正やUI欠落の原因を追跡不能にする',
    correctPattern: {
      description: 'catch 内で console.warn/error + エラー状態の伝播。または上位に re-throw',
      example: `.catch((err) => { console.warn('[context]:', err); setError(err) })`,
    },
    outdatedPattern: {
      description: 'エラーを無視する catch: 空 catch、コメントのみ catch、default 値返却のみ',
      codeSignals: ['.catch(() =>', 'catch {', 'catch ('],
    },
    detection: { type: 'regex', severity: 'warn', baseline: 8 },
    migrationPath: {
      steps: [
        '1. catch 内に console.warn("[コンテキスト]:", err) を追加',
        '2. データに影響する場合は error 状態を UI に伝播',
      ],
      effort: 'trivial',
      priority: 2,
    },
    decisionCriteria: {
      when: 'try-catch または .catch() を書くとき',
      exceptions: 'preload 失敗等の非クリティカル。ただしログは必須',
      escalation: 'エラーが「何のデータに影響するか」を考え、影響があるなら UI に伝播',
    },
    protectedHarm: {
      prevents: [
        'エラー原因の追跡不能',
        'KPIカード消滅（readModels silent failure の再発）',
        'DB 破損の未検出',
      ],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 30,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },

  {
    id: 'AR-SAFETY-FIRE-FORGET',
    principleRefs: ['G2'],
    guardTags: ['G2'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/design-principles.md',
    what: 'データ保存 Promise を fire-and-forget しない',
    why: '保存失敗がサイレントだと、ユーザーは保存されたと思い込み次回起動時にデータ消失する',
    correctPattern: {
      description: 'await で完了を待つ。失敗時は UI に通知。非クリティカルなら明示コメント',
    },
    outdatedPattern: {
      description: 'repo.save().catch(console.warn) のように await なしで Promise を放置',
      codeSignals: ['.catch((e) =>', '.catch(() =>'],
    },
    detection: { type: 'regex', severity: 'warn', baseline: 4 },
    migrationPath: {
      steps: [
        '1. Promise を await し失敗を検知可能にする',
        '2. 非クリティカルなら "// non-critical: ..." コメントで意図を明示',
      ],
      effort: 'small',
      priority: 3,
    },
    decisionCriteria: {
      when: 'リポジトリ保存、キャッシュ書き込みの Promise を扱うとき',
      exceptions: 'Parquet キャッシュ等の非クリティカル保存。ただしコメント必須',
      escalation: '「この保存が失敗したらユーザーは何を失うか」で判断',
    },
    protectedHarm: {
      prevents: ['インポート履歴のサイレント消失', 'キャッシュ保存失敗による性能劣化'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 30,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },

  {
    id: 'AR-SAFETY-NULLABLE-ASYNC',
    principleRefs: ['G2', 'E4'],
    guardTags: ['G2'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/design-principles.md',
    what: '非同期データに ?? 0 を使わない（loading/error/empty の区別を消さない）',
    why: '?? 0 は「取得中」「失敗」「0件」を区別できず、ユーザーに嘘のデータを見せる',
    correctPattern: {
      description: 'ReadModelSlice の status チェック、または isLoading/error の明示的分岐',
      example: "cf?.status === 'ready' ? cf.data.grandTotalCustomers : ctx.result.totalCustomers",
    },
    outdatedPattern: {
      description: 'readModels?.model?.field ?? 0 で非同期の null を 0 に潰す',
      codeSignals: ['?? 0', '|| 0'],
    },
    detection: { type: 'regex', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. ReadModelSlice の status === "ready" チェックを追加',
        '2. loading → skeleton、error → fallback + 警告、idle → StoreResult フォールバック',
      ],
      effort: 'small',
      priority: 1,
    },
    decisionCriteria: {
      when: 'DuckDB クエリ結果、readModels など非同期データを消費するとき',
      exceptions: 'domain/calculations/ 内の純粋計算（同期データのデフォルト値）',
      escalation: '「このデータが null のとき、0 を表示して正しいか」で判断',
    },
    protectedHarm: {
      prevents: ['KPIカードのサイレント消滅（今回のバグの根本原因）', '月遷移時の stale data 表示'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 30,
    },
  },

  {
    id: 'AR-SAFETY-VALIDATION-ENFORCE',
    principleRefs: ['E1', 'G2'],
    guardTags: ['E1'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/design-principles.md',
    what: 'バリデーション結果は必ずチェックし、エラー時はデータフローを制御する',
    why: 'バリデーションを呼んでも結果を無視すると、不正データが計算パイプラインに流入する',
    correctPattern: {
      description:
        'hasValidationErrors() でチェックし、error ならデータ保存をブロックまたはユーザー確認',
    },
    outdatedPattern: {
      description: 'validateImportData() を呼ぶが結果を確認せずデータを無条件で保存',
      codeSignals: ['validateImportData', 'validationMessages'],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. finalizeSingleMonth に hasValidationErrors チェックを追加',
        '2. error レベルならデータ保存をブロック',
      ],
      effort: 'small',
      priority: 1,
    },
    decisionCriteria: {
      when: 'データインポート・変換・保存の境界でバリデーションを行うとき',
      exceptions: 'warning レベルのメッセージは表示のみで通過可',
      escalation: '「このバリデーションエラーを無視してデータを使ったら何が壊れるか」で判断',
    },
    protectedHarm: {
      prevents: ['不正 CSV による誤った KPI 計算', '重複レコードによる二重計上'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 30,
    },
  },

  {
    id: 'AR-SAFETY-INSERT-VERIFY',
    principleRefs: ['G2', 'D3'],
    guardTags: ['G2'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/design-principles.md',
    what: 'DuckDB INSERT 後に実投入行数を検証する',
    why: '部分 INSERT 失敗がサイレントだと、集計が不正確になり readModel の数値がずれる',
    correctPattern: {
      description: 'INSERT 後に COUNT(*) で検証。不一致時は throw',
    },
    outdatedPattern: {
      description: 'bulkInsert が rows.length を無検証で返す',
      codeSignals: ['return rows.length'],
    },
    detection: { type: 'custom', severity: 'warn' },
    migrationPath: {
      steps: ['1. bulkInsert に COUNT(*) 検証を追加', '2. 不一致時は throw'],
      effort: 'small',
      priority: 2,
    },
    decisionCriteria: {
      when: 'DuckDB にデータを INSERT するとき',
      exceptions: 'テーブル初期化やスキーマ変更',
      escalation: '「INSERT が半分失敗しても気づけるか」で判断',
    },
    protectedHarm: {
      prevents: ['DuckDB の部分 INSERT による集計不正'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },

  {
    id: 'AR-SAFETY-PROD-VALIDATION',
    principleRefs: ['E1', 'G2'],
    guardTags: ['E1'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/design-principles.md',
    what: 'Zod バリデーションを本番でも有効にする（DEV 限定にしない）',
    why: '本番で型不正データが通過すると、ユーザーに不正な数値が表示されるか UI がクラッシュする',
    correctPattern: {
      description: 'queryToObjects の safeParse を本番でも first-row モードで実行',
    },
    outdatedPattern: {
      description: 'import.meta.env.DEV でガードし本番では Zod バリデーションをスキップ',
      codeSignals: ['import.meta.env.DEV'],
    },
    detection: { type: 'regex', severity: 'warn' },
    migrationPath: {
      steps: [
        '1. queryToObjects の DEV ガードを first-row では除去',
        '2. safeParse 失敗時にドロップ件数を返り値に含める',
      ],
      effort: 'small',
      priority: 3,
    },
    decisionCriteria: {
      when: 'DuckDB クエリ結果を Zod スキーマで検証するとき',
      exceptions: 'all-rows モードは DEV 限定可（性能影響）',
      escalation: '「本番で不正データが通過したら何が壊れるか」で判断',
    },
    protectedHarm: {
      prevents: ['本番での型不正データ通過', 'readModel .parse() クラッシュ'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },

  {
    id: 'AR-SAFETY-WORKER-TIMEOUT',
    principleRefs: ['G2'],
    guardTags: ['G2'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'medium',
    maturity: 'experimental',
    doc: 'references/01-principles/design-principles.md',
    what: 'Worker 通信・ミューテックス取得にタイムアウトを設ける',
    why: 'タイムアウトなしの Promise は Worker ハングやデッドロックで永久待ちになる',
    correctPattern: {
      description: 'Promise.race([operation, timeout(30_000)]) でタイムアウトを強制',
    },
    outdatedPattern: {
      description: 'Worker.postMessage 後にタイムアウトなしで応答を待つ',
      codeSignals: ['new Promise', 'addEventListener'],
    },
    detection: { type: 'custom', severity: 'warn' },
    migrationPath: {
      steps: [
        '1. useWorkerCalculation に 30 秒タイムアウトを追加',
        '2. loadCoordinator.acquireMutex に 30 秒タイムアウトを追加',
      ],
      effort: 'small',
      priority: 4,
    },
    decisionCriteria: {
      when: 'Worker 通信やミューテックス取得で Promise を作るとき',
      exceptions: '即座に完了が保証される同期的な Promise',
      escalation: '「この Promise が resolve されなかったらアプリはどうなるか」で判断',
    },
    protectedHarm: {
      prevents: ['Worker ハングによるアプリ無応答', 'ミューテックスデッドロック'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },

  {
    id: 'AR-SAFETY-STALE-STORE',
    principleRefs: ['G2'],
    guardTags: ['G2'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/design-principles.md',
    what: 'データソース変更時に依存する派生状態をクリアする',
    why: 'ソース変更後に派生状態が前月のまま残ると、ユーザーに前月データが表示される',
    correctPattern: {
      description: 'setCurrentMonthData 時に storeResults を空 Map にクリア',
    },
    outdatedPattern: {
      description: 'データソースを更新するが派生状態をクリアしない',
      codeSignals: ['setCurrentMonthData'],
    },
    detection: { type: 'custom', severity: 'warn' },
    migrationPath: {
      steps: ['1. setCurrentMonthData で storeResults: new Map() を同時にセット'],
      effort: 'trivial',
      priority: 2,
    },
    decisionCriteria: {
      when: 'ストアの source of truth を更新するとき',
      exceptions: '追記的更新（既存データに追加するだけ）',
      escalation: '「前のデータが画面に残ったら問題か」で判断',
    },
    protectedHarm: {
      prevents: ['月遷移時に前月の KPI が一瞬表示される問題'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // Co-Change — 変更の影響範囲を機械的に検出する
  // ═══════════════════════════════════════════════════════════

  {
    id: 'AR-COCHANGE-VALIDATION-SEVERITY',
    principleRefs: ['G1', 'D3'],
    guardTags: ['G1'],
    slice: 'governance-ops',
    fixNow: 'now',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/design-principles.md',
    what: 'バリデーション severity を変更したら対応するテストも更新する',
    why: 'severity を warning → error に変えてもテストが warning を探していると CI が通らず、逆に CI が通ったままテストが無意味になる',
    correctPattern: {
      description:
        'importDataIntegrity.ts の level 変更時に FileImportService.test.ts のアサーションも同時に変更する',
    },
    outdatedPattern: {
      description: 'severity のみ変更してテスト側を追従させない',
      codeSignals: ["level: 'error'", "level: 'warning'"],
    },
    detection: { type: 'co-change', severity: 'warn' },
    decisionCriteria: {
      when: 'importDataIntegrity.ts の level を変更するとき',
      exceptions: '例外なし — テストは常に追従必須',
      escalation: 'テストファイルを grep して同じメッセージ文字列を持つアサーションを更新',
    },
    migrationPath: {
      steps: [
        '1. importDataIntegrity.ts で level を変更',
        '2. FileImportService.test.ts で同じメッセージの level アサーションを更新',
        '3. npx vitest run で確認',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-SAFETY-VALIDATION-ENFORCE'],
    },
    protectedHarm: {
      prevents: ['CI 失敗: テストが旧 severity を期待して不一致'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-COCHANGE-DUCKDB-MOCK',
    principleRefs: ['G1', 'D3'],
    guardTags: ['G1'],
    slice: 'governance-ops',
    fixNow: 'now',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/design-principles.md',
    what: 'DuckDB 関数に conn.query() 呼び出しを追加したら対応テストのモックも更新する',
    why: 'テストモックが新しい query 呼び出しに対応しないと undefined.toArray() でクラッシュする',
    correctPattern: {
      description:
        'bulkInsert 等に query 追加時は dataLoaderPureFunctions.test.ts のモック conn.query を複数回対応に更新する',
    },
    outdatedPattern: {
      description: '本番コードに query を追加してテストモックを更新しない',
      codeSignals: ['conn.query(', 'await conn.query('],
    },
    detection: { type: 'co-change', severity: 'warn' },
    decisionCriteria: {
      when: 'infrastructure/duckdb/ の関数に新しい conn.query() を追加するとき',
      exceptions: '既存テストがない関数（新規追加時）',
      escalation: 'テストの conn モックが新しい query に対応するか確認',
    },
    migrationPath: {
      steps: [
        '1. 本番コードに conn.query() を追加',
        '2. 対応テストのモック conn.query を確認',
        '3. モックが固定値を返す場合は2回目以降の呼び出しに対応させる',
      ],
      effort: 'trivial',
      priority: 1,
    },
    protectedHarm: {
      prevents: ['CI 失敗: モック未対応で undefined.toArray() クラッシュ'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-COCHANGE-READMODEL-PARSE',
    principleRefs: ['G1', 'E1'],
    guardTags: ['G1', 'E1'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/design-principles.md',
    what: 'readModel の parse 方式を変更したらパスガードのアサーションも更新する',
    why: 'パスガードが .parse() の存在を検証しているため、.safeParse() に変えるとガードが失敗する',
    correctPattern: {
      description:
        'readXxx.ts で .parse() → .safeParse() に変更したら xxxPathGuard.test.ts の toContain も同時に更新する',
    },
    outdatedPattern: {
      description: 'parse 方式を変更してパスガードの検証文字列を更新しない',
      codeSignals: ['.parse(', '.safeParse('],
    },
    detection: { type: 'co-change', severity: 'warn' },
    decisionCriteria: {
      when: 'readModel builder の Zod parse メソッドを変更するとき',
      exceptions: '例外なし — パスガードは常に追従必須',
      escalation: 'test/guards/ で対応する PathGuard を検索し toContain を更新',
    },
    migrationPath: {
      steps: [
        '1. readModel builder で .parse() → .safeParse() に変更',
        '2. 対応する PathGuard の toContain アサーションを更新',
        '3. npm run test:guards で確認',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-SAFETY-PROD-VALIDATION'],
    },
    protectedHarm: {
      prevents: ['CI 失敗: パスガードが旧 parse メソッド名を期待して不一致'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },
  // ═══ I: 意味分類 ═══
  // @guard I1 @guard I2 @guard I3 @guard I4

  {
    id: 'AR-TERM-AUTHORITATIVE-STANDALONE',
    principleRefs: ['I1'],
    guardTags: ['I1'],
    slice: 'governance-ops',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/semantic-classification-policy.md',
    what: 'authoritative を単独語で新規使用しない。必ず business-authoritative / analytic-authoritative / candidate-authoritative で修飾する',
    why: 'AI が business と analytic を混同し、意味空間が混線する。単独 authoritative は意味分類の根拠にならない',
    correctPattern: {
      description:
        'authorityKind: business-authoritative / analytic-authoritative / candidate-authoritative を使う',
      example: "authorityKind: 'business-authoritative'",
    },
    outdatedPattern: {
      description: 'authoritative を修飾なしで使用する',
      codeSignals: ['authoritative'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 279 },
    decisionCriteria: {
      when: 'コード・コメント・文書に authoritative を書くとき',
      exceptions:
        'UI の displayMode="authoritative" は別概念として legacy-authoritative-usage (display) で管理',
      escalation: '新規追加は即禁止。既存は ratchet-down で段階削減',
    },
    migrationPath: {
      steps: [
        '1. authoritative-term-sweep.md で対象箇所を確認',
        '2. business / analytic / candidate のどれに該当するか判定',
        '3. 修飾付き形式に書き換え',
      ],
      effort: 'trivial',
      priority: 2,
    },
    relationships: {
      dependsOn: [],
    },
    protectedHarm: {
      prevents: [
        'AI が business-authoritative と analytic-authoritative を区別できず誤実装する',
        '意味空間の混線により current/candidate 管理が崩壊する',
      ],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },
  {
    id: 'AR-CANON-SEMANTIC-REQUIRED',
    principleRefs: ['I2', 'I4'],
    guardTags: ['I2', 'I4'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/01-principles/semantic-classification-policy.md',
    what: 'required エントリは semanticClass 必須。意味分類なしでの新規追加をマージレベルで阻止する',
    why: 'semanticClass 未設定のまま required に昇格すると business/analytic の棚が曖昧になり意味空間が混線する',
    correctPattern: {
      description: "tag: 'required' のエントリには必ず semanticClass + authorityKind を設定する",
      example: "semanticClass: 'business', authorityKind: 'business-authoritative'",
    },
    outdatedPattern: {
      description: "tag: 'required' で semanticClass が undefined のまま",
    },
    detection: { type: 'custom', severity: 'block-merge' },
    decisionCriteria: {
      when: 'domain/calculations/ に新しい required ファイルを追加するとき',
      exceptions: 'なし — required は必ず意味分類する',
      escalation: '分類に迷ったら review-needed にして理由を記載',
    },
    migrationPath: {
      steps: [
        '1. semantic-inventory-procedure.md の Q1-Q8 で判定',
        '2. calculationCanonRegistry に semanticClass + authorityKind を設定',
        '3. npm run test:guards で確認',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-TERM-AUTHORITATIVE-STANDALONE'],
    },
    protectedHarm: {
      prevents: [
        '意味分類なしの required エントリが混入し business/analytic の境界が崩壊する',
        'derived view に未分類エントリが紛れ込み運用が混乱する',
      ],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION',
    principleRefs: ['I2'],
    guardTags: ['I2'],
    slice: 'canonicalization',
    fixNow: 'review',
    ruleClass: 'heuristic',
    confidence: 'medium',
    maturity: 'experimental',
    doc: 'references/01-principles/semantic-classification-policy.md',
    what: 'business と analytic の意味責任を棚として分離する。pure であることは棚の決定基準にしない',
    why: 'AI が pure = 同じ棚と誤解し、業務値決定計算と分析基盤計算を混同する',
    correctPattern: {
      description: 'semanticClass で business / analytic を区別し、derived view で運用分離する',
    },
    outdatedPattern: {
      description: 'pure だからという理由だけで同じ registry view に載せる',
    },
    detection: { type: 'custom', severity: 'warn' },
    decisionCriteria: {
      when: 'domain/calculations/ に新しい pure 計算を追加するとき',
      exceptions: 'utility / presentation は分離対象外',
      escalation: 'semanticClass の判断に迷ったら review-needed にして inventory に記録',
    },
    migrationPath: {
      steps: [
        '1. semantic-inventory-procedure.md の Q1-Q8 で判定',
        '2. calculationCanonRegistry に semanticClass を設定',
        '3. derived view で分離を確認',
      ],
      effort: 'small',
      priority: 2,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 30,
      promoteIf: ['Phase 2 で derived view + guard が安定'],
      withdrawIf: ['意味分類が不要と判断された場合'],
    },
  },

  {
    id: 'AR-CURRENT-CANDIDATE-SEPARATION',
    principleRefs: ['I3'],
    guardTags: ['I3'],
    slice: 'canonicalization',
    fixNow: 'review',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/semantic-classification-policy.md',
    what: 'current（保守対象）と candidate（移行対象）を同じ view / KPI / review 導線で扱わない',
    why: '安定運用資産と実験資産を混ぜると、レビュー基準・進捗管理・rollback が全て濁る',
    correctPattern: {
      description:
        'current view と candidate view を分離し、それぞれ独立した KPI と review 導線を持つ',
    },
    outdatedPattern: {
      description:
        'candidate を current registry に直接追加する、または current を staging area として使う',
    },
    detection: { type: 'custom', severity: 'warn' },
    decisionCriteria: {
      when: 'runtimeStatus を設定するとき、または view に項目を追加するとき',
      exceptions: 'なし — current/candidate 混在は無条件に禁止',
      escalation: '混在が検出されたら即修正',
    },
    migrationPath: {
      steps: [
        '1. current と candidate の view を分離',
        '2. candidate を current registry から除外',
        '3. current に candidate 状態遷移を追加しない',
      ],
      effort: 'small',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 30,
      promoteIf: ['Phase 4 で current/candidate 分離が安定'],
      withdrawIf: ['candidate の概念が不要と判断された場合'],
    },
  },

  // ═══ Phase 3: 契約固定 + bridge 境界 ═══

  {
    id: 'AR-CONTRACT-SEMANTIC-REQUIRED',
    principleRefs: ['I1', 'I2'],
    guardTags: ['I1', 'I2'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/03-guides/contract-definition-policy.md',
    what: 'semanticClass 未設定のまま contractId を追加してはならない',
    why: '契約は意味分類の上に成り立つ。semanticClass なしで契約を付けると business/analytic の境界が曖昧になる',
    correctPattern: {
      description: 'contractId を設定する前に必ず semanticClass + authorityKind を設定する',
      example:
        "semanticClass: 'business', authorityKind: 'business-authoritative', contractId: 'BIZ-001'",
    },
    outdatedPattern: {
      description: 'semanticClass が undefined のまま contractId を設定する',
    },
    detection: { type: 'custom', severity: 'gate' },
    decisionCriteria: {
      when: 'calculationCanonRegistry に contractId を追加するとき',
      exceptions: 'なし — 契約は必ず意味分類の後に付与する',
      escalation: 'semanticClass が決まらないなら contractId も付けない',
    },
    migrationPath: {
      steps: [
        '1. semantic-inventory-procedure.md の Q1-Q8 で semanticClass を判定',
        '2. semanticClass + authorityKind を設定',
        '3. contract-definition-policy.md に従い contractId を採番',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-CANON-SEMANTIC-REQUIRED'],
    },
    protectedHarm: {
      prevents: ['意味分類なしの契約が混入し business/analytic の契約体系が崩壊する'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-CONTRACT-BUSINESS-MEANING',
    principleRefs: ['I2'],
    guardTags: ['I2'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/03-guides/contract-definition-policy.md',
    what: 'Business Contract (BIZ-XXX) には businessMeaning 相当の reason が必須',
    why: '業務意味を説明できない計算を business に分類すると意味空間が汚染される',
    correctPattern: {
      description: "contractId が 'BIZ-' で始まるエントリは reason に業務意味を記載する",
      example: "contractId: 'BIZ-001', reason: '在庫法粗利（calculateGrossProfit 経由）'",
    },
    outdatedPattern: {
      description: 'BIZ-XXX の contractId があるのに reason が空または汎用的すぎる',
    },
    detection: { type: 'custom', severity: 'gate' },
    decisionCriteria: {
      when: 'BIZ-XXX の contractId を registry に追加するとき',
      exceptions: 'なし — business 契約には必ず業務意味を書く',
      escalation: '業務意味を書けないなら business ではなく analytic か utility を検討',
    },
    migrationPath: {
      steps: [
        '1. 対象計算が確定する業務値を 1-2 文で説明',
        '2. reason フィールドに記載',
        '3. contract-definition-policy.md の BIZ 契約一覧と整合確認',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-CONTRACT-SEMANTIC-REQUIRED'],
    },
    protectedHarm: {
      prevents: ['業務意味不明の計算が Business Contract を持ち、分析計算と混同される'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-CONTRACT-ANALYTIC-METHOD',
    principleRefs: ['I2'],
    guardTags: ['I2'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/03-guides/contract-definition-policy.md',
    what: 'Analytic Contract (ANA-XXX) には methodFamily が必須',
    why: 'methodFamily なしの analytic 契約は技法の境界が曖昧になり再利用性が損なわれる',
    correctPattern: {
      description: "contractId が 'ANA-' で始まるエントリは methodFamily を設定する",
      example: "contractId: 'ANA-001', methodFamily: 'time_pattern'",
    },
    outdatedPattern: {
      description: 'ANA-XXX の contractId があるのに methodFamily が未設定',
    },
    detection: { type: 'custom', severity: 'gate' },
    decisionCriteria: {
      when: 'ANA-XXX の contractId を registry に追加するとき',
      exceptions: 'なし — analytic 契約には必ず技法を明記する',
      escalation: 'methodFamily を書けないなら analytic ではなく utility を検討',
    },
    migrationPath: {
      steps: [
        '1. 対象計算の分析技法を特定（forecasting, statistical 等）',
        '2. methodFamily フィールドに設定',
        '3. contract-definition-policy.md の ANA 契約一覧と整合確認',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-CONTRACT-SEMANTIC-REQUIRED'],
    },
    protectedHarm: {
      prevents: ['技法不明の計算が Analytic Contract を持ち、不変条件の検証が不可能になる'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-BRIDGE-RATE-OWNERSHIP',
    principleRefs: ['I1'],
    guardTags: ['I1'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/03-guides/contract-definition-policy.md',
    what: '率の算出は engine 側の責務。UI / VM / SQL で率を再計算してはならない',
    why: '率の二重計算は丸め誤差・不整合を生む。engine が算出した率をそのまま使う',
    correctPattern: {
      description: 'bridge 経由で取得した率をそのまま表示・集計に使う',
      example: 'const rate = bridgeResult.markupRate // engine が算出した値',
    },
    outdatedPattern: {
      description: 'UI / VM / SQL で率を独自計算する（sales / cost で割る等）',
      codeSignals: ['/ cost', '/ sales', '* 100'],
    },
    detection: { type: 'custom', severity: 'gate' },
    decisionCriteria: {
      when: '率・比率を表示するコードを書くとき',
      exceptions: '表示用のフォーマット変換（%表示等）は許容。値の再計算は禁止',
      escalation: '率の所有元が不明な場合は contract-definition-policy.md を参照',
    },
    migrationPath: {
      steps: [
        '1. 率を使用している箇所を特定',
        '2. bridge 経由で取得した値に置き換え',
        '3. 独自計算を削除',
      ],
      effort: 'small',
      priority: 2,
    },
    relationships: {
      dependsOn: [],
    },
    protectedHarm: {
      prevents: ['率の二重計算による丸め誤差・不整合', 'engine と UI で異なる率が表示される'],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-BRIDGE-DIRECT-IMPORT',
    principleRefs: ['I1', 'I2'],
    guardTags: ['I1', 'I2'],
    slice: 'canonicalization',
    fixNow: 'debt',
    ruleClass: 'default',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/03-guides/contract-definition-policy.md',
    what: 'bridge を通さない pure 計算の runtime import を新規追加しない（型参照・テスト除く）',
    why: 'direct import が増えると bridge による current/candidate 切替・fallback・dual-run が機能しなくなる',
    correctPattern: {
      description: 'application/services/*Bridge.ts 経由で pure 計算を呼び出す',
      example: "import { decompose5 } from '@/application/services/factorDecompositionBridge'",
    },
    outdatedPattern: {
      description: 'application / presentation 層から domain/calculations/ を直接 import する',
      imports: ['@/domain/calculations/'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
    decisionCriteria: {
      when: 'pure 計算を呼び出すコードを新規作成するとき',
      exceptions: '型の import（import type）とテストコードは除外',
      escalation: '既存の direct import は ratchet-down で段階削減',
    },
    migrationPath: {
      steps: [
        '1. direct import を特定',
        '2. 対応する bridge 関数に置き換え',
        '3. import パスを bridge に変更',
      ],
      effort: 'small',
      priority: 2,
    },
    relationships: {
      dependsOn: [],
    },
    protectedHarm: {
      prevents: [
        'bridge を迂回した呼び出しにより current/candidate 切替が機能しない',
        'fallback / dual-run の対象外になる計算呼び出しが生まれる',
      ],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-BRIDGE-CANDIDATE-DEFAULT',
    principleRefs: ['I3'],
    guardTags: ['I3'],
    slice: 'canonicalization',
    fixNow: 'now',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'stable',
    doc: 'references/03-guides/contract-definition-policy.md',
    what: 'candidate-only を UI の既定経路にする変更を禁止する',
    why: 'candidate は実験資産。UI の通常運用で candidate を既定にすると安定性が崩壊する',
    correctPattern: {
      description: 'UI の既定経路は current-only。candidate は dual-run-compare で検証してから切替',
    },
    outdatedPattern: {
      description: 'bridge モードを candidate-only に変更して UI の既定動作にする',
    },
    detection: { type: 'custom', severity: 'gate' },
    decisionCriteria: {
      when: 'bridge のモードを変更するとき',
      exceptions: 'テスト・検証環境での candidate-only は許容',
      escalation: 'candidate を既定にしたい場合は Phase 8 の Promote Ceremony を経る',
    },
    migrationPath: {
      steps: [
        '1. bridge モードを current-only に戻す',
        '2. candidate の検証は dual-run-compare で行う',
        '3. promotion-ready 判定を経てから切替',
      ],
      effort: 'trivial',
      priority: 1,
    },
    relationships: {
      dependsOn: ['AR-CURRENT-CANDIDATE-SEPARATION'],
    },
    protectedHarm: {
      prevents: [
        '未検証の candidate が UI の通常運用で使用され品質が崩壊する',
        'rollback が困難になる',
      ],
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
  },

  {
    id: 'AR-REGISTRY-SINGLE-MASTER',
    principleRefs: ['I4'],
    guardTags: ['I4'],
    slice: 'governance-ops',
    fixNow: 'review',
    ruleClass: 'invariant',
    confidence: 'high',
    maturity: 'experimental',
    doc: 'references/01-principles/semantic-classification-policy.md',
    what: 'calculationCanonRegistry を唯一の master registry とし、derived view の手編集を禁止する',
    why: '二重管理を始めると AI がどの registry を信じるべきか迷い、意味分類が崩壊する',
    correctPattern: {
      description: 'master registry からフィルタで derived view を生成し、CI で一致を検証する',
    },
    outdatedPattern: {
      description: 'business / analytic / candidate を別ファイルで独立管理する',
    },
    detection: { type: 'custom', severity: 'warn' },
    decisionCriteria: {
      when: '意味分類の registry や view を新規作成するとき',
      exceptions: 'なし — 正本は1つ',
      escalation: 'master 以外の registry が作成されたら即修正',
    },
    migrationPath: {
      steps: [
        '1. 既存の分類を全て calculationCanonRegistry に集約',
        '2. derived view を master からの自動導出に変更',
        '3. 手編集禁止 guard を追加',
      ],
      effort: 'small',
      priority: 1,
    },
    reviewPolicy: {
      owner: 'solo-maintainer',
      lastReviewedAt: '2026-04-10',
      reviewCadenceDays: 90,
    },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 30,
      promoteIf: ['Phase 2 で master + derived view が安定'],
      withdrawIf: ['正本が別の仕組みに置き換わった場合'],
    },
  },
] as const satisfies readonly ArchitectureRule[]

// ─── Lookup 関数 ─────────────────────────────────────────

const ruleById = new Map(ARCHITECTURE_RULES.map((r) => [r.id, r]))

export function getRuleById(id: string): ArchitectureRule | undefined {
  return ruleById.get(id)
}

export function getRulesByGuardTag(tag: string): readonly ArchitectureRule[] {
  return ARCHITECTURE_RULES.filter((r) => r.guardTags.includes(tag))
}

export function getRulesByDetectionType(type: DetectionType): readonly ArchitectureRule[] {
  return ARCHITECTURE_RULES.filter((r) => r.detection.type === type)
}

export function getRuleByResponsibilityTag(tag: string): ArchitectureRule | undefined {
  return ARCHITECTURE_RULES.find((r) => r.responsibilityTags?.includes(tag))
}

// ─── メッセージフォーマット ──────────────────────────────

/**
 * 違反メッセージを統一フォーマットで生成する。
 * テストの expect メッセージとして使う。
 */
/**
 * ratchet-down チェック: 実測値がベースラインを下回ったら更新を促す。
 * テストの expect 後に呼ぶ。
 */
export function checkRatchetDown(
  rule: ArchitectureRule,
  actual: number,
  baselineKey: string,
): void {
  const baseline = rule.detection.baseline
  if (baseline === undefined) return
  if (actual < baseline) {
    console.log(
      `\n[ratchet-down] ${rule.id}: ${baselineKey} が ${baseline} → ${actual} に減少。` +
        `\narchitectureRules.ts の ${rule.id} の baseline を ${actual} に更新してください。`,
    )
  }
}

/**
 * AAG 標準違反レスポンス生成器
 *
 * 違反時に返す 5 項目:
 * 1. 何が止まったか（what）
 * 2. なぜ止まったか（why）
 * 3. 今やること（migrationPath.steps）
 * 4. 例外がありうるか（decisionCriteria.exceptions）
 * 5. 深掘り先（doc）
 *
 * @see references/01-principles/aag-four-layer-architecture.md
 */
export function formatViolationMessage(
  rule: ArchitectureRule,
  violations: readonly string[],
): string {
  // AAG 統一レスポンス経由で出力（全入口共通フォーマット）
  return `[${rule.id}] ${renderAagResponse(buildAagResponse(rule, violations))}`
}

// ── AAG 統一レスポンス構造（Phase 3） ──────────────────────────

/**
 * AAG 統一レスポンス — guard / obligation / health / pre-commit 共通
 *
 * どこで止まっても同じ情報構造で返る。
 * @see references/01-principles/aag-four-layer-architecture.md
 */
export interface AagResponse {
  /** 情報源: guard / obligation / health / pre-commit */
  readonly source: 'guard' | 'obligation' | 'health' | 'pre-commit'
  /** 運用区分 */
  readonly fixNow: 'now' | 'debt' | 'review'
  /** 関心スライス */
  readonly slice: AagSlice | null
  /** 1. 何が止まったか */
  readonly summary: string
  /** 2. なぜ止まったか */
  readonly reason: string
  /** 3. 今やること */
  readonly steps: readonly string[]
  /** 4. 例外がありうるか */
  readonly exceptions: string | null
  /** 5. 深掘り先 */
  readonly deepDive: string | null
  /** 違反の詳細一覧 */
  readonly violations: readonly string[]
}

/** ArchitectureRule + 違反一覧 → AagResponse */
export function buildAagResponse(
  rule: ArchitectureRule,
  violations: readonly string[],
  source: AagResponse['source'] = 'guard',
): AagResponse {
  return {
    source,
    fixNow: rule.fixNow ?? 'debt',
    slice: rule.slice ?? null,
    summary: rule.what,
    reason: rule.why,
    steps: rule.migrationPath?.steps ?? [],
    exceptions: rule.decisionCriteria?.exceptions ?? null,
    deepDive: rule.doc ?? null,
    violations,
  }
}

/** AagResponse → 人間可読文字列（テスト出力・PR コメント・pre-commit 共通） */
export function renderAagResponse(resp: AagResponse): string {
  const fixLabel =
    resp.fixNow === 'now'
      ? '⚡ 今すぐ修正'
      : resp.fixNow === 'debt'
        ? '📋 構造負債として管理'
        : '🔍 観測・レビュー対象'

  const sliceLabel = resp.slice ? ` [${resp.slice}]` : ''
  const guidance = resp.slice ? SLICE_GUIDANCE[resp.slice] : null

  const lines = [`${fixLabel}${sliceLabel}`, `  ${resp.summary}`, `  理由: ${resp.reason}`]

  if (guidance) {
    lines.push(`  方向: ${guidance}`)
  }

  // fixNow ごとに返す内容の性格を分ける
  switch (resp.fixNow) {
    case 'now':
      // この diff で直す手順を短く返す
      if (resp.steps.length > 0) {
        lines.push('  修正手順:')
        for (const step of resp.steps) lines.push(`    ${step}`)
      }
      break
    case 'debt':
      // allowlist / active-debt / removalCondition 側へ誘導
      lines.push('  対応: allowlist に登録して計画的に返済する')
      if (resp.steps.length > 0) {
        lines.push('  解消手順（返済時）:')
        for (const step of resp.steps) lines.push(`    ${step}`)
      }
      break
    case 'review':
      // コード修正ではなく、レビューや見直しに回す
      lines.push('  対応: コード修正不要。Discovery Review で評価する')
      if (resp.deepDive) {
        lines.push(`  レビュー先: ${resp.deepDive}`)
      }
      break
  }

  if (resp.exceptions) {
    lines.push(`  例外: ${resp.exceptions}`)
  }

  if (resp.fixNow !== 'review' && resp.deepDive) {
    lines.push(`  詳細: ${resp.deepDive}`)
  }

  if (resp.violations.length > 0) {
    const maxShow = resp.fixNow === 'review' ? 3 : resp.violations.length
    lines.push(`  違反 (${resp.violations.length} 件):`)
    for (const v of resp.violations.slice(0, maxShow)) lines.push(`    ${v}`)
    if (resp.violations.length > maxShow) {
      lines.push(`    ... 他 ${resp.violations.length - maxShow} 件`)
    }
  }

  return lines.join('\n')
}

/** Obligation 違反用の AagResponse 生成（rule を持たないケース） */
export function buildObligationResponse(
  obligationId: string,
  label: string,
  triggerPath: string,
): AagResponse {
  return {
    source: 'obligation',
    fixNow: 'now',
    slice: 'governance-ops',
    summary: label,
    reason: `${triggerPath} が変更されたため、関連ドキュメントの更新が必要`,
    steps: [
      '1. cd app && npm run docs:generate',
      '2. git add references/02-status/generated/ CLAUDE.md',
    ],
    exceptions: null,
    deepDive: 'tools/architecture-health/src/collectors/obligation-collector.ts',
    violations: [`obligation: ${obligationId}`],
  }
}
