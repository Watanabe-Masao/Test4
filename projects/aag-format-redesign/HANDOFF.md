# HANDOFF — aag-format-redesign

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

project ディレクトリを bootstrap した段階。`AI_CONTEXT.md` / `plan.md` /
`checklist.md` / `config/project.json` / `aag/execution-overlay.ts` を作成済み。
`CURRENT_PROJECT.md` を本 project に切替済み。

`unify-period-analysis` は **凍結** 状態。CURRENT_PROJECT.md 切替により
運用上は active から外れているが、ファイルは一切変更しない。AAG 改修後に
Phase 0 棚卸しから再開する。`pure-calculation-reorg` も触らず並行 active
のまま残す。

実装は未着手。次は Phase 0「痛点棚卸し」— 直前の `unify-period-analysis`
bootstrap で詰まった事象が新鮮な記憶として残っているうちに `pain-points.md`
に事実ベースで記録する。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- Phase 0: `pain-points.md` を作成し、`unify-period-analysis` bootstrap で
  実際に詰まった事実を全件記録する（記憶が新鮮なうちに）
- Phase 0: `strengths.md` を作成し、現行 AAG / project 文書体系の良い点を
  事実ベースで列挙する

### 中優先

- Phase 1: 現状調査（`_template/` / executionOverlayGuard / project-resolver /
  collector の構造を `current-state-survey.md` に記録）
- Phase 2-4: 設計（project 文書 / overlay bootstrap / サブプロジェクト機能）

### 低優先

- Phase 5: 実装
- Phase 6: 移行ガイド作成（実行はしない）

## 3. ハマりポイント

### 3.1. 互換性制約を破る誘惑

「ついでに既存 project の AI_CONTEXT を統一形式に揃えたい」「`pure-calculation-reorg`
の overlay を整理したい」と思いがちだが、本 project の不可侵原則 1 で
**既存 project に一切触らない** ことが定められている。設計はすべて
additive にする。既存 project の移行は本 project 完了後の別タスク。

### 3.2. 設計を先に書く誘惑

「現行 AAG はこういう問題があるはず」という印象から設計を始めると、
事実と乖離した解になる。**Phase 0 痛点棚卸しを必ず先に完了する**。
`unify-period-analysis` bootstrap で実際に詰まった事象が 1 次資料。

### 3.3. overlay の全 140 ルール要件は AAG の仕様

`executionOverlayGuard` が要求する全 140 ルール overlay は意図的な設計で、
「base rules の追加忘れ」「overlay 漏れ」を防いでいる。これを単純に緩和
すると本来の防御機能を失う。Phase 3 設計は「初期化負荷を下げつつ、本来の
防御は維持する」両立案を作る必要がある。

### 3.4. サブプロジェクト機能の P2 への拡張誘惑

「親子の進捗を統合したい」「親完了の前提条件にサブを置きたい」は便利だが、
collector / guard / project-health 全体の改修が必要で scope が肥大する。
**P1（親子リンクのみ・additive）で止める**。P2 は本 project 完了後の別タスク。

### 3.5. CURRENT_PROJECT.md の運用

切替時は `CURRENT_PROJECT.md` の 1 行を書き換えるだけだが、resolver / vite
alias / docs:generate / test:guards の整合性が崩れていないかを切替直後に
必ず確認する（本 project bootstrap 時にもこの順で確認した）。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project の why / scope / read order |
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | 完了判定の入力 |
| `references/01-principles/aag-5-constitution.md` | AAG 5 層モデル |
| `references/01-principles/aag-5-source-of-truth-policy.md` | 正本配置ポリシー |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 全体像 |
| `references/03-guides/governance-final-placement-plan.md` | BaseRule / Overlay 配置 |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule 運用ガイド |
| `references/03-guides/project-checklist-governance.md` | project 運用ルール（§10 bootstrap） |
