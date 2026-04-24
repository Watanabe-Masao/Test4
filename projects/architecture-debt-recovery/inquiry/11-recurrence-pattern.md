# inquiry/11 — 既存対策の回避経緯

> 役割: Phase 2 inquiry 成果物 #3。これまで作られた**既存対策（ガード / 原則 / ルール / 構造）**が、なぜ Phase 1 で surface した症状を**防げなかったか** / **どう回避されてきたか**を事実として記述する。
>
> 「気をつける」対策が再発する理由、ratchet-down の限界、allowlist の運用実態など、**再発防止策の現状**を観察する。
>
> 本ファイルは immutable。Phase 3 以降で追加情報が判明しても書き換えず、`11a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `7437c99` |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `app/src/test/guards/`（39 guard）、`app/src/test/allowlists/`、`references/01-principles/`、`references/03-guides/architecture-rule-system.md`、Phase 1 inquiry/01-08、Phase 2 inquiry/09-10 |

## A. 既存対策のカテゴリ

本 project には複数層の対策機構が既に存在する:

| カテゴリ | 所在 | 役割 |
|---|---|---|
| 設計原則 | `references/01-principles/design-principles.md`（9 カテゴリ + Q）| what を規定 |
| Architecture Rule | `app/src/test/architectureRules.ts` + `app-domain/gross-profit/rule-catalog/base-rules.ts` | 禁止 + あるべき姿 + 検出 |
| Guard test | `app/src/test/guards/*.test.ts`（39 件） | 機械的検証 |
| Allowlist | `app/src/test/allowlists/*.ts`（7 カテゴリ） | 例外の管理 |
| Generated section | `references/02-status/generated/*.json` | 現在値の正本 |
| Obligation map | `tools/architecture-health/src/collectors/obligation-collector.ts` | パス変更 → doc 更新義務 |
| ReviewPolicy | `app/src/test/aag-core-types.ts` の `ReviewPolicy` / `LifecyclePolicy` | 時間 drift 防御 |

## B. 症状を「防げたはず」の対策と、その回避経緯

### B-1. WidgetDef 2 型並存（S1）

**対策候補**:

- Architecture Rule: `AR-WIDGET-DEF-SINGLE` / `AR-REGISTRY-SINGLE-MASTER`（期待される rule 名、既存では未特定）
- Guard: 型の重複検出（同名 interface の別ファイル存在検出）

**回避経緯**:

- 現状、`WidgetDef` 同名 interface が 2 ファイルに独立定義されている事実を機械的に検出する guard は **存在しない**（inquiry/03 の Explore agent でも型重複 guard は観測されていない）
- 両方とも `readonly WidgetDef[]` として export され、TypeScript は ambient で衝突しない（別モジュール内定義のため）
- 結果として、「意識的に禁止されているわけではない」構造で定着
- 不可侵原則 #12 の「意見と事実の分離」を前提に、本対策候補は Phase 3 で AR rule 化する可能性のある項目

### B-2. UnifiedWidgetContext の page-local optional（S3）

**対策候補**:

- Architecture Rule: `AR-UNIFIED-CTX-PAGE-LOCAL-FORBIDDEN`（仮称、既存未特定）
- Guard: ctx 型定義ファイル中の「page 固有 field」検出

**回避経緯**:

- 現状、`UnifiedWidgetContext` の page-local optional field 追加を禁止する guard は **存在しない**
- ソース注記（`types.ts:88` `// ── Dashboard 固有（他ページではオプション） ──`）は人間向けのコメントで、機械検出には繋がっていない
- 5 page-local field（`insightData` / `costDetailData` / `selectedResults` / `storeNames` / `onCustomCategoryChange`）は既に定着しており、ratchet-down で減少する baseline も無い

### B-3. handler 配置の分岐（S2）

**対策候補**:

- Architecture Rule: `AR-HANDLER-LOCATION-NORMALIZE`（仮称）
- Guard: `*Handler` named export がある file の配置検証

**回避経緯**:

- 現状、`application/queries/discountFactHandler.ts` と `application/readModels/*/` の handler 配置を単一規約に寄せる guard は **存在しない**
- `references/01-principles/discount-definition.md` は「正本」を規定するが、handler の配置規約は成文化されていない（inquiry/09 S2-H2 の仮説通り）
- Architecture Rule カタログには 80+ rule が存在するが（inquiry/07 §B）、handler 配置のルールは未特定

### B-4. pure 計算の埋没（S4）

**対策候補**:

- Architecture Rule: `AR-PURE-FN-LOCATION`（仮称）
- Guard: useMemo 内の行数 / 複雑度上限、pure 抽出先の強制

**回避経緯**:

- 現状、useMemo 内の行数上限を強制する guard は **存在しない**（`responsibilitySeparationGuard` の P8 は useMemo の**個数**を制限するが、内部行数は見ていない）
- 抽出先（`domain/calculations/` / `features/*/application/pure/` / `presentation/*/helpers`）の 3 並存を禁止する guard も **存在しない**
- 結果として、95 候補が useMemo 内に残存（inquiry/05 §集計）

### B-5. byte-identical 複製と orphan 残存（S5）

**対策候補**:

- Architecture Rule: `AR-FILE-DUPLICATION-FORBIDDEN` / `AR-ORPHAN-FILE-FORBIDDEN`（仮称）
- Guard: ファイル内容のハッシュ比較、import 経路解析で orphan 検出

**回避経緯**:

- 現状、`diff` ベースでの byte-identical 検出や orphan 検出の guard は **存在しない**
- inquiry/03 で 3 件の orphan（DowGapKpiCard / PlanActualForecast / RangeComparison）を手動検出したが、これは本 Phase 1 の作業結果であって、機械検出機構の出力ではない
- byte-identical な 3 ファイル（features/\*/ui/widgets.tsx）は TypeScript コンパイル上の問題を起こさないため、自動検出の契機が無い

### B-6. 複雑性 hotspot の Dashboard 集中（S6）

**対策候補**:

- Guard: `sizeGuard` / `responsibilitySeparationGuard` P8 / complexity.hotspot.count の baseline

**回避経緯**:

- `complexity.hotspot.count` は 10/10 の境界ジャスト（inquiry/07 §B）であり、「これ以上の追加は境界突破」として機能している
- しかし、「既存 hotspot の縮小」を促す ratchet-down は緩く、10 件の hotspot が長期に安定している
- `responsibilitySeparationGuard` P8 は useMemo + useCallback ≤12 で、`useDayDetailPlan` の 11 memoCount は境界内
- 「sub-widget 畳み込み」（S6-H2）は 1 widget 内の sub-component 数を制限する guard が無いため機械検出不能

## C. 「気をつける」の残存

CLAUDE.md 設計原則 C9 / G8 は「『気をつける』で終わらせない」と明示されている:

> **原則**: 「気をつける」で終わらせない。再発を防ぐ構造（テスト、禁止事項、ROLE 改善）に変換する。

しかし、Phase 1 surface した症状のうち、以下は構造的防御（test / 禁止事項）に変換されていない:

| 症状 | 「気をつける」状態の根拠 |
|---|---|
| S1 WidgetDef 2 型並存 | 機械検出 guard なし（型重複は人間の気付き依存） |
| S3 page-local optional | ソース注記あり（`types.ts:88` コメント）、機械検出なし |
| S4 useMemo 内 pure 埋没 | コードレビューで指摘される可能性はあるが、機械的阻止なし |
| S5 byte-identical 複製 | `diff` 手動実行以外の検出経路なし |
| S6 sub-widget 畳み込み | 「1 widget 内に機能集約を避ける」規約は明文化なし |

事実: CLAUDE.md 原則と実際の guard カバレッジの間にギャップがある。

## D. ratchet-down と baseline の限界

### D-1. ratchet-down の機能範囲

`responsibilityTagGuard` の UNCLASSIFIED_BASELINE = 400、タグ不一致 BASELINE = 51（inquiry/07 §D）。
これらは「ratchet-down（減少のみ許可）」で管理されている。

**機能している事実**:
- baseline の増加は禁止されているため、新規ファイルは確実にタグ付けされる
- 減少した場合は baseline 更新を促すログが出力される（inquiry で確認した docRegistryGuard 類似）

**機能していない事実**:
- 既存の 400 未分類 / 51 タグ不一致を**減少させる**動機付けは、ratchet-down 単独では提供されない
- 減少は個別 PR で自然発生的に起きるが、計画的な bulk 減少は inquiry/12 等の原則候補提示まで発生しない

### D-2. baseline の「動かない」現象

inquiry/07 §B で複数 KPI が OK 状態（例: `complexity.hotspot.count: 10/10`、`allowlist.active.count: 6/10`、`compat.reexport.count: 2/3`）。
これらは「境界内」だが、**構造的改善を示す減少**は長期間観察されていない（本 Phase 1 の範囲では過去 commit 比較未実施、Phase 2 以降に回す）。

事実: baseline が「守られているが、動いていない」状態は、guard の検出能力が「増加の阻止」に寄っており、「構造改善の促進」が弱いことを示す。

## E. allowlist の運用実態

inquiry/07 §B より:

| KPI | value | budget |
|---|---|---|
| `allowlist.total` | 13 | 20 |
| `allowlist.active.count` | 6 | 10 |
| `allowlist.frozen.nonZero` | 0 | 0 |

本 project の `architectureRules.ts` + `allowlists/` には以下の運用規約が既に存在（CLAUDE.md より）:

- allowlist 追加時の metadata（`ruleId` / `createdAt` / `expiresAt` / `renewalCount`）
- `reviewPolicy`（owner / lastReviewedAt / reviewCadenceDays）
- `lifecyclePolicy`（introducedAt / observeForDays / promoteIf / withdrawIf）
- ratchet-down 運用の数値 baseline

**機能している事実**:

- `allowlist.total: 13/20` の余裕から、新規 allowlist 追加の余地がある
- `allowlist.frozen.nonZero: 0/0` で frozen（= 全ての allowlist が 0 件）な rule は 0 件、過剰な免除がない

**回避経緯（事実）**:

- frozen allowlist が 0 である事実は「allowlist が活発に使われている」ことを示すが、Phase 1 症状（S1-S6）に直接対応する allowlist は特定できていない
- 症状 S1-S6 は「そもそも guard が無い」領域で発生しているため、allowlist で管理される手前に位置する
- `reviewPolicy` 設定済みルール数は 0 / 92（`architecture-health.md` の `reviewPolicy` 警告、inquiry/07 §B）で、**大多数のルールに時間 drift 防御が未設定**

## F. 既存対策の抜け目サマリ

本 Phase 2 で observation した既存対策の抜け目:

| 抜け目 | 対応症状 | 事実 |
|---|---|---|
| 型重複検出 guard 不在 | S1 | `WidgetDef` 2 型並存を機械検出する機構なし |
| ctx page-local field 追加の阻止 guard 不在 | S3 | page-local optional の増殖を機械検出する機構なし |
| handler 配置規約 guard 不在 | S2 | `*Handler` export ファイルの所在を強制する guard なし |
| useMemo 内行数上限 guard 不在 | S4 | useMemo の **個数**は P8 で管理、**内部行数**は未管理 |
| byte-identical 複製検出 guard 不在 | S5 | ファイル重複を検出する機構なし |
| orphan 検出 guard 不在 | S5 | 本番 import 0 の .tsx を検出する機構なし |
| 1 widget 内の sub-component 数上限 guard 不在 | S6 | 畳み込み抑制の機械的制約なし |
| reviewPolicy 未設定 rule 92 件 | 全般 | 時間 drift 防御が 92 ルールで未実装 |

### F-1. 原則 → guard の変換率

CLAUDE.md 設計原則 9 カテゴリ + Q = 48 タグ、Architecture Rule ~140 件。しかし、上記「抜け目」は**いずれも既存 guard / AR rule で対応されていない**。

原則レベル（「気をつける」「意識する」）では CLAUDE.md や各 ROLE.md に記述されているが、**機械検出（guard / AR rule）への変換が未完了**な領域が surface した。

### F-2. Phase 6 改修への含意（事実整理のみ）

Phase 4 改修計画で、各症状の改修に伴って以下を**同時に作る**必要があることが事実として surface した:

- S1 対策として型重複検出 guard
- S3 対策として ctx page-local 追加阻止 guard
- S2 対策として handler 配置規約 guard
- S4 対策として pure 抽出強制 guard
- S5 対策として byte-identical / orphan 検出 guard
- S6 対策として sub-widget 数上限 guard

本台帳はこれら guard の設計や優先度を決定しない（Phase 3 / 4 の範囲）。surface した抜け目を事実として記録するのみ。

## 付記

- 本台帳は immutable。Phase 3 以降の追加情報は `11a-*.md` として addend する
- 関連: `inquiry/09`（仮説）、`inquiry/10`（相互作用）、`inquiry/07`（baseline / 現状値）
