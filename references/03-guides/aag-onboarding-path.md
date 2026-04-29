# aag-onboarding-path — 初見者向け最短経路

> **目的**: AAG framework / 設計原則 / 実装規約を初めて触る AI / 人間が **必要最小限の doc を最短時間で読む** ための reading path を提供する。
> **位置づけ**: Phase Q.O-1 deliverable（onboarding cognitive load 削減）。
> **読者**: 初回 session の AI、新規 contributor、自分自身（記憶なし状態の AI）。

## 0. まず 2 分で全体像

| 順 | doc | 所要 |
|---|---|---|
| 1 | `references/AAG_OVERVIEW.md` | 2 分 — AAG が何で、どこを見ればよいか |
| 2 | `references/AAG_CRITICAL_RULES.md` | 1 分 — 絶対踏んではいけない Tier 0 rule |

## 1. タスク種別ごとの追加読書

> 以下は「やろうとしていること」別の最小追加読書。**全部読む必要はない**、該当部分のみ。

### A. コードを書こうとしている

| 順 | doc | 所要 |
|---|---|---|
| 1 | `CLAUDE.md` § 設計原則 | 5 分 — 9 カテゴリ A-I+Q の要点 |
| 2 | `references/01-principles/design-principles.md` | 必要時 — 各原則の詳細 |
| 3 | `references/03-guides/coding-conventions.md` | 必要時 — strict mode / パスエイリアス / 命名規約 |

### B. 業務値を扱おうとしている（売上 / 粗利 / 仕入 / 客数 等）

| 順 | doc | 所要 |
|---|---|---|
| 1 | `CLAUDE.md` § 正本化体系（readModels） | 1 分 — どの readModel が正本か |
| 2 | 該当する業務値の定義書 | 5-10 分 — `references/01-principles/<業務値>-definition.md` |
| 3 | `references/01-principles/canonicalization-principles.md` | 必要時 — P1-P9 の正本化原則 |

### C. AAG rule / guard / allowlist を変更しようとしている

| 順 | doc | 所要 |
|---|---|---|
| 1 | `references/01-principles/adaptive-architecture-governance.md` § 設計原則 7 / 8 | 5 分 — rule 変更プロトコル |
| 2 | `references/AAG_CRITICAL_RULES.md` | 1 分 — Tier 0 を変更しようとしていないか確認 |
| 3 | `references/03-guides/aag-change-impact-template.md`（Q.M-1 deliverable） | PR description の必須 section |
| 4 | `references/03-guides/architecture-rule-system.md` | 必要時 — rule 運用ガイド |
| 5 | `references/03-guides/allowlist-management.md` | allowlist 関連時 |

### D. guard が落ちた / CI で fail した

| 順 | doc | 所要 |
|---|---|---|
| 1 | guard の error message（`renderAagResponse()` 出力） | 自動表示 — 修理経路を読む |
| 2 | `references/03-guides/guard-failure-playbook.md`（Q.O-4 deliverable） | Repair-style 標準 |
| 3 | error message 内の `Read:` 指定 doc | guard 固有の context |

### E. project を立ち上げる / 切り替える

| 順 | doc | 所要 |
|---|---|---|
| 1 | `references/03-guides/projectization-policy.md` | 5 分 — Level 0-4 判定 + required artifacts |
| 2 | `references/03-guides/new-project-bootstrap-guide.md` | 必要時 — bootstrap 手順 |
| 3 | `references/03-guides/project-checklist-governance.md` | 必要時 — checklist 運用ルール |

### F. DuckDB クエリ / 計算エンジンを触る

| 順 | doc | 所要 |
|---|---|---|
| 1 | `references/03-guides/duckdb-architecture.md` | 5 分 — Q1-Q6 rule + Query Access |
| 2 | `references/01-principles/engine-boundary-policy.md` | 5 分 — 3 engine の境界 |
| 3 | `references/01-principles/engine-responsibility.md` | 必要時 — JS vs SQL の責務 |

## 2. 困った時の全体索引

`references/README.md` に **正本一覧 + AI 向けカテゴリ別索引** が集約されている。本 doc に該当カテゴリがなければ README で探す。

## 3. 「何でも読む」の罠

AAG / 設計原則 / 業務値定義 / project 運用 doc は合計 100+ 個ある。**全部読むのは非効率かつ不要**。

- **最低限**: § 0（AAG_OVERVIEW + AAG_CRITICAL_RULES）の 3 分
- **タスク開始時**: § 1 の該当タスク種別 1 つだけ
- **作業中**: error message が指す doc / pre-commit hook が指す obligation だけ追加で読む

これは AAG 設計原則 6（Response は薄く、必要十分にする）を doc に適用したもの。

## 4. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版（Phase Q.O-1 deliverable）。タスク種別 6 (A-F) で reading path を分割、minimal 読書時間を明示 |
