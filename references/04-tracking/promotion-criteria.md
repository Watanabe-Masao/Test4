# Promotion Criteria — Engine 昇格基準

## 目的

Authoritative Engine の昇格判断を、人手に依存せず継続可能な形にする。
本プロジェクトでは、手動観測・DevTools 依存・目視確認を昇格判断の必須条件にしない。
昇格判断は、**自動テスト・自動観測・自動比較・自動レポート** により得られる証拠を主根拠とする。

---

## 基本原則

### 1. 昇格判断は自動取得可能な信号を優先する

昇格判断に使う必須証拠は、CI またはローカル自動実行で再現可能でなければならない。

### 2. 手動観測は補助情報であり、必須条件ではない

DevTools、手動 runbook、画面目視確認は補助的に扱う。
これらがなくても promotion 判定が可能であることを前提とする。

### 3. 昇格判断は段階的に行う

engine の状態は次の順で進む。

```
audited → bridge-ready → compare-ready → compare-implemented
    → rust-implemented → wasm-callable → observation-ready
    → promotion-candidate → wasm-only trial → authoritative
```

### 4. 昇格判定は「意味差」を重く扱う

単なる微小な数値差よりも、次を重く扱う。

- invariant violation
- null mismatch
- 経路未踏破
- rollback 不全
- expected call coverage 不足

---

## 用語定義

| 用語 | 定義 |
|---|---|
| compare-implemented | bridge に ts-only / wasm-only / dual-run-compare が実装されている状態 |
| rust-implemented | 対象 engine の純粋計算 core が Rust で実装されている状態 |
| wasm-callable | TypeScript から WASM adapter 経由で呼び出せる状態 |
| observation-ready | 自動観測ハーネスで対象 engine の compare 結果を回収できる状態 |
| promotion-candidate | 自動取得できる証拠に基づき、wasm-only 限定試験候補として扱ってよい状態 |
| wasm-only trial | 限定環境または自動試験内で wasm-only を有効にして評価している状態 |
| authoritative | WASM 実装を正式な計算定義元として扱う状態。昇格条件までを本文書で定義するが、昇格実行は別判断 |

---

## Maturity 状態遷移と各遷移の必要条件

### 遷移条件一覧

| 遷移元 | 遷移先 | 必要条件 |
|---|---|---|
| audited | bridge-ready | bridge パターン実装済み。全呼び出しが bridge 経由に統一。bridge test 通過 |
| bridge-ready | compare-ready | compare plan 文書完成。tolerance / invariant checker / mismatch 分類が決定 |
| compare-ready | compare-implemented | dual-run compare 実装済み。bridge test 全通過。dualRunObserver に FnName 登録済み |
| compare-implemented | rust-implemented | Rust crate 実装済み。`cargo test` 全通過（invariants / cross_validation / edge_cases） |
| rust-implemented | wasm-callable | `wasm-pack build` 成功。wasmEngine.ts に loader 追加。adapter 接続完了。`npm test` 全通過 |
| wasm-callable | observation-ready | 自動観測ハーネスで当該 engine の compare 結果を回収可能。dual-run-compare モードで自動テスト通過 |
| observation-ready | promotion-candidate | **下記「promotion-candidate 条件」参照** |
| promotion-candidate | wasm-only trial | **下記「wasm-only 限定試験条件」参照** |
| wasm-only trial | authoritative | **下記「authoritative 昇格条件」参照** |

---

## 昇格判断に使ってよい証拠

### 必須証拠（自動取得可能なもの）

- lint pass
- build pass
- unit / integration tests pass
- invariant tests pass
- cross-validation tests pass
- edge case tests pass
- compare bridge tests pass
- 自動観測ハーネス pass
- dualRunObserver summary
- mismatch log JSON
- per-function call counts
- mode 別テスト結果（ts-only, wasm-only, dual-run-compare）
- fallback / rollback テスト結果

### 補助証拠（あれば参考にする）

