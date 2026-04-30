# projectization — aag-core-doc-refactor

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | architecture-refactor |
| `implementationScope` | `["references/01-principles/aag/", "references/01-principles/adaptive-architecture-governance.md", "references/01-principles/adaptive-governance-evolution.md", "references/01-principles/aag-5-constitution.md", "references/01-principles/aag-5-source-of-truth-policy.md", "references/01-principles/aag-5-layer-map.md", "references/01-principles/aag-operational-classification.md", "CLAUDE.md", "docs/contracts/doc-registry.json", "docs/contracts/principles.json", ".claude/manifest.json"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | false |
| `requiresHumanApproval` | true |

## 2. 判定理由

### なぜ Level 3 か

親 project (`aag-bidirectional-integrity`) の Phase 3 audit (`references/02-status/aag-doc-audit-report.md` §7.1)
で derive された scope 規模:

- AAG Core 8 doc + CLAUDE.md AAG セクション = 9 entry の content refactoring
- Phase 4 doc operation = Create 7 + Split 1 + Rewrite 6 + Archive 8 = 22 operation
- 推定 commit 数: 15-20 commits (各 operation 独立 commit + parallel comparison)
- 影響範囲: 旧 doc への inbound 160+ file references を全件 update

→ Level 2 (single-phase refactor) を超え、複数 phase + 段階的移行 + 人間承認必須のため **Level 3**。
ただし Level 4 (long-running multi-project initiative) ではない (本 project は親 plan §Phase 4 + §Phase 5
に scope を絞った single project)。

### なぜ architecture-refactor か

doc 構造 (path 配置 + 責務分割 + drill-down chain) を再構築する **architecture-refactor**。
docs-only ではない理由は、doc path の変更が docRegistryGuard / docCodeConsistencyGuard /
manifestGuard 経由で **アーキテクチャ機械検証に直接影響** するため。

### なぜ breakingChange = true か

旧 doc path の archive により、**inbound 参照を全件 update する必要がある**:
- `references/01-principles/adaptive-architecture-governance.md` → 戦略マスター部分は `aag/strategy.md`
  へ、5 層構造部分は `aag/architecture.md` へ Split
- `aag-5-constitution.md` / `aag-5-source-of-truth-policy.md` / `aag-5-layer-map.md` /
  `aag-operational-classification.md` / `adaptive-governance-evolution.md` は `aag/` 配下に
  Rewrite + Relocate + Rename

CLAUDE.md / references/ / docs/ / .claude/ の各所から旧 path を参照する 160+ 箇所を update
するため、breakingChange = true。breaking-changes.md で各 archive を category 化して articulate。

### なぜ requiresLegacyRetirement = true か

旧 doc を `references/99-archive/` 配下に物理移管 (Phase 5)。inbound 0 機械検証 + §1.5 archive 前
mapping 義務が必須運用条件となるため、legacy-retirement.md で取り扱いを articulate。

### なぜ requiresGuard = false か

本 project は doc refactor のみで、**新 guard を導入しない**。新 guard 実装 (canonicalDocRefIntegrityGuard
等の meta-guard) は Project B 所掌。docRegistryGuard / docCodeConsistencyGuard / manifestGuard 等の
既存 guard が Phase 5 archive 時に inbound 0 + mapping landing を機械検証する。

### なぜ requiresHumanApproval = true か

Constitution / 設計原則 doc の refactor は **AAG の信頼性** に直結する。最終レビュー (人間承認)
checkbox を必須とし、archive プロセスへの移行 gate を構造的に確保 (`project-checklist-governance.md` §3.1)。

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | project 意味空間の入口 (Level 3 必須) |
| `HANDOFF.md` | required | 起点文書、複数 phase の現在地 articulate (Level 3 必須) |
| `plan.md` | required | 不可侵原則 + Phase 構造 (Level 3 必須) |
| `checklist.md` | required | completion 判定の入力 + 最終レビュー gate (Level 3 必須) |
| `inquiry/` | optional | 親 project の inquiry (Phase 3 audit) を継承するため、本 project では新規 inquiry なし |
| `breaking-changes.md` | required | breakingChange = true のため必須 |
| `legacy-retirement.md` | required | requiresLegacyRetirement = true のため必須 |
| `sub-project-map.md` | optional | 単独 project (sub-project は持たない、依存先は Project B〜D) |
| guard 設計 (plan.md 内) | optional | requiresGuard = false (新 guard を導入しないため) |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval = true のため必須 |

## 4. やらないこと (nonGoals)

scope 逸脱の抑止と escalation 判定の基準として機能する:

- **BaseRule schema 拡張** (`SemanticTraceBinding<T>` 型 family 追加) → **Project B 所掌**
- **AR-rule binding 記入** (`canonicalDocRef` + `metaRequirementRefs` の status flip = pending → bound) → **Project B 所掌**
- **meta-guard 実装** (`canonicalDocRefIntegrityGuard` / `canonicalDocBackLinkGuard` / `semanticArticulationQualityGuard` / `statusIntegrityGuard`) → **Project B 所掌**
- **DFR (Display-Focused Rule) registry 構築** → **Project C 所掌**
- **複雑 archive 案件** (例: `adaptive-architecture-governance.md` の Split + 部分 Archive で複雑化したケースの拡張) → **Project D 所掌** (本 project の Phase 5 で完遂しない場合のみ Project D へ escalate)
- **業務ロジック / domain calculation の変更** → 本 project の scope 外 (`app/src` 配下を touch しない)
- **親 project (`aag-bidirectional-integrity`) の archive プロセス自体** → 親側で Project A〜D bootstrap 完了後に実施

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する:

- **escalate to Level 4**: Phase 5 archive 中に `adaptive-architecture-governance.md` Split が想定外に複雑化し、Project D に切り出す必要が出た場合
- **escalate breaking-changes scope**: 親 plan §Phase 4.2 articulation (Split 粒度) を revisit して新 doc 数が想定 6 件を超える場合
- **de-escalate to Level 2**: 想定より inbound が少なく commit 数が 10 件以内に収まると判明した場合 (考えにくいが理論的に可能)
- **scope 越境発覚**: BaseRule schema / AR-rule binding / meta-guard / DFR registry に touch する必要が出た場合 → Project B / C への escalate (本 project では実装しない)

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-30 | 初期判定 (Level 3) | 親 project の Phase 3 hard gate B 確定により Project A として spawn (Phase 4 + Phase 5、operation 22 件 / commit 15-20 件 / 影響範囲 160+ file references) |
