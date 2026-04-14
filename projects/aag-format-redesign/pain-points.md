# pain-points — aag-format-redesign

> 役割: Phase 0 棚卸しの 1 次資料。`unify-period-analysis` bootstrap で
> 実際に詰まった事実を、印象ではなくファイル・行・コマンド・エラーで記録する。
> 設計（Phase 2-4）はここに対する応答でなければならない。
>
> 形式: `[P-NN] 一文サマリ` / 事実 / 影響 / 設計案で応えるべき問い

---

## P-01 新 project の overlay は全 140 ルール分を用意しないと guard で落ちる

### 事実

- `app/src/test/guards/executionOverlayGuard.test.ts` が「base rules の全 rule
  に overlay がある」ことを要求する
- 新 project `unify-period-analysis` を bootstrap した際、空 overlay や
  最小 overlay は guard を通らない
- `projects/pure-calculation-reorg/aag/execution-overlay.ts` (1425 行) を
  そのままコピーして配置する以外に、guard を通す方法がなかった
- 結果として、unify-period-analysis の overlay には pure-calculation-reorg の
  案件運用状態（`fixNow` / `executionPlan` / `reviewPolicy.lastReviewedAt` 等）が
  そのまま継承されている

### 影響

- 案件運用状態が project 間で「コピー継承」される
- `lastReviewedAt` などの時刻フィールドが、本 project と無関係に古くなる
- `reviewCadenceDays` を超えると warning が出る可能性
- 「この project ではこのルールをどう扱うか」を本 project 自身では決められて
  いない

### 設計案で応えるべき問い

- 新 project が overlay 全 140 ルールを必ず明示する負荷を、本来の防御
  （ルール追加時の overlay 漏れ防止）を維持したまま下げる方法は何か
- 候補: `defaults` overlay 継承 / `inherits: <base-overlay>` / `optionalRuleIds`

---

## P-02 `_template/` だけでは実行可能粒度に届かない

### 事実

- `projects/_template/` のファイルは `AI_CONTEXT.md` / `HANDOFF.md` /
  `plan.md` / `checklist.md` / `config/project.json` の 5 つだけ
- `unify-period-analysis` を実際に「実行を始められる粒度」にするため、
  以下を全部後付けで足した:
  - `pr-breakdown.md` — PR 1〜5 の作業単位
  - `review-checklist.md` — A〜J カテゴリ別レビュー観点
  - `acceptance-suite.md` — Critical Path Acceptance Suite 設計
  - `test-plan.md` — G0〜G6 ガード + L0〜L4 ロジックテスト計画
  - `inventory/README.md` + `01〜04.md` — Phase 0 棚卸し結果の固定先
- これらのファイル名・配置・追加判断基準は `_template/` にも
  `references/03-guides/project-checklist-governance.md` にもない
- ユーザーレビューでも「設計は十分だが、実行可能粒度に達するための追加
  ファイルが必要だった」と判定された

### 影響

- 新 project ごとに「実行可能粒度」の到達基準を発明し直す
- ファイル名・配置が project 間でばらつく可能性
- bootstrap が「テンプレコピーで完了」と誤認される（実際は半分しかない）

### 設計案で応えるべき問い

- 「必須セット（5 ファイル）」と「派生セット（5+ ファイル）」の境界を
  どこに置くか
- 派生セットは「いつ足すべきか」の判断基準を template に含めるか、別ガイドに
  置くか
- ファイル名・配置を強制するか（規約のみ / guard で検証 / 自動生成）

---

## P-03 `CURRENT_PROJECT.md` 切替の副作用が暗黙

### 事実

- `CURRENT_PROJECT.md` を切替えると、以下が同時に切り替わる:
  - `tools/architecture-health/src/project-resolver.ts:50` — active project id 抽出
  - `app/vite.config.ts:12` — `@project-overlay/*` alias ターゲット
  - `app/vitest.config.ts:8` — 同上
  - `tools/resolve-project-overlay.mjs` — overlay 解決スクリプト
- 切替後に整合性を確認するためのチェックリストや自動スクリプトがない
- `unify-period-analysis` 切替時、私は `npm run docs:check` / `npm run build` /
  `npm run test:guards` / `npm run lint` / `npm run format:check` を手動で
  順番に実行した
- どの順で実行すれば最小コストで整合性を確認できるかは AI 側の判断頼み

### 影響

- 切替時に検証漏れが起きる可能性
- 「切替成功」の判定基準が明文化されていない
- 切り戻し（`CURRENT_PROJECT.md` を元に戻す）の手順も同様に暗黙

### 設計案で応えるべき問い

- 切替時の検証順序を script / npm script として固定化するか
- 切替前後に必須となる検証セットを定義するか
- 切り戻しを安全に行うための条件（uncommitted changes の禁止等）を定義するか

---

## P-04 `docs:generate` 直後に `docs:check` が stale を出すことがある

### 事実

- `unify-period-analysis` bootstrap 中、以下が 2 回発生した:
  1. `npm run docs:generate` を実行 → 全 section "updated" と表示
  2. 直後に `npm run docs:check` を実行 → "stale" でエラー
  3. もう一度 `npm run docs:generate` を実行 → 同じく "updated"
  4. `npm run docs:check` → PASS
- エラー内容: `Generated section stale in CLAUDE.md — content differs from
  live calculation`
- 実行間隔は数秒以内
- 1 回目の generate と 2 回目の generate でファイル変更があるかは未調査

### 影響

- bootstrap 時に「正しく動いているのに失敗が出る」体験が発生
- CI 上で同じことが起きると flaky test として扱われる
- 原因不明のまま「もう一度叩く」で乗り切る運用になる

