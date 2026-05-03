# Current 群保守ポリシー

> Phase 4: 既存 Rust/current 群の意味再分類・保守対象化

## 1. 目的

既存 Rust/WASM current 群を「Rust にあるから同じ棚」ではなく**意味責任で再分類**し、
移行候補ではなく**保守対象**として固定する。

## 2. 原則

1. **current 群は運用資産であり、移行候補ではない**
2. **Rust にあることは意味分類の根拠にならない**
3. **意味再分類と物理移動は分ける**（metadata / registry / policy で再分類）
4. **current に promote 状態遷移を持たせない**（active / deprecated / review-needed のみ）
5. **境界事例は技法と意味責任を分離して記録する**

## 3. Current 群の意味再分類表

| WASM Module | semanticClass | authorityKind | ownerKind | bridgeKind | 備考 |
|------------|--------------|--------------|-----------|-----------|------|
| factor-decomposition | business | business-authoritative | maintenance | business | methodFamily=analytic_decomposition |
| gross-profit | business | business-authoritative | maintenance | business | 8 numeric + 2 CalculationResult |
| budget-analysis | business | business-authoritative | maintenance | business | Type B hybrid（dailyCumulative は TS 補完） |
| forecast | analytic | analytic-authoritative | maintenance | analytics | pure 5 WASM / Date-dependent 5 TS |
| time-slot | analytic | analytic-authoritative | maintenance | analytics | findCoreTime / findTurnaroundHour |
| statistics | analytic | analytic-authoritative | maintenance | — | TS-only、未 bridge、将来候補 |
| core-utils | utility | non-authoritative | maintenance | — | 非移行対象 |

## 4. Current 群の状態制限

### 4.1 許容状態

| 状態 | 意味 |
|------|------|
| `active` | 通常運用中 |
| `deprecated` | 廃止予定（代替あり） |
| `review-needed` | 意味分類の再検討が必要 |

### 4.2 禁止状態

以下の状態は **candidate 群だけ**が持つ。current に追加してはならない:

- `proposed` — 候補提案
- `extracted` — 抽出済み
- `bridged` — bridge 接続済み
- `dual-run` — 二重実行中
- `promotion-ready` — 昇格準備完了
- `retired-js` — JS 退役済み

**理由:** current を staging area にすると、保守対象と実験対象の境界が崩壊する。

## 5. Current/Business 保守観点

current/business の保守時に確認すべき事項:

1. **業務意味が変わっていないか** — businessMeaning（BIZ 契約の reason）と一致しているか
2. **出力の解釈が変わっていないか** — UI に表示される値の意味が変わっていないか
3. **business 契約を壊していないか** — rateOwnership / fallbackPolicy / nullPolicy が維持されているか
4. **既存 UI の説明責任を壊していないか** — Explanation の L1→L2→L3 が正しく動くか

### 対象モジュール

- **factor-decomposition**: BIZ-004。技法は Shapley（analytic）だが意味責任は business。分解合計 = 売上差の恒等式を維持する
- **gross-profit**: BIZ-001, BIZ-002, BIZ-005, BIZ-006。在庫法/推定法の粗利計算。8 numeric core + 2 CalculationResult
- **budget-analysis**: BIZ-003。予算分析。scalar フィールドは WASM、dailyCumulative は TS 補完

## 6. Current/Analytics 保守観点

current/analytics の保守時に確認すべき事項:

1. **数学的不変条件を壊していないか** — ANA 契約の invariantSet が維持されているか
2. **substrate としての再利用性を壊していないか** — API が汎用のままか
3. **business core と混線していないか** — analytic の出力を直接 business 値として使っていないか
4. **analytics 契約を壊していないか** — methodFamily / fallbackPolicy が維持されているか

### 対象モジュール

- **forecast**: ANA-002, ANA-004, ANA-005, ANA-006。pure 5 WASM 関数 + Date-dependent 5 TS 関数
- **time-slot**: ANA-001。findCoreTime / findTurnaroundHour

## 7. Current/Candidate 分離ルール

| 観点 | current | candidate |
|------|---------|-----------|
| **運用 view** | BUSINESS_SEMANTIC_VIEW / ANALYTIC_KERNEL_VIEW | MIGRATION_CANDIDATE_VIEW |
| **KPI** | 安定性（回帰なし） | parity / promote 進捗 |
| **review 導線** | 保守レビュー | 移行レビュー |
| **staging** | ❌ staging area にしない | ✅ candidate として育成 |

## 8. Cargo.toml メタデータ

各 crate の Cargo.toml に `[package.metadata.semantic]` を追加する（物理移動なし）:

```toml
[package.metadata.semantic]
class = "business"  # or "analytic" or "utility"
authority = "business-authoritative"  # or "analytic-authoritative" or "non-authoritative"
owner = "maintenance"
```

## 9. Phase 4 Guard

| Guard ID | severity | 内容 |
|----------|----------|------|
| AR-CURRENT-NO-CANDIDATE-STATE | hard | current に candidate 状態遷移追加禁止 |
| AR-CURRENT-SEMANTIC-REQUIRED | hard | current に semanticClass 未設定禁止 |
| AR-CURRENT-NO-STANDALONE-AUTH | hard | current に authoritative 単独禁止 |
| AR-CURRENT-VIEW-SEPARATION | hard | current/business と current/analytics の運用 view 混在禁止 |
| AR-CURRENT-NO-CANDIDATE-MIX | hard | current 群に candidate 実装を混入禁止 |
| AR-CURRENT-NO-DIRECT-IMPORT-GROWTH | ratchet | current 群の direct import を増やす変更禁止 |
| AR-CURRENT-FACTOR-BUSINESS-LOCK | hard | factorDecomposition の semanticClass 変更は businessMeaning 再定義なしで禁止 |

## 10. やらないこと

- `wasm/current/business/*` への物理移動
- Cargo workspace 再構成
- 既存 CI パイプラインの変更

## 11. 関連文書

- `references/01-foundation/semantic-classification-policy.md` — 意味分類ポリシー
- `references/03-implementation/contract-definition-policy.md` — 契約定義ポリシー
- `app/src/test/calculationCanonRegistry.ts` — Master Registry
- `app/src/test/semanticViews.ts` — Derived View
- `app/src/application/services/wasmEngine.ts` — WASM Module Metadata
