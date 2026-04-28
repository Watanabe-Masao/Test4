# 正本化原則（Canonicalization Principles）

> 本セッションの仕入原価正本化を通じて確立された原則。
> 全業務値の正本化に横展開する際の制度として固定する。

## P1: 正本は「取得」と「計算」で形が異なる

| 種類         | 例                                                 | 正本の形                                       |
| ------------ | -------------------------------------------------- | ---------------------------------------------- |
| 取得の正本化 | readPurchaseCost, readSalesFact                    | DuckDB から取得 → ReadModel に構築 → Zod parse |
| 計算の正本化 | calculateGrossProfit, calculateFactorDecomposition | 入力値を受けて計算 → Result に構築 → Zod parse |

取得正本は「どこからどう取るか」を固定する。
計算正本は「どう計算するか」を固定する。
混同しない。

## P2: 1つの正本から全ビューを導出する

```
正本（最小共通粒度）
├→ 全店合計
├→ 店舗別
├→ 日別
├→ 時間帯別
├→ 階層別
└→ ドリルダウン
```

**表示ごとに正本を作らない。** 1つの正本ファクトから JS 集計で導出する。
日別売上、時間帯売上、カテゴリ売上を別々に正本化しない。

これに違反すると、仕入原価で起きた「ページごとに異なる値」が再発する。

## P3: 複合正本は独立した部品に分ける

```
総仕入原価（複合正本）
├── 通常仕入正本（独立に使える）
├── 売上納品正本（推定法では除外可能）
└── 移動原価正本（独立に使える）
```

複合正本は「独立した部品の組み合わせ」として設計する。
用途に応じて部品を選択的に使えるようにする。
flat な totalCost だけでは用途別の組み合わせができない。

## P4: 0 と欠損は区別する

| 状態             | 意味                     | 対応                           |
| ---------------- | ------------------------ | ------------------------------ |
| 値が 0           | データがあり、結果がゼロ | **正常。フォールバックしない** |
| 値が null / 欠損 | データがない             | フォールバックまたはエラー     |

`missingDays` のように、正本別の欠損情報を持つ。
0 を「失敗」と見なして推定法にフォールバックする等の誤判定を防ぐ。

## P5: フォールバックは仕様として文書化する

```
在庫法（実績）→ 推定法（推定値）
```

- どの条件で発生するか（在庫データの有無）
- フォールバック後の表示名（「粗利率」→「推定粗利率」）
- `meta.usedFallback` で記録
- **コード内の暗黙的なフォールバックを禁止**

フォールバックが仕様として明記されていないと、
「なぜこのページだけ値が違うのか」を調査するコストが発生する。

## P6: runtime 契約は境界ごとに役割が異なる

| 境界                     | 検証方式                        | 失敗時の挙動                   |
| ------------------------ | ------------------------------- | ------------------------------ |
| 正本 ReadModel 生成      | `.parse()`（fail fast）         | エラー。壊れたデータを通さない |
| DuckDB → JS 行変換       | DEV `.safeParse()` + warn       | 開発時に検出。PROD は通過      |
| store hydration / backup | `.safeParse()` + フォールバック | warn + デフォルト値            |

**正本には fail fast、周辺 I/O には safeParse。** 全部 parse にすると PROD が壊れ、
全部 safeParse にすると正本の壊れたデータが通過する。

## P7: 正本化の横断ルール（必須成果物）

新しい業務値を正本化する際は、以下を必ず作成する:

1. **定義書**（`references/01-principles/xxx-definition.md`）
2. **Zod 契約**（`application/readModels/xxx/XxxTypes.ts`）
3. **唯一入口**（`readXxx()` 純関数 or `calculateXxx()` 純関数）
4. **QueryHandler ラッパー**（useQueryWithHandler 連携用）
5. **導出ヘルパー**（toStoreRows, toDailyRows 等）
6. **ガードテスト**（import 禁止 + 集計逸脱禁止 + 正本一貫性）
7. **一貫性テスト**（grandTotal = Σrows, 店舗別総和 = grand 等）

これは purchase cost の成功パターンを制度化したもの。
「定義書がない正本」「テストがない正本」「ガードがない正本」は正本として認めない。

## P8: 整合性ペア（registry+guard）追加の selection rule

> 2026-04-28 追加。`canonicalization-domain-consolidation` Phase A 成果物
> （詳細は `references/03-guides/integrity-pair-inventory.md §2`）の派生原則。
> Phase I で `references/03-guides/canonicalization-checklist.md` として
> 機械強制経路を確立する予定（同 plan §6）。

新しい「registry/契約 + 検出 guard」ペア（整合性ペア）を導入する際は、
以下の **3 ゲートを全て通過した場合のみ採用**する。「正本化すべき」≠「常に new
registry を作るべき」。過剰な canonicalization は手続き過多の典型 (anti-pattern)。

