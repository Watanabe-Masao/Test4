/**
 * Path Helpers — repo-relative POSIX path 標準化 + `RepoFileEntry` 型
 *
 * **位置付け** (= aag-engine-readiness-refactor Phase 4 deliverable):
 *   - 将来 Go / Rust engine が同じ path convention を再現できることを保証
 *   - detector / collector / renderer の 4 層 layered model 横断で path を統一表現
 *   - Windows separator / 絶対 path / 親 directory traversal を hard fail で detect
 *
 * **convention** (= 機械検証可能な path 仕様):
 *   - **POSIX separator**: `/` のみ。`\\` は禁止 (= Windows separator が internal articulation に混入しない)
 *   - **repo-relative**: leading `/` 禁止、Windows drive letter (`C:`) 禁止
 *   - **non-traversal**: `..` segment 禁止 (= directory traversal によって repo 外に到達することを防ぐ)
 *   - **non-empty**: 空文字列禁止
 *
 * **AagResponse / DetectorResult との関係**:
 *   - `DetectorResult.sourceFile` は本 module の `RepoPath` 規約に従う (= aag-engine-readiness-refactor
 *     Phase 4 で 3 detector が adoption、残り 2 detector は Phase 6 で adoption 予定)
 *   - `RepoFileEntry` は Phase 5 fixture corpus / Phase 6 pure detector extraction で
 *     facts 入力 type として使用予定
 *
 * **不可侵原則 (= aag-engine-readiness-refactor plan.md 不可侵原則 2)**:
 *   既存 production guard / collector の動作は touch しない。本 module は
 *   **追加** 経路として導入され、detector layer から adoption する。
 *
 * @see tools/architecture-health/src/detectors/README.md (= 4 層 layered model)
 * @see tools/architecture-health/src/detector-result.ts (= DetectorResult contract)
 * @see references/03-implementation/aag-engine-readiness-inventory.md §1 (= 3 状態 path articulation)
 */

// ───────────────────────────────────────────────────────────────────────
// branded type
// ───────────────────────────────────────────────────────────────────────

/**
 * Repo-relative POSIX path の **branded type**。
 *
 * `string` と structurally compatible だが、`toRepoPath()` factory を経由
 * しないと値を articulate できないため、type level で path 仕様遵守を強制可能。
 *
 * 例:
 * ```ts
 * function takesRepoPath(p: RepoPath) { ... }
 * takesRepoPath('app/src/x.ts')          // ❌ TS error: string は RepoPath ではない
 * takesRepoPath(toRepoPath('app/src/x.ts')) // ✅ OK
 * ```
 */
export type RepoPath = string & { readonly __brand: 'RepoPath' }

/**
 * `RepoFileEntry` の `kind` field 値域。
 * 各 file 拡張子の semantic 分類を articulate (= engine が file type ごとに
 * 異なる handling をする場合の dispatch key)。
 */
export type RepoFileKind = 'json' | 'markdown' | 'typescript' | 'other'

/**
 * Repo 内 file の metadata articulation。
 *
 * **canonical structure** (= aag-engine-readiness-refactor plan.md Phase 4 で articulate):
 *   - `path`: RepoPath (= 上記 4 規約遵守)
 *   - `kind`: file type の semantic 分類
 *   - `sizeBytes`: 0 以上の integer (= file system stat 結果)
 *   - `sha256`: optional content hash (= 64-char hex string、fixture corpus で parity 検証用)
 *
 * 後続 Phase で活用予定:
 *   - **Phase 5 (fixture corpus)**: 各 fixture file の metadata を articulate
 *   - **Phase 6 (pure detector extraction)**: facts 入力 type として detector の入口で使用
 *   - **engine 実装 project**: Go / Rust が同 type を再現する
 */
export interface RepoFileEntry {
  readonly path: RepoPath
  readonly kind: RepoFileKind
  readonly sizeBytes: number
  readonly sha256?: string
}

