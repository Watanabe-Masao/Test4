# HANDOFF — calendar-modal-route-unification

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase A 完了（Option C 採用）。** 棚卸し（§1.1）と方針判断（§3.5）を経て、
`useDayDetailPlan` の (day, prevDay) / (cum, cumPrev) を `categoryTimeRecordsPairHandler`
経由に置換。wow は単発のまま、prevDayFallback / cumPrevFallback は Phase B で
撤廃判断する。lint / build / test:guards (694) / 関連テスト (225) すべて green。
次は Phase B（数量・時間帯の bundle 経由化）。

### Phase A 適用後の handler 呼び出し（5 箇所）

| # | 用途 | handler |
|---|------|---------|
| 1 | dayPair (day + prevDay) | `categoryTimeRecordsPairHandler` |
| 2 | prevDayFallback | `categoryTimeRecordsHandler`（フォールバック・Phase B で撤廃判断） |
| 3 | wow | `categoryTimeRecordsHandler`（単発・比較相手なし） |
| 4 | cumPair (cum + cumPrev) | `categoryTimeRecordsPairHandler` |
| 5 | cumPrevFallback | `categoryTimeRecordsHandler`（フォールバック・Phase B で撤廃判断） |

7 → 5 箇所に縮約（pair 化で current+comparison が 1 呼び出しに統合）。

### `selectCtsWithFallback` 依存先（Phase A 後）

- 定義: `app/src/application/hooks/duckdb/dayDetailDataLogic.ts`
- pair 用 sibling として `selectCtsWithFallbackFromPair` を追加
- 利用箇所:
  - `useDayDetailPlan.ts` は **`selectCtsWithFallbackFromPair`** に置換済み
  - `dayDetailDataLogic.test.ts`（test）
- 旧 `selectCtsWithFallback` の本番利用は 0 件だが、関数自体は残置（Phase B で撤廃判断）

## 1.1. Phase A 棚卸し結果

### `useDayDetailPlan` 内 `categoryTimeRecordsHandler` 直接呼び出し: 7 箇所

ファイル: `app/src/application/hooks/plans/useDayDetailPlan.ts`

| # | line | 変数 | input | スコープ | グルーピング |
|---|------|------|-------|---------|------|
| 1 | 97  | `dayResult`         | `cts.day`             | current      | day pair |
| 2 | 98  | `prevDayResult`     | `cts.prevDay`         | prev (true)  | day pair |
| 3 | 99–103 | `prevDayFallback` | `cts.prevDayFallback` | current at prev date | day fallback |
| 4 | 104 | `wowResult`         | `cts.wow`             | current      | wow（単発）|
| 5 | 105 | `cumResult`         | `cts.cum`             | current      | cum pair |
| 6 | 106 | `cumPrevResult`     | `cts.cumPrev`         | prev (true)  | cum pair |
| 7 | 107–111 | `cumPrevFallback` | `cts.cumPrevFallback` | current at prev date | cum fallback |

構造: **2 ペア（day, cum）+ 1 単発（wow）+ 2 フォールバック**

### `categoryTimeRecordsPairHandler` の API 形状

```ts
// app/src/application/queries/cts/CategoryTimeRecordsPairHandler.ts
export const categoryTimeRecordsPairHandler =
  createPairedHandler(categoryTimeRecordsHandler, { name: 'CategoryTimeRecordsPair' })
```

- `createPairedHandler`（`app/src/application/queries/createPairedHandler.ts`）は base handler を `comparisonDateFrom/To` 入力で並列実行する factory
- 仕様: 「同型 current/comparison に限定。alignment が特殊なものは専用 pair handler」
- comparison 側は `comparisonDateFrom/To` 未指定なら `null`
- フォールバック概念は持たない

### `selectCtsWithFallback` の依存範囲

- 定義: `app/src/application/hooks/duckdb/dayDetailDataLogic.ts:178`
- 利用箇所: 3 ファイル
  - `app/src/application/hooks/plans/useDayDetailPlan.ts`（line 113–114、本対象）
  - `app/src/application/hooks/duckdb/__tests__/dayDetailDataLogic.test.ts`（test）
  - `app/src/application/hooks/duckdb/dayDetailDataLogic.ts`（自身の定義）
- 動作: `is_prev_year=true` 結果が空なら `is_prev_year=false` の同日付結果で代替
- 存在理由: `data-flow-unification` 以前は前年データの DuckDB 投入が不完全だったための救済

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先（Phase A: paired handler 統一）

- `useDayDetailPlan` から `categoryTimeRecordsHandler` を直接呼んでいる箇所を
  `categoryTimeRecordsPairHandler` 経由に統一する
- これで取得経路は 1 本化。raw CTS 参照は残るが handler は共通になる
- 前年データの独自フォールバック（`selectCtsWithFallback`）の利用範囲を縮小する

