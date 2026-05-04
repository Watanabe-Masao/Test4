# Promotion Readiness Table — Phase 8 (= 4 ANA candidates)

> **役割**: Phase 8 着手対象 4 candidate の **個別 readiness 評価** + observation entry/exit criteria を articulate。
>
> **landed**: 2026-05-04 (= AI scaffold)
>
> **status legend**:
> - ✅ = Phase 0-7 で達成済 (= AI が機械検証で確認可)
> - 🟡 = 観測必要 (= user が DEV 環境で値を埋める)
> - ⏳ = ceremony 完了で達成
>
> 本 table は **観測前** の状態を articulate。観測後は各 `evidence-packs/<ID>.json` + `proposals/<ID>.md` に値が埋まり、本 table は **summary view** として update される (= dual-run 実施後 user 更新)。

## Pre-observation readiness (= 構造的 readiness、AI 検証済)

| Item | ANA-003 sensitivity | ANA-004 trendAnalysis | ANA-007 dowGapAnalysis | ANA-009 movingAverage |
|---|:-:|:-:|:-:|:-:|
| **Contract 固定** (= Phase 3) | ✅ | ✅ | ✅ | ✅ |
| **Zod 契約**追加済 | ✅ | ✅ | ❌ (= notes 参照) | ✅ |
| **JS current reference** 固定 | ✅ | ✅ | ✅ | ✅ |
| **candidate 実装** 追加済 (= TS adapter) | ✅ | ✅ | ✅ | ✅ |
| **WASM crate** 実装済 | ✅ wasm/sensitivity | ✅ wasm/trend-analysis | ✅ wasm/dow-gap | ✅ wasm/moving-average |
| **bridge** 接続済 | ✅ sensitivityBridge | ✅ trendAnalysisBridge | ✅ dowGapBridge | ✅ movingAverageBridge |
| **bridge mode** 4 種実装 | ✅ | ✅ | ✅ | ✅ |
| **mock-based dual-run** 実施済 (= Phase 5/6) | ✅ | ✅ | ✅ | ✅ |
| **rollback test** 実装済 | ✅ rollbackToCurrentOnly | ✅ | ✅ | ✅ |
| **registry entry** = candidate / candidate-authoritative | ✅ | ✅ | ✅ | ✅ |
| **methodFamily** 設定済 | ✅ what_if | ✅ temporal_pattern | ✅ calendar_effect | ✅ time_series |
| **invariantSet** 例 articulated | 感度 ∈ [0, ∞) | MoM/YoY 比較基準一致 | 曜日合計 = 週合計 | 窓幅 ≥ 1 |

### Notes

- **ANA-007 Zod 未追加**: registry entry 上 `zodAdded: false`。promote 前に Zod 契約追加が望ましい (= Phase 8 の前提整備事項として議論 candidate)。短期回避: dual-run で shape 一致を厳格に検証することで Zod 不在を補う運用が可能
- **ANA-007 fallbackPolicy: 'none'**: 他 3 件は `fallback-to-current` だが ANA-007 は `none`。promote 後 fallback 経路がないため rollback ceremony が registry 直戻し限定 = 提案書で articulate
- **ANA-009 fallbackPolicy: 'none'**: 同上

## Pre-observation readiness summary

| candidate | 構造 readiness | promotion-ready 判定 | 残作業 (= user side) |
|---|:-:|:-:|---|
| ANA-003 | 12/12 ✅ | **mock-based ready** | 実 WASM build + dual-run 観測 + user 承認 |
| ANA-004 | 12/12 ✅ | **mock-based ready** | 同上 |
| ANA-007 | 11/12 (Zod 1件) | **conditional ready** | 同上 + Zod 追加判断 |
| ANA-009 | 12/12 ✅ | **mock-based ready** | 同上 |

= **4 件全て構造的に Phase 8 entry 可能**。実 WASM 観測のみが残作業。

## Observation entry criteria (= dual-run 開始判定)

以下を user が DEV 環境で確認後、観測開始:

1. ✅ `npm run build:wasm` 成功 (= 全 18 crate の `pkg/` directory 生成)
2. ✅ `npm run build` 成功 (= TS build pass)
3. ✅ `npm run test:guards` PASS
4. ✅ `npm run test:observation` PASS (= 既存 mock-based dual-run の WASM-backed 再実行)
5. ✅ DEV server 起動 + 対象 chart / page navigate で console error 0

## Observation exit criteria (= 安定期間判定)

各 candidate 個別に以下を満たした時点で「promotion-ready confirmed」:

| 観測項目 | exit criterion |
|---|---|
| **value match** | dual-run N 連続 invocation で `match: true` (= criticalDiffCount = 0) |
| **null match** | input null → output null の伝播一致 (= TS 仕様) |
| **warning match** | 警告 message 文字列一致 (= ANA-007 固有制約: warnings の TS 生成と FFI 後一致確認) |
| **methodUsed match** | bridge log 上の手法記録一致 |
| **scope match** | 期間 / 店舗 / cohort scope 一致 |
| **shape match** | (Analytic 固有) 出力配列長 / fields 一致 |
| **ordering match** | (Analytic 固有) 出力順序一致 (= sort key の一致) |
| **invariant match** | 上表 invariantSet 例の全条件成立 |
| **観測期間** | 重大差分 0 件で **3 日以上連続** (= 推奨 7 日) |
| **rollback 実演** | `setBridgeMode('current-only')` で fallback path に戻れること (= ANA-007/009 は fallbackPolicy=none のため bridge mode 切替直後の状態確認のみ) |

## Critical diff (= 即 ceremony 中止条件)

以下のいずれかが観測された場合、観測継続を停止し proposal を再評価:

- ❌ value mismatch with non-trivial magnitude (= 単純な float 誤差以外)
- ❌ shape mismatch (= 配列長 / fields 不一致)
- ❌ invariant violation (= methodFamily 別 invariant の破れ)
- ❌ console error / WASM panic
- ❌ rollback test 失敗 (= mode 切替後も candidate が動作)

## 観測 record format

各 candidate の observation 結果は以下に記録:

1. `evidence-packs/<ID>.json` の `parityResult` / `rollbackEvidence` / `guardStatus` を update
2. `proposals/<ID>.md` の「証拠」section に値転記 (= 観測終了時 user 操作)
3. (任意) `aagPromoteRecord` schema に最終 record を generate

## 移行 dependency

| candidate | 順序制約 |
|---|---|
| ANA-009 (movingAverage) | **最初** (= 最も単純、time_series invariant 検証容易、他 candidate の参考実装) |
| ANA-003 (sensitivity) | 任意 |
| ANA-004 (trendAnalysis) | 任意 |
| ANA-007 (dowGapAnalysis) | **最後** (= Zod 未追加 + fallbackPolicy=none で risk 高め、3 件成功後の判断材料蓄積後) |

= **推奨順序**: ANA-009 → ANA-003 → ANA-004 → ANA-007

ただし全 4 件の dual-run mode を同時 active にして並行観測することも可 (= bridge state は独立、cross-contamination なし)。
