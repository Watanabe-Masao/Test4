# features/ 縦スライス移行 — 完遂記録 (split)

> **disposition: split 完遂 (= AAG-COA Sub-3 sub-PR 4)**: 旧 doc は (1) 進捗表 + 完了 narrative = state record + (2) 後方互換 policy + (3) Dashboard Widget Ownership canonical table + (4) 次の移行対象 (別 Epic) = future plan の責務複合だった。本 doc は (1) 完遂記録 + (3) Widget Ownership は code (`widgetOwnership.ts`) 正本への pointer のみ。(2) policy は `references/01-foundation/modular-monolith-evolution.md` で articulate、(4) 別 Epic 候補は本 doc 末尾に articulate (= projects 化判断は user gate)。

## 完遂状態 (2026 年初頭時点、8 / 8 feature)

| Feature | Domain | Application | UI | Page Shell | Barrel | Done |
|---------|--------|-------------|-----|------------|--------|------|
| sales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| storage-admin | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| budget | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| forecast | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| purchase | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| category | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| cost-detail | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports | n/a | n/a | ✅ | ✅ | ✅ | ✅ |

各 feature の domain / application / ui 配置は `references/04-tracking/project-structure.md` (= generated) で機械検証。
後方互換: 全移動ファイルの旧パスに barrel re-export を配置済 (= 詳細 policy: `references/01-foundation/modular-monolith-evolution.md`)。

## Dashboard Widget Ownership (= code 正本 pointer)

全 widget に owner が定義済。**正本**は code (`presentation/pages/Dashboard/widgets/widgetOwnership.ts`):

- `WidgetId` 型が `WIDGET_OWNERSHIP` から自動導出され、`WidgetDef.id` を型安全にする
- Guard: `app/src/test/guards/structuralConventionGuard.test.ts` — 未登録 widget / orphan / shared 理由なし を CI で検出
- 集計 owner / count は `widgetOwnership.ts` 末尾の derived map を参照

過去 snapshot (= 31 widget owner table) は本 doc から削除 (= code が唯一の正本、doc 重複は DOC-FAIL-GENERATED-AS-MANUAL 違反)。

## 次の Epic 候補 (= projects 化は user gate)

以下 3 項目は本 features 移行完遂後の継続作業候補。本 doc は inventory として保持し、project spawn 判断 (= AAG-COA Level 判定) は user gate。

- owner 付き widget の正本を feature 配下へ実体移動 (= 現状 owner は code で articulate、物理 location は `presentation/pages/Dashboard/widgets/` 集中)
- `domain/calculations/` 配下の feature owner mapping + 必要なら feature 配下移動
- `charts/` 配下の category 系 chart を category feature 配下へ回収
