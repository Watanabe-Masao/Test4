# explanation-steward — スキル（論理構造 + 方法論）

## SKILL-1: 新指標への Explanation 追加

### 論理構造（なぜこの手順か）

- ExplanationService にロジックを追加しないと → 新指標をクリックしても根拠が表示されない → 監査不能
- `formula` が実際の計算と異なると → ユーザーが誤った理解をする → 数値への信頼が失われる
- `metric-id-registry.md` を更新しないと → documentConsistency.test.ts が FAIL する → CI が壊れる

### 方法論（手順）

1. `domain/models/Explanation.ts` の `MetricId` 型に新 ID を追加
2. `references/03-implementation/metric-id-registry.md` にエントリを追加
3. `ExplanationService.ts` に生成ロジックを追加:
   - `formula`: user-readableな計算式（日本語）
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

### 論理構造（なぜこの手順か）

- Explanation カバレッジが下がると → 一部の指標が説明不能になる → 「全指標は監査可能」の原則に違反する
- L2 や L3 が欠けると → ドリルダウンチェーンが途切れる → ユーザーが元データまで辿れない
- ページ別確認を怠ると → Explanation は存在するが KpiCard に接続されていない → UI から到達不能

### 方法論（手順）

1. `references/03-implementation/metric-id-registry.md` の全 MetricId を列挙
2. `ExplanationService.ts` で各 MetricId の生成ロジックが存在するか確認
3. 各ページで KpiCard → onExplain の接続を確認
4. 3段階 UX の完全性を確認:
   - L1: `formulaSummary` prop が KpiCard に設定されているか
   - L2: MetricBreakdownPanel で式と入力が表示されるか
   - L3: 日別内訳タブでドリルダウンできるか
5. 未対応指標があればリストアップし、implementation に追加を連携依頼

### 出力テンプレート

```
## Explanation カバレッジ監査結果

### 対応状況
- 対応済み: XX / YY 指標（YY = Explanation 対象の MetricId 数）
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

### 論理構造（なぜこの手順か）

- 循環参照があると → MetricBreakdownPanel が無限ループに入る → UI がフリーズする
- リンク先の MetricId が存在しないと → クリックしてもエラーが表示される → UX が壊れる
- ナビゲーションの一貫性がないと → 指標Aから指標Bに飛べるが逆は不可 → ユーザーが混乱する

### 方法論（手順）

1. 各 Explanation の `inputs[].metric` リンクを列挙
2. リンク先の MetricId が実在し、Explanation が生成可能か確認
3. 循環参照がないか確認（A → B → A のようなループ）
4. MetricBreakdownPanel で実際にクリック遷移が動作するか確認
