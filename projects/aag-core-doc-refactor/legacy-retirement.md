# legacy-retirement — aag-core-doc-refactor

> 役割: Phase 5 (legacy 撤退) の sunset / consolidation / 補完計画を記録。
> Phase 1〜4 (新 doc Create + Split + Rewrite + registry 整合) を input に、
> 各旧 doc の判定理由 + migrationRecipe + 履歴を残す。
>
> 規約: `references/03-guides/projectization-policy.md` の Level 3 / requiresLegacyRetirement=true 対応。
>
> **本 project の scope**: 親 project (`aag-bidirectional-integrity`) の Phase 5 を継承。親 plan §3.5
> 7 operation taxonomy + §1.5 archive 前 mapping 義務 + inbound 0 trigger (anti-ritual) を本 project
> 不可侵原則 (plan 不可侵原則 1 / 2 / 5) として運用。

## 1. 撤退対象 inventory + operation 判定

Phase 3 audit findings (`references/02-status/aag-doc-audit-report.md` §1) に基づく判定:

| 旧 doc | operation | 移行先 | 状態 |
|---|---|---|---|
| `references/01-principles/adaptive-architecture-governance.md` | **Split + Archive** | 戦略マスター → `aag/strategy.md` / 文化論 → `aag/strategy.md` or `aag/meta.md` / 旧 4 層 → 99-archive / バージョン履歴 → per-doc 分散 | Phase 2 で Split、Phase 5 で archive |
| `references/99-archive/adaptive-governance-evolution.md` | **Rewrite + Relocate + Rename → Archive** | `references/01-principles/aag/evolution.md` (新 path 短縮名) | Phase 1 で Rewrite + Relocate + Rename、Phase 5 で archive |
| `references/99-archive/aag-5-constitution.md` | **Rewrite + Relocate + Rename → Archive** | `references/01-principles/aag/architecture.md` に統合 (Constitution = Layer 1 の articulate を Layer 1+2 として再構築) | Phase 1〜2 で Rewrite + 統合、Phase 5 で archive |
| `references/99-archive/aag-5-source-of-truth-policy.md` | **Rewrite + Relocate + Rename → Archive** | `references/01-principles/aag/source-of-truth.md` (新 path 短縮名、prefix 撤廃) | Phase 1 で Rewrite + Relocate + Rename、Phase 5 で archive |
| `references/99-archive/aag-5-layer-map.md` | **Rewrite + Relocate + Rename → Archive** | `references/01-principles/aag/layer-map.md` (新 path 短縮名、5 層 マッピングに extend) | Phase 1 で Rewrite + Relocate + Rename、Phase 5 で archive |
| `references/99-archive/aag-operational-classification.md` | **Rewrite + Relocate → Archive** | `references/01-principles/aag/operational-classification.md` (新 path 短縮名、prefix 撤廃) | Phase 1 で Rewrite + Relocate、Phase 5 で archive |

> **注**: `aag-four-layer-architecture.md` および `aag-rule-splitting-plan.md` は親 Phase 3 audit
> §3.1 で「即時 sunset」と判定されており、親 project Phase 5 の管轄外として既に archive 済 or
> archive 進行中の可能性あり。本 project Phase 5 着手時に最新状態を確認し、未 archive なら
> 本 project でも archive 対象に追加。

## 1.5. archive 前 mapping 義務 (本 project plan 不可侵原則 5)

**重要原則**: 旧 doc を archive 移管する前に、**新 doc に「旧概念 → 新概念 mapping」を必ず articulate**
すること。特に旧 4 層 → 新 5 層への structural extension の場合、過去文脈の継承可読性を保つため:

| archive 候補 | mapping 必須先 | mapping 内容 |
|---|---|---|
| `adaptive-architecture-governance.md` (戦略マスター + 旧 4 層 + 文化論) | `aag/strategy.md` + `aag/architecture.md` | (1) 戦略マスター旧構成 → 新 strategy.md 構成、(2) 旧 4 層 (Constitution/Schema/Execution/Operations) → 新 5 層 (目的/要件/設計/実装/検証) |
| `aag-5-constitution.md` (新 4 層 = 旧 4 層) | `aag/architecture.md` (新 5 層) | 新 4 層 → 新 5 層 mapping (+ Layer 4 検証 = Operations subset + α) |
| `aag-5-layer-map.md` (旧 4 層 マッピング) | `aag/layer-map.md` (新 5 層 マッピング) | ファイル別 mapping の旧 → 新 transformation |
| `aag-5-source-of-truth-policy.md` | `aag/source-of-truth.md` | 旧 → 新 概念 / 用語 mapping |
| `aag-operational-classification.md` | `aag/operational-classification.md` | 旧 → 新 区分 / 概念 mapping |
| `adaptive-governance-evolution.md` | `aag/evolution.md` | 旧 → 新 概念 / 進化動学用語 mapping |

**archive 移管 trigger に追加**: 「新 doc に mapping table が landed されている」を必須条件 (inbound 0
確認と同列)。mapping 不在で archive すると、後任が「旧 4 層 = 新 何?」「Operations は新 5 層のどこに?」を辿れない。

