/**
 * Version Sync Guard — AAG Layer 3 Execution
 *
 * **本ファイルは AAG 品質管理システムの管理下にあります。**
 *
 * 同じバージョン値が複数文書に重複して存在する箇所の整合性を、
 * `app/src/test/versionSyncRegistry.ts` (AAG Layer 2 Schema) に登録された
 * 同期ペア定義から **動的に検査** する。
 *
 * 検出する違反:
 * - V1: 比較元 / 比較先のいずれかのファイルが存在しない
 * - V2: 比較元 / 比較先のバージョン抽出が失敗した（format 違反）
 * - V3: 比較元と比較先の値が一致しない（drift）
 *
 * **新しい同期ペアを追加するには:**
 * 本ファイルではなく `versionSyncRegistry.ts` に 1 entry 追加する。
 * 本 guard は registry を loop するため、追加したら自動的に検査対象になる。
 *
 * **管理下にあることの意味:**
 * - 違反があれば `npm run test:guards` および CI で fail する
 * - 新しい version 重複を repo に持ち込むときは必ず registry に登録する
 * - 「気をつける」運用ルールに依存しない
 *
 * AAG レイヤー対応:
 * - Layer 2 Schema: `app/src/test/versionSyncRegistry.ts` (宣言)
 * - Layer 3 Execution: 本ファイル (検出)
 * - Layer 4A System Operations: governance ガイド §12 (運用ルール)
 *
 * @see app/src/test/versionSyncRegistry.ts
 * @see references/03-guides/project-checklist-governance.md §12
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { VERSION_SYNC_REGISTRY } from '../versionSyncRegistry'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')

function readFileOrUndefined(relPath: string): string | undefined {
  const abs = path.join(PROJECT_ROOT, relPath)
  if (!fs.existsSync(abs)) return undefined
  return fs.readFileSync(abs, 'utf-8')
}

describe('Version Sync Guard (AAG 管理下)', () => {
  it('VERSION_SYNC_REGISTRY に少なくとも 1 ペアが登録されている', () => {
    expect(VERSION_SYNC_REGISTRY.length).toBeGreaterThan(0)
  })

  for (const pair of VERSION_SYNC_REGISTRY) {
    describe(pair.id, () => {
      it('V1: 比較元 / 比較先のファイルが存在する', () => {
        const sourceContent = readFileOrUndefined(pair.source.file)
        const targetContent = readFileOrUndefined(pair.target.file)
        expect(
          sourceContent,
          `[V1] 比較元ファイル '${pair.source.file}' が存在しない\n  registry: ${pair.id}\n  → versionSyncRegistry.ts の entry を確認するか、ファイルを復元してください。`,
        ).toBeDefined()
        expect(
          targetContent,
          `[V1] 比較先ファイル '${pair.target.file}' が存在しない\n  registry: ${pair.id}\n  → 同上`,
        ).toBeDefined()
      })

      it('V2: 比較元 / 比較先のバージョン値が抽出できる', () => {
        const sourceContent = readFileOrUndefined(pair.source.file) ?? ''
        const targetContent = readFileOrUndefined(pair.target.file) ?? ''
        const sourceVal = pair.source.extract(sourceContent)
        const targetVal = pair.target.extract(targetContent)
        expect(
          sourceVal,
          `[V2] 比較元 '${pair.source.label}' からバージョンを抽出できなかった\n  file: ${pair.source.file}\n  registry: ${pair.id}\n  → ファイル形式が registry の extract 関数の前提と合っているか確認してください。`,
        ).toBeDefined()
        expect(
          targetVal,
          `[V2] 比較先 '${pair.target.label}' からバージョンを抽出できなかった\n  file: ${pair.target.file}\n  registry: ${pair.id}\n  → 同上`,
        ).toBeDefined()
      })

      it('V3: 比較元と比較先のバージョン値が一致する', () => {
        const sourceContent = readFileOrUndefined(pair.source.file) ?? ''
        const targetContent = readFileOrUndefined(pair.target.file) ?? ''
        const sourceVal = pair.source.extract(sourceContent)
        const targetVal = pair.target.extract(targetContent)
        expect(
          sourceVal,
          `[V3] バージョン drift を検出\n` +
            `  registry: ${pair.id}\n` +
            `  ${pair.source.label} = "${sourceVal}"\n` +
            `  ${pair.target.label} = "${targetVal}"\n` +
            `  → 両者を同じ値に揃えてください。リリース時は project-metadata.json の appVersion を上げてから ` +
            `package.json / CHANGELOG.md / recent-changes.md を同期させるのが標準。`,
        ).toBe(targetVal)
      })
    })
  }
})
