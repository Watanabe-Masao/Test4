# AI_CONTEXT — widget-registry-simplification（SP-B）

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

widget registry 簡素化（widget-registry-simplification）

## Purpose

umbrella `architecture-debt-recovery` の **Lane B** sub-project として、widget registry の登録行に蓄積した冗長パターン（二重 null check / full ctx passthrough / IIFE / inline JSX / default hardcode）を、SP-A で確立した型整備（page-specific ctx + chokepoint narrowing）と application 層 readModel selector を活用して簡素化する。

各 ADR は新 guard を baseline=current で追加し、ratchet-down で 0 に到達させ fixed mode に移行する 4 step pattern に従う（umbrella plan §4）。

## Project Lineage（文脈継承）

### Informed-by（起点となった findings）

| 先行 project | 継承する findings |
|---|---|
| `projects/completed/widget-context-boundary` (SP-A) | UnifiedWidgetContext page-local 剥離 / DashboardWidgetContext 集約 / WidgetDef 2 型分離 / chokepoint narrowing パターン。これにより ADR-B-001 の type narrowing が技術的に可能になった |
| `projects/architecture-debt-recovery/inquiry/02-widget-ctx-dependency.md` §D-1 | full ctx passthrough 12 widget の確定リスト |
| `projects/architecture-debt-recovery/inquiry/04-type-asymmetry.md` §D | 二重 null check 10 widget の確定リスト |
| `projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md` §C-01〜C-12 | widget concern と仮説 (J/INV/R) の連結 map |

### blocks（本 project が完了して unblock する後続）

- SP-D Wave 3 ADR-D-003（G8 P20 useMemo 内行数 / P21 widget 直接子数 baseline 削減）— 本 project の Lane B 改修完了で baseline 削減原資が確定する

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地・次にやること・ハマりポイント）
3. `plan.md`（4 ADR 実行計画 + 不可侵原則）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. umbrella `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane B`（4 ADR の元台帳）
6. `projects/completed/widget-context-boundary/next-phase-plan.md`（SP-A から引き継いだ Wave 2 準備計画）
7. 必要に応じて: `references/01-principles/design-principles.md` J2 / `references/03-guides/architecture-rule-system.md`

## Why this project exists

### 現状の symptom

- Dashboard widget registry で **二重 null check pattern** が 10 widget に並存（registry 行の `isVisible` で null チェック後、render 関数内でも再度同じ null チェック。type narrowing が効かないため両方必要）
- `<X ctx={ctx} />` の **full ctx passthrough** が 12 widget で発生。子 component が広い ctx 全体を受け取り、依存範囲が型から見えない
- registry 行に **IIFE による inline 派生計算**が 3 件（WID-018 / WID-021）。同じ readModel から派生する値を毎 widget で再計算し、test しづらい
- registry 行に **inline JSX 構築 / default hardcode** が 5 箇所（WID-003 / WID-006 / WID-020 / WID-038 / WID-040）。ロジックが registry に染み出している

これらは「個別 widget 改修」では再発するため、**新 guard で ratchet-down 管理 + selector / props 改善で構造的に解消**する必要がある。

### 独立 project として立ち上げる理由

- SP-A（ctx 型境界）が完了して初めて ADR-B-001（二重 null check 解消）が技術的に可能になるため、SP-A と分離して spawn する設計（umbrella inquiry/18 §SP-B）
- Lane B の 4 ADR は registry 行の改修というスコープで一体性があり、他 Lane と混在させない
- `requiresGuard=true` / `requiresLegacyRetirement=true` のため AAG-COA Level 3 として projectization

## Scope

### 含む

- ADR-B-001: isVisible + render 内の二重 null check 解消（10 widget、type narrowing で gate 削除）
- ADR-B-002: full ctx passthrough を絞り込み props に変換（12 widget、明示的 props shape）
- ADR-B-003: registry 行 IIFE を `application/readModels/customerFact/selectors.ts` に抽出（3 IIFE）
- ADR-B-004: registry 行 inline JSX 構築 / default hardcode 解消（5 箇所、helper / default config 抽出）
- 3 新 guard（shortcutPattern / fullCtxPassthrough / registryInlineLogic）の追加と baseline=0 fixed mode 到達
- LEG-009 の sunsetCondition 達成

### 含まない

- 他 Lane（SP-A / SP-C / SP-D）の item
- 本 ADR 4 件に載らない registry / widget 改修
- 新規 widget の追加
- WSS spec の更新（lastVerifiedCommit 等は別 project 対応）
- runtime 動作の変更（registry 内部改修、消費者 API 不変）

## Project-Specific Constraints

- **breaking change なし** — registry 内部改修のため消費者 API は不変
- **1 PR = 1 ADR step** を厳守（umbrella plan §2 #3）
- **新 path → 移行 → 旧 path 削除 → guard fixed mode** の 4 step pattern を逸脱しない
- **selector は pure function** として `application/readModels/customerFact/selectors.ts` に集約（A2: domain 純粋 / J2 既存原則）
- **重量級 widget（WID-001 / WID-002 / WID-018）は最後に着手** — risk 分散

## Update Points

- ADR ごとに `checklist.md` の対応 PR checkbox を更新
- 新 guard の baseline 変更時は `app/src/test/guards/` 編集 + `cd app && npm run docs:generate`
- Phase 5 sub-project completion 時に umbrella `inquiry/20 §sub-project completion テンプレート` 7 step を実施

## 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | 本 project の 4 ADR 実行計画 |
| `HANDOFF.md` | 現在地・次の作業・ハマりポイント |
| `checklist.md` | Phase 別 completion checkbox |
| `config/project.json` | project manifest（`status: "active"` / `parent` 必須） |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/architecture-debt-recovery/AI_CONTEXT.md` | umbrella の why / scope |
| `projects/architecture-debt-recovery/plan.md` | umbrella 不可侵原則 + 4 step pattern |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md` | Lane B 4 ADR の元台帳 |
| `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md` | LEG-009 の sunsetCondition |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | 本 project の spawn 定義（SP-B） |
| `projects/architecture-debt-recovery/inquiry/21-spawn-sequence.md` | Wave 2 立ち上げ順序 |
| `projects/completed/widget-context-boundary/next-phase-plan.md` | SP-A から引き継いだ Wave 2 準備計画 |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用規約（AAG Layer 4A） |
| `references/03-guides/architecture-rule-system.md` | architecture rule system + ratchet-down 運用 |
