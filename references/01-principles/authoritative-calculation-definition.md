# Authoritative 計算の正本定義

## 1. 概要

本プロジェクトの authoritative（権威的）計算は、7つの Rust crate で実装され、
WASM にコンパイルされてブラウザ上で実行される。

Rust は「計算が正しい」を数学的に保証する。
readModels は「正しい計算の結果を正しい意味で使う」を runtime 契約で保証する。

## 2. 7つの Rust Crate

| Crate | 関数数 | 責務 |
|-------|--------|------|
| **gross-profit** | 8 | 在庫法/推定法/値入率/売変/原価計算 |
| **budget-analysis** | 2 | 予算分析（達成率/進捗/着地予測） |
| **factor-decomposition** | 4 | シャープリー値分解（2/3/5要素） |
| **time-slot** | 2 | 時間帯分析（コアタイム/ターンアラウンド） |
| **statistics** | 7 | 統計（相関/感度/曜日ギャップ） |
| **forecast** | 5 | 予測（標準偏差/異常値/WMA/回帰/トレンド） |
| **core-utils** | 14 | 安全除算/比率プリミティブ |

## 3. Bridge パターン

```
TS 関数（レガシー）          Rust/WASM 関数
        │                        │
        └─── Bridge ────────────┘
              │
              ├─ ts-only: TS のみ実行
              ├─ wasm-only: WASM 実行（TS fallback）
              └─ dual-run-compare: 両方実行、比較、TS を返す
```

### Bridge ファイル

| Bridge | 対象 Crate | 関数数 |
|--------|-----------|--------|
| grossProfitBridge.ts | gross-profit | 8 |
| budgetAnalysisBridge.ts | budget-analysis | 2 |
| factorDecompositionBridge.ts | factor-decomposition | 4 |
| timeSlotBridge.ts | time-slot | 2 |
| forecastBridge.ts | forecast | 5 |

### Dual-Run 比較

- **Tolerance:** `1e-10`（浮動小数点 epsilon）
- **不変条件チェック:** Shapley 合計 = 売上差（factor-decomposition）
- **Null 不一致検出:** TS null ≠ WASM NaN を検知
- **結果:** 常に TS を返す（safety-first）
- **DevTools:** `__dualRunStats()` で統計確認可能

## 4. ガード（purityGuard.test.ts）

- `RUST_COVERED_FILES`: domain/calculations/ の全計算ファイルが Rust 実装済み
- `TS_ONLY_ALLOWLIST`: 空（全ファイルが Rust-covered）
- `NON_CALCULATION_FILES`: 空（全ファイルが計算ファイル）

## 5. readModels との接続

### 既に正本経由で Rust 計算を利用

| readModel | 内部で使用する Bridge 関数 |
|-----------|------------------------|
| calculateGrossProfit | invMethod / estMethod（grossProfitBridge 経由） |
| calculateGrossProfitWithFallback | 同上 + fallback ロジック |
| calculateFactorDecomposition | decompose2 / decompose3 / decompose5（factorDecompositionBridge 経由） |

### 正本化の方針

- Rust crate 自体の変更は不要（既に authoritative）
- readModels は「意味の固定 + Zod runtime 契約」を担う
- Bridge 出力に Zod safeParse を追加して runtime 型安全を強化

## 6. 不変条件一覧

| Crate | 不変条件 |
|-------|---------|
| factor-decomposition | Σ effects = Δ sales（Shapley 効率性公理） |
| gross-profit | COGS = 期首 + 仕入 - 期末（在庫法） |
| gross-profit | 推定原価 = 粗売上 × (1 - 値入率) + 原価算入費 |
| budget-analysis | 累計予算は単調増加 |
| core-utils | safe_divide(n, 0, fallback) = fallback |
