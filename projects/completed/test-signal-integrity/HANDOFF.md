# HANDOFF — test-signal-integrity

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

bootstrap 直後（2026-04-13）。Phase 1〜5 の required checkbox はすべて未着手。
plan.md と checklist.md は確定し、AAG Core 側の改善 project として独立した
スコープを持っている。`presentation-quality-hardening` の coverage 70 引き上げ
（Phase 3）の **前提条件** として位置づけられている。

既存 AAG 実装との接続点は plan.md「既存 AAG 実装との接続」セクションに整理済み。
特に既存 G3 ガード（`codePatternGuard.test.ts` の `AR-G3-SUPPRESS`）は TSIG-COMP-01/02
と検出範囲が重なるため、新規ガードを並列に立てず **G3 を rationale enforcement に
拡張する** 方針が確定している。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を Phase 順に整理する。

### 高優先（Phase 1）

- Signal Integrity の思想を `references/01-principles/test-signal-integrity.md` に
  正本化する。protected harm（H1〜H4）を定義し、品質劣化テストパターン /
  compiler silencing パターンを bad/good example 付きで列挙する
- 「機械的に検知できるもの」と「advisory / review に留めるもの」の境界を先に書く
- 許容例外（smoke test / migration 中の一時 suppression / 公開契約の存在確認）を
  先に書く
- 固定レスポンスの必須項目を定義する

### 中優先（Phase 2）

- 新規 test 追加時の advisory 文面と trigger 対象パスを定義する
- advisory 自己点検項目（existence-only / render-only / snapshot-only / suppression 依存）を整理する
- advisory → hard gate 昇格条件と false positive 発生時の扱いを定義する

### 中優先（Phase 3）— 実装

> **Phase 3 着手の最初は baseline 採取**。これを skip して hard gate を投入すると
> 既存違反まで全部 fail して導入不能・なんとなく allowlist が増えて制度が緩む・
> ratchet が効かないという失敗パターンに陥る（§3.6 / checklist L35 / plan.md
> 「Discovery / Baseline 採取」参照）。

1. **最初に**: TSIG-TEST-01〜03 / TSIG-COMP-01〜03 の現状件数と代表ファイルパスを
   採取し、ratchet-down baseline を決定する
2. G3 allowlist を `app/src/test/allowlists/signalIntegrity.ts` に切り出し、
   `reason` / `removalCondition` を必須化する（TSIG-COMP-01/02 の前提作業）
3. TSIG-TEST-01 (existence-only assertion) の guard 実装
4. AR-G3-SUPPRESS の rationale 拡張サブルール（TSIG-COMP-01/02 を統合）
5. TSIG-COMP-03 (unused suppress escape) の guard 実装
6. 各 guard が `renderAagResponse()` 経由で固定フォーマットを返すこと

### 低優先（Phase 4-5）

- guide / guard-test-map / doc-registry の整備
- 運用着地確認と application-side（`presentation-quality-hardening`）への前提条件 cross-link

## 3. ハマりポイント

### 3.1. 既存 G3 ガードと並列に同じ検出を作らない

既存の `app/src/test/guards/codePatternGuard.test.ts` L359-405 にある
`AR-G3-SUPPRESS` ガードはすでに `eslint-disable` / `@ts-ignore` /
`@ts-expect-error` を **検出している**（baseline 0 / allowlist ≤ 2）。

TSIG-COMP-01/02 をゼロから新規ガードとして書くと、同じパターンを 2 回
検出することになり、二重カウント / drift / メンテナンス負債を生む。
**正解は AR-G3-SUPPRESS の subordinate rule（AR-G3-SUPPRESS-RATIONALE 等）として
rationale 必須化を追加すること**。allowlist エントリに `reason` /
`removalCondition` を必須化することで「黙らせる手段」を構造化された
rationale enforcement に格上げする。

### 3.2. 「検知できないもの」を hard gate 化しない

意味論依存のパターン（TSIG-ADV-01〜04）を hard gate 化したくなる誘惑が常に
ある。実害が出ていないのに hard fail を入れると false positive で実装者の
信頼を失い、AAG 全体の権威が落ちる。**advisory / review / Discovery Review
への逃がし先を維持することが project 成功の前提**。

### 3.3. 既存 G3 allowlist は inline。構造化を先に行う

現在 `codePatternGuard.test.ts` の G3_ALLOWLIST は inline 定義 + human readable
コメントで管理されており、machine-parseable な rationale フィールドを持たない。
Phase 3 で rationale enforcement を追加する **前** に、G3_ALLOWLIST を
`app/src/test/allowlists/signalIntegrity.ts`（新規）に切り出して
`AllowlistEntry` 型に `reason` / `removalCondition` を必須化する。
順序を逆にすると既存エントリが新スキーマと整合せず、guard が壊れる。

### 3.4. coverage 数値目標を本 project が触らない

`vitest.config.ts` の `lines: 55` を 70 に上げる作業は **明示的に
`presentation-quality-hardening` の所掌**。本 project が触ると、
- 「signal integrity が coverage 数値目標に従属している」という誤解を生む
- application-side project の意思決定動線を侵食する
- Scope を超える

