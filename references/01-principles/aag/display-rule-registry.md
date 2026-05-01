# Display Rule Registry (DFR) — Layer 2 製本

> **役割**: AAG bidirectional integrity の **最初の concrete instance** として、display 領域 (chart semantic color / axis formatter / percent / currency / icon) の表示規約を articulate する canonical doc。Project B Phase 1 で landing した `SemanticTraceBinding<T>` schema + Phase 4 で landing した 4 meta-guard を utilize し、forward / reverse direction の機械検証 binding を成立させる。
>
> **Layer 位置付け**: Layer 2 (設計 / 構造方針) — 縦スライス `governance-ops` 内の display 領域 sub-domain。
>
> **drill-down pointer**:
>
> - **上位 (Layer 0+1)**: `aag/meta.md` §2 (`AAG-REQ-NON-PERFORMATIVE` + `AAG-REQ-BIDIRECTIONAL-INTEGRITY` の application)
> - **同位 (Layer 2)**: `uiux-principles.md` (UI/UX 4 原則の business-side articulation)
> - **下位 (Layer 3)**: `app-domain/gross-profit/rule-catalog/base-rules.ts` 内 `DFR-NNN` rule entry + `app/src/test/guards/displayRuleGuard.test.ts` (Project C Phase 2 + Phase 3 で landing 予定)
>
> **正本性**: 本 doc は Layer 2 製本 — DFR-001〜005 の articulate に対する単一正本。`base-rules.ts` の `DFR-NNN` rule entry は本 doc を `canonicalDocRef.docPath` で参照する。

## §1 DFR registry の意味

DFR (Display-Focused Rule) は、画面表示の **業務的意味** を構造的に維持するための規約。display 領域の drift (= 表示色 / フォーマッタ / アイコン の散在) は、実装側で気づかれにくく、UI 整合性が崩れた状態で commit が landing し続ける構造的 risk を持つ。本 registry は:

1. **canonical articulation** を Layer 2 製本として固定 (= 実装が逸脱したときに「正解」を辿る単一参照点)
2. **bidirectional integrity** の最初の concrete instance として、Project B Phase 4 で landing した `canonicalDocRefIntegrityGuard` (forward) + `canonicalDocBackLinkGuard` (reverse) で機械検証
3. **observed drift を baseline 化** することで、Project C Phase 3 で landing する `displayRuleGuard` の ratchet-down 起点として function

> **rationale**: display 規約は「文書だけで articulate される」状態だと、実装側の drift が気づかれず累積する (= performative な doc)。本 registry は Layer 3 (rule entry) + Layer 4 (guard) と双方向に bind することで、製本されたルールが canonical doc に裏打ちされ続ける状態を構造的に強制する (= AAG-REQ-NON-PERFORMATIVE + AAG-REQ-BIDIRECTIONAL-INTEGRITY)。

## §2 DFR-001: chart semantic color (実績 = 緑 / 推定 = オレンジ)

### Layer 1 source

UI/UX 原則 1「実績と推定は『別世界』」 (`uiux-principles.md` §1) — 在庫法 (緑) と推定法 (オレンジ) を視覚的に分離。

### Layer 2 articulation (本 §)

chart 内で「実績値」と「推定値」を同一視覚化軸で混在させる場合、色彩で別世界を表現する:

| value 種別      | 色 (semantic key)                      | rationale                           |
| --------------- | -------------------------------------- | ----------------------------------- |
| 実績値 (在庫法) | 緑系 (`semantic.actualCount`)          | 過去事実、検証可能                  |
| 推定値 (推定法) | オレンジ系 (`semantic.estimatedCount`) | 推定、不確実性を視覚的に articulate |
| 予算値          | グレー / 別系統                        | 計画値、実績/推定とは異なる軸       |

### bypass pattern (検出対象)

- chart component 内で `'#22c55e'` (緑) や `'#f97316'` (オレンジ) の hex を直接記述 (theme token bypass)
- `theme.palette.success` / `theme.palette.warning` を chart semantic として直接 alias (semantic 軸が `success/warning` でなく `actual/estimated` であるべき)
- 推定値を緑系で render (= 実績/推定の境界が崩れる)
- 実績値をオレンジ系で render (= 同上)

### 適用 path

`app/src/presentation/components/charts/` 配下の全 chart component (`*.tsx` + `*Logic.ts` + `*OptionBuilder.ts`)。

### migrationRecipe (Layer 3 detection 設計の起点)

1. chart 内の hex literal を grep で identify
2. 該当 hex が semantic token と乖離していないか check
3. semantic token (`presentation/theme/tokens.ts` 内の `chartSemanticColors.actualCount` / `.estimatedCount`) 経由に置換
4. baseline = identify した既存 drift 件数 (Phase 3 displayRuleGuard で固定)

### metaRequirementRefs

