# Promote 提案書: ANA-003 (sensitivity)

> **draft**: 2026-05-04 (= AI scaffold、観測前)
>
> **本 proposal は実 WASM dual-run 観測完了後に値が埋まる。observation 前は parity 欄が placeholder。**
>
> **承認 form**: 全 ✅ 確認後、§「提案者」section の「承認待ち: user」を user signature で置換。

## 候補情報

- **Candidate ID**: CAND-ANA-003
- **対象ファイル**:
  - candidate: `app/src/domain/calculations/candidate/algorithms/sensitivity.ts`
  - current: `app/src/domain/calculations/algorithms/sensitivity.ts`
- **Contract ID**: ANA-003
- **semanticClass**: analytic
- **methodFamily**: what_if
- **bridge**: `app/src/application/services/sensitivityBridge.ts`
- **WASM crate**: `wasm/sensitivity/`
- **昇格優先度**: 2 番目 (= ANA-009 完遂後)

## 推奨順序での位置付け

ANA-009 → **ANA-003** → ANA-004 → ANA-007

## 証拠

### 1. dual-run 安定期間

- 開始日: YYYY-MM-DD (**観測時 user 記入**)
- 終了日: YYYY-MM-DD (**観測時 user 記入**)
- 期間: N 日 (≥ 3 日推奨)
- 重大差分: なし / あり（詳細）

### 2. parity 一致 (= observation で確認)

- [ ] 値一致: 全ケースで差分なし (= float 単純誤差は許容、機械 epsilon 以内)
- [ ] null 一致: 入力 null → 出力 null の伝播が一致
- [ ] warning 一致: 警告メッセージが一致
- [ ] methodUsed 一致: 使用手法 (= what_if) の記録が一致
- [ ] scope 一致: 対象期間・cohort スコープが一致
- [ ] shape 一致: 出力配列長 / fields 一致
- [ ] ordering 一致: 入力順保持
- [ ] **不変条件一致** (= ANA-003 固有):
  - [ ] 感度 ∈ [0, ∞) (= 非負実数)
  - [ ] base = scenario の場合 sensitivity = 0 (= identity)
  - [ ] scenario の magnitude scale で sensitivity が monotonic
  - [ ] divide-by-zero 安全 (= base = 0 時の挙動が TS と一致)

### 3. rollback 実演

- [ ] candidate 失敗時に current-only へ復帰可能 (= `setSensitivityBridgeMode('current-only')`)
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
// 'candidate/algorithms/sensitivity.ts' entry 削除
// 'algorithms/sensitivity.ts' entry: tag: 'review' → tag: 'required' に変更検討
//   (現在 'review' は candidate との並存中の暫定状態を articulate)
```

具体的 commit 内容:
1. `candidate/algorithms/sensitivity.ts` retire (= file 削除 or `// retired` marker)
2. `wasm/sensitivity/` retire 判断 (= Phase 9 で実施推奨)
3. `sensitivityBridge.ts` の default mode を `'current-only'` 固定
4. `calculationCanonRegistry.ts` の candidate entry 削除
5. current entry の `tag: 'review'` → `'required'` 検討

## 提案者

- 提案: AI (session: pure-calculation-reorg Phase 8)
- 提案根拠:
  1. Phase 6 で構造 readiness 12/12 達成済
  2. mock-based dual-run で値一致確認済
  3. rollback test 実装済 + fallbackPolicy=current で自動 fallback 経路あり
  4. methodFamily=what_if / invariantSet articulated
  5. 移行難度: 低
- **承認待ち: user**

## 失敗時の巻き戻し手順

candidate に重大差分が発見された場合:

1. **immediate**: `setSensitivityBridgeMode('current-only')` を即時適用
2. (auto fallback) `fallbackPolicy: 'current'` 設定により、candidate runtime error 時は automatic に current path に fallback
3. registry の candidate entry を再追加 (= 削除済の場合は git revert)
4. proposal 内「証拠」section に重大差分詳細 + 再観測判断を追記
5. 観測再開 or candidate 実装修正
6. `npm run test:guards` で全通過を確認

## promote 後 1 週間の運用

promote 後 1 週間は `fallback-to-current` mode で運用:

- session boot で `setSensitivityBridgeMode('fallback-to-current')`
- 重大 incident 0 件 → `'current-only'` 固定 (= 真 promote 完了)
- 重大 incident → 上記「失敗時の巻き戻し手順」

## 関連

- `phase-8/promotion-readiness-table.md`
- `phase-8/evidence-packs/ANA-003.json`
- `references/03-implementation/promote-ceremony-template.md`
- `references/03-implementation/analytic-kernel-migration-plan.md` §3
- `app/src/application/services/sensitivityBridge.ts`
