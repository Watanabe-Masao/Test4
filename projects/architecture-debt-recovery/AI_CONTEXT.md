# AI_CONTEXT — architecture-debt-recovery

> 役割: project 意味空間の入口（why / scope / read order / lineage）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

アーキテクチャ負債回収（architecture-debt-recovery）

## Purpose

widget を入口として浮上した構造的課題を起点に、`domain/calculations/` 以外に埋もれた
**純粋関数の抽出**・**型の再編成**・**コンポーネント分割戦略の見直し**・
**データパイプライン設計の再考**を一体の改修 project として扱う。

inquiry（棚卸し）→ 真因分析 → 原則制定 → 計画 → 実装 の 7 Phase で進め、
**現在の実装を壊さない**前提で破壊的変更を含む大型改修を段階的に遂行する。

## Project Lineage（文脈継承）

本 project は独立した新 project だが、以下の文脈を継承する。

### Informed-by（起点となった findings）

| 先行 project | 継承する findings |
|---|---|
| `projects/completed/budget-achievement-simulator` | widget 登録システムの 2 WidgetDef 型・InsightData 結合・complexity hotspot 7 項目・ctx 非対称 |

`budget-achievement-simulator` は独立 project のまま active／completed 判断は Phase 5 で確定する（本 project の `parent` ではなく、findings の提供元）。

### Successors（本 project が spawn する可能性のある後続 project）

Phase 4 の改修計画で identify する。想定候補:
- widget 登録システム統合（WidgetDef 2 型統合 + registry 整理）
- InsightData decoupling（ctx-direct 化水平展開）
- データパイプラインの再設計
- pure 関数の抽出と `domain/calculations/` への昇格

後続 project は本 project を `parent` とするサブ project として立ち上げる（`config/project.json` に `parent: "architecture-debt-recovery"`）。

### 文脈を見失わないための規約

1. **継承**: 後続 project の `AI_CONTEXT.md` の Read Order に本ファイルを含める
2. **記録**: Phase 1 inventory / Phase 2 真因分析 / Phase 3 原則 は後続 project の正本入力となる
3. **参照固定**: 本 project が生成する `inquiry/*.md` / `references/01-principles/` 候補文書は、後続 project からリンクされる

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地・次にやること・ハマりポイント）
3. `plan.md`（不可侵原則・Phase 1-7 構造・禁止事項）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. `projects/completed/budget-achievement-simulator/HANDOFF.md`（informed-by 先の到達点）
6. 必要に応じて:
   - `references/01-principles/design-principles.md`（既存 9 カテゴリ原則）
   - `references/03-guides/new-project-bootstrap-guide.md`（後続 project の立ち上げ手順）
   - `references/03-guides/project-checklist-governance.md`（本 project 運用規約）

## Why this project exists

### 現状の symptom

- widget 登録に 2 つの `WidgetDef` 型が併存し、universal ctx と page-coupled ctx が非対称（`InsightData` 結合）
- Budget Simulator reboot で 7 件の cleanup 項目が baseline に積まれたまま（G5 超過 3 ファイル・styles 888 行・DOW 重複 5 箇所）
- registry 未登録の UI component を機械検出する仕組みがない
- `UnifiedWidgetContext` が page-local フィールド（`insightData` / `costDetailData` / `selectedResults`）を抱え、universal を名乗りつつ page-couple している
- pure 関数が hook / component 内に埋没しやすく、`domain/calculations/` に昇格していない

### 真因は複数仮説ある前提

個別 cleanup の積み上げでは**再発する**。widget 複雑化・pure 関数埋没・型非対称・data pipeline 結合は、いずれも「**機能の実装・改修・改廃を重ねるうちに負債化した**」共通の病理を持つ可能性が高い。

本 project は **病理自体を特定し、再発を防ぐ原則を制定する**ことを先に置く。個別改修は Phase 4 以降で計画的に進める。

### 独立 project として立ち上げる理由

- Budget Simulator project のスコープ内に吸収すると「widget feature の実装」と「architecture の再設計」が混じり、判断軸が歪む（project-checklist-governance §0 の原則）
- 後続の実装 project を多数 spawn することを想定しており、それらの parent となる umbrella が必要
- 破壊的変更を含むため、Phase による承認ゲートを明確にする枠組みが必要

## Scope

### 含む

- widget 登録システムの棚卸しと再設計（2 WidgetDef 型統合 / registry 正規化 / orphan UI 検出）
- `features/*/ui/` と `domain/` から pure 関数候補を抽出
- 型の再編成（`WidgetDef` / `UnifiedWidgetContext` / readModel 周辺）
- コンポーネント分割戦略の整理（Budget Simulator 7 項目を含む全体パターン）
- データパイプライン設計の再考（`InsightData` / `costDetailData` / `selectedResults` 経路）
- 破壊的変更（削除・移動・rename・型破壊）を含む実装（Phase 6）
- `budget-achievement-simulator` project の整理（吸収 vs 別扱いを Phase 5 で確定）
- 後続 project の spawn（sub-project 立ち上げ）

### 含まない

- 新機能追加（負債回収のみ）
- WASM engine の追加・削除
- DuckDB schema 変更
- 大規模パフォーマンス最適化（別 project）
- UI デザイン刷新（視覚面の変更は最小限）

## Project-Specific Constraints

- **現在の実装を壊さない** — 破壊的変更は Phase 4 計画承認 + guard test 先行 + 段階的実施を必須とする
- **Phase 1-3 はコード変更禁止** — 事実 / 分析 / 原則が混ざると判断が歪む
- **budget-achievement-simulator は Phase 5 まで触らない** — 独立 project の在職状態を保護
- **Phase 3 原則は候補提示のみ** — `references/01-principles/` への正本昇格は人間承認後
- **inquiry 成果物に recommendations を書かない** — 意見と事実の分離（症状と真因は Phase 2 以降）
- **数学的不変条件を破らない** — 破壊的変更前に該当 invariant の guard test を先に追加
- **単一真因に帰着させない** — 複数仮説を併記し、優先順位は Phase 4 で決める

## Update Points

- Phase が切り替わったら `HANDOFF.md` の「現在地」と `checklist.md` の当該 Phase を更新
- 後続 project を spawn したら `AI_CONTEXT.md` の Successors 表に追記し、後続の `config/project.json` に `parent: "architecture-debt-recovery"` を設定
- guard / allowlist を変えたら `cd app && npm run docs:generate`
- 原則候補を `references/01-principles/` 配下に置いたら `docs/contracts/principles.json` との整合を確認
- `CURRENT_PROJECT.md` の切替は Phase 5 で計画、Phase 7 で次 project に handoff する際に実施

## 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | 不可侵原則・Phase 1-7 構造・禁止事項 |
| `HANDOFF.md` | 現在地・次の作業・ハマりポイント |
| `checklist.md` | Phase 別の completion checkbox 集合 |
| `projects/completed/budget-achievement-simulator/` | informed-by 先（findings の提供元） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/new-project-bootstrap-guide.md` | 後続 sub-project 立ち上げ手順 |
| `references/01-principles/design-principles.md` | 既存 9 カテゴリ原則（Phase 3 で差分提示） |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 3 層サイクル（本 project の枠組み） |
