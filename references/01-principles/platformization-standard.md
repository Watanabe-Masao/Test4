# Platformization Standard

> 役割: 本 repo の全 subsystem が **同じ粒度 / 同じ記述フレーム** で articulate されるための共通テンプレート。
>
> **進捗は非同期**。粒度を揃え、進度は subsystem ごとに独立。
>
> AAG はこの Standard の **Pilot Application**: `projects/aag-platformization/`。

## §1 Why

各 subsystem が個別構造を発明すると以下が起きる:

- 正本 (Authority) が曖昧になり二重正本が生まれる
- runtime merge と build artifact の境界が曖昧で再計算が重複
- helper に意味が閉じ、contract が独立しないため言語非依存の消費が不可能
- merge policy が comment と挙動で乖離 (例: 既存 `merged.ts` / `defaults.ts` / `execution-overlay.ts` の comment 揺れ)
- 移行が「再設計」になり「実行基盤置換」に縮約できない

横展開すべきは **結論 (= Go 化 / JSON 化)** ではなく **記述フレーム (= 8 軸)** である。

## §2 8 軸 subsystem template

全 subsystem は以下 8 軸を articulate する。

### A1. Authority — 何が正本か

| field | 説明 |
|---|---|
| concept | 命名された要素 (rule / type / config / contract 等) |
| canonical_source | 1 次正本のパス |
| allowed_consumers | 直接 read してよい場所 |
| forbidden_consumers | 直接 read を禁ずる場所 (= facade 経由必須) |

### A2. Derivation — runtime 合成 vs build artifact

| field | 説明 |
|---|---|
| derived_object | 派生物 |
| source_inputs | 入力 (canonical) |
| current_derivation | runtime / build / hand-maintained |
| target_derivation | runtime / build (hand 撤廃) |
| artifact_path | build の場合の出力 path |
| merge_policy | 合成規則 (defaults 補完 / overlay 必須 / 等)、comment と挙動を一致させる |

### A3. Contract — helper から独立した consumption interface

| field | 説明 |
|---|---|
| contract_id | 名前 |
| kind | response / detector / event / config / 等 |
| source_of_truth | schema / TS interface / 等 (1 次正本) |
| current_runtime_dependency | 現状で contract を consume するために必要な runtime |
| target_runtime_dependency | 目標 (言語非依存) |

### A4. Binding — 具体名 / 具体経路を閉じ込める層

binding は **具体** (paths / imports / codeSignals / example) のみを持ち、**意味** (what / why / decisionCriteria / fixNow / migrationRecipe) を持たない。境界は guard で機械保証する。

### A5. Generated — 機械派生 (人手で持たない)

- merged artifact
- health metrics
- traceability index
- response template
- coverage / drift report

generated は **canonical → generator → output** の一方向。手編集禁止。

### A6. Facade — 後方互換のための薄い層

facade は consumer が変わらないことを保証するためだけに存在し、**意味 / merge / policy を持たない**。

### A7. Policy — 変更統制

| field | 説明 |
|---|---|
| change_type | schema 変更 / merge policy 変更 / contract 変更 / 等 |
| schema_versioning_required | Y/N |
| golden_test_required | Y/N |
| compatibility_test_required | Y/N |
| human_approval_required | Y/N |
| migration_note_required | Y/N |

### A8. Operating Gate — CI / test / guard / approval

各 subsystem に対する gate を articulate。例: 「この層の変更は schema version 必須」「この変更は golden test 必須」。

## §3 Repo-wide tables (8 軸 filling から派生)

| table | 内容 |
|---|---|
| **System Inventory** | subsystem 一覧 (id / owner / layer / 該当 feature / 現在 stage / 目標 stage) |
| **Authority Table** | concept → canonical_source の cross-subsystem 集約 |
| **Derivation Table** | derived → source + target derivation の cross-subsystem 集約 |
| **Contract Registry** | contract → schema + dependency の cross-subsystem 集約 |
| **Policy Matrix** | change_type → gates の cross-subsystem 集約 |

各 table は **subsystem 8 軸 articulation の集約** であり、独立 articulate ではない (= source of truth = subsystem 側)。

## §4 採用戦略

- **同じ粒度** — 全 subsystem が 8 軸を articulate する義務
- **非同期進度** — 全 subsystem が同時に同じ移行 stage に到達する必要はない
- **Pilot First** — AAG (`aag/core/` + `app/src/test/architectureRules/`) が Pilot
- **横展開** — Pilot の articulation 形式を docs / App Profile / health / report 系へ asynchronous に展開

## §5 critical constraints

1. **全部を JSON 化しない** — authoring code が canonical で良い場所は維持 (例: `base-rules.ts` 10,805 行の rich TS)
2. **facade は権限を持たせない** — `architectureRules.ts` のような facade は維持、ただし merge / policy / 意味は持たせない
3. **merge policy を曖昧にしない** — 各 subsystem に merge policy を A2 で明示、comment と挙動を一致させる
4. **generated は派生に閉じる** — canonical 側に逆流させない
5. **新概念を追加しない** — 既存 articulate の枠で gap を埋める (`references/01-principles/aag/strategy.md` §1.1「正本を増やさない」)

## §6 Pilot 実装条件 (AAG の場合)

AAG が Pilot として完了するための条件 = `projects/aag-platformization/plan.md` §3 の Go 実装条件 C1-C4:

| condition | 8 軸 mapping |
|---|---|
| C1 merge policy 一本化 | A2 (Derivation) の merge_policy 明示 |
| C2 merged artifact 生成 | A2 (Derivation) の target_derivation = build + A5 (Generated) artifact landing |
| C3 contract independence | A3 (Contract) の target_runtime_dependency = 言語非依存 |
| C4 RuleBinding 境界 guard | A4 (Binding) の境界 + A8 (Gate) の guard active |

C1-C4 全 met → AAG が Pilot として完成、Go 実装条件成立、横展開の規範系が確立。

## §7 関連

| パス | 役割 |
|---|---|
| `projects/aag-platformization/` | Pilot Application |
| `references/01-principles/aag/source-of-truth.md` | AAG の A1 Authority articulate (Pilot example) |
| `references/01-principles/aag/architecture.md` | AAG の Layer 構造 (5 layer drill-down) |
| `aag/core/principles/core-boundary-policy.md` | Core / App Domain / Project Overlay の boundary 原則 (8 軸 A1 / A4 / A6 適用) |
| `references/01-principles/aag/operational-classification.md` | AAG の A7 Policy + A8 Gate articulate |

## §8 status

- 初版 articulate: 2026-05-01 (本 commit)
- Pilot landing 進行中: AAG (`projects/aag-platformization/`)
- 横展開未着手 — 各 subsystem の 8 軸 filling は asynchronous で進める
