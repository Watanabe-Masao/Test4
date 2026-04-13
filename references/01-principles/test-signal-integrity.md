# Test Signal Integrity — 品質シグナル保全の原則

> **AAG Layer 1: Principles**
>
> 役割: 品質シグナル（test / coverage / compile / lint）が、本当に品質が
> 上がった結果を表すことを保証するための原則正本。
>
> 管理責任: AAG Core (`projects/test-signal-integrity` で導入)。
> 関連実装: `app/src/test/guards/codePatternGuard.test.ts`（G3 ガード）/
> 今後追加予定の TSIG-TEST 系 / TSIG-COMP 系 guard。

## 北極星

> **品質シグナルは、改善の結果を表すべきであり、達成のために歪めてはならない。**

- test は coverage を水増しするために存在しない
- warning は黙らせるために存在しない
- Green は見かけではなく、意味を伴うべきである

数値目標（coverage 70 等）は否定しない。ただし数値を歪める達成手段を先に
禁止することで、「Green だが安心できない」状態を構造的に回避する。

## なぜ必要か

coverage を上げること自体は正しい。しかし coverage を上げるために品質のない
テストを書くなら、数字だけが上がり、実際の保守性や信頼性は上がらない。

同じことは compile / lint にも言える。warning やエラーの原因を直さず、
`@ts-ignore` や `eslint-disable` で黙らせるのは、問題を解決していないのに
「問題がないように見せる」行為である。

これは個別のレビューで気をつけて済む話ではない。AAG Core 側で「達成手段を
歪めるパターン」を機械的に止める制度が必要である。本原則は、そのための
語彙・境界・評価軸を定義する。

## Protected Harm — 何を守るのか

| ID | 害 | 定義 |
|---|---|---|
| **H1** | False Green | 本質的な品質改善がないのに、test / coverage / compile / lint が成功しているように見える状態 |
| **H2** | Review Misleading | レビュアーや未来の AI が「品質が確保された」と誤認する状態 |
| **H3** | Refactoring Fragility | 浅いテストや suppression により、将来の変更で本質的な問題が見えなくなる状態 |
| **H4** | Governance Drift | 数値目標だけが先行し、AAG が守ろうとしている「意図に沿った品質」から外れていく状態 |

ルールは必ず 1 つ以上の Protected Harm を保護する。Protected Harm に紐付かない
ルールは作らない。

## 鉄則

1. **1 rule = 1 protected harm** — test padding と warning silencing は別ルールで扱う
2. **抽象語で禁止しない** — 「意味がない」「無駄」ではなく、検知可能な bad pattern に落とす
3. **hard gate は検知可能なものから始める** — syntax / AST / 構造解析で判定できるものだけを最初の block 対象にする
4. **グレーなものは advisory / review に留める** — 意味論依存のものは即 fail にしない
5. **禁止だけで終わらせない** — 「どこが悪いか」「なぜ禁止か」「どう直すか」を固定フォーマットで返す
6. **例外を先に定義する** — smoke test、migration 中の一時 suppression、公開契約の存在確認など
7. **自動修正しない** — Signal Integrity rule は違反を検知して止めるが、テスト意味論を自動修正しない。修正は人間または作業 AI が `why` / `protectedHarm` / `steps` を読んだ上で行う

## Detection Boundary — 機械的に検知できるもの / できないもの

意味論依存のパターンを hard gate 化すると false positive で実装者の信頼を
失うため、「機械的に検知できるもの」と「機械的には断定できないが注意喚起すべき
もの」を **分けて扱う**。

### 機械的に検知できるもの（hard gate 候補）

#### TSIG-TEST-01: existence-only assertion

存在確認だけで test が完結している。`expect(fn).toBeDefined()` のみ /
`expect(value).toBeTruthy()` のみ / `typeof x === 'function'` のみ。

**Bad:**

```ts
import { calculateTotal } from './utils'

it('calculateTotal exists', () => {
  expect(calculateTotal).toBeDefined()
})
```

