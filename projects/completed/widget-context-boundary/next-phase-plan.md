# next-phase-plan — Wave 2 / SP-B 準備計画書

> **役割**: SP-A widget-context-boundary 完了後に spawn される **Wave 2 / SP-B widget-registry-simplification** の事前準備・計画書（draft）。
>
> **status**: **draft（人間レビュー待ち）**。本 file は SP-A の archive 後に SP-B `widget-registry-simplification` directory 直下に移管予定。SP-B spawn の前提条件・scope・推奨着手順を一画面で把握できるようにすることを目的とする。
>
> **正本**: umbrella `inquiry/15 §Lane B`（4 ADR 定義）、`inquiry/18 §SP-B`（sub-project map）、`inquiry/21 §W2-B`（spawn sequence）。本 file はそれらの実行ビュー。

## 1. spawn 前提条件

SP-B は **SP-A が completed 昇格**済みでなければ spawn できない（`inquiry/21 §W2-B`）。具体的には:

- [ ] SP-A の sub-project completion 7 step 完遂
  1. ✅ `projects/widget-context-boundary/SUMMARY.md` 作成（本 commit、draft → 人間承認で確定）
  2. ⏳ `projects/widget-context-boundary/` を `projects/completed/widget-context-boundary/` に物理移動
  3. ⏳ `config/project.json.status` を `"active" → "completed"`
  4. ⏳ `CURRENT_PROJECT.md` を umbrella（`architecture-debt-recovery`）に切替
  5. ⏳ `references/02-status/open-issues.md` の active → archived 欄へ移動
  6. ⏳ umbrella `architecture-debt-recovery/HANDOFF.md` の進捗サマリ更新
  7. ⏳ `projectCompletionConsistencyGuard` PASS
- [ ] visual / E2E 回帰テスト（CI で `npm run test:e2e` 通過）
- [ ] 人間レビュー / 承認

## 2. SP-B scope（umbrella inquiry/15 §Lane B より）

| ADR | 解消対象 | guard | 影響 widget 数 | depends on |
|---|---|---|---|---|
| **B-001** | isVisible + render 内の **二重 null check** | `shortcutPatternGuard` baseline=10 | 10〜11 widget (WID-031〜037, 040〜043) | A-001, A-002, **A-004** |
| **B-002** | `<X ctx={ctx} />` の **full ctx passthrough** を明示 props 化 | `fullCtxPassthroughGuard` baseline=12 | 12 widget (WID-001, 002, 004, 005, 007〜016) | — |
| **B-003** | `(() => { ... })()` IIFE 3 件を **readModel selector** に抽出 | `registryInlineLogicGuard` baseline=3 | 2 widget (WID-018, 021) | — |
| **B-004** | registry 行の **inline JSX / default hardcode** 5 箇所解消 | `registryInlineLogicGuard` 拡張 baseline=5 | 5 widget (WID-003, 006, 020, 038, 040) | B-003 |

### 4 ADR × 4 step pattern = 16 PR 想定

各 ADR は umbrella plan §4 の **4 step pattern** に従う:

```
PR1: guard 追加（baseline=current）
PR2: 新 path（selector / helper / type narrowing 等）導入
PR3: 旧 path から新 path へ consumer 移行（複数 batch 可）
PR4: 旧 path 削除 + guard baseline=0 + sunsetCondition 達成確認
```

## 3. 推奨着手順（依存解析）

### 3.1 並行可能な ADR

- **ADR-B-001** は SP-A の ctx 型分離完了に依存（**SP-A completed が必要**）
- **ADR-B-002** は独立、SP-B spawn 直後から着手可
- **ADR-B-003** は独立、PR1 (guard 追加) のみ先行可
- **ADR-B-004** は **B-003 の selector 拡張 pattern** に follow-through。B-003 完了後

### 3.2 Wave 内推奨順

```text
spawn 直後
  ├─ ADR-B-001 PR1 (shortcutPatternGuard baseline=10)
  ├─ ADR-B-002 PR1 (fullCtxPassthroughGuard baseline=12)
  └─ ADR-B-003 PR1 (registryInlineLogicGuard baseline=3)

A-001/A-002 完了済（SP-A archive 後）
  └─ ADR-B-001 PR2 (type narrowing で 5 widget gate 削除)

B-003 PR4 完了後
  └─ ADR-B-004 PR1-4

A-004 完了済（SP-A archive 後）
  └─ ADR-B-001 PR3 (残 5 widget の null check 削除)

全 ADR 完了
  └─ SP-B completion 7 step → Wave 3 (SP-D-final D-003) spawn 入口
```

## 4. SP-A の chokepoint narrowing pattern を SP-B で踏襲

### 4.1 ADR-B-001 への影響

