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

### 振る舞いの記述は、パイプライン改善の起点になる

本カテゴリの spec は**事実**として書くが、その事実の中には**パイプライン品質の問題**が表面化することがある。例:

- 取得経路の重複（同じデータを複数経路で取得している）
- 脆弱な fallback（上位契約で保証されるはずの値が optional 扱いで null 分岐が必要）
- 欠落した契約（readModel になっていない、型の正本が不在）
- 型の曖昧さ（2 型併存、optional / required 非対称）
- タイミング問題（初期化順序・readiness 判定の重複）
- raw レコード走査の埋没（domain 化されていない集計）

presentation 層は 4 層依存ルール（`Presentation → Application → Domain ← Infrastructure`）上、**パイプラインを直接改修する責務を持たない**。widget 側で workaround を書いたり presentation に計算を置いたりすることは、**パイプラインの改善要求を生まないため禁止**。

代わりに、観察された問題を spec の **Pipeline Concerns / Upstream Requests** セクションに**事実として記録**する。記録された concern は:

- Phase 2（真因分析）で仮説の起点になる
- Phase 3（原則候補）で新 AR rule の根拠になる
- Phase 4（改修計画）で sub-project の scope を規定する
- Phase 6（実装）で 4 ステップ pattern（新実装 → 移行 → 削除 → guard）で段階的に改善される

**改善は「全体が壊れないよう充分注意しながら段階的に進める」**（4 ステップ pattern + guard 先行。詳細は `projects/architecture-debt-recovery/plan.md` §10.5）。

> **要点**: widget は困るべきときに困る。困った事実を spec に書く。書かれた事実が上位層への改善要求になる。

### 禁止パターンと、なぜ禁止か

この原則を崩すと **局所改善** になり、**課題がすり替わる**。UI だけの都合で実装が進み、全体の一貫性が保てなくなるため。

| 禁止パターン | なぜ禁止か |
|---|---|
| widget 側で workaround を書く（fallback / null 吸収 / 独自計算） | 局所改善。同じ pipeline 問題が他 widget でも個別に workaround されて、pipeline の病理が**表面化しなくなる** |
| 「見える場所で直す」思考（UI に症状が出る → UI を直す） | 課題すり替え。症状の出る階層と原因の階層が違う場合に、症状を隠すだけで原因が残る |
| UI 都合で domain / application を変更する | 本来の pipeline 設計意図が UI の都合で歪む。**原因階層の設計は UI の要求ではなく pipeline の整合で決まる**べき |
| widget ごとに違う解決方法で同じ問題を処理 | 全体の一貫性喪失。widget A と widget B が同じ問題を違う方法で解決し、改修時に不整合化する |

### 守るべき原則

- **問題は原因の階層で解決する** — presentation で見えても、原因が application ならそこで直す
- **widget は「気づく人」であり「解決する人」ではない** — 4 層依存ルール上、presentation は observer
- widget の concern は**パイプライン全体設計の再考を起動する trigger**。個別対応ではなく、観察された複数 widget の concern を束ねて Phase 4 sub-project 化する
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