**Good:**

```ts
import { calculateTotal } from './utils'

it('sums positive numbers correctly', () => {
  expect(calculateTotal([1, 2, 3])).toBe(6)
})

it('handles empty arrays as zero', () => {
  expect(calculateTotal([])).toBe(0)
})
```

#### TSIG-TEST-02: render-only / import-only superficial test

render 成功だけを見て主要 assertion がない、または import / instantiate 成功
だけで終了し、主要挙動・契約・副作用が未検証。

**Bad:**

```tsx
it('HourlyChart renders', () => {
  expect(() => render(<HourlyChart {...defaultProps} />)).not.toThrow()
})
```

**Good:**

```tsx
it('HourlyChart shows hourly bars and tooltip totals', () => {
  render(<HourlyChart hours={mockHours} />)
  expect(screen.getAllByRole('img', { name: /bar/ })).toHaveLength(24)
  expect(screen.getByText('合計: ¥120,000')).toBeInTheDocument()
})
```

#### TSIG-TEST-03: snapshot-only superficial coverage

snapshot だけで重要挙動を済ませている。比較対象が構造差分のみで、意味的
assertion がない。

**Bad:**

```ts
it('matches snapshot', () => {
  expect(buildBudgetView(input)).toMatchSnapshot()
})
```

**Good:**

```ts
it('builds budget view with correct totals and gap signs', () => {
  const view = buildBudgetView(input)
  expect(view.totalBudget).toBe(1_000_000)
  expect(view.totalActual).toBe(950_000)
  expect(view.gap).toBe(-50_000)
  expect(view.gapDirection).toBe('shortage')
})
```

snapshot が補助 assertion として **追加で** 使われるのは可（差分の早期発見に有効）。
snapshot **だけ** が assertion であるケースを禁止する。

#### TSIG-COMP-01: rationale-free `@ts-ignore` / `@ts-expect-error`

suppression はあるが理由がない / `removalCondition` がない / migration comment
や期限がない。

> **実装方針:** 既存の AR-G3-SUPPRESS（`codePatternGuard.test.ts`）が
> `@ts-ignore` / `@ts-expect-error` の検出をすでに持つため、TSIG-COMP-01 は
> **新規 guard ではなく AR-G3-SUPPRESS に rationale enforcement を追加する形で
> 統合する**。allowlist エントリにも `reason` / `removalCondition` を構造化で
> 必須化する。

**Bad:**

```ts
// @ts-ignore
chart.legendSelectChanged(handler)
```

**Good:**

```ts
// @ts-expect-error reason: upstream type@1.2.0 missing optional callback
//   removalCondition: upstream type@1.3.0 release (tracked in PR #1234)
chart.legendSelectChanged(handler)
```

#### TSIG-COMP-02: rationale-free `eslint-disable`

ファイル全体 disable / `eslint-disable-next-line` はあるが理由なし / 単なる
黙らせで、根本修正の痕跡がない。

> **実装方針:** TSIG-COMP-01 と同じく、AR-G3-SUPPRESS の rationale enforcement
> 拡張で実現する。新規 guard を作らない。

**Bad:**

```ts
/* eslint-disable react-hooks/exhaustive-deps */
```

