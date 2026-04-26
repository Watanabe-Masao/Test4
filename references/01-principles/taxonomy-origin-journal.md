# taxonomy-origin-journal — 全タグの Origin（Why / When / Who / Sunset）

> **役割**: 責務軸（R:_）+ テスト軸（T:_）の各タグの **採択経緯**を記録する journal。
> Constitution 原則 5「Origin は記録する」の正本。
>
> **位置付け**: 本 journal は **App Domain 層** に属する（AAG Core / App Domain / Project Overlay 分離）。
> AAG Core は registry の **型** を提供、本 journal は app 固有の vocabulary 採択経緯を保持する。
>
> **改訂規律**: 本 journal の改訂は **review window** 経由のみ（原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）。
> AI が単独でエントリを追加・改変することは禁止。
>
> **status**: **draft skeleton（Phase 1 起草中）**。実 v1 タグ採取は子 Phase 0（Inventory）で完了させ、本 journal を full populate する。Phase 1 段階では **テンプレ + skeleton + 採取 obligation** を確定させる。

## 1. 形式定義

各タグは以下の形式で 1 エントリを持つ。

```markdown
### {軸}:{tag-name}

| 項目                 | 値                                                                        |
| -------------------- | ------------------------------------------------------------------------- |
| **Why**              | <なぜこのタグが必要か>                                                    |
| **When**             | <YYYY-MM-DD or "legacy-unknown">                                          |
| **Who**              | <採択者ロール / "legacy-unknown">                                         |
| **Sunset 条件**      | <何が起きたら撤退するか>                                                  |
| **Antibody Pair**    | <対概念タグ。原則 6>                                                      |
| **promotionLevel**   | L0 / L1 / L2 / L3 / L4 / L5 / L6（OCS.5）                                 |
| **evidenceLevel**    | generated / tested / guarded / reviewed / asserted / unknown（OCS.2）     |
| **Lifecycle status** | proposed / active / deprecated / sunsetting / retired / archived（OCS.4） |

**Origin context**:
<採択時の状況・前提・制約。原則 5 の核心>

**関連 review window**:

- {YYYY-Q-N}: <window record への参照>
```

### 必須フィールド

- `Why` / `When` / `Who` / `Sunset 条件`（Constitution 原則 5）
- `Antibody Pair`（Constitution 原則 6）
- `promotionLevel`（OCS.5）
- `evidenceLevel`（OCS.2）
- `Lifecycle status`（OCS.4）

これらが欠落した entry は `AR-TAXONOMY-ORIGIN-REQUIRED` で hard fail。

### legacy-unknown の扱い

v1 から継承するタグで採択経緯が不明なものは:

- `When`: `legacy-unknown`
- `Who`: `legacy-unknown`
- `Why`: 推定理由 + 「（Phase 0 Inventory で `legacy-unknown` として採取）」と注記
- `Sunset 条件`: review window で別途検討（明示できなければ `TBD-pending-review-window`）

これは **Phase 0 Inventory で許可される唯一の例外**。新タグ（review window 経由）は legacy-unknown を使えない。

## 2. 責務軸（R:\*）— v1 タグ Origin

> **status**: 子 `responsibility-taxonomy-v2` Phase 0 Inventory（2026-04-26）完了に伴い v1 20 タグ Origin を本 journal に転記済。
> 対応 inventory 正本: `references/02-status/responsibility-taxonomy-inventory.yaml`（CanonEntry 1370 entry）
> 親 checklist Phase 1「現行 v1 の 20 タグの Origin が記入されている」+ 「既存 v1 の 20 タグが §OCS.5 Level 2（Origin-linked）到達済」を本節で達成。

### 採取対象（実測 20 タグ）

`app/src/test/responsibilityTagRegistry.ts` 配下の **現行 v1 全タグ**（採取結果 = 20 タグ）。
inventory 正本: `references/02-status/responsibility-taxonomy-inventory.yaml`（5 directories scope: application/ + domain/ + features/ + infrastructure/ + presentation/ + test/guards/、計 1370 entry）

