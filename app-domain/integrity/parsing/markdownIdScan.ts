/**
 * app-domain/integrity/parsing/markdownIdScan.ts —
 * Markdown 内の id heading を走査する primitive (Phase D Wave 3)
 *
 * `### INV-SH-01: ...` / `### CALC-001: ...` のように heading 内に登録された id を
 * Registry<{id, line, body}> に変換。
 *
 * 設計: integrity-domain-architecture.md §3.2 (markdownIdScan)
 *
 * 利用ペア (Phase D Wave 3): #10 checklist (`* [ ]` heading 走査) /
 *                            #13 invariant-catalog (`### INV-* id` 走査)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数 string のみ)
 * - 外部 import なし (types.ts のみ)
 */
import type { Registry } from "../types";

export interface MarkdownIdHeading {
  readonly id: string;
  readonly line: number;
  readonly raw: string;
}

export interface MarkdownIdScanOptions {
  /** id 抽出用の正規表現。 capture group 1 で id を返す。
   *  例: /^###\s+(INV-[A-Z]+-\d+)/ */
  readonly idPattern: RegExp;
}

/**
 * scanMarkdownIds — Markdown 文字列から id heading を抽出。
 *
 * @param content - Markdown ファイル全文
 * @param source - registry の出所識別子 (file path)
 * @param options - 抽出 pattern
 * @returns Registry<MarkdownIdHeading> (entries.get(id) で line/raw 取得可能)
 *
 * @example
 *   const reg = scanMarkdownIds(invariantCatalogContent, 'invariant-catalog.md', {
 *     idPattern: /^###\s+(INV-[A-Z]+-\d+)/,
 *   })
 *   // reg.entries.get('INV-SH-01') → { id: 'INV-SH-01', line: 42, raw: '### INV-SH-01: ...' }
 */
export function scanMarkdownIds(
  content: string,
  source: string,
  options: MarkdownIdScanOptions,
): Registry<MarkdownIdHeading> {
  const lines = content.split("\n");
  const entries = new Map<string, MarkdownIdHeading>();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(options.idPattern);
    if (m && m[1]) {
      const id = m[1];
      // 既存があれば後勝ち、ただし最初の出現を優先する場合は caller がフィルタ
      if (!entries.has(id)) {
        entries.set(id, { id, line: i + 1, raw: lines[i] });
      }
    }
  }
  return { source, entries };
}
