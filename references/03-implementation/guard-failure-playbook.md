# guard-failure-playbook — Repair-style guard message 標準

> **目的**: guard / KPI 違反時の error message を **検出止まり → 修理ナビゲーション** に格上げする標準を文書化する。
> **位置づけ**: Phase Q.O-4 deliverable（actionable error messages）。
> **既存実装**: 本 doc は既に AAG が実装している `AagResponse` / `renderAagResponse` / `AAG_FIX_HINTS` 系統を **standard として明文化**するもの。新規 mechanism は導入しない。

## 1. Repair-style standard とは

「何が壊れたか」だけでなく「**どう直すか / どこを読むか / 例外があるか**」を 1 つの response に集約する。

**Bad (検出止まり)**:
```
AssertionError: violations.length === 0
expected 3 to equal 0
```

**Good (Repair-style)**:
```
⚡ 今すぐ修正 [layer-boundary]
  presentation 層が wasmEngine を直接 import することを禁止する
  理由: presentation は描画専用。engine の詳細は application 層が隠蔽する
  方向: 4 層依存ルールを守る経路を維持する
  修正手順:
    1. wasmEngine の import を削除
    2. application/hooks/ の対応する hook を探す（例: useCalculation）
    3. hook 経由で計算結果を受け取るように変更
  例外: なし
  詳細: references/01-foundation/design-principles.md
  違反:
    - app/src/presentation/Foo.tsx (line 12)
```

## 2. 標準 schema (AagResponse)

正本: `app/src/test/architectureRules/helpers.ts` の `AagResponse`。

| field | 説明 | 例 |
|---|---|---|
| `source` | 情報源 | `'guard' \| 'obligation' \| 'health' \| 'pre-commit'` |
| `fixNow` | 運用区分 | `'now' \| 'debt' \| 'review'` |
| `slice` | 関心スライス | `'layer-boundary'` 等 |
| `summary` | 何が止まったか（1 文） | rule.what |
| `reason` | なぜ止まったか | rule.why |
| `steps` | 今やること | rule.migrationRecipe.steps |
| `exceptions` | 例外がありうるか | rule.decisionCriteria.exceptions |
| `deepDive` | 深掘り先 doc | rule.doc |
| `violations` | 具体的な違反一覧 | path + line |

## 3. guard 実装パターン

### 3.1 ArchitectureRule を持つ guard

```ts
import { getRuleById, formatViolationMessage } from '../architectureRules'

const rule = getRuleById('AR-XXX')!
const violations = collectViolations(...)

expect(violations.length, formatViolationMessage(rule, violations)).toEqual(0)
```

`formatViolationMessage` は内部で `renderAagResponse(buildAagResponse(rule, violations))` を呼ぶ。**手書きメッセージは禁止** (`architectureRuleGuard.test.ts §手書き AAG レスポンスの残件数 BASELINE = 0`)。

### 3.2 KPI 違反時（AAG_FIX_HINTS）

正本: `tools/architecture-health/src/config/aag-fix-hints.ts`。

```ts
export const AAG_FIX_HINTS: Record<string, { action: string; doc?: string; slice?: string }> = {
  'boundary.presentationToInfra': {
    action: 'presentation → infrastructure の直接 import を削除。application/hooks 経由に変更',
    doc: 'references/01-foundation/design-principles.md',
    slice: 'layer-boundary',
  },
  // ...
}
```

KPI ID をキーに `action` / `doc` / `slice` を引く。PR comment / health certificate / pre-commit 共通で参照される（DRY）。

### 3.3 obligation 違反時

`buildObligationResponse()` が rule を持たない obligation 違反を AagResponse 互換 format で返す。`tools/architecture-health/src/collectors/obligation-collector.ts` 経由。

## 4. Tier 別の message variation

`tier`（Phase Q.O-2 で導入）に応じて、`fixNow` と message の重さを揃える:

| Tier | 推奨 fixNow | message tone |
|---|---|---|
| **Tier 0** | `now` | 「⚡ 今すぐ修正」+ 例外なし明記 + 修正手順詳細 |
| Tier 1 | `now` または `debt` | 「⚡ 今すぐ修正」+ allowlist 申請経路を明示 |
| Tier 2 | `debt` | 「📋 構造負債として管理」+ ratchet baseline 記述 |
| Tier 3 | `review` | 「🔍 観測・レビュー対象」+ Discovery Review 誘導 |

> Tier 0 一覧: `references/AAG_CRITICAL_RULES.md`。Tier 0 は **allowlist 不可**、message に「例外: なし」を明記。

## 5. anti-patterns（してはいけない）

| anti-pattern | 理由 | 代替 |
|---|---|---|
| `expect(x).toEqual(y)` のみ（rule 参照なし）| 修理経路が見えない | `formatViolationMessage(rule, violations)` を assertion message に渡す |
| 手書きの `⚡ AAG` メッセージ | format 統一が崩れる | `renderAagResponse` 経由 |
| `console.error` で固有の error | source 不明 | source 明示の AagResponse を返す |
| migrationRecipe.steps を 0 件のまま放置 | 修理経路がない | rule に必ず steps を書く（`migrationRecipe.steps` は必須 field）|
| `decisionCriteria.exceptions` 空 | 例外可否が不明 | 例外なしなら「例外なし」と明記、ありなら条件を書く |
| KPI を AAG_FIX_HINTS に登録せず ad-hoc message | DRY 違反、PR comment と certificate で drift | 必ず AAG_FIX_HINTS に登録 |

## 6. 新 guard 追加時のチェックリスト

- [ ] `app-domain/gross-profit/rule-catalog/base-rules.ts` に rule 追加（`what` / `why` / `migrationRecipe.steps` / `decisionCriteria.exceptions` 必須）
- [ ] Tier 0 候補なら `tier: 0` を指定し、`AAG_CRITICAL_RULES.md` に追記
- [ ] guard test で `formatViolationMessage(rule, violations)` を assertion message に
- [ ] KPI 化する場合は `AAG_FIX_HINTS` に entry 追加
- [ ] obligation との連動が必要なら `obligation-collector.ts` の `PATH_TO_REQUIRED_READS` に追加
- [ ] `architectureRuleGuard.test.ts §手書き AAG レスポンスの残件数` が増えないこと

## 7. 既存 guard の遵守状況

- 「手書き AAG レスポンス」の残件数は `architectureRuleGuard.test.ts` で `BASELINE = 0` 維持
- 全 KPI が AAG_FIX_HINTS に登録されているかは pr-comment-renderer / certificate-renderer 経由で実質的に検証

これらは ratchet で守られている → **本 playbook は新規 guard 追加時の参照点**であり、既存 guard を一斉 refactor する mandate ではない。

## 8. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版（Phase Q.O-4 deliverable）。既存 AagResponse / renderAagResponse / AAG_FIX_HINTS 系統を Repair-style standard として明文化。新 mechanism は導入せず、新 guard 追加時の参照点として運用 |
