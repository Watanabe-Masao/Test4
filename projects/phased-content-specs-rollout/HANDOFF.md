# HANDOFF — phased-content-specs-rollout

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 (計画 doc landing) を bootstrap 中。Phase A 以降は依存待ち。**

`references/05-contents/` に WSS scaffold が landed 済（umbrella `architecture-debt-recovery`
inquiry/01a Phase 1 addendum、2026-04-23）。本 project はその後段の段階展開計画を
canonical 化するために spawn された。

「初回スコープ外」を「順番を後にすること」として再定義し、Phase A〜J の順序・依存・
完了条件を `plan.md` / `checklist.md` で固定する。

### spawn 時 landed (本 commit)

- `config/project.json`（Level 2 / docs-only / parent: architecture-debt-recovery）
- `AI_CONTEXT.md`（why / scope / read order）
- `HANDOFF.md`（本ファイル）
- `plan.md`（Phase A〜J 構造 + 不可侵原則 + 依存グラフ）
- `checklist.md`（Phase 0〜J + 最終レビュー）
- `projectization.md`（AAG-COA 判定）
- `aag/execution-overlay.ts`（initial 空）

### 着手前提（Phase A 以降）

| 前提 | 状態 |
|---|---|
| umbrella inquiry/01a Phase 6 frontmatter generator landed | 未着手（umbrella 側 Phase 6 量産時） |
| `AR-CONTENT-SPEC-*` 5 件の active 化 | 未着手（umbrella 側 Phase 6） |
| `obligation-collector.ts` への OBLIGATION_MAP entry 追加 | 未着手（umbrella 側 Phase 6） |
| SP-B (widget-registry-simplification) status | planned（spawn 待ち） |

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- **Phase 0 完遂**: 本 commit で項目を [x] 化し、`docs:generate` で project-health に
  `phased-content-specs-rollout` が現れることを確認する
- 人間 review で本 plan の Phase A〜J 順序・対象・完了条件が SP-B / SP-C / SP-D の
  実態と整合しているか検証する

### 中優先

- **Phase A 着手準備**: umbrella inquiry/01a Phase 6 の進捗を監視し、frontmatter
  generator + AR rule active 化が landed したら Phase A 着手宣言（本 project の
  HANDOFF を update）
- **Anchor Slice 5 件の archetype 整備**: WID-002 / WID-040 が umbrella inquiry/01a §「未着手」
  で pilot 候補として明記されている。WID-001 / WID-033 / WID-018 / WID-006 を加えた
  5 件の selection 妥当性を改めて確認する

### 低優先

- **Phase F 以降の selection rule 詳細化**: 現状 plan.md §Phase F に列挙した 6 条件は
  initial draft。Phase E 完了時点で UI 改修の実績データを参照して見直す
- **Phase J の high-risk claim 定義**: 「high-risk」の判定基準は Phase I 完了後に
  PR Impact Report の risk level 出力ロジックと同期して確定

## 3. ハマりポイント

### 3.1. 「初回スコープ外」の表現を本 plan に持ち込まない

不可侵原則 1 違反。本 project の存在意義は「Phase B 以降を放棄しないこと」を
明文化することにある。`plan.md` / `checklist.md` / `AI_CONTEXT.md` に「out of scope」
「非対象」「初回除外」のような表現が混入したら不可侵原則違反として差し戻す。

正しい表現: 「Phase X で着手する」「依存 Phase 完了後に Wave 化する」。

### 3.2. Phase A の対象を 5 件から拡大しない

Anchor Slice の目的は **「対象網羅」ではなく「保証経路完成」**。
WID-033 / WID-040 / WID-018 / WID-006 / WID-002 の 5 件で source / spec / guard / CI の
4 経路 end-to-end が確認できれば、後続 Phase は同じ仕組みの対象拡大として
段階導入できる。Phase A で 6 件目以降に手を広げると、保証経路が完成する前に
重量化して目的を失う（plan.md 不可侵原則 3）。

### 3.3. 本 project は計画の正本、実装は依存 sub-project の責務

Phase A の実装（spec 本文量産・JSDoc 注入・guard 実装）は、SP-B 側の作業 PR で実施され
るのが整理上自然（registry 改修と同期するため）。本 project は **計画と完了条件**を
持つだけで、コード変更を直接行わない（projectization.md §3）。

ただし Phase A 完了の確認（checklist.md の [x] 化）は本 project が責任を持つ。

### 3.4. Phase F 以降は selection rule 必須

UI Components / Charts / Storybook 連携 等を全網羅すると drift コストで運用が崩壊する。
Phase F の 6 条件 / Phase E の 4 条件は「selection 必須」を明示するための
sentinel。条件追加で網羅範囲が広がるのは OK、条件削除で全網羅に近づくのは NG
（plan.md 不可侵原則 + C9 現実把握優先）。

### 3.5. content-spec-health.json は Phase H で初出

Phase H 完了前に `references/02-status/generated/content-spec-health.json` を
参照する CLAUDE.md 記述・docs:check 経路を追加してはならない。Phase H で collector
を実装してから初めて生成される。先行参照すると `docRegistryGuard` で fail する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | Phase A〜J 構造 + 不可侵原則 + 依存グラフ |
| `checklist.md` | Phase 0〜J completion 条件 |
| `projectization.md` | AAG-COA 判定 (Level 2 / docs-only) |
| `config/project.json` | project manifest |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | SP-A〜D 依存関係 |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
