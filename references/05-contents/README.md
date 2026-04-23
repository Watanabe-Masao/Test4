# references/05-contents/ — 実装要素の現状把握台帳

> **位置付け**: 本カテゴリは **「改修・変更のための前提資料」** であり、**「現状把握」の台帳**である。
>
> **書くのは「振る舞い（behavior）」であって「使い方（usage）」ではない**:
>
> - ✗ NG（usage / UX 側）: 「ユーザーが店舗を選ぶと…」「管理者にとって便利な…」「画面上に見える…」
> - ✓ OK（behavior / runtime 側）: 「`allStoreResults.size > 0` で可視」「`result.daily` を chart に mapping」「`ctx.queryExecutor.isReady` が true のときだけ render される」
>
> 判断基準: 「**この widget に改修を入れる人が、事前に把握しておくべき構造的事実か？**」で取捨を決める。業務価値・ユーザー体験・画面の見え方は**書かない**（それは business 側の documentation であり、本カテゴリの責務外）。
>
> - **改修を始める人が最初に読む、構造化された事実の塊** — 型・依存・データ経路・不変条件・`co-change impact surface` を 1 ファイルで把握できることが目的
> - **ユーザー向け機能説明ではない** / **学習用の啓蒙文ではない**
>
> 「C9: 現実把握優先」（CLAUDE.md 設計原則）を、各実装要素の粒度で具体化するカタログ。
>
> 位置関係:
>
> | カテゴリ | 性質 |
> |---|---|
> | `01-principles/` | 不変的な設計原則（規範 — すべき/べきでない） |
> | `02-status/` | 生成 KPI・実態計測（health snapshot） |
> | `03-guides/` | 実装ガイド（how to） |
> | `04-design-system/` | Design System v2.1（UI 層の外部 doc layer） |
> | **`05-contents/`（本カテゴリ）** | **個別実装要素の現状台帳（what exists / how it works NOW）** |

## 現状のサブカテゴリ

| パス | 内容 | 対象 |
|---|---|---|
| `widgets/` | widget 仕様書（`WID-NNN.md`） | registry 登録された全 widget（45 件） |

将来の追加候補（decisions 不要、必要になったら増やす）:
- `charts/` — chart component 仕様書
- `read-models/` — 正本 readModel 仕様書
- `query-handlers/` — QueryHandler 仕様書

新サブカテゴリを追加する場合: 本 README + `doc-registry.json` categories + `references/README.md` 目次の 3 点同期。

## 正本区分

`05-contents/` 配下の各 spec は **「実装要素の事実記録」** であり、原則（principles）でもガイド（guides）でもない。原則との関係:

| 層 | 配置 | 扱い |
|---|---|---|
| **原則層** | `01-principles/` | 設計原則・契約定義（適用される規範） |
| **ガイド層** | `03-guides/` | 実装・運用手順書（how to） |
| **本カテゴリ**（contents 層） | `05-contents/` | 個別実装要素の契約と現状（what exists） |

したがって `05-contents/` は原則層からリンクされる側であり、原則層を引用はするが規範を生成しない。

## 3 軸の drift 防御（品質管理項目としての doc）

本カテゴリは AAG 第 9 原則「ドキュメント自体が品質管理対象」を全面採用する。ドキュメントが実装に追随しない（drift する）主な 3 モードに対し、それぞれ独立した guard を持たせる。

| 軸 | drift の種類 | 検出 guard（Phase 6 active 予定） |
|---|---|---|
| **存在** | 登録されたのに spec doc がない | `AR-CONTENT-SPEC-EXISTS` |
| **構造** | source が変わったのに frontmatter が追随していない | `AR-CONTENT-SPEC-FRONTMATTER-SYNC` + `AR-CONTENT-SPEC-CO-CHANGE` |
| **時間** | source 無変更でも放置で陳腐化 | `AR-CONTENT-SPEC-FRESHNESS` + `AR-CONTENT-SPEC-OWNER` |

「存在」だけで終わらせず、**構造 sync と freshness の両方**を必須とするのが本カテゴリの運用要件。

## frontmatter の基本スキーマ

サブカテゴリを問わず、全 spec が持つ共通メタデータ（YAML frontmatter）:

```yaml
---
# 識別
id: WID-001                              # サブカテゴリ固有の永続 ID（再利用禁止）
kind: widget                             # widget | chart | readModel | queryHandler | ...

# source 参照（機械検証対象）
sourceRef:
  registry: WIDGETS_KPI                  # 登録先 registry（widget の場合）
  path: app/src/presentation/pages/Dashboard/widgets/registryKpiWidgets.tsx
  symbol: widget-budget-achievement      # source 側の id 等

# 構造 sync（機械検証対象 — co-change guard で強制）
lastVerifiedCommit: <commit-hash>        # 直近に source と突合した commit

# 時間 drift 防御（機械検証対象 — freshness guard で強制）
owner: <role>                            # 責任 role（implementation / architecture / ...）
reviewCadenceDays: 90                    # レビュー周期（日数。超過で warn→fail）
lastReviewedAt: 2026-04-23               # 直近の人間レビュー日（ISO 日付）

# spec 自体のバージョン
specVersion: 1                           # 本 spec の schema 互換性バージョン
---
```

サブカテゴリごとの固有フィールド（例: widget の `consumedCtxFields`）は各サブカテゴリの README に定義する。

## governance 連携（既存仕組みとの接続）

| 既存機構 | 本カテゴリでの利用 |
|---|---|
| `docs/contracts/doc-registry.json` | 全 spec doc を categories に登録（存在検証） |
| `docs:check` (pre-commit / CI) | frontmatter 更新忘れを差分検出 |
| obligation map（`obligation-collector.ts`） | source path 変更 → 対応 spec の `lastVerifiedCommit` 更新義務 |
| Architecture Rule（`architectureRules.ts`） | Phase 6 で `AR-CONTENT-SPEC-*` 5 件を登録 |
| reviewPolicy パターン（`aag-core-types.ts`） | 既存 rule の `owner / lastReviewedAt / reviewCadenceDays` 概念を spec doc に流用 |

## ロードマップ（本カテゴリ固有、草稿）

| 段階 | 状態 | 内容 |
|---|---|---|
| Phase 1 addendum（本 commit） | landed | `05-contents/` / `widgets/` scaffold + 45 widget 型番割当 |
| Phase 3 原則候補 | 未着手 | `AR-CONTENT-SPEC-*` 5 件 + frontmatter generator 設計 |
| Phase 6 active | 未着手 | generator 実装 + AR rule 有効化 + 45 widget 本文量産 + co-change / freshness 強制 |

詳細は `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` を参照。
