# Warning Governance — 警告コード運用規約

## 目的

warningCatalog の拡張を一貫性をもって行うための運用ルールを定める。
warning code の増やし方、severity の付け方、category の使い分けを明文化する。

## 用語

| 用語 | 定義 |
|---|---|
| warning code | domain 計算が返す文字列。事象を一意に表す |
| category | warning の分類（calc / obs / cmp / fb / auth） |
| severity | 深刻度（info / warning / critical） |
| warningCatalog | code → category / severity / label / message の一元管理 |
| warningRule | MetricMeta に定義された、この KPI で特に注目する warning code |
| acceptancePolicy | MetricMeta に定義された、authoritative 採用の可否ルール |

## Category 一覧

| Category | 接頭辞 | 意味 | 例 |
|---|---|---|---|
| calc | `calc_` | 計算定義域・数式前提の異常 | `calc_discount_rate_negative` |
| obs | `obs_` | 観測期間・観測済み範囲の不足/異常 | `obs_window_incomplete` |
| cmp | `cmp_` | 比較期間・前年比較・対象比較の不足/異常 | `cmp_prior_year_insufficient` |
| fb | `fb_` | fallback 発動・代替計算採用 | `fb_estimated_value_used` |
| auth | `auth_` | authoritative 採用可否に関わる拒否/制限 | `auth_partial_rejected` |

**新 category の追加は慎重に行う。** 既存の 5 category で表現できないか検討してから追加する。

## Severity 基準

| Severity | 意味 | authoritative への影響 | UI 表現 |
|---|---|---|---|
| info | 値は有効。補足として知らせたい | 影響なし | 青系バッジ |
| warning | 値は出せるが参考扱いが妥当 | partial（policy で override 可） | 橙系バッジ |
| critical | authoritative 採用不可 | invalid（原則不可） | 赤系バッジ |

### severity 判定ガイド

- **info にすべきもの:**
  - fallback が発動したが業務上問題ない場合
  - 推定値を使用している場合
  - 参考値として表示している場合

- **warning にすべきもの:**
  - 値は算出できたが入力の品質が低い場合
  - 観測期間が不完全な場合
  - 前年データが不足している場合
  - 値入率が異常値だが計算は続行可能な場合

- **critical にすべきもの:**
  - 計算の前提条件が崩れている場合（売変率が定義域外など）
  - 結果が数学的に無意味な場合
  - authoritative として採用すると業務判断を誤る場合

**重要:** severity は UI の色ではなく、意味の強さとして決める。

## Naming Rules

1. **lowercase snake_case** を使う
2. **先頭は category 接頭辞** (`calc_`, `obs_`, `cmp_`, `fb_`, `auth_`)
3. **事象を一意に表す** — 1 code = 1 事象
4. **UI 文言や表示語を含めない** — `calc_rate_warning` ではなく `calc_discount_rate_negative`
5. **統一語彙を使う:**
   - `negative` — 負の値
   - `out_of_domain` — 定義域外
   - `exceeds_one` — 100% 超過
   - `insufficient` — データ不足
   - `incomplete` — 不完全
   - `used` — 代替値を使用
   - `rejected` — 採用拒否

### 良い例

| code | category | severity | 理由 |
|---|---|---|---|
| `calc_discount_rate_negative` | calc | critical | 売変率が負 → 計算前提崩壊 |
| `obs_window_incomplete` | obs | warning | 観測期間不完全 → 値は出るが参考 |
| `fb_estimated_value_used` | fb | info | 推定値使用 → 補足情報 |

### 悪い例

| code | 問題 | 修正案 |
|---|---|---|
| `discount_warning` | category 接頭辞なし、曖昧 | `calc_discount_rate_negative` |
| `calc_⚠売変率異常` | UI 文言が混入 | `calc_discount_rate_negative` |
| `CALC_RATE_OUT` | UPPER_CASE、省略 | `calc_discount_rate_out_of_domain` |

## catalog / resolver / UI の役割境界

| 責務 | 担い手 | やること | やらないこと |
|---|---|---|---|
| code → 表示文言 | warningCatalog | label / message / severity 解決 | 採用判定 |
| 採用判定 | metricResolver | policy + warning → accepted/allowed | 表示文言の決定 |
| 表示 | UI (KpiCard / MetricBreakdownPanel) | severity に応じた badge / alert 表示 | 採用判定の上書き |
| KPI 特例 | metricDefs (acceptancePolicy) | blocking / allow ルール定義 | resolver 本体の分岐追加 |

## Warning 追加チェックリスト

新しい warning code を追加する際は、以下を確認する:

- [ ] **category は適切か** — 5 category のどれに該当するか
- [ ] **severity は妥当か** — info / warning / critical の基準に合うか
- [ ] **code 名は naming rules に合うか** — lowercase snake_case + category 接頭辞
- [ ] **catalog に登録したか** — warningCatalog.ts の WARNING_ENTRIES に追加
- [ ] **label / message を記載したか** — 短縮ラベルと詳細説明
- [ ] **resolver で扱う必要があるか** — warningRule への追加が必要か
- [ ] **acceptancePolicy への影響はあるか** — blockingWarningCategories / blockingWarningCodes
- [ ] **UI 表示へ反映が必要か** — KpiCard / MetricBreakdownPanel での表示
- [ ] **テストを追加したか** — warningCatalog.test.ts に存在確認テスト

## WarningEntry の構造

```typescript
interface WarningEntry {
  code: string            // domain 計算が返す文字列と一致
  category: WarningCategory  // 'calc' | 'obs' | 'cmp' | 'fb' | 'auth'
  severity: WarningSeverity  // 'info' | 'warning' | 'critical'
  label: string           // 短縮表示ラベル（badge / chip 用）
  message: string         // 詳細説明（tooltip / 説明パネル用）
}
```

## registry / resolver との関係

```
MetricMeta.warningRule     → evaluateWarnings() で matchesWarningRule 判定
MetricMeta.acceptancePolicy → decideAcceptance() で authoritative/exploratory 判定
warningCatalog             → UI で label / message / severity 表示
```

**鉄則:**
- 新しい warning code は必ず catalog に登録する
- resolver 本体に `if (code === '...')` の分岐を増やさない
- KPI 固有の例外は acceptancePolicy で表現する