### v1 20 タグ Origin 一覧（legacy entries — Phase 0 採取結果）

全 v1 タグは taxonomy-v2 Constitution 採択（2026-Q-N）以前に v1 registry へ採用されたもの。
採用日・採択者は記録が残っておらず一律 `legacy-unknown`（Constitution 原則 5「Origin は記録する」の遡及適用は本 Phase 0 が起点）。
Sunset 条件は子 responsibility-taxonomy-v2 Phase 6 Migration Rollout で v2 vocabulary に置換完遂すること。

| v1 R:tag          | inventory 件数  | Anchor 帰属       | Lifecycle      | promotionLevel | evidenceLevel | Origin context（推定 Why）                                                             |
| ----------------- | --------------- | ----------------- | -------------- | -------------- | ------------- | -------------------------------------------------------------------------------------- |
| `R:query-plan`    | 17              | (Anchor 外)       | active         | L2             | guarded       | DuckDB query の plan 構築責務（input 正規化・range 解決）                              |
| `R:query-exec`    | 17              | (Anchor 外)       | active         | L2             | guarded       | DuckDB query 実行 + raw row 取得責務                                                   |
| `R:calculation`   | 25              | **R:calculation** | active         | L2             | guarded       | domain/calculations/ の純粋数値計算責務（Engine Boundary §B1 authoritative）           |
| `R:data-fetch`    | (Anchor 外集計) | (Anchor 外)       | active         | L2             | guarded       | 外部 source からの取得責務（hook 経由）                                                |
| `R:state-machine` | 10              | (Anchor 外)       | active         | L2             | guarded       | UI state 遷移管理責務（reducer / selector 集約）                                       |
| `R:transform`     | 18              | (Anchor 外)       | active         | L2             | guarded       | 入力 → 出力 の純変換責務（pure function）                                              |
| `R:orchestration` | 13              | (Anchor 外)       | active         | L2             | guarded       | 複数 hook / source の調停責務（hook 内 facade）                                        |
| `R:chart-view`    | 59              | (Anchor 外)       | active         | L2             | guarded       | チャート描画 view 責務（presentation 内、Anchor R:presentation の subset 候補）        |
| `R:chart-option`  | 12              | (Anchor 外)       | active         | L2             | guarded       | echarts option builder 責務                                                            |
| `R:page`          | (Anchor 外集計) | (Anchor 外)       | active         | L2             | guarded       | page-level component（Route 受け口）                                                   |
| `R:widget`        | 26              | (Anchor 外)       | active         | L2             | guarded       | Dashboard / page widget 責務                                                           |
| `R:form`          | 12              | (Anchor 外)       | active         | L2             | guarded       | フォーム入力責務                                                                       |
| `R:navigation`    | (Anchor 外集計) | (Anchor 外)       | active         | L2             | guarded       | route / navigation 責務                                                                |
| `R:persistence`   | 2               | (Anchor 外)       | active         | L2             | guarded       | localStorage / IndexedDB 永続化責務                                                    |
| `R:context`       | 12              | (Anchor 外)       | active         | L2             | guarded       | React Context provider 責務                                                            |
| `R:layout`        | 6               | (Anchor 外)       | active         | L2             | guarded       | レイアウト primitive responsibility                                                    |
| `R:adapter`       | 4               | (Anchor 外)       | active         | L2             | guarded       | 外部 type → domain type 変換 adapter                                                   |
| `R:utility`       | 48              | (Anchor 外)       | **deprecated** | L2             | guarded       | **「捨て場」化（plan §現行 v1 の課題）。子 Phase 1 Schema 設計で廃止 or 厳密定義予定** |
| `R:reducer`       | 2               | (Anchor 外)       | active         | L2             | guarded       | useReducer reducer function 責務                                                       |
| `R:barrel`        | 5               | (Anchor 外)       | active         | L2             | guarded       | index.ts の barrel re-export 責務                                                      |