- Markdown 観測レポート
- CI artifact
- 実行ログ
- 手動観測メモ
- 目視確認メモ

### 昇格判断の必須証拠にしてはいけないもの

- 人手での DevTools 確認
- 人が runbook を埋めること
- 手作業での画面遷移
- 「2 週間問題なかった」等の曖昧な時間依存条件
- 印象ベースの UI 評価

---

## Mismatch Taxonomy の扱い

| 分類 | 昇格判断 | 詳細 |
|---|---|---|
| numeric-within-tolerance | **原則許容** | 件数・偏り・分布は記録する。promotion の blocking 条件ではない。連続的に偏る場合は調査対象 |
| numeric-over-tolerance | **原則 NG** | 例外は原因が明確で業務意味に影響がないことを説明できる場合のみ。自動判定では fail が基本 |
| null-mismatch | **原則 NG** | 意味差とみなし、promotion-candidate 条件を満たさない |
| invariant-violation | **即 NG** | wasm-only trial 開始条件を満たさない。試験中なら停止条件 |

---

## 自動観測の必須条件

### 共通必須条件

各 engine は次をすべて満たすこと。

- 自動観測ハーネスで起動可能
- `__dualRunStats()` が取得可能
- `__dualRunStats('log')` が取得可能
- compare 対象関数の call count が 0 でない
- 主要経路を固定フィクスチャで再現できる
- summary JSON が出力できる
- observation report が出力できる

### compare 対象 coverage

engine ごとに、compare 対象関数のうち必要な関数が最低 1 回以上実行されていること。

### フィクスチャ coverage

最低限、各 engine は次のフィクスチャ群を自動観測で通すこと。

- normal（通常値）
- zero / null / missing（欠損系）
- extreme（大値・小値）
- boundary（境界値）

---

## promotion-candidate 条件

observation-ready から promotion-candidate へ遷移するための条件。

### 必須条件（全て満たすこと）

1. **bridge-ready** であること
2. **compare-implemented** であること
3. **invariant tests 全通過** — `*Invariants.test.ts` が engine の全関数をカバー
4. **cross-validation tests 全通過** — Rust `cross_validation.rs` が TS golden fixture と一致
5. **edge case tests 全通過** — Rust `edge_cases.rs` がゼロ / 負値 / NaN / 大値をカバー
6. **lint / build / test 全通過** — `cargo test` + `npm run lint` + `npm run build` + `npm test`
7. **自動観測ハーネスが pass**
8. **compare 対象関数の expected call coverage を満たす**
9. **invariant-violation = 0**
10. **null-mismatch = 0**
11. **numeric-over-tolerance = 0**（例外は下記「例外運用」参照）
12. **fallback テスト pass**
13. **rollback テスト pass**
14. **mismatch log shape と summary が保存可能**
15. **current blocker が engine-promotion-matrix.md 上で解消済み**

### 望ましい条件（判断材料として考慮）

- numeric-within-tolerance = 0
- maxAbsDiff が安定して小さい
- フィクスチャ間でばらつきが小さい
- JSON レポートが連続で clean

### promotion-candidate で不要なもの

- 手動 runbook 完了
- DevTools 目視
- 長期間の手動観測
- UI の感覚的確認

---

## wasm-only 限定試験条件

promotion-candidate から wasm-only trial へ進めるための条件。

### 開始条件（全て満たすこと）

1. **promotion-candidate 条件を満たす**
2. **wasm-only mode の自動テストが pass**
3. **dual-run-compare の自動観測が clean**
4. **rollback が自動試験で確認済み**
5. **compare 対象経路の coverage が十分**
6. **engine 固有 invariant がすべて保持されている**

### 停止条件（いずれか 1 つで即停止）

- invariant-violation > 0
- null-mismatch > 0
- numeric-over-tolerance > 0
- expected call coverage 不足
- fallback / rollback 失敗
- compare 対象外の経路へ誤って波及
- mode 切替後に build / test / invariant が崩れる

### 備考

