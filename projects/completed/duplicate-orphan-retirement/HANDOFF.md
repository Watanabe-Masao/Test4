# HANDOFF — duplicate-orphan-retirement（SP-C）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1-5 全完遂（archive 完了 2026-04-25）。status: `completed` / parent: `architecture-debt-recovery`。**

本 project は umbrella `architecture-debt-recovery` の **Lane C** sub-project として、**複製 / orphan / barrel 残存**を体系的に撤退した。Phase 3 で `inquiry/17a-orphan-scope-extension.md` Option A 承認後、ADR-C-003 PR3a/PR3b で 17a 拡張 cascade を全削除し、Phase 5 sub-project completion で `projects/completed/` に archive 済み。

### Phase 別 landed

| Phase | ADR | 主な成果 |
|---|---|---|
| Phase 1 | ADR-C-001 | `features/*/ui/widgets.tsx` byte-identical 解消、`duplicateFileHashGuard` fixed mode、LEG-010/011/012 sunset |
| Phase 2 | ADR-C-002 | `useCostDetailData` 単一正本化、`hookCanonicalPathGuard` fixed mode、LEG-013 sunset |
| Phase 3 | ADR-C-003 | Tier D orphan + 17a 拡張 + cascade orphan を段階削除（PR2/PR3a/PR3b）、`orphanUiComponentGuard` fixed mode、LEG-014 sunset、BC-5 完了 |
| Phase 4 | ADR-C-004 | barrel re-export metadata 必須化、`barrelReexportMetadataGuard` fixed mode、LEG-015 sunset |
| Phase 5 | — | sub-project completion (SUMMARY.md + archive)、`projectCompletionConsistencyGuard` PASS |

詳細メトリクス（PR 数、削除行数、guard baseline 推移）は `SUMMARY.md` および `references/02-status/generated/architecture-debt-recovery-remediation.json` を参照。

### Phase 3 完遂内容（17a Option A）

`inquiry/17a-orphan-scope-extension.md` Option A 承認（2026-04-25）の実施記録:

- **PR3a (commit b2c9c31)**: 17a F1/F3/F4 + barrel cascade orphan + F4 唯一対象 guard (`phase6SummarySwapGuard`) を削除
- **PR3b (commit 8d852bd)**: F2 + 17a 想定 cascade (Plan/Handler/advanced barrel) + 17a 想定外の拡張 cascade (`useConditionMatrix` / `conditionMatrixLogic` / `infrastructure/duckdb/queries/conditionMatrix`) を削除
- **PR3c (commit f5c9d15)**: docs only — checklist Phase 3 [x] + 17a final 化 + LEG-014 sunset 記録 + BC-5 rollback 詳細

詳細削除リストは `breaking-changes.md §BC-5` および `legacy-retirement.md §LEG-014` を参照。

## 2. 次にやること

本 sub-project は archive 完了済みのため新たな作業は無い。完了情報の参照導線:

- 成果サマリ: `SUMMARY.md`
- 完了判定の入力: `checklist.md`
- 削除済 legacy 一覧: `legacy-retirement.md`
- 破壊的変更ロールバック: `breaking-changes.md`
- archive 後の影響: SP-D Wave 2 ADR-D-004 の起動条件解除（`projects/aag-temporal-governance-hardening/HANDOFF.md` 参照）

## 3. ハマりポイント

### 3.1. consumer grep 漏れ

特に `features/{category,cost-detail,reports}/ui/widgets.tsx` と `useCostDetailData` は import 経路が複数ある可能性。**step3 削除 PR の前に必ず全 TypeScript + Markdown を grep** して consumer 0 を確認。

### 3.2. barrel re-export の削除連鎖

`DashboardPage.styles.ts:16` の `export * from './RangeComparison.styles'` を削除すると、他の `.styles.ts` 経由で参照される barrel chain が壊れる可能性。削除 PR で全 consumer chain を検証。

### 3.3. orphan の「test-only」判定

`PlanActualForecast` は `__tests__/PlanActualForecast.test.tsx` を持つ。test のみから参照される file は本 project の orphan 定義に含む（umbrella inquiry/03 §Tier D 参照）。test 削除も忘れない。

### 3.4. 1 PR 1 ADR step 規律

4 ADR × 3-4 step = ~14 PR を厳守。複数 ADR を 1 PR に merge しない。各 PR の commit message に `ADR-C-NNN step-N` を明示。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | 本 project の 4 ADR 実行計画 |
| `checklist.md` | Phase 0-7 + 最終レビュー |
| `config/project.json` | project manifest（`status: "active"` / `parent` 必須） |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/architecture-debt-recovery/AI_CONTEXT.md` | umbrella の why / scope |
| `projects/architecture-debt-recovery/plan.md` | umbrella 不可侵原則 + 4 step pattern |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md` | Lane C 4 ADR の元台帳 |
| `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md` | BC-5 破壊的変更（orphan 削除） |
| `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md` | LEG-010〜015 legacy 6 件 |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | 本 project の spawn 定義（SP-C） |
| `projects/architecture-debt-recovery/inquiry/21-spawn-sequence.md` | Wave 1 立ち上げ順序 |
| `references/03-guides/project-checklist-governance.md` | project 運用規約（AAG Layer 4A） |
