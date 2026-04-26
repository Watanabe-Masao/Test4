# plan — widget-registry-simplification（SP-B）

> 役割: 本 sub-project の 4 ADR 実行計画。
> umbrella `architecture-debt-recovery` の `inquiry/15-remediation-plan.md §Lane B` の詳細実行版。

## 不可侵原則（本 project 固有、umbrella 原則に追加）

1. **umbrella の plan.md §2 不可侵原則 16 項を全て継承する**
2. **1 PR = 1 ADR step**（umbrella §2 #3 の具体化）。4 ADR × 平均 4 step = 16 PR を厳守
3. **registry 行は内部改修、消費者 API 不変**（breakingChange=false の維持）
4. **selector は pure function** として `application/readModels/customerFact/selectors.ts` に集約（A2: domain 純粋 / J2 既存原則）。infrastructure / domain / presentation には置かない
5. **重量級 widget（WID-001 / WID-002 / WID-018）は最後** — risk 分散、PR を細分化
6. **ADR-B-001 は SP-A 完了後のみ着手**（type narrowing で gate 削除可能になる前提）

## 4 ADR 実行計画

### ADR-B-001. 二重 null check 解消（10 widget）

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `shortcutPatternGuard` baseline=current で追加（registry 行の二重 null check pattern を ratchet-down 検出） | guard 追加 |
| PR2 | type narrowing で gate 削除可能な widget から順次解消（pure delegation 群を先行） | 実装 |
| PR3 | 残 widget を discriminated union で gate 削除（重量級含む） | 実装 |
| PR4 | `shortcutPatternGuard` baseline=0 + fixed mode | guard ratchet-down |

### ADR-B-002. full ctx passthrough を絞り込み props に変換（12 widget）

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `fullCtxPassthroughGuard` baseline=current で追加（`<X ctx={ctx} />` パターン検出） | guard 追加 |
| PR2 | pure delegation 5 widget（WID-009-013）の helper signature を絞り込み props に変換 | 実装 |
| PR3 | 重量級 widget（WID-001 / WID-002 / WID-018）の props 整理、widgetCtx 重複注入解消 | 実装 |
| PR4 | passthrough 0 到達、`fullCtxPassthroughGuard` baseline=0 + fixed mode | guard ratchet-down |

### ADR-B-003. IIFE pattern を readModel selector 抽出（3 IIFE）

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `registryInlineLogicGuard` baseline=current で追加（IIFE count 検出） | guard 追加 |
| PR2 | selector 3 本を `application/readModels/customerFact/selectors.ts` に新設（`selectTotalCustomers` / `selectStoreCustomerMap` / `selectCustomerCountOrUndefined`） | 実装 |
| PR3 | 3 IIFE を selector call に置換（WID-018 / WID-021） | 実装 |
| PR4 | `registryInlineLogicGuard` baseline=0 + fixed mode | guard ratchet-down |

### ADR-B-004. registry inline JSX 解消（5 箇所、B-003 follow-through）

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `registryInlineLogicGuard` 拡張（inline JSX / default hardcode 検出を追加、baseline=current） | guard 拡張 |
| PR2 | helper / default config を `presentation/pages/Dashboard/widgets/` 配下の純関数 / 定数に抽出 | 実装 |
| PR3 | 5 箇所の registry 行を helper call / config 参照に置換 | 実装 |
| PR4 | guard baseline=0 + LEG-009 sunsetCondition 達成 | guard ratchet-down |

## 依存関係

```text
ADR-B-001 ← SP-A completed (達成済み 2026-04-25)
ADR-B-002 ← 独立、spawn 直後から PR1 着手可
ADR-B-003 ← 独立、spawn 直後から PR1 着手可
ADR-B-004 ← B-003 完了後（registryInlineLogicGuard の拡張）
```

並行 PR1 着手順:

```text
spawn 直後
  ├─ ADR-B-001 PR1 (shortcutPatternGuard baseline=current)
  ├─ ADR-B-002 PR1 (fullCtxPassthroughGuard baseline=current)
  └─ ADR-B-003 PR1 (registryInlineLogicGuard baseline=current)
    ↓
  ├─ ADR-B-001 PR2-4
  ├─ ADR-B-002 PR2-4
  ├─ ADR-B-003 PR2-4
    ↓ (B-003 完了)
  └─ ADR-B-004 PR1-4
    ↓
SP-B completion
```

## 破壊的変更

なし（registry 内部改修、消費者 API 不変）。

## やってはいけないこと（本 project 固有）

- registry 行で消費者 API（widget の render 関数の signature）を変更する → breaking change なしの維持
- selector を `infrastructure/` / `domain/` / `presentation/` に置く → A2: domain 純粋 / J2 既存原則違反
- 複数 ADR を 1 PR に merge → 1 PR = 1 ADR step 規律違反
- guard baseline を増加方向に動かす → ratchet-down 原則違反
- 重量級 widget（WID-001 / WID-002 / WID-018）を 1 PR で複数まとめて改修 → risk 分散原則違反
- ADR-B-001 を SP-A completed 確認なしに着手 → 依存違反

## 参照

- umbrella: `projects/architecture-debt-recovery/plan.md`（不可侵原則 + 4 step pattern + 禁止事項）
- umbrella inquiry: `inquiry/15-remediation-plan.md §Lane B` / `inquiry/17-legacy-retirement.md §LEG-009` / `inquiry/18-sub-project-map.md §SP-B`
- 運用規約: `references/03-guides/project-checklist-governance.md`
- architecture-rule system: `references/03-guides/architecture-rule-system.md`
- SP-A 引き継ぎ: `projects/completed/widget-context-boundary/next-phase-plan.md`
