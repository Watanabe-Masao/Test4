# Discovery Review チェックリスト

## 目的

AAG の「観測」区分（20 ルール）を月次で確認し、
制度の健全性を評価する。コードを直す対象ではなく、
ルール・allowlist・ガードの品質を点検する。

## 実施頻度

月 1 回（月初推奨）

## チェック項目

### 1. 構造品質の観測（12 ルール）

| # | 確認項目 | コマンド / 参照先 | 判定 |
|---|---------|------------------|------|
| 1 | AnalysisFrame が唯一入口か | `npm run test:guards` (analysisFrameGuard) | PASS/FAIL |
| 2 | calculations/ 全ファイルが REGISTRY 登録済みか | calculationCanonGuard | PASS/FAIL |
| 3 | required Zod 契約が全て実装済みか | canonicalizationSystemGuard | PASS/FAIL |
| 4 | review Zod 未済の進捗 | canonicalizationSystemGuard 出力 | 件数確認 |
| 5 | PI/GAP が正本 input builder 経由か | canonicalInputGuard | PASS/FAIL |
| 6 | readModel が正本化原則に従っているか | canonicalizationSystemGuard | PASS/FAIL |
| 7 | ComparisonScope 生成経路が唯一か | comparisonScopeGuard | PASS/FAIL |
| 8 | 既知バグパターンが防止されているか | dataIntegrityGuard | PASS/FAIL |
| 9 | dual-run が退役済みか | dualRunExitCriteriaGuard | PASS/FAIL |
| 10 | readModel に usedFallback があるか | fallbackMetadataGuard | PASS/FAIL |
| 11 | PAGE_REGISTRY が整合しているか | pageMetaGuard | PASS/FAIL |
| 12 | presentation の localStorage 使用がないか | renderSideEffectGuard | PASS/FAIL |

### 2. Temporal Governance の観測（4 ルール）

| # | 確認項目 | コマンド / 参照先 | 判定 |
|---|---------|------------------|------|
| 13 | 期間スコープ分離が守られているか | temporalScopeGuard | PASS/FAIL |
| 14 | ローリング計算パス逆流がないか | temporalRollingGuard | PASS/FAIL |
| 15 | バレル・feature 命名規約が守られているか | structuralConventionGuard | PASS/FAIL |
| 16 | Chart の DuckDB 直接 import がないか | queryPatternGuard | PASS/FAIL |

### 3. メタルール（4 ルール）

| # | 確認項目 | 確認方法 | 判定 |
|---|---------|---------|------|
| 17 | alignment-aware が handler に閉じているか | queryPatternGuard | PASS/FAIL |
| 18 | 未分類ファイル数が増えていないか | responsibilityTagGuard (UNCLASSIFIED_BASELINE) | 件数確認 |
| 19 | キャッシュ ≤ 本体が守られているか | sizeGuard | PASS/FAIL |
| 20 | @responsibility タグの選択が妥当か | responsibilityTagGuard (TAG_MISMATCH_BASELINE) | 件数確認 |

### 4. heuristic ルールの Review Policy

| # | 確認項目 | 確認方法 |
|---|---------|---------|
| 21 | heuristic ルールの lastReviewedAt が 90 日以内か | architectureRules.ts の reviewPolicy を確認 |
| 22 | sunsetCondition を満たしたルールがないか | architectureRules.ts の sunsetCondition を確認 |
| 23 | 回避パターンが増えていないか（allowlist 推移） | architecture-health.json の allowlist KPI を確認 |

### 5. 全体 Health 確認

| # | 確認項目 | コマンド |
|---|---------|---------|
| 24 | Hard Gate が PASS か | `npm run health:check` |
| 25 | WARN → FAIL に悪化した KPI がないか | architecture-health-certificate.md |
| 26 | Next Actions が空でないか | architecture-health.md の Recommended セクション |

## 実施手順

```bash
# 1. 全ガードテスト実行
cd app && npm run test:guards

# 2. health 確認
npm run health:check

# 3. certificate 確認
cat ../references/02-status/generated/architecture-health-certificate.md

# 4. heuristic ルールの reviewPolicy 確認
grep -A2 'lastReviewedAt' src/test/architectureRules.ts | head -30
```

## 結果記録

レビュー完了後:
1. heuristic ルールの `reviewPolicy.lastReviewedAt` を更新
2. `npm run docs:generate` を実行
3. コミットメッセージ: `chore: Discovery Review YYYY-MM`

## 参照

- 運用区分表: `references/01-principles/aag-operational-classification.md`
- Architecture Rule 運用ガイド: `references/03-guides/architecture-rule-system.md`
- Allowlist 管理: `references/03-guides/allowlist-management.md`
