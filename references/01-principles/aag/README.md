# AAG (Adaptive Architecture Governance) — `aag/` ディレクトリ index

> **役割**: AAG 関連 doc 群の単一エントリ index。CLAUDE.md AAG セクションからの 1 link entry。
>
> **位置付け**: AAG architecture pattern の 5 層 × 5 縦スライス matrix における各層の正本 doc が本ディレクトリに集約される。新規書き起こし → 旧 doc 退役の段階パスで `references/01-principles/` flat 構造から階層化された (project: `aag-bidirectional-integrity`、Phase 1〜10)。

## AAG Meta (Layer 0 + 1: 目的 + 要件)

| doc | 役割 | 状態 |
|---|---|---|
| [`meta.md`](./meta.md) | **AAG Meta charter** — AAG が満たすべき要件 (目的 / 不変条件 / 禁則) を articulate する単一エントリ doc。要件定義 + audit framework + AR-rule binding hub の 3 機能融合 mechanism doc | landing (Phase 1) |

## AAG Core (Layer 2 + 3: 設計 + 実装)

> Project A (`aag-core-doc-refactor`) Phase 1 で 6 doc を新規 Create 済。Phase 2 で旧 doc から内容書き起こし、Phase 5 で旧 doc archive 移管 (inbound 0 機械検証 + §1.5 archive 前 mapping 義務 PASS 後)。

| doc | 役割 | 状態 |
|---|---|---|
| [`strategy.md`](./strategy.md) | 戦略マスター + 文化論 + 意図的に残す弱さ (旧 `adaptive-architecture-governance.md` core を Split + Rewrite) | landing (Project A Phase 1) |
| [`architecture.md`](./architecture.md) | 5 層構造定義 + 旧 4 層 → 新 5 層 mapping (旧 `aag-5-constitution.md` を Rewrite + Relocate + Rename) | landing (Project A Phase 1) |
| [`evolution.md`](./evolution.md) | 進化動学 = Discovery / Accumulation / Evaluation (旧 `adaptive-governance-evolution.md` を Rewrite + Relocate + Rename) | landing (Project A Phase 1) |
| [`operational-classification.md`](./operational-classification.md) | now / debt / review 運用区分 (旧 `aag-operational-classification.md` を Rewrite + Relocate) | landing (Project A Phase 1) |
| [`source-of-truth.md`](./source-of-truth.md) | 正本 / 派生物 / 運用物 ポリシー (旧 `aag-5-source-of-truth-policy.md` を Rewrite + Relocate + Rename) | landing (Project A Phase 1) |
| [`layer-map.md`](./layer-map.md) | ファイルの 5 層マッピング (旧 `references/99-archive/aag-5-layer-map.md` を Rewrite + Relocate + Rename、Project A Phase 1 で landed、Phase 5.1 で旧 doc archive 移管済) | landing (Project A Phase 1) |
| `display-rule-registry.md` | DFR-NNN registry (Project C で新規 Create、双方向 integrity の最初の concrete instance) | Project C 着手後 |

## AAG Audit (Layer 4: 検証 = 外部監査)

Layer 4 検証は本 README に独立 doc を持たず、`meta.md §3 AAG Core 構成要素 mapping` 内に audit framework として articulate される (§8.10 判断 = A)。5 sub-audit に細分:

- 4.1 境界監査 (Boundary Audit)
- 4.2 方向監査 (Direction Audit) ← Phase 8 MVP
- 4.3 波及監査 (Impact Audit)
- 4.4 完備性監査 (Completeness Audit) ← Phase 8 MVP
- 4.5 機能性監査 (Functional Audit)

initial 5 set / extensible (Phase 3 audit で 4.6〜4.9 の collapse 可否判定)。

## 旧 AAG doc (Phase 5 archive 候補)

旧 `references/01-principles/` flat 構造に landing している以下の doc は、Phase 5 で archive 移管予定 (`projects/completed/aag-bidirectional-integrity/legacy-retirement.md` 参照):

| 旧 path | 移管先 (Phase 4 で landing) |
|---|---|
| `adaptive-architecture-governance.md` | Split → `aag/strategy.md` + per-doc バージョン履歴 + 旧 4 層は archive |
| `aag-5-constitution.md` | `aag/architecture.md` + `meta.md` §2.2 (非目的) |
| `references/99-archive/aag-5-layer-map.md` (Phase 5.1 で archive 移管済) | `aag/layer-map.md` |
| `aag-5-source-of-truth-policy.md` | `aag/source-of-truth.md` |
| `aag-four-layer-architecture.md` | **即 archive** (旧 4 層、新 4 層で superseded 済) |
| `aag-operational-classification.md` | `aag/operational-classification.md` |
| `aag-rule-splitting-plan.md` | **即 archive** (completed project execution 記録) |
| `adaptive-governance-evolution.md` | `aag/evolution.md` |

## 関連 doc

| パス | 役割 |
|---|---|
| `references/03-guides/deferred-decision-pattern.md` | 途中判断制度 (AAG 全 project 再利用可能 framework、本 project が最初の application instance) |
| `references/03-guides/project-checklist-governance.md` | project lifecycle 規約 (Layer 4A System Operations) |
| `references/03-guides/projectization-policy.md` | AAG-COA Projectization Policy (立ち上げ前の入口判定) |
| `projects/completed/aag-bidirectional-integrity/AI_CONTEXT.md` | 本 ディレクトリを landing する project の文脈 |
| `projects/completed/aag-bidirectional-integrity/plan.md` | canonical 計画 doc (Phase 1〜10 + 不可侵原則 + §8 確認・調査事項) |
