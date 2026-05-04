# Promote 提案書: ANA-009 (computeMovingAverage)

> **draft**: 2026-05-04 (= AI scaffold、観測前)
>
> **本 proposal は実 WASM dual-run 観測完了後に値が埋まる。observation 前は parity 欄が placeholder。**
>
> **承認 form**: 全 ✅ 確認後、§「提案者」section の「承認待ち: user」を user signature で置換。

## 候補情報

- **Candidate ID**: CAND-ANA-009
- **対象ファイル**:
  - candidate: `app/src/domain/calculations/candidate/temporal/computeMovingAverage.ts`
  - current: `app/src/domain/calculations/temporal/computeMovingAverage.ts`
- **Contract ID**: ANA-009
- **semanticClass**: analytic
- **methodFamily**: time_series
- **bridge**: `app/src/application/services/movingAverageBridge.ts`
- **WASM crate**: `wasm/moving-average/`
- **昇格優先度**: **最初** (= 4 件中で最も単純、他 candidate の reference)

## 推奨順序での位置付け

ANA-009 → ANA-003 → ANA-004 → ANA-007 (= readiness-table 参照)

## 証拠

### 1. dual-run 安定期間

- 開始日: YYYY-MM-DD (**観測時 user 記入**)
- 終了日: YYYY-MM-DD (**観測時 user 記入**)
- 期間: N 日 (≥ 3 日推奨)
- 重大差分: なし / あり（詳細）

### 2. parity 一致 (= observation で確認)

- [ ] 値一致: 全ケースで差分なし
- [ ] null 一致: 入力 null → 出力 null の伝播が一致 (= MovingAverageMissingnessPolicy `'propagate'` ケース)
- [ ] warning 一致: 警告メッセージが一致
- [ ] methodUsed 一致: 使用手法の記録が一致
- [ ] scope 一致: 対象期間・店舗スコープが一致
- [ ] shape 一致: 出力配列長が窓幅 / 入力長と一致
- [ ] ordering 一致: 時系列順 (= 入力順保持)
- [ ] **不変条件一致** (= ANA-009 固有):
  - [ ] 窓幅 ≥ 1
  - [ ] 単調 NaN 伝播 (= missingnessPolicy=`'propagate'` で missing → NaN 出力)
  - [ ] sufficient ケースで weighted mean が窓内有効点の算術平均と一致
  - [ ] insufficient ケースで status='missing' + value=null

### 3. rollback 実演

- [ ] candidate 失敗時に current-only へ復帰可能 (= `setMovingAverageBridgeMode('current-only')`)
- [ ] 復帰後のデータ整合性確認済み
- ⚠️ **fallbackPolicy: 'none'** — automatic fallback なし。bridge mode 切替が rollback の唯一手段。手順は本書 §「失敗時の巻き戻し手順」参照

### 4. guard 通過

- [ ] Phase 0-7 全 guard 通過 (`npm run test:guards`)
- [ ] direct import 逸脱なし
- [ ] rate UI 再計算なし
- [ ] AAG hard guard 全通過 (`npm run docs:check`)

### 5. registry 更新準備

`app/src/test/calculationCanonRegistry.ts`:

```ts
// 'candidate/temporal/computeMovingAverage.ts' entry 削除
// 'temporal/computeMovingAverage.ts' entry を以下に更新:
{
  // 現在: tag: 'review', runtimeStatus: 'current', authorityKind: 'analytic-authoritative', ownerKind: 'maintenance'
  // → 維持 (current の registry 自体は既に正しい状態。本 promote では candidate entry 削除のみ)
}
```

**実態**: ANA-009 は既に current entry が `analytic-authoritative` / `current` / `maintenance` で articulated されている。**本 promote の本質は candidate entry の retire** (= candidate path retire + bridge mode default を current-only に固定)。

具体的 commit 内容:
1. `candidate/temporal/computeMovingAverage.ts` retire (= file 削除 or `// retired` marker)
2. `wasm/moving-average/` retire 判断 (= Phase 9 で実施推奨、本 phase ではまだ削除しない)
3. `movingAverageBridge.ts` の default mode を `'current-only'` 固定 (= 既に default だが明示的に articulate)
4. `calculationCanonRegistry.ts` の `candidate/temporal/computeMovingAverage.ts` entry 削除
5. registry 内 ANA-009 contract 単一化 (= current entry のみ残す)

## 提案者

- 提案: AI (session: aag-self-hosting-completion successor / pure-calculation-reorg Phase 8)
- 提案根拠:
  1. Phase 6 で構造 readiness 12/12 達成済 (= readiness-table 参照)
  2. mock-based dual-run で値一致確認済
  3. rollback test 実装済 (`setMovingAverageBridgeMode('current-only')`)
  4. methodFamily / invariantSet articulated
  5. 移行難度: 低 (= migration plan §3 評価)
- **承認待ち: user** (= signature 欄: `___________________________`)

## 失敗時の巻き戻し手順

candidate に重大差分が発見された場合:

1. **immediate**: `setMovingAverageBridgeMode('current-only')` を session boot 経由で適用 (= 即時 current 復帰、deploy 不要)
2. registry の `candidate/temporal/computeMovingAverage.ts` entry を再追加 (= 削除済の場合は git revert)
3. proposal 内「証拠」section に **重大差分の詳細** + **再観測判断** を追記
4. 観測再開 or candidate 実装修正 (= TS adapter / WASM kernel どちらに root cause か articulate)
5. `npm run test:guards` で全通過を確認

⚠️ **fallbackPolicy: 'none'** = automatic fallback path なし。本 candidate は bridge mode 制御のみが rollback 経路。session 開始時に必ず `current-only` で start させる初期化を deploy する設計が前提。

## promote 後 1 週間の運用 (= 不可侵原則 1 整合)

promote 後は **fallback-to-current mode で運用** (= 万一 candidate に hidden bug が顕在化した場合の自動フォールバック確保):

- session boot で `setMovingAverageBridgeMode('fallback-to-current')` を設定
- 1 週間で重大 incident 0 件 → `'current-only'` (= 真 promote 完了) に固定
- 1 週間以内に重大 incident → 上記「失敗時の巻き戻し手順」に従い rollback

## 関連

- `phase-8/promotion-readiness-table.md` §「Pre-observation readiness」
- `phase-8/evidence-packs/ANA-009.json` (= raw scaffold)
- `references/03-implementation/promote-ceremony-template.md`
- `references/03-implementation/analytic-kernel-migration-plan.md` §3
- `app/src/application/services/movingAverageBridge.ts`
