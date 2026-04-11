# WASM 候補適性の判定基準

> Phase 5-6 の実装を通じて判明した、WASM 移行の費用対効果を事前に判定する基準。

## 判定フロー

```
関数が pure / deterministic か?
  ├─ No → non-target（WASM 対象外）
  └─ Yes
      ↓
数値 kernel の比率は?
  ├─ 低い（Map/Date/String が中心）→ non-target
  └─ 高い（数値計算が中心）
      ↓
FFI マーシャリングコスト vs 計算コスト?
  ├─ マーシャリング > 計算 → non-target
  └─ マーシャリング < 計算 → candidate
```

## 適性指標

| 指標 | 適性高い | 適性低い |
|------|---------|---------|
| 入力型 | scalar, Float64Array | Map, complex objects, string |
| 出力型 | scalar, Float64Array | objects with strings, nested arrays |
| 計算量 | ループ、行列演算、統計 | 集合演算、検索、文字列操作 |
| JS 依存 | なし | Date, Map, regex, DOM |
| 不変条件 | 数学的恒等式あり | 構造的ルールのみ |

## 実例

### 適性が高かった候補

| 候補 | 理由 |
|------|------|
| piValue (BIZ-012) | pure 除算×乗算、scalar in/out |
| sensitivity (ANA-003) | 14 scalar → 10 scalar、what-if シミュレーション |
| correlation (ANA-005) | Float64Array → scalar/array、統計計算 |
| pinIntervals (BIZ-011) | ループ累積計算、flat contract で自然に表現可能 |

### 適性が低かった候補（除外）

| 候補 | 理由 |
|------|------|
| dowGapActualDay (ANA-008) | Map 集合差、Date DOW 計算、ラベル生成が中心。数値 kernel は sum のみ |

### 境界的だった候補

| 候補 | 判断 | 理由 |
|------|------|------|
| dowGapAnalysis (ANA-007) | candidate 採用 | 3 統計手法 (mean/median/adjustedMean) が pure kernel として十分。countDowsInMonth は TS adapter で分離 |
| observationPeriod (BIZ-010) | candidate 採用 | 入力は dailySales 1 列のみ。status/warning のエンコードは FFI で解決可能 |
