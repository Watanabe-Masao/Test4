# Promote Ceremony テンプレート

> Phase 8: candidate → current 昇格の正式手順

## 1. 目的

promotion-ready の candidate を current に正式編入する。
**判定主体は「AAG 証拠収集 → AI 提案 → 人間承認」。実装 AI の自己承認は禁止。**

### EvidencePack による証拠ベース化

提案書の証拠セクションは `AagEvidencePack` スキーマに準拠する。
テンプレート生成コマンド:

```bash
cd app && npx tsx src/test/generators/generateEvidencePack.ts BIZ-012
cd app && npx tsx src/test/generators/generateEvidencePack.ts --all
```

生成された JSON は parity / rollback が placeholder のため、観測後に埋める。
昇格判定の最終形は `AagPromoteRecord`（`app/src/test/aagSchemas.ts`）。

- スキーマ定義: `app/src/test/aagSchemas.ts` — AagEvidencePack / AagPromoteRecord
- 生成ツール: `app/src/test/generators/generateEvidencePack.ts`
- 正本ポリシー: `references/99-archive/aag-5-source-of-truth-policy.md`

## 2. 提案書フォーマット

candidate が promotion-ready になったら、以下のフォーマットで提案書を作成する:

```markdown
# Promote 提案書: [candidate ID]

## 候補情報
- **Candidate ID**: CAND-BIZ-XXX / CAND-ANA-XXX
- **対象ファイル**: domain/calculations/xxx.ts
- **Contract ID**: BIZ-XXX / ANA-XXX
- **semanticClass**: business / analytic
- **methodFamily**: xxx

## 証拠

### 1. dual-run 安定期間
- 開始日: YYYY-MM-DD
- 終了日: YYYY-MM-DD
- 期間: N 日
- 重大差分: なし / あり（詳細）

### 2. parity 一致
- [ ] 値一致: 全ケースで差分なし
- [ ] null 一致: 入力 null → 出力 null の伝播が一致
- [ ] warning 一致: 警告メッセージが一致
- [ ] methodUsed 一致: 使用手法の記録が一致
- [ ] scope 一致: 対象期間・店舗スコープが一致
- [ ] (Analytic のみ) shape 一致: 出力形状が一致
- [ ] (Analytic のみ) ordering 一致: 出力順序が一致
- [ ] (Analytic のみ) 不変条件一致: invariantSet の全条件を満たす

### 3. rollback 実演
- [ ] candidate 失敗時に current-only へ復帰可能
- [ ] 復帰後のデータ整合性確認済み

### 4. guard 通過
- [ ] Phase 0-7 全 guard 通過
- [ ] direct import 逸脱なし
- [ ] rate UI 再計算なし

### 5. registry 更新準備
- runtimeStatus: candidate → current
- authorityKind: candidate-authoritative → business-authoritative / analytic-authoritative
- ownerKind: migration → maintenance

## 提案者
- 提案: AI (session: xxx)
- **承認待ち: 人間**

## 失敗時の巻き戻し手順
1. registry の runtimeStatus を candidate に戻す
2. authorityKind を candidate-authoritative に戻す
3. bridge モードを current-only に戻す（candidate を無効化）
4. npm run test:guards で全通過を確認
```

## 3. 昇格実施手順

人間が承認した後:

1. `calculationCanonRegistry.ts` の対象エントリを更新
   - `runtimeStatus: 'current'`
   - `authorityKind: 'business-authoritative'` or `'analytic-authoritative'`
   - `ownerKind: 'maintenance'`
2. bridge のデフォルトモードを新 current に切替
3. `npm run test:guards` で全通過確認
4. `npm run docs:generate` で health 更新
5. コミット + プッシュ

## 4. 昇格の不可侵原則

1. **実装 AI は提案のみ。承認は人間。**
2. **promotion-ready だけで current 扱いにしない。Ceremony を経る。**
3. **dual-run 未実施の candidate は昇格しない。**
4. **rollback 不可の candidate は昇格しない。**
5. **巻き戻し手順を必ず準備してから昇格する。**

## 5. 関連文書

- `references/03-guides/tier1-business-migration-plan.md` — Phase 5 の promotion-ready 判定基準
- `references/03-guides/analytic-kernel-migration-plan.md` — Phase 6 の promotion-ready 判定基準
- `references/03-guides/guard-consolidation-and-js-retirement.md` — 全 guard マップ
- `references/03-guides/current-maintenance-policy.md` — 昇格後は current 群の保守ポリシーに従う
