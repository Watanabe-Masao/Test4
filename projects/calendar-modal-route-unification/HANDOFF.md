# HANDOFF — calendar-modal-route-unification

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**未着手。** `data-flow-unification` の完了に伴い、HANDOFF §5 で
切り出された次フェーズ（カレンダーモーダル正規ルート統一）を独立 project 化した。
read path 統一の影響範囲は確認済み（モーダルのデータ取得経路 = ダッシュボードの
`categoryDailyLane.bundle` / `timeSlotLane.bundle` と乖離）。

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

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `projects/completed/data-flow-unification/HANDOFF.md` | 先行 project。§5 に Phase A/B/C の原計画 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性 |
