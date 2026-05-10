# inquiry/02 — Existing YAML Inventory

> **役割**: Phase 0 で既存 YAML 資産を 5 分類（declaration / inventory / generated-input / legacy / unknown）で articulate し、本 program の新 YAML 用法（authoring source）との関係を確定する。
>
> **scope**: repo 全体の `.yaml` / `.yml` 拡張子ファイルを listing し、各 file の意味と位置付けを記録する。
>
> **規約**: ADR-SCP-001（YAML authoring / JSON machine truth）に従う。本 program の新 YAML は **authoring source** 分類で追加される。

## 1. 5 分類定義

| 分類 | 性質 | 例 |
|---|---|---|
| **declaration** | 人間/AI が編集する宣言ソース、JSON への正規化を経て machine truth になる | 本 program の `docs/contracts/src/*.yaml`（Phase 1+ で追加） |
| **inventory** | 棚卸 / catalog 用途、structured list を YAML で管理 | `references/04-tracking/test-taxonomy-inventory.yaml` 等（既存） |
| **generated-input** | 外部 tool / CI の入力として YAML が要求される（人間/AI が直接編集しない） | `.github/workflows/*.yml`（GitHub Actions が要求） |
| **legacy** | 過去の deprecated YAML、撤去候補 | （現時点で検出されていない） |
| **unknown** | 分類保留、Phase 0 で確定 | （Phase 0 inquiry で 0 件にする） |

## 2. 既存 YAML 4 件の分類（Phase 0 で確定）

### 2.1. `.coderabbit.yaml`

- **path**: `/.coderabbit.yaml`
- **role**: CodeRabbit AI review tool の設定ファイル
- **分類**: `generated-input`（外部 tool の入力）
- **rationale**: CodeRabbit が YAML を要求し、人間が編集するが、本 program の AAG governance 対象外（外部 tool 設定）
- **本 program での扱い**: touch しない。`docs/contracts/src/governance/artifact-coverage.yaml` の `external` カテゴリで articulate（Phase 9）。

### 2.2. `references/04-tracking/test-taxonomy-inventory.yaml`

- **path**: `references/04-tracking/test-taxonomy-inventory.yaml`
- **role**: テスト軸 taxonomy の inventory（v2 T:kind 15 件の棚卸）
- **分類**: `inventory`
- **rationale**: 既存 taxonomy-v2 project で institute された structured list。machine truth は `app/src/test/testTaxonomyRegistryV2.ts`（TS 定数）であり、YAML は人間/AI 向け参照ビュー
- **本 program での扱い**: touch しない。Document Contract で `inventory-doc` kind として articulate（Phase 4）。

### 2.3. `references/04-tracking/responsibility-taxonomy-inventory.yaml`

- **path**: `references/04-tracking/responsibility-taxonomy-inventory.yaml`
- **role**: 責務軸 taxonomy の inventory（v2 R:tag 10 件の棚卸）
- **分類**: `inventory`
- **rationale**: 上記 2.2 と同等、責務軸版
- **本 program での扱い**: touch しない。Document Contract で `inventory-doc` kind として articulate（Phase 4）。

### 2.4. `references/04-tracking/semantic-inventory.yaml`

- **path**: `references/04-tracking/semantic-inventory.yaml`
- **role**: semantic-classification-policy（business-authoritative / analytic-authoritative / candidate-authoritative）の inventory
- **分類**: `inventory`
- **rationale**: 上記 2.2 / 2.3 と同等、semantic 軸版
- **本 program での扱い**: touch しない。Document Contract で `inventory-doc` kind として articulate（Phase 4）。

### 2.5. `.github/workflows/*.yml`（複数件）

- **path**: `.github/workflows/*.yml`
- **role**: GitHub Actions CI workflow
- **分類**: `generated-input`
- **rationale**: GitHub Actions が YAML を要求、人間が編集するが、本 program の Document Contract 対象外（CI infrastructure）
- **本 program での扱い**: touch しない。Phase 10 Runner Parity Contract で「pre-push / CI / npm scripts の必須 step drift 検出」の対象として参照のみ（YAML 構造には介入しない）。

## 3. 本 program の新 YAML（authoring source 分類）

Phase 1 から Phase 10 にかけて landing する `docs/contracts/src/*.yaml` はすべて **`declaration` 分類**:

| YAML | 分類 | landing phase |
|---|---|---|
| `docs/contracts/src/repo/tree-contracts.yaml` | declaration | Phase 3 |
| `docs/contracts/src/docs/doc-kind-registry.yaml` | declaration | Phase 4 |
| `docs/contracts/src/docs/document-topology.yaml` | declaration | Phase 4 |
| `docs/contracts/src/docs/document-contracts.yaml` | declaration | Phase 5 |
| `docs/contracts/src/docs/document-reading-decisions.yaml` | declaration（human/AI authored Reading Pass result） | Phase 2.5 |
| `docs/contracts/src/docs/temporal-scope-policy.yaml` | declaration | Phase 4 |
| `docs/contracts/src/docs/required-docs-matrix.yaml` | declaration | Phase 7 |
| `docs/contracts/src/docs/ai-doc-template-rules.yaml` | declaration | Phase 6 |
| `docs/contracts/src/governance/artifact-coverage.yaml` | declaration | Phase 9 |
| `docs/contracts/src/governance/generated-artifacts.yaml` | declaration | Phase 9 |
| `docs/contracts/src/governance/obligations.yaml` | declaration | Phase 8a |
| `docs/contracts/src/governance/required-reads.yaml` | declaration | Phase 8a |
| `docs/contracts/src/governance/runner-parity.yaml` | declaration | Phase 10 |
| `docs/contracts/src/governance/exception-policy.yaml` | declaration | Phase 9 |

これらはすべて normalize → `docs/contracts/generated/*.generated.json` を経由し、detector / CI / AAG CLI / architecture-health の入力になる。

## 4. 整合性確認項目（Phase 0 で完了）

- [ ] 既存 YAML 4 件（+ workflows）の分類が確定し、本 program で touch しないことが articulate される
- [ ] reposteward 不可侵原則 1（YAML 採用禁止）の narrow scope と本 program の `declaration` 分類が衝突しない（ADR-SCP-001 で再定義済）
- [ ] 既存 inventory YAML 3 件は Document Contract で `inventory-doc` kind として Phase 4 で articulate 可能
- [ ] `docs/contracts/generated/yaml-inventory.generated.json`（Phase 2 で生成）が上記 4 件 + 本 program 新規 YAML を 5 分類で正しく articulate する

## 5. open questions

- Q1: 本 program 新 YAML の数（14 件規模）が増えすぎないか? → 暫定: Phase 単位で landing を分散することで 1 PR あたり 1〜3 件に抑える
- Q2: 既存 inventory YAML（taxonomy / semantic）と本 program declaration YAML を同一 schema kind で扱うべきか? → 暫定: 分けて扱う。`inventory-doc` は人間/AI が読む参照 view、`declaration-doc` は machine truth 生成元
- Q3: `.coderabbit.yaml` のような外部 tool YAML を artifact coverage の `external` で articulate する際、その更新責任は誰か? → 暫定: artifact coverage の `external` entry に `owner` field 必須（Phase 9 で確定）
