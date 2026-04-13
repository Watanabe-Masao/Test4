# HANDOFF — presentation-quality-hardening

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 1〜3 (E2E 拡充まで) は完了済み。残るは Phase 3 の coverage 拡充 +
component test 追加 + 閾値引き上げ + test:e2e CI 検証 (5 checkbox)。**

完了済 (PR #1020 マージ済):

- Phase 1: WeatherPage active-debt 解消 (4/4) — `useWeatherDaySelection` 抽出済
- Phase 2: 500 行超コンポーネントの `.vm.ts` 抽出 (4/4)
  - HourlyChart.tsx: 501 → 486 行 (`buildHourlySummaryStats` + `formatSelectedHoursLabel`)
  - InsightTabBudget.tsx: 581 → 342 行 (`GrossProfitTabContent` を `InsightTabGrossProfit.tsx` に切り出し)
  - InsightTabForecast.tsx: 514 → 368 行 (`DecompositionTabContent` を `InsightTabDecomposition.tsx` に切り出し)
- Phase 3 部分: E2E spec 4 件 → 12 件 (全 10 standard ページ網羅)

derivedStatus: in_progress / 9 of 15 (60%)

## 2. 次にやること — 観測期間 (Phase 3 残 5 checkbox + test-signal-integrity 検証)

### 戦略の核心: 2 project の同時検証

```
presentation-quality-hardening Phase 3 (coverage 70 達成のための test 追加)
                  ⇅
        ↑ 観測対象 ↑
                  ⇅
test-signal-integrity (品質シグナル保全の hard gate + advisory) が機能するか
```

実際に component test を書く作業そのものを **test-signal-integrity の
観測期間** とする。良い test を書こうとする過程で:

1. Hard gate (TSIG-TEST-01 / AR-G3-SUPPRESS-RATIONALE / TSIG-COMP-03) が
   実際に bad pattern を止めるか確認
2. Advisory (`check_test_signal_advisory`) が新規 test 追加時に出るか確認
3. 機械検出可能なのに既存ルールでカバーされていない新規アンチパターンを発見
4. False positive が頻発しないことを確認

観測期間後:
- false positive < 5% かつ有効事例があれば
- → `test-signal-integrity` の最終レビュー checkbox を [x] → §6.2 archive
- → `presentation-quality-hardening` も最終レビュー section 追加 → archive

### 作業手順 (7 段階、commit を分ける)

#### Step 1: vitest.config.ts に `presentation/` を coverage include に追加 (1 commit)

現状の coverage include は `domain/ + infrastructure/ + application/` のみ。
`presentation/` を追加するが **閾値はまだ変えない**。

```diff
include: [
  'src/domain/**',
  'src/infrastructure/**',
  'src/application/**',
+ 'src/presentation/**',
],
```

→ `npm run test:coverage -- --reporter=text-summary` で現状値を baseline 採取。

#### Step 2: 観測ログ section を準備 (本 commit と同時)

`projects/test-signal-integrity/HANDOFF.md` に「観測期間ログ」section を追記。
時系列で以下を記録:
- 試した bad pattern → hard gate / advisory に止められた
- 試した bad pattern → 何も検知されなかった (= 新規ルール候補)
- false positive (gate が誤検知) (= rule 改善候補)
- グレーパターン (Discovery Review に持ち込む候補)

#### Step 3: component test を段階的に追加 (複数 commits、優先順)

| # | 対象 | 種別 | 理由 | 優先度 |
|---|---|---|---|---|
| 1 | `HourlyChart.builders.ts` の `buildHourlySummaryStats` / `formatSelectedHoursLabel` | pure function | Phase 2-A で新規追加、契約検証が容易 | ★★★ |
| 2 | `InsightTabBudget.vm.ts` の `buildBudgetTableRows` | pure function | 累積計算ロジック、未テスト | ★★★ |
| 3 | `InsightTabForecast.vm.ts` の `computeWeeklyActuals` / `computeDecompPct` / `computeDecompTotals` | pure function | 既存 vm、契約検証が容易 | ★★★ |
| 4 | `useWeatherDaySelection.ts` (Phase 1 抽出 hook) | hook | callback 6 件の挙動 | ★★ |
| 5 | `BudgetProgressCard` 等の純粋表示 component | component | プレゼン層代表 | ★★ |
| 6 | `KpiCard` / `KpiGrid` 等の汎用 component | common | 共通 component | ★ |
| 7 | `EChart.tsx` chart wrapper | adapter | DOM 統合境界 (smoke EX-02 候補) | ★ |

各 test 追加 commit で:
- ❶ 最低 1 つの **bad pattern を意図的に書いてみる** (existence-only / multi-underscore / rationale-free suppression 等) → hard gate / advisory が止めることを確認 → 観測ログに記録
- ❷ 直してから commit
- ❸ 観測ログに「pattern X を試した → ルール Y で止まった (or 何も起きなかった)」を追記

#### Step 4: 段階的な coverage 閾値引き上げ (複数 commits)

```
55 → 60 → 65 → 70
```

各引き上げの **前** に `npm run test:coverage` で現在値を確認。閾値を超えていれば
引き上げて 1 commit。**閾値が先行して CI を赤くしないこと** (plan.md 不可侵原則 #1)。

#### Step 5: 発見した新規アンチパターンを hard gate / advisory に昇格 (発見次第)

機械検出可能で、test-signal-integrity の guard で捕まえるべきだったのに
捕まえられなかったパターンを発見したら:

| 候補 | 検出方法 | 昇格先 |
|---|---|---|
| `expect(true).toBe(true)` 等の tautology | regex | AR-TSIG-TEST-04 |
| `it.skip` / `xit` / `it.only` 混入 | regex | AR-TSIG-TEST-05 |
| `async () => {}` で `await` 不使用 test | regex | AR-TSIG-TEST-06 |
| `describe` 内 `it` 0 件 (空 suite) | AST or regex | AR-TSIG-TEST-07 |
| `vi.fn()` 作るが never called の mock | AST | AR-TSIG-TEST-08 |
| 試験対象 self-mock | import path 比較 | AR-TSIG-TEST-09 |
| `expect(x).toBeInstanceOf(Object)` 等の型ガードのみ | regex | AR-TSIG-TEST-10 |

実装前に **baseline 採取** (test-signal-integrity Phase 3 step 1 と同じ手順)
で false positive 率を確認してから昇格。

#### Step 6: test:e2e CI 検証 checkbox の確認

PR #1020 で追加した 12 spec が CI で全 pass することを確認 (CI 結果を見るだけ)。
fail があれば修正 commit。

#### Step 7: 観測期間 (最低 2 週間) 終了後の archive 判断

advisory ガイド §5 の昇格条件:
1. false positive < 5%
2. 観測期間 ≥ 2 週間 (本作業のスパン)
3. Discovery Review 承認

満たせば:
1. `test-signal-integrity` checklist の最終レビュー [x] → §6.2 archive プロセス
2. `presentation-quality-hardening` も最終レビュー section を追加 → [x] → §6.2 archive

### Phase 3 残 5 checkbox とのマッピング

```
* [ ] vitest.config.ts の coverage include に presentation/ を追加  ← Step 1
* [ ] Presentation 層の高優先 component に component test を追加  ← Step 3 (複数 commit)
* [ ] coverage 閾値を lines: 55 → lines: 70 に引き上げる  ← Step 4
* [ ] CI で coverage 70% を満たすことを確認する  ← Step 4 完了で達成
* [ ] 拡充 spec が npm run test:e2e で全て pass することを確認する  ← Step 6
```

## 3. ハマりポイント

### 3.1. CategoryBenchmarkChart.vm.ts の useState 6/7

`active-debt-refactoring-plan.md` で「Guard 制約上の限界」として記録済み。
import 行を Guard が計上しているため default 以下。Guard 改善（import 除外）が
入るまで `.vm.ts` 構造を変えても改善しない。**Phase 3 の対象外** (active-debt
Phase 1 で扱う問題ではない)。

### 3.2. coverage 閾値の引き上げは実装と並行する (不可侵原則 #1)

55→70% を機械的に設定すると CI が即赤くなる。Step 3 (test 追加) と Step 4
(閾値引き上げ) を交互に進めること。閾値変更は単独の小さな commit に分離する。

### 3.3. test 追加時の Self-check 6 項目を毎回意識する

新規 test を pre-push すると `check_test_signal_advisory` が必ず出る。
warning として表示される 6 項目を毎回読み、自分が書いた test が以下のいずれかに
該当しないか自己点検する:

- existence-only assertion (`toBeDefined()` のみ)
- render / import 成功だけで満足
- snapshot だけで主要挙動を済ませている
- 出力・契約・副作用・分岐のいずれも検証していない
- suppress (`eslint-disable` / TS suppression directive) に依存
- mock call count だけで満足、本来の観測対象を mock で置き換え

該当したら **観測ログに記録** (= advisory が機能した例)、修正する。

### 3.4. coverage は presentation の包含で全体平均が下がる

vitest.config.ts に presentation/ を追加した直後は、テストが少ない分
全体 coverage 平均が下がる。これは想定内。閾値 55 を下回らないかだけ
注意し、下回ったら Step 3 を急ぐ (最初の component test を 1〜2 件追加してから
include を入れるのも可)。

### 3.5. 新規アンチパターン昇格の優先順位

Step 5 で見つかった候補は **すぐ全部 hard gate にしない**。実用上の優先順位:

1. 観測期間中に **複数回踏んだ** パターン → hard gate 化最優先
2. 1 回しか出ていないが false positive 0 → advisory 化候補
3. 1 回出てかつ false positive がある → Discovery Review に保留

無闇に hard gate を増やすと test-signal-integrity の信頼性が下がる。
「現実把握優先 (C9)」と「数より精度」を意識する。

## 4. 観測ログの記録様式

`projects/test-signal-integrity/HANDOFF.md` の「観測期間ログ」section に
以下のフォーマットで時系列で記録する:

```markdown
### 2026-04-XX YY:ZZ — <作業内容>

**試した bad pattern**: <パターン名 / コード片>
**期待される検出**: <ルール ID>
**実際の挙動**: <hard gate で止まった / advisory が出た / 何も起きなかった>
**ルール側のアクション**: <該当ルール ID のままでよい / 検出ロジック改善 / 新規ルール候補>
```

例:
```markdown
### 2026-04-15 10:30 — HourlyChart.builders test 追加

**試した bad pattern**: `it('exists', () => { expect(buildHourlySummaryStats).toBeDefined() })`
**期待される検出**: AR-TSIG-TEST-01
**実際の挙動**: ✅ test:guards で AR-TSIG-TEST-01 violation として fail
**ルール側のアクション**: そのまま (機能した)
```

## 5. 関連文書

| ファイル | 役割 |
|---|---|
| `references/01-principles/test-signal-integrity.md` | TSIG-TEST/COMP family + Protected Harm 定義 |
| `references/03-guides/test-signal-integrity-advisory.md` | Advisory レーン運用 / Self-check 6 項目 / 昇格条件 §5 |
| `references/03-guides/coding-conventions.md` | TS suppression directive の書き方 (PR #1019 で追加) |
| `references/03-guides/active-debt-refactoring-plan.md` | Phase H/I/J 詳細（背景） |
| `references/02-status/open-issues.md` | active project 索引 |
| `references/02-status/technical-debt-roadmap.md` | 判断理由（背景） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール / §3.1 最終レビュー section |
| `projects/test-signal-integrity/HANDOFF.md` | 観測ログの記録先 |
| `projects/test-signal-integrity/checklist.md` | 観測完了で最終レビュー [x] にする対象 |