文書上で「数値目標は application-side / signal integrity は AAG-side」と
分離することは Phase 5 の必須項目になっている。

### 3.5. doc-registry.json への登録漏れに注意

第 9 原則「ドキュメント自体が品質管理対象」(AAG v4.3) により、
`references/01-principles/` / `references/03-guides/` に新規文書を
追加するときは **同コミット内で `references/03-guides/doc-registry.json`
にも登録** する必要がある。obligation collector が pre-commit hook から
未登録を検出して block するため、Phase 1 / Phase 4 で文書を作るたびに
忘れず registry を更新する。

### 3.6. 推奨される補助作業: Phase 3 着手前の Discovery

required checkbox には含まれていないが、Phase 3 の guard 実装に着手する前に
**現 repo の TSIG-TEST-01〜03 / TSIG-COMP-01〜03 violation 数を採取しておく**
ことを強く推奨する。「いきなり block」を避け ratchet-down baseline を
正しく設定するための実装上の知恵。詳細は `plan.md` の「推奨される補助作業」
セクションを参照。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/test-signal-integrity/AI_CONTEXT.md` | project 意味空間の入口 |
| `projects/test-signal-integrity/plan.md` | 不可侵原則 / Phase 構造 / 既存 AAG 実装との接続 |
| `projects/test-signal-integrity/checklist.md` | required checkbox（completion 判定の唯一の入力） |
| `app/src/test/guards/codePatternGuard.test.ts` | 既存 G3 ガード — TSIG-COMP-01/02 拡張先 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | rule catalog 物理正本 — TSIG-* rule 追加先 |
| `app/src/test/architectureRules/helpers.ts` / `tools/architecture-health/src/aag-response.ts` | `renderAagResponse()` 2 ソース |
| `app/src/test/migrationTagRegistry.ts` | 段階的 rollout 管理 |
| `references/03-guides/architecture-rule-system.md` | rule 追加方法の正本 |
| `references/03-guides/project-checklist-governance.md` | project ライフサイクル規約（AAG Layer 4A） |
| `projects/presentation-quality-hardening/checklist.md` | Phase 5 で前提行を追記する application-side checklist |
| `projects/presentation-quality-hardening/HANDOFF.md` | **観測戦略の正本** — 本 project の hard gate / advisory が機能するかを実 test 追加作業で検証する |

## 5. 観測期間ログ

> 役割: `projects/presentation-quality-hardening` Phase 3 (coverage 70 達成のための
> test 追加) 作業を本 project の **観測期間** とし、hard gate / advisory が
> 実際の test 追加作業で機能するかを記録する。
>
> 観測戦略の詳細: `projects/presentation-quality-hardening/HANDOFF.md` §2

### 5.1. 観測の目的

1. Hard gate (TSIG-TEST-01 / AR-G3-SUPPRESS-RATIONALE / TSIG-COMP-03) が
   実際に bad pattern を止めるか確認
2. Advisory (`check_test_signal_advisory`) が新規 test 追加時に出るか確認
3. 機械検出可能なのに既存ルールでカバーされていない新規アンチパターンを発見
4. False positive が頻発しないことを確認 (advisory ガイド §5: < 5%)

### 5.2. 記録様式

```markdown
### YYYY-MM-DD HH:MM — <作業内容>

