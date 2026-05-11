# plan — aag-coverage-rule-expansion

> 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= Sub-1)
> 親 program: `projects/completed/aag-structural-control-plane/` (= Wave 3 / Phase 9 で
> artifact-coverage advisory checker articulate、baseline=86.2% unmanaged)

## 不可侵原則

1. **新 category / 新 schema / 新 generator は追加しない** — Sub-1 scope は coverage **rule
   content** の拡張のみ。schema は aag-scp Wave 3 で articulate 済 (= 6 category /
   tools/governance/build-artifact-coverage.mjs)。
2. **advisory のままに保つ** — coverage checker の hard gate 昇格は Sub-2 + Sub-4 系統 (= guard
   articulate + maturity progression) を経る。Sub-1 で advisory → hard fail に直接昇格させない。
3. **既存 17 rules は壊さない** — append のみ。既存 rule 削除 / order 変更 / category 変更は
   禁止 (= regression risk + aag-scp Wave 3 baseline 整合)。

## Phase 構造

### Phase 1: zone inventory + rule design

artifact-coverage advisory checker (= aag-scp Wave 3 deliverable) が articulate した unmanaged
3193 件 (= 86.2%) を zone 単位で分類:
- app/ 配下 (= source code + tests + tooling + fixtures)
- references/ 配下 (= docs + archive + generated)
- wasm/ 配下 (= Rust crates)
- aag-engine/ 配下 (= AAG framework runtime)
- tools/ 配下 (= governance + architecture-health scripts)
- roles/ 配下 (= ROLE.md + SKILL.md + scope.json)
- 残: fixtures / projects / scripts / 等

各 zone に対し rule を articulate (= path pattern + category + rationale + articulate 入口)。

### Phase 2: rule append + generator 検証

`docs/contracts/src/governance/artifact-coverage.yaml` に新 rules append。
`tools/governance/build-artifact-coverage.mjs` 再実行で coverage reduction 検証。
目標 = Wave 3 で articulate された target ~50% を超える reduction。

### Phase 3: ratchet-down baseline 確立

最終 reduction 達成後の unmanaged count を **baseline** として固定 (= 増加禁止)。
新 file は明示的 categorize 必須 (= advisory checker が新規 unmanaged を warning emit)。

## やってはいけないこと

- 即 hard gate 化 → Sub-2/Sub-4 経由が articulate 済 (= AAG-SCP-DOC-LEARNING-002 整合)
- 既存 17 rules の variant 化 → schema 整合性 risk
- 新 category articulate (例: 'documentation') → schema 変更 = Sub scope 外
- rule rationale 省略 → 「なぜ declared/external/ignored か」articulate が将来の audit 入口

## 関連実装

| パス | 役割 |
|---|---|
| `docs/contracts/src/governance/artifact-coverage.yaml` | rule 物理正本 (= 17 → 84 rules) |
| `docs/contracts/aag/artifact-coverage.schema.json` | rule schema (= 不可侵、aag-scp Wave 3 articulate 済) |
| `tools/governance/build-artifact-coverage.mjs` | generator (= rule → coverage stats) |
| `tools/governance/check-coverage.mjs` | advisory checker (= unmanaged 検出 + warning emit) |
| `references/04-tracking/generated/artifact-coverage.generated.md` | generated report |
