# breaking-changes — aag-core-doc-refactor

> 役割: 破壊的変更前提 (`breakingChange=true`) project の破壊対象 + 移行方針を articulate。
> 規約: `references/03-guides/projectization-policy.md` §5 + §3 Level 3。
>
> **本 project の scope**: 親 project (`aag-bidirectional-integrity`) の Phase 4 + Phase 5 = AAG Core doc
> 群の構造変更 + CLAUDE.md AAG セクション薄化 + 旧 path archive。
> 親 project breaking-changes.md (§1.3 / §1.4 / §1.5) を継承し、本 project scope に絞って articulate。

## 1. 破壊対象 inventory

### 1.1. AAG Core doc 群の構造変更

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **既存 8 doc の Split / Merge / Rewrite** | `adaptive-architecture-governance.md` (戦略マスター + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table 同居) を Split + Rewrite。`aag-5-constitution.md` ほか 5 doc を Rewrite + Relocate + Rename | 新規書き起こし → 旧 doc 退役の段階パス (edit-in-place 禁止、§3.5 操作順序原則、本 project plan 不可侵原則 1) | 全 inbound link、CLAUDE.md AAG セクション、doc-registry.json、principles.json、manifest.json |
| **ディレクトリ階層化** (`aag/` 集約) | `references/01-principles/aag-*` / `adaptive-*` を全て `references/01-principles/aag/` に集約 | Phase 1 で新 path に直接 Create、Phase 2 で Rewrite、Phase 5 で旧 doc archive 移管 (inbound 0 trigger) | 全 inbound link、CLAUDE.md / README.md / manifest.json の索引、obligation map |
| **命名規則刷新** (prefix 撤廃) | `aag-5-` / `adaptive-` prefix を撤廃、ディレクトリ階層で表現。短縮名 (`meta` / `strategy` / `architecture` / `evolution` / `operational-classification` / `source-of-truth` / `layer-map`) に統一 | Phase 1〜2 で Rewrite + Rename + Relocate を実施、旧 path は Phase 5 で migrationRecipe + 履歴付きで archive 退役 | doc-registry.json、principles.json、CLAUDE.md AAG セクション索引、各 inbound 参照 |

### 1.2. CLAUDE.md AAG セクション薄化

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **「AAG を背景にした思考」section 内容の移動** | core 内容を `aag/meta.md` (Phase 1 で landing 済) + `aag/strategy.md` (本 project Phase 1 で Create) に逃がし、CLAUDE.md は **鉄則 quote 3-5 行 + 詳細 link 形式** に薄化 (親 plan §8.13 判断 = B) | Phase 3 で実施、Phase 1〜2 完了後 (新 doc に core 内容が landing 済の状態) に section を薄化 | CLAUDE.md test-contract / canonicalization-tokens、CLAUDE.md からの inbound (manifest discovery hint 等) |

