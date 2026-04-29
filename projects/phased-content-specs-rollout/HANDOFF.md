# HANDOFF — phased-content-specs-rollout

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase A〜J 全 landed (2026-04-28、commit 5564b60)。**
status: `active` / parent: なし。後続課題（J7 path 実在 guard / reviewed 昇格 / AST 整合 / Phase G visual evidence / Promote Ceremony）と
`canonicalization-domain-consolidation` の Phase A inventory との並行が次の作業フェーズ。

### Phase A〜J 完遂サマリ (2026-04-28)

| 軸 | 達成値 |
|---|---:|
| 全 spec 数 | 89（widget 45 / RM 10 / CALC 24 / chart 5 / UIC 5）|
| Behavior Claims | **310** (各 spec 平均 3.5)|
| guard 数 | **11 active** (`contentSpec*Guard.test.ts`) |
| coverage baseline | **全 0** (J6 / canonical-registration-sync 等)|
| Evidence Level enforcement | J1〜J6 全 active で違反 0 |
| Promote Ceremony | candidate slot 二状態モデル institutionalize 済 |
| 統合 KPI | 53 KPI all OK / Hard Gate PASS |
| test 結果 | 124 file / 834 test PASS |

### canonicalization-domain-consolidation との handoff

本 project の 11 guard / `contentSpecHelpers.ts` は canonicalization plan §1.2
**#12 ペア** そのもの。canonicalization Phase B の domain primitive
(`parsing/yamlFrontmatter` / `detection/existence` / `detection/ratchet` /
`detection/temporal` / `reporting/formatViolation`) は本 project が完成させた
helper にすでに実体化済み。canonicalization Phase B は「ゼロから設計」ではなく
「Phase J 既実装の crystallize」として進む（詳細: phased plan §4 末尾 +
canonicalization plan §3.2 対応表）。

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

> **scope reduction (2026-04-29、anti-bloat self-test)**: 25 未着手 → keep 12 + defer 5 + vacuous 1 + cut 6 + human gate 1。詳細: `checklist.md` の各項目注記。Phase Q reduction と同思想を本 project にも一貫適用。
> 詳細は `plan.md` §4 末尾「Phase J 後続課題」 / `checklist.md` を参照。

### Tier 1: active 継続 (concrete value、現実装に直接価値)

1. **behavior section guard (J7 path 実在)** — claim 内 tests/guards path が実 file を指すこと
   - `app/src/test/guards/contentSpecPathExistenceGuard.test.ts` を新設
   - `contentSpecHelpers.ts` に `pathExists(repoRelPath)` を追加
   - **canonicalization-aware 設計**: 将来 `app-domain/integrity/detection/pathExistence.ts` に extract される shape で実装

2. **content graph 初版 collector** — Phase A 残課題、#3-9 の prerequisite (5 件 defer 解消)

3. **pipeline / queryHandler / projection の missingSpec=0 + sourceRef drift=0** (Phase C)

4. **CALC test 紐付け** (Phase D 残) — reviewed → tested/guarded 昇格 (CLM-001/002 等)

5. **Phase G visual evidence (chart/UIC anchor 5 件範囲内)** — KpiCard.stories から漸次拡大

6. **CI artifact 保存** (Phase I) — content-specs:impact CLI を CI integration

### Tier 2: defer (prerequisite 待ち、auto-trigger)

- 全 45 WID content graph + Promotion Gate L4 (#2 完成後に対象化)
- pipeline lineage graph + Promotion Gate L5 (#2 + Phase C 完成後)
- deprecated CALC sunsetCondition: vacuously achieved (現状 0 件、guard active)

### cut (anti-bloat self-test 結果、2026-04-29)

- 全 chart cover (58 中 5 spec で selection rule 限定、HANDOFF 不可侵原則 3)
- 全 UIC cover (26 中 5 spec、同様)
- empty/error state 別 story 管理 (schema 拡張 cost > value)
- Promotion Gate L6 (per-tag tracking、1 人 project で過剰)
- PR comment bot (CLI 実用可能、手動運用で十分)

復活 trigger: chart/UIC selection rule 突破事例、deprecated calc 出現、PR コメント運用に pain 発生時に別 minor project として再起案。

### canonicalization 連動 (本 project と独立)

- `references/03-guides/integrity-pair-inventory.md` の #12 セル更新
- `contentSpecHelpers.ts` を Phase B reference 実装として明記
- 共通 primitive 候補を inventory 化

### 旧 Phase A〜J の作業（landed、参考用）

| Phase | 範囲 | landed commit |
|---|---|---|
| A〜D | calculation 全件 + readModel + scaffold | b4e07fd 〜 5b53a8f |
| E〜I | chart / UIC / Architecture Health KPI / PR Impact Report | (Phase E〜I 完遂時) |
| J | Behavior Claims Evidence Level enforcement、Step 1〜10 完遂 | 9c01678 〜 5564b60 |

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