> 上表「inventory 件数」は責務軸 inventory `references/02-status/responsibility-taxonomy-inventory.yaml`
> の `summary.aggregate.tagDistribution` に対応する実測値（top-15 のみ抜粋）。
> 全件は inventory 正本を参照。
>
> **`legacy-unknown` の解消条件:** 子 Phase 5 Operations で「v1 タグ → v2 タグ」の対応関係が
> review window で承認された時点で、各 entry の `When` / `Who` が「v2 採択 review window N」に更新される。

### Phase 0 で発見された unknown vocabulary（legacy）

inventory で検出された未登録 vocabulary 20 件（registry に存在しない R:\* tag）:

- `R:guard` 16 件 — guard ファイル自身に付与（v2 では Anchor R:guard として正式採用予定）
- `R:model` 3 件 — domain model file（v2 では別 axis namespace への分離検討）
- `R:selector` 1 件 — Redux-style selector（v1 vocabulary 不整合）

子 responsibility-taxonomy-v2 Phase 1 Schema 設計でこれらの取り扱いを review window に上程する。

### Anchor Slice 5 R:tag（先行採取対象）

子 Phase 0 で **最優先で採取**する対象。Phase 1 Constitution の制度設計が完了した時点で
本 journal に entry が landing している必要がある（OCS.5 L2 到達条件）。

#### R:calculation

| 項目                 | 値                                                                            |
| -------------------- | ----------------------------------------------------------------------------- |
| **Why**              | TBD-pending-Phase-0-inventory                                                 |
| **When**             | TBD（v1 採用日が legacy-unknown の場合は `legacy-unknown`）                   |
| **Who**              | TBD                                                                           |
| **Sunset 条件**      | TBD-pending-review-window                                                     |
| **Antibody Pair**    | `R:bridge`（authoritative ↔ bridge の対称性、Constitution §3 原則 6）         |
| **promotionLevel**   | L0（Phase 0 Inventory 完了で L1、Phase 1 Origin 採取で L2）                   |
| **evidenceLevel**    | unknown（Phase 0 Inventory で `asserted` 以上に昇格、Phase J で `tested` へ） |
| **Lifecycle status** | active（v1 から継続）                                                         |

**Origin context**: TBD-pending-Phase-0-inventory（v1 registry の使用実態を採取後、推定 Why を記入）

**関連 review window**: 初回 review window（親 Phase 2 完了後）で確定

---

#### R:bridge / R:read-model / R:guard / R:presentation

同上の skeleton 形式で **Phase 0 Inventory 完了時に entry を埋める**。本 Phase 1 では entry 枠を確定させるのみ。

### Anchor Slice 以外の v1 タグ（Phase 0 Inventory で採取）

`R:store` / `R:hook` / `R:authoritative` / `R:utility` 等、Anchor Slice 外の v1 タグも子 Phase 0 で全件採取し、本 journal に entry 追加する。

`R:utility` のような **「捨て場」化したタグ**（plan.md §現行 v1 の課題で 33 件と記載）は、Phase 0 Inventory で採取後に **review window** で:

- 残置（理由を Origin context に明記）
- 撤退（`deprecated` → `sunsetting` → `retired`）
- 分割（複数の意味を持つ場合、複数の新タグに分解、各タグの Origin を新規追加）

のいずれかを裁定する。

### R:unclassified