### 1.3. registry / contract / hook 系の path migration

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **`docs/contracts/doc-registry.json`** | 新 doc (aag/*) の追加 + 旧 doc の deprecation marker → archive 移管 | Phase 1 (新 doc Create 時) で新 doc 追加、Phase 4 で deprecation marker、Phase 5 (旧 doc archive 時) で update | docRegistryGuard.test.ts、obligation map、pre-commit hook |
| **`docs/contracts/principles.json`** | 旧 path 群 (`adaptive-architecture-governance.md` 等) の reference を新 path (`aag/strategy.md` 等) に migrate | Phase 4 で update、principles 構造の整合性は documentConsistency.test.ts で検証 | documentConsistency.test.ts、principles の inbound |
| **`.claude/manifest.json`** | `discovery.byTopic` / `byExpertise` / `pathTriggers` が旧 path を指す箇所を新 path に migrate | Phase 4 で update、manifestGuard.test.ts で整合性検証 | manifestGuard.test.ts、AI セッションの discovery hint |
| **`references/README.md`** | AAG 関連 doc 索引 update (新 doc 追加 + 旧 doc archive marker) | Phase 4 で update | references/README.md からの inbound |

### 1.4. 旧 doc archive (legacy retirement、Phase 5)

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| `adaptive-architecture-governance.md` | Phase 2 で Split (戦略 → strategy.md / 文化論 → strategy.md or meta.md / 旧 4 層 → 99-archive / バージョン履歴 → per-doc 分散) → Phase 5 で archive 移管 | inbound 0 機械検証 + §1.5 archive 前 mapping 義務 PASS 後 | 旧 doc inbound 全件 (60+ 想定) |
| `aag-5-constitution.md` | Phase 1 で `aag/architecture.md` に統合 Rewrite → Phase 5 で archive 移管 | 同上 | 旧 doc inbound 全件 (40+ 想定) |
| `aag-5-source-of-truth-policy.md` | Phase 1 で `aag/source-of-truth.md` として Rewrite + Relocate + Rename → Phase 5 で archive 移管 | 同上 | 旧 doc inbound 全件 |
| `aag-5-layer-map.md` | Phase 1 で `aag/layer-map.md` として Rewrite + Relocate + Rename → Phase 5 で archive 移管 | 同上 | 旧 doc inbound 全件 |
| `aag-operational-classification.md` | Phase 1 で `aag/operational-classification.md` として Rewrite + Relocate → Phase 5 で archive 移管 | 同上 | 旧 doc inbound 全件 |
| `adaptive-governance-evolution.md` | Phase 1 で `aag/evolution.md` として Rewrite + Relocate + Rename → Phase 5 で archive 移管 | 同上 | 旧 doc inbound 全件 |

## 2. 移行原則

### 2.1. 段階パス厳守 (§3.5 操作順序原則、本 project plan 不可侵原則 1)

```
Create (新 path 新 doc) → Split / Merge / Rewrite (内容移動) → Rename / Relocate / Archive (旧 path 退役)
```

**edit-in-place は禁止**。各操作は独立 commit で landing し、parallel comparison 期間を確保する。

### 2.2. inbound 0 trigger (本 project plan 不可侵原則 2)

旧 path の archive trigger は **inbound 参照 0 件の機械検証** のみ。期間 buffer (例: 30 日待機) は
anti-ritual として禁止。`git grep "<旧 path>"` で 0 件 → archive 移管。

### 2.3. archive 前 mapping 義務 (本 project plan 不可侵原則 5)

旧 doc を archive する前に、新 doc に **「旧概念 → 新概念 mapping table」が landed 済**であることを
機械検証で確認。mapping なしの archive は禁止。例: `aag/architecture.md` 内に「旧 4 層 → 新 5 層
mapping table」を必ず articulate してから旧 `aag-5-constitution.md` を archive する。

### 2.4. 物理削除 trigger (人間判断必須)

archive 配下 file への inbound 0 機械検証 PASS 後の **物理削除** は AI が判断しない。frontmatter
`humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の articulate を人間レビューアが
行った後にのみ AI が物理削除 commit を実行できる (本 project checklist Phase 5 進行中判断)。

## 3. backward 互換性

本 project は **doc path の構造変更** であり、**runtime 機能の変更ではない**:

- アプリケーション (粗利管理ツール) の機能変更なし
- domain calculation / business logic の変更なし
- ユーザー向け UI / API の変更なし
- AAG Core 8 doc を読む後任 AI session への影響あり (旧 path を refer すると docRegistryGuard
  hard fail) → 全 inbound update が必須

backward 互換は **doc inbound update の完遂** で担保する (Phase 5 で 160+ inbound を全件 update)。

## 4. 完遂条件

本 project の breaking-changes は以下が全て satisfy された時に完遂:

- 全新 doc が `aag/` 配下に landing 済 (Phase 1)
- 各新 doc に 5 層位置付け + drill-down pointer + 旧概念 mapping section が articulate 済 (Phase 1〜2)
- CLAUDE.md AAG セクションが薄化済 (Phase 3)
- doc-registry.json / principles.json / manifest.json / references/README.md が新 doc に整合済 (Phase 4)
- 全旧 doc への inbound 0 機械検証 PASS (Phase 5)
- 全旧 doc が `references/99-archive/` に移管済 (Phase 5)
- legacy-retirement.md の各 entry が完遂 articulate (Phase 5)
- 最終レビュー (人間承認) checkbox が [x] flip 済 (Phase 6)
