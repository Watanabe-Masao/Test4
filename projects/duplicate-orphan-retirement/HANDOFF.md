# HANDOFF — duplicate-orphan-retirement（SP-C）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 6 Wave 1 で spawn 済み。status: `active` / parent: `architecture-debt-recovery`。PR 0 実施。**

本 project は umbrella `architecture-debt-recovery` の **Lane C** sub-project として、**複製 / orphan / barrel 残存**を体系的に撤退する。

### spawn 時 landed

- `config/project.json`（`status: "active"`、`parent: "architecture-debt-recovery"`）
- `AI_CONTEXT.md`（why / scope / read order）
- `HANDOFF.md`（本 file）
- `plan.md`（本 project 固有の 4 ADR 実行計画）
- `checklist.md`（completion 条件）
- `aag/execution-overlay.ts`（空 overlay。initial 状態）

### 残タスク（全 PR、inquiry/21 §W1-C）

umbrella `inquiry/15 §Lane C` 4 ADR × 平均 3.5 step = **~14 PR** 実施予定。

## 2. 次にやること

### 推奨開始順（依存なし、平行 possible）

1. **ADR-C-001 PR1**: `duplicateFileHashGuard` baseline=3 追加（`features/{category,cost-detail,reports}/ui/widgets.tsx`）
2. **ADR-C-003 PR1**: `orphanUiComponentGuard` baseline=3 追加（`DowGapKpiCard` / `PlanActualForecast` / `RangeComparison`）
3. **ADR-C-004 PR1**: `barrelReexportMetadataGuard` baseline=current で追加

この 3 PR は互いに独立、並行着手可能。ADR-C-002 は hookCanonicalPathGuard を必要とするため `@canonical` JSDoc 規約を先に固めてから着手。

### Wave 完了後

sub-project completion PR（inquiry/20 §sub-project completion テンプレート 7 step）で以下:
- SUMMARY.md 作成
- 物理移動 `projects/duplicate-orphan-retirement/` → `projects/completed/duplicate-orphan-retirement/`
- `config/project.json.status: "active" → "completed"`
- CURRENT_PROJECT.md を umbrella に戻す
- open-issues.md 更新
- umbrella HANDOFF.md §1 に completion 記録

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