### ゲート（AND 結合）

| ゲート                                        | 判定基準                                                                                                                                                                         | 落第時の措置                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **G-1: 業務意味 (Business Meaning)**          | drift が起きると **業務 KPI / UX / 計算正本性** に観測可能な影響が出るか?                                                                                                        | 不採用。drift が「内部整理」止まりなら mechanism 投入は手続き過多  |
| **G-2: 重複検出有効性 (Drift Detectability)** | 既存 7 検出パターン (双方向存在 / 構造一致 / ratchet-down / 期限 / 集合関係 / 双方向対称 / cardinality) で drift が **機械検出可能**か? rule に判断 (subjective) を要求しないか? | 不採用 (G8 違反候補)。「気をつける」rule は禁止                    |
| **G-3: 複数 caller / 規模 (Cardinality)**     | registry 対象が **3 件以上**かつ **複数 caller / 複数 module から参照**されるか?                                                                                                 | 単発なら 1 file 内 invariant test で足りる、registry 化は overkill |

### tie-breaker（採用順位の補助判定）

- **C-1: 既存 primitive 再利用度** — `app-domain/integrity/` の `parsing/` × 6 種 + `detection/` × 7 種から最低 2 primitive を再利用できるか? (高ければ tier1)
- **C-2: ratchet-down 適合** — 段階的 0 化が可能な「カウント可能な現状不整合」を持つか? (あれば tier1)
- **C-3: 並行 project 非競合** — 並行 active project の進行を阻害しないか?

### G-2 の subjective 判定

rule の説明 / message に「気をつける」「適切」「妥当」「適当」「考慮する」の語を要求するなら **G-2 不通過**。
すべて mechanism として表現（hard fail / ratchet-down / 双方向検証）に置換する（G8 適用、CLAUDE.md「## AAG を背景にした思考」§「AAG が PASS した後に立ち上がる問い」）。

### 適用対象

- **新規 registry+guard 追加** — 採用前に本 §の 3 ゲートを通過させる
- **既存 registry+guard の継続評価** — Phase E (Legacy Retirement) で旧経路撤退判定にも本 §を流用
- **横展開候補の優先度付け** — Phase H 採用判定（plan §1.3 の候補を tier1 / tier2 / 不採用に振り分け）

### 関連実装

- 横展開候補リスト: `references/03-guides/integrity-pair-inventory.md §2.2`
- 共通 primitive: 同 §3
- Phase A 採用候補リスト: 同 §4
- Phase B 後の機械強制: `app-domain/integrity/` + Phase I の checklist

## 正本化済み readModels 一覧

| 正本     | 種類 | 関数                                            | Zod | パスガード                                   |
| -------- | ---- | ----------------------------------------------- | --- | -------------------------------------------- |
| 仕入原価 | 取得 | `readPurchaseCost()`                            | ✅  | purchaseCostPathGuard (9) + importGuard (15) |
| 粗利     | 計算 | `calculateGrossProfit()`                        | ✅  | grossProfitPathGuard (6)                     |
| 売上     | 取得 | `readSalesFact()`                               | ✅  | salesFactPathGuard (5)                       |
| 値引き   | 取得 | `readDiscountFact()`                            | ✅  | discountFactPathGuard (5)                    |
| 客数     | 取得 | `readCustomerFact()`                            | ✅  | customerFactPathGuard (5)                    |
| 要因分解 | 計算 | `calculateFactorDecomposition()`                | ✅  | factorDecompositionPathGuard (5)             |
| PI値     | 計算 | `calculateQuantityPI()` / `calculateAmountPI()` | ✅  | canonicalInputGuard (6)                      |
| 客数GAP  | 計算 | `calculateCustomerGap()`                        | ✅  | canonicalInputGuard (6)                      |

**widget orchestrator:** `useWidgetDataOrchestrator` が取得系4正本（purchaseCost, salesFact, discountFact, customerFact）を `UnifiedWidgetContext.readModels` 経由で全 widget に配布。

**体系統合ガード:** `canonicalizationSystemGuard.test.ts` が全 readModel ディレクトリ・定義書・レジストリ・CLAUDE.md 参照を検証。

---

## 禁止事項（実装を通じて確認された）

- **画面側で業務値を独自に組み立てる**（presentation 層は表示のみ）
- **同じ意味の値を別経路で取得する**（3経路で別々に仕入原価を集計する等）
- **移動原価を IN のみで集計する**（OUT はマイナスの仕入。IN のみは二重計上）
- **旧 helper / 旧 query を復活させる**（ガードで禁止）
- **フォールバックを暗黙的に行う**（仕様として文書化する）
- **型だけで済ませて runtime 契約を省く**（Zod parse が必要）