SP-A の `RenderUnifiedWidgetContext` により `ctx.result` / `ctx.prevYear` が型レベルで required（non-nullable）になった。これにより SP-B ADR-B-001 の **二重 null check 解消** は機械的に進められる:

- 旧 pattern:
  ```ts
  isVisible: (ctx) => ctx.result != null,
  render: (ctx) => {
    if (!ctx.result) return null
    return <FooWidget ctx={ctx} />
  }
  ```
- 新 pattern（SP-B ADR-B-001 で完遂目標）:
  ```ts
  // isVisible 不要（type-level required）
  render: (ctx) => <FooWidget ctx={ctx} />
  ```

実際 SP-A PR3 で `insight-budget-simulator` の dead null check 1 件を先行除去済（`coreRequiredFieldNullCheckGuard` baseline 1→0）。SP-B はこの pattern を残 10 widget に適用する。

### 4.2 ADR-B-002 / B-004 への波及

`<X ctx={ctx} />` の full ctx passthrough が 12 widget で残存。SP-A は **chokepoint narrowing** で widget 本体の ctx access を不変に保ったため、絞り込み props 化は SP-B の本来 scope に閉じる。各子 component の必要 field を audit し、明示 props 化する。

### 4.3 LEG-009 sunsetCondition

`buildPrevYearCostMap` (registry file 内 inline 定義) が ADR-B-004 で `domain/calculations/prevYearCostApprox.ts` に抽出される。`registryInlineLogicGuard` baseline=0 + 6 ヶ月継続 で sunset。

## 5. 想定リスク + mitigation

| リスク | mitigation |
|---|---|
| 全 widget に及ぶ修正で QA 工数大 | 重量級 widget（WID-001/002/018）を最後に分離。複数 batch で visual / E2E 検証 |
| Lane A 完了待ちで着手時期が後ずれ | **SP-A completed 前は SP-B directory を spawn しない**（§1 spawn 前提条件）。必要なら umbrella 側の準備メモとして 3 guard の設計だけ先行記録し、実 PR1（guard 追加 commit）は SP-B spawn 後に実施する |
| ADR 間依存（B-003 → B-004）でブロック発生 | B-003 は独立。並行で B-001 / B-002 を進めれば critical path にならない |
| chokepoint narrowing pattern の再応用ミス | SP-A の `RenderUnifiedWidgetContext` を反映した branch を SP-B 着手時に rebase。`narrowRenderCtx` 等の helper を再利用 |

## 6. spawn PR テンプレ（umbrella inquiry/21 §spawn PR テンプレート より）

SP-A archive と同 commit で実施するのが望ましい（W2-B PR）:

```yaml
sub-project-spawn:
  steps:
    - step1: projects/widget-registry-simplification/config/project.json 作成
              （status: "active", parent: "architecture-debt-recovery"）
    - step2: projects/widget-registry-simplification/ 配下を _template ベースで作成
              （AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md / aag/execution-overlay.ts）
    - step3: CURRENT_PROJECT.md を widget-registry-simplification に切替
    - step4: open-issues.md の active 欄に widget-registry-simplification を追加
    - step5: projectStructureGuard / projectCompletionConsistencyGuard PASS
  rollback: git revert で 5 step 全てを戻す
```

step 1-2 で `_template/` をベースに **以下 5 file** を作成:

| file | 主要 section |
|---|---|
| `config/project.json` | id / status / parent / kind |
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `HANDOFF.md` | §1 現在地 / §2 次にやること / §3 ハマりポイント |
| `plan.md` | 不可侵原則 / 4 ADR 実行計画 / 依存関係 / 破壊的変更 / 禁止事項 |
| `checklist.md` | Phase 1〜4 (ADR-B-001〜B-004) + Phase 5 (sub-project completion) |
| `aag/execution-overlay.ts` | 空 overlay（initial 状態） |

## 7. 後続: Wave 3 / SP-D-final

SP-B completed 後、umbrella の **Wave 3** で SP-D の ADR-D-003 (G8 P20/P21 baseline 削減) のみ実施。これが完了すれば全 sub-project completed → umbrella `architecture-debt-recovery` の Phase 7 archive 入口。

## 8. 参照

- umbrella plan: `projects/architecture-debt-recovery/plan.md` §6 Phase 6 / §8 禁止事項
- 4 ADR 定義: `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane B`
- sub-project map: `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md §SP-B`
- spawn sequence: `projects/architecture-debt-recovery/inquiry/21-spawn-sequence.md §W2-B`
- legacy: `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-009`
- spawn / completion テンプレ: `projects/architecture-debt-recovery/inquiry/20-current-project-switch-plan.md §sub-project spawn テンプレート / §sub-project completion テンプレート`
- SP-A 引き継ぎ: 本 directory の `SUMMARY.md`（draft）