### 設計案で応えるべき問い

- `docs:generate` の冪等性は保証されているか（要調査）
- 1 回目と 2 回目の差分は何か（要調査）
- 原因が race condition / 順序依存 / 入力 mutation のいずれか特定が必要

---

## P-05 派生トピックの行き場がない

### 事実

- `unify-period-analysis` を進めている最中に「比較ヘッダの styles 整理は
  別件だがついでに気になる」のような派生トピックが発生する想定がある
- 現状の選択肢:
  - (a) 本 project の checklist に混ぜる → scope hijack で plan.md の不可侵原則違反
  - (b) 別 project として新規 bootstrap → bootstrap コスト（5 ファイル + 後付け
    5 ファイル + overlay コピー + CURRENT_PROJECT 切替）が重い
  - (c) どこにも書かない → 忘れる
- 「文脈は繋がっているが内容は独立」というカテゴリの行き場がない
- ユーザーから「サブプロジェクト機能が欲しい」と明示された

### 影響

- 派生トピックが本 project の scope を汚染するか、消える
- bootstrap コストが重いため「別 project にする」判断が下りにくい
- 結果として 1 つの project が複数の独立トピックを抱える肥大化が起きる

### 設計案で応えるべき問い

- 「親 project から派生した独立トピック」を軽量に管理する構造は何か
- サブ project は通常 project と同じ構造でよいか、簡略化すべきか
- 親子関係を可視化する最小コストは何か（`config/project.json` に
  `parent` field を追加するだけで十分か）

---

## P-06 `inventory/` のような派生ファイルセットの命名・配置が暗黙

### 事実

- `unify-period-analysis` の Phase 0 棚卸し結果を固定する場所として、
  `projects/unify-period-analysis/inventory/` を新規に作成した
- ファイル名は `01-comparison-math-in-presentation.md` のような連番＋スラッグで
  自由に決めた
- この命名規約は project 間で共有されていない
- もし別 project でも棚卸しを行ったら、また別の命名・配置を発明する可能性が
  ある

### 影響

- project 間でファイル構造がばらつく
- 後から横断的に集計・参照する際に困難
- 「棚卸しはどこに書く」が project ごとに違うと、新規参加者の認知コストが増える

### 設計案で応えるべき問い

- `inventory/` に相当する派生ファイルセット（`pr-breakdown` /
  `review-checklist` / `acceptance-suite` / `test-plan` / `inventory` 等）を
  template に含めるか、別の仕組みで管理するか
- 命名規約を強制するか（guard / script / 規約のみ）

---

## P-07 「実行可能粒度に達した」ことを判定する仕組みがない

### 事実

- `unify-period-analysis` bootstrap は、テンプレコピー直後の状態では
  「設計は十分だが実行可能粒度に達していない」とユーザーレビューで判定された
- ユーザーが指摘するまで、私（AI）は「bootstrap 完了」と認識していた
- `_template/` 5 ファイルが揃った時点で `derivedStatus` は `in_progress`
  になり、project-health collector も問題なく動く
- しかし「実装を始められる」状態かは、文書品質の主観評価
- ユーザーレビューを経て、`pr-breakdown` / `review-checklist` /
  `acceptance-suite` / `test-plan` / `inventory/` を後付けで足してようやく
  実行可能粒度になった

### 影響

- bootstrap 完了 ≠ 実行開始可能、というギャップが構造化されていない
- AI が「完了」と認識する地点と、実際に着手できる地点がズレる
- ユーザーレビューに依存する品質判定がボトルネック

### 設計案で応えるべき問い

- 「実行可能粒度」を機械的に判定する基準は作れるか
- 必須セットと派生セットの分離で、必須セットの完備＝実行可能と
  みなせるか
- ユーザーレビューを経ずに AI が「実行可能」を宣言できる条件は何か

---

## P-08 ブランチ名と project の対応が暗黙

### 事実

- 現在のブランチ名は `claude/unify-period-analysis-0J4At`
- このブランチで `unify-period-analysis` の bootstrap を行った後、
  ユーザー指示で `aag-format-redesign` の bootstrap も同じブランチで commit した
- ブランチ名は project と紐づく命名のため、混乱を招く可能性がある
- 「project 切替＝新しいブランチ」というルールはなく、`CURRENT_PROJECT.md`
  だけで切替する設計

### 影響

- ブランチ名から内容を推測しにくい
- PR を作る場合、複数 project の変更が混ざる可能性
- 後から git log を辿るときに project ごとに分離しにくい

### 設計案で応えるべき問い

- ブランチ命名は project と独立させるか、project 切替時に新ブランチを切る
  ルールにするか
- 本 project の scope 外（運用ルール）かもしれない

---

## P-09 tsc OOM（pre-push hook 関連）

### 事実

- 検証中、`npx tsc -b --noEmit` が以下のエラーで OOM 終了した:
  ```
  v8::internal::Heap::MarkCompact() ...
  Aborted
  ```
- 回避: `NODE_OPTIONS="--max-old-space-size=8192"` を付けると成功
- pre-push hook は環境変数を継承するか不明
- 同じ実行を pre-push hook 経由で実行した場合は問題なく完了した（複数回確認）
- 直接 `npx tsc` を叩いたときだけ OOM が出た

### 影響

- 「pre-push hook 内では動くが手動実行で OOM」という奇妙な状態
- 本 project の scope 外の可能性が高い（環境問題）
- ただし bootstrap 検証手順を `npm script` 化する際には影響する

### 設計案で応えるべき問い

- 本 project の scope 外として記録のみとするか、影響を解消する方策を含めるか
