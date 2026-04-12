# plan — aag-rule-splitting-execution

## 不可侵原則

1. **AR-STRUCT-RESP-SEPARATION を即座に削除しない** — 並行運用で ratchet を移す
2. **新規ルールは baseline 0 で始める** — P7 以外は新たな violation を許さない
3. **例外の再帰属は機械検証する** — どの例外がどのルールに属するかを test で保証する
4. **本 project は分割実装に閉じる** — F1-F9 や G1/E3/F5/F8 系の分割は別 project

## Phase 構造

### Phase 1: 7 ルールの定義追加

| ruleId | 元パターン | what |
|---|---|---|
| AR-RESP-STORE-COUPLING | P2 | presentation の getState() 直接アクセス禁止 |
| AR-RESP-MODULE-STATE | P7 | module-scope let（グローバル変数）禁止 |
| AR-RESP-HOOK-COMPLEXITY | P8 | useMemo+useCallback 合計の上限 |
| AR-RESP-FEATURE-COMPLEXITY | P10 | features/ の useMemo/useState 上限 |
| AR-RESP-EXPORT-DENSITY | P12 | domain/models/ の export 数上限 |
| AR-RESP-NORMALIZATION | P17 | storeIds 正規化の散在上限 |
| AR-RESP-FALLBACK-SPREAD | P18 | fallback 定数密度の上限 |

各ルールには `what` / `correctPattern` / `outdatedPattern` / `migrationRecipe` を持たせる。

### Phase 2: ガードの分離

`responsibilitySeparationGuard.test.ts` で各 violation に ruleId を紐付け、
ルール ID ごとに集計する。

### Phase 3: 例外圧の再分類 + AR-STRUCT-RESP-SEPARATION 削除

例外 4 件を AR-RESP-MODULE-STATE に移し、他 6 ルールが baseline 0 であることを
確認した上で AR-STRUCT-RESP-SEPARATION を削除する。

## やってはいけないこと

- 7 ルールの定義と guard 分離を 1 PR で同時にやる → roll-back コストが上がる
- baseline 0 を破る exception を最初から認める → ratchet の意味がなくなる
- 関連 doc (`aag-rule-splitting-plan.md`) を本 project が完了する前に削除する
  → 背景を辿れなくなる
