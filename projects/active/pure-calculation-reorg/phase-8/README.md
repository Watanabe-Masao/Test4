# Phase 8: Promote Ceremony — Entry Artifacts (= A2 scope)

> **landed**: 2026-05-04 (= pure-calculation-reorg Phase 8 entry preparation)
>
> **scope**: AI が事前に作成可能な promote 提案 artifact。実 WASM build / DEV dual-run 観測 / user 承認 は **本 artifact landing 後** に user 主体で実行。
>
> **責任配分** (= 不可侵原則 1 整合):
>
> | 主体 | 責任 |
> |---|---|
> | **AI** (本 session) | EvidencePack scaffold 生成 / promotion-readiness 判定表 articulate / Promote 提案書 4 通 draft |
> | **user** (後続 session) | wasm-pack install + build / DEV dual-run 観測 / 安定期間判定 / **昇格承認** |
>
> AI は提案者にとどまる。最終 promote 判断 = user 承認のみ。

## Phase 8 entry state (= 2026-05-04)

### 真昇格対象 candidate (4 件)

| ID | candidate file | current file | methodFamily | 移行難度 |
|---|---|---|---|---|
| ANA-003 | `candidate/algorithms/sensitivity.ts` | `algorithms/sensitivity.ts` | `what_if` | 低 |
| ANA-004 | `candidate/algorithms/trendAnalysis.ts` | `algorithms/trendAnalysis.ts` | `temporal_pattern` | 低 |
| ANA-007 | `candidate/dowGapAnalysis.ts` | `dowGapAnalysis.ts` | `calendar_effect` | 低 |
| ANA-009 | `candidate/temporal/computeMovingAverage.ts` | `temporal/computeMovingAverage.ts` | `time_series` | 低 |

### 別 lane (= 真昇格 scope 外)

- **ANA-005 (correlation)**: registry に candidate / current 両 entry あり、`generateEvidencePack` は `track: current-quality` と判定。**真昇格 4 件と区別**して別途扱う (= ANA-005 promote ceremony は本 phase-8 scope 外、本 4 件 ceremony 完遂後に再評価)
- **BIZ-008〜013 (6 件)** + **ANA-001/002/006 (3 件)** = `track: current-quality`。既に current、Phase 8 ceremony 不要 (= 品質再検証のみ別 task)

## directory 構成

| path | 役割 |
|---|---|
| `README.md` (本 file) | scope + workflow + responsibility 配分 |
| `promotion-readiness-table.md` | 4 candidate の readiness 個別評価 + observation entry/exit criteria |
| `proposals/<ID>.md` | candidate 別 Promote 提案書 (= user 承認 form、観測後に値埋め) |
| `evidence-packs/<ID>.json` | `generateEvidencePack` で landing した raw scaffold (= placeholder のまま、観測後に値埋め) |

## user-side workflow (= 本 session 後の手順)

1. **wasm-pack install** (= `cargo install wasm-pack` または公式 installer)
2. **`cd app && npm run build:wasm`** (= 18 crate fresh build、初回 long compile)
3. **`npm run dev`** で DEV server 起動
4. 各 candidate に対し以下:
   - bridge mode を `dual-run-compare` に切替 (= `set<X>BridgeMode('dual-run-compare')` を session boot 経由で呼ぶ)
   - 通常運用で対象 chart / page を navigate (= 値計算経路を発火)
   - `getLast<X>DualRunResult()` で parity 結果を観測
   - `evidence-packs/<ID>.json` の `parityResult` / `rollbackEvidence` / `guardStatus` に観測値を埋める
5. **安定期間** = 重大差分 0 件で N 日連続 (= 推奨 7 日、minimum 3 日)
6. 全 candidate で安定確認後、`proposals/<ID>.md` を埋め (= user が approve 欄を articulate)
7. **`npm run test:guards`** + **`docs:generate`** PASS 確認後、registry promotion を atomic commit
8. promote 後 1 週間は `fallback-to-current` mode で運用 (= rollback 可能性確保)

## 不可侵原則 (= promote-ceremony-template §4)

1. 実装 AI は提案のみ。**承認は user**
2. promotion-ready だけで current 扱いにしない。**Ceremony を経る**
3. **dual-run 未実施**の candidate は昇格しない
4. **rollback 不可**の candidate は昇格しない
5. **巻き戻し手順**を必ず準備してから昇格する

## Phase 8 完了条件 (= checklist 整合)

- [ ] 4 candidate 全件で dual-run 安定期間 (≥3 日) 達成
- [ ] 4 candidate 全件で parity (value / null / warning / methodUsed / scope / shape / ordering / invariant) 一致確認
- [ ] 4 candidate 全件で rollback 実演確認
- [ ] direct import 逸脱 0 件 (= `test:guards` PASS)
- [ ] AAG hard guard 全通過
- [ ] registry promotion 4 件 atomic commit
- [ ] promote 失敗時の巻き戻し手順 articulated (= 各 proposal §「失敗時の巻き戻し手順」)
- [ ] **user 最終承認** (= 各 proposal の「承認待ち」欄が user signature で埋まる)

## 参照

- `references/03-implementation/promote-ceremony-template.md` (= 本 phase 親 template)
- `references/03-implementation/analytic-kernel-migration-plan.md` (= Phase 6 readiness 判定基準)
- `app/src/test/aagSchemas.ts` (= EvidencePack / PromoteRecord schema)
- `app/src/test/generators/generateEvidencePack.ts` (= scaffold 生成 tool)
