# Architecture Health Report

## 総合判定

| 項目 | 値 |
|---|---|
| **総合評価** | **RISK** |
| 前回比 | Flat |
| リリース影響 | Yes |
| 最終更新 | 2026-04-04T08:46:52.876Z |

## Hard Gate

**FAIL**

- PASS: Frozen リスト非ゼロ
- PASS: 廃止用語残存数
- PASS: Generated section 未更新
- PASS: Presentation→Infrastructure 違反
- PASS: Infrastructure→Application 違反
- FAIL: Doc 更新義務違反数

## Health Metrics

| 指標 | 状態 | 詳細 |
|---|---|---|
| **例外圧** | OK | 許可リスト総エントリ数: 15/20 / Frozen リスト非ゼロ: 0/0 / Active リスト数: 7/10 |
| **後方互換負債** | WARN | Active Bridge 数: 5/3 / 後方互換 re-export 数: 2/3 |
| **複雑性圧** | OK | 上限間近ファイル数: 2/5 / 複雑性ホットスポット数: 10/10 / ViewModel ファイル数: 27/30 |
| **境界健全性** | OK | Presentation→Infrastructure 違反: 0/0 / Infrastructure→Application 違反: 0/0 |
| **ガード強度** | OK | ガードテストファイル数: 31/30 / レビュー専用タグ数: 0/5 |
| **性能** | OK | JS バンドル合計サイズ: 6443/7000 / メインバンドルサイズ: 2214/2500 / ECharts バンドルサイズ: 919/1000 |

## Top Risks

**1. Doc 更新義務違反数**
- 状態: 1 / budget 0（100% 超過）
- ファイル: `—`
- 定義書: `tools/architecture-health/src/collectors/obligation-collector.ts`

**2. Active Bridge 数**
- 状態: 5 / budget 3（67% 超過）
- ファイル: `app/src/application/services/budgetAnalysisBridge.ts`
- 定義書: `references/02-status/technical-debt-roadmap.md #後方互換負債`

## Recommended Actions

1. Doc 更新義務違反数 を budget 0 以下に修正する
2. Active Bridge 数 を 5 → 3 に削減する（残 2）
3. 上限間近ファイル 2 件を分割検討する

---

*正本: `references/02-status/generated/architecture-health.json` — 19 KPIs*
*詳細: `references/02-status/generated/architecture-health.md`*
