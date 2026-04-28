# HANDOFF — canonicalization-domain-consolidation

> 役割: project の volatile な進行状態（現在地 / 次にやること / 並行進行 / 着手前確認）を 1 箇所に集約する。AI セッション再開時の進行同期点。

## 現在地

**status: draft（Phase 0 bootstrap 完遂 + Phase A primary deliverable + Phase A 周辺整備完遂、Phase B 未着手）**

### 完遂したもの

#### Phase 0 bootstrap

- plan.md（North Star + Phase A〜I + 不可侵 7 原則 + 撤退規律 5 step）
- checklist.md（Phase 0 + A〜I + 最終レビュー）
- projectization.md（Level 4 architecture-refactor 判定）
- AI_CONTEXT.md（scope + read order）
- config/project.json（Level 4, status=draft）
- aag/execution-overlay.ts（空 overlay、本 project が active 化したら埋める）

#### Phase A primary deliverable（2026-04-28 完遂）

- `references/03-guides/integrity-pair-inventory.md` §1〜§4 prose landed（13 ペア詳細 + selection rule + primitive 対応表 + 採用候補リスト）
- `references/01-principles/canonicalization-principles.md` P8 selection rule 拡張版 landed（3 ゲート + 3 tie-breaker、Phase I checklist の素材）
- `projects/canonicalization-domain-consolidation/derived/adoption-candidates.json` machine-readable 版 landed（priority / phase / primitives 構造化、collector 用）
- `projects/canonicalization-domain-consolidation/derived/README.md`（同期規約 + 用途）
- `docs/contracts/doc-registry.json` の inventory.md label を populated 状態に更新

### 立ち上げの経緯

- `phased-content-specs-rollout` Phase D Step 1（Lifecycle State Machine + Promote Ceremony PR template）の実装完了直後、user の指摘で立ち上がった
- 「Spec State (整合性) ドメインが暗黙に出現していて、独立 domain として recognize すべき」「散在する他の整合性層も含めて統合したい」「未正本化領域への横展開も同時計画に含めたい」というスコープ拡張
- 直前の対話で「**正本化 → 制度の統一性 → 簡素な仕組みで強固な効果**」が North Star として確定（plan.md §0）

## 次にやること

### 直近（次の 1〜2 PR で）

1. **Phase A inventory 着手 — ✅ 完遂 (2026-04-28)**
   - `references/03-guides/integrity-pair-inventory.md` §1〜§4 prose landed
   - `references/01-principles/canonicalization-principles.md` P8 selection rule 拡張版 landed
   - `projects/canonicalization-domain-consolidation/derived/adoption-candidates.json` machine-readable 版 landed
   - 13 ペア詳細 + 横展開候補 9 件の selection 判定（tier1 4 / tier2 4 / 不採用 1）+ primitive 6+8+1+4 抽出順 + 採用候補 priority 順
   - **Phase J 知見の固定済**（#12 が「reference 実装の供給元」として明示、Phase B 完了見積もり ~30% 圧縮）

2. **doc-registry.json への project doc 登録 — 保留（人間判断）**
   - 当初予定: 本 project の plan / checklist / projectization / AI_CONTEXT / HANDOFF を doc-registry に追加
   - **判断**: 既存 doc-registry.json には projects/ 配下の file が **0 件**登録されている。新たに追加すると既存 project（phased-content-specs-rollout / pure-calculation-reorg / taxonomy-v2 等）との非対称が生まれる。この pattern を採用するなら **全 live project に対称的に適用する別 project** として立ち上げるべき（不可侵原則 4「新 registry+guard の追加 ≠ 横展開」適用）
   - inventory.md の登録は完了（label を populated 状態に更新済）

