# HANDOFF — widget-context-boundary（SP-A）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 6 Wave 1 で spawn 済み。status: `active` / parent: `architecture-debt-recovery`。PR 0 実施。**

本 project は umbrella Lane A sub-project。**45 widget 全件に影響**する最重量級。後続 SP-B を unlock する起点。

### spawn 時 landed

- `config/project.json` / `AI_CONTEXT.md` / `HANDOFF.md`（本 file）/ `plan.md` / `checklist.md` / `aag/execution-overlay.ts`

### 残タスク

umbrella `inquiry/15 §Lane A` 4 ADR × 4 step = **16 PR**。

## 2. 次にやること

### Wave 1 内推奨開始順

1. **ADR-A-001 PR1**: `unifiedWidgetContextNoPageLocalOptionalGuard` baseline=5 で追加
2. **ADR-A-003 PR1**: `sameInterfaceNameGuard` baseline=1（WidgetDef のみ allowlist）で追加
3. **ADR-A-004 PR1**: `coreRequiredFieldNullCheckGuard` baseline=2（WID-031, WID-033）で追加
4. **ADR-A-002 PR1**: `unifiedWidgetContextNoDashboardSpecificGuard` baseline=20 で追加

PR1 全て完了後:
- PR2（新型導入）→ PR3（consumer 移行）→ PR4（旧型削除 + baseline=0）
- ADR-A-001 / A-002 の consumer 移行（PR3）で 45 widget 全件を順次新型に切替
- 各 widget の `references/05-contents/widgets/WID-NNN.md` の `lastVerifiedCommit` を PR ごとに更新

### 依存

- **ADR-A-004** は ADR-A-001 / A-002 / A-003 完了後に着手（discriminated union は ctx 型分離後の方が影響 isolate しやすい）

## 3. ハマりポイント

### 3.1. 45 widget 影響の段階移行

一気に変えると回帰リスク大。ADR-A-001 / A-002 の PR3 は **複数 batch に分ける**（例: INSIGHT 6 widget を 1 batch、COST_DETAIL 4 widget を 1 batch 等）。各 batch で visual / E2E 検証。

### 3.2. `WidgetDef` rename の間の alias

PR2 で `DashboardWidgetDef` / `UnifiedWidgetDef` を新設した直後、既存 `WidgetDef` を両 file で alias として残置。PR4 で alias 削除。**alias 期間中**に全 consumer を新名に切替える。

### 3.3. discriminated union 化の型 narrowing 影響

`StoreResult` / `PrevYearData` が discriminated union になると、consumer 側で `status === 'ready'` type narrowing が必要になる。これは SP-B の null check 解消（ADR-B-001）で同時に解消されるため、本 project は narrowing の必要性を surface するだけでよい（実際の解消は SP-B）。

### 3.4. WSS spec の `lastVerifiedCommit` 更新

45 spec（WID-001〜WID-045）の frontmatter `lastVerifiedCommit` を各 PR で更新（手動）。Phase 6 後半で WSS generator（別 project）が実装されれば自動化される。本 project では手動更新を 16 PR で繰り返す。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | 4 ADR 実行計画 |
| `checklist.md` | Phase 別 completion 条件 |
| `config/project.json` | project manifest |
| `aag/execution-overlay.ts` | rule overlay |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane A` | 4 ADR 元台帳 |
| `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-1〜BC-4` | 4 破壊的変更 |
| `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001〜LEG-008` | 8 legacy item |
| `projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md` | WSS 45 widget concern 連結 |
| `references/05-contents/widgets/WID-NNN.md` | 各 widget の現状把握（PR ごと更新） |
