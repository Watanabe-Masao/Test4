# v2.0 → v2.1 Changes

v2.0 は Test4 本体を見ずに書かれた**推測ベースの提案書**でした。実装を
確認した結果、いくつもの前提が誤っていることが判明。v2.1 でこれらを
修正します。

本書は今後 v2.0 の記述を見直すとき、または類似の DS 設計を他製品で
行うときの**反省文**として残します。

---

## v2.0 で誤っていた主張

### 1. 「Test4 にはライト/ダーク切替機構がない」→ 誤り

**v2.0 の主張**:
> v1 light mode overrode only a subset of tokens, so a few v1 files used
> dark-only rgba values inline

**実態**:
`app/src/BootstrapProviders.tsx` に以下が実装済み:
- `useState<ThemeMode>(getInitialTheme)` による state 管理
- `localStorage` 永続化 (`STORAGE_KEYS.THEME`)
- `ThemeToggleContext` による toggle 関数配布
- styled-components `ThemeProvider` への `darkTheme` / `lightTheme` 差し替え

v2.1 の訂正: `docs/theme-object.md` に正確な実装経路を記載。

---

### 2. 「Test4 は意味層を持っていない」→ 誤り

**v2.0 の主張**:
> The current `theme` object implicitly represents semantic tokens (bg, bg2,
> fg, fg2, border, hoverBg, etc.) but without the role names.

**実態**:
- `theme.ts` の `ThemeColors` interface は明確に role-based
- `InteractiveColors` / `ChartColors` / `ElevationTokens` として別 interface に分離
- `ChartSemanticColors` に至っては**業務概念レベルの意味層**まで実装

v2.0 は「Test4 の意味層が言語化されていないだけ」と見ていましたが、
実際はきちんと分離されていました。命名が DS 側の想定と違っただけ。

v2.1 の訂正: v2.0 が新設しようとしていた `--color-bg-*` / `--color-text-*`
を全廃し、Test4 命名 `--theme-bg` / `--theme-text` に統一。

---

### 3. 「部門色は `produce/meat/fish/deli/daily/dry/frozen/bakery` で命名」→ 誤り

**v2.0 の主張**:
> Categorical — domain palette (v2.0 addition — canonicalized)
> 部門命名を `--cat-produce` などで提案

**実態**:
Test4 のカテゴリ軸は**部門ではなく取引区分**です:
- `ti/to/bi/bo` = TI店入 / TO店出 / BI部入 / BO部出
- `daily/market/lfc/salad/kakou/chokuden/hana/sanchoku` = 業務分類
- `tenkan/bumonkan/costInclusion/other` = 集計区分

しかも全てが**グラデーション**で、単色ではありません。

v2.1 の訂正:
- `--cat-*` を全廃
- `--gradient-*` に置換（`--gradient-ti`, `--gradient-to`, ...）
- 業務用語を `docs/category-gradients.md` で明文化
- `costInclusion` と `consumable` の命名揺れを歴史的経緯として記録

---

### 4. 「CUD-safe trend トークンを新規導入」→ 誤り

**v2.0 の主張**:
> Dedicated `--color-trend-positive/negative` (CUD-safe)

**実態**:
- `tokens.ts` に既に `palette.positive/negative/caution` が定義済み
  (コメントに Wong 2011 の明記あり)
- `semanticColors.ts` (`sc.*`) に判定関数まで実装済み
- `theme.chart.semantic.positive/negative` も status 色で設定済み

v2.0 は「新しい概念」として提案していましたが、Test4 はとっくに導入済み。

v2.1 の訂正:
- `--color-trend-*` を全廃
- 代わりに `--c-positive/negative/caution` として palette 命名で記載
- `docs/trend-helpers.md` で `sc.*` の使い方を正面解説
- chart 用 positive/negative（status 緑/赤）と trend 用 positive/negative
  (CUD sky/orange) の使い分けを明記

---

### 5. 「5 段階 PR で tokens.ts を書き換える」→ 不要

**v2.0 の主張**（`docs/sync-proposal.md` + `02-routeA-sync-5-PRs.md`）:
- PR 1: palette additions
- PR 2: semantic nesting
- PR 3: light-mode parity
- PR 4: consumer migration
- PR 5: guard additions

**実態**:
- PR 1 の追加候補（`primary.deep`, `info.deep`, `category.*`）→ Test4 は
  flat 命名なので配置先が違う。`category.*` の名称も違う
