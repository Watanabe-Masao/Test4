# breaking-changes — aag-bidirectional-integrity

> 役割: 破壊的変更前提 (`breakingChange=true`) project の破壊対象 + 移行方針を articulate。
> 規約: `references/03-guides/projectization-policy.md` §5 + §3 Level 3。
>
> **本 project の方針 (plan §1.2 #10、§2 不可侵原則 #11)**: 追加コスト / 変更コストを考慮せず
> AAG の根本的整理に必要な変更を遂行する。Layer 0 (目的) を除き、AAG 内のあらゆる構造は変更可能。
> ただし本体アプリ (粗利管理ツール) の機能変更は scope 外。

## 1. 破壊対象 inventory

### 1.1. AAG framework 構造の拡張

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **旧 4 層 → 新 5 層 model への拡張** | 旧 4 層 (Constitution/Schema/Execution/Operations) に **Layer 4 検証 (Verification)** を追加 (5 sub-audit: 4.1 境界 / 4.2 方向 / 4.3 波及 / 4.4 完備性 / 4.5 機能性) | aag/architecture.md (新 Create) で **旧 4 層 → 新 5 層 mapping table** + 5 層構造を articulate、aag/meta.md §3 (Core mapping) で 5 層 × 5 縦スライス matrix view を保持 | AAG 全体、Phase 4 doc refactor + Phase 8 meta-guard |
| **5 縦スライス境界の reshape** | 既存 5 縦スライス (`layer-boundary` / `canonicalization` / `query-runtime` / `responsibility-separation` / `governance-ops`) の境界を Phase 3 audit で reshape 許容 (新スライス追加 / 分割 / merge) | Phase 3 audit findings に基づき Phase 4 で実施、aag/meta.md §3 matrix で reshape 後の境界を articulate | 既存 100+ AR-NNN rule の slice assignment、guardCategoryMap.ts |

### 1.2. AAG rule schema の拡張 (semantic articulation 構造)

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **`canonicalDocRef` field 追加** | `architectureRules/defaults.ts` の rule entry schema に `canonicalDocRef: { status: 'pending'\|'not-applicable'\|'bound', justification?, refs: Array<{ docPath, problemAddressed, resolutionContribution }> }` を追加 (実装 → 設計 doc binding、status field で「未対応」「意図的不要」「binding 完了」を区別、semantic articulation 必須) | 既存全 rule に `status: 'pending'` で初期化、Phase 6 で分類 A から順次 `'bound'` に flip or `'not-applicable'` で justify。Phase 2 で schema migration | 既存 100+ AR-NNN rule、`guardCategoryMap.ts`、TypeScript 型定義 |
| **`metaRequirementRefs` field 追加** | rule entry schema に `metaRequirementRefs: { status, justification?, refs: Array<{ requirementId, problemAddressed, resolutionContribution }> }` を追加 (実装 → 要件 binding、Layer 1 ↔ Layer 3 の機械検証要件) | 既存全 rule に `status: 'pending'` で初期化、Phase 6 で binding 記入。Phase 8 meta-guard で検証 (status 整合性 + semantic 品質基準) | 既存全 rule、Phase 8 で landing する `metaRequirementBindingGuard.test.ts` + `statusIntegrityGuard.test.ts` |
| **semantic articulation 品質基準** (Phase 8 で機械検証) | `problemAddressed` / `resolutionContribution` / `justification` の禁止 keyword (TBD/N/A/same/see above 等) + 20 文字 minimum + 重複検出 を `semanticArticulationQualityGuard.test.ts` で hard fail | Phase 0.5 で品質基準確定、Phase 8 で guard 実装 | semantic articulation を持つ全 rule entry |
| **(検討) `principleRefs` の semantic 化** | 既存 `principleRefs: PrincipleId[]` (pointer のみ) を `Array<{ principleId, problemAddressed, resolutionContribution }>` に拡張 (Phase 2 で判断) | plan §8.9 で integrate 判断、別 sprint へ分離も検討 | 既存 92+ rule の principleRefs assignment |

### 1.3. AAG Core doc 群の構造変更

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **既存 8 doc の Split / Merge / Rewrite** | `adaptive-architecture-governance.md` (戦略マスター + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table 同居) を Split + Rewrite。`aag-5-constitution.md` ほか 5 doc を Rewrite + Relocate + Rename | 新規書き起こし → 旧 doc 退役の段階パス (edit-in-place 禁止、§3.5 操作順序原則) | 全 inbound link、CLAUDE.md AAG セクション、doc-registry.json、principles.json、manifest.json |
| **ディレクトリ階層化** (`aag/` 集約) | `references/01-principles/aag-*` / `adaptive-*` を全て `references/01-principles/aag/` に集約 | Create 段階で新 path に直接 Create、Rewrite で内容移動、旧 doc は Phase 5 で archive 移管 (inbound 0 trigger) | 全 inbound link、CLAUDE.md / README.md / manifest.json の索引、obligation map |
| **命名規則刷新** (prefix 撤廃) | `aag-5-` / `adaptive-` prefix を撤廃、ディレクトリ階層で表現。短縮名 (`meta` / `strategy` / `architecture` / `evolution` / `operational-classification` / `source-of-truth` / `layer-map`) に統一 | Phase 4 Rewrite + Rename + Relocate で実施、旧 path は migrationRecipe + 履歴付きで archive 退役 | doc-registry.json、principles.json、CLAUDE.md AAG セクション索引、各 inbound 参照 |
| **既存 doc の Archive (即時 superseded)** | `aag-four-layer-architecture.md` (旧 4 層、`aag-5-constitution.md` で superseded 済) と `aag-rule-splitting-plan.md` (completed project execution 記録、archive 済 project の遺物) を Phase 5 で `99-archive/` 移管 | 機械検証で旧 path への inbound 0 確認後に移管、99-archive 配下 inbound も 0 で物理削除 (期間 buffer なし) | inbound 参照の grep 全数 |

### 1.4. CLAUDE.md AAG セクション薄化

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **「AAG を背景にした思考」section 内容の移動** | core 内容を `aag/meta.md` に逃がし、CLAUDE.md は `aag/README.md` への 1 link 索引のみに薄化 | Phase 4 で実施、aag/meta.md landing 後 (Phase 1 完了後) に section 内容を逃がす | CLAUDE.md test-contract / canonicalization-tokens、CLAUDE.md からの inbound (manifest discovery hint 等) |

### 1.5. registry / contract / hook 系の path migration

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **`docs/contracts/doc-registry.json`** | 新 doc (aag/*) の追加 + 旧 doc の archive 移管 | Phase 1 (新 doc Create 時) + Phase 5 (旧 doc archive 時) で update | docRegistryGuard.test.ts、obligation map、pre-commit hook |
| **`docs/contracts/principles.json`** | 旧 path 群 (`adaptive-architecture-governance.md` 等) の reference を新 path (`aag/strategy.md` 等) に migrate | Phase 4 doc refactor 時に update、principles 構造の整合性は documentConsistency.test.ts で検証 | documentConsistency.test.ts、principles の inbound |
| **`.claude/manifest.json`** | `discovery.byTopic` / `byExpertise` / `pathTriggers` が旧 path を指す箇所を新 path に migrate | Phase 4 で update、manifestGuard.test.ts で整合性検証 | manifestGuard.test.ts、AI セッションの discovery hint |

### 1.6. 既存 AR-NNN rule の振る舞い変更 (許容)

| 対象 | 変更内容 | 移行方針 | 影響範囲 |
|---|---|---|---|
| **rule の audit + 撤回判定** | Phase 6 で既存 100+ rule を A/B/C/D 4 分類。**分類 D (proxy / performative)** と判定された rule は **撤回 (deprecated)** 許容 | 撤回 trigger 確定 + 段階的に sunset。allowlist baseline 維持 (ratchet-down) | 既存 rule baseline、allowlist、health KPI |
| **enforcement logic の変更** | 必要に応じて detection logic の修正を許容 (proxy metric の置換、precision 改善等) | rule by rule で変更、各 PR で hard fail check + synthetic 注入確認 | 既存 baseline、CI / pre-commit hook |

## 2. 移行方針の総括

### 2.1. 操作順序原則 (plan §3.5 + §2 不可侵原則 #4)

1. **Create 先行** (新 path に直接 Create、Relocate を不要にする)
2. **Split / Merge / Rewrite** 中段 (新 doc 群を完成、旧 doc は deprecation marker のみ)
3. **Rename / Relocate / Archive** 後段 (旧 doc が validate されてから path 変更 / 退役)
4. **各 operation 独立 commit** (parallel comparison 期間を確保)
5. **inbound 0 trigger** で物理削除 (期間 buffer 不使用、anti-ritual)

### 2.2. parallel comparison 期間

旧 doc は Phase 4 完了直後には archive 移管せず、**deprecation marker 段階に留める**。新 doc が
validate されて全 inbound reference が新 path に migrate された **状態** (機械検証可能) で初めて
Phase 5 archive 移管に進む。これにより:

- 後任が git log で経緯を追える
- 旧 doc 内容を残したまま新 doc を inspect できる
- inbound migration が段階的に実施できる (Phase 4 → Phase 5 の間に他 task の commits が挟まる可能性)

### 2.3. 機械検証可能な migration 状態 (`docRegistryGuard` 等で確認)

- 旧 path への inbound 数 (grep ベース、全 source / doc / registry / guard binding 横断)
- 99-archive 配下への inbound 数 (物理削除 trigger)
- 新 path の registry 登録状態 (doc-registry.json に正しく登録されているか)
- principles.json / manifest.json の reference 整合性

期間 (日数 / commits 数) は trigger に **使用しない** (anti-ritual、§2 不可侵原則 #7)。

## 3. ロールバック方針

破壊的変更前提のため大規模変更が連続するが、各 operation は **独立 commit** で実施するため、
`git revert <commit>` で個別段階に戻せる。ただし:

- Phase 4 で完成した新 doc (Create) は revert しない (work が失われる)
- Phase 5 archive 移管後の物理削除のみは **完全 reversible でない** (git history に残るが復元コスト高)
- aag/meta.md (Layer 0+1 charter) の改訂は Constitution 改訂レベルの人間 review が必須、ロールバックも同レベル

## 4. 実 execution は別セッション

本 project の plan refinement は本セッションで完遂、実 execution は次セッション以降。詳細:

- 実装 prerequisite: plan §8 「実装セッションで確認・調査が必要な事項」
- Phase 着手順: plan §4 Phase 構造 (Phase 1 → 10)
- 実装 handoff: HANDOFF.md §2 + §3 ハマりポイント

## 5. 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | canonical 計画 doc (破壊対象の articulation は §1.3 / §3.1 / §6 + §8) |
| `legacy-retirement.md` | Phase 5 archive 計画 (旧 doc の退役、inbound 0 trigger) |
| `projectization.md` | breakingChange=true の判定理由 (§2) |
| `references/03-guides/projectization-policy.md` | breakingChange / requiresLegacyRetirement の規約 |

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-30 | 初版 landing | projectization.md `breakingChange: false → true` 変更 (plan §1.2 #10 破壊的変更前提) に対応する PZ-7 必須 doc として新規 Create。本 project の破壊対象 6 カテゴリ (framework 構造拡張 / rule schema / Core doc 構造 / CLAUDE.md 薄化 / registry / 既存 rule 振る舞い変更) を articulate。 |
