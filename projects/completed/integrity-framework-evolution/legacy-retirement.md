# legacy-retirement — integrity-framework-evolution

> 役割: 本 project が `requiresLegacyRetirement=true` の対象として撤退する旧 schema /
> 旧 archive 形式 / 旧 collector logic を列挙し、撤退順序 / sunset 条件 / rollback を記録。
>
> 規約: `references/03-guides/projectization-policy.md` §5。
> 撤退規律 default: `references/01-principles/canonicalization-principles.md §P9` (step 5 直接到達)。

## 1. 撤退規律

正本: `canonicalization-principles.md §P9` (前駆 project Phase E で institutionalize)。

- **default**: step 5 直接到達 (in-place migration)
- **5 step フルコース**: 公開 API / 別 file 論理移動 / 多数 caller (≥ 5 file) のいずれかに該当する場合のみ
- 本 project では Phase R-① / R-② で 1 PR 一括移行 (step 5 直接到達) を default とする

## 2. 撤退対象一覧 (Phase R 着手時に具体化)

### 2.1 旧 archive schema (Phase R-② で撤退)

| 旧 schema | 場所 | 新 schema (Phase R-② 後) |
|---|---|---|
| `rejected[].{ originalSlot, replacedBy, reason, decidedAt }` (現状 4 field) | `adoption-candidates.json` | `DecisionRecord` schema (when / who / why / evidence / reversal / state)、追加 field 必須化 |
| `existingPairs[].primitives` (slot 名 array) | 同 | `CanonicalContract` reference (Phase R-① の contract 経由) |
| ad-hoc `deferred[]` (handoff 注記のみ) | 同 | `DecisionRecord` schema 統一 |
| (新設) `accepted[]` archive | 同 | `DecisionRecord` schema、Phase R-② で初設 |
| (新設) `retired[]` archive | 同 | `DecisionRecord` schema、Phase R-② で初設 |
| (新設) `scope-changes[]` archive | 同 | `DecisionRecord` schema、Phase R-② で初設 |

### 2.2 旧 COVERAGE_MAP shape (Phase R-① で撤退)

| 旧 field | 新 representation |
|---|---|
| `guardFiles[]` (string array) | `contract.derivation.guards[]` (CanonicalContract 内) |
| `maxLines` (Record<string, number>) | `contract.derivation.adapterShape[]` |
| `status: 'migrated' \| 'deferred'` | `lifecycleState: LifecycleState` (6 states) |
| `deferReason` (string) | `DecisionRecord.why` (移行先) |

### 2.3 旧 integrity-collector regex parse (Phase R-① で撤退)

| 旧 logic | 新 logic |
|---|---|
| `pairId:\s*'([^']+)'` regex 抽出 | TypedReader (`CanonicalContract` を構造化 parse) |
| `status:\s*'(migrated\|deferred)'` regex 抽出 | `LifecycleState` enum 直接 read |
| `guardFiles:\s*\[([^\]]*)\]` regex 抽出 | `contract.derivation.guards[]` 直接 read |
| sanity check 不在 | `contract.assertions[]` 検証 |

### 2.4 旧 selection rule / 撤退規律 prose (Phase R-③ で撤退)

| 旧 表記 | 新 表記 |
|---|---|
| §P8 G-1/G-2/G-3 が prose 列挙のみ | 各 gate に `zone: ZoneTag` 必須化 (mechanism / judgement / hybrid) |
| §P9 step 5 vs 5 step 条件が prose のみ | 条件 (a)/(b)/(c) に `zone` tag、機械判定可能な部分を mechanism zone に |
| canonicalization-checklist.md の §1〜§3 が prose 列挙 | 各 step を zone 別に再構造化 |

## 3. sunsetCondition / expiresAt 候補

各 Phase R reform 完了 PR の `@deprecated` JSDoc 標準 metadata:

```
/**
 * @deprecated since 2026-MM-DD (Phase R-N landing)
 * @expiresAt 2026-MM-DD (Phase R 完了 + 1 month observation)
 * @sunsetCondition Phase R-N 完了 + 全 consumer 移行確認 + KPI Hard Gate PASS 状態維持
 * @reason Phase R で <旧 schema 名> を <新 schema 名> に格上げ、移行完了
 */
```

## 4. 影響を受ける外部 consumer

詳細: `breaking-changes.md §3` 参照。

## 5. rollback 戦略

| step | rollback 可否 | 戦略 |
|---|---|---|
| Phase R-① contract schema (additive) | ○ revert 容易 | type 削除のみで戻る |
| Phase R-② archive 1 PR 一括移行 | △ revert 困難 | git revert で戻すが、observation 期間中の新 entry は手動 backfill 必要 |
| Phase R-③ zone tag 追加 (additive) | ○ revert 容易 | tag 削除のみで戻る |
| Phase R-④/⑤/⑥ | ○ revert 容易 | 各 reform は独立、影響範囲が限定 |

## 6. 撤退完了の検証

各 Phase R 完了時:

- [ ] 旧 schema を参照する caller = 0 (grep + import 検査)
- [ ] 新 schema 経由で旧 KPI 値が再現される (regression なし)
- [ ] `architecture-health.json integrity.*` 全 KPI が Hard Gate PASS
- [ ] `legacy-retirement.md §7` (本 doc) に actual sunset 日付を記録
- [ ] 前駆 project の `canonicalization-principles.md §P9` 撤退規律に従う

## 7. 進行状況 (Phase 別、Phase R 着手時に追記)

(空 — Phase R-① 着手 PR で R-① 撤退結果を追記)

## 8. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。Phase 0 bootstrap。Phase R 着手時に具体的撤退対象 + 順序 + sunsetCondition を確定する predicate 形式 |
