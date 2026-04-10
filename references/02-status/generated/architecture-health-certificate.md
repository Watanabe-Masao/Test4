# Architecture Health Report

## 総合判定

| 項目 | 値 |
|---|---|
| **総合評価** | **Healthy** |
| 前回比 | Flat |
| リリース影響 | No |
| 最終更新 | 2026-04-10T21:14:27.228Z |

## Hard Gate

**PASS** — 全ゲート通過

- PASS: Frozen リスト非ゼロ
- PASS: 廃止用語残存数
- PASS: Generated section 未更新
- PASS: Presentation→Infrastructure 違反
- PASS: Infrastructure→Application 違反
- PASS: Doc 更新義務違反数
- PASS: review overdue ルール数

## Health Metrics

| 指標 | 状態 | 詳細 |
|---|---|---|
| **例外圧** | OK | 許可リスト総エントリ数: 13/20 / Frozen リスト非ゼロ: 0/0 / Active リスト数: 6/10 |
| **後方互換負債** | OK | Active Bridge 数: 0/3 / 後方互換 re-export 数: 2/3 |
| **複雑性圧** | OK | 上限間近ファイル数: 0/5 / 複雑性ホットスポット数: 10/10 / ViewModel ファイル数: 27/30 |
| **境界健全性** | OK | Presentation→Infrastructure 違反: 0/0 / Infrastructure→Application 違反: 0/0 |
| **ガード強度** | OK | ガードテストファイル数: 47/30 / レビュー専用タグ数: 0/5 |
| **性能** | OK |  |
| **Temporal Governance** | OK | review overdue ルール数: 0/0 / heuristic + gate ルール数: 32/32 / active-debt 例外数: 1/1 / reviewPolicy 設定済みルール数: 140/92 / sunsetCondition 設定済みルール数: 9/9 / active-debt で createdAt 設定済み: 1/1 |
| **Rule Efficacy** | OK | protectedHarm 設定済みルール数: 77 / 高例外圧ルール数（≥10 件）: 0/3 / renewalCount 合計: 0/10 |

---

*正本: `references/02-status/generated/architecture-health.json` — 28 KPIs*
*詳細: `references/02-status/generated/architecture-health.md`*