**Good:**

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
//   reason: ECharts instance is captured once on mount and stable for the
//            component's lifetime; including it would create a stale closure loop
//   removalCondition: react-hooks rule supports stable-ref annotations natively
useEffect(() => {
  echartsInstance.setOption(option)
}, [option])
```

#### TSIG-COMP-03: unused suppress escape

未使用を `_` で逃がすだけ。本来は責務整理や引数削除で解決すべきなのに
suppress を優先している。これは AR-G3-SUPPRESS の現在の検出範囲外のため
**新規ルールとして追加**する。

**Bad:**

```ts
function handleClick(_event: MouseEvent, _index: number, payload: Payload) {
  console.log(payload)
}
```

**Good:**

```ts
function handleClick(payload: Payload) {
  console.log(payload)
}
```

または `_event` / `_index` を使う必要があるなら、**なぜ受け取って捨てるのか**
を JSDoc に書く（callback signature の互換性のため等）。

### 機械的に検知しにくいもの（advisory / review 対象）

#### TSIG-ADV-01: assertion はあるが本質を検証していない

assertion 数は多いが、契約・出力・副作用のどれも見ていないケース。

#### TSIG-ADV-02: mock 過剰依存

mock call count は見ているが、本来の観測対象が置き換わっているケース。

#### TSIG-ADV-03: brittle test

内部実装詳細に強く依存し、リファクタリング耐性が低いテスト。

#### TSIG-ADV-04: 境界条件・異常系欠落

一見まともだが、見るべき異常系・境界条件が抜けているテスト。

これらは hard gate 化しない。advisory として「自己点検してほしい観点」を提示
し、Discovery Review に逃がす。

## Allowed Exceptions — 候補ではなく具体例 3 件で固定

「禁止」より「どこがダメか / なぜダメか / どう直すか」を返すのが本原則の核
であるため、good/bad 境界の代表例を **最初から具体例 3 件で固定** しておく
ことで、誤検知時の議論を高速化し、レビュアーが基準を毎回考えなくて済むように
する。

### EX-01: 公開契約としての helper existence test

```ts
// helper の存在自体が公開契約 (re-export 表面の固定)
// 同一 file の別 it() で挙動を検証している
import { renderAagResponse } from './helpers'
it('exposes renderAagResponse as a public helper', () => {
  expect(renderAagResponse).toBeDefined()
  expect(typeof renderAagResponse).toBe('function')
})
```

**条件:**

- ファイルが barrel / re-export facade である
- 存在確認が「公開 API contract の一部である」と JSDoc / コメントで明示
- 同一 file に挙動検証 test が別途存在する、または対象が「export 構造の保証」のみが目的

**NG:** helper の挙動が main subject なのに `toBeDefined()` のみで済ませている。

### EX-02: framework boundary の smoke test

```tsx
// React component の mount smoke (DOM API / framework integration の確認)
// 同一 file の別 it() で実挙動を検証している
it('mounts without throwing (smoke: framework boundary only)', () => {
  expect(() => render(<HourlyChart {...defaultProps} />)).not.toThrow()
})
```

**条件:**

- 検証対象が「framework / DOM / 外部ランタイムとの境界が成立すること」のみ
- 同一 file の他 test で挙動 / 副作用 / 出力契約が検証されている
- smoke test の意図が JSDoc / コメントで明示されている

**NG:** 本来検証すべき業務挙動を「mount 成功」で代用している。

### EX-03: removalCondition 付き一時 suppression

```ts
// @ts-expect-error reason: upstream type@1.2.0 missing optional callback
//   removalCondition: upstream type@1.3.0 release (tracked in PR #1234)
chart.on('legendSelectChanged', handler)
```

**条件:**

- `reason:` 行で構造化された理由が記述されている
- `removalCondition:` 行で削除可能になる条件が明示されている（バージョン / PR / イベント）
- allowlist エントリ（`signalIntegrity.ts`）にも同じ `reason` / `removalCondition` が機械可読形式で存在する

**NG:** `// @ts-expect-error TODO` のみ、理由なし、removalCondition なし。

### その他の許容例外

上記 3 件を骨格として、追加の例外が必要になった場合は同形式（OK pattern + 条件 + NG pattern）で追記する。**条件・NG 対比なしに例外を増やさない**。

## Standard Response Format

Signal Integrity ルールは AAG Layer 4 Response の `renderAagResponse()` を経由して
**固定フォーマット** で返す。違反時は最低でも次を返す。

### Required response fields

