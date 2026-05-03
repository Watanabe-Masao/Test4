# AAG Phase 4〜6 実装計画

## 前提: Phase 1〜3 の実装済み資産

| Phase | 成果物 | 状態 |
|-------|--------|------|
| 1 | `fixNow` / `entrypointSummary` / `slice` を ArchitectureRule 型に追加 | ✅ 完了 |
| 2 | 全 94 ルールに fixNow (now/debt/review) + slice を設定 | ✅ 完了 |
| 3 | `AagResponse` / `buildAagResponse()` / `renderAagResponse()` / `buildObligationResponse()` | ✅ 完了 |

### 現在の入口ポイント（統一前）

| 入口 | 現在のフォーマット | 使用箇所 |
|------|-----------------|---------|
| Guard テスト | `formatViolationMessage()` (181 箇所) | vitest 出力 |
| Obligation | 自前の文字列 | health KPI + docs:check |
| Health certificate | 独自 Markdown | generated/ |
| PR comment | `renderPrComment()` | GitHub Actions |
| Pre-commit | shell echo | コミット時 |

---

## Phase 4: 入口品質 KPI

### 目的

AAG の入口が「薄く、必要十分」かどうかを測る。

### 実装

`architectureRuleGuard.test.ts` の情報出力セクションに追加:

```typescript
// Phase 4: 入口品質サマリー
it('入口品質サマリー（情報出力）', () => {
  const withSummary = ARCHITECTURE_RULES.filter(r => r.entrypointSummary)
  const withSteps = ARCHITECTURE_RULES.filter(r => r.migrationPath?.steps.length)
  const withExceptions = ARCHITECTURE_RULES.filter(r => r.decisionCriteria?.exceptions)

  console.log(`[入口品質] entrypointSummary: ${withSummary.length}/${ARCHITECTURE_RULES.length}`)
  console.log(`[入口品質] migrationPath: ${withSteps.length}/${ARCHITECTURE_RULES.length}`)
  console.log(`[入口品質] decisionCriteria: ${withExceptions.length}/${ARCHITECTURE_RULES.length}`)

  // fixNow 分布
  const fixDist = { now: 0, debt: 0, review: 0, unset: 0 }
  for (const r of ARCHITECTURE_RULES) fixDist[r.fixNow ?? 'unset']++
  console.log(`[fixNow] now: ${fixDist.now} | debt: ${fixDist.debt} | review: ${fixDist.review}`)

  // slice 分布
  const sliceDist: Record<string, number> = {}
  for (const r of ARCHITECTURE_RULES) {
    const s = r.slice ?? 'unset'
    sliceDist[s] = (sliceDist[s] ?? 0) + 1
  }
  for (const [s, c] of Object.entries(sliceDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`)
  }

  expect(true).toBe(true)
})
```

### 将来の拡張 KPI

| KPI | 計測方法 | 追加タイミング |
|-----|---------|-------------|
| entrypointSummary カバレッジ | `withSummary.length / total` | Phase 4 |
| migrationPath カバレッジ | `withSteps.length / total` | Phase 4 |
| commonMistakes カバレッジ | `withMistakes.length / total` | Phase 5 以降 |

**工数:** S

---

## Phase 5: 自動解決の拡張

### 目的

違反時レスポンスを返す前に、自動で解決できるものは解決する。

### 実装 5-1: pre-commit hook への slice 表示

現在の pre-commit は「obligation detected」とだけ表示。
どのスライスが影響を受けたかを表示する。

```shell
# 変更パスから影響スライスを推定
if echo "$STAGED" | grep -q "app/src/test/allowlists/\|app/src/test/guards/"; then
  echo "  影響スライス: responsibility-separation / governance-ops"
fi
if echo "$STAGED" | grep -q "app/src/domain/\|app/src/application/readModels/"; then
  echo "  影響スライス: canonicalization"
fi
```

**工数:** S

### 実装 5-2: renderAagResponse を PR comment に統合

`renderPrComment()` が Hard Gate FAIL を報告する際に、
失敗した KPI に対応する rule を特定し `renderAagResponse()` で
修正手順を表示する。

```typescript
// Hard Gate FAIL 時
for (const kpi of hardFails) {
  const rule = findRuleForKpi(kpi.id) // KPI → rule のマッピング
  if (rule) {
    const resp = buildAagResponse(rule, [], 'health')
    lines.push(renderAagResponse(resp))
  }
}
```

**工数:** M — KPI → rule のマッピングテーブルが必要

### 実装 5-3: obligation 違反時に buildObligationResponse を使用

`obligation-collector.ts` が違反を検出した際、
`buildObligationResponse()` を使って統一フォーマットで出力する。

現在:
```typescript
if (!satisfied) violations++
```

改善後:
```typescript
if (!satisfied) {
  violations++
  const resp = buildObligationResponse(rule.obligationId, rule.label, triggerPath)
  // health report に構造化レスポンスを含める
}
```

**工数:** M

---

## Phase 6: ルールレビューの入口化

### 目的

ルールの stale 化・noisy 化を、レポートではなく入口として返す。

### 実装 6-1: architectureRuleGuard の出力に AagResponse を使用

現在の「例外圧レポート」「review overdue」「sunset 候補」を
`renderAagResponse()` で統一フォーマット化。

```typescript
// 現在
console.log(`[例外圧レポート] ruleId 別の例外数:`)

// 改善後
for (const [ruleId, count] of highPressure) {
  const rule = getRuleById(ruleId)
  if (rule) {
    const resp = buildAagResponse(rule, [`例外 ${count} 件`], 'guard')
    console.log(renderAagResponse({
      ...resp,
      fixNow: 'review',
      summary: `${ruleId}: 例外圧 ${count} 件 — 分割を検討`,
    }))
  }
}
```

**工数:** S

### 実装 6-2: Health certificate に fixNow/slice を反映

`architecture-health-certificate.md` に、違反 KPI の fixNow 区分と
影響スライスを表示。

```markdown
## Hard Gate FAIL
- ❌ Doc 更新義務違反数: 1 / budget 0
  ⚡ 今すぐ修正 [governance-ops]
  対応: cd app && npm run docs:generate
```

**工数:** M — certificate renderer の修正

---

## 実施順序

| 順番 | Phase | 内容 | 工数 | 依存 |
|------|-------|------|------|------|
| 1 | **4** | 入口品質サマリーを guard test に追加 | S | なし |
| 2 | **5-1** | pre-commit に slice 表示 | S | なし |
| 3 | **6-1** | 例外圧/review overdue を AagResponse で出力 | S | Phase 3 |
| 4 | **5-2** | PR comment に renderAagResponse 統合 | M | Phase 3 |
| 5 | **5-3** | obligation に buildObligationResponse 統合 | M | Phase 3 |
| 6 | **6-2** | Health certificate に fixNow/slice 反映 | M | Phase 4 |

---

## 完了条件

- [ ] 全入口（guard/obligation/health/pre-commit/PR comment）が AagResponse 構造を使用
- [ ] fixNow/slice が全ての違反メッセージに表示される
- [ ] 入口品質 KPI が health レポートに含まれる
- [ ] 「AAG を知らなくても、エラーが返った瞬間に必要な判断だけ取れる」状態
