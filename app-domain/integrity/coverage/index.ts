/**
 * app-domain/integrity/coverage/index.ts — COVERAGE_MAP shared module
 *
 * Phase R-① 部分採用 (2026-04-29): COVERAGE_MAP の正本を `coverage-map.json` に
 * 集約し、本 file が typed wrapper として export する。
 *
 * 旧構造 (Phase F〜):
 * - test 側 `app/src/test/guards/integrityDomainCoverageGuard.test.ts` 内に const 定義
 * - collector 側 `tools/architecture-health/src/collectors/integrity-collector.ts` で
 *   regex parse して 4 KPI を出力
 * - duplicate logic + regex fragility が drift risk
 *
 * 新構造 (本 module):
 * - 正本: `coverage-map.json` (pure data)
 * - test 側: 本 module から typed import
 * - collector 側: `readFileSync` + `JSON.parse` で直接 read (regex parse 廃止)
 *
 * 設計判断:
 * - JSON を正本にする理由: tools/ tsconfig は rootDir=src で app-domain を直接 import
 *   不能。両 consumer から file 読み + structured parse できる JSON が最適
 * - typed wrapper を提供する理由: test 側で type narrowing (`PairId` discriminated
 *   union) を保つ。collector 側は値だけ扱うので type narrowing 不要
 *
 * @see references/03-implementation/integrity-domain-architecture.md §8
 * @see app-domain/integrity/coverage/coverage-map.json (正本 data)
 *
 * 不変条件:
 * - 本 module は何にも依存しない (Node API / app/src 不可、自己完結)
 * - JSON は壊れていない (parse エラー時は throw)
 * - 13 pair の構造 (pairId + status) は安定
 */

import coverageMapJson from './coverage-map.json'

// ─── 型定義 ─────────────────────────────────────────────

/**
 * pair ID の discriminated union。
 * 13 既存 pair の slot 名と一致する。新 pair 追加時は本 type と JSON の両方を更新。
 */
export type PairId =
  | 'calc-canon'
  | 'canonicalization-system'
  | 'doc-registry'
  | 'test-contract'
  | 'scope-json'
  | 'taxonomy-v2'
  | 'principles'
  | 'architecture-rules-merge'
  | 'allowlists'
  | 'checklist'
  | 'obligation-collector'
  | 'content-spec'
  | 'invariant-catalog'

/**
 * pair の coverage 情報。
 *
 * - `pairId`: pair の一意識別子 (PairId discriminated union)
 * - `displayName`: 人間可読の表示名 (#番号 + 日本語名)
 * - `guardFiles`: caller 側 guard file の相対 path (test/ 起点)。複数指定すると
 *   "いずれかが" import 条件を満たせば PASS
 * - `maxLines`: ratchet-down baseline (lines)。実測値以上の値を設定
 * - `status`: 'migrated' | 'deferred'
 * - `deferReason`: deferred の場合の理由 (optional)
 */
export interface PairCoverage {
  readonly pairId: PairId
  readonly displayName: string
  readonly guardFiles: readonly string[]
  readonly maxLines: Readonly<Record<string, number>>
  readonly status: 'migrated' | 'deferred'
  readonly deferReason?: string
}

interface CoverageMapJson {
  readonly $comment: string
  readonly pairs: readonly PairCoverage[]
}

// ─── export ─────────────────────────────────────────────

/**
 * 13 pair の coverage map (正本: `coverage-map.json`)。
 *
 * 本配列は **runtime で `Object.freeze()` されている**。上書き禁止。
 * 新 pair 追加は coverage-map.json + 本 file の PairId type を両方更新する
 * (drift は integrityDomainCoverageGuard.test.ts で機械検証)。
 */
// JSON import の literal type 推論が strict すぎるため (各 pair の maxLines が
// それぞれ異なる literal shape として narrow される)、一度 unknown を経由する。
// runtime data は変わらないので type 安全性は CoverageMapJson interface で保証される。
//
// PairId / JSON drift 検証は `app/src/test/guards/integrityDomainCoverageGuard.test.ts`
// の "PairId union と JSON 内 pairId 集合の整合性" test で機械検証される。
//
// runtime mutation 防止のため Object.freeze() を適用 (TypeScript の readonly は
// compile-time のみ、JSON parse 後の array は mutable のため明示的 freeze が必要)。
export const COVERAGE_MAP: readonly PairCoverage[] = Object.freeze(
  (coverageMapJson as unknown as CoverageMapJson).pairs,
)

/**
 * collector 側で使う path (repo root 起点)。
 * test 側は `import { COVERAGE_MAP }` で直接取得するので path 不要。
 */
export const COVERAGE_MAP_JSON_PATH = 'app-domain/integrity/coverage/coverage-map.json'