- `AAG-REQ-NON-PERFORMATIVE`: chart 表示の semantic 軸が canonical doc に裏打ちされ続ける状態を維持
- `AAG-REQ-BIDIRECTIONAL-INTEGRITY`: 本 rule 自身が DFR registry → base-rules.ts → guard の双方向 binding の concrete instance

## §3 DFR-002: axis formatter via useAxisFormatter

### Layer 1 source

CLAUDE.md 「コーディング規約」 — chart axis 表示の単一フォーマッタ。

### Layer 2 articulation

chart axis (X 軸 / Y 軸) のラベル format は **`useAxisFormatter` hook 経由のみ** を許容:

- 数値軸: `useAxisFormatter('number')` (区切り記号 + 単位)
- 日付軸: `useAxisFormatter('date')` (年月日 / 期間)
- パーセント軸: `useAxisFormatter('percent')` (小数第 2 位、§4 と整合)
- 通貨軸: `useAxisFormatter('currency')` (thousands separator、§5 と整合)

### bypass pattern (検出対象)

- chart component 内で `(value) => value.toLocaleString()` の inline formatter
- `(value) => Math.round(value * 100) / 100 + '%'` の inline percent formatter
- `(value) => '¥' + value` の inline currency formatter
- ECharts `formatter` field に直接 inline 関数記述 (= useAxisFormatter bypass)

### 適用 path

`app/src/presentation/components/charts/` 配下の chart axis 設定全般 (`*OptionBuilder.ts` + `*.vm.ts`)。

### migrationRecipe

1. chart の `xAxis.axisLabel.formatter` / `yAxis.axisLabel.formatter` field を grep
2. inline 関数 / `toLocaleString()` 直接呼び出しを identify
3. `useAxisFormatter` hook 経由に置換

### metaRequirementRefs

- `AAG-REQ-NON-PERFORMATIVE`: axis format の単一正本性を維持
- `AAG-REQ-LAYER-SEPARATION`: presentation 層が application 層 hook (useAxisFormatter) 経由で format を取得することを構造的に強制

## §4 DFR-003: percent via formatPercent (小数第 2 位)

### Layer 1 source

CLAUDE.md 「コーディング規約」 — パーセント表示は `formatPercent` で小数第 2 位 (canonical: `0.123` → `12.34%`)。

### Layer 2 articulation

パーセント表示は **`formatPercent` 関数経由のみ** を許容:

- 入力: `0.0` 〜 `1.0` の比率 (or `null` / `undefined`)
- 出力: 小数第 2 位の % 表記 (例: `0.1234` → `'12.34%'`)
- null 処理: `formatPercent(null)` → `'-'` (canonical な空表記)

### bypass pattern (検出対象)

- `(rate * 100).toFixed(2) + '%'` の inline 計算
- `(rate * 100).toFixed(0) + '%'` の小数第 0 位丸め (= 規約違反)
- `Math.round(rate * 100) + '%'` の inline 丸め
- `${(rate * 100).toFixed(2)}%` の template literal inline

### 適用 path

`app/src/presentation/` 配下の percent 表示全般 (chart label / table cell / KPI card / tooltip 等)。

### migrationRecipe

1. presentation 層内で `* 100` + `.toFixed(` の組み合わせを grep
2. inline 計算を identify
3. `formatPercent(rate)` 経由に置換

### metaRequirementRefs

- `AAG-REQ-NON-PERFORMATIVE`: percent format の単一正本性を維持
- `AAG-REQ-LAYER-SEPARATION`: presentation 層が format helper (formatPercent) 経由で表示を構築する構造を維持

## §5 DFR-004: currency via formatCurrency (thousands separator)

### Layer 1 source

CLAUDE.md 「コーディング規約」 — 金額表示は `formatCurrency` で整数 + thousands separator (`1234567` → `'¥1,234,567'`)。

### Layer 2 articulation

通貨表示は **`formatCurrency` 関数経由のみ** を許容:

- 入力: 整数 (or `null` / `undefined`)
- 出力: `'¥'` prefix + thousands separator + 整数表記 (例: `1234567` → `'¥1,234,567'`)
- 小数: 整数化 (`Math.round` または `Math.floor`、helper 内で確定)
- null 処理: `formatCurrency(null)` → `'-'` (canonical な空表記)
- **thousands separator は規約として強制** (本 §5 で明文化、`content-and-voice.md` の旧 "thousands-separator convention is not enforced" 記述は本 doc landing で update)

### bypass pattern (検出対象)

- `'¥' + value.toLocaleString()` の inline 構築
- `value.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })` の Intl 直接呼び出し (= helper bypass)
- `'¥' + value` の thousands separator なし表記
- `${value}円` の和文 suffix (canonical は `¥` prefix)

### 適用 path

