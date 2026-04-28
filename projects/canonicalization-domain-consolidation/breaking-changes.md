# breaking-changes — canonicalization-domain-consolidation

> 役割: 本 project が `breakingChange=true` の対象として破壊する公開契約 / 型 / API と、その移行方針を列挙する。Phase A の inventory が進むにつれて具体化していく（draft 段階）。

## 1. 破壊対象の概要

本 project は **整合性 domain への統合** を行うため、次のカテゴリで現行 API / 型 / 経路に
breaking change が発生しうる。すべて段階的撤退（plan.md §5「撤退規律 5 step」）を経由するため、
**1 PR で一斉に壊さない**。

## 2. 想定される破壊（Phase A の inventory で精査）

### 2.1. 型 / interface

| 対象 | 破壊内容（想定） | 移行方針 |
|---|---|---|
| `app/src/test/guards/contentSpecHelpers.ts` の SpecFrontmatter / SpecKind | `app-domain/integrity/types.ts` に移動、helper は re-export | 1 PR で alias 残置 → 観察 → import 切替 → alias 削除 |
| 各 guard 固有の Registry 型（calculationCanonRegistry の CanonEntry 等） | domain の `Registry<TEntry>` で表現可能なものは generic 化 | 旧型は `@deprecated` 経由で残置、callers 切替後に削除 |
| `tools/widget-specs/generate.mjs` の private API | domain primitive を呼ぶ薄い layer に refactor | CLI surface は不変、内部 helper のみ |

### 2.2. 検証 API（guard test の関数）

| 対象 | 破壊内容 | 移行方針 |
|---|---|---|
| `findIdLine` / `findExportLine` 等の helper | `app-domain/integrity/parsing/` 経由に移動 | helper export を維持、内部実装を delegate |
| `parseSpecFrontmatter` | domain 経由 (`app-domain/integrity/parsing/yamlFrontmatter.ts`) | 同上 |

### 2.3. 旧 guard ファイル（物理削除）

Phase E で物理削除する旧 guard は `legacy-retirement.md` に列挙する（本 doc では型 / API の破壊のみ扱う）。

## 3. 移行戦略の規律

### 3.1. dual-emit 期間（観察）

各 breaking change には:

- 並行運用期間 ≥ **1 週間 / 5 PR**
- 観察期間中は新旧 API が **同 violation 集合** を返すこと
- 期間中に差分が出たら撤退停止 → root cause 修正 → 再開

### 3.2. @deprecated marking

撤退対象に必ず:

```ts
/**
 * @deprecated since 2026-MM-DD
 * @expiresAt 2026-MM-DD (sunsetCondition 達成後の物理削除目標日)
 * @sunsetCondition 「<具体的撤退条件>」
 * @reason canonicalization-domain-consolidation Phase E 経由で domain primitive に統合
 */
```

`deprecatedMetadataGuard` がこの 4 metadata を要求する。違反は CI hard fail。

### 3.3. rollback 戦略

各 PR が単独で revert 可能:

- adapter / re-export 経由で旧 API は維持される
- 物理削除 PR のみ revert 困難（新 domain への切替後、旧 file は git history のみ）
- 物理削除前に **必ず 1 段階前** で観察期間が完了している必要がある

## 4. ratchet-down baseline の保護

各 guard が持つ ratchet-down baseline:

- 撤退 PR で baseline を **増加させない**（plan.md §2 不可侵原則 1: drift 検出強度を弱めない）
- 旧 baseline = 新 baseline で **freeze**、増加は新 domain 側のみ受ける
- 物理削除 PR で旧 baseline を廃止、新 domain 側に統合

## 5. 影響を受ける外部 consumer

draft 段階では未確定。Phase A の inventory 完了時に追記する:

- `tools/widget-specs/generate.mjs`（spec-state 系の reference 実装）
- `tools/architecture-health/src/collectors/*`（KPI 集計系）
- 各 guard test の test helper utility
- CI workflow（test:guards 経路は不変だが、新 domain test の追加あり）

## 6. 公開契約の維持義務

以下は **絶対に破壊しない**:

- `npm run test:guards` 経由の hard fail パス
- `npm run docs:check` の hard gate
- `tools/widget-specs/generate.mjs --check` の exit code 約束（0 = OK / 1 = drift / 2 = error）
- `node tools/widget-specs/generate.mjs --inject-jsdoc` の idempotent 性
- AR-CONTENT-SPEC-* 6 rule の severity / detection
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS の 4 test の violation message format（CI ログ習慣性）

これらは内部実装を refactor しても **外部から見て不変**であること。

## 7. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-27 | 初版（draft）。Phase A inventory 完了時に具体的破壊対象を確定する predicate 形式で起草 |
