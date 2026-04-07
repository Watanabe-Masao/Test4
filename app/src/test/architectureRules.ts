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

export interface ArchitectureRule {
  // ── 識別 ──
  readonly id: string
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
    readonly severity: 'gate' | 'warn'
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
  /** ルールの再点検ポリシー（時間軸の導入） */
  readonly reviewPolicy?: {
    readonly owner: string // 'solo-maintainer' | 'ai-system'
    readonly lastReviewedAt: string // YYYY-MM-DD
    readonly reviewCadenceDays: number // 再点検間隔（日数）
  }
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
    id: 'AR-001',
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
  },

  {
    id: 'AR-002',
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
  },

  {
    id: 'AR-003',
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
  },

  {
    id: 'AR-004',
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
  },

  {
    id: 'AR-005',
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
  },
  // ── layerBoundaryGuard 由来 ──

  {
    id: 'AR-A1-DOMAIN',
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
  },

  {
    id: 'AR-A1-APP-INFRA',
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
  },

  {
    id: 'AR-A1-APP-PRES',
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
  },

  {
    id: 'AR-A1-PRES-INFRA',
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
  },

  {
    id: 'AR-A1-PRES-USECASE',
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
  },

  {
    id: 'AR-A1-INFRA-APP',
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
  },

  {
    id: 'AR-A1-INFRA-PRES',
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
  },

  // ── codePatternGuard 由来 ──

  {
    id: 'AR-G4-INTERNAL',
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
  },

  {
    id: 'AR-C3-STORE',
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
  },

  {
    id: 'AR-G3-SUPPRESS',
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
  },

  {
    id: 'AR-E4-TRUTHINESS',
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
  },

  {
    id: 'AR-C5-SELECTOR',
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
  },

  {
    id: 'AR-G2-EMPTY-CATCH',
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
  },

  // ── sizeGuard 由来 ──

  {
    id: 'AR-G5-HOOK-MEMO',
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
    relationships: {
      dependsOn: ['AR-STRUCT-RESP-SEPARATION'],
    },
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
  },

  {
    id: 'AR-G5-HOOK-STATE',
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
    relationships: {
      dependsOn: ['AR-STRUCT-RESP-SEPARATION'],
    },
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
  },

  {
    id: 'AR-G5-HOOK-LINES',
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
  },

  {
    id: 'AR-G6-COMPONENT',
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
    relationships: {
      dependsOn: ['AR-STRUCT-RESP-SEPARATION'],
    },
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
  },

  {
    id: 'AR-G5-DOMAIN-LINES',
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
  },

  {
    id: 'AR-G5-INFRA-LINES',
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
  },

  {
    id: 'AR-G5-USECASE-LINES',
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
  },

  {
    id: 'AR-C6-FACADE',
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
  },

  // ── パスガード由来（正本取得経路の保護） ──

  {
    id: 'AR-PATH-SALES',
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
  },

  {
    id: 'AR-PATH-DISCOUNT',
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
  },

  {
    id: 'AR-PATH-GROSS-PROFIT',
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
  },

  {
    id: 'AR-PATH-PURCHASE-COST',
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
  },

  {
    id: 'AR-PATH-CUSTOMER',
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
  },

  {
    id: 'AR-PATH-CUSTOMER-GAP',
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
  },

  {
    id: 'AR-PATH-PI-VALUE',
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
  },

  {
    id: 'AR-PATH-FREE-PERIOD',
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
  },

  {
    id: 'AR-PATH-FREE-PERIOD-BUDGET',
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
  },

  {
    id: 'AR-PATH-FREE-PERIOD-DEPT-KPI',
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
  },

  {
    id: 'AR-PATH-FACTOR-DECOMPOSITION',
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
  },

  {
    id: 'AR-PATH-GROSS-PROFIT-CONSISTENCY',
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
  },

  // ── 構造・純粋性・移行ガード由来 ──

  {
    id: 'AR-STRUCT-ANALYSIS-FRAME',
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
  },

  {
    id: 'AR-STRUCT-CALC-CANON',
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
  },

  {
    id: 'AR-CANON-ZOD-REQUIRED',
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
  },

  {
    id: 'AR-CANON-ZOD-REVIEW',
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
  },

  {
    id: 'AR-STRUCT-CANONICAL-INPUT',
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
  },

  {
    id: 'AR-STRUCT-CANONICALIZATION',
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
  },

  {
    id: 'AR-STRUCT-COMPARISON-SCOPE',
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
  },

  {
    id: 'AR-STRUCT-DATA-INTEGRITY',
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
  },

  {
    id: 'AR-STRUCT-DUAL-RUN-EXIT',
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
  },

  {
    id: 'AR-STRUCT-FALLBACK-METADATA',
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
  },

  {
    id: 'AR-MIG-OLD-PATH',
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
  },

  {
    id: 'AR-STRUCT-PAGE-META',
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
  },

  {
    id: 'AR-STRUCT-PRES-ISOLATION',
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
  },

  {
    id: 'AR-STRUCT-PURITY',
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
  },

  {
    id: 'AR-STRUCT-QUERY-PATTERN',
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
  },

  {
    id: 'AR-STRUCT-RENDER-SIDE-EFFECT',
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
  },

  {
    id: 'AR-STRUCT-RESP-SEPARATION',
    ruleClass: 'default',
    guardTags: ['G8'],
    epoch: 1,
    what: '責務分離の 7 種の数値制約を機械的に強制する',
    why: '「気をつける」で終わらせない。「通らない」にする',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: { description: 'P2/P7/P8/P10/P12/P17/P18 の各上限を遵守。超えたら分割' },
    outdatedPattern: { description: '上限を超える useMemo/useState/export/let を持つファイル' },
    decisionCriteria: {
      when: 'hook/コンポーネントの useMemo/useState が上限に近づいたとき',
      exceptions: 'allowlists/responsibility.ts に理由付きで登録可能',
      escalation: 'hook の分割を検討。responsibility-separation-catalog.md の 24 パターンを参照',
    },
    relationships: {
      enables: ['AR-G5-HOOK-MEMO', 'AR-G5-HOOK-STATE', 'AR-G6-COMPONENT'],
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: [
        '1. 違反パターンを特定（P2〜P18）',
        '2. 超過している hook を分割または allowlist に登録',
      ],
      effort: 'small',
      priority: 3,
    },
  },

  {
    id: 'AR-STRUCT-STORE-RESULT-INPUT',
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
  },

  {
    id: 'AR-STRUCT-CONVENTION',
    ruleClass: 'default',
    guardTags: ['F1', 'F4', 'F9', 'F2', 'F3', 'F6'],
    epoch: 1,
    doc: 'references/03-guides/coding-conventions.md',
    what: 'バレル re-export、feature slice 依存、コンテキストデータの重複禁止',
    why: 'コード構造規約の一貫性が保守性を保証する',
    correctPattern: {
      description: 'バレルは re-export のみ。feature 間は shared/ 経由。ctx data は重複しない',
    },
    outdatedPattern: { description: 'バレルにロジック、feature 間の直接依存、ctx の重複データ' },
    decisionCriteria: {
      when: 'バレル・feature 依存・ctx データを変更するとき',
      exceptions: '例外なし',
      escalation: 'バレルは re-export のみ。feature 間は shared/ 経由',
    },
    detection: { type: 'custom', severity: 'gate' },
    migrationPath: {
      steps: ['1. バレルからロジックを抽出', '2. feature 間依存を shared/ 経由に変更'],
      effort: 'small',
      priority: 3,
    },
  },

  {
    id: 'AR-STRUCT-TEMPORAL-ROLLING',
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
  },

  {
    id: 'AR-STRUCT-TEMPORAL-SCOPE',
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
  },

  {
    id: 'AR-STRUCT-TOPOLOGY',
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
  },

  // ── 追加ルール（未参照タグのカバー） ──

  {
    id: 'AR-C7-NO-DUAL-API',
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
  },

  {
    id: 'AR-C9-HONEST-UNCLASSIFIED',
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
  },

  {
    id: 'AR-G7-CACHE-BODY',
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
  },

  {
    id: 'AR-Q3-CHART-NO-DUCKDB',
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
  },

  {
    id: 'AR-Q4-ALIGNMENT-HANDLER',
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
  },

  // ── タグ選択ガイド ──

  {
    id: 'AR-TAG-SELECTION-GUIDE',
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
  },

  // ── 責務タグ別の閾値（TAG_EXPECTATIONS 由来） ──

  {
    id: 'AR-TAG-CHART-VIEW',
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
  },

  {
    id: 'AR-TAG-CHART-OPTION',
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
  },

  {
    id: 'AR-TAG-CALCULATION',
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
  },

  {
    id: 'AR-TAG-TRANSFORM',
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
  },

  {
    id: 'AR-TAG-STATE-MACHINE',
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
  },

  {
    id: 'AR-TAG-QUERY-PLAN',
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
  },

  {
    id: 'AR-TAG-QUERY-EXEC',
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
  },

  {
    id: 'AR-TAG-WIDGET',
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
  },

  {
    id: 'AR-TAG-PAGE',
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
  },

  {
    id: 'AR-TAG-FORM',
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
  },

  {
    id: 'AR-TAG-LAYOUT',
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
  },

  {
    id: 'AR-TAG-ORCHESTRATION',
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
  },

  {
    id: 'AR-TAG-UTILITY',
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
  },

  {
    id: 'AR-TAG-CONTEXT',
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
  },

  {
    id: 'AR-TAG-PERSISTENCE',
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
  },

  {
    id: 'AR-TAG-ADAPTER',
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
  },

  {
    id: 'AR-TAG-REDUCER',
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
  },

  {
    id: 'AR-TAG-BARREL',
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

export function formatViolationMessage(
  rule: ArchitectureRule,
  violations: readonly string[],
): string {
  const lines = [
    `[${rule.id}] ${rule.what}`,
    `理由: ${rule.why}`,
    `正しいパターン: ${rule.correctPattern.description}`,
  ]
  if (rule.doc) {
    lines.push(`参照: ${rule.doc}`)
  }
  if (rule.migrationPath) {
    lines.push(`修正手順:`)
    for (const step of rule.migrationPath.steps) {
      lines.push(`  ${step}`)
    }
  }
  if (rule.decisionCriteria) {
    lines.push(`例外条件: ${rule.decisionCriteria.exceptions}`)
  }
  if (violations.length > 0) {
    lines.push(`違反:`)
    for (const v of violations) {
      lines.push(`  ${v}`)
    }
  }
  return lines.join('\n')
}
