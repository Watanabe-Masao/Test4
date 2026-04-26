# HANDOFF — widget-registry-simplification（SP-B）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Wave 2 で spawn 完了 (2026-04-26)。SP-A completed で起動条件解除済み。status: `active` / parent: `architecture-debt-recovery`。**

本 project は umbrella `architecture-debt-recovery` の **Lane B** sub-project として、widget registry 行に蓄積した冗長パターン（二重 null check / full ctx passthrough / IIFE / inline JSX）を、SP-A で確立した型整備と application 層 readModel selector で解消する。

### spawn 時 landed

- `config/project.json`（`status: "active"`、`parent: "architecture-debt-recovery"`）
- `AI_CONTEXT.md`（why / scope / lineage / read order）
- `HANDOFF.md`（本 file）
- `plan.md`（4 ADR 実行計画）
- `checklist.md`（completion 条件）
- `aag/execution-overlay.ts`（空 overlay。initial 状態）

### 残タスク

umbrella `inquiry/15 §Lane B` 4 ADR × 4 step pattern による残作業。詳細は `plan.md` および `references/02-status/generated/architecture-debt-recovery-remediation.json` を参照。

## 2. 次にやること

### 推奨開始順（並行 PR1 着手可、依存解析は plan.md §3）

spawn 直後に以下 3 PR1 を並行 spawn 可能（互いに独立）:

1. **ADR-B-001 PR1**: `shortcutPatternGuard` baseline=current で追加（二重 null check ratchet-down）
2. **ADR-B-002 PR1**: `fullCtxPassthroughGuard` baseline=current で追加（full ctx passthrough ratchet-down）
3. **ADR-B-003 PR1**: `registryInlineLogicGuard` baseline=current で追加（IIFE ratchet-down）

ADR-B-004 は B-003 の selector 拡張 pattern に follow-through。B-003 完了後に着手。

### Wave 完了後

sub-project completion PR（umbrella `inquiry/20 §sub-project completion テンプレート` 7 step）:
- SUMMARY.md 作成
- 物理移動 `projects/widget-registry-simplification/` → `projects/completed/widget-registry-simplification/`
- `config/project.json.status: "active" → "completed"`
- CURRENT_PROJECT.md を umbrella に戻す
- open-issues.md 更新
- umbrella HANDOFF.md §1 に completion 記録
- projectCompletionConsistencyGuard PASS

完了後、SP-D Wave 3 ADR-D-003（G8 P20/P21 baseline 削減）の起動条件が解除される。

## 3. ハマりポイント

### 3.1. SP-A 型整備への依存

ADR-B-001（二重 null check 解消）は SP-A の `DashboardWidgetContext` + chokepoint narrowing が完了して初めて type narrowing で gate 削除可能。SP-A completed (2026-04-25) で前提条件は満たされた。

### 3.2. registry 行の改修と consumer API 不変の両立

registry 行は内部改修だが、widget の render 関数が公開する props / 副作用は不変であること。各 ADR の PR3（移行）後に visual / E2E で runtime 動作の同一性を確認する。

### 3.3. selector の正本配置

ADR-B-003 で抽出する selector は `application/readModels/customerFact/selectors.ts` に集約（A2: domain 純粋 / J2 既存原則）。infrastructure / domain には置かない。

### 3.4. 重量級 widget の risk

WID-001 / WID-002 / WID-018 は影響範囲が広い。ADR-B-002 PR3 で最後に着手し、PR を細分化して risk 分散する。

### 3.5. 1 PR = 1 ADR step 規律

複数 ADR を 1 PR に merge しない。各 PR の commit message に `ADR-B-NNN PR-N` を明示。

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
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md` | Lane B 4 ADR の元台帳 |
| `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md` | LEG-009 の sunsetCondition |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | 本 project の spawn 定義（SP-B） |
| `projects/architecture-debt-recovery/inquiry/21-spawn-sequence.md` | Wave 2 立ち上げ順序 |
| `projects/completed/widget-context-boundary/next-phase-plan.md` | SP-A から引き継いだ Wave 2 準備計画 |
| `references/03-guides/project-checklist-governance.md` | project 運用規約（AAG Layer 4A） |