時間ベース条件は必須にしない。
時間の代わりに、**固定フィクスチャ群 + 主要経路 coverage + 自動判定** を根拠にする。

---

## authoritative 昇格候補条件

wasm-only trial から authoritative へ進めるための条件。
**この遷移は不可逆に近い**（TS 参照実装の削除を含む）ため、慎重に判定する。

### 必須条件（全て満たすこと）

1. **wasm-only trial 条件を満たす**
2. **wasm-only 自動観測が pass**
3. **rollback 自動確認が pass**
4. **invariant-violation = 0**
5. **null-mismatch = 0**
6. **numeric-over-tolerance = 0**
7. **compare 対象主要経路を十分にカバー**
8. **engine-promotion-matrix 上の blocker が解消済み**
9. **TS 参照実装との差が説明不能な形で残っていない**

### 望ましい条件（判断材料として考慮）

- numeric-within-tolerance もゼロ
- 複数フィクスチャで clean
- 連続実行で clean
- JSON / Markdown レポートが安定

### authoritative 昇格で不要なもの

- 手動観測が一定期間続いたこと
- 人が UI を毎回見たこと
- 手作業 runbook の完全充足

### 昇格後の作業

1. TS 参照実装をコードベースから削除（bridge は WASM 直接呼び出しに変更）
2. compare 関連コードを削除（dual-run は不要）
3. engine-maturity-matrix.md を `authoritative` に更新
4. observer の当該 FnName を削除（観測不要）

### 判定

必須条件を全て満たし、Authority（user）が昇格を承認した場合のみ authoritative に遷移する。
**user の明示的承認なしに authoritative 昇格を行ってはならない。**

---

## Engine ごとの補足

### factorDecomposition

- **重視するもの:** 恒等式（effects 合計 = delta）、null mismatch、時系列経路 coverage
- **blocker 例:** 観測ハーネス未整備または coverage 不足

### grossProfit

- **重視するもの:** GP-INV-1〜12、null handling、inventory / estimated / markup / transfer 経路
- **blocker 例:** 自動観測未実行

### budgetAnalysis

- **重視するもの:** single-store authoritative core の compare、aggregate が compare 対象外で守られていること
- **blocker 例:** aggregate と core の境界混入

### forecast

- **重視するもの:** compare 対象 5 関数のみ、Date 依存除外、ReadonlyMap 変換整合
- **blocker 例:** Rust 未実装、Date-free 経路の coverage 不足

---

## Rollback / Fallback の扱い

### rollback 必須条件

昇格判断に進める engine は、次を満たさなければならない。

- ts-only へ戻せる
- wasm-only → fallback が機能する
- loading / error / idle で TS fallback する
- rollback の自動テストが pass

### rollback 不全の扱い

rollback 不全は promotion-candidate 判定で NG とする。

---

## 例外運用

原則として例外運用は行わない。
ただし numeric-over-tolerance が発生しても、次の条件を**すべて**満たす場合のみ一時保留扱いとする。

- 原因が特定済み
- 業務意味に影響しない
- invariant は保持
- null mismatch はない
- engine-promotion-matrix に例外理由を記載済み

---

## 判定の原則

- **自動化された証拠で判断する** — 人が頑張って観測する前提ではなく、自動化された証拠だけで回る前提で設計する
- **人手確認は例外対応に限定** — fail / warning が出たケースの調査時のみ
- **mismatch の原因不明は NG** — 原因が特定できない mismatch がある限り次に進まない
- **rollback は常に可能にしておく** — authoritative 昇格まで TS 参照実装を削除しない
- **user が最終判断する** — authoritative 昇格の最終承認は userが行う

---

## 関連文書

- `references/03-implementation/compare-conventions.md`
- `references/04-tracking/observation-evaluation-guide.md`
- `references/04-tracking/engine-promotion-matrix.md`
- `references/03-implementation/rollback-policy.md`
- `references/04-tracking/engine-maturity-matrix.md`
