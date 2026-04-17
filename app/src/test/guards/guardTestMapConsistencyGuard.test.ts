/**
 * Guard Test Map Consistency Guard
 *
 * `references/03-guides/guard-test-map.md` が全 `app/src/test/guards/*.test.ts`
 * を網羅していることを ratchet-down で機械検証する。
 *
 * ## 背景
 *
 * guard-test-map.md は「どの guard が何を守っているか」の人間可読 index。
 * これまで手動メンテナンスされており、新 guard 追加時に更新されないことが
 * 多く、2026-04-12 時点で 55 guard 中 42 件が未登録という大規模な drift が
 * 発生していた。
 *
 * 本 guard は以下の役割を果たす:
 *
 * 1. **将来の drift 拡大を防ぐ** — 新 guard 追加時に map 更新を機械的に強制
 * 2. **段階的改善を促す** — missing baseline を単調減少させる ratchet
 * 3. **気づきを仕組み化する** — 手動メンテナンスの作法を「通過条件」に変換
 *
 * ## ratchet-down の運用
 *
 * - 現在の missing 数 = `MISSING_BASELINE`
 * - 新 guard を追加するとき: **必ず guard-test-map.md にも 1 行追加**する
 *   - 追加しないと missing 数が増えて本 guard が FAIL
 * - 既存の未登録 guard を登録するとき: missing 数が減る
 *   - 減ったら本ファイルの `MISSING_BASELINE` を新しい値へ下げる
 *   - （減らずに放置すると ratchet が gate として機能しない）
 *
 * 最終目標は `MISSING_BASELINE = 0` (全 guard が map に登録された状態)。
 *
 * @see references/03-guides/guard-test-map.md
 * @see references/03-guides/project-checklist-governance.md §4.1
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const GUARDS_DIR = path.join(PROJECT_ROOT, 'app/src/test/guards')
const GUARD_MAP_PATH = path.join(PROJECT_ROOT, 'references/03-guides/guard-test-map.md')

/**
 * 未登録 guard 数の上限（ratchet-down baseline）。
 *
 * **減ったら本定数を更新してベースラインを下げる。**
 * 増える方向の変更は本 guard によって FAIL する。
 *
 * 初期値: 40（2026-04-12 時点、過去の累積 drift）
 * 目標:   0（全 guard が guard-test-map.md に登録された状態）
 */
const MISSING_BASELINE = 41

function listGuardFilenames(): string[] {
  if (!fs.existsSync(GUARDS_DIR)) return []
  return fs
    .readdirSync(GUARDS_DIR)
    .filter((f) => f.endsWith('.test.ts'))
    .sort()
}

function listMappedGuardFilenames(): Set<string> {
  if (!fs.existsSync(GUARD_MAP_PATH)) return new Set()
  const content = fs.readFileSync(GUARD_MAP_PATH, 'utf-8')
  // markdown 内の `app/src/test/guards/XXX.test.ts` への参照を抽出
  const re = /app\/src\/test\/guards\/([a-zA-Z0-9_-]+\.test\.ts)/g
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    out.add(m[1])
  }
  return out
}

function computeMissing(): string[] {
  const all = listGuardFilenames()
  const mapped = listMappedGuardFilenames()
  return all.filter((f) => !mapped.has(f)).sort()
}

describe('Guard Test Map Consistency Guard', () => {
  it('全 guard ファイルが discoverable である', () => {
    const all = listGuardFilenames()
    expect(all.length).toBeGreaterThan(0)
  })

  it('未登録 guard 数が baseline を超えない（ratchet-down）', () => {
    const missing = computeMissing()
    const message = formatRatchetMessage(missing)
    expect(missing.length, message).toBeLessThanOrEqual(MISSING_BASELINE)
  })

  it('baseline が現状より大きすぎない（ratchet-down が stale していない）', () => {
    // 現状の missing 数が baseline より 5 件以上少ないなら baseline を下げるべき。
    // これは「実態が改善したのに baseline が古いまま」という soft gate。
    const missing = computeMissing()
    const slack = MISSING_BASELINE - missing.length
    const message =
      `MISSING_BASELINE (${MISSING_BASELINE}) が現在の missing 数 (${missing.length}) より ${slack} 件多い。\n` +
      `baseline を ${missing.length} に下げてください（ratchet-down の更新）。\n` +
      `app/src/test/guards/guardTestMapConsistencyGuard.test.ts の MISSING_BASELINE を更新する。`
    expect(slack, message).toBeLessThan(5)
  })
})

function formatRatchetMessage(missing: readonly string[]): string {
  if (missing.length <= MISSING_BASELINE) return ''
  const excess = missing.length - MISSING_BASELINE
  const lines: string[] = []
  lines.push(`未登録 guard 数が baseline (${MISSING_BASELINE}) を ${excess} 件超過しています。`)
  lines.push('')
  lines.push('references/03-guides/guard-test-map.md に以下の guard を登録してください:')
  for (const f of missing) {
    lines.push(`  - app/src/test/guards/${f}`)
  }
  lines.push('')
  lines.push('追加 format（既存エントリを参考に）:')
  lines.push('  | `app/src/test/guards/<name>.test.ts` | <role> | <件数> | <保護対象の 1 文> |')
  lines.push('')
  lines.push(
    'role は architecture / invariant-guardian / documentation-steward / governance-ops 等。',
  )
  lines.push('件数は `it(...)` または violation code の数。')
  return lines.join('\n')
}
