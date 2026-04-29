# sub-project-map — integrity-framework-evolution

> 役割: Level 4 (Umbrella) project の sub-project 一覧 + 依存関係を整理。
>
> 規約: `references/03-guides/projectization-policy.md` §3 Level 4。

## 1. sub-project 構造

本 project は **3 phase 内 single-project umbrella** として運用する。
sub-project (子 project) を切り出さず、Phase 単位で進行する。

| Phase | scope | sub-project 化判断 |
|---|---|---|
| Phase Q: AAG Maturation | 2 軸 14 要素 (operational Q.O-1〜Q.O-6 + meta-governance Q.M-1〜Q.M-8) | 単 project 内 phase として運用 (両 review 統合の Meta-AAG layer、Phase R/H/I の prerequisite) |
| Phase R: Framework Reset | 6 reform (R-①〜R-⑥) | 単 project 内 phase として運用 (6 reform は同時成立 design、Phase Q deliverable で protect される) |
| Phase H: Horizontal Expansion | 3 候補 (wasm + charts + hooks) | 単 project 内 phase として運用 (前駆 project から継承した COVERAGE_MAP 拡張、Phase R framework の最初の正規利用) |
| Phase I: Institutionalization | §P8/§P9 3-zone 化 + archive transition + Phase Q deliverable の制度化 | 単 project 内 phase として運用 |

## 2. 親 project / 依存元

- **前駆 project**: `projects/canonicalization-domain-consolidation/`
  - 状態: Phase A〜I 完遂、final review pending
  - 本 project の dependsOn (config/project.json)
  - 本 project の Phase R は前駆 project の Phase A〜I 成果を input とする
  - 本 project の Phase I で前駆 project の archive transition を triggers

## 3. 並行 active project

- **`pure-calculation-reorg`** (CURRENT_PROJECT.md = active overlay)
  - 本 project は active overlay にならない (人間判断、不可侵原則 5)
  - 本 project の Phase R-③ で `calculationCanonRegistry` を 3-zone 化する場合は協調必要

- **`phased-content-specs-rollout`**
  - Phase A〜J 完遂 (前駆 project の reference 実装供給元として機能完了)
  - 本 project に直接の依存無し

## 4. 後続 project (将来 handoff 先)

- **第 5 の柱: Project Lifecycle Governance** (未起案)
  - 本 project の Phase I で handoff doc を整備する対象
  - 13 dimension review の deferred 項目 (PM / PP dimension の大半 / リファクタリング audit / KPI failHint 等) を扱う
  - 本 project が完了次第、後続 project を立ち上げる候補

## 5. 関連実装

| 実装 | 担当 phase |
|---|---|
| `app-domain/integrity/types.ts` schema 拡張 | Phase R-① |
| `adoption-candidates.json` archive 統一 schema | Phase R-② |
| §P8/§P9 zone tag 追加 | Phase R-③ |
| `APP_DOMAIN_INDEX.md` template 統一 | Phase R-④ |
| Decision Artifact PR template + guard | Phase R-⑤ |
| Dogfooding refactor (#14 pair / coverage guard) | Phase R-⑥ |
| wasm + charts + hooks の registry+guard | Phase H |
| `canonicalization-checklist.md` 3-zone 再構造化 | Phase I |
| 前駆 project archive transition | Phase I |

## 6. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。Phase 0 bootstrap で landing。本 project は子 project を切り出さない umbrella project として運用。Phase 単位で進行 |
