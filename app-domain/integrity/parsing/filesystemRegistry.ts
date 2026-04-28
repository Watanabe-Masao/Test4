/**
 * app-domain/integrity/parsing/filesystemRegistry.ts —
 * filesystem 走査結果から Registry<FileEntry> を構築する primitive (Phase D Wave 3)
 *
 * caller が `readdirSync` 等で取得した name/path 配列を受け取り、Registry に整える。
 * I/O は guard 側に閉じ、本 primitive は配列入力のみ (純関数)。
 *
 * 設計: integrity-domain-architecture.md §3.2 (filesystemRegistry)
 *
 * 利用ペア (Phase D Wave 3): #2 readModels 構造 (再評価) / #10 checklist (live project 列挙)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数のみ、I/O は caller)
 * - 外部 import なし (types.ts のみ)
 */
import type { Registry } from "../types";

export interface FileEntry {
  readonly name: string;
  /** 物理 path (caller 側で `path.join(root, name)` で構築) */
  readonly absPath: string;
  /** display 用の相対 path (optional) */
  readonly displayPath?: string;
}

/**
 * filesystemRegistry — filesystem 走査結果を Registry<FileEntry> にラップ。
 *
 * @param entries - caller が `readdirSync` + filter で生成した FileEntry 配列
 * @param source - registry の出所識別子 (dir path 等)
 *
 * @example
 *   import { readdirSync } from 'node:fs'
 *   const projectsDir = '/repo/projects'
 *   const names = readdirSync(projectsDir).filter((n) => !n.startsWith('_'))
 *   const reg = filesystemRegistry(
 *     names.map((name) => ({
 *       name,
 *       absPath: path.join(projectsDir, name),
 *       displayPath: `projects/${name}`,
 *     })),
 *     'projects/',
 *   )
 *   // reg.entries.get('canonicalization-domain-consolidation') → FileEntry
 */
export function filesystemRegistry(
  entries: readonly FileEntry[],
  source: string,
): Registry<FileEntry> {
  const map = new Map<string, FileEntry>();
  for (const entry of entries) {
    map.set(entry.name, entry);
  }
  return { source, entries: map };
}
