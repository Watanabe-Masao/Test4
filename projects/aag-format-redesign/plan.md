# plan — aag-format-redesign

## 不可侵原則

1. **既存 project に一切触らない（互換性制約）** — `pure-calculation-reorg` /
   `unify-period-analysis` 等のファイル（`AI_CONTEXT.md` / `plan.md` /
   `checklist.md` / `HANDOFF.md` / `config/project.json` / `aag/`）は
   読むだけで変更しない。新フォーマットは並行で出す
2. **Additive only** — 既存 collector / resolver / guard / template に
   破壊的変更を加えない。新機能は新フィールド・新ファイル・新 guard で追加し、
   既存システムは無変更で動き続ける
3. **痛点先・設計後** — 「困った経験を先に列挙してから設計する」順序を守る。
   現状の悪口より、`unify-period-analysis` bootstrap で実際に詰まった事実を
   1 次資料とする
4. **既存 AAG 5 層モデルを壊さない** — Layer 1〜3（Authority / Orchestration /
   Identity）は触らない。改修は Layer 4（Execution）と Layer 4A（System
   Operations）の運用面に限定する
5. **既存 project の移行は本 project の scope 外** — 移行ガイドは作るが、
   実行は別タスク。本 project は「新フォーマットを導入する」ことが goal で
   「既存 project を移行する」ことは goal ではない

## Phase 構造

### Phase 0: 痛点棚卸し

`unify-period-analysis` bootstrap で実際に詰まった事実を、何が悪かったか
ではなく事実ベースで `pain-points.md` に列挙する。同時に、現行 AAG /
project 文書体系の **良い点** を `strengths.md` に列挙する。

完了条件: 痛点 / 良い点が事実ベースで全件出揃っている。「気持ち」「印象」
ではなく、具体的なファイル・行・コマンド・エラーで記録される。

### Phase 1: 現状調査

現行 AAG の構造を改めて読み、痛点と対応する箇所を特定する:
- `_template/` の構造と限界
- `executionOverlayGuard` の要件と新 project 立ち上げへの影響
- `project-resolver.ts` / `vite.config.ts` / `vitest.config.ts` の解決経路
- `project-health.json` collector の生成ロジック
- `references/03-guides/project-checklist-governance.md` §10（bootstrap）の
  実態との乖離

完了条件: 各痛点に対し「現行のどこが原因で」「どう変えれば additive に
解消できるか」が `current-state-survey.md` にまとまっている。

### Phase 2: 新フォーマット設計（project 文書側）

`_template/` を additive に拡張する設計を作る。

- 必須セット（現行と同じ: AI_CONTEXT / plan / checklist / HANDOFF / config）
- 派生セット（新規）: `pr-breakdown` / `acceptance-suite` / `test-plan` /
  `inventory/` を「いつ足すべきか」の判断基準付きで定義
- 新 project bootstrap チェックリスト（resolver / vite / docs:generate /
  test:guards の起動順）

完了条件: `_template/` を壊さず、新たに `_template-extended/` または
`_template/` 内に派生セット用の追加ファイルを置く設計が
`new-format-design.md` にまとまっている。

### Phase 3: 新フォーマット設計（AAG overlay 側）

`executionOverlayGuard` を壊さずに、新 project 立ち上げ時の overlay 全 140
ルール要件を緩和する設計を作る。候補:

- (a) `defaults` overlay 機能: project が overlay で明示しないルールは
  共通 `defaults/execution-overlay.ts` を継承する
- (b) `inherits` フィールド: project の overlay が「base overlay」を継承して
  必要な部分だけ override できる
- (c) `optionalRuleIds`: project が「適用しない」ルールを宣言できる

3 案の trade-off を比較し、互換性を保てる案を 1 つ選ぶ。

完了条件: 設計案・guard 影響範囲・移行手順が `overlay-bootstrap-design.md`
にまとまっている。

### Phase 4: サブプロジェクト機能設計（P1 — 親子リンクのみ）

- `config/project.json` に `parent: "<parent-project-id>"` フィールドを
  optional で追加
- スキーマ更新（既存 project は無変更でも valid）
- `project-health.json` collector に「parent 表示」だけを最小限追加
- サブ project 側 AI_CONTEXT.md に「親 project の AI_CONTEXT.md を読む」
  ことを Read Order に含める運用ルール
- 親子関係を可視化する最小 guard（`parent` で指定された project が実在
  するか）

完了条件: 設計が `subproject-design.md` にまとまり、既存 project に
影響しないことが明示されている。

### Phase 5: 実装

設計に従い additive に実装する:

- `_template/` の拡張（または `_template-extended/` 新設）
- overlay bootstrap 緩和の実装（Phase 3 で選んだ案）
- `parent` フィールドの schema 追加
- `project-health` collector の parent 対応
- 親子関係 guard 追加
- 新 project bootstrap チェックリストを `references/03-guides/` に追加

完了条件: 既存 guard 全 PASS + 新 guard 追加 + 既存 project が無変更で
動き続けることを `test:guards` と `docs:check` で確認。

### Phase 6: 移行ガイド作成

既存 project（`pure-calculation-reorg` / `unify-period-analysis` 等）を
新フォーマットに移行する際の手順書を作る。**実行はしない**。

完了条件: 移行ガイドが `migration-guide.md` にまとまり、既存 project ごとの
影響範囲が表形式で示されている。

### 最終レビュー (人間承認)

## やってはいけないこと

- **既存 project ファイルの変更** → 互換性制約違反。読むだけ
- **既存 collector / guard の破壊的変更** → additive only 原則違反
- **BaseRule の中身（`fixNow` / `executionPlan` 等）の見直し** → 本 project
  の scope 外。BaseRule の意味的な変更は別 project
- **既存 project の移行作業** → ガイドだけ作って実行しない。移行は別タスク
- **AAG Layer 1〜3 の構造変更** → 触ると影響範囲が制御不能
- **設計を先に書いてから痛点を後付けで合わせる** → Phase 0 の痛点棚卸しを
  最優先する。設計は痛点に対する応答でなければならない
- **サブプロジェクト機能の P2 への拡張** → P1 で止める。進捗統合・blocking
  依存等は本 project の scope 外
- **CLAUDE.md / ROLE.md の改修** → AAG Layer 2-3 の責務。本 project は触らない

## 関連実装

| パス | 役割 |
|---|---|
| `projects/_template/` | 現行 project 文書テンプレート（読むだけ） |
| `tools/architecture-health/src/project-resolver.ts` | CURRENT_PROJECT 解決 |
| `tools/architecture-health/src/collectors/` | KPI / project-health collector 群 |
| `app/src/test/architectureRules/` | BaseRule / Overlay merge facade |
| `app/src/test/guards/executionOverlayGuard.test.ts` | overlay 整合性 guard |
| `app/src/test/guards/projectStructureGuard.test.ts` | project 構造 guard |
| `app/src/test/guards/projectDocStructureGuard.test.ts` | project 文書構造 guard |
| `app/src/test/guards/checklistFormatGuard.test.ts` | checklist 形式 guard |
| `references/03-guides/project-checklist-governance.md` | project 運用ルール |
| `app/vite.config.ts` / `app/vitest.config.ts` | `@project-overlay/*` alias |
