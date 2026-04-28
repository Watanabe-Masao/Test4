# projectization — canonicalization-domain-consolidation

> AAG-COA Level 判定 + nonGoals 明示。
> 規約: `references/03-guides/projectization-policy.md`。

## 1. 判定結果

**Level 4 (umbrella scope)**

- `changeType`: `architecture-refactor`
- `breakingChange`: **true**（旧経路の物理削除あり）
- `requiresLegacyRetirement`: **true**（旧 guard / 旧 parser / 重複 logic の sunset）
- `requiresGuard`: **true**（domain 自体の invariant test + 移行同一性検証）
- `requiresHumanApproval`: **true**（domain 境界の確定は人間判断）

## 2. Level 4 の根拠

projectization-policy §3 の Level 判定基準で:

| 基準 | 該当 |
|---|---|
| 複数 sub-architecture を跨ぐ | ✓ test guard + tools + AAG rule + docs/contracts + references/05-contents 全層 |
| 不可逆な変更を含む | ✓ 旧 guard 物理削除（並行運用観察期間後） |
| 多層 invariant の整理 | ✓ 13+ ペアの整合性 invariant を 1 domain に統合 |
| 横展開を伴う | ✓ Phase H で hooks / charts / stores 等への正本化拡張 |
| 観察期間が必要 | ✓ 各撤退に dual-emit 観察期間（≥ 1 週間 / 5 PR）|

Phase 単位では実質 **Level 3 で運用可能**（各 sub-phase は独立した sub-project 化候補）。
Umbrella としては Level 4。

## 3. 並行 active project との関係

| project | 関係 | 影響 |
|---|---|---|
| `phased-content-specs-rollout` | 並行 active | spec-state 系が本 project の reference 実装、Phase B で adapter 化 |
| `pure-calculation-reorg` | active overlay | calculationCanonRegistry 周辺を touch する Phase D Wave 1 で協調必要 |

## 4. nonGoals（明示）

`config/project.json.projectization.nonGoals` と一致:

- **drift 検出強度の弱体化**（リファクタは強度を保ったまま重複削減のみ）
- **ドメイン logic の振る舞い変更**（meta レベルの統合のみ、domain calc / readModel は不変）
- **新規 registry+guard の一斉導入**（横展開は selection rule 通過 + 1 候補 = 1 PR）
- **`phased-content-specs-rollout` の進行妨害**（並行 active、本 project が phased を待つ）
- **active overlay の自動切替**（CURRENT_PROJECT.md = `pure-calculation-reorg` のまま、切替判断は別途）

## 5. ratchet-down baseline 戦略

各 wave ごとに:

| step | baseline 操作 |
|---|---|
| 並行運用開始 | 旧 guard baseline は **凍結**（増加禁止）、新 domain guard baseline は旧と同値で開始 |
| 観察期間 | 両 baseline の dual-emit が等しいことを毎 PR 検証 |
| @deprecated 化 | 旧 baseline = 新 baseline で **freeze**、増加は新 domain 側のみ受ける |
| 物理削除 | 旧 baseline 廃止、新 domain 側に統合 |

## 6. 観察期間（撤退時）

各 sub-phase の sunset には:

- 最小 **1 週間 / 5 PR** の dual-emit 観察期間
- 観察期間中の drift 数差分が 0 を維持（同一性検証）
- 差分が出たら撤退停止 → root cause 修正 → 観察期間再開

## 7. 着手判定

本 project が **Phase A 着手するための前提条件**:

- [x] 本 plan / checklist / projectization が landed
- [ ] `phased-content-specs-rollout` Phase D Step 1 までが安定
- [ ] documentation-steward + architecture が selection rule の draft をレビューする時間を確保

未満足の場合は **draft 状態のまま** 寝かせる（Phase 0 完遂のみで commit、active 化は別 PR）。
