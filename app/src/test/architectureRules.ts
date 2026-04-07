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

export interface ArchitectureRule {
  // ── 識別 ──
  readonly id: string
  readonly guardTags: readonly string[]
  readonly responsibilityTags?: readonly string[]
  readonly epoch?: number

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
}

// ─── ルール定義 ──────────────────────────────────────────

export const ARCHITECTURE_RULES: readonly ArchitectureRule[] = [
  // ── noNewDebtGuard 由来 ──

  {
    id: 'AR-001',
    guardTags: ['G1'],
    epoch: 1,
    what: 'bridge ファイルに dual-run compare コードの再導入を禁止する',
    why: 'Phase 1-2 で解消した dual-run 比較は退役済み。復活させると実行モード分岐が再び散在する',
    doc: 'references/03-guides/safety-first-architecture-plan.md',
    correctPattern: {
      description: 'ExecutionMode は ts-only | wasm-only の 2 モードのみ。bridge は直接 engine を呼ぶ',
    },
    outdatedPattern: {
      description: 'bridge 内で getExecutionMode / recordCall / recordMismatch を使用する',
      codeSignals: ['getExecutionMode', 'recordCall', 'recordMismatch', 'dual-run-compare'],
    },
    detection: {
      type: 'regex',
      severity: 'gate',
      baseline: 0,
    },
  },

  {
    id: 'AR-002',
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
    detection: {
      type: 'import',
      severity: 'gate',
      baseline: 0,
    },
  },

  {
    id: 'AR-003',
    guardTags: ['G1', 'C1'],
    epoch: 1,
    what: 'UnifiedWidgetContext のフィールド数を凍結し shared hub の肥大化を防ぐ',
    why: '共有コンテキストが肥大化すると全ウィジェットの結合度が上がり変更コストが増大する',
    correctPattern: {
      description: '新規フィールドは feature slice のローカルコンテキストに寄せる',
    },
    outdatedPattern: {
      description: 'UnifiedWidgetContext に readonly フィールドを追加する',
    },
    thresholds: { fieldMax: 47 },
    detection: {
      type: 'count',
      severity: 'gate',
      baseline: 47,
    },
  },

  {
    id: 'AR-004',
    guardTags: ['G1'],
    epoch: 1,
    what: '@deprecated wrapper の新規追加を禁止する',
    why: 'deprecated wrapper が増えると間接層が膨張し削除可能性の追跡が困難になる',
    correctPattern: {
      description: '新しい wrapper を作らず、呼び出し元を直接新 API に移行する',
    },
    outdatedPattern: {
      description: 'application/services/ や domain/ に @deprecated を追加する',
      codeSignals: ['@deprecated'],
    },
    detection: {
      type: 'count',
      severity: 'gate',
      baseline: 7,
    },
  },

  {
    id: 'AR-005',
    guardTags: ['G1', 'H1'],
    epoch: 1,
    what: 'application/hooks/plans/ の shared plan hook 数を凍結する',
    why: 'category/time-slot 等は features/ に移行済み。共有 plan hook の増加は feature slice 原則に反する',
    correctPattern: {
      description: '新規 plan は features/<feature>/application/plans/ に作成する',
    },
    outdatedPattern: {
      description: 'application/hooks/plans/ に新規 *Plan.ts を追加する',
    },
    detection: {
      type: 'count',
      severity: 'gate',
      baseline: 13,
    },
  },
  // ── layerBoundaryGuard 由来 ──

  {
    id: 'AR-A1-DOMAIN',
    guardTags: ['A1', 'A2'],
    epoch: 1,
    what: 'domain/ は外部層に依存しない（純粋なビジネスロジック）',
    why: 'domain/ がフレームワークやインフラに依存すると、テスト容易性と移植性が失われる',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'domain/ は domain/ 内のみ import する。外部データが必要なら契約（interface）を domain/ に定義する',
    },
    outdatedPattern: {
      description: 'domain/ から application/ / infrastructure/ / presentation/ を import する',
      imports: ['@/application/', '@/infrastructure/', '@/presentation/'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-A1-APP-INFRA',
    guardTags: ['A1'],
    epoch: 1,
    what: 'application/ は infrastructure/ に直接依存しない',
    why: 'application 層はドメインロジックの調停を行う。インフラ詳細は adapter パターンで隠蔽する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'adapter パターンまたは allowlists/architecture.ts に正当理由を記載する。DuckDB hooks / QueryHandler / runtime-adapters は構造的に許容',
    },
    outdatedPattern: {
      description: 'application/ から infrastructure/ を直接 import する（許可された経路以外）',
      imports: ['@/infrastructure/'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-A1-APP-PRES',
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
    detection: { type: 'import', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-A1-PRES-INFRA',
    guardTags: ['A1', 'A3'],
    epoch: 1,
    what: 'presentation/ は infrastructure/ に直接依存しない',
    why: 'presentation は描画専用。データ取得は application 層の hook を経由する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'application/ の hook 経由でデータを取得する。useQueryWithHandler を推奨',
      imports: ['@/application/hooks/'],
    },
    outdatedPattern: {
      description: 'presentation/ から infrastructure/ を value import する',
      imports: ['@/infrastructure/'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-A1-PRES-USECASE',
    guardTags: ['A1', 'A3'],
    epoch: 1,
    what: 'presentation/ は application/usecases/ を直接 import しない',
    why: 'usecase はデータ構築の内部実装。presentation は hook 経由でのみアクセスする',
    correctPattern: {
      description: 'application/ の hook 経由でデータを取得する',
    },
    outdatedPattern: {
      description: 'presentation/ から application/usecases/ を value import する',
      imports: ['@/application/usecases/'],
    },
    detection: { type: 'import', severity: 'gate', baseline: 1 },
  },

  {
    id: 'AR-A1-INFRA-APP',
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
    detection: { type: 'import', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-A1-INFRA-PRES',
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
    detection: { type: 'import', severity: 'gate', baseline: 0 },
  },

  // ── codePatternGuard 由来 ──

  {
    id: 'AR-G4-INTERNAL',
    guardTags: ['G4'],
    epoch: 1,
    what: 'hooks/ に @internal export を作らない',
    why: 'テスト用 export は本番 API を汚染する。テストは public API 経由で行う',
    correctPattern: {
      description: 'public API のみを export する。内部関数はファイル内に閉じる',
    },
    outdatedPattern: {
      description: '@internal コメント付きの export を作成する',
      codeSignals: ['@internal'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-C3-STORE',
    guardTags: ['C3'],
    epoch: 1,
    what: 'store action 内に業務ロジック（算術式）を埋め込まない',
    why: 'store は state の反映のみ。計算は domain 層に委譲する',
    doc: 'references/01-principles/design-principles.md',
    correctPattern: {
      description: 'store action は set() で値を反映するだけ。算術計算は domain/calculations/ で行う',
    },
    outdatedPattern: {
      description: 'set() コールバック内で (a) + (b) のような算術代入を行う',
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-G3-SUPPRESS',
    guardTags: ['G3'],
    epoch: 1,
    what: 'コンパイラ警告を黙殺しない（eslint-disable / @ts-ignore 禁止）',
    why: '警告を黙殺すると型安全性やリント規約が形骸化する',
    correctPattern: {
      description: '根本原因を修正する。どうしても必要な���合は allowlist に正当理由を記載',
    },
    outdatedPattern: {
      description: 'eslint-disable / @ts-ignore / @ts-expect-error コメントを追加する',
      codeSignals: ['eslint-disable', '@ts-ignore', '@ts-expect-error'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-E4-TRUTHINESS',
    guardTags: ['E4'],
    epoch: 1,
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
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-C5-SELECTOR',
    guardTags: ['C5'],
    epoch: 1,
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
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
  },

  {
    id: 'AR-G2-EMPTY-CATCH',
    guardTags: ['G2'],
    epoch: 1,
    what: '空の catch ブロックでエラーを握り潰さない',
    why: 'エラーを無視するとデバッグ不能な不具合につながる',
    correctPattern: {
      description: 'catch 内で最低でも console.warn を入れるか、エラーを伝播する',
    },
    outdatedPattern: {
      description: '.catch(() => {}) のような空のエラーハンドラ',
      codeSignals: ['.catch(() => {})'],
    },
    detection: { type: 'regex', severity: 'gate', baseline: 0 },
  },

  // ── sizeGuard 由来 ──

  {
    id: 'AR-G5-HOOK-MEMO',
    guardTags: ['G5'],
    epoch: 1,
    what: 'application/hooks/ の useMemo 呼び出しを上限以下に保つ',
    why: 'useMemo が多いファイルは複数の導出値を抱えており責務が混在している',
    correctPattern: {
      description: 'useMemo ≤ 7。超える場合は hook を分割するか allowlists/complexity.ts に正当理由を記載',
    },
    outdatedPattern: {
      description: '1 つの hook ファイルに大量の useMemo を詰め込む',
    },
    thresholds: { memoMax: 7 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-G5-HOOK-STATE',
    guardTags: ['G5'],
    epoch: 1,
    what: 'application/hooks/ の useState 呼び出しを上限以下に保つ',
    why: 'useState が多いファイルは複数の状態責務を抱えており God Hook の兆候',
    correctPattern: {
      description: 'useState ≤ 6。超える場合は状態管理を分離するか allowlists/complexity.ts に正当理由を記載',
    },
    outdatedPattern: {
      description: '1 つの hook に大量の useState を詰め込む',
    },
    thresholds: { stateMax: 6 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-G5-HOOK-LINES',
    guardTags: ['G5'],
    epoch: 1,
    what: 'application/hooks/ のファイルを 300 行以下に保つ',
    why: '長い hook ファイルは複数の責務を持つ兆候。分割して単一責務を維持する',
    correctPattern: {
      description: '300 行以下。超える場合は hook を分割するか allowlists/complexity.ts に正当理由を記載',
    },
    outdatedPattern: {
      description: '1 つの hook ファイルに大量のロジックを詰め込む',
    },
    thresholds: { lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-G6-COMPONENT',
    guardTags: ['G6'],
    epoch: 1,
    what: 'presentation/ の .tsx コンポーネントを 600 行以下に保つ',
    why: '大きなコンポーネントは描画・状態・ロジックが混在している兆候',
    correctPattern: {
      description: '600 行以下。超える場合は子コンポーネントに分割する',
    },
    outdatedPattern: {
      description: '1 つのコンポーネントファイルに全ての描画ロジックを詰め込む',
    },
    thresholds: { lineMax: 600 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-G5-DOMAIN-LINES',
    guardTags: ['G5', 'A2'],
    epoch: 1,
    what: 'domain/ のファイルを 300 行以下に保つ',
    why: 'domain/ は純粋関数。短く保つことでテスト容易性と可読性を維持する',
    correctPattern: {
      description: '300 行以下。超える場合は関数を分割する',
    },
    outdatedPattern: {
      description: '1 つの domain ファイルに大量の関数を詰め込む',
    },
    thresholds: { lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-G5-INFRA-LINES',
    guardTags: ['G5'],
    epoch: 1,
    what: 'infrastructure/ のファイルを 400 行以下に保つ',
    why: 'インフラ層のファイルが大きくなると外部依存の影響範囲が広がる',
    correctPattern: {
      description: '400 行以下。超える場合は adapter を分割する',
    },
    outdatedPattern: {
      description: '1 つのインフラファイルに大量のクエリや処理を詰め込む',
    },
    thresholds: { lineMax: 400 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-G5-USECASE-LINES',
    guardTags: ['G5'],
    epoch: 1,
    what: 'application/usecases/ のファイルを 400 行以下に保つ',
    why: 'usecase が肥大化するとデータ構築の責務が不明確になる',
    correctPattern: {
      description: '400 行以下。超える場合は usecase を分割する',
    },
    outdatedPattern: {
      description: '1 つの usecase に大量のインデックス構築を詰め込む',
    },
    thresholds: { lineMax: 400 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-C6-FACADE',
    guardTags: ['C6'],
    epoch: 1,
    what: 'facade ファイルの分岐を 5 以下に保つ（orchestration のみ）',
    why: 'facade に分岐ロジックが混入すると単なる委譲ではなくなり責務が曖昧になる',
    correctPattern: {
      description: 'facade は hook の組み立てのみ。分岐は呼び出し先に委譲する',
    },
    outdatedPattern: {
      description: 'facade 内で if/switch による条件分岐を多用する',
    },
    thresholds: { branchMax: 5 },
    detection: { type: 'count', severity: 'gate' },
  },

  // ── 責務タグ別の閾値（TAG_EXPECTATIONS 由来） ──

  {
    id: 'AR-TAG-CHART-VIEW',
    guardTags: ['C8', 'G8'],
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
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-CHART-OPTION',
    guardTags: ['C8', 'G8'],
    responsibilityTags: ['R:chart-option'],
    epoch: 1,
    what: 'chart-option は ECharts オプション構築のみ。React hooks を含まない',
    why: 'オプション構築は純粋関数であるべき。React 依存を持つと再利用性が下がる',
    doc: 'references/03-guides/responsibility-separation-catalog.md',
    correctPattern: {
      description: 'useMemo ≤ 2, useCallback = 0, useState = 0, 600 行以内',
    },
    outdatedPattern: {
      description: 'オプション構築ファイルに useState や useCallback を含む',
    },
    thresholds: { memoMax: 2, callbackMax: 0, stateMax: 0, lineMax: 600 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-CALCULATION',
    guardTags: ['C8', 'B1'],
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
    detection: { type: 'must-not-coexist', severity: 'gate' },
  },

  {
    id: 'AR-TAG-TRANSFORM',
    guardTags: ['C8'],
    responsibilityTags: ['R:transform'],
    epoch: 1,
    what: 'transform はデータ変換のみ。状態を持たない',
    why: 'データ変換は純粋関数であるべき。状態を持つと副作用が混入する',
    correctPattern: {
      description: 'useMemo ≤ 2, useCallback = 0, useState = 0, 300 行以内',
    },
    outdatedPattern: {
      description: '変換ファイルに useState や副作用を含む',
    },
    thresholds: { memoMax: 2, callbackMax: 0, stateMax: 0, lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-STATE-MACHINE',
    guardTags: ['C8', 'C3'],
    responsibilityTags: ['R:state-machine'],
    epoch: 1,
    what: 'state-machine は状態管理に専念する。短く保つ',
    why: '状態管理が肥大化すると状態遷移の追跡が困難になる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 12, useState ≤ 8, 200 行以内',
    },
    outdatedPattern: {
      description: '状態管理ファイルに描画ロジックやデータ取得を混在させる',
    },
    thresholds: { memoMax: 3, callbackMax: 12, stateMax: 8, lineMax: 200 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-QUERY-PLAN',
    guardTags: ['C8', 'H1'],
    responsibilityTags: ['R:query-plan'],
    epoch: 1,
    what: 'query-plan はクエリ入力の組み立てのみ。実行しない',
    why: 'クエリの組み立てと実行を分離することで、テスト容易性と再利用性を保証する',
    correctPattern: {
      description: 'useMemo ≤ 5, useCallback = 0, useState = 0, 200 行以内',
    },
    outdatedPattern: {
      description: 'plan ファイル内でクエリを実行する、または状態を持つ',
    },
    thresholds: { memoMax: 5, callbackMax: 0, stateMax: 0, lineMax: 200 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-QUERY-EXEC',
    guardTags: ['C8'],
    responsibilityTags: ['R:query-exec'],
    epoch: 1,
    what: 'query-exec はクエリ実行とキャッシュ管理に専念する',
    why: 'クエリ実行にビジネスロジックが混入すると責務が不明確になる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 1, useState ≤ 1, 300 行以内',
    },
    outdatedPattern: {
      description: 'クエリ実行ファイルに計算ロジックや描画を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 1, stateMax: 1, lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-WIDGET',
    guardTags: ['C8', 'H6'],
    responsibilityTags: ['R:widget'],
    epoch: 1,
    what: 'widget は通知と表示の統合点。過度に状態を持たない',
    why: 'ウィジェットが状態を持ちすぎると再利用性が下がり、テストが困難になる',
    correctPattern: {
      description: 'useMemo ≤ 4, useCallback ≤ 4, useState ≤ 3, 400 行以内',
    },
    outdatedPattern: {
      description: 'ウィジェット内にデータ取得・計算・状態管理を詰め込む',
    },
    thresholds: { memoMax: 4, callbackMax: 4, stateMax: 3, lineMax: 400 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-PAGE',
    guardTags: ['C8'],
    responsibilityTags: ['R:page'],
    epoch: 1,
    what: 'page は統合点。hooks 数は多いが行数は抑える',
    why: 'ページは子コンポーネントの組み立て。ロジックは hooks に委譲する',
    correctPattern: {
      description: 'useMemo ≤ 8, useCallback ≤ 10, useState ≤ 8, 500 行以内',
    },
    outdatedPattern: {
      description: 'ページ内にインライン計算や長いレンダリングロジックを含む',
    },
    thresholds: { memoMax: 8, callbackMax: 10, stateMax: 8, lineMax: 500 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-FORM',
    guardTags: ['C8'],
    responsibilityTags: ['R:form'],
    epoch: 1,
    what: 'form は入力処理に専念する',
    why: 'フォームにビジネスロジックが混入すると変更理由が増える',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 6, useState ≤ 6, 300 行以内',
    },
    outdatedPattern: {
      description: 'フォーム内に計算ロジックやデータ取得を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 6, stateMax: 6, lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-LAYOUT',
    guardTags: ['C8'],
    responsibilityTags: ['R:layout'],
    epoch: 1,
    what: 'layout はレイアウト構造のみ。ビジネスロジックを持たない',
    why: 'レイアウトにロジックが混入すると UI の再構成が困難になる',
    correctPattern: {
      description: 'useMemo ≤ 2, useCallback ≤ 3, useState ≤ 3, 300 行以内',
    },
    outdatedPattern: {
      description: 'レイアウト内にデータ取得や状態管理を含む',
    },
    thresholds: { memoMax: 2, callbackMax: 3, stateMax: 3, lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-ORCHESTRATION',
    guardTags: ['C8', 'C6'],
    responsibilityTags: ['R:orchestration'],
    epoch: 1,
    what: 'orchestration は hook の組み立てのみ。状態を直接持たない',
    why: 'オーケストレーションが状態を持つと facade が God Object 化する',
    correctPattern: {
      description: 'useMemo ≤ 8, useCallback ≤ 2, useState = 0, 300 行以内',
    },
    outdatedPattern: {
      description: 'オーケストレーション hook 内で useState や副作用を直接管理する',
    },
    thresholds: { memoMax: 8, callbackMax: 2, stateMax: 0, lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-UTILITY',
    guardTags: ['C8', 'A2'],
    responsibilityTags: ['R:utility'],
    epoch: 1,
    what: 'utility は純粋関数。React hooks を一切含まない',
    why: 'ユーティリティはフレームワーク非依存。どの層からも安全に呼べる',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 300 行以内',
    },
    outdatedPattern: {
      description: 'ユーティリティに React hooks や副作用を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 300 },
    detection: { type: 'must-not-coexist', severity: 'gate' },
  },

  {
    id: 'AR-TAG-CONTEXT',
    guardTags: ['C8'],
    responsibilityTags: ['R:context'],
    epoch: 1,
    what: 'context は値の提供のみ。過度なロジックを持たない',
    why: 'Context Provider が肥大化すると再レンダリング範囲が広がる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 3, useState ≤ 3, 200 行以内',
    },
    outdatedPattern: {
      description: 'Context 内にビジネスロジックや複雑な計算を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 3, stateMax: 3, lineMax: 200 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-PERSISTENCE',
    guardTags: ['C8'],
    responsibilityTags: ['R:persistence'],
    epoch: 1,
    what: 'persistence は永続化操作に専念する',
    why: '永続化にビジネスロジックが混入するとデータ層の責務が不明確になる',
    correctPattern: {
      description: 'useMemo ≤ 3, useCallback ≤ 6, useState ≤ 6, 300 行以内',
    },
    outdatedPattern: {
      description: '永続化ファイルに計算ロジックや UI 制御を含む',
    },
    thresholds: { memoMax: 3, callbackMax: 6, stateMax: 6, lineMax: 300 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-ADAPTER',
    guardTags: ['C8', 'A4'],
    responsibilityTags: ['R:adapter'],
    epoch: 1,
    what: 'adapter は外部 API との変換のみ。小さく保つ',
    why: 'アダプタが肥大化すると外部依存の影響範囲が広がる',
    correctPattern: {
      description: 'useMemo ≤ 1, useCallback ≤ 2, useState ≤ 1, 200 行以内',
    },
    outdatedPattern: {
      description: 'アダプタにビジネスロジックや状態管理を含む',
    },
    thresholds: { memoMax: 1, callbackMax: 2, stateMax: 1, lineMax: 200 },
    detection: { type: 'count', severity: 'gate' },
  },

  {
    id: 'AR-TAG-REDUCER',
    guardTags: ['C8'],
    responsibilityTags: ['R:reducer'],
    epoch: 1,
    what: 'reducer は純粋な状態遷移関数。hooks を含まない',
    why: 'reducer は (state, action) => state の純粋関数であるべき',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 200 行以内',
    },
    outdatedPattern: {
      description: 'reducer に React hooks や副作用を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 200 },
    detection: { type: 'must-not-coexist', severity: 'gate' },
  },

  {
    id: 'AR-TAG-BARREL',
    guardTags: ['C8', 'F1'],
    responsibilityTags: ['R:barrel'],
    epoch: 1,
    what: 'barrel は re-export のみ。ロジックを含まない',
    why: 'バレルにロジックが混入すると import 解決が複雑化し tree-shaking を阻害する',
    correctPattern: {
      description: 'useMemo = 0, useCallback = 0, useState = 0, 50 行以内。export 文のみ',
    },
    outdatedPattern: {
      description: 'バレルに関数定義や変数宣言を含む',
    },
    thresholds: { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 50 },
    detection: { type: 'must-only', severity: 'gate' },
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
  if (violations.length > 0) {
    lines.push(`違反:`)
    for (const v of violations) {
      lines.push(`  ${v}`)
    }
  }
  return lines.join('\n')
}
