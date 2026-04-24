# inquiry/10a — WSS concern 連結 map（Phase 2 addendum）

> 役割: Phase 2 inquiry/10 への addendum。WSS 45 widget spec（`references/05-contents/widgets/WID-001〜WID-045`）の Section 9「Pipeline Concerns」で surface した具体的 concern を、Phase 3 の原則候補（J1-J8）/ 不変条件候補（INV-J1-A〜INV-J8-A）/ 廃止候補（R-1〜R-7）に紐付ける。
>
> Phase 4 改修計画の入力として、「どの改修が何の真因 + 何の具体 concern に対応するか」の追跡を可能にする。
>
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。追加情報は `10b-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `WID-044-045` merge 後（bo7qjzyv3 push 完了直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `references/05-contents/widgets/WID-001〜WID-045`（45 spec の Section 9）+ `inquiry/12-14`（Phase 3 候補） |

## map 構造

本 addendum の章構成:

| 節 | 内容 |
|---|---|
| A | concern category 一覧（12 カテゴリ）と J/INV/R の主マッピング |
| B | 各 category の per-WID evidence table |
| C | J/INV/R の evidence strength（どの候補がどれだけの widget 事実で裏付けられているか） |
| D | J/INV/R で未カバーの concern（新候補の必要性） |

---

## A. Concern category 主マッピング

WSS 45 widget の Section 9 で surface した事実を 12 category に分類し、それぞれに対応する J / INV / R を紐付ける。

| # | Concern category | 主 J / INV / R | 主 症状群（inquiry/09） | 備考 |
|---|---|---|---|---|
| C-01 | 二重 null check pattern（isVisible + render 内） | J2 / INV-J2-A | S3-H4 | 10 widget で反復、近道の定着の typical |
| C-02 | full ctx passthrough による静的解析不能 | J2 / J4 / INV-J4-B | S3、S6-H2 | 12 widget 該当、子 ctx 依存が registry 不可視 |
| C-03 | DuckDB 3 点セット + isReady gate の反復 | J1 / J5 / INV-J4-A | S2、S3 | 7 widget（WID-024-029 + WID-037）、`queryExecutor` / `currentDateRange` / `selectedStoreIds` を 3 連 props |
| C-04 | storeKey React key pattern | （既存 G8 で部分対応、特化 J なし） | S6 | 4 widget（WID-008/014/015/016）、key strategy の共通化観点 |
| C-05 | Dashboard-local → Unified 跨ぎ linkTo | J4 / J6 | S1-H1 / S1-H2 | 7 widget、型 A → 型 B 遷移の存在 |
| C-06 | IIFE pattern（readModel ready 判定 + fallback） | J2 / J1 | S2-H2 / S3-H4 | 3 件（WID-018 × 2 + WID-021）、共通 selector 未抽出 |
| C-07 | registry 行 inline logic / hardcode | J2 / J6 | S6-H2 | WID-006（inline Array.from + 早期 null）、WID-018（IIFE）、WID-020（object literal + 3 null hardcode）、WID-040（metric ID 文字列） |
| C-08 | 1 文字 prop 名 / prop rename | （既存 F 系、専用 J なし） | — | 命名規約の揺れ。複数 widget で `d` / `r` alias、`departmentKpi→deptKpiIndex` 等 |
| C-09 | byte-identical widgets.tsx 複製 | J7 / INV-J7-A | S5-H1 | 3 複製（category/cost-detail/reports）、unified registry は pages 側のみ import |
| C-10 | core required field への null check（型/runtime 乖離） | J5 / INV-J4-B | S3-H3 | WID-033（`result != null`）、WID-031（`prevYear.hasPrevYear`）、`UnifiedWidgetContext` core required の runtime 契約不一致 |
| C-11 | page-local optional / Dashboard 固有 optional の widget 参照 | J4 / J5 / INV-J4-A | S3-H1 / S3-H2 | 5 page-local（insight × 5、costDetail × 4、category × 3）+ Dashboard 固有 optional 20 field が Unified ctx 同居 |
| C-12 | default 値の registry 層ハードコード | J2 / J1 | S2-H2 | WID-020（3 null hardcode）、WID-038（`?? []` / `?? (() => {})`）、WID-039（型 assertion + default） |

**既存 R（廃止・Reformulate）との関連**:

| R 候補 | WSS で裏付けられる事実 |
|---|---|
| R-2（G8 補強） | C-07（registry 行 inline logic）と C-02（full ctx passthrough 複雑度）が G8 の P2-P18 で未捕捉である事実を裏付け |
| R-3（G5/G6 allowlist metadata） | ConditionSummaryEnhanced 532 行（WID-001 の子）が inquiry/07 §A で hotspot 化している事実を裏付け |
| R-6（Temporal Governance reviewPolicy 必須） | C-03 の 7 例反復 / C-01 の 10 例反復 等が「rule 不在領域での pattern 定着」を示す事実を裏付け |
| R-7（barrel re-export metadata） | `RangeComparison.styles.ts` の barrel 残存（inquiry/03 §D-3）+ `SalesAnalysisWidgets` barrel re-export（inquiry/03 §特殊 3）を裏付け |

---

## B. Per-WID evidence table（主要 category 別）

各 concern category を裏付ける具体的 WID 事実。概略のみ列挙（詳細は各 WID spec の Section 9 参照）。

### C-01 二重 null check pattern（10 widget）

| WID | widget id | predicate / null check |
|---|---|---|
| WID-031 | daily-chart-shapley | `isVisible: prevYear.hasPrevYear` + render 内再判定 |
| WID-032 | insight-budget | `insightData != null` × 2 |
| WID-033 | insight-budget-simulator | `result != null` × 2（core required に null check） |
| WID-034 | insight-gross-profit | `insightData != null` × 2 |
| WID-035 | insight-forecast | `insightData?.forecastData != null` × 2 |
| WID-036 | insight-decomposition | `customerData && forecastData` × 2 |
| WID-037 | insight-pi-cv-map | `queryExecutor?.isReady` + render 内 2 field null check |
| WID-040 | costdetail-kpi-summary | `costDetailData != null` + render 内 sub-field check |
| WID-041 | costdetail-purchase | `costDetailData != null` × 2 |
| WID-042 | costdetail-transfer | `costDetailData != null` × 2 |
| WID-043 | costdetail-cost-inclusion | `costDetailData != null` × 2 |

### C-02 full ctx passthrough（12 widget）

WID-001 / WID-002（widgetCtx 二重）/ WID-004 / WID-005 / WID-007 / WID-008 / WID-009-013（helper 委譲）/ WID-014 / WID-015 / WID-016。

### C-03 DuckDB 3 点セット（7 widget）

WID-024（ANALYSIS 配置）/ WID-025-029（DUCKDB 5 件）/ WID-037（INSIGHT 配置）。全て `queryExecutor?.isReady === true` を gate。

### C-05 Dashboard-local → Unified linkTo（7 widget）

| WID | linkTo.view (+tab) |
|---|---|
| WID-002 | daily |
| WID-003 | insight / grossProfit |
| WID-011 | daily |
| WID-013 | reports |
| WID-014 | insight / budget |
| WID-015 | insight / decomposition |
| WID-020 | insight / decomposition |

### C-07 registry 行 inline logic / hardcode（主要 5 widget）

| WID | inline logic |
|---|---|
| WID-003 | registry file 内 `buildPrevYearCostMap(ctx)` helper 呼び出し |
| WID-006 | `Array.from(allStoreResults.values())` + `length < 2` 早期 null return + `storeDailyLane?.bundle.currentSeries ?? null` |
| WID-018 | IIFE × 2（`totalCustomers` / `storeCustomerMap` 導出）|
| WID-020 | inline object literal 7 field + 3 null hardcode |
| WID-040 | `typeLabel` template literal 結合 + palette 4 色 hardcode + metric ID `'totalCostInclusion'` 文字列 hardcode |

### C-10 core required field への null check（2 widget）

| WID | 事実 |
|---|---|
| WID-033 | `UnifiedWidgetContext.result: StoreResult`（required）に対して `ctx.result != null` を 2 段 check |
| WID-031 | `UnifiedWidgetContext.prevYear: PrevYearData`（required）の `hasPrevYear` で実データ有無を gate（型 = required だが実質 optional 表現） |

### C-11 page-local / Dashboard 固有 optional 参照

Dashboard 固有 optional 20 field のうち registry 行から touch される最多 touch（inquiry/02 §B-2 より再掲）:

| field | touch 数 |
|---|---|
| `queryExecutor` | 9 |
| `currentDateRange` | 8 |
| `storeKey` | 4 |
| `prevYearScope` | 4 |
| `allStoreResults` | 3 |

page-local optional の touch は inquiry/04 §B-4 の通り各 page の registry 内に限局。

---

## C. J/INV/R の evidence strength

Phase 3 候補について、WSS 事実による裏付けの強さを記録。

| 候補 | 裏付け concern | 裏付け widget 数 | evidence strength |
|---|---|---|---|
| J1（配置規約） | C-03 / C-06 / C-07 の一部 | 7+3+1 = 11 | 中（pattern 反復が明確） |
| J2（近道禁止） | C-01 / C-06 / C-07 | 10+3+5 = 18 | **強**（Phase 3 で最多裏付け） |
| J3（移行全層検証） | C-09 | 3 | 中（複製 3 件だが構造的に重い） |
| J4（page-specific / universal 分離） | C-02 / C-05 / C-11 | 12+7+20 = 39（重複カウント） | **強**（大量事実） |
| J5（page-local optional 禁止） | C-03 / C-10 / C-11 | 7+2+8 | 中〜強 |
| J6（同名 interface 並存） | WidgetDef 2 型（inquiry/04 §A） | 1（広範影響） | 弱（事象数少、影響範囲大） |
| J7（重複 / orphan 検出） | C-09 + inquiry/03 Tier D 3 件 | 3 + 3 = 6 | 中 |
| J8（reviewPolicy 必須） | C-01 / C-03 の pattern 定着が rule 時計不在を示唆 | 間接 | 中（92 件の baseline） |
| INV-J2-A（null check ≤17） | C-01 | 10（直接） | 強 |
| INV-J4-A（page-local 0） | C-11 | 5 field 該当 | 強 |
| INV-J7-A（byte-identical 0） | C-09 | 3 | 強 |
| INV-J7-B（orphan ≤3） | inquiry/03 Tier D | 3 | 強 |
| R-2（G8 補強 P20/P21） | C-07 / C-02 | 5+12 | 中〜強 |

**観察**: J2 / J4 が最多裏付け → Phase 4 で優先度高と整合（inquiry/13 §実装優先度の高位分類と整合）。J6 は事象数 1 だが `WidgetDef` 2 型並存が全 45 widget の型選択に影響する構造的重要性を持つ。

---

## D. J/INV/R で未カバーの concern（新候補の必要性）

WSS 45 widget で surface したが、Phase 3 J/INV/R で直接カバーされていない concern:

### D-1. C-04 storeKey React key pattern

- WID-008 / 014 / 015 / 016 の 4 widget が `key={ctx.storeKey}` で再マウント制御
- 共通 key strategy の欠如。現 J/INV/R には該当なし
- 処理責務: presentation（key 付与の共通 wrapper or HOC 化の検討）
- **新候補の必要性**: 低〜中。widget 数少なく、存在そのものは悪ではない。ただし散在は redundancy

### D-2. C-08 1 文字 prop 名 / prop rename

- `d` / `r` alias、`departmentKpi → deptKpiIndex` 等の命名揺れ
- 現 J/INV/R には該当なし（既存 F 系命名規約で部分カバー）
- 処理責務: presentation（coding-conventions）
- **新候補の必要性**: 低。既存 F カテゴリで cover 可能

### D-3. metric ID 文字列ハードコード（C-07 一部）

- WID-040 の `onExplain('totalCostInclusion')` リテラル hardcode
- 現 J/INV/R には type-safe MetricId の使用強制が含まれていない
- 処理責務: domain（`MetricId` 型の type-safe 参照化）
- **新候補の必要性**: 中。新 INV `INV-J2-D: metric ID リテラル禁止` として `J2` に追加検討可能

### D-4. register-scoped helper（C-07 一部）

- WID-003 の `buildPrevYearCostMap` が registry file 内定義
- pure 計算だが `domain/calculations/` にない
- J1（配置規約）で部分対応だが、registry file 内 helper を明示的に扱う rule は無い
- **新候補の必要性**: 中。J1 補強として「registry file 内の pure helper 禁止」sub-rule 案

### D-5. palette / 色 token の registry 層ハードコード（C-07 一部）

- WID-040 の `palette.blueDark` / `palette.dangerDark` / `palette.orange` / `palette.orangeDark` 4 色 registry 行記述
- 既存 Design System v2.1（`references/04-design-system/`）で chart-semantic-colors が規定されているが、registry 行での直接参照を制限する guard は無い
- **新候補の必要性**: 中〜低。DS 運用規約の補強範囲

### D-6. default 値の registry 層決定（C-12）

- WID-038 の `?? []` / `?? (() => {})`、WID-039 の型 assertion + default、WID-020 の 3 null hardcode
- J1（配置規約）/ J2（近道禁止）の両方にまたがる
- **新候補の必要性**: 中。J2 に「default 値は application 層で決定、registry 行は forward のみ」sub-rule 案

---

## E. Phase 4 改修計画への入力サマリ

### E-1. 優先度への裏付け（inquiry/13 §実装優先度への補強）

| 優先度 | 裏付け strength |
|---|---|
| 高（J7-A / J7-B / J4-A） | 全て evidence strong、事実数明確 |
| 中（J1-A / J6-A / J8-A） | J1-A は C-03 反復 7 例、J6-A は事象数少だが影響大、J8-A は間接的 |
| 低（J2-A/B/C / J1-B / J3-A） | J2-A は C-01 10 例で実は強い。低扱いは疑問符 |

**示唆**: 優先度再評価時に J2-A（null check 削減）を**中〜高**に上げる検討余地（inquiry/13 で記載した「低扱い」の根拠は baseline が曖昧だったが、本 map で 10 例を確認）。

### E-2. 未カバー concern（D-1〜D-6）の扱い

- D-1 / D-2: 既存カテゴリ補強で対応可
- D-3 / D-6: J2 の sub-rule として追加検討
- D-4: J1 の sub-rule として追加検討
- D-5: DS 運用規約で対応（本 project 外の可能性）

Phase 4 改修計画 15-18 では、J / INV / R 24 件 + 必要に応じて D-3 / D-4 / D-6 の追加 3 件を含めて sub-project 依存グラフを構築する。

## 付記

- 本 addendum は Phase 2 の延長で、Phase 3 候補の裏付け map として Phase 4 改修計画の入力になる
- J/INV/R の優先度決定や工数見積もりは本台帳では行わない（Phase 4 範囲）
- 関連: `inquiry/10`（元の相互作用）、`inquiry/12-14`（Phase 3 候補）、`references/05-contents/widgets/`（WSS spec）
