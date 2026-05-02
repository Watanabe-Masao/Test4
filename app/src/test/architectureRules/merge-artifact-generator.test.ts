/**
 * Merge Artifact Generator — vitest runner wrapper
 *
 * vitest を runner として `merge-artifact-generator.ts` の generator function を
 * 実行する。理由: alias 解決 (`@app-domain` / `@/test` / `@project-overlay`) は
 * vite/vitest config 経由でしか機能しないため (tsx 単体実行では CJS/ESM interop
 * の問題が発生)。
 *
 * 実行方法:
 *   - 通常 test 実行時 (`npm run test`): describe.skip で no-op
 *   - 環境変数 `AAG_GENERATE_ARTIFACT=1` 時のみ generation を実行
 *     (= `npm run generate:merged-artifact` 経由)
 *
 * 出力: `docs/generated/aag/merged-architecture-rules.json`
 *
 * @see references/01-principles/aag/source-of-truth.md §4 (Merge Policy canonical)
 * @see ./merge-artifact-generator.ts (generator core)
 *
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { generateMergedArtifact, ARTIFACT_OUTPUT_PATH } from './merge-artifact-generator'

const SHOULD_GENERATE = process.env.AAG_GENERATE_ARTIFACT === '1'

if (SHOULD_GENERATE) {
  describe('Merge Artifact Generator (write mode)', () => {
    it('writes merged-architecture-rules.json', () => {
      const artifact = generateMergedArtifact()
      const repoRoot = resolve(__dirname, '../../../..')
      const outPath = resolve(repoRoot, ARTIFACT_OUTPUT_PATH)
      const outDir = dirname(outPath)
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }
      writeFileSync(outPath, JSON.stringify(artifact, null, 2) + '\n')
      console.log(`[merge-artifact-generator] wrote ${outPath}`)
      console.log(`  rules: ${artifact.summary.totalRules}`)
      console.log(
        `  fixNow: project-overlay=${artifact.summary.resolvedBy.fixNow['project-overlay']} / ` +
          `defaults=${artifact.summary.resolvedBy.fixNow.defaults}`,
      )
      console.log(
        `  reviewPolicy: project-overlay=${artifact.summary.resolvedBy.reviewPolicy['project-overlay']} / ` +
          `stub=${artifact.summary.resolvedBy.reviewPolicy.stub}`,
      )
      expect(artifact.summary.totalRules).toBeGreaterThan(0)
    })
  })
} else {
  describe.skip('Merge Artifact Generator (read mode)', () => {
    it('skipped (set AAG_GENERATE_ARTIFACT=1 to run)', () => {})
  })
}
