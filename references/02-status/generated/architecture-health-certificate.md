# Architecture Health Report

## 総合判定

| 項目 | 値 |
|---|---|
| **総合評価** | **Healthy** |
| 前回比 | Improved |
| リリース影響 | No |
| 最終更新 | 2026-04-06T04:32:57.413Z |

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
| **例外圧** | OK | 許可リスト総エントリ数: 14/20 / Frozen リスト非ゼロ: 0/0 / Active リスト数: 7/10 |
| **後方互換負債** | OK | Active Bridge 数: 0/3 / 後方互換 re-export 数: 2/3 |
| **複雑性圧** | OK | 上限間近ファイル数: 0/5 / 複雑性ホットスポット数: 10/10 / ViewModel ファイル数: 27/30 |
| **境界健全性** | OK | Presentation→Infrastructure 違反: 0/0 / Infrastructure→Application 違反: 0/0 |
| **ガード強度** | OK | ガードテストファイル数: 36/30 / レビュー専用タグ数: 0/5 |
| **性能** | OK | JS バンドル合計サイズ: 6470/7000 / メインバンドルサイズ: 2218/2500 / ECharts バンドルサイズ: 919/1000 |

## Recent Changes

| 指標 | 前回 | 今回 | 変化 |
|---|---|---|---|
| Doc 更新義務違反数 | 2 | 0 | -2 + |

---

*正本: `references/02-status/generated/architecture-health.json` — 19 KPIs*
*詳細: `references/02-status/generated/architecture-health.md`*
