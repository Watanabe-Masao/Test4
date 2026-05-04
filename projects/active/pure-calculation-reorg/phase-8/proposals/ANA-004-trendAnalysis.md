# Promote 提案書: ANA-004 (trendAnalysis)

> **draft**: 2026-05-04 (= AI scaffold、観測前)
>
> **本 proposal は実 WASM dual-run 観測完了後に値が埋まる。observation 前は parity 欄が placeholder。**
>
> **承認 form**: 全 ✅ 確認後、§「提案者」section の「承認待ち: user」を user signature で置換。

## 候補情報

- **Candidate ID**: CAND-ANA-004
- **対象ファイル**:
  - candidate: `app/src/domain/calculations/candidate/algorithms/trendAnalysis.ts`
  - current: `app/src/domain/calculations/algorithms/trendAnalysis.ts`
- **Contract ID**: ANA-004
- **semanticClass**: analytic
- **methodFamily**: temporal_pattern
- **bridge**: `app/src/application/services/trendAnalysisBridge.ts`
- **WASM crate**: `wasm/trend-analysis/`
- **昇格優先度**: 3 番目 (= ANA-009 / ANA-003 完遂後)

## 推奨順序での位置付け

ANA-009 → ANA-003 → **ANA-004** → ANA-007

## 証拠

### 1. dual-run 安定期間

- 開始日: YYYY-MM-DD (**観測時 user 記入**)
- 終了日: YYYY-MM-DD (**観測時 user 記入**)
- 期間: N 日 (≥ 3 日推奨)
- 重大差分: なし / あり（詳細）

### 2. parity 一致 (= observation で確認)

- [ ] 値一致: 全ケースで差分なし (= MoM / YoY 比較値)
- [ ] null 一致: 入力 null → 出力 null の伝播が一致
- [ ] warning 一致: 警告メッセージが一致
- [ ] methodUsed 一致: 使用手法 (= temporal_pattern) の記録が一致
- [ ] scope 一致: 対象期間・cohort スコープが一致
- [ ] shape 一致: 出力配列長 / fields 一致 (= years + months + totalSales 3 列 flat contract)
- [ ] ordering 一致: 時系列順保持
- [ ] **不変条件一致** (= ANA-004 固有):
  - [ ] MoM/YoY 比較基準の一致 (= 同月比 / 同月前年比のキー一致)
  - [ ] base 月不在時の null 伝播
  - [ ] 12 ヶ月境界での YoY rollover 整合
  - [ ] 入力データ少数月時の partial trend 出力規則一致

### 3. rollback 実演

- [ ] candidate 失敗時に current-only へ復帰可能 (= `setTrendAnalysisBridgeMode('current-only')`)
- [ ] 復帰後のデータ整合性確認済み
- [ ] `fallbackPolicy: 'current'` (= 自動 fallback 経路あり)

### 4. guard 通過

- [ ] Phase 0-7 全 guard 通過 (`npm run test:guards`)
- [ ] direct import 逸脱なし
- [ ] rate UI 再計算なし
- [ ] AAG hard guard 全通過 (`npm run docs:check`)

### 5. registry 更新準備

`app/src/test/calculationCanonRegistry.ts`:

```ts
// 'candidate/algorithms/trendAnalysis.ts' entry 削除
// 'algorithms/trendAnalysis.ts' entry: tag: 'review' → tag: 'required' に変更検討
```

具体的 commit 内容:
1. `candidate/algorithms/trendAnalysis.ts` retire
2. `wasm/trend-analysis/` retire 判断 (= Phase 9 で実施推奨)
3. `trendAnalysisBridge.ts` の default mode を `'current-only'` 固定
4. `calculationCanonRegistry.ts` の candidate entry 削除
5. current entry の `tag` 整理

## 提案者

- 提案: AI (session: pure-calculation-reorg Phase 8)
- 提案根拠:
  1. Phase 6 で構造 readiness 12/12 達成済
  2. mock-based dual-run で値一致確認済
  3. rollback test 実装済 + fallbackPolicy=current で自動 fallback 経路あり
  4. methodFamily=temporal_pattern / invariantSet articulated
  5. flat 3 列 FFI contract (= years+months+totalSales) で marshalling cost 低
  6. 移行難度: 低
- **承認待ち: user**

## 失敗時の巻き戻し手順

candidate に重大差分が発見された場合:

1. **immediate**: `setTrendAnalysisBridgeMode('current-only')` を即時適用
2. (auto fallback) `fallbackPolicy: 'current'` 設定により automatic fallback
3. registry の candidate entry 再追加 / 観測再開
4. proposal 内「証拠」に重大差分詳細追記
5. `npm run test:guards` 全通過確認

## promote 後 1 週間の運用

promote 後 1 週間は `fallback-to-current` mode で運用 (= ANA-003 と同等手順)。

## 関連

- `phase-8/promotion-readiness-table.md`
- `phase-8/evidence-packs/ANA-004.json`
- `references/03-implementation/promote-ceremony-template.md`
- `references/03-implementation/analytic-kernel-migration-plan.md` §3
- `app/src/application/services/trendAnalysisBridge.ts`