| 項目                 | 値                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Why**              | Constitution 原則 1「未分類は分類である」の能動タグ。判断保留・review window 待ち・新規ファイルの初期状態を表す |
| **When**             | 2026-Q-N（Constitution 起草と同時、本 Phase 1 で確定）                                                          |
| **Who**              | architecture（Constitution 起草時）                                                                             |
| **Sunset 条件**      | なし（恒久タグ。撤退すると原則 1 が破綻する）                                                                   |
| **Antibody Pair**    | なし（meta-tag。他の R:\* と直交）                                                                              |
| **promotionLevel**   | L1（registry 登録後 L2 へ昇格、Phase 0 で）                                                                     |
| **evidenceLevel**    | guarded（`AR-TAXONOMY-NO-UNTAGGED` で「タグなし → unclassified」を強制）                                        |
| **Lifecycle status** | active                                                                                                          |

**Origin context**: v1 では「タグなし」と「未分類」が区別されておらず、未分類 400 件が baseline 化していた（plan.md §現行 v1 の課題）。Constitution 原則 1 で **両者を明示的に分離**するため `R:unclassified` を能動タグとして導入。

**関連 review window**: 初回 review window（Constitution 採択時）

### v2 R:tag Origin（Phase 1 採択 — 2026-04-26）

> **status**: 子 `responsibility-taxonomy-v2` Phase 1 Schema 設計（2026-04-26）完了に伴い v2 R:tag 10 件 Origin を本 journal に転記。
> 対応 schema 正本: `references/01-principles/responsibility-taxonomy-schema.md`
> 対応 registry 正本: `app/src/test/responsibilityTaxonomyRegistryV2.ts`

v1 = 20 → v2 = 10（50% 削減 / Cognitive Load Ceiling 15 まで余裕 5）。

| v2 R:tag         | tier     | Anchor | Antibody Pair    | promotionLevel | evidenceLevel | Origin Why                                                                                      |
| ---------------- | -------- | :----: | ---------------- | -------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `R:calculation`  | required |   ✅   | `R:read-model`   | L2             | guarded       | domain/calculations/ archetype: 純粋計算 + 数値契約 + 不変条件保持                              |
| `R:bridge`       | required |   ✅   | `R:hook`         | L2             | guarded       | current ⇔ candidate 境界（移行中の両側 keep）。Antibody Pair の archetype                       |
| `R:read-model`   | required |   ✅   | `R:calculation`  | L2             | guarded       | application/readModels/ archetype: Zod parse fail fast + 欠損正常系の anchor                    |
| `R:guard`        | required |   ✅   | `R:presentation` | L2             | guarded       | test/guards/ archetype: 構造制約の機械検証（meta-guard 必要）                                   |
| `R:presentation` | required |   ✅   | `R:guard`        | L2             | guarded       | 描画形状のみ・副作用なし（chart-view + widget + page + layout + form + navigation 統合）        |
| `R:store`        | required |   —    | `R:hook`         | L2             | guarded       | state container 系の統合（Zustand / Context / reducer / persistence 統合）                      |
| `R:hook`         | required |   —    | `R:store`        | L2             | guarded       | application/hooks orchestration（data-fetch / state-machine / query-plan / orchestration 統合） |
| `R:adapter`      | required |   —    | `R:bridge`       | L2             | asserted      | infrastructure 境界 adapter（DuckDB / 外部 API / 永続化）                                       |
| `R:registry`     | required |   —    | `R:calculation`  | L2             | asserted      | vocabulary / catalog / metadata 定義 file の archetype                                          |
| `R:unclassified` | sentinel |   —    | null             | L2             | reviewed      | sentinel — review window 待ちの能動タグ（原則 1）                                               |

**共通 Origin metadata（全 10 件）**:

- **When**: `2026-04-26`
- **Who**: `taxonomy-v2 子 Phase 1 Schema 設計（claude + user 承認）`
- **Sunset 条件**: 各 entry 個別に registry V2 で記載（基本「対応 mechanism が消失した場合のみ撤退検討」+ R:bridge は「全 migration project 完了 + bridge file 0 達成で撤退候補」+ R:unclassified は「なし（恒久 sentinel）」）
- **Lifecycle status**: 全 10 件 `active`

**v1 → v2 統合の概要**（schema md §3 参照）:

