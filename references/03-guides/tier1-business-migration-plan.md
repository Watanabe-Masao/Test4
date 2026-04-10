# Tier 1 Business Semantic Core 移行計画

> Phase 5: TS-only business 計算の candidate 移行基盤

## 1. 目的

`migrationTier: 'tier1'` の business 計算 6 件について、candidate 移行の構造基盤を整備する。
実際の Rust/WASM 実装は本文書の対象外。「何を移行するか」「どう管理するか」「何を守るか」を固定する。

## 2. 原則

1. **対象は Tier 1 Business Semantic Core だけ**（Analytic は Phase 6）
2. **current/business に最初から混ぜない**（candidate/business として育成）
3. **business 意味責任の確認が Rust 化可能性より先**
4. **bridge を唯一入口にする**
5. **dual-run と rollback を前提にする**
6. **current/business は保守対象のまま維持する**

## 3. Tier 1 候補一覧

| # | ファイル | contractId | methodFamily | businessMeaning | 移行難度 |
|---|---------|-----------|-------------|----------------|---------|
| 1 | remainingBudgetRate.ts | BIZ-008 | budget | 残予算必要達成率の逆算 | 低（pure 数値計算） |
| 2 | inventoryCalc.ts | BIZ-009 | accounting | 日別推定在庫推移の計算 | 中（日次ループ） |
| 3 | observationPeriod.ts | BIZ-010 | data_quality | 在庫法/推定法の選択を決定するデータ品質評価 | 低（判定ロジック） |
| 4 | pinIntervals.ts | BIZ-011 | accounting | 棚卸確定区間ごとの粗利計算 | 中（区間走査） |
| 5 | piValue.ts | BIZ-012 | retail_kpi | 点数PI値・金額PI値の算出 | 低（pure 数値計算） |
| 6 | customerGap.ts | BIZ-013 | behavioral | 前年比客数GAP の算出 | 低（差分計算） |

### 3.1 businessMeaning の確認

全 6 件に businessMeaning（= registry の reason + contract-definition-policy.md の BIZ 契約一覧）が記載済み。
businessMeaning を書けない候補はないため、全件を移行対象とする。

## 4. JS Current Reference

各候補の既存 TS 実装は **JS current reference** として固定する。削除しない。

| ファイル | 主要関数 | Zod 契約 |
|---------|---------|---------|
| remainingBudgetRate.ts | `calculateRemainingBudgetRate()` | ✅ |
| inventoryCalc.ts | `computeEstimatedInventory()` | ✅ |
| observationPeriod.ts | `evaluateObservationPeriod()` | ✅ |
| pinIntervals.ts | `calculatePinIntervals()` | ✅ |
| piValue.ts | `calculateQuantityPI()`, `calculateAmountPI()` | ✅ |
| customerGap.ts | `calculateCustomerGap()` | ✅ |

**JS reference の役割:**
- **Stage A (current reference):** 比較基準 + fallback + 既存運用正本（現在地）
- **Stage B (compare reference):** candidate との parity 比較対象 + fallback
- **Stage C (fallback-only):** candidate failure 時の戻り先のみ
- **Stage D (retired-js):** JS reference 削除（Phase 9 以降）

## 5. Candidate ID 体系

candidate エントリは以下の形式で管理する:

```
CAND-BIZ-XXX  (例: CAND-BIZ-008)
```

- `CAND-` prefix で candidate であることを明示
- `BIZ-XXX` は対応する Business Contract の ID
- registry の `runtimeStatus` は `'candidate'` に設定
- `authorityKind` は `'candidate-authoritative'`（business-authoritative ではない）

## 6. 8 ステップ移行プロセス

