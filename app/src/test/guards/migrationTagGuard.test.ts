/**
 * 移行タグガード — 移行タグの健全性を検証する
 *
 * - 期限切れタグの放置を検出
 * - 完了条件を満たしたが除去されていないタグを検出
 * - active タグの集計を CI で報告
 * - removed タグが removedAt を持つことを検証
 *
 * @see app/src/test/migrationTagRegistry.ts
 * @guard I3
 */
import { describe, it, expect } from 'vitest'
import { MIGRATION_TAG_REGISTRY } from '../migrationTagRegistry'

describe('移行タグガード', () => {
  it('期限切れの active タグがない', () => {
    const today = new Date().toISOString().slice(0, 10)
    const expired = MIGRATION_TAG_REGISTRY.filter(
      (t) => t.status === 'active' && t.expiresAt < today,
    ).map((t) => `${t.id} (${t.targetPath}): 期限 ${t.expiresAt} — ${t.context}`)

    expect(
      expired,
      `期限切れの移行タグがあります。completionChecklist を実行して除去するか、expiresAt を延長してください:\n${expired.join('\n')}`,
    ).toEqual([])
  })

  it('ready-to-remove タグが放置されていない', () => {
    const stale = MIGRATION_TAG_REGISTRY.filter((t) => t.status === 'ready-to-remove').map(
      (t) =>
        `${t.id} (${t.targetPath}): 完了条件を満たしています。completionChecklist を実行して status を removed に変更してください`,
    )

    expect(stale, `除去可能な移行タグが放置されています:\n${stale.join('\n')}`).toEqual([])
  })

  it('removed タグは removedAt を持つ', () => {
    const violations = MIGRATION_TAG_REGISTRY.filter(
      (t) => t.status === 'removed' && !t.removedAt,
    ).map((t) => `${t.id}: status=removed だが removedAt が未設定`)

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('全 active タグに completionCriteria が1件以上ある', () => {
    const violations = MIGRATION_TAG_REGISTRY.filter(
      (t) => t.status === 'active' && t.completionCriteria.length === 0,
    ).map((t) => `${t.id}: completionCriteria が空。外す条件がないタグは作ってはいけない`)

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('全 active タグに completionChecklist が2件以上ある', () => {
    const violations = MIGRATION_TAG_REGISTRY.filter(
      (t) => t.status === 'active' && t.completionChecklist.length < 2,
    ).map(
      (t) =>
        `${t.id}: completionChecklist が ${t.completionChecklist.length} 件。最低2件（作業 + 除去後確認）必要`,
    )

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('全 active タグの completionChecklist の最後が確認ステップである', () => {
    const violations = MIGRATION_TAG_REGISTRY.filter((t) => {
      if (t.status !== 'active' || t.completionChecklist.length === 0) return false
      const last = t.completionChecklist[t.completionChecklist.length - 1]
      // 最後のステップは「確認」「verify」「test:guards」のいずれかを含むべき
      return !last.includes('確認') && !last.includes('verify') && !last.includes('test:guards')
    }).map(
      (t) =>
        `${t.id}: completionChecklist の最後が確認ステップではない。除去後の検証を含めてください`,
    )

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('移行タグの集計レポート', () => {
    const active = MIGRATION_TAG_REGISTRY.filter((t) => t.status === 'active')
    const readyToRemove = MIGRATION_TAG_REGISTRY.filter((t) => t.status === 'ready-to-remove')
    const removed = MIGRATION_TAG_REGISTRY.filter((t) => t.status === 'removed')

    if (active.length > 0 || readyToRemove.length > 0) {
      console.log('\n[移行タグ集計]')
      console.log(`  active: ${active.length}`)
      console.log(`  ready-to-remove: ${readyToRemove.length}`)
      console.log(`  removed: ${removed.length}`)
      for (const t of active) {
        console.log(`  [active] ${t.id}: ${t.targetPath} — 期限: ${t.expiresAt}`)
      }
    }

    // 集計テスト自体は常に pass（報告目的）
    expect(true).toBe(true)
  })
})
