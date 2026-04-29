/**
 * app-domain/integrity/parsing/sourceLineLookup.ts —
 * source 文字列内の識別子の行番号 lookup (Phase B Step B-3 拡張)
 *
 * `contentSpecHelpers.ts` の `findIdLine` / `findExportLine` を直接 extract。
 * design doc §3.2 の primitive 6 種に加え、本 file は spec id ↔ source line の
 * 双方向対応で多用される utility として独立。
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数 string のみ)
 * - 外部 import なし
 */

/**
 * findIdLine — source content (TS/TSX 想定) 内で
 * `id: 'WID-XXX'` 形式の literal が現れる行番号 (1-indexed) を返す。
 * 見つからなければ 0。
 *
 * @param sourceContent - TS/TSX file の全文
 * @param idLiteral - 探索する id (e.g., "WID-001")
 *
 * @example
 *   findIdLine("const w = {\n  id: 'WID-001',\n}", 'WID-001') // → 2
 */
export function findIdLine(sourceContent: string, idLiteral: string): number {
  const lines = sourceContent.split("\n");
  const re = new RegExp(`^\\s*id:\\s*['"\`]${escapeRegex(idLiteral)}['"\`]`);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1;
  }
  return 0;
}

/**
 * findExportLine — source content (TS 想定) 内で
 * `export {function|const|let|var|class|interface|type} <name>` の行番号 (1-indexed) を返す。
 * 見つからなければ 0。
 *
 * @param sourceContent - TS file の全文
 * @param exportName - 探索する export 名
 *
 * @example
 *   findExportLine("export function foo() {}", 'foo') // → 1
 */
export function findExportLine(
  sourceContent: string,
  exportName: string,
): number {
  const lines = sourceContent.split("\n");
  const n = escapeRegex(exportName);
  const re = new RegExp(
    `^\\s*export\\s+(?:async\\s+)?(?:function|const|let|var|class|interface|type)\\s+${n}\\b`,
  );
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1;
  }
  return 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