| Step | 内容 | 実施時期 | 成果物 |
|------|------|---------|--------|
| 1 | 候補確定 | ✅ Phase 5 基盤 | 本文書 §3 |
| 2 | Business Contract 固定 | ✅ Phase 3 | contract-definition-policy.md |
| 3 | JS current reference 固定 | ✅ Phase 5 基盤 | 本文書 §4 |
| 4 | candidate/business 実装追加 | Phase 5 実装 | wasm/ に新 crate + registry エントリ |
| 5 | business bridge 接続 | Phase 5 実装 | bridge にモード切替を追加 |
| 6 | dual-run 比較 | Phase 5 実装 | 値一致 + null + warning + 業務解釈 |
| 7 | rollback 確認 | Phase 5 実装 | candidate 失敗 → current-only に復帰 |
| 8 | promotion-ready 判定 | Phase 5 実装 | 判定表（まだ current に編入しない） |

## 7. Candidate Registry 構造

candidate 移行時は registry に以下の形式でエントリを追加する:

```typescript
// ── 例: remainingBudgetRate の candidate ──
'candidate/remainingBudgetRate.ts': {
  tag: 'required',
  reason: '残予算必要達成率（candidate: WASM 移行候補）',
  zodAdded: true,
  semanticClass: 'business',
  authorityKind: 'candidate-authoritative',  // ← business-authoritative ではない
  methodFamily: 'budget',
  runtimeStatus: 'candidate',                // ← current ではない
  ownerKind: 'migration',                    // ← maintenance ではない
  contractId: 'BIZ-008',
  bridgeKind: 'business',
  rateOwnership: 'engine',
  fallbackPolicy: 'current',                 // ← fallback は current reference
  migrationTier: 'tier1',
}
```

**重要:** candidate エントリは current エントリとは別に管理する。同じ view に載せない。

## 8. Bridge モード切替

candidate 実装が追加されたら、対応する bridge にモード切替を追加する:

| モード | 動作 | 使用場面 |
|-------|------|---------|
| `current-only` | 既存 TS（WASM ready なら WASM）のみ | 通常運用（デフォルト） |
| `candidate-only` | candidate 実装のみ | テスト環境での検証 |
| `dual-run-compare` | current + candidate を両方実行して比較 | 昇格前観測 |
| `fallback-to-current` | candidate 失敗時に current に戻す | 安全運用 |

## 9. Promotion-Ready 判定基準

全条件をクリアしたら `promotion-ready` とする。**まだ current に編入しない**（Phase 8 の Promote Ceremony を経る）。

| 条件 | 検証方法 |
|------|---------|
| Business Contract 定義済み | registry に contractId あり |
| businessMeaning 記載済み | reason に業務意味あり |
| 値一致 | dual-run compare で差分なし |
| null 一致 | 入力 null → 出力 null の伝播が一致 |
| warning 一致 | 警告メッセージが一致 |
| scope 一致 | 対象期間・店舗スコープが一致 |
| rollback 確認済み | candidate 失敗 → current-only に復帰可能 |
| direct import なし | bridge 経由のみ |
| guard 全通過 | Phase 5 guard 7件 + Phase 0-4 guard 全通過 |

## 10. Phase 5 Guard

| Guard ID | severity | 内容 |
|----------|----------|------|
| AR-CAND-BIZ-CONTRACT-REQUIRED | hard | Business Contract なしで candidate 化禁止 |
| AR-CAND-BIZ-NO-CURRENT-MIX | hard | candidate → current registry 混入禁止 |
| AR-CAND-BIZ-NO-ANALYTICS-BRIDGE | hard | business candidate を analytics bridge に接続禁止 |
| AR-CAND-BIZ-NO-RATE-UI | hard | candidate の率を UI で再計算禁止 |
| AR-CAND-BIZ-NO-DIRECT-IMPORT | ratchet | candidate の direct import 増加禁止 |
| AR-CAND-BIZ-NO-ROLLBACK-SKIP | hard | rollback 不可の candidate 追加禁止 |
| AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN | hard | dual-run 未実装で promotion-ready 禁止 |

## 11. 関連文書

- `references/03-guides/contract-definition-policy.md` — BIZ 契約テンプレート
- `references/03-guides/current-maintenance-policy.md` — current 群保守ポリシー
- `references/01-principles/semantic-classification-policy.md` — 意味分類ポリシー
- `app/src/test/calculationCanonRegistry.ts` — Master Registry
- `app/src/test/migrationTagRegistry.ts` — 移行タグレジストリ
