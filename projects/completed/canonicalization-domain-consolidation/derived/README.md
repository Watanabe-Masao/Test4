# derived/ — canonicalization-domain-consolidation 派生ファイル

> Phase A primary deliverable の machine-readable 補助。
> AI / collector / 後続 phase の自動化が parse できる構造化形式。

## ファイル一覧

| ファイル                          | 役割                                                                                                         | 正本 (prose)                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `adoption-candidates.json`        | Phase A §4 採用候補リストの構造化版 (priority / phase / primitives / risk / note)                            | `references/03-guides/integrity-pair-inventory.md §4` |
| `adoption-candidates.schema.json` | 上記 JSON の JSON Schema (Draft 2020-12)。13 ペア / 3 ゲート / 6+8+1+4 primitive 等の cardinality を機械検証 | (本 file 自体が schema 正本)                          |

## 使い方

- AI が「Phase D Wave 1 の対象は?」を引く: `existingPairs[].phase === 'D-W1'` で filter
- collector が primitive 別の依存を計算: `existingPairs[].primitives` を集計
- review-gate が priority 順を確認: `existingPairs[].priority` で sort
- Phase H 着手判定: `horizontalCandidates[].tier === 'tier1'`

## 同期規約

prose 側 (`integrity-pair-inventory.md §4`) を正本とし、本 JSON は派生。
prose 更新時は本 JSON も同 PR で更新する。
逆方向の更新（JSON → prose）は禁止（prose の「なぜ」「設計判断」が脱落するため）。

## 後続 phase の用途

- **Phase B**: `primitives` から抽出順を決定（Phase A §3.5 のリスク低 → 高に対応）
- **Phase C**: `existingPairs[?priority === 2]` (doc-registry, lowest risk migration) を最初の adapter 化
- **Phase D**: Wave 1〜3 を `phase` field で dispatch
- **Phase H**: `horizontalCandidates[].tier === 'tier1'` を順次採用
