# references/ ドキュメントガイド

## 読み方

| ディレクトリ | 内容 | 更新頻度 |
|---|---|---|
| `01-principles/` | 安定原則（Engine 境界、設計思想、禁止事項） | 低 |
| `02-status/` | 現在地（maturity、promotion、品質監査） | 中 |
| `03-guides/` | 実装共通規約（compare、bridge、invariant test） | 中 |
| `04-engines/` | engine 別の詳細（README が入口） | 高 |
| `99-archive/` | 旧文書の圧縮要約（現行では参照しない） | なし |

## 正本一覧

| テーマ | 正本 |
|---|---|
| Engine 境界・3 エンジン定義 | `01-principles/engine-boundary-policy.md` |
| JS vs DuckDB 責務 | `01-principles/engine-responsibility.md` |
| 設計思想 16 原則 | `01-principles/design-principles.md` |
| 禁止事項 9 件 | `01-principles/prohibition-quick-ref.md` |
| Engine maturity 定義 | `02-status/engine-maturity-matrix.md` |
| Engine 昇格状況 | `02-status/engine-promotion-matrix.md` |
| 昇格基準 | `02-status/promotion-criteria.md` |
| Compare 共通規約 | `03-guides/compare-conventions.md` |
| 不変条件カタログ | `03-guides/invariant-catalog.md` |
| MetricId レジストリ | `03-guides/metric-id-registry.md` |
| 各 engine の現在地 | `04-engines/<engine>/README.md` |

## AI 向け注記

- 原則を知りたい → `01-principles/`
- 今どこまで進んでいるか → `02-status/` + `04-engines/*/README.md`
- 実装の作法 → `03-guides/`
- 特定 engine の詳細 → `04-engines/<engine>/`
- `99-archive/` は現行の判断に使わない
