# AAG_OVERVIEW — Adaptive Architecture Governance 一枚サマリ

> **目的**: AAG の全体像と「困った時に見る場所」を 1 ページで提供する。
> **正本**: `references/99-archive/adaptive-architecture-governance.md`（本 doc は索引、思想の正本ではない）。
> **位置づけ**: Phase Q.O-1 deliverable（onboarding cognitive load 削減）。

## AAG とは

**Adaptive Architecture Governance** は本 repo のアーキテクチャ品質を **機械的に保証し継続的に進化させる** 統合ガバナンスシステム。

- **守る対象**: コードではなく **判断基準**（rule の `what` / `why` / `decisionCriteria`）
- **検証方法**: 違反時に統一 response（`renderAagResponse()`）を返し、修理経路を提示する
- **進化方法**: ratchet-down（baseline は下がる一方）+ Discovery Review（user 判断）

## 4 layer model（North Star）

```
Layer 1: AAG          → product を守る（rule / guard / KPI）
Layer 2: Meta-AAG     → AAG を守る（Phase Q deliverable）
Layer 3: Health       → 両 layer を validate（architecture-health.json）
Layer 4: Human review → irreversible transition を制御（archive / promotion / constitutional change）
```

詳細: `01-principles/aag-four-layer-architecture.md`

## いつ何を見るか

| 状況 | 最初に見る doc |
|---|---|
| AAG が何をしているか知りたい | 本 doc（AAG_OVERVIEW.md）|
| 絶対に踏んではいけない rule を知りたい | `AAG_CRITICAL_RULES.md`（Tier 0 一覧）|
| 初見で AAG を学ぶ最短経路 | `03-guides/aag-onboarding-path.md` |
| AAG を変更する PR を出す | `03-guides/aag-change-impact-template.md` + `01-principles/adaptive-architecture-governance.md` |
| guard が落ちた | guard の error message → `03-guides/guard-failure-playbook.md`（Q.O-4 deliverable）|
| 設計原則の正本 | `01-principles/design-principles.md` |
| rule 一覧と運用区分 | `01-principles/aag-operational-classification.md` |
| 4 層詳細 (Phase 5.2 archived、新 doc: aag/architecture.md §4.2) | `99-archive/aag-four-layer-architecture.md` |
| ルール分割原則 (Phase 5.6 archived、実行記録: projects/completed/aag-rule-splitting-execution/) | `99-archive/aag-rule-splitting-plan.md` |
| Architecture Rule の運用ガイド | `03-guides/architecture-rule-system.md` |
| 許可リスト管理 | `03-guides/allowlist-management.md` |
| Discovery Review チェックリスト | `03-guides/discovery-review-checklist.md` |

## AAG の構成要素

| 要素 | 責務 | 場所 |
|---|---|---|
| **Architecture Rule** | rule 定義（`what` / `why` / `fixNow` / `slice`）| `app-domain/gross-profit/rule-catalog/base-rules.ts`（物理正本）|
| **Guard Test** | rule の機械的検出 | `app/src/test/guards/` |
| **Allowlist** | 例外管理（lifecycle + retentionReason）| `app/src/test/allowlists/` |
| **Health KPI** | ダッシュボード + Hard Gate | `tools/architecture-health/` |
| **Obligation Map** | パス変更 → doc 更新義務 | `tools/architecture-health/src/collectors/obligation-collector.ts` |
| **Pre-commit Hook** | 義務違反の事前検出 + 自動再生成 | `tools/git-hooks/pre-commit` |
| **Ratchet-down** | 改善の不可逆化 | `tools/architecture-health/src/health-rules.ts` の target |
| **AagResponse** | 統一違反 response | `app/src/test/architectureRules/aag-response.ts`（経由）|

## 設計原則（要約）

詳細: `01-principles/adaptive-architecture-governance.md §設計原則`

1. **rule は仮説である** — 検証され、棄却されうる
2. **Principles を正本にし、Detection は交換可能にする**
3. **改善は不可逆にする**（ratchet-down）
4. **回避が生まれたら rule を疑う**
5. **block するだけでなく解決する**（pre-commit 自動修復）
6. **Response は薄く、必要十分にする**
7. **rule 自身が rule の品質基準を満たす**（dead code 禁止 / DRY / why 必須）
8. **rule はuser・AI 間のインターフェースである**（変更には説明義務）

## AAG の状態（自動生成）

現在の状態は `02-status/generated/architecture-health.md` を参照。

| 項目 | 値（最新生成時点）|
|---|---|
| 総ルール数 | 163 |
| Hard Gate | PASS |
| Total KPIs | 57 / OK 57 / WARN 0 / FAIL 0 |

> 値は `references/04-tracking/generated/architecture-health.json` が正本。本 doc には書き込まない（drift 防止、第 9 原則）。

## 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版（Phase Q.O-1 deliverable）。AAG の入口 doc として整備、cognitive load 削減 |
