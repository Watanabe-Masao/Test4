# AAG 4 層アーキテクチャ

## 概要

AAG 自体をプロダクトコードと同じ 4 層で設計する。

```
Presentation（入口）→ Application（判断）→ Domain（思想）← Infrastructure（検出）
```

思想は Domain に置く。検出手段は Infrastructure に閉じる。
AAG の入口は Presentation に置く。

## 層の定義と現在のファイルマッピング

### Domain — 思想

> 「何を守りたいか」「なぜ守るか」「どんな害を防ぐか」

AAG の意味そのものを置く層。変更頻度が最も低い。

| ファイル | 内容 |
|---------|------|
| `references/01-principles/adaptive-architecture-governance.md` | AAG 正本 |
| `references/01-principles/adaptive-governance-evolution.md` | 進化の設計（3層サイクル） |
| `references/01-principles/aag-operational-classification.md` | 運用区分表（即修正/構造負債/観測） |
| `references/01-principles/aag-rule-splitting-plan.md` | ルール分割計画 |
| Architecture Rule の `what` / `why` / `protectedHarm` / `sunsetCondition` | ルールの意味 |
| `references/01-principles/design-principles.md` | 設計原則 A-H+Q |
| Guard tag の意味定義（`guardTagRegistry.ts`） | タグの意味 |

### Application — 判断

> 「この状況で何をすべきかに変換する」

Domain の思想を、具体的な判断・運用に変換する層。

| ファイル / フィールド | 内容 |
|---------|------|
| Architecture Rule の `migrationPath` | 修正手順 |
| Architecture Rule の `decisionCriteria` | 例外判断基準 |
| Architecture Rule の `relationships` | ルール間の因果 |
| Architecture Rule の `fixNow` | Fix Now / Debt / Review 分類 |
| Allowlist の `lifecycle` / `retentionReason` / `removalCondition` | 例外の管理判断 |
| `obligation-collector.ts` の判定ロジック | 義務の判定 |
| `health-rules.ts` の評価基準 | KPI の閾値判断 |

### Infrastructure — 検出

> 「どうやって観測するか」

検出手段。改善・交換可能。思想をここに埋めない。

| ファイル | 内容 |
|---------|------|
| `app/src/test/guards/*.test.ts` (39+) | ルールの機械的検出 |
| `tools/architecture-health/src/collectors/` | KPI 収集 |
| `tools/architecture-health/src/main.ts` | health 評価パイプライン |
| `tools/git-hooks/pre-commit` | 事前検出 + 自動修復 |
| `app/src/test/audits/` | アーキテクチャ監査 |
| Allowlist ファイル群 | 例外の実装管理 |

### Presentation — 入口

> 「違反時に必要最小限の判断材料を返す」

AAG の正式入口。違反時に初めて出会う UI。

| ファイル | 内容 |
|---------|------|
| `architectureRules.ts` の `formatViolationMessage()` | 標準違反レスポンス |
| `tools/architecture-health/src/renderers/pr-comment-renderer.ts` | PR コメント |
| `references/02-status/generated/architecture-health-certificate.md` | Health 証明書 |
| `references/02-status/generated/architecture-health.md` | Health レポート |
| pre-commit hook の表示メッセージ | コミット時フィードバック |

## 4 層の原則

1. **Domain は安定する。** what/why は変わりにくい。ここが AAG の資産
2. **Infrastructure は進化する。** regex → AST → 型情報。ここにコストを投じる
3. **Application は Domain と Infrastructure を接続する。** 判断ロジックはここに閉じる
4. **Presentation は薄く、必要十分にする。** 情報を渡しすぎない。作業を前に進める

## 違反時レスポンスの標準フォーマット（Presentation 層）

| # | 項目 | 情報源（層） |
|---|------|------------|
| 1 | **何が止まったか** | Application (`entrypointSummary`) |
| 2 | **なぜ止まったか** | Domain (`why`) |
| 3 | **今やること** | Application (`migrationPath.steps`) |
| 4 | **例外がありうるか** | Application (`decisionCriteria.exceptions`) |
| 5 | **深掘り先** | Domain (`doc`) |
