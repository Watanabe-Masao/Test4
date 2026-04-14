# HANDOFF — aag-format-redesign

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

Phase 0「痛点棚卸し」〜 Phase 6「移行ガイド作成」まで全 Phase の機能的作業を
実装完了した段階。人間による最終レビュー待ち。

### 実装済み

- **設計文書** (6 ファイル): `pain-points.md` / `strengths.md` /
  `current-state-survey.md` / `new-format-design.md` /
  `overlay-bootstrap-design.md` / `subproject-design.md` / `migration-guide.md`
- **overlay defaults**: `app/src/test/architectureRules/defaults.ts`
  (147 entries — BaseRule 全カバー)
- **merge 変更**: `app/src/test/architectureRules/merged.ts` — project overlay
  → defaults → error の解決順序
- **guard 更新**: `executionOverlayGuard.test.ts` — effective overlay 判定
- **新 guard**: `defaultOverlayCompletenessGuard.test.ts` (5 tests) /
  `subprojectParentGuard.test.ts` (4 tests)
- **template 拡張**: `projects/_template/aag/execution-overlay.ts` (空) /
  `DERIVED.md` / `derived/` (pr-breakdown / review-checklist /
  acceptance-suite / test-plan / inventory)
- **collector 拡張**: `project-checklist-collector.ts` に `parent` field +
  `subprojectCount` KPI / project-health renderer に parent 列
- **新 script**: `app/scripts/verify-project-switch.mjs` + `verify:project`
  npm script
- **bootstrap ガイド**: `references/03-guides/new-project-bootstrap-guide.md` +
  doc-registry / references/README 登録

`unify-period-analysis` / `pure-calculation-reorg` は無変更（不可侵原則 1）。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- 人間によるレビュー（最終レビューセクション）
- 必要に応じて本 project 自体を新フォーマットで自己移行する
  （`migration-guide.md` §5.3）

### 中優先

- `unify-period-analysis` の解凍時に本フォーマットへの移行を同時実施
- `pure-calculation-reorg` の次 PR 切れ目で移行

### 低優先

- P-04（docs:check stale）の冪等性調査（別 project / quick-fixes）
- P-07（実行可能粒度の機械判定）— 主観評価のまま当面運用

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
