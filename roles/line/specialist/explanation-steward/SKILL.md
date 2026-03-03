# explanation-steward — スキル（手順書）

## SKILL-1: 新指標への Explanation 追加

新しい MetricId を追加し、3段階 UX を完備する手順。

### 手順

1. `domain/models/Explanation.ts` の `MetricId` 型に新 ID を追加
2. `references/metric-id-registry.md` にエントリを追加
3. `ExplanationService.ts` に生成ロジックを追加:
   - `formula`: 人間可読な計算式（日本語）
   - `inputs`: 入力パラメータ（`metric` リンク付き）
   - `breakdown`: 日別内訳
   - `evidenceRefs`: 根拠データ参照
4. 対応ページの KpiCard に `onExplain` を接続
5. テストで Explanation 生成を検証

### 生成ロジックテンプレート

```typescript
function buildNewMetric(sr: StoreResult, daily: ReadonlyMap<number, DailyRecord>): Explanation {
  return {
    metric: 'newMetricId',
    title: '指標名',
    formula: '計算式の説明',
    value: sr.計算結果,
    unit: 'yen',
    scope: { storeId: sr.storeId, year: sr.year, month: sr.month },
    inputs: [
      inp('入力1', sr.入力値1, 'yen', 'linkedMetricId'),
      inp('入力2', sr.入力値2, 'yen'),
    ],
    breakdown: dailyBreakdown(daily, (rec) => rec.対応フィールド),
    evidenceRefs: dailyEvidence('classifiedSales', sr.storeId, daily),
  }
}
```

## SKILL-2: Explanation カバレッジ監査

全24指標の Explanation 対応状況を検証する手順。

### 手順

1. `references/metric-id-registry.md` の全 MetricId を列挙
2. `ExplanationService.ts` で各 MetricId の生成ロジックが存在するか確認
3. 各ページで KpiCard → onExplain の接続を確認
4. 3段階 UX の完全性を確認:
   - L1: `formulaSummary` prop が KpiCard に設定されているか
   - L2: MetricBreakdownPanel で式と入力が表示されるか
   - L3: 日別内訳タブでドリルダウンできるか
5. 未対応指標があればリストアップし、implementation に追加を依頼

### 出力テンプレート

```
## Explanation カバレッジ監査結果

### 対応状況
- 対応済み: XX / 24 指標
- 未対応: XX 指標

### 未対応指標リスト
| MetricId | グループ | L1 | L2 | L3 | 備考 |
|---|---|---|---|---|---|
| ... | ... | ✗ | ✗ | ✗ | 追加が必要 |

### ページ別確認
- [x] Dashboard: 全ウィジェット接続済み
- [x] Daily: KpiCard 6枚接続済み
- ...
```

## SKILL-3: 指標間ナビゲーション検証

MetricBreakdownPanel 内の指標リンクが正しく機能するか検証する手順。

### 手順

1. 各 Explanation の `inputs[].metric` リンクを列挙
2. リンク先の MetricId が実在し、Explanation が生成可能か確認
3. 循環参照がないか確認（A → B → A のようなループ）
4. MetricBreakdownPanel で実際にクリック遷移が動作するか確認
