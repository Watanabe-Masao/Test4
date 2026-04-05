# Architecture Health Report

## 総合判定

| 項目 | 値 |
|---|---|
| **総合評価** | **Watch** |
| 前回比 | Improved |
| リリース影響 | No |
| 最終更新 | 2026-04-05T12:13:40.045Z |

## Hard Gate

**PASS** — 全ゲート通過

- PASS: Frozen リスト非ゼロ
- PASS: 廃止用語残存数
- PASS: Generated section 未更新
- PASS: Presentation→Infrastructure 違反
- PASS: Infrastructure→Application 違反
- PASS: Doc 更新義務違反数

## Health Metrics

| 指標 | 状態 | 詳細 |
|---|---|---|
| **例外圧** | OK | 許可リスト総エントリ数: 15/20 / Frozen リスト非ゼロ: 0/0 / Active リスト数: 7/10 |
| **後方互換負債** | WARN | Active Bridge 数: 5/3 / 後方互換 re-export 数: 2/3 |
| **複雑性圧** | OK | 上限間近ファイル数: 2/5 / 複雑性ホットスポット数: 10/10 / ViewModel ファイル数: 27/30 |
| **境界健全性** | OK | Presentation→Infrastructure 違反: 0/0 / Infrastructure→Application 違反: 0/0 |
| **ガード強度** | OK | ガードテストファイル数: 31/30 / レビュー専用タグ数: 0/5 |
| **性能** | OK |  |

## Top Risks

**1. Active Bridge 数**
- 状態: 5 / budget 3（67% 超過）
- ファイル: `app/src/application/services/budgetAnalysisBridge.ts`
- 定義書: `references/02-status/technical-debt-roadmap.md #後方互換負債`

## Recent Changes

| 指標 | 前回 | 今回 | 変化 |
|---|---|---|---|
| Doc 更新義務違反数 | 1 | 0 | -1 + |

## Recommended Actions

1. Active Bridge 数 を 5 → 3 に削減する（残 2）
2. 上限間近ファイル 2 件を分割検討する

---

*正本: `references/02-status/generated/architecture-health.json` — 15 KPIs*
*詳細: `references/02-status/generated/architecture-health.md`*