- `R:utility` (48) → `R:unclassified`（捨て場禁止、原則 1）
- `R:chart-view` (59) / `R:chart-option` (24) / `R:widget` (26) / `R:page` (1) / `R:layout` (6) / `R:form` (12) / `R:navigation` → `R:presentation`
- `R:query-plan` (21) / `R:query-exec` (17) / `R:data-fetch` / `R:state-machine` (10) / `R:orchestration` (13) → `R:hook`
- `R:transform` (18) → `R:read-model`（parse 系）or `R:calculation`（純粋変換）— Phase 2 で per-file 判定
- `R:context` (12) / `R:reducer` (2) / `R:persistence` (2) → `R:store`
- `R:adapter` (4) → `R:adapter`（同名 keep）
- `R:barrel` (5) → `R:unclassified`（barrel は責務を持たない）

**関連 review window**: 子 Phase 1 Schema 設計と同 window（Phase 2 Migration Path で v1→v2 per-file 判定を再 review）。

## 3. テスト軸（T:\*）— v1 TSIG 系統 Origin

> **status**: 子 `test-taxonomy-v2` Phase 0 Inventory（2026-04-26）完了に伴い TSIG global rule の Origin を本 journal に転記済。
> 対応 inventory 正本: `references/02-status/test-taxonomy-inventory.yaml`（CanonEntry 728 entry）

### 採取対象

`app/src/test/guards/testSignalIntegrityGuard.test.ts` 配下の **TSIG-\* 全 rule** + 既存テスト粗分類。

### v1 TSIG global rule Origin 一覧（legacy entries — Phase 0 採取結果）

T:kind は v2-only 概念のため v1 では「全テスト untagged」。
代わりに global obligation として TSIG-\* rule が全 test に強制適用されていた。
本表はその TSIG legacy obligation を Origin として記録する。
子 test-taxonomy-v2 Phase 8 TSIG Retirement で T:kind ベース obligation に置換完遂時に各 entry を retired へ。

| TSIG rule                  | 適用範囲（inventory 集計） | Anchor 対応 T:kind      | Lifecycle | promotionLevel | evidenceLevel | Origin context                                                                                   |
| -------------------------- | -------------------------- | ----------------------- | --------- | -------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `TSIG-TEST-01`             | 728（global 全 test）      | `T:meta-guard` (subset) | active    | L2             | guarded       | existence-only assertion 禁止（False Green 防止）。`test-signal-integrity.md` で 2026-04-13 制定 |
| `TSIG-TEST-04`             | 728（global 全 test）      | `T:meta-guard` (subset) | active    | L2             | guarded       | tautology assertion (`expect(true).toBe(true)`) 禁止                                             |
| `AR-G3-SUPPRESS-RATIONALE` | suppress 利用 test 限定    | （cross-cutting）       | active    | L2             | guarded       | `@ts-ignore` / `@ts-expect-error` / `eslint-disable` の構造化 rationale 必須化                   |
| `TSIG-COMP-03`             | suppress 利用 test 限定    | （cross-cutting）       | active    | L2             | guarded       | unused suppress escape (multi-underscore) 禁止                                                   |

> **`legacy-unknown` 解消条件:** 子 test-taxonomy-v2 Phase 6 Migration Rollout で全 test に T:kind が付与され、
> Phase 7-8 で TSIG global rule が deprecated → retired まで遷移した時点で各 TSIG entry の Sunset 完了。
>
> **inventory 件数の由来:** テスト軸 inventory `references/02-status/test-taxonomy-inventory.yaml` の
> `summary.aggregate.tsigDistribution` から取得（実測値）。

### Phase 0 で採取された Anchor Slice 6 T:kind の path-pattern 対応関係

inventory で機械検出された Anchor 帰属（path + content pattern 判定）:

