/**
 * Architecture Rule — 統一ガードフォーマット
 *
 * 各ルールが「禁止」「あるべき姿」「なぜ」「ドキュメント」をセットで定義する。
 * AI が検出 → 修正 → 理解のサイクルを 1 箇所で完結できるようにする。
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