### 中優先（Phase B: 数量・時間帯の bundle 経由化）

- モーダルの数量合算を
  `categoryDailyLane.bundle.currentSeries.grandTotals.salesQty` 経由に移す
- モーダルの時間帯データを `timeSlotLane.bundle` 経由に移す
- `selectCtsWithFallback` の独自フォールバック機構を完全廃止する

### 低優先（撤退判定とガード固定）

- `categoryDailyLaneSurfaceGuard` の baseline が 0 に到達することを検証する
- 旧経路を使う consumer が 0 件になったタイミングで関連コードを物理削除する

### Out of scope（別 project）

- Phase C: leaf-grain 対応（`CategoryLeafDailySeries` 新設、5 要素分解の正本経路化、
  Phase 6.5-5b の permanent floor 解消）— 影響範囲が大きいため別プロジェクトで計画
- **DayDetailModal の構造リフレッシュ**（`calendar-modal-refresh` 仮）— 初期実装由来の
  props drilling / presentation での store 直アクセス / インライン計算等の解消。
  本 project 完了後に別 project として起票（plan.md §後続 project 候補 参照）

## 3. ハマりポイント

### 3.1. モーダルとダッシュボードで同じ数値を出す責任の所在

raw CTS を直接合算する関数とドメイン層の `categoryDailyLane.bundle` で
微妙に値がズレる事例が過去にあった。bundle 側は売上区分・税種別・無効行除外などの
正規化を経ているため、raw 合算と差が出るのは正常。**Phase B では数値が
変わる可能性を前提に、ダッシュボードと一致するかを必ず突き合わせる。**

### 3.2. `selectCtsWithFallback` の独自フォールバックは何を補っていたか

`is_prev_year=true` 行が DuckDB に揃っていない時代に、IndexedDB の raw を
直接参照するフォールバックとして機能していた。`data-flow-unification` で
DuckDB ロード網羅性が保証された今、フォールバックの存在理由は薄れている。
**削除する前に、本当にゼロ件レスポンスを正しく扱えるかを確認する。**

### 3.3. handler 統一だけで read path が完全に閉じるわけではない

`useDayDetailPlan` の構造上、handler を統一しても、その下流で raw CTS の
個別走査が残るケースがある。Phase B で bundle 経由化を行うまでは
「handler は共通だが消費は独自」の中途状態が発生する。**Phase A 完了時点で
回帰テストを通し、Phase B との境界での挙動差を最小化する。**

### 3.4. leaf-grain（5 要素分解）は本 project では触らない

5 要素分解は `dept|line|klass` 粒度を必要とし、`categoryDailyLane.bundle` の
現行スキーマでは表現できない。**本 project は scope 外として明示的に切り出す。**
Phase C を別プロジェクトとして計画する際は `CategoryLeafDailySeries` の
新設が前提になる。

### 3.5. pair 化は構造的に「同型 2 ペア」のみが対象（**判断点**）

棚卸しの結果、7 箇所の handler 呼び出しは以下の構造を持つ:

- **同型 pair 化可能（2 組）**: (day, prevDay) / (cum, cumPrev) — `createPairedHandler` の
  「同型 current/comparison」契約に合致する
- **単発のまま維持（1 組）**: wow — 比較相手を持たない
- **フォールバック（2 箇所）**: prevDayFallback / cumPrevFallback —
  `createPairedHandler` がフォールバック概念を持たないため、pair 化しても残る

つまり pair 化だけでは `selectCtsWithFallback` への依存は消えない。
`data-flow-unification` で write path が保証された今、**フォールバック層自体の
存続を判断する必要がある**:

| 選択肢 | 内容 | リスク |
|---|---|---|
| A | フォールバック層を残したまま pair 化（最小変更） | `selectCtsWithFallback` 依存が残り Phase B 完了が遠のく |
| B | フォールバック層を即時撤廃して pair 化のみ実施 | DuckDB に前年データが投入される前にレンダーすると一時的に空表示 |
| C | フォールバック層を残し、pair 化は (day, prevDay) (cum, cumPrev) のみに限定（wow は単発維持） | 当面の安全策。Phase B で bundle 経由化と同時にフォールバック撤廃を再評価 |

C が最も保守的だが「動線が混ざる」状態が長く残る。
B が最も方針整合的だが、レンダー初回の空ハンドリングを別途確認する必要がある。

**判断主体**: architecture（layer 跨ぎの設計判断）。
**決定事項**: 採用したオプションを `plan.md` の不可侵原則に追記し、Phase A の
2 件目の checkbox（実装）は決定後に着手する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `projects/completed/data-flow-unification/HANDOFF.md` | 先行 project。§5 に Phase A/B/C の原計画 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性 |
