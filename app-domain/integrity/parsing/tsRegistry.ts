/**
 * app-domain/integrity/parsing/tsRegistry.ts —
 * TS named const (`Record<string, TEntry>`) → `Registry<TEntry>` 変換 primitive
 * (Phase D Wave 1)
 *
 * 既存 guard が `import { CALCULATION_CANON_REGISTRY } from '../...'` のように
 * TS 側で named const を import して `Object.entries` で iterate しているパターンを
 * domain 経由に統一する。caller が record を import → 本 primitive が Registry 化。
 *
 * 設計: integrity-domain-architecture.md §3.2 (tsRegistry primitive)
 *
 * 利用ペア (Phase D-): #1 calc canon / #6 taxonomy v2 / #8 architecture rules /
 *                     #9 allowlists / #11 obligation
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (caller が import 済 record を渡すだけ)
 * - 外部 import なし (types.ts のみ)
 * - 入力 record の所有権を奪わない (Registry.entries は新規 Map で構築)
 */
import type { Registry } from "../types";

/**
 * tsRegistry — `Record<string, TEntry>` を `Registry<TEntry>` にラップ。
 *
 * @param record - caller が import した TS const (例: `CALCULATION_CANON_REGISTRY`)
 * @param source - registry の出所識別子 (file path 等)。violation 報告で使用
 *
 * @example
 *   import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'
 *   const reg = tsRegistry(CALCULATION_CANON_REGISTRY, 'app/src/test/calculationCanonRegistry.ts')
 *   // reg.entries.get('foo.ts') → CanonEntry
 */
export function tsRegistry<TEntry>(
  record: Readonly<Record<string, TEntry>>,
  source: string,
): Registry<TEntry> {
  return {
    source,
    entries: new Map(Object.entries(record)),
  };
}