| T:kind              | inventory 件数 | 検出条件                                                      | 想定 Origin（Phase 1 Schema 設計で確定）       |
| ------------------- | -------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `T:meta-guard`      | 102            | `test/guards/*.test.ts`                                       | guard 自身を守る test（guard archetype）       |
| `T:render-shape`    | 34             | `presentation/**/*.test.tsx`                                  | 描画形状検証（presentation archetype）         |
| `T:unit-numerical`  | 23             | `domain/calculations/**/__tests__/`                           | 数値契約・invariant（calculation archetype）   |
| `T:zod-contract`    | 22             | `application/readModels/**/__tests__/` または `.parse()` 言及 | parse fail fast 検証（read-model archetype）   |
| `T:contract-parity` | 20             | `*.parity.test.*` または `*Bridge*.test.*`                    | current ⇔ candidate parity（bridge archetype） |
| `T:boundary`        | 5              | filename `(boundary\|edge\|empty\|null\|missing\|invalid)`    | 境界条件検証                                   |

### Anchor Slice 6 T:kind（先行採取対象）

#### T:unit-numerical

| 項目                 | 値                                      |
| -------------------- | --------------------------------------- |
| **Why**              | TBD-pending-Phase-0-inventory           |
| **When**             | TBD                                     |
| **Who**              | TBD                                     |
| **Sunset 条件**      | TBD-pending-review-window               |
| **Antibody Pair**    | `T:render-shape`（数値検証 ↔ 形状検証） |
| **promotionLevel**   | L0（Phase 0 Inventory 完了で L1）       |
| **evidenceLevel**    | unknown                                 |
| **Lifecycle status** | active                                  |

**Origin context**: TBD-pending-Phase-0-inventory

---

#### T:boundary / T:contract-parity / T:zod-contract / T:meta-guard / T:render-shape

同上の skeleton 形式で **Phase 0 Inventory 完了時に entry を埋める**。

### T:unclassified

| 項目                 | 値                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------ |
| **Why**              | Constitution 原則 1 の能動タグ（テスト軸版）。タグなしテストと未分類テストを分離する |
| **When**             | 2026-Q-N（Constitution 起草と同時、本 Phase 1 で確定）                               |
| **Who**              | architecture（Constitution 起草時）                                                  |
| **Sunset 条件**      | なし（恒久タグ）                                                                     |
| **Antibody Pair**    | なし（meta-tag）                                                                     |
| **promotionLevel**   | L1                                                                                   |
| **evidenceLevel**    | guarded                                                                              |
| **Lifecycle status** | active                                                                               |

**Origin context**: 責務軸 `R:unclassified` と対称。タグなしテストは CI fail、`T:unclassified` は active に許容。

**関連 review window**: 初回 review window（Constitution 採択時）

### v2 T:kind Origin（Phase 1 採択 — 2026-04-26）

> **status**: 子 `test-taxonomy-v2` Phase 1 Schema 設計（2026-04-26）完了に伴い v2 T:kind 15 件 Origin を本 journal に転記。
> 対応 schema 正本: `references/01-principles/test-taxonomy-schema.md`
> 対応 registry 正本: `app/src/test/testTaxonomyRegistryV2.ts`

v2 = 15（cap）= primary 11 + optional 4。Cognitive Load Ceiling 15 cap、新規追加は既存 retirement とセットで review window 裁定。

#### Primary tier（11）

