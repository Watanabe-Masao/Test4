# Legacy Governance Retirement Plan

## 概要

Architecture Rule システム（新制度）が temporal governance まで含む 25 KPI に成長した。
旧制度（ハードコード baseline / 時間軸なし allowlist / 旧来 health KPI）は
新制度に置換されたものと、依然として独自の価値を持つものが混在している。

**方針: 旧制度は「read-only 化 → 新制度で代替確認 → 段階的削除」で撤退する。**

## 旧制度と新制度の対応表

### 完全に新制度で代替済み（削除候補）

| 旧制度 | 新制度の代替 | 削除条件 |
|---|---|---|
| `architectureEpoch.ts` | `ArchitectureRule.epoch` | **削除済み** |
| `responsibilityTagExpectations.ts` | `AR-TAG-*` ルール | **削除済み** |
| TAG_EXPECTATIONS のハードコード | `AR-TAG-*` の thresholds | **統合済み** |
| UNCLASSIFIED_SNAPSHOT | `UNCLASSIFIED_BASELINE` (ratchet-down) | **移行済み** |

### 旧制度は維持するが新規追加を禁止（凍結）

| 旧制度 | 理由 | 凍結条件 |
|---|---|---|
| `allowlist.total` KPI | 旧 allowlist 件数の全体把握 | 新規 allowlist は ruleId 必須 |
| `allowlist.active.count` KPI | active 件数の把握 | temporal.activeDebt.count と併用 |
| `guard.reviewOnlyTags.count` KPI | レビュー専用タグの監視 | 新規追加禁止（0 維持） |
| `compat.bridge.count` / `compat.reexport.count` | 後方互換の監視 | ratchet-down で管理中 |

### 旧制度で独自の価値を持ち続ける（維持）

| 旧制度 | 理由 |
|---|---|
| `boundary.presentationToInfra` / `boundary.infraToApplication` | 層境界の hard gate（Architecture Rule とは別の検出経路） |
| `complexity.hotspot.count` / `complexity.nearLimit.count` | 複雑度の定量把握（新制度の ruleClass とは観点が異なる） |
| `docs.obsoleteTerms.count` / `docs.generatedSections.stale` | ドキュメント整合性（新制度と独立） |
| `docs.obligation.violations` | パス変更 → 更新義務（新制度と独立） |
| `perf.*` KPI | パフォーマンス（新制度のスコープ外） |

## 凍結ルール

1. **旧制度の KPI を新規追加しない** — 新しい KPI は temporal.* プレフィックスで追加
2. **旧制度の allowlist エントリは ruleId 必須** — ruleId なしの新規追加を禁止
3. **旧制度の collector を変更しない** — バグ修正のみ許容
4. **旧制度のドキュメントに live count を書かない** — generated health が唯一の live source

## 削除スケジュール

| 段階 | 条件 | 対象 |
|---|---|---|
| 即時 | 既に完了 | architectureEpoch.ts, responsibilityTagExpectations.ts |
| 近日 | temporal KPI で完全代替を確認 | allowlist.active.count（temporal.activeDebt.count と重複） |
| 将来 | guard.reviewOnlyTags.count が 0 で安定 | guard.reviewOnlyTags.count KPI |
| 不要 | 削除しない | boundary.*, complexity.*, docs.*, perf.* |

## 完了条件

この撤退計画が「完了」と言えるのは:
1. 旧制度でしか見えない指標がゼロ
2. 新制度の temporal KPI が全て ratchet-down で保全
3. generated health が唯一の運用ダッシュボード
4. 人間の文書に live count が残っていない
