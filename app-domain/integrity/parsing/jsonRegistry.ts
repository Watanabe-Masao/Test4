/**
 * app-domain/integrity/parsing/jsonRegistry.ts —
 * JSON file → `Registry<TEntry>` 変換 primitive (Phase C 着手 1 番手)
 *
 * caller が JSON 文字列と「parsed JSON → [id, TEntry] iterable」変換関数を渡し、
 * 本 primitive が `Registry<TEntry>` (source + entries: ReadonlyMap) に整える。
 * I/O (`readFileSync`) は guard 側に閉じ、本 primitive は文字列入力のみ。
 *
 * 設計: integrity-domain-architecture.md §3.2 (jsonRegistry primitive)
 *
 * 利用ペア (Phase C-D): #3 doc-registry / #4 test-contract / #5 scope.json /
 *                      #7 principles.json
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数 string + 関数のみ)
 * - 外部 import なし (types.ts のみ)
 * - parse 失敗時は明示的に throw (caller が file path 等 context 補完)
 */
import type { Registry } from "../types";

/**
 * jsonRegistry — JSON 文字列を Registry<TEntry> に変換。
 *
 * @param jsonContent - JSON file の全文 (caller が `fs.readFileSync` 等で取得)
 * @param toEntries - parsed JSON → [id, TEntry] の iterable に変換する関数
 * @param source - registry の出所識別子 (file path 等)。violation 報告で使用
 * @throws JSON.parse 失敗時 + toEntries 内 error
 *
 * @example
 *   // doc-registry.json から flat な path → entry の Registry を構築
 *   const reg = jsonRegistry<{ path: string; label: string }>(
 *     fs.readFileSync('docs/contracts/doc-registry.json', 'utf-8'),
 *     (parsed) => {
 *       const obj = parsed as { categories: Array<{ docs: Array<{ path: string; label: string }> }> }
 *       return obj.categories.flatMap((c) => c.docs).map((d) => [d.path, d] as [string, typeof d])
 *     },
 *     'docs/contracts/doc-registry.json',
 *   )
 *   // reg.entries.get('references/01-foundation/X.md') → { path: '...', label: '...' }
 */
export function jsonRegistry<TEntry>(
  jsonContent: string,
  toEntries: (parsed: unknown) => Iterable<readonly [string, TEntry]>,
  source: string,
): Registry<TEntry> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error(
      `jsonRegistry: failed to parse ${source}: ${(e as Error).message}`,
    );
  }
  const entries = new Map<string, TEntry>();
  for (const [id, entry] of toEntries(parsed)) {
    entries.set(id, entry);
  }
  return { source, entries };
}
