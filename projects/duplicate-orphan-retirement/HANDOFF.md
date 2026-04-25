# HANDOFF — duplicate-orphan-retirement（SP-C）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1 / 2 / 3 / 4 全完遂（17a Option A 承認・実施完了 2026-04-25）。Phase 5 sub-project completion 着手中。status: `active` / parent: `architecture-debt-recovery`。**

本 project は umbrella `architecture-debt-recovery` の **Lane C** sub-project として、**複製 / orphan / barrel 残存**を体系的に撤退する。

### Phase 別 landed

| Phase | ADR | 状態 | 主な成果 |
|---|---|---|---|
| Phase 1 | ADR-C-001 | ✅ PR1-4 + LEG-010/011/012 sunset | `features/*/ui/widgets.tsx` 3 件 byte-identical 解消、`duplicateFileHashGuard` baseline 3→0 fixed mode |
| Phase 2 | ADR-C-002 | ✅ PR1-4 + LEG-013 sunset | `useCostDetailData` 2 箇所並存解消、`hookCanonicalPathGuard` baseline 1→0 fixed mode |
| Phase 3 | ADR-C-003 | ✅ PR1-3 + LEG-014 sunset + BC-5 rollback 記載 | Tier D orphan 3 件 + 17a 拡張 4 件 + cascade orphan 削除（PR2/PR3a/PR3b 段階実施）、`orphanUiComponentGuard` baseline 7→4→1→0 + ALLOWLIST 空 + fixed mode |
| Phase 4 | ADR-C-004 | ✅ PR1-3 + LEG-015 sunset | barrel re-export metadata 必須化、`barrelReexportMetadataGuard` baseline 38→0 fixed mode |

### Phase 3 完遂内容（17a Option A）

`inquiry/17a-orphan-scope-extension.md` Option A（4 件全削除）が 2026-04-25 承認され、ADR-C-003 PR3a/PR3b で実施完了:

- **PR3a (commit b2c9c31)**: F1 ConditionDetailPanels + F3 ConditionSummary + F4 ExecSummaryBarWidget + barrel cascade orphan (conditionPanelMarkupCost / conditionPanelProfitability) + F4 唯一対象 guard (`phase6SummarySwapGuard`) を削除。baseline 4→1
- **PR3b (commit 8d852bd)**: F2 ConditionMatrixTable + 17a 想定 cascade (Plan/Handler/advanced barrel) + 17a 想定外の拡張 cascade (`useConditionMatrix` / `conditionMatrixLogic` / `infrastructure/duckdb/queries/conditionMatrix`) を削除。baseline 1→0 + ALLOWLIST=[] + fixed mode 達成

合計: 削除ファイル 24 件、影響行数 -3700+ 行。dead code 永続化を回避し、`INV-J7-B` の効力完全化。

## 2. 次にやること

### Phase 5 sub-project completion (本 commit 着手)

umbrella `inquiry/20 §sub-project completion テンプレート` 7 step:
1. SUMMARY.md 作成
2. 物理移動 `projects/duplicate-orphan-retirement/` → `projects/completed/duplicate-orphan-retirement/`
3. `config/project.json.status: "active" → "completed"`
4. CURRENT_PROJECT.md を umbrella に戻す（既に umbrella なので no-op 確認）
5. open-issues.md 更新（active → archived 欄へ）
6. umbrella HANDOFF.md §1 に completion 記録
7. `projectCompletionConsistencyGuard` PASS 確認

完了後、SP-D Wave 2 ADR-D-004 の起動条件が解除される。

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
