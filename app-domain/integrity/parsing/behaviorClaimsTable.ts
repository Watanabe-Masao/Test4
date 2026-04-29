/**
 * app-domain/integrity/parsing/behaviorClaimsTable.ts —
 * spec body の "Behavior Claims" markdown table を parse する pure primitive
 *
 * Phase J 後続課題 (2026-04-29、phased-content-specs-rollout #1 着手): J7 path 実在
 * guard 実装に伴い、`contentSpecEvidenceLevelGuard.test.ts` 内 inline 実装の parser を
 * 本 primitive に crystallize。`contentSpecPathExistenceGuard.test.ts` (新設) と
 * 共有することで DRY + dogfooding を達成。
 *
 * 設計: integrity-domain-architecture.md §3.1 (parsing primitive)
 *
 * 利用ペア: #12 contentSpec ペア の 2 caller (evidence-level guard + path-existence guard)
 *
 * 不変条件 (domain 純粋性):
 * - 本 file は何にも依存しない (Node API / app/src 不可、自己完結)
 * - I/O 無し (caller が file content を文字列として渡す)
 * - 副作用なし、入力に対して純粋
 *
 * Behavior Claims セクション format (markdown table、spec body):
 *
 *   ### Behavior Claims (Phase J Evidence Level)
 *
 *   | ID | claim | evidenceLevel | riskLevel | tests | guards |
 *   |---|---|---|---|---|---|
 *   | CLM-001 | claim text | tested | high | path/to/test.ts | - |
 *   | CLM-002 | claim text | guarded | medium | - | path/to/guard.test.ts |
 */

/**
 * Behavior Claims table の 1 行を parse した結果。
 *
 * - `id`: CLM-NNN 形式の claim id
 * - `claim`: claim text (raw、validation は caller 側)
 * - `evidenceLevel`: generated / tested / guarded / reviewed / asserted / unknown のいずれか
 *   (validation は caller 側、本 parser は文字列をそのまま返す)
 * - `riskLevel`: high / medium / low のいずれか (同上)
 * - `tests`: tests cell の path 列 (`-` / `なし` / `none` / 空は空配列)
 * - `guards`: guards cell の path 列 (同上)
 */
export interface ParsedBehaviorClaim {
  readonly id: string
  readonly claim: string
  readonly evidenceLevel: string
  readonly riskLevel: string
  readonly tests: readonly string[]
  readonly guards: readonly string[]
}

/**
 * cell 内の path 列を parse する。
 *
 * - 空 / `-` / `なし` / `none` → `[]`
 * - `,` `;` 改行で split、trim、空除去
 *
 * @example
 *   parseCellList('') // []
 *   parseCellList('-') // []
 *   parseCellList('a/b.ts') // ['a/b.ts']
 *   parseCellList('a/b.ts, c/d.ts') // ['a/b.ts', 'c/d.ts']
 */
function parseCellList(cell: string): readonly string[] {
  const trimmed = cell.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === 'なし' || trimmed === 'none') return []
  return trimmed
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '-')
}

/**
 * spec body の Behavior Claims markdown table を parse する。
 *
 * 動作:
 * 1. `Behavior Claims` を含む heading を探す
 * 2. 直下の `| ID | ...` header row まで進む
 * 3. header + separator を skip し、空行 / 次 heading / `|` 始まりでない行で終了
 * 4. 各行を `|` で split、6 cell 未満は skip、`CLM-` 始まりでない id も skip
 *
 * Behavior Claims section が無い spec / table が無い spec → `[]`
 *
 * @param specContent - spec の markdown 全文 (caller が `readFileSync` で取得)
 * @returns 各 row を parse した `ParsedBehaviorClaim[]`
 */
export function parseBehaviorClaimsTable(specContent: string): readonly ParsedBehaviorClaim[] {
  const lines = specContent.split('\n')
  let i = 0
  // Find heading containing "Behavior Claims"
  while (i < lines.length && !/^#+\s+.*Behavior Claims/i.test(lines[i])) i++
  if (i >= lines.length) return []
  // Skip to header row
  while (i < lines.length && !/^\s*\|\s*ID\s*\|/i.test(lines[i])) i++
  if (i >= lines.length) return []
  // Skip header + separator
  i += 2
  const claims: ParsedBehaviorClaim[] = []
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line === '' || !line.startsWith('|')) break
    if (line.startsWith('#')) break
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.length < 6) {
      i++
      continue
    }
    const [id, claim, evidenceLevel, riskLevel, testsRaw, guardsRaw] = cells
    if (!id.startsWith('CLM-')) {
      i++
      continue
    }
    claims.push({
      id,
      claim,
      evidenceLevel,
      riskLevel,
      tests: parseCellList(testsRaw),
      guards: parseCellList(guardsRaw),
    })
    i++
  }
  return claims
}
