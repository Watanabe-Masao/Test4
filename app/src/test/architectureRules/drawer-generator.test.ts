/**
 * Drawer Generator — vitest runner wrapper
 *
 * `merge-artifact-generator.test.ts` と同じ pattern (alias 解決のため vitest 経由)。
 * 環境変数 `AAG_GENERATE_ARTIFACT=1` 指定時のみ generation 実行 (= `npm run
 * generate:drawers` 経由)。
 *
 * 出力: `docs/generated/aag/{rule-index, rules-by-path, rule-by-topic}.json`
 *
 * @see ./drawer-generator.ts
 *
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import {
  buildRuleIndex,
  buildRulesByPath,
  buildRuleByTopic,
  RULE_INDEX_PATH,
  RULES_BY_PATH_PATH,
  RULE_BY_TOPIC_PATH,
} from './drawer-generator'

const SHOULD_GENERATE = process.env.AAG_GENERATE_ARTIFACT === '1'

function writeJson(relPath: string, content: unknown): string {
  const repoRoot = resolve(__dirname, '../../../..')
  const outPath = resolve(repoRoot, relPath)
  const outDir = dirname(outPath)
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }
  writeFileSync(outPath, JSON.stringify(content, null, 2) + '\n')
  return outPath
}

if (SHOULD_GENERATE) {
  describe('Drawer Generator (write mode)', () => {
    it('writes rule-index.json', () => {
      const artifact = buildRuleIndex()
      const out = writeJson(RULE_INDEX_PATH, artifact)
      console.log(`[drawer-generator] wrote ${out} (rules: ${artifact.summary.totalRules})`)
      expect(artifact.summary.totalRules).toBeGreaterThan(0)
    })

    it('writes rules-by-path.json', () => {
      const artifact = buildRulesByPath()
      const out = writeJson(RULES_BY_PATH_PATH, artifact)
      console.log(
        `[drawer-generator] wrote ${out} (mapped: ${artifact.summary.mappedRules} / unmapped: ${artifact.summary.unmappedRules})`,
      )
      expect(artifact.summary.totalRules).toBeGreaterThan(0)
    })

    it('writes rule-by-topic.json', () => {
      const artifact = buildRuleByTopic()
      const out = writeJson(RULE_BY_TOPIC_PATH, artifact)
      console.log(
        `[drawer-generator] wrote ${out} (slices: ${artifact.summary.slices} / responsibilityTags: ${artifact.summary.responsibilityTags} / guardTags: ${artifact.summary.guardTags})`,
      )
      expect(artifact.summary.totalRules).toBeGreaterThan(0)
    })
  })
} else {
  describe.skip('Drawer Generator (read mode)', () => {
    it('skipped (set AAG_GENERATE_ARTIFACT=1 to run)', () => {})
  })
}