| フィールド | 内容 |
|---|---|
| `ruleId` | TSIG-TEST-01 / AR-G3-SUPPRESS-RATIONALE 等 |
| `summary` | 1 行説明 |
| `detected` | どのコード片が、どのパターンに該当したか |
| `why` | 構造上の問題点（挙動・契約・副作用・責務の観点） |
| `protectedHarm` | H1〜H4 のいずれか（複数可） |
| `evidence` | ファイル + 行番号 + コード片 |
| `steps` | 修正手順（1〜N） |
| `allowedExceptions` | EX-01 / EX-02 / EX-03 のいずれが適用可能か |
| `examples.bad` | 違反コード例 |
| `examples.good` | あるべきコード例 |

### Response contract

1. **何が検知されたか** — どのコード片が、どのパターンに該当したか
2. **どこがダメか** — 挙動・契約・副作用・責務の観点で説明する
3. **なぜ禁止なのか** — Protected Harm として返す
4. **どう直すか** — 意味のある test に変える方向、または suppress を外して根本修正する方向
5. **例外は何か** — EX-01〜03 の適用可能性

### Example response

#### Example A: superficial test

```
[AAG][TSIG-TEST-01][fixNow=now][governance-ops]
superficial test pattern detected: existence-only assertion

Detected
- expect(buildBar).toBeDefined() のみで test が終了している (foo.test.ts:42)

Why this is blocked
- 実装の存在確認しかしておらず、挙動・契約・副作用を検証していない
- coverage を増やしても品質保証に寄与しない

Protected harm
- H1 False Green
- H2 Review Misleading

How to fix
1. 出力契約を検証する assertion を追加する
2. 主要分岐または異常系を 1 件以上検証する
3. existence-only assertion しか残らないなら test を削除する

Allowed exceptions
- EX-01 (helper existence test): 該当しない (本ファイルは facade ではない)
```

#### Example B: warning silencing

```
[AAG][AR-G3-SUPPRESS-RATIONALE][fixNow=now][governance-ops]
signal silencing detected: eslint-disable without rationale

Detected
- eslint-disable-next-line react-hooks/exhaustive-deps が理由なしで使われている
  (HourlyChart.tsx:78)

Why this is blocked
- 問題を修正せず、検知シグナルだけを消している
- 将来の変更で本質的問題が見えなくなる

Protected harm
- H1 False Green
- H3 Refactoring Fragility

How to fix
1. disable を外して根本原因を修正する
2. 一時 suppression が必要なら reason: と removalCondition: を明記する
3. 恒久化が必要なら signalIntegrity.ts allowlist に根拠を残す

Allowed exceptions
- EX-03 (removalCondition 付き一時 suppression): 適用可。reason / removalCondition を追記すれば OK
```

## 関連実装

| パス | 役割 |
|---|---|
| `projects/test-signal-integrity/` | 本原則を実装する project |
| `app/src/test/guards/codePatternGuard.test.ts` | 既存の AR-G3-SUPPRESS ガード（TSIG-COMP-01/02 はこれを拡張） |
| `app/src/test/allowlists/signalIntegrity.ts` | G3 + Signal Integrity 共通の rationale 必須 allowlist（Phase 3 で作成） |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | Architecture Rule カタログ（TSIG-* / AR-G3-SUPPRESS-RATIONALE 登録先） |
| `tools/architecture-health/src/aag-response.ts` | `renderAagResponse()` の正本 |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 4 層構造（本原則は Layer 1） |

## 関連 reference

- `references/03-guides/architecture-rule-system.md` — Architecture Rule の運用手順
- `references/03-guides/discovery-review-checklist.md` — グレーパターンの逃がし先
- `references/03-guides/coding-conventions.md` — TypeScript / lint 規約（rationale 形式の正本）
- `projects/test-signal-integrity/plan.md` — 本原則の実装計画と Phase 構造
- `projects/presentation-quality-hardening/checklist.md` — 本原則の Phase 3 完了を coverage 70 引き上げの前提条件として参照する application-side project
