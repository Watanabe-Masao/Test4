# AAG_CRITICAL_RULES — Tier 0 一覧

> **目的**: 絶対に踏んではいけない最重要 rule（Tier 0）を 1 ページに集約する。
> **位置づけ**: Phase Q.O-1 + Q.O-2 deliverable（risk tiering の最重要層）。
> **schema 正本**: `app-domain/gross-profit/rule-catalog/base-rules.ts` の `tier` field（Q.O-2 で追加）。

## Tier 分類

詳細: `01-principles/aag-operational-classification.md`（既存運用区分との関係）。

| Tier | 対象 | 扱い |
|---|---|---|
| **Tier 0** | data corruption / financial correctness / layer inversion | **即 fail、例外原則禁止**。allowlist 不可 |
| Tier 1 | architecture drift / source-of-truth drift / stale docs | 原則 fail、短期 allowlist 可 |
| Tier 2 | complexity / ergonomics / migration debt | ratchet 管理 |
| Tier 3 | review-only / observation | report と review 対象 |

> **注**: `tier` field は Q.O-2 で BaseRule schema に追加される。本 doc の Tier 0 一覧は Q.O-2 で `tier: 0` として宣言される rule の **人間可読ビュー**。Q.O-2 完了後は base-rules.ts が正本となり、本 doc は派生（drift は guard で検証）。

## Tier 0 一覧（初期指定）

### 財務的正確性（financial correctness）

| Rule ID | 何を守るか | 違反時の害 |
|---|---|---|
| `AR-PATH-GROSS-PROFIT` | 粗利計算は `calculateGrossProfit` 経由のみ | 粗利計算が散在すると不変条件（売上−原価=粗利）が破壊される |
| `AR-PATH-FACTOR-DECOMPOSITION` | 要因分解は `calculateFactorDecomposition` 経由のみ | 要因分解の合計値が売上差と不一致になる（D1 不変条件違反） |

### 層境界（layer inversion）

| Rule ID | 何を守るか | 違反時の害 |
|---|---|---|
| `AR-A1-PRES-INFRA` | presentation/ → infrastructure/ の直接依存禁止 | データ取得経路が UI 直結になり、取得元切替（DuckDB ↔ ETRN fallback）が UI を壊す |
| `AR-002` | presentation/ → wasmEngine の直接 import 禁止 | engine 詳細が UI に漏れ、application 層の hook 抽象が崩れる |
| `AR-STRUCT-PRES-ISOLATION` | presentation 層は描画専用、JS/SQL 二重実装禁止 | 描画と計算が混在すると不変条件と業務意味の検証基準が混在する |

### 正本性（source-of-truth integrity）

| Rule ID | 何を守るか | 違反時の害 |
|---|---|---|
| `AR-INTEGRITY-NO-RESURRECT` | `adoption-candidates.json rejected[]` の永久不採用 primitive を再導入禁止 | 過去の判断を AI が記憶なしに上書きし、整合性 framework の意思決定 trace が壊れる |

## 拡張ポリシー

- **Tier 0 への追加**: human review 必須。理由は data corruption / financial correctness / layer inversion のいずれかに該当することを明示
- **Tier 0 からの降格**: human review 必須。降格理由（rule の意味が変わった / 別の mechanism で代替された等）を `plan.md` または `recent-changes.md` に記録
- **allowlist 申請**: 原則禁止。例外的な migration 期間中のみ許容、その場合は `expiresAt` 必須

## Tier 0 の検証方法

各 Tier 0 rule は対応 guard test で機械検証される。Tier 0 違反は **Hard Gate fail** として CI を止める。

| Rule ID | 検証 guard |
|---|---|
| `AR-PATH-GROSS-PROFIT` | `app/src/test/guards/grossProfitPathGuard.test.ts` |
| `AR-PATH-FACTOR-DECOMPOSITION` | `app/src/test/guards/factorDecompositionPathGuard.test.ts` |
| `AR-A1-PRES-INFRA` | `app/src/test/guards/layerBoundaryGuard.test.ts` |
| `AR-002` | `app/src/test/guards/layerBoundaryGuard.test.ts` |
| `AR-STRUCT-PRES-ISOLATION` | `app/src/test/guards/presentationIsolationGuard.test.ts` |
| `AR-INTEGRITY-NO-RESURRECT` | `app/src/test/guards/integrityNoResurrectGuard.test.ts` |

## 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版（Phase Q.O-1 deliverable）。初期 Tier 0 として 6 rule を指定。Q.O-2 で `tier` field schema が確定したら base-rules.ts に反映、本 doc は派生 view として運用 |
