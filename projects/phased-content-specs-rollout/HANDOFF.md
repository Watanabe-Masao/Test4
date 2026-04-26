# HANDOFF — phased-content-specs-rollout

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**spawn 済 / Phase 0（計画 doc landing）完遂直後 / Phase A 着手前。
status: `active` / parent: なし（archived umbrella の sub-project ではない）。**

### spawn → ACTIVE への経緯

| 日付 | 事象 |
|---|---|
| 2026-04-26 | 本 project を独立 sub-project (Level 2 / docs-only) として spawn（旧版 `inquiry/22` で SP-B Anchor Slice + SP-B/D absorption 戦略） |
| 2026-04-26 | umbrella `architecture-debt-recovery` の不可侵原則 #16 + 軽量起動の原則に従い、canonical 計画 doc を `inquiry/22` に移管 + 本 project を **SHELL モード**降格 |
| 2026-04-26 | Operational Control System §1〜§11 を inquiry/22 に追加 |
| **2026-04-26** | umbrella + 4 sub-project (SP-A/B/C/D) **全 archive 完遂**（main merge）。45 WID spec 本文 landed。archived umbrella 配下の inquiry が無効化されたため、**本 project を ACTIVE 昇格 + plan.md を canonical 化**（旧 inquiry/22 を `plan.md` に移管・post-archive 文脈に適合） |

### 現状の役割

- **canonical 計画 doc**: 本 project の `plan.md`（Phase A〜J + Operational Control System §1〜§11）
- **状態**: `status: active` / parent なし / Level 3 / governance-hardening
- **次の作業**: Phase A の Anchor Slice 5 件に対する **source ↔ spec 機械接続**

### 主な前提（2026-04-26 時点、main merge 後）

- archived: SP-A widget-context-boundary / SP-B widget-registry-simplification / SP-C duplicate-orphan-retirement / SP-D aag-temporal-governance-hardening / umbrella architecture-debt-recovery
- landed: 全 45 WID-NNN.md spec 本文（`references/05-contents/widgets/`）
- WSS bootstrap: D1〜D8 確定済み（archived umbrella `inquiry/01a`）
- 未着手: source `@widget-id` JSDoc / frontmatter generator / `AR-CONTENT-SPEC-*` rule active 化 / co-change guard / OBLIGATION_MAP 拡張

## 2. 次にやること

詳細は `plan.md` §4 / `checklist.md` を参照。

### 高優先（Phase A Anchor Slice — 保証経路完成）

**Phase A は 5 件 (WID-002 / 006 / 018 / 033 / 040) に限定**（不可侵原則 3）。

1. **frontmatter generator 実装** — `tools/widget-specs/generate.mjs`（source AST → frontmatter 上書き生成）
2. **source への JSDoc 注入** — Anchor Slice 5 widget の registry entry に `@widget-id WID-NNN`
3. **5 件の `AR-CONTENT-SPEC-*` rule** を `architectureRules.ts` に登録 + active 化:
   - `AR-CONTENT-SPEC-EXISTS` / `FRONTMATTER-SYNC` / `CO-CHANGE` / `FRESHNESS` / `OWNER`
4. **`obligation-collector.ts` の `OBLIGATION_MAP`** に entry 追加（registry 変更 → spec 更新義務）
5. **co-change / freshness / owner guard** の実装
6. **`npm run content-specs:check` script** + CI 接続

### 中優先（Phase B 着手）

Phase A 完遂 + Promotion Gate L4 到達後、45 WID 全体に拡張（同じ仕組みの対象拡大）。

### 低優先（Phase C 以降の準備）

- `RM-NNN` / `PIPE-NNN` / `QH-NNN` / `PROJ-NNN` の ID 体系の事前 review
- `references/05-contents/{read-models,pipelines,query-handlers,projections}/` 新サブカテゴリの事前設計
- archived sub-project SUMMARY との連携 (§5.7) の運用テンプレ作成

## 3. ハマりポイント

### 3.1. 「初回スコープ外」の表現を本 plan に持ち込まない

不可侵原則 1 違反。本 project の存在意義は「Phase B 以降を放棄しないこと」を構造的に
保証することにある。`plan.md` / `checklist.md` / `AI_CONTEXT.md` に「out of scope」
「非対象」「初回除外」のような表現が混入したら不可侵原則違反として差し戻す。

**正しい表現**: 「Phase X で着手する」「依存 Phase 完了後に Wave 化する」。

### 3.2. Phase A の対象を 5 件から拡大しない

Anchor Slice の目的は **「対象網羅」ではなく「保証経路完成」**。
WID-033 / WID-040 / WID-018 / WID-006 / WID-002 の 5 件で source / spec / guard / CI の
4 経路 end-to-end が確認できれば、後続 Phase は同じ仕組みの対象拡大として
段階導入できる。Phase A で 6 件目以降に手を広げると、保証経路が完成する前に
重量化して目的を失う（plan.md 不可侵原則 3）。

### 3.3. WID-NNN 本文の上書き禁止

全 45 WID spec 本文は SP-B archive 期間に landed 済み（umbrella Phase 6 量産）。
本 project の Phase A の作業は **frontmatter 同期と source 接続のみ**。
本文（Section 1-9）を上書きする変更は scope 外（`plan.md` §7 やってはいけないこと）。

### 3.4. archived umbrella / archived sub-project の touch 禁止

archived は immutable（`projects/completed/architecture-debt-recovery/` 等）。
本 project は umbrella の sub-project ではない（不可侵原則 8）。
`config/project.json.parent` は設定しない。

archived sub-project SUMMARY との連携 (§5.7) は **読むだけ**。書き換えない。

### 3.5. Phase F 以降は selection rule 必須

UI Components / Charts / Storybook 連携 等を全網羅すると drift コストで運用が崩壊する。
plan.md §3.2 の優先順位 + 各 Phase の selection rule で「広げない」ことを明示。
条件追加で網羅範囲が広がるのは OK、条件削除で全網羅に近づくのは NG（C9 現実把握優先）。

### 3.6. content-spec-health.json は Phase H で初出

Phase H 完了前に `references/02-status/generated/content-spec-health.json` を
参照する CLAUDE.md 記述・docs:check 経路を追加してはならない。Phase H で collector
を実装してから初めて生成される。先行参照すると `docRegistryGuard` で fail する。

### 3.7. 大きな単一 Write は stream idle timeout に抵触する

archived umbrella `HANDOFF.md §3.6` の経験則を継承。**plan.md / 大きな inquiry ファイルは
skeleton → Edit の chunked 方式**で埋める（1 chunk あたり 100-150 行が目安）。
本 project の plan.md も skeleton → Edit chunked で構築されている。

### 3.8. State / Behavior / Decision の混同

`plan.md §5.1` の 3 層分離を破ると過剰期待が起こる。spec が green でも behavior が
正しいとは限らない。spec frontmatter の sync は **State Correctness** のみ保証する。
Behavior は test、Decision は ADR で別途守る。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / read order |
| **`plan.md`** | **canonical 計画 doc — Phase A〜J + Operational Control System §1〜§11** |
| `checklist.md` | Phase 0〜J completion 条件 |
| `projectization.md` | AAG-COA 判定 (Level 3 / governance-hardening) |
| `config/project.json` | project manifest（`status: "active"` / parent なし） |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/completed/architecture-debt-recovery/HANDOFF.md` | archived umbrella の完遂サマリ |
| `projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/completed/widget-registry-simplification/SUMMARY.md` | SP-B archive サマリ（Anchor Slice 選定の文脈） |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 + 全 45 spec 本文 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