3. **CLAUDE.md / manifest.json 更新 — ✅ 完遂 (2026-04-28)**
   - `.claude/manifest.json` の `discovery.byTopic` に「整合性ペア (registry+guard)」エントリを追加
     → `references/03-guides/integrity-pair-inventory.md` + `references/01-principles/canonicalization-principles.md` の 2 doc を hint として配置
   - manifestGuard 通過 (path 実在検証のみ、追加制約なし — 当初の「Phase B 後の方が適切」判定は manifest が hints-only policy のため不要と判定)
   - Phase B 完遂時に追加 hint (`app-domain/integrity/` 配下) を再評価可

4. **Phase J 後続 B (J7 path 実在 guard) との同期 — ✅ 完遂 (2026-04-28、cross-link 確認のみ)**
   - 双方向 cross-link 既に確立:
     - canonicalization 側: inventory §3.2 で `detection/pathExistence.ts` を「最重要 primitive」として明記、§1 共通観察で「path 実在検証が #3 / #5 / #11 / #12 / J7 で重複」を記録
     - phased-content-specs 側: HANDOFF §高優先 #1 で「canonicalization-aware 設計: 将来 `app-domain/integrity/detection/pathExistence.ts` に extract される shape で実装」を明記、plan §4 Phase J 後続課題 B でも同合意
   - **追加作業不要**。J7 実装 PR が canonicalization Phase B `detection/pathExistence.ts` の reference 実装供給を兼ねる (#12 の contentSpec\*Guard と同様の Phase J → Phase B 寄稿 pattern)

### Phase B 着手前の準備状態

- inventory §4 採用候補リスト priority 1: **#12 contentSpec ↔ contentSpec\*Guard × 11**（reference 実装、Phase J 完遂）
- inventory §3.5 Phase B primitive 抽出順: `formatViolation` → `yamlFrontmatter` → `existence` + `pathExistence` → `ratchet`
- 着手 1 番手 4 primitive で 13 ペアのうち約 8 ペアの adapter 化が最小コストで可能

### 中期（Phase B〜C）

- Phase B: domain skeleton 設置（`app-domain/integrity/`）
- Phase B: spec-state 系（contentSpec\*Guard）を最初の adapter に
- Phase C: doc-registry guard を 2 番目の adapter に（lowest risk migration）

## 並行進行している project

- **phased-content-specs-rollout**（**Phase A〜J 完遂、2026-04-28**）
  - Phase J Step 10 完遂時点で 11 guard / 89 spec / 310 claim / baseline 全 0
  - Behavior Claims Evidence Level enforcement (J1〜J6) 全て active で違反 0
  - candidate slot 二状態モデル（planning-only / active candidate split）institutionalize 済
  - 本 project の **Phase B reference 実装の供給元** として確定（plan §1.2 #12 / §3.2 対応表）
  - `contentSpecHelpers.ts` が **Phase B domain primitive の暗黙の skeleton** として待機
  - 後続課題: J7 path 実在 guard / reviewed→tested 昇格 / AST 整合検証 / Phase G visual evidence
    （これらは canonicalization Phase B/C 以降と並走可能、共通 primitive 抽出の触媒となりうる）
- **pure-calculation-reorg**（active、CURRENT_PROJECT.md = active overlay）
  - 本 project の Phase D bulk migration で `calculationCanonRegistry` 周辺を touch する際は協調必要

## 着手前の確認事項

- 不可侵原則 1（drift 検出強度を弱めない）を全 commit で確認する
- nonGoals（business logic 変更しない / 一斉導入しない）を毎 PR で確認する
- 撤退 5 step を skip しない（並行運用 → 観察 → @deprecated → 物理削除 → baseline 統合）

## 関連リンク

- North Star: `plan.md §0`
- 設計思想: `plan.md §3`
- 撤退規律: `plan.md §5`
- 既存正本化原則: `references/01-principles/canonicalization-principles.md`
- 既存 inventory 起点: `app/src/test/calculationCanonRegistry.ts` 周辺
- 既存 spec-state 実装（reference): `tools/widget-specs/generate.mjs` + `app/src/test/guards/contentSpec*`