## 2. 段階削除原則 (anti-ritual、inbound 0 trigger、本 project plan 不可侵原則 2)

> **絶対原則**: 物理削除の trigger は **期間 (日数 / commits 数 等) を一切使わず、参照場所が 0 になった瞬間**
> (inbound 0 機械検証) のみ。期間 buffer は儀式の再生産 (anti-ritual)。

archive 移管段階 (`99-archive/` 配下) は **inbound 0 機械検証** で trigger される:

```
新 doc Create (Phase 1) → 旧 doc Rewrite + parallel comparison (Phase 2)
  → registry 整合 + deprecation marker (Phase 4)
  → 旧 doc inbound 全件 update + grep "<旧 path>" 0 件 PASS (Phase 5 段階)
  → 旧 doc を 99-archive/ に移管 (frontmatter `archived: true`)
  → 99-archive 配下 file への inbound 0 機械検証 + 人間 deletion approval
  → 物理削除 (人間判断後の commit、AI 単独で判断しない)
```

期間 buffer (例: 30 日待機) は **絶対禁止**。inbound 0 機械検証のみが trigger。

## 3. 物理削除 trigger (人間判断必須、AI 判断しない)

archive 移管後の **物理削除** は AI が判断しない:

| 段階 | 判断者 | 判断基準 |
|---|---|---|
| 旧 path → 99-archive 移管 | AI 自主判断 | inbound 0 機械検証 PASS + §1.5 archive 前 mapping 義務 PASS |
| 99-archive 配下 file の物理削除 | **人間レビューア** (AI でない) | 99-archive 配下 file への inbound 0 機械検証 PASS + frontmatter `humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の articulate |

AI が独自判断で物理削除 commit を実行することは **禁止**。本 project checklist Phase 5 進行中判断
にも明示済。

## 4. 移行手順 (各旧 doc archive ごと、Phase 5 で実施)

各旧 doc に対して以下のステップを順守:

1. **新 doc landing 確認**: 該当する新 doc (`aag/<新名>.md`) が Phase 1〜2 で landing 済を確認
2. **mapping table landing 確認**: 新 doc に「旧 → 新 mapping table」が articulate 済を確認 (本 project plan 不可侵原則 5)
3. **inbound grep**: `git grep "<旧 path>"` で全 inbound を識別
4. **inbound 全件 update**: 各 inbound を旧 path → 新 path に書き換え (independent commits、breaking-changes.md §1.3 / §1.5 に整合)
5. **inbound 0 機械検証**: `git grep "<旧 path>"` で 0 件確認 + docRegistryGuard / docCodeConsistencyGuard PASS
6. **archive 移管**: `mv references/01-principles/<旧 path>.md references/99-archive/<旧 path>.md` + frontmatter `archived: true` + `archivedAt: 2026-XX-XX` + `archivedBy: <commit SHA>` 追加
7. **doc-registry / principles.json update**: 旧 path entry を archive section に移動、新 path entry の整合性を確認
8. **build / lint / docs:check / 全 guard PASS** 確認
9. **breaking-changes.md / legacy-retirement.md update**: 該当 entry を「完遂」articulation に flip

## 5. 履歴 (各旧 doc archive 完遂時に追記)

| 日付 | 旧 path | 移行先 | mapping 装着先 | inbound 0 PASS commit | archive 移管 commit | 物理削除 commit (人間 approval 後) |
|---|---|---|---|---|---|---|
| (未着手) | `adaptive-architecture-governance.md` | `aag/strategy.md` + `aag/architecture.md` | (Phase 2 で landing 予定) | TBD | TBD | TBD (人間判断) |
| (未着手) | `adaptive-governance-evolution.md` | `aag/evolution.md` | (Phase 1 で landing 予定) | TBD | TBD | TBD (人間判断) |
| (未着手) | `aag-5-constitution.md` | `aag/architecture.md` | (Phase 1〜2 で landing 予定) | TBD | TBD | TBD (人間判断) |
| (未着手) | `aag-5-source-of-truth-policy.md` | `aag/source-of-truth.md` | (Phase 1 で landing 予定) | TBD | TBD | TBD (人間判断) |
| (未着手) | `aag-5-layer-map.md` | `aag/layer-map.md` | (Phase 1 で landing 予定) | TBD | TBD | TBD (人間判断) |
| (未着手) | `aag-operational-classification.md` | `aag/operational-classification.md` | (Phase 1 で landing 予定) | TBD | TBD | TBD (人間判断) |

## 6. 完遂条件

本 project の legacy-retirement は以下が全て satisfy された時に完遂:

- 全 6 旧 doc が `references/99-archive/` に移管済 (frontmatter `archived: true` 装着)
- 各 archive 移管前に新 doc 内 mapping table が landed 済を確認した記録が §5 に articulate 済
- 全旧 doc への inbound 0 機械検証 PASS 状態が維持されている
- breaking-changes.md の各 archive entry が完遂 articulation に flip 済
- 本 doc §5 の各旧 doc 履歴 entry が完遂 articulation で fill 済
- 物理削除は人間 approval 後にのみ実施 (本 project の MVP scope では archive 移管までが完遂条件、物理削除は人間判断 gate)