`app/src/presentation/` 配下の通貨表示全般 (KPI card / table cell / chart label / tooltip 等)。

### migrationRecipe

1. presentation 層内で `'¥' +` または `+ '円'` を grep
2. inline 構築を identify
3. `formatCurrency(value)` 経由に置換

### metaRequirementRefs

- `AAG-REQ-NON-PERFORMATIVE`: currency format の単一正本性を維持
- `AAG-REQ-LAYER-SEPARATION`: presentation 層が format helper (formatCurrency) 経由で表示を構築する構造を維持

## §6 DFR-005: icon via pageRegistry / emoji canonical

### Layer 1 source

navigation / page identification での icon 規約 — page ごとに canonical な icon (emoji or SVG) を定義し、複数箇所で alias / fork しない。

### Layer 2 articulation

page identification icon は **`pageRegistry` 経由のみ** を許容:

- 各 page の canonical icon は `pageRegistry[pageId].icon` で定義 (emoji or SVG component)
- navigation menu / breadcrumb / page header / tab indicator など複数箇所で同一 page を表示する場合、全て `pageRegistry` を経由
- emoji の場合: canonical な emoji code 1 つに固定 (`📊` vs `📈` の混在禁止、page ごとに 1 emoji)
- SVG の場合: shared component import (= local copy の fork 禁止)

### bypass pattern (検出対象)

- navigation menu 内で emoji 直接記述 (`'📊 売上'` のような hardcode)
- 同一 page に対して別 emoji が複数箇所で使用されている (registry の意味が消失)
- SVG component が `presentation/components/icons/` の canonical 経路を bypass して個別 component に inline import

### 適用 path

`app/src/presentation/` 配下の navigation / page header / breadcrumb 全般 (`Layout.tsx` / `*Page.tsx` / `Header.tsx` 等)。

### migrationRecipe

1. emoji literal (例: `'📊'`) を presentation 層内で grep
2. 同一 page で複数 emoji が使用されているか identify
3. `pageRegistry[pageId].icon` 経由に置換 (registry 起点に集約)

### metaRequirementRefs

- `AAG-REQ-NON-PERFORMATIVE`: page icon の canonical 正本性を維持
- `AAG-REQ-ANTI-DUPLICATION`: 同一 page identification の複数経路 alias を構造的に拒否

## §7 implementation 接続 (Phase 2 + Phase 3 で landing)

本 §1〜§6 で articulate された DFR-001〜005 は、Project C Phase 2 で `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` に rule entry として登録される (`canonicalDocRef.refs[].docPath = 'references/01-principles/aag/display-rule-registry.md'`)。Phase 3 で `app/src/test/guards/displayRuleGuard.test.ts` が landing し、observed drift を baseline 化した状態で Layer 3 検証が稼働する。

完了状態 (Phase 4 後):

1. **forward direction**: `canonicalDocRefIntegrityGuard` が DFR-NNN rule entry の `canonicalDocRef.docPath` が本 doc を指すことを機械検証
2. **reverse direction**: `canonicalDocBackLinkGuard` が DFR-NNN rule entry の `metaRequirementRefs.requirementId` が `aag/meta.md` §2 に articulate 済の `AAG-REQ-*` を指すことを機械検証
3. **DFR specific**: `displayRuleGuard` が DFR-001〜005 の bypass pattern を baseline で固定し、新規 drift を hard fail で拒否
4. **`AAG-REQ-NON-PERFORMATIVE` status flip**: `aag/meta.md` §2 で「未達成」→「達成 (DFR registry で初の concrete instance 成立)」に flip

## §8 関連 doc

| doc                                                  | 役割                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `aag/meta.md` §2                                     | `AAG-REQ-NON-PERFORMATIVE` + `AAG-REQ-BIDIRECTIONAL-INTEGRITY` 要件の articulate (本 registry が application instance)                      |
| `uiux-principles.md`                                 | UI/UX 4 原則 (Layer 1 source、本 registry は §1 「実績と推定は『別世界』」を Layer 2 に articulate)                                         |
| `references/02-status/ar-rule-audit.md`              | AR-rule binding 品質基準 protocol (Project B Phase 3 deliverable、本 registry の rule entry も protocol §2 を満たす必要がある)              |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | DFR-001〜005 rule entry の物理正本 (Phase 2 で landing)                                                                                     |
| `app/src/test/guards/displayRuleGuard.test.ts`       | DFR baseline 固定 + 新規 drift 拒否 (Phase 3 で landing)                                                                                    |
| `references/03-guides/content-and-voice.md`          | thousands separator convention の articulate 起点 (本 §5 で convention を Layer 2 に固定、旧 "not enforced" 記述は本 doc landing で update) |
| `projects/completed/aag-rule-schema-meta-guard/`     | Project B (本 registry が utilize する schema + meta-guard の正本)                                                                          |
