# Promote 提案書: ANA-007 (dowGapAnalysis)

> **draft**: 2026-05-04 (= AI scaffold、観測前)
>
> **本 proposal は実 WASM dual-run 観測完了後に値が埋まる。observation 前は parity 欄が placeholder。**
>
> **承認 form**: 全 ✅ 確認後、§「提案者」section の「承認待ち: user」を user signature で置換。

## 候補情報

- **Candidate ID**: CAND-ANA-007
- **対象ファイル**:
  - candidate: `app/src/domain/calculations/candidate/dowGapAnalysis.ts`
  - current: `app/src/domain/calculations/dowGapAnalysis.ts`
- **Contract ID**: ANA-007
- **semanticClass**: analytic
- **methodFamily**: calendar_effect
- **bridge**: `app/src/application/services/dowGapBridge.ts`
- **WASM crate**: `wasm/dow-gap/`
- **昇格優先度**: **最後** (= 3 件成功で判断材料蓄積後)

## 推奨順序での位置付け

ANA-009 → ANA-003 → ANA-004 → **ANA-007**

## ⚠️ 本 candidate 固有の risk articulation

| risk | articulation | mitigation |
|---|---|---|
| **Zod 契約未追加** | `zodAdded: false` (= 他 3 件は true) | dual-run 観測中の shape 一致を厳格 (= shape mismatch を critical diff として treat) |
| **fallbackPolicy: 'none'** | automatic fallback 経路なし | bridge mode 制御のみが rollback 経路。session boot 初期化 deploy 必須 |
| **FFI 二段構造** | `countDowsInMonth` は TS adapter / 統計計算は Rust kernel / 文字列生成 (= DOW_LABELS, warnings) は TS 側 | parity 観測で **TS 側生成 warning** と **WASM 側統計値** の両者を独立検証 |
| **warning 文字列の語彙制約** | TS 側で生成される warning text が WASM 移行後も一致するか要検証 | warnings parity を critical diff として treat |

= **本 candidate は他 3 件と evaluation 軸が異なる**。3 件成功後に観測材料を蓄積し、ANA-007 固有制約を踏まえた追加観測 criteria を articulate して進める。

## 証拠

### 1. dual-run 安定期間

- 開始日: YYYY-MM-DD (**観測時 user 記入**)
- 終了日: YYYY-MM-DD (**観測時 user 記入**)
- 期間: N 日 (≥ **7 日推奨** — 他 3 件より長い、固有 risk articulation 反映)
- 重大差分: なし / あり（詳細）

### 2. parity 一致 (= observation で確認)

- [ ] 値一致: 全ケースで差分なし
- [ ] null 一致: 入力 null → 出力 null の伝播が一致
- [ ] warning 一致 (**厳格**): 警告メッセージ文字列の完全一致
- [ ] methodUsed 一致: 使用手法 (= calendar_effect) の記録が一致
- [ ] scope 一致: 対象期間・cohort スコープが一致
- [ ] shape 一致 (**厳格**): Zod 不在のため shape 検証がここで担保
- [ ] ordering 一致: 曜日順保持 (= Sun-Sat or Mon-Sun の base ordering)
- [ ] **不変条件一致** (= ANA-007 固有):
  - [ ] **曜日合計 = 週合計** (= base invariant)
  - [ ] 月内曜日カウント = `countDowsInMonth(year, month)` の結果と一致 (= TS adapter 経由)
  - [ ] DOW_LABELS の length = 7、各 label が文字列
  - [ ] partial month (= 月初 / 月末) での日数 boundary 整合
  - [ ] 祝日 / 休業日 articulation の一致 (= 仕様で扱いを articulate)

### 3. rollback 実演

- [ ] candidate 失敗時に current-only へ復帰可能 (= `setDowGapBridgeMode('current-only')`)
- [ ] 復帰後のデータ整合性確認済み
- ⚠️ **fallbackPolicy: 'none'** — automatic fallback 経路なし。bridge mode 切替 + session boot 初期化 deploy が rollback の唯一手段

### 4. guard 通過

- [ ] Phase 0-7 全 guard 通過 (`npm run test:guards`)
- [ ] direct import 逸脱なし
- [ ] rate UI 再計算なし
- [ ] AAG hard guard 全通過 (`npm run docs:check`)

### 5. registry 更新準備

`app/src/test/calculationCanonRegistry.ts`:

```ts
// 'candidate/dowGapAnalysis.ts' entry 削除
// 'dowGapAnalysis.ts' entry: zodAdded: false → true (= promote 前提として Zod 追加検討)
```

⚠️ **promote 前の決定事項**:
1. **Zod 追加**するかしないか (= Zod 追加 → conditional ready / 追加しない → shape 一致厳格運用で代替)
2. **fallbackPolicy** を `'none'` のままにするか `'current'` に articulate update するか
3. session boot で `setDowGapBridgeMode('current-only')` を deploy 確認

具体的 commit 内容:
1. `candidate/dowGapAnalysis.ts` retire
2. `wasm/dow-gap/` retire 判断 (= Phase 9 で実施推奨)
3. `dowGapBridge.ts` の default mode を `'current-only'` 固定
4. (条件付き) Zod 契約追加
5. `calculationCanonRegistry.ts` 整理

## 提案者

- 提案: AI (session: pure-calculation-reorg Phase 8)
- 提案根拠:
  1. Phase 6 で構造 readiness 11/12 達成 (= Zod 1 件残)
  2. mock-based dual-run で値一致確認済
  3. rollback test 実装済 (= bridge mode 制御)
  4. methodFamily=calendar_effect / invariantSet articulated
  5. 移行難度: 低 (= 構造単純) but **runtime risk 中** (= Zod 不在 + fallback none)
- **承認待ち: user** (= 上記 ⚠️ 3 項目の判断含む)

## 失敗時の巻き戻し手順

candidate に重大差分が発見された場合:

1. **immediate**: `setDowGapBridgeMode('current-only')` を即時適用 (= session boot deploy 経由)
2. (⚠️ no auto fallback) — `fallbackPolicy: 'none'` のため automatic 復帰なし。bridge mode 切替が唯一の rollback 経路
3. registry の candidate entry 再追加 (= 削除済の場合は git revert)
4. proposal 内「証拠」に重大差分詳細追記
5. 観測再開 / candidate 修正
6. `npm run test:guards` 全通過確認

## promote 後 1 週間の運用 (= 他 3 件より厳格)

promote 後は **2 週間** `fallback-to-current` 相当の運用 (= 他 3 件は 1 週間):

- session boot で bridge mode を観測しやすい設定に固定
- 2 週間で重大 incident 0 件 → `'current-only'` 固定
- ⚠️ ANA-007 は fallbackPolicy=none のため `fallback-to-current` mode は厳密には設定不可。代替: `dual-run-compare` mode を 2 週間継続 (= candidate / current 両 path 並行実行で early detection 確保) → その後 `current-only` に固定

## 関連

- `phase-8/promotion-readiness-table.md`
- `phase-8/evidence-packs/ANA-007.json`
- `references/03-implementation/promote-ceremony-template.md`
- `references/03-implementation/analytic-kernel-migration-plan.md` §3
- `app/src/application/services/dowGapBridge.ts`
