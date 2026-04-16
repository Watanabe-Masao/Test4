# Critical Path Acceptance Suite — unify-period-analysis

> 役割: PR 計画の上に重ねる「壊れない移行」のための受け入れテスト層の設計書。
> 名称候補: Critical Path Acceptance Suite / Preset-to-FreePeriod Parity Suite。
>
> 参照: `references/01-principles/critical-path-safety-map.md`,
> `references/01-principles/free-period-analysis-definition.md`,
> `references/01-principles/safe-performance-principles.md`

## なぜ必要か

PR 計画（`pr-breakdown.md`）は入口 / 比較 / 取得 / 集計 / 表示の分離として
かなり良いが、それだけだと各 PR が局所的に正しくても、
`DB → handler → summary → read model → VM` を通したときに意味がずれる
危険が残る。

このリポジトリ自身も、重要領域を Safety Tier で分けており:
- 自由期間分析: **Tier A**（取得・計算正本）
- 比較意味論: **Tier B**

つまり、ここは単体テストより一段強い検証が必要な領域。

今の不安定性の本体は、局所ロジックのミスというより「値の意味が中継層で
痩せること」。計算エンジンが「心臓」、hook → store → ViewModel → UI が
「血管」で、心臓が正しくても血管が壊れると表示値は壊れる。

必要なのは「血管を通した後も意味が変わっていないか」を監視するテスト。
これがあると PR 1〜5 の各段階で局所改善が全体劣化を生んでいないかを
機械的に見られる。

## 何をやるか

固定期間 preset と自由期間 frame の両方から、同じ代表ケースを流し込み、
次の 4 点を **エンドツーエンドに近い粒度** で検証する。

### 1. Frame が正しく作られるか

preset から生成された `anchorRange` と `comparison` が期待通りか。

### 2. 取得 rows が正しいか

`readFreePeriodFact()` が current / comparison の対象行を正しく引けているか。
自由期間分析ではここが取得正本。

### 3. summary が正しいか

`computeFreePeriodSummary()` が合計・日数・客数・平均日販などを正しく出すか。
自由期間分析ではここが計算正本。

### 4. comparison provenance が壊れていないか

`mappingKind`, `fallbackApplied`, `comparisonRange` などが正しく
伝搬しているか。比較意味論は Tier B なので、値だけでなく由来も見るべき。

## 代表ケース（最初は 5 つで十分）

| # | ケース | 種別 | 狙い |
|---|---|---|---|
| 1 | 今月、比較なし | 固定期間 preset | preset → frame 変換の基本形 |
| 2 | 今月 vs 前月 | 固定期間 preset | `previousPeriod` resolver |
| 3 | 今月 vs 前年同期間 | 固定期間 preset | `sameRangeLastYear` resolver |
| 4 | 月跨ぎレンジ | 自由期間 | anchorRange が月単位前提でないことの検証 |
| 5 | 店舗 subset + fallback 発生 | 自由期間 | `fallbackApplied` / provenance 伝搬 |

## 各ケースで固定する出力

毎回次を固定で比較する:

- `FreePeriodAnalysisFrame`
- `currentRows` / `comparisonRows`
- `currentSummary` / `comparisonSummary`
- `provenance`
- `fallback metadata`

## テストの形（3 層）

このリポジトリの方針と相性がいいのは次の 3 層。

### 1. Golden fixture

小さな固定データセットを置く。自由期間分析は日別×店舗粒度なので、
**3〜5 店舗、10〜20 日ぶん**で十分。

### 2. Reference check

SQL 最適化や比較 resolver の変更後でも、期待する summary と provenance が
一致するかを見る。critical path safety map でも、Tier A 領域には
reference implementation + property test + metamorphic test を持たせる
方向が明示されている。

### 3. Metamorphic check

次のような性質を確認する:
- `storeIds` の順番を変えても結果が同じ
- preset で作った今月 range と、同じ range を自由期間手入力した結果が同じ
- current と comparison を入れ替えたとき provenance が整合する

## この一手で何が変わるか

計画が「実装順の計画」から **壊れない移行計画** に変わる。特に効くのは:

- preset 統合で意味が崩れていないか確認できる（PR 1）
- `ComparisonScope` 移行で比較意味論が維持されているか確認できる（PR 2）
- `readFreePeriodFact()` 一本化の副作用を検出できる（PR 3）
- SQL / JS の責務整理後に summary が変わっていないか確認できる（PR 4）
- chart 手前の ViewModel 改修で provenance が失われていないか確認できる（PR 5）

## PR 計画との関係

この Acceptance Suite は **PR 1 着手前に最低限の骨格を入れる** のが理想。

| 段階 | Suite の扱い |
|---|---|
| PR 0 (事前) | Golden fixture + ケース 1〜2 の骨格テストを追加 |
| PR 1 | frame 変換ケースを追加。ケース 1〜2 が通ることを受入基準に含める |
| PR 2 | comparison provenance の期待値を追加。ケース 2〜3 を完全化 |
| PR 3 | rows / summary の期待値を追加。ケース 4〜5 を完全化 |
| PR 4 | SQL / JS 責務整理後も全ケースが回帰しないことを確認 |
| PR 5 | ViewModel 層も含めた end-to-end 版を追加 |

## 設計上の注意

- **Suite は生成テストにしない** — 期待値は明示的に書く。自動生成すると
  回帰の検出力が落ちる
- **fixture は `app/src/test/fixtures/freePeriod/` などに集約** — 散在させ
  ない
- **DuckDB を起動する E2E 版と、pure JS で summary を検証する unit 版を
  分ける** — CI 時間を守るため
- **Tier A の invariant**（合計一致・シャープリー恒等式など）は既存の
  guard / observation test に任せ、本 Suite は「preset と free-period が
  同じレーンを通るか」の検証に集中する

## 次のステップ

必要に応じて、この Acceptance Suite の **ケース一覧と期待値項目** をさらに
具体化した fixture 設計書を別途作成する。
