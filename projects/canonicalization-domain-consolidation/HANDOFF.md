# HANDOFF — canonicalization-domain-consolidation

> 役割: project の volatile な進行状態（現在地 / 次にやること / 並行進行 / 着手前確認）を 1 箇所に集約する。AI セッション再開時の進行同期点。

## 現在地

**status: draft（Phase 0 bootstrap 完遂、Phase A 未着手）**

### 完遂したもの

- plan.md（North Star + Phase A〜I + 不可侵 7 原則 + 撤退規律 5 step）
- checklist.md（Phase 0 + A〜I + 最終レビュー）
- projectization.md（Level 4 architecture-refactor 判定）
- AI_CONTEXT.md（scope + read order）
- config/project.json（Level 4, status=draft）
- aag/execution-overlay.ts（空 overlay、本 project が active 化したら埋める）

### 立ち上げの経緯

- `phased-content-specs-rollout` Phase D Step 1（Lifecycle State Machine + Promote Ceremony PR template）の実装完了直後、user の指摘で立ち上がった
- 「Spec State (整合性) ドメインが暗黙に出現していて、独立 domain として recognize すべき」「散在する他の整合性層も含めて統合したい」「未正本化領域への横展開も同時計画に含めたい」というスコープ拡張
- 直前の対話で「**正本化 → 制度の統一性 → 簡素な仕組みで強固な効果**」が North Star として確定（plan.md §0）

## 次にやること

### 直近（次の 1〜2 PR で）

1. **Phase A inventory 着手 — 優先度 high (2026-04-28 update)**
   - `references/03-guides/integrity-pair-inventory.md` を新設
   - 既存 13 ペア（plan.md §1.2）を表で正式列挙
   - 各ペアの parser / 検出パターン / ratchet-down / 不変条件を記載
   - **#12 セルは Phase J 完遂状態を rich に記載**（11 guard / 310 claim / baseline 0 / `contentSpecHelpers.ts` を Phase B reference として明記）
   - 横展開候補（plan.md §1.3）を別表で inventory
   - selection rule の draft（複数 caller / 業務意味 / 重複検出有効性）
   - **Phase J で得た知見を時間経過で忘却させないため、本 inventory を最優先で固定する**

2. **doc-registry.json 登録**
   - 本 project の plan / checklist / projectization / AI_CONTEXT / HANDOFF を doc-registry に追加
   - `references/03-guides/integrity-pair-inventory.md` を Phase A 完遂時に追加

3. **CLAUDE.md 更新確認**
   - manifest.json の `discovery.byTopic` に「整合性ドメイン」を追加するか検討
   - 過剰追加は避ける、判断は documentation-steward

4. **Phase J 後続 B (J7 path 実在 guard) との同期検討**
   - `phased-content-specs-rollout` の後続課題 B（claim 内 path の実在検証）は
     canonicalization Phase B が抽出する `detection/pathExistence.ts` primitive と
     同形（registry 内 path → file existence 検証は #3 doc-registry / #11 obligation-collector /
     #7 principles 等にも共通する drift 軸）
   - J7 を「将来 `app-domain/integrity/detection/pathExistence.ts` に extract される shape」で
     書く合意を Phase A inventory 完遂時に明文化する

### 中期（Phase B〜C）

- Phase B: domain skeleton 設置（`app-domain/integrity/`）
- Phase B: spec-state 系（contentSpec*Guard）を最初の adapter に
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