| v2 T:kind            | Anchor | 検証対象 R:tag | obligation | Antibody Pair           | promotionLevel | evidenceLevel | Origin Why                                        |
| -------------------- | :----: | -------------- | ---------- | ----------------------- | -------------- | ------------- | ------------------------------------------------- |
| `T:unit-numerical`   |   ✅   | R:calculation  | must-have  | `T:invariant-math`      | L2             | guarded       | R:calculation の数値契約 anchor                   |
| `T:boundary`         |   ✅   | R:calculation  | must-have  | `T:null-path`           | L2             | guarded       | R:calculation の境界値 anchor                     |
| `T:contract-parity`  |   ✅   | R:bridge       | must-have  | `T:fallback-path`       | L2             | guarded       | R:bridge の current⇔candidate 同一性 anchor       |
| `T:zod-contract`     |   ✅   | R:read-model   | must-have  | null                    | L2             | guarded       | R:read-model の Zod parse anchor                  |
| `T:null-path`        |   —    | R:read-model   | must-have  | `T:boundary`            | L2             | guarded       | R:read-model の欠損正常系 anchor                  |
| `T:meta-guard`       |   ✅   | R:guard        | must-have  | `T:allowlist-integrity` | L2             | guarded       | R:guard 自身の契約検証 anchor                     |
| `T:render-shape`     |   ✅   | R:presentation | must-have  | `T:side-effect-none`    | L2             | guarded       | R:presentation の描画形状 anchor                  |
| `T:state-transition` |   —    | R:store        | must-have  | `T:dependency-list`     | L2             | guarded       | R:store の state 遷移網羅性                       |
| `T:dependency-list`  |   —    | R:hook         | must-have  | `T:state-transition`    | L2             | guarded       | R:hook の useEffect deps 完全性                   |
| `T:unmount-path`     |   —    | R:hook         | must-have  | null                    | L2             | guarded       | R:hook の unmount cleanup 完全性                  |
| `T:unclassified`     |   —    | R:unclassified | may-have   | null                    | L2             | reviewed      | sentinel — review window 待ちの能動タグ（原則 1） |

#### Optional tier（4）

| v2 T:kind               | 検証対象 R:tag | obligation  | Antibody Pair       | promotionLevel | evidenceLevel | Origin Why                                                             |
| ----------------------- | -------------- | ----------- | ------------------- | -------------- | ------------- | ---------------------------------------------------------------------- |
| `T:invariant-math`      | R:calculation  | should-have | `T:unit-numerical`  | L2             | guarded       | R:calculation の数学的不変条件検証（シャープリー恒等式・合計値整合等） |
| `T:fallback-path`       | R:bridge       | should-have | `T:contract-parity` | L2             | guarded       | R:bridge の fallback 分岐到達性検証                                    |
| `T:allowlist-integrity` | R:guard        | should-have | `T:meta-guard`      | L2             | guarded       | R:guard の allowlist データ整合性検証                                  |
| `T:side-effect-none`    | R:presentation | should-have | `T:render-shape`    | L2             | guarded       | R:presentation の純粋性検証（描画は副作用を持たないこと）              |

**共通 Origin metadata（全 15 件）**:

- **When**: `2026-04-26`
- **Who**: `taxonomy-v2 子 Phase 1 Schema 設計（claude + user 承認）`
- **Sunset 条件**: 各 entry 個別に registry V2 で記載（基本「対応 R:tag が消失した場合のみ撤退検討」+ T:unclassified は「なし（恒久 sentinel）」）
- **Lifecycle status**: 全 15 件 `active`

**v1 TSIG → v2 T:kind 統合の概要**（schema md §4 参照）:

- `TSIG-TEST-01` (728 global) → 全 T:kind の Substantive Assertion 原則継承
- `TSIG-TEST-04` (728 global) → 全 T:kind の test 品質契約に統合
- `TSIG-COMP-03` (103) → `T:contract-parity` に統合（R:bridge の必須 obligation）
- `AR-G3-SUPPRESS-RATIONALE` (103) → T:kind 軸とは独立（ts-suppress comment 検証は別 layer 維持）
- 集約: v1 4 global rules → v2 11 primary T:kind (per-tag obligation) + 4 optional T:kind

**関連 review window**: 子 Phase 1 Schema 設計と同 window（Phase 2 Migration Path で TSIG→v2 per-test 判定を再 review）。

## 4. 採取 obligation（子 Phase 0 完了状況）