- PR 2 の `theme.color.*` ネスト化 → Test4 は `theme.colors.*` で既にある
- PR 3 の light-mode parity → **既に parity 達成済み**
- PR 4 の consumer migration → 消費側 (styled-components) は既に `theme.colors.bg`
  など nested accessor を使っている
- PR 5 の guard（categoryColorLiteralGuard, trendColorGuard）→ これだけは
  まだ入っていない可能性がある（ratchet-down 系 guard の既存パターンに
  乗せれば入るが、本件の優先度は低い）

v2.1 の訂正: `sync-proposal.md` と経路 A の PR 計画を全廃。
`docs/route-b-guide.md` のみ残し、本体コード改変を提案しません。

---

### 6. 「`--c-primary-deep` / `--c-info-deep` を追加提案」→ 部分的に誤り

**v2.0 の主張**:
> palette additions: `primary.deep` = `#4338ca` を追加

**実態**:
- `primary.deep` は Test4 `tokens.ts` には存在しない
- ただし代替として `success.deep` / `warning.deep` / `danger.deep` は存在
  する（`palette.successDeep` など flat 命名）
- `purple.deep` / `cyan.deep` も存在
- primary の deep variant が無い事情はある（primary は gradient でだけ
  使うため、-deep が不要）

v2.1 の訂正:
- Test4 にある `-deep` は全て `--c-*-deep` として CSS 変数化
- `primary.deep` / `info.deep` は**追加しない**（Test4 実装に無いため）
- v2.0 の `colors_and_type.css` に書いていた `--c-primary-deep` は削除

---

## v2.0 で正しかった主張

完全に否定するのは惜しいので、当たっていた部分も記録しておきます。

1. **2 層トークン構造の価値** — Test4 は既に 2 層を実装していて、これが
   DS v2.0 の中核主張と一致。DS v2.0 は「Test4 に提案」として書いたが、
   実は「Test4 の既存方針を言語化」していた
2. **CUD safe な trend 色の重要性** — 方向性を持つ色には sky/orange の
   CUD ペアが適切、という主張は正しい
3. **ドキュメントを分割する価値** — README 1 本に詰め込むよりトピック別に
   分けた方が読みやすい
4. **本体と DS の命名を揃える意志** — v2.1 でも原則として維持

---

## 残タスク: v2.0 に書いた guard 追加案

5 PR 計画のうち **PR 5 (guard 追加)** だけは v2.1 でも検討価値があります:

- `categoryColorLiteralGuard` — hex 部門色（`#22c55e` 他）が
  `presentation/` 配下にインライン出現するのを禁止
- `trendColorGuard` — factor/comparison/yoy/diff 配下で
  `palette.successDark` / `palette.dangerDark` を trend 色として使うのを
  禁止（`sc.*` を強制）

ただし本件の優先度は高くなく、v2.1 本編では**提案のみの扱い**で本体への
PR は出しません。必要になったときに `references/03-implementation/guard-test-map.md`
のパターンに乗せて追加する形で構いません。

---

## Learnings

この経験からの一般的教訓:

### 1. 本体を見ずに提案書を書かない

v2.0 は理論的に筋が通っていても、実装の前提を確認しないと現実とズレる。
DS を書く前に、必ず本体の既存実装を**全ファイル**読む（少なくとも theme/
配下は完全に）。

### 2. DS は本体の後追いで正しい

DS は「本体がこうあるべき」という未来の提案ではなく、「本体は今こう
なっている」という現状の documentation として書くのが第一正解。提案書
として書くなら、本体実装と**明確に分けて**書く。

### 3. 命名の違いは発見の窓

v2.0 と実装の命名差異（`--color-bg-base` vs `theme.colors.bg`、
`produce` vs `ti`）は、DS と本体で世界観が違うサインでした。命名が違う
＝ 思想が違う可能性を常に疑う。

### 4. 業務ドメイン語彙を尊重する

`ti/to/bi/bo` や `chokuden` `sanchoku` `bumonkan` のような略号は、
外部から見れば理解困難ですが、現場ユーザーには読みやすい略語です。DS が
勝手に「綺麗な英名」に置き換えようとするのは傲慢で、本体と同期を失います。

### 5. ChartSemanticColors のような発明は尊重して documentation する

Test4 が独自に作っていた「業務概念 → 色」のマッピングは、DS では見逃され
やすいが、実運用では最も価値のある層です。DS はこうした**既存発明を
中央化して可視化**するのが仕事。
