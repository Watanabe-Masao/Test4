# HANDOFF — architecture-debt-recovery

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 Scaffold 進行中 / Phase 1 未着手。status: `draft`。**

本 project は `budget-achievement-simulator` の reboot で表面化した widget 複雑化問題を起点に、
**widget / pure 関数 / 型 / コンポーネント / データパイプライン / レガシー撤退** を
一体として扱う大型改修 umbrella project。

### 2026-04-23 時点の landed

- `projects/architecture-debt-recovery/` を `_template` からコピー
- `config/project.json` を実値に置換（`status: "draft"`）
- `AI_CONTEXT.md` を Purpose / Project Lineage / Scope / 制約で埋めた
- `plan.md` を不可侵原則 16 項目 / Phase 1-7 詳細 / 4 ステップ pattern / レガシー撤退規約 / 禁止事項 20 項目で埋めた
- `checklist.md` を Phase 0-7 + 最終レビュー checkbox で埋めた
- `HANDOFF.md` 本ファイルを customize 中

### 未着手

- `aag/execution-overlay.ts` を `budget-achievement-simulator` の overlay を踏襲して customize
- `inquiry/` ディレクトリ作成
- 派生セット（`pr-breakdown.md` / `review-checklist.md` / `test-plan.md` / `inventory/`）の要否判定

### 触っていないもの（原則通り保留）

- `CURRENT_PROJECT.md`（依然 `budget-achievement-simulator` を active）
- `projects/budget-achievement-simulator/`（Phase 5 まで touch 禁止）
- コード本体（Phase 1-3 はコード変更禁止）
- `references/01-principles/`（Phase 3 候補提示 + 人間承認後）

## 2. 次にやること

詳細は `checklist.md` を参照。Phase 0 scaffold の残タスク → Phase 1 kickoff が次の動線。

### 高優先

- `aag/execution-overlay.ts` を埋める（`budget-achievement-simulator` overlay を踏襲）
- `inquiry/` ディレクトリを作成
- 派生セット判定（DERIVED.md の Q1-Q5）— `pr-breakdown.md` / `test-plan.md` / `inventory/` を root にコピーするか判断
- Phase 0 checklist を全て [x] にする

### 中優先

- Phase 1 kickoff: `inquiry/01-widget-registries.md` から着手
  - 9 registry × 全 widget の網羅的棚卸し
  - 事実のみ。recommendations を書かない

### 低優先

- Phase 5 まで保留のタスク群（`budget-achievement-simulator` の扱い・`CURRENT_PROJECT.md` 切替）
- Phase 6 の sub-project spawn 計画（Phase 4 で identify）

## 3. ハマりポイント

### 3.1. Phase 境界を破る誘惑

Phase 1-3 はコード変更禁止。inquiry 中に「ついでに直したい」衝動が発生しやすいが、
これを許すと Phase 2 の分析で「何が事実で何が改修済みか」が混ざる。
**発見した課題はその場で修正せず、inquiry ファイルに記録するだけに留める。**

### 3.2. 単一原因への帰着

widget 複雑化を「全部 `InsightData` のせい」「2 つの `WidgetDef` 型のせい」と
単一原因に帰着させたくなる。これは禁止（不可侵原則 #11）。
**各症状に 2 つ以上の仮説を立てる**のが Phase 2 の規律。

### 3.3. 出口まで詰めない誘惑

Phase 6 で「新実装を追加して consumer を移行した」段階で完了扱いにしたくなる。
これが**最も多い失敗**。4 ステップ pattern の Step 3（旧実装削除）と Step 4（再発防止 guard）まで
完遂して初めて改修完了。`@deprecated` コメントでの温存は Step 3 の代替にならない。

### 3.4. レガシー shim の温存

「後で消す」「念のため残す」は禁止。`sunsetCondition` 付きの期限付き shim はレアケース。
`temporal governance` の形式で設定する（`references/03-guides/architecture-rule-system.md`）。

### 3.5. sub-project の parent 設定忘れ

Phase 6 で sub-project を spawn する際、`config/project.json` の
`parent: "architecture-debt-recovery"` を忘れると文脈継承が機械的に強制されない。
sub-project 立ち上げ時の checklist に必須項目として載せる。

### 3.6. stream idle timeout

大きな単一 Write（500 行級）は Claude Code の API ストリーミング idle timeout に
抵触する。**plan.md / 大きな inquiry ファイルは skeleton → Edit の chunked 方式**で埋める。
1 chunk あたり 100-150 行が目安。

### 3.7. `budget-achievement-simulator` への誤 touch

Phase 5 まで `projects/budget-achievement-simulator/` を touch しない。
これは独立 project の在職状態保護。同 project の cleanup 7 項目は
Phase 4 の remediation-plan で sub-project に吸収する設計。

### 3.8. UI 層は既存で十分にテコ入れされていない前提

`presentation/` と `features/*/ui/` は、過去の機能追加・改修・改廃の積み重ねで
**責務分離が乱雑な箇所が多い**前提で Phase 1 の棚卸しに入る。特に:

- 1 component が「データ取得 + 状態管理 + 描画」複数責務を抱える
- 責務タグ (`@responsibility R:*`) と実態の乖離
- responsibility-separation guard P2-P18 の各指標の分布に偏り
- C8「1 文説明テスト」で「〜と〜を担う」の AND が入るケース

Phase 1 `inquiry/08-ui-responsibility-audit.md` でこれを重点的に棚卸しする。
**事実列挙のみ。改修案・recommendations は Phase 2 以降**（原則 #12）。

### 3.9. ブランチ名の不整合

現 branch `claude/budget-simulator-review-dJr9C` は本 project 以前の scope を含む命名。
Phase 5 で本 project を active 昇格するタイミングで新 branch に切り替えることを検討。
無理に branch 名を揃える必要はないが、PR 時に混乱しないよう scope を commit message で
明示する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / lineage / read order |
| `plan.md` | 不可侵原則 16 / Phase 1-7 / 4 ステップ pattern / 禁止事項 20 |
| `checklist.md` | Phase 0-7 + 最終レビュー checkbox |
| `config/project.json` | project manifest（`status: "draft"` 初期） |
| `aag/execution-overlay.ts` | rule overlay（未 customize） |
| `DERIVED.md` | 派生セット判定ガイド |
| `derived/` | 派生セット source（`pr-breakdown.md` / `test-plan.md` / `inventory/` 等） |
| `inquiry/` | Phase 1-5 の成果物置き場（未作成） |
| `projects/budget-achievement-simulator/HANDOFF.md` | informed-by 先の到達点（Phase 5 で整理） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用規約 |
| `references/03-guides/new-project-bootstrap-guide.md` | sub-project 立ち上げ手順 |