子 Phase 0 Inventory 完了時に、本 journal の以下が満たされている必要がある:

- [x] 全 v1 R:tag（実測 20 件）の entry が landing — §2 v1 20 タグ Origin 一覧
- [x] 全 v1 T:kind（TSIG-\* 4 件 + 既存テスト 728 件の Anchor 帰属）の entry が landing — §3 v1 TSIG global rule Origin 一覧
- [x] Anchor Slice 5 R:tag + 6 T:kind の entry が **完全状態**（TBD なし、または明示的な `legacy-unknown`）— §2 / §3 表参照
- [x] `R:unclassified` / `T:unclassified` の entry が landing（本 Phase 1 で確定）— §2.110 / §3.158
- [x] `legacy-unknown` を持つ entry の `Sunset 条件` が明示されている — §2 / §3 表 Origin context 末尾

これは子 Phase 0 checklist の対応 checkbox と相互参照する（親 checklist Phase 1 §Constitution 本体「現行 v1 の 20 タグの Origin が記入されている」+ 「既存 v1 の 20 タグが §OCS.5 Level 2（Origin-linked）到達済」+ 子 Phase 0「現行 v1 の 20 タグ全てに Origin が記入されている」 / TSIG-\* rule の全件と適用対象数が記録されている）。

**親 Phase 0 統合 branch（claude/taxonomy-v2-phase0-integration）にて landing 完遂（2026-04-26）。**

## 5. 改訂手続き

### 5.1. 新タグ追加時

1. review window で提案 + 本 journal に skeleton entry 追加（Lifecycle: `proposed`）
2. 同 window で必須 T:kind / 必須 R:tag を Interlock マトリクスに追加
3. window 承認 → Lifecycle: `active` + 本 journal の `When` / `Who` を window 開催日 / 承認者に確定

### 5.2. 既存タグの撤退

1. review window で `deprecated` 提案 → 本 journal の Lifecycle 更新 + `Sunset 条件` を確定
2. `replacedBy` を Origin context に追記（plan §OCS.4）
3. 撤退期限到達 → `sunsetting` → `retired` → `archived`

### 5.3. legacy-unknown の解消

子 Phase 0 で採取された `legacy-unknown` entry は、初回〜複数回の review window で:

- 推定 Why の確認（archive されたコミット履歴を辿る等）
- 本来の Sunset 条件の議論
- 不要なら `deprecated` へ降格

を経て **legacy-unknown が 0 件** になるまで継続。これは制度成立 5 要件の一部ではないが、原則 5「Origin は記録する」の品質指標。

## 6. 関連文書

| 文書                                                                            | 役割                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `references/01-principles/taxonomy-constitution.md`                             | 7 不可侵原則（本 journal は原則 5 の正本）                               |
| `references/01-principles/taxonomy-interlock.md`                                | R ⇔ T マトリクス（本 journal の各タグが Interlock 上の役割を持つ）       |
| `projects/taxonomy-v2/plan.md`                                                  | 親 plan §OCS.2 Evidence Level / §OCS.4 Lifecycle / §OCS.5 Promotion Gate |
| `projects/responsibility-taxonomy-v2/plan.md` Phase 0                           | 子: 責務軸 v1 タグの採取                                                 |
| `projects/test-taxonomy-v2/plan.md` Phase 0                                     | 子: テスト軸 v1 TSIG-\* の採取                                           |
| `references/02-status/responsibility-taxonomy-inventory.yaml`（Phase 0 で生成） | 採取結果の YAML 正本                                                     |
| `references/02-status/test-taxonomy-inventory.yaml`（Phase 0 で生成）           | 採取結果の YAML 正本                                                     |
| `references/02-status/taxonomy-review-journal.md`（Phase 2 で landing）         | 各 review window の追加・撤退・却下記録                                  |
| `app/src/test/guards/constitutionBootstrapGuard.test.ts`                        | 本 journal の存在 + 形式検証                                             |
