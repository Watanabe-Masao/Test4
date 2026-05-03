# ディレクトリ・レジストリ所有権ポリシー

## 1. 正本原則

`calculationCanonRegistry.ts` が **唯一の master registry** である。

- business / analytic / candidate の view は全て derived（master から自動導出）
- derived view の手編集は禁止
- CI（calculationCanonGuard.test.ts）で master と derived view の一致を検証

## 2. Derived View

| View | フィルタ条件 | 用途 |
|------|------------|------|
| `BUSINESS_SEMANTIC_VIEW` | `semanticClass === 'business'` かつ `runtimeStatus !== 'candidate'` | Business Semantic Core の current 群 |
| `ANALYTIC_KERNEL_VIEW` | `semanticClass === 'analytic'` かつ `runtimeStatus !== 'candidate'` | Analytic Kernel の current 群 |
| `MIGRATION_CANDIDATE_VIEW` | `runtimeStatus === 'candidate'` | 移行候補（business + analytics 問わず） |

## 3. Ownership 区分

| ownerKind | 意味 | KPI |
|-----------|------|-----|
| `maintenance` | 保守対象。安定運用 | 互換破壊件数 = 0 |
| `migration` | 移行対象。candidate 育成中 | parity 達成率、promote 成功率 |

## 4. 禁止事項

1. derived view を手編集してはならない
2. master 以外に registry を作ってはならない
3. current と candidate を同じ view に載せてはならない
4. business と analytic を同じ運用 view に混在させてはならない

## 5. block-merge severity

`AR-CANON-SEMANTIC-REQUIRED` ルールは `block-merge` severity で運用する:
- CI は warning として集計する（落とさない）
- **マージは阻止する**（入口で見落とさない）
- 修正してからマージすること

## 6. 参照

- `app/src/test/calculationCanonRegistry.ts` — Master registry
- `app/src/test/semanticViews.ts` — Derived view 生成
- `app/src/test/guards/calculationCanonGuard.test.ts` — 整合性テスト
- `references/01-foundation/semantic-classification-policy.md` — 意味分類ポリシー
