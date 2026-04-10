# 引き継ぎ書 — Pure 計算責務再編（Phase 8 以降へ）

## 1. 現在地

Phase 0-7 の構造基盤が完了。ブランチ `claude/create-handoff-docs-tFlIF` にプッシュ済み。

```
77064e8  Phase 3 — 契約固定 + bridge 境界定義
5825f22  Phase 4 — current 群の意味再分類・保守対象化
009d079  Phase 5 — Tier 1 Business 候補移行の構造基盤
4edf78e  Phase 6 — Analytic Kernel 候補移行の構造基盤
e7f195e  Phase 7 — Guard 統合整理 + JS 正本縮退方針
```

本体: **v1.8.0**。AAG（アーキテクチャ品質管理）: **v4.5.0**。Guard: **53 ファイル / 461 テスト**。Architecture Rules: **140 ルール**。Hard Gate: **PASS**。

## 2. 完了した Phase の概要

| Phase | 主な成果物 | Guard 追加 |
|-------|-----------|-----------|
| 0 | 意味分類ポリシー + authoritative 用語スイープ | +1 |
| 1 | 意味分類 Inventory（35 ファイル分類） | — |
| 2 | CanonEntry 完全定義 + Derived View + block-merge | +4 |
| 3 | 契約定義ポリシー + registry 契約値 22件 + bridge JSDoc + wasmEngine metadata | +6 |
| 4 | current 群保守ポリシー + 7 Cargo.toml metadata | +7 |
| 5 | Tier 1 Business 移行計画（候補 6件 + 8ステップ + 判定基準） | +7 |
| 6 | Analytic Kernel 移行計画（候補 9件 + 9ステップ + 不変条件） | +7 |
| 7 | Guard 統合整理 + JS 正本縮退 4段階 + 違反レスポンス設計 | +4 |

## 3. 最初に読むファイル（優先順）

| ファイル | なぜ読むか |
|---------|-----------|
| `plan.md` | 全体計画。Phase 8 以降の成果物と受け入れ条件 |
| `plan-checklist.md` | Phase 単位のチェックリスト |
| `references/03-guides/tier1-business-migration-plan.md` | Tier 1 候補 6件 + 8ステップ移行プロセス |
| `references/03-guides/analytic-kernel-migration-plan.md` | Analytic 候補 9件 + 9ステップ移行プロセス |
| `references/03-guides/guard-consolidation-and-js-retirement.md` | 全 guard マップ + JS 縮退 4段階 |
| `references/03-guides/contract-definition-policy.md` | BIZ/ANA 契約テンプレート |
| `references/03-guides/current-maintenance-policy.md` | current 群の保守観点 |
| `app/src/test/calculationCanonRegistry.ts` | Master Registry（35 エントリ + 契約値） |
| `app/src/test/architectureRules.ts` | 全 140 ルール |
| `references/03-guides/promote-ceremony-template.md` | Phase 8 の昇格手順テンプレート |

## 4. Phase 8 以降でやること

### Phase 8: Promote Ceremony

candidate が promotion-ready になったら実行する昇格手順。

1. promote 提案書を作成（テンプレートあり）
2. 判定主体は「AAG 証拠収集 → AI 提案 → **人間承認**」
3. dual-run 安定期間の確認
4. null / warning / methodUsed / scope 一致の確認
5. rollback 実演の確認
6. promote 実施 → registry / contract / bridge metadata 更新
7. 失敗時の巻き戻し手順

**鉄則:** 実装 AI が自己承認してはならない。promotion-ready だけで current 扱いにしてはならない。

### Phase 9: JS retired-js 化

current 昇格済み責務だけを対象に、JS reference を段階的に縮退:
- compare-reference → fallback-only → retired-js の順に下げる
- 旧 JS path 禁止 guard を入れる
- repo 全体一括削除は禁止

### Phase 10: 物理構造の収束

semanticClass 棚卸し一巡後、必要範囲だけ物理移動。意味分類が揺れている状態で大規模リネームしない。

### Phase 11: 意味拡張 + UI 進化

Business / Analytic の境界が安定してから新しい KPI / 説明指標を導入。

## 5. Phase 8 を始めるための前提条件

Phase 8 は **candidate 実装が promotion-ready であること**が前提。
つまり、以下が完了していること:

1. ✅ candidate 一覧が確定している（Phase 5-6 で完了）
2. ✅ 契約が固定されている（Phase 3 で完了）
3. ✅ guard が導入されている（Phase 3-7 で完了）
4. ❌ candidate の Rust/WASM 実装が追加されている（未実施）
5. ❌ bridge にモード切替が実装されている（未実施）
6. ❌ dual-run compare が実施されている（未実施）
7. ❌ rollback が確認されている（未実施）

**4-7 は Phase 5-6 の「実装」ステップ**で、構造基盤（文書 + guard + registry）は整っている。
実装時は `tier1-business-migration-plan.md` の §6（8ステップ）と `analytic-kernel-migration-plan.md` の §6（9ステップ）に従う。

## 6. 文書追加時の連鎖更新（最もハマりやすい）

新しい `.md` を `references/` に追加すると、以下の **4箇所** を全て更新しないとガードが落ちる:

1. `docs/contracts/doc-registry.json` — 文書レジストリに追加
2. `references/README.md` — 上部テーブル（正本一覧）に追加
3. `references/README.md` — 下部テーブル（AI 向け索引）にも追加
4. `cd app && npm run docs:generate` — generated section を再生成

### wasm/ 変更時

`wasm/` 配下を変更したら `docs/contracts/project-metadata.json` も同コミットに含める。

### references/01-principles/ 変更時

`references/01-principles/` 配下を変更したら `docs/contracts/principles.json` も同コミットに含める。

## 7. テスト実行の手順

```bash
cd app
npm run format          # Prettier 自動修正
npm run lint            # ESLint（0 errors 必須）
npm run build           # tsc -b + vite build
npm run test:guards     # ガードテスト（53 ファイル / 461+ テスト）
npm run docs:generate   # guard/allowlist/文書変更時は必須
npm run test:guards     # docs:generate 後に再度
```

## 8. 絶対にやってはいけないこと

1. `calculationCanonRegistry.ts` 以外に registry を作る
2. `semanticViews.ts` を手編集する（master から自動導出のみ）
3. `authoritative` を単独語で新規追加する
4. candidate エントリを current view に混ぜる
5. 移行タグを `completionChecklist` なしで作る
6. 移行タグを checklist 未実行で removed にする
7. CanonEntry に新しいフィールドを足す（Phase 2 で完了済み）
8. 実装 AI が Promote Ceremony を自己承認する
9. JS reference に新規 authoritative logic を追加する
10. review-needed のまま current 編入 / candidate 化する