// ───────────────────────────────────────────────────────────────────────
// validators
// ───────────────────────────────────────────────────────────────────────

/**
 * 入力文字列が **repo-relative POSIX path 規約** を満たすかの predicate。
 *
 * 拒否条件:
 *   - 空文字列
 *   - Windows separator (`\\`) を含む
 *   - 絶対 path (= `/` で始まる)
 *   - Windows drive letter (= `C:` 等で始まる)
 *   - `..` segment を含む (= directory traversal 防止)
 *
 * @param input 検証対象の path 文字列
 * @returns 規約遵守なら true (= type narrowing で `RepoPath` に refine)
 */
export function isRepoPath(input: string): input is RepoPath {
  if (input.length === 0) return false
  if (input.includes('\\')) return false // Windows separator
  if (input.startsWith('/')) return false // 絶対 path
  if (/^[A-Za-z]:/.test(input)) return false // Windows drive letter
  // `..` segment (= path として解釈) を拒否。`..foo` のような prefix は許容。
  const segments = input.split('/')
  if (segments.includes('..')) return false
  return true
}

/**
 * 入力文字列を `RepoPath` に変換 (= validation factory)。規約違反時は throw。
 *
 * @param input path 文字列
 * @returns `RepoPath` (= branded、validation 通過済)
 * @throws Error 規約違反時
 */
export function toRepoPath(input: string): RepoPath {
  if (!isRepoPath(input)) {
    throw new Error(
      `RepoPath 規約違反: '${input}' は repo-relative POSIX path ではない (= 空文字 / Windows separator / 絶対 path / drive letter / .. traversal いずれかに該当)`,
    )
  }
  return input
}

/**
 * 入力文字列が `RepoPath` 規約を満たすことを assert。type narrowing 用。
 *
 * @param input path 文字列
 * @throws Error 規約違反時
 */
export function assertRepoPath(input: string): asserts input is RepoPath {
  toRepoPath(input)
}

// ───────────────────────────────────────────────────────────────────────
// factory
// ───────────────────────────────────────────────────────────────────────

/**
 * file 拡張子から `RepoFileKind` を推定 (= adoption 時の便利 helper)。
 *
 * 推定規則:
 *   - `.json` → `'json'`
 *   - `.md` → `'markdown'`
 *   - `.ts` / `.tsx` → `'typescript'`
 *   - 上記以外 → `'other'`
 */
export function inferRepoFileKind(path: RepoPath): RepoFileKind {
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.md')) return 'markdown'
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
  return 'other'
}

/**
 * `RepoFileEntry` を生成する factory。path validation + kind 自動推定 + frozen。
 *
 * field validation:
 *   - `path`: `toRepoPath()` 経由で規約検証
 *   - `kind`: 省略時は `inferRepoFileKind()` で拡張子から推定
 *   - `sizeBytes`: 0 以上の integer を要求 (= 負値 / 非 integer は throw)
 *   - `sha256`: 省略可、articulate する場合は 64-char hex を要求
 *
 * @param input { path, sizeBytes, kind?, sha256? }
 * @returns frozen `RepoFileEntry`
 * @throws Error path 規約違反 / sizeBytes 不正 / sha256 format 違反
 */
export function createRepoFileEntry(input: {
  readonly path: string
  readonly sizeBytes: number
  readonly kind?: RepoFileKind
  readonly sha256?: string
}): RepoFileEntry {
  const path = toRepoPath(input.path)

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error(
      `RepoFileEntry: sizeBytes must be a non-negative integer (got ${input.sizeBytes})`,
    )
  }

  if (input.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new Error(
      `RepoFileEntry: sha256 must be a 64-char lowercase hex string (got '${input.sha256}')`,
    )
  }

  return Object.freeze({
    path,
    kind: input.kind ?? inferRepoFileKind(path),
    sizeBytes: input.sizeBytes,
    sha256: input.sha256,
  })
}