**試した bad pattern**: <パターン名 / コード片>
**期待される検出**: <ルール ID / なし>
**実際の挙動**: <hard gate で止まった / advisory が出た / 何も起きなかった>
**ルール側のアクション**: <そのまま / 検出ロジック改善 / 新規ルール候補 / Discovery Review>
```

### 5.3. ログ (時系列)

> 観測期間開始: 2026-04-13 (presentation-quality-hardening Phase 3 着手と同時)
>
> 終了判定:
> - false positive < 5%
> - 観測期間 ≥ 2 週間
> - Discovery Review 承認
>
> 終了後: 本 project の最終レビュー checkbox を [x] → §6.2 archive プロセス

#### 2026-04-13 — Step 3-1: HourlyChart.builders test 追加 + 2 つの真のバグ発見

**作業**: `app/src/presentation/pages/Dashboard/widgets/HourlyChart.builders.test.ts`
を新規追加。意図的に bad pattern (`expect(buildHourlySummaryStats).toBeDefined()`)
を最初に書いて TSIG-TEST-01 hard gate の動作を観測。

**期待される検出**: AR-TSIG-TEST-01 が即座に block

**実際の挙動**: ❌ **検出されなかった (false negative)** — 2 つのバグを発見:

##### Bug 1: hasMeaningfulMatcher の substring match

`/expect\([^)]+\)\.(?:toBe|toEqual|...)/` の正規表現は alternatives の後ろに
`\(` を持たないため、`toBe` が `toBeDefined` の prefix としてマッチ。
existence-only assertion を「meaningful matcher を持つ」と誤判定し false negative。

**修正**: `\(` を必須化して word boundary を作る:
`/expect\([^)]+\)\.(?:toBe|...|toBeCloseTo)\(/`

##### Bug 2: toBeNull の existence-only リスト誤包含

実装時に `hasExistenceOnly` 正規表現に `toBeNull` を含めていたが、principle
定義 (`references/01-principles/test-signal-integrity.md` TSIG-TEST-01) には
`toBeDefined` / `toBeTruthy` / `typeof` のみ。`toBeNull()` は `toBe(null)` と
等価な **意味的契約チェック** であり existence-only ではない。

**修正**: `toBeNull` を `hasExistenceOnly` 正規表現から削除。

##### Bug fix の副次的発見

bug fix を適用した結果、過去の false negative で隠れていた **legacy violations
11 件** が炙り出された。代表的なパターン:

```ts
const warning = messages.find((m) => m.level === 'warning' && m.message.includes('1/3'))
expect(warning).toBeTruthy()  // ← borderline: contract は find predicate にあるが assertion 形式は弱い
```

11 件の一括修正は scope 過多のため、**ratchet-down baseline 方式** で許容:

```ts
const TSIG_TEST_01_LEGACY_BASELINE = 11
expect(violations.length).toBeLessThanOrEqual(TSIG_TEST_01_LEGACY_BASELINE)
```

新規違反は block される。減らせたら baseline を下げる (guardTestMapConsistencyGuard
と同じ pattern)。

##### Self-test に regression test 追加

両 bug が将来再発しないよう、Self-test に 8 件の regression test を追加:
- substring match: `toBeDefined` は meaningful matcher として誤判定しない
- substring match: `toBe(6)` は meaningful matcher として認識する
- toBeNull: existence-only として誤判定しない (契約チェック)
- 等

##### bad pattern 削除後の確認

bad pattern を削除して再実行 → 11 violations、baseline 11 内 → ✅ pass。

**ルール側のアクション**:
- ✅ substring match bug 修正済
- ✅ toBeNull 過剰拡張 修正済
- ✅ legacy 11 件を ratchet-down baseline に登録
- ✅ regression test 追加 (substring + toBeNull の self-test)
- ⚠ 残課題: 11 件の legacy violations を 1 件ずつ評価して fix or 個別 allowlist 化
  (観測期間中の incremental work)

**観測の意義**: この事例は test-signal-integrity の観測戦略の **最大の成功例**。
1 つの test を書いただけで 2 つの真のバグ (false negative) と 11 件の埋もれた
violation を一気に発見した。観測戦略がなければ、これらは hard gate を信頼して
書かれた将来の test で永遠に false negative を生み続けていた。

**Protected Harm の再認識**: H1 False Green は実装者の善意では防げない。
hard gate 自体が壊れていることを発見できる仕組みが必要 = Self-test の存在意義。

#### 2026-04-13 — Step 3-1 push 時: check_format_added_files が作動

**作業**: HourlyChart.builders test を含む commit を `git push` 実行。

**期待される検出**: なし (新規 test ファイルは format 済の想定だった)

**実際の挙動**: ✅ **`check_format_added_files` (commit 7b29219 で追加した
新規追加ファイル strict format gate) が error で push を止めた**。

```
[pre-push] 新規追加ファイルが Prettier 未整形 (CI で必ず fail します)
  修正方法:
    cd app && npm run format
  または個別:
    cd app && npx prettier --write src/presentation/pages/Dashboard/widgets/HourlyChart.builders.test.ts
```

理由: 私が手で書いた test ファイルが prettier の想定 format と一部
ずれていた (line 57-58 の長い式が改行されていた等)。

**ルール側のアクション**: そのまま (機能した)

**観測の意義**: 既存の `check_format` (warn 設計) なら見逃していたが、
`check_format_added_files` (新規追加のみ error) が **新規ファイルが
unformatted のまま push される事態を確実に止めた**。これは
- shiire-arari#0de794e (前々回事件) の再発防止
- PR #1015 の format fail (commit 7b29219 の学習ソース) の再発防止
が実際に機能した第 3 の証拠。

修正手順は明示されており、`cd app && npm run format` 1 行で解決。
amend して再 push → ✅ pre-push: OK。

**累計成果 (Step 3-1 単独)**:
- TSIG-TEST-01 false negative bug 2 件発見 + 修正
- legacy violations 11 件発見 → ratchet-down baseline 化
- check_format_added_files が機能した (実証)
- Self-test に regression test 8 件追加
- HourlyChart.builders 用 component test 10 件追加

= 1 つの component test を書く作業から **5 種類の品質改善** が連動して発生。
test-signal-integrity の観測戦略は想定以上の効果を上げている。

#### 2026-04-13 — Step 3-2: InsightTabBudget.vm test 追加 (第 4 / 第 5 の発見)

**作業**: `app/src/features/budget/ui/InsightTabBudget.vm.test.ts` を新規追加。
buildBudgetTableRows の累積計算 / 入力順序 / 0 除算ガード / missing fallback /
variance 符号の contract を 15 test で検証。

##### 第 4 の発見: eslint config に coverage/ が含まれていない

`npm run lint` 実行で `coverage/` 配下の自動生成 JS files (block-navigation.js
/ prettify.js / sorter.js) が unused eslint-disable warning を出した。

- これらは Phase 3 Step 1 で coverage を local 実行するようになって初めて出現
- `coverage/` は `.gitignore` には含まれているが `eslint.config.js` の
  `globalIgnores` には含まれていなかった

**修正**: `eslint.config.js` の `globalIgnores(['dist', 'storybook-static',
'**/*.d.ts'])` に `'coverage'` を追加。

```diff
- globalIgnores(['dist', 'storybook-static', '**/*.d.ts']),
+ globalIgnores(['dist', 'storybook-static', 'coverage', '**/*.d.ts']),
```

これは Phase 3 着手 (coverage を実際に使い始めた) によって顕在化した
**設定の不整合**。観測戦略がなければ、誰かが local lint を実行して initial
で出る warnings をノイズとして無視していた可能性がある。

##### 第 5 の発見: 重複 test と未検出のアンチパターン

新規 test ファイル作成中に `coverage` 出力で
`src/presentation/pages/Insight/__tests__/InsightTabBudget.vm.test.ts` (5 test)
が既存していたことに気づいた (事前調査漏れ)。

既存 test の内容を確認すると:

```ts
expect(rows[0].discountRate).toBeDefined()
expect(rows[0].discountRateCum).toBeDefined()
```

これは:
- `expect 数が 2` で TSIG-TEST-01 の `expects.length !== 1` フィルタで skip
  されている
- すべての expect が existence-only matcher (toBeDefined)
- contract 検証としては実質的に「壊れたら気づく検証」になっていない

**新規アンチパターン候補 (= AR-TSIG-TEST-04 候補)**:

「it ブロック内の expect 数が 1 でないが、**すべて** が existence-only matcher
(`toBeDefined` / `toBeTruthy`) で構成されている」というパターン。
現在の guard は `expects.length === 1` のみ検出しており、複数 weak assertion
の組み合わせは漏れる。

**今回の対応**: 浅い 5 test を削除し、深い 15 test (新規) に統一。重複も解消。

**新規ルール昇格判断**: AR-TSIG-TEST-04 候補だが、今すぐ昇格はしない理由:
- baseline 採取が必要 (現 repo に他にも該当 pattern があるか不明)
- 観測期間中に同じ pattern を **複数回踏む** ようなら昇格優先度が上がる
- 1 件目 (本件) → 観察対象として記録、Step 3-3 以降で再発を見守る

##### Step 3-2 の test 追加内容

`buildBudgetTableRows` の 15 test:

| カテゴリ | test 数 | 検証内容 |
|---|---|---|
| 基本構造 | 3 | 単一日 / day 昇順ソート / actualCum=0 & budgetCum=0 フィルタ |
| 累積計算 | 3 | cumPrevYear / discountRateCum / フィルタ後の累積 |
| 0 除算ガード | 4 | achievement / pyDayRatio / pyCumRatio / discountRate |
| missing fallback | 2 | daily / salesDaily / budgetDaily / prevYearDailyMap |
| variance 符号 | 3 | daySales > / < dayBudget / actualCum > budgetCum |

すべて意味的契約 (具体値 / 累積一致 / NaN なし) を assertion で検証。
不可侵原則 #4 (壊れたら気づく検証) に従う。

##### Coverage delta

| metric | Before (Step 3-1 後) | After (Step 3-2 後) | delta |
|---|---|---|---|
| lines (global) | 35.01% | 35.05% | +0.04 |

vm.ts は小さい (94 行) ので影響は小さい。Step 3 全体で蓄積していく。

##### ルール側のアクション

- ✅ eslint.config.js に coverage 追加 (本 commit)
- ✅ 浅い既存 test 削除 (本 commit)
- 📝 AR-TSIG-TEST-04 候補 (multi-expect all existence-only) を観測中
- 📝 baseline 採取は Step 3 の他 vm test 完了後に検討

#### 2026-04-13 — Step 3-3: InsightTabForecast.vm test 拡張 (第 6 の発見)

**作業**: 既存 `app/src/presentation/pages/Insight/__tests__/InsightTabForecast.vm.test.ts`
(8 test) を **拡張**。computeWeeklyActuals / computeDecompPct / computeDecompTotals の
未カバー contract に 10 test 追加 (8 → 18)。

事前重複チェック: Step 3-2 の反省に従い `find -name "*.vm*"` で事前確認。
既存 file が pages/Insight/__tests__/ にあると把握してから着手。

##### 既存テストの品質評価

既存 8 test を読み込んだ結果:
- ほぼ意味的 assertion (`toBeCloseTo` / `toBe` / `Number.isFinite`)
- bug regression test も含む (`custEffect=100, ticketEffect=-100` で 0 除算)
- 削除すべき浅いテストはなかった

→ 削除ではなく **拡張** で対応。重複作成も回避。

##### 追加した contract test (10 件)

| 関数 | 追加 test | 内容 |
|---|---|---|
| computeDecompPct | 2 | custEffect 100% 寄与 / 正負混在 (絶対値ベース確認) |
| computeWeeklyActuals | 5 | txValue 計算 / customers=0 0 除算 / 空 Map / 部分 range / customers undefined |
| computeDecompTotals | 3 | 空配列 / 単一行 / cancel 効果 |

##### 第 6 の発見: Coverage delta が 0 だった

Step 3-3 の test 追加後、`npm run test:coverage` 実行:

| metric | Before | After | delta |
|---|---|---|---|
| lines (global) | 35.05% | 35.05% | **0** |

理由: forecast vm の 3 関数は既存 8 test で既に **行レベル** でカバーされて
いた。追加 10 test は **contract richness** を増やすが (= 同じ行を別の入力で
触る)、行カバレッジ % は動かない。

**Phase 3 戦略の重要な学び**:

> Coverage % を 35 → 70 に上げるには「既にカバーされたコードに contract test
> を増やす」のではなく、「**未 cover 領域 (= 0% の component / hook)** を狙う」
> 必要がある。

実用的な意味合い:
- Step 3-1 (HourlyChart.builders): 新規追加した pure function だったので
  カバー追加で coverage delta が出た (実際小さく +0.04%)
- Step 3-2 (InsightTabBudget.vm): 同様に少しの delta (+0.04%)
- Step 3-3 (InsightTabForecast.vm): **既存カバー済**、delta 0

つまり vm.ts は既に部分カバーされており、coverage を大きく動かすには
**presentation/pages/* / presentation/components/* の TSX components**
(coverage 0% の領域) を狙う必要がある。

##### Step 3 戦略の修正

HANDOFF §2 の優先順位を以下に変える (覚書):

1. ❌ vm.ts への test 追加 (delta 小さい — 1 round 終了)
2. ✅ component test (BudgetProgressCard, KpiCard 等) — coverage delta 大きい
3. ✅ pages の小さい component (TSX) を直接テスト
4. ✅ 段階的に閾値引き上げ (35 → 40 → 50 → 60 → 70)

ただし vm.ts test の追加は **品質シグナル保全 (壊れたら気づく)** 観点では
依然として価値がある (regression 検出を強化)。観測戦略の本来目的とは
矛盾しない — coverage 数値は副次的指標。

##### ルール側のアクション

- ✅ 既存 forecast vm test を 8 → 18 に拡張 (本 commit)
- 📝 Step 3-4 以降は coverage 0% 領域 (component test) を優先
- 📝 vm.ts への追加 test は contract 強化として続けるが coverage 主目的にしない

#### 2026-04-13 — Step 3-4: KpiCard component test (戦略変更の効果実証)

**作業**: Step 3-3 で発見した「coverage 0% 領域を狙う戦略変更」を実証するため、
`presentation/components/common/KpiCard.tsx` (122 行 / coverage 0%) の
component test を 24 件追加。

**期待**: vm.ts test の +0.04% vs component test の +N% で delta が大きく違う
ことを実証する。

**実際**:

| メトリック | Before (Step 3-3 後) | After (Step 3-4 後) | delta |
|---|---|---|---|
| KpiCard.tsx | 0% | **100%** | +100% (1 file) |
| All files lines (global) | 35.05% | **35.25%** | **+0.20** |
| Total tests | 5480 | 5504 | +24 |

**戦略変更の効果**:
- vm.ts test (Step 3-1〜3-3): per add で +0.04% delta
- component test (Step 3-4): per add で **+0.20% delta** = **5x 速い**

これにより Phase 3 の coverage 戦略の正当性が実証された。

##### 追加した contract test (24 件 / 6 describe)

| describe | test 数 | 検証 branch |
|---|---|---|
| 基本表示 | 4 | label / value / subText / formulaSummary |
| onClick (clickable mode) | 7 | role=button / aria-label / 「根拠」hint / click / Enter / Space / Tab 無発火 / 未指定時 |
| badge (actual / estimated) | 3 | actual / estimated / 未指定 |
| trend | 4 | up / down / flat / 未指定 |
| displayMode | 4 | hidden で value=— / hidden で trend 隠し / reference badge / isReference badge |
| warning | 3 | warning badge / hidden で非表示 / warning + isReference の優先順 |

すべて `@testing-library/react` の `screen.getByText` / `getByRole` /
`fireEvent.click` / `fireEvent.keyDown` で **実 DOM の可視結果** を検証。
不可侵原則 #4 (壊れたら気づく検証) に従う。

##### 観測の意義

Step 3-1〜3-3 の vm test とは異なる test スタイル (DOM-based component test) を
追加した結果:
- `check_test_signal_advisory` が pre-push で発火し新規 test ファイルを advisory
- TSIG-TEST-01 / -02 / -03 / TSIG-COMP-* の hard gate にすべて通過
- false positive なし
- coverage delta が大きい (vm の 5x)

= 観測戦略が「component test」というカテゴリでも機能することを実証。

##### ルール側のアクション

- ✅ KpiCard.tsx 100% カバー達成 (本 commit)
- ✅ 戦略変更の効果数値で実証 (vm 0.04 vs component 0.20)
- 📝 次の component test 候補:
  - WrapKpiCard.tsx (coverage 0%, KpiCard と同じ系統)
  - Modal.tsx (8.69%, interaction あり)
  - Toast.tsx (31.48%, partial)
  - Card.tsx (re-export only — skip)
- 📝 観測継続中。Step 3-5 以降 component を追加していく

#### 2026-04-13 — Step 3-5 〜 3-9: component test 連続追加 + 第 8 発見

**作業**: Step 3-4 の戦略変更 (component test を狙う) を実行。5 つの
component に contract test を連続追加し、閾値を 35→36 に初 ratchet up。

| Step | Component | 追加 test | Coverage | Cumulative |
|---|---|---|---|---|
| 3-5 | DataEndDaySlider.tsx | 18 | 35.25→35.43 | +0.18 |
| 3-6 | Modal.tsx | 18 | 35.43→35.65 | +0.22 |
| 3-7 | Toast.tsx | 14 | 35.65→35.94 | +0.29 |
| 3-8 | SegmentedControl.tsx | 19 | 35.94→36.08 | +0.14 |
| 3-8 | **閾値 35→36 ratchet up** | — | — | (初回) |
| 3-9 | MonthSelector.tsx | 13 | 36.08→36.31 | +0.23 |

合計 **82 件の新規 component test** で **+1.06 ポイント** (35.25→36.31)。

##### 第 8 の観測発見: 自分で tautology assertion を書いて自分で気づいた

Step 3-9 MonthSelector test 作成時に、picker overlay click の挙動を
テストしようとしたが styled-components の class 名が予測不能で overlay
element を確実に取得できない。代替として以下の assertion を書いた:

```ts
const overlays = document.querySelectorAll('[class*="Overlay"]')
// ... (何も変えない)
expect(overlays.length).toBeGreaterThanOrEqual(0) // no-op assertion
```

`length >= 0` は **常に true** (length は Number.MAX_SAFE_INTEGER まで非負)。
これは **TSIG-TEST-04 候補 (tautology assertion)** の代表例。

しかも、この観察は **事前定義した新規アンチパターン候補リスト (HANDOFF §2
Step 5) の #1 項目** に他ならない:

> | `expect(true).toBe(true)` 等の tautology assertion | regex | AR-TSIG-TEST-04 |

これで観測期間中に **2 回** tautology assertion に遭遇した (1 件目は Step 3-2
の既存 test で発見、2 件目は自分で書いてしまった)。昇格判断の根拠が積み上がっている。

**自主対応**: test ごと削除 (覆い隠すコメント残す)。Discovery Review 候補。

**ルール側のアクション**:
- 📝 AR-TSIG-TEST-04 (tautology assertion detector) の実装優先度を上げる
  - 検出 regex 候補: `expect\([^)]*\)\.toBe(GreaterThanOrEqual\(0\)|LessThanOrEqual\(Number\.MAX)`
  - `expect\([^)]*\)\.toBe(True|False|Defined)\(\)` + literal `true`/`false`/anything
  - `expect\(true\)\.toBe\(true\)` 等の完全 tautology
- 📝 baseline 採取を tautology 実装時に同時に行う (本事例 2 件を baseline に入れる?)

##### 閾値 35 → 36 ratchet up の意味

Step 3-8 commit で `vitest.config.ts` の lines 閾値を 35→36 に引き上げた。
これは Phase 3 観測期間中の **最初の ratchet up** であり:
- 不可逆的な進捗を作る
- 次回 test 削除 / regression で CI が fail する保険
- Phase 3 の達成目標 (70%) に向けた機械的な前進

Ratchet up のタイミング判断:
- 累積 delta が +1.0 を超えたら閾値+1
- margin は 0.08% (保守的)
- 細かく刻むことで後戻り耐性を高める

##### Coverage 進捗 (35.01 → 36.31)

```
Step    3-1  3-2  3-3  3-4    3-5    3-6    3-7    3-8   (threshold)  3-9
Cov     35.0 35.0 35.0 35.25  35.43  35.65  35.94  36.08 (→ 36)        36.31
Delta   +.04 +.00 +.00 +.20   +.18   +.22   +.29   +.14                +.23
Type    vm   vm   vm   comp   comp   comp   comp   comp                comp
```

- vm test x3 = +0.04
- component test x6 = +1.26 (5x 効率、戦略変更の効果)

---

#### 2026-04-13 — Step 3-15〜3-37: Pure function 大量バッチ (Wave 1〜7) — 戦略の天井確認

**作業**: pure function test を 7 wave に分けて大量追加。各 wave で 4 並列 sub-agent を
動かし、合計 **約 2,300 件の新規 test** を投入。対象は domain/calculations、
application/usecases、application/services、application/stores、infrastructure/
storage、infrastructure/dataProcessing、infrastructure/fileImport、
infrastructure/weather、features/comparison、features/category、features/forecast、
features/budget、features/sales、features/purchase、presentation/components/charts、
presentation/pages の `.vm.ts` / `.logic.ts` / `.builders.ts` / `.helpers.ts`。

**目的**: presentation-quality-hardening Phase 3 (coverage 70 達成) を pure
function だけで押し上げられるか実測。Step 3-3 の戦略変更 (component test 優先)
の正当性を反証 / 補強する反対実験。

##### Coverage 推移 (Wave 単位)

| Wave | 概算 tests | Before | After | Delta | Per-test 効率 |
|---|---|---|---|---|---|
| 0 (40% 突破) | ~230 | 38.69 | 40.08 | +1.39 | 0.006 |
| 1〜3 | ~850 | 40.08 | 43.53 | +3.45 | 0.004 |
| 4 | ~400 | 43.53 | 44.25 | +0.72 | 0.0018 |
| 5 | ~330 | 44.25 | 44.72 | +0.47 | 0.0014 |
| 6 | ~370 | 44.72 | 46.40 | +1.68 | 0.0045 |
| 7 | ~130 | 46.40 | **46.70** | +0.30 | 0.0023 |

**累積**: 38.69 → 46.70 (**+8.01 pt**) / 約 2,300 tests = 平均 **0.0035 pt/test**

##### Step 3-4 と比較した戦略の正当性

| 種別 | 概算 tests | Coverage delta | per-test |
|---|---|---|---|
| Pure function (Wave 1〜7、本セッション) | ~2,300 | +8.01 pt | **0.0035** |
| Component test (Step 3-4 KpiCard) | 24 | +0.20 pt | **0.0083** = **2.4x** |
| Component test (Step 3-5〜3-9 平均) | 82 | +1.06 pt | **0.013** = **3.7x** |

**結論 (反証実験の結果)**: Step 3-3 の「component test 優先」戦略は **完全に正当化**
された。むしろ pure function bulk アプローチの **天井は ~46% 付近** であることが
実測で確認できた (diminishing return が wave 4 以降で鮮明)。70% に到達するには
**残り ~25 ポイントの大半は component test (presentation/**/*.tsx)** で稼ぐ必要。

##### 第 9 の発見: tautology assertion 候補が決定的レベルに蓄積

Wave 1〜7 で agent が生成したテストに **`expect(result).toBeDefined()` パターンが
複数発生**。各 wave で baseline 11 → 12〜14 にスパイクし、TSIG-TEST-01 hard gate
が連続で fire。

**累計検出件数 (本セッション)**:
- Wave 4 commit 後: baseline 11 → 14 (+3) — buildPISummary, defaults, dataConversions, conditionSummaryCardBuilders
- Wave 5 commit 後: baseline 11 → 12 (+1) — loadComparisonDataAsync `origin.toBeTruthy()`
- Wave 6 commit 後: baseline 11 → 14 (+3) — defaults, dataConversions, conditionSummaryCardBuilders (再発)

**Step 3-9 までと合算**: tautology / existence-only 違反は **観測期間中 通算 9+ 回** に到達。
Step 3-9 時点で「2 回踏んだら昇格優先度を上げる」基準に達していたが、本セッションで
**5x の頻度で発生**。**AR-TSIG-TEST-04 の昇格は決定的に必要**。

候補の追加検出パターン:
- `expect(result).toBeDefined()` (元々の TSIG-TEST-01 対象)
- `expect(result.origin).toBeTruthy()` (借入 — 中身を assert していない)
- `expect(CONDITION_CARD_GROUP[id]).toBeDefined()` (loop 内 existence-only)
- `expect(TABLE_COLUMNS[name]).toBeTruthy()` (同上)
- `expect(settings.conditionConfig).toBeTruthy()` (config object の非 null だけ)
- 新パターン: `expect(typeof result).toBe('object')` 単独 — type guard 的に
  弱い (null も object)。**TSIG-TEST-04 候補に追加すべき**

##### 第 10 の発見: agent-driven test 生成の固有アンチパターン

Sub-agent が並列で生成した test 群に repeat した固有 pattern を観測:

1. **重複ファイル生成**: 同じ source に対し `__tests__/<name>.test.ts` と
   `<name>.test.ts` (sibling) の **両方** を生成。発見件数: TimeSlotChart.vm,
   StoreHourlyChartLogic, FeatureChartLogic, categoryFactorBreakdownLogic,
   WeatherCorrelationChart.vm, BudgetVsActualChart.vm, GrossProfitRateChart.vm,
   forecastToolsLogic — **計 8 件**。
   - 検出方法: `find` で同名 test が 2 path に存在
   - **新規候補**: pre-push hook で重複 test ファイルを警告 (TSIG-ADV-05 候補)
   - 暫定対応: 本セッションで全 8 件を手動削除

2. **不正な型キャスト**: agent は `as 'literal'` を機械的に使い、`as const`
   が正しい場面を見落とす。発見: keys.test.ts の `'summaryCache' as 'summaryCache'`
   (eslint `prefer-as-const` で hard-block)
   - 既存 lint rule で catch されたので新規 gate 不要

3. **interface vs string literal の取り違え**: `DataOrigin` (interface) を
   `'upload'` (string literal) として渡す pattern。tsc が catch。
   - **学び**: pre-push の tsc が機能している証拠 (CI build 不要)

4. **Function signature mismatch**: `CurrencyFormatter` (`(v: number | null) => string`)
   を `(v: number) => string` で実装。tsc 必須。発見: 複数 vm.test.ts

5. **enum value typo**: `'sameDate'` (alignment mode) と `'yoy'` (ComparisonMode)
   を取り違え。tsc が catch。
   - **学び**: 名前空間の似た enum を agent は混同しやすい

##### 第 11 の発見: check_format_added_files の**継続的有効性**

本セッション中に `check_format_added_files` が **8+ 回** push を block。
agent 生成ファイルはほぼ毎回 prettier 未整形で push されようとする。

**観測の意義**: PR #1015 で commit 7b29219 として追加した「新規追加ファイル strict
format gate」は、agent-driven 開発時代に **より重要に**。
- agent は formatting に頓着しない (model output は task に集中)
- gate がないと CI で失敗 → push 不能ループに陥る
- gate があれば local で `npm run format` 1 行で解決

→ **gate を維持すべき強い根拠** (deprecate しない)。

##### 第 12 の発見: pre-push tsc と CI build の divergence (新規調査項目)

PR #1024 で初めて発覚:
- pre-push hook の tsc は通過
- CI の `npm run build` (= `tsc -b && vite build`) で失敗
  - `ErrorBoundary.test.tsx`: TS2786 (Thrower の return 型推論)
  - `SegmentedControl.test.tsx`: TS2578 (unused @ts-expect-error)

**仮説**: pre-push の tsc は `tsconfig.app.json` のみ。CI の `tsc -b` は
project references を辿って test ファイルも含めた完全チェックを行う。

**ルール側のアクション (新規候補)**:
- 📝 pre-push の tsc を `tsc -b --noEmit` に変更して project references を辿るか調査
- 📝 もしくは `tsc -p tsconfig.test.json --noEmit` を別途追加
- 📝 不可侵原則として「pre-push を通過したら CI も通過する」を維持すべき

##### 第 13 の発見: dead file (aggregationUtilities.ts)

`src/application/query-bridge/aggregationUtilities.ts` (190 行) が
**どこからも import されていない死コード**であることを test 作成中に発見。
test 自体は書けたが、source ファイルの `@/domain/calculations/utils` import が
解決失敗 (vitest cache の問題? ではなく実際に死コードだった)。

調査結果:
- `grep -rn "from '@/application/query-bridge/aggregationUtilities'"` → 0 hit
- 機能は `src/application/query-bridge/rawAggregation.ts` に重複実装されている
- rawAggregation.ts には既存 test あり (`src/domain/calculations/rawAggregation.test.ts`)

**ルール側のアクション**:
- 📝 Discovery Review 候補: aggregationUtilities.ts の archive 提案
- 📝 一般化候補: dead file 検出 guard (静的 import grep + entry-point reachability)

##### 累積成果 (Wave 1〜7)

- Pure function tests: ~2,300 件追加 (全 green)
- Coverage: 38.69 → 46.70 (+8.01 pt)
- TSIG-TEST-01 hard gate 発火: 計 6 commit cycle 以上で機能実証
- AR-TSIG-TEST-04 候補: 検出 9+ 件、昇格根拠が決定的に
- check_format_added_files 発火: 8+ 回、有効性継続実証
- 新規アンチパターン候補: agent-specific 5 種類を発見 (重複ファイル / type cast / signature / enum / interface)
- pre-push vs CI tsc divergence: 調査タスク化
- Dead file: 1 件発見 (Discovery Review 候補)

**Phase 3 戦略の確定 (本セッションで実証完了)**:

> Pure function bulk アプローチの天井は ~46% 付近。残り 24 ポイントは
> presentation/**/*.tsx の component test と、useDuckDB / usePeriodAwareKpi
> 等の大型 hook の renderHook test でしか到達できない。

##### Coverage 進捗 (本セッション含む全景)

```
Step    3-1  3-2  3-3  3-4    3-5    3-6    3-7    3-8       3-9  3-10〜3-14  3-15〜3-37 (本セッション)
Cov     35.0 35.0 35.0 35.25  35.43  35.65  35.94  36.08→36  36.31  →37 (5 cmp)  46.70 (~2300 pure fn)
                                                  ratchet ↑                       (5 wave + manual)
Type    vm   vm   vm   comp   comp   comp   comp   comp      comp                 pure fn bulk
```

**閾値 ratchet up の機会**: 現 36→37 (Step 3-14 時点)、現実値 46.70。
margin 7+ ポイントあり、threshold を 45 まで安全に上げられる。
(本セッションでは threshold 変更コミットは未実施 — separate decision として残す)

---

_(以降の観測ログを時系列で追記)_

### 5.4. 終了条件達成時のアクション

1. checklist.md 末尾の「最終レビュー (人間承認)」 checkbox を [x] にする
2. `references/03-guides/project-checklist-governance.md` §6.2 の archive
   プロセス (8 step) を 1 commit で実行
3. 同じ commit で `projects/presentation-quality-hardening` の archive 判断も
   行う (両 project は観測戦略で連動しているため)

Archived: 2026-04-16
