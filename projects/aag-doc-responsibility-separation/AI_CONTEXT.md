# AI_CONTEXT — aag-doc-responsibility-separation

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Doc Responsibility Separation — AAG docs の正本 / audit / status / future work 分離（aag-doc-responsibility-separation）

## Purpose

AAG (Adaptive Architecture Governance) は構造としては `aag-bidirectional-integrity`
完遂までで強固になったが、AAG 関連 doc 自身に「正本 (protocol)」「履歴」「status」
「future work」が一部混在している。これは AAG 自身が掲げる 1 doc 1 responsibility と
live task 分離 (`references/03-guides/project-checklist-governance.md` §0) に反する。

本 project は AAG docs の責務再分離を行い、AAG の自己整合性 (= AAG が AAG 自身の
原則に従う) を回復する。Project E (`aag-decision-traceability`) の前処理としても意味を
持つ (audit framework が肥大化する前に責務境界を切る)。

## Why this project exists

archived `aag-bidirectional-integrity` 完遂で AAG framework MVP は揃ったが、
ドキュメント側の責務分離は完遂していない。具体的には:

- archived AAG doc 内に live future work が埋め込まれている (Project E candidate 等)
- `references/02-status/ar-rule-audit.md` 内で protocol (永続) と batch 実施結果 / future
  task articulation が混在
- `aag/README.md` / `aag/layer-map.md` 内で予定表現が残り、実績に同期していない
- `aag/meta.md` が Layer 0/1 charter なのに audit framework / 達成判定 / orphan baseline
  まで保持し、責務が肥大化している

これらは個別 fix では drift し続けるため、独立 project として umbrella で扱う。

## Scope

含む:

- AAG 関連 doc の責務 inventory (Phase 1)
- archived AAG doc から Project E candidate を切り出す rescue (Phase 2)
- `ar-rule-audit.md` の protocol / status 分離 (Phase 3)
- `aag/README.md` / `aag/layer-map.md` の予定表現 → 実績表現 refresh (Phase 4)
- `aag/meta.md` → `aag/audit.md` 分割判断 (Phase 5、判断のみ、実施は別 project)

含まない:

- 実装層 (app/src/) の構造変更 — 本 project は doc 責務分離のみ
- `meta.md` → `audit.md` の実分割 — Phase 5 で判断のみ、実施は escalate or 別 project
- AAG framework 自体の architecture 変更 — `aag-bidirectional-integrity` 完遂時点の
  framework を維持し、その doc 配置のみを是正

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 / 次にやること / Phase 1 inventory 結果）
3. `plan.md`（5 Phase 構造 + 不可侵原則）
4. `checklist.md`（completion 判定の入力）
5. `projectization.md`（Level 2 / governance-hardening の根拠）
6. `references/03-guides/project-checklist-governance.md`（本 project の運用ルール）
7. `references/01-principles/aag/README.md` / `layer-map.md`（Phase 4 refresh 対象）
8. `references/02-status/ar-rule-audit.md`（Phase 3 split 対象）
9. `projects/aag-decision-traceability/`（Phase 2 で spawn 済の sibling project）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール (AAG Layer 4A) |
| `references/03-guides/projectization-policy.md` | Level 2 設定の根拠 |
| `projects/aag-decision-traceability/` | Phase 2 で spawn 済の sibling project |
| `references/01-principles/aag/meta.md` | Phase 5 split 判断対象 |
| `references/01-principles/aag/README.md` | Phase 4 refresh 対象 |
| `references/01-principles/aag/layer-map.md` | Phase 4 refresh 対象 |
| `references/02-status/ar-rule-audit.md` | Phase 3 split 対象 |
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | 完遂済 parent framework (本 project が後始末を担当) |
