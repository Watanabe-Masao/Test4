# AAG ルール分割計画 — 設計記録

> **役割: 設計記録（分割案と判定基準の正本）**
>
> 本文書は AAG ルール分割の判定基準と分割案を記録する。
>
> **live な作業項目は本文書に書かない。**
> 実装の残作業は
> [`projects/aag-rule-splitting-execution/checklist.md`](../../projects/aag-rule-splitting-execution/checklist.md)
> を参照。

## 分割の原則

> **「違反が多いから切る」のではなく、「同じ rule の中に別問題が同居しているから切る」**

判定基準:
1. **防いでいる害が違う** → 分割
2. **直し方（migrationPath）が違う** → 分割
3. **例外理由（retentionReason）が違う** → 分割

3 つのどれもズレていなければ、rule は維持して検出精度を改善する。

---

## 現在の例外圧

| ruleId | 例外数 | 内包するガードタグ | 分割優先度 |
|--------|--------|-------------------|-----------|
| AR-G5-DOMAIN-LINES | 6 | G5 | 低（同質） |
| **AR-STRUCT-RESP-SEPARATION** | 4 | **G8** (P2/P7/P8/P10/P12/P17/P18) | **最高** |
| AR-G5-HOOK-MEMO | 3 | G5 | 低 |
| AR-G5-HOOK-STATE | 3 | G5 | 低 |
| **AR-STRUCT-CONVENTION** | 1 | **F1, F2, F3, F4, F6, F9** | **高** |
| **AR-STRUCT-CANONICALIZATION** | 0 | **G1, E3, F5, F8** | **中** |

---

## 分割候補 1: AR-STRUCT-RESP-SEPARATION（最高優先度）

### 現状

- what: 「責務分離の 7 種の数値制約を機械的に強制する」
- guardTag: G8（1 タグに 7 種のパターンが同居）
- 例外数: 4（全て permanent/module-scope let）
- 実際の検出: P2, P7, P8, P10, P12, P17, P18 の 7 種

### 問題

7 種の制約が 1 つの rule に束ねられている:

| パターン | 検出対象 | 防いでいる害 | 直し方 |
|---------|---------|-------------|--------|
| P2 | getState() | Store への直接結合 | callback props / selector |
| P7 | module-scope let | グローバル状態の散在 | const object / WeakMap |
| P8 | useMemo+useCallback 合計 | hook の責務肥大化 | sub-hook 抽出 |
| P10 | features/ の useMemo/useState | feature の複雑性 | useReducer / builder |
| P12 | domain/models/ の export 数 | モデルの責務肥大化 | ファイル分割 |
| P17 | storeIds 正規化の散在 | 正規化ロジックの重複 | 集約 |
| P18 | fallback 定数密度 | 初期値の散在 | 共通モジュール集約 |

**害が違う。直し方が違う。例外理由が違う。** → 分割すべき。

### 分割案

| 新 ruleId | 元パターン | what |
|-----------|-----------|------|
| AR-RESP-STORE-COUPLING | P2 | presentation の getState() 直接アクセス禁止 |
| AR-RESP-MODULE-STATE | P7 | module-scope let（グローバル変数）禁止 |
| AR-RESP-HOOK-COMPLEXITY | P8 | useMemo+useCallback 合計の上限 |
| AR-RESP-FEATURE-COMPLEXITY | P10 | features/ の useMemo/useState 上限 |
| AR-RESP-EXPORT-DENSITY | P12 | domain/models/ の export 数上限 |
| AR-RESP-NORMALIZATION | P17 | storeIds 正規化の散在上限 |
| AR-RESP-FALLBACK-SPREAD | P18 | fallback 定数密度の上限 |

### 効果

- 例外 4 件が **AR-RESP-MODULE-STATE に集中** していることが明確になる
- 他の 6 パターンは例外 0 → 健全であることが可視化される
- migrationPath がパターンごとに具体化できる
- Discovery Review で「どの責務分離パターンが最も弱いか」を定量評価可能

---

## 分割候補 2: AR-STRUCT-CONVENTION（高優先度）

### 現状

- what: 「バレル re-export、feature slice 依存、コンテキストデータの重複禁止」
- guardTags: F1, F2, F3, F4, F6, F9（6 タグ）
- 例外数: 1

### 問題

3 つの異なる規約が 1 rule に束ねられている:

| 規約 | 防いでいる害 | 直し方 |
|------|-------------|--------|
| バレル re-export のみ | import 解決・tree-shaking 崩壊 | バレルからロジック除去 |
| feature 間直接依存禁止 | topology 崩壊 | shared/ 経由に変更 |
| context データ重複禁止 | データ一貫性崩壊 | 正本から派生 |

### 分割案

| 新 ruleId | 元タグ | what |
|-----------|--------|------|
| AR-CONVENTION-BARREL | F1, F9 | バレルは re-export のみ。ロジック禁止 |
| AR-CONVENTION-FEATURE-BOUNDARY | F4 | feature 間の直接依存禁止 |
| AR-CONVENTION-CONTEXT-SINGLE-SOURCE | F2, F3, F6 | コンテキストデータの重複禁止 |

---

## 分割候補 3: AR-STRUCT-CANONICALIZATION（中優先度）

### 現状

- what: 「全 readModel と calculation canonical が正本化原則に従っている」
- guardTags: G1, E3, F5, F8
- 例外数: 0（現在健全）

### 問題（予防的）

4 つの異なる工程を 1 rule が要求:

| 工程 | 検証内容 |
|------|---------|
| 配置 | readModels/ に正しく配置されている |
| Zod 契約 | 入出力に Zod parse がある |
| パスガード | 旧経路の import を禁止 |
| 定義書 | references/ に定義書が存在 |

### 分割案

現在例外 0 なので **今すぐ分割する必要はない**。
ただし今後例外が増えたとき、工程単位で切る準備をしておく。

---

## 分割しない方がよいルール

| ruleId | 理由 |
|--------|------|
| AR-G5-DOMAIN-LINES (6 例外) | 全て同じ害（ファイル肥大化）、同じ直し方（分割）。例外理由も同質 |
| AR-G5-HOOK-MEMO (3 例外) | 同質。useMemo 数が多い = hook が太い。直し方は builder 抽出 |
| AR-G5-HOOK-STATE (3 例外) | 同質。useState 数が多い = 状態が散在。直し方は useReducer |
| 層境界 invariant 群 | 単機能。分割の余地なし |
| canonical path 群 | 1 正本 = 1 ルール。すでに最小単位 |

---

## 実施優先順序

| 順番 | 対象 | 効果 | 工数 |
|------|------|------|------|
| 1 | **AR-STRUCT-RESP-SEPARATION → 7 分割** | 例外圧の可視化 + migrationPath 具体化 | L |
| 2 | **AR-STRUCT-CONVENTION → 3 分割** | 規約ごとの健全性評価が可能に | M |
| 3 | AR-STRUCT-CANONICALIZATION → 準備のみ | 予防的。分割は例外発生時 | S |

---

## 分割時の注意

- **既存の guard テストは維持**。新 ruleId は同じ guard ファイル内で検出する
- **allowlist の ruleId を更新**。分割後は新 ruleId に紐づける
- **architectureRuleGuard の整合性テスト** が自動で新ルールの存在を検証する
- **AAG バージョン履歴** に分割の経緯を記録する
