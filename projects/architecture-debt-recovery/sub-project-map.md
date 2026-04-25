# sub-project-map — architecture-debt-recovery (umbrella)

> 役割: umbrella から spawn した / する sub-project の一覧と依存関係。
>
> **正本**: `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md`
> が正本。本文書は root-level の summary（AAG-COA 入口としての pointer）。

## sub-project 一覧

| Lane | projectId | status | changeType | scope |
|---|---|---|---|---|
| **A** | `widget-context-boundary` | active (spawned 2026-04-23) | architecture-refactor | widget / ctx 型境界再構築（BC-1〜BC-4 / LEG-001〜008） |
| **B** | SP-B Budget (TBD) | pending | TBD | Phase 6 Wave 2 以降で spawn 予定。budget 周りの負債回収 |
| **C** | `duplicate-orphan-retirement` | active (spawned 2026-04-23) | legacy-retirement | 複製 / orphan / barrel metadata 撤退（BC-5 / LEG-010〜015） |
| **D** | `aag-temporal-governance-hardening` | active (spawned 2026-04-23) | governance-hardening | AAG 基盤強化（BC-6〜BC-7） |

## 依存関係

```
architecture-debt-recovery (umbrella, Level 4)
├─ SP-A: widget-context-boundary      ←── 先行（45 widget 型境界を固定）
│    ↓ (SP-A PR4 completion unlocks SP-B)
├─ SP-B: Budget (TBD)                 ←── 後続（SP-A の DashboardWidgetContext に依存）
├─ SP-C: duplicate-orphan-retirement  ←── 並行（独立）
└─ SP-D: aag-temporal-governance-hardening ←── 並行（governance 基盤のみ）
```

## Wave 構造

| Wave | spawn 済み sub-project | 主要 ADR |
|---|---|---|
| **Wave 1** (2026-04-23 〜) | SP-A, SP-C, SP-D | ADR-A-001/002/003/004 各 PR1, ADR-C-001/003/004 各 PR1, ADR-D-001/002/005/006 各 PR1 |
| **Wave 2** (pending) | SP-A/C/D 各 ADR PR2-4 続行、SP-B spawn 候補 | ADR-D-004（SP-C ADR-C-004 完了後） |
| **Wave 3** (pending) | 残 ADR 完遂 | ADR-D-003（SP-B Lane B 完了後） |

## 文脈継承の機械的強制

各 sub-project は umbrella plan.md §2 不可侵原則 #14-#16 により:

1. `config/project.json` に `parent: "architecture-debt-recovery"` が必須
2. `AI_CONTEXT.md` の Read Order に umbrella を含める
3. Phase 4/5 計画を経由せずに sub-project を spawn しない

これを `subprojectParentGuard.test.ts` が機械検証する。

## 参照

- `inquiry/18-sub-project-map.md` — 各 sub-project の詳細 scope / spawn 条件 / completion 基準
- `inquiry/21-spawn-sequence.md` — Wave 構造と spawn 順序の詳細
- `plan.md §7` — sub-project と文脈保持の運用ルール
