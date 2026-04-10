# 引き継ぎ書 — Pure 計算責務再編（Phase 3 以降へ）

## 1. 現在地

Phase 0-2 + 移行タグ基盤が完了。ブランチ `claude/refactor-pure-calculations-qO1we` にプッシュ済み。

```
8f50cfd  Phase 0 — 意味分類ポリシー + authoritative 用語スイープ
4f9f825  Phase 1 — 意味分類 Inventory
040bff5  Phase 2 — CanonEntry 完全定義 + Derived View + block-merge
f4aa88d  移行タグレジストリ + ガード
```

Guard: **53 ファイル / 461 テスト**。Architecture Rules: **108 ルール**。

## 2. 最初に読むファイル（優先順）

| ファイル | なぜ読むか |
|---------|-----------|
| `plan.md` | 全体計画。Phase 3 以降の成果物と受け入れ条件 |
| `plan-checklist.md` | Phase 単位のチェックリスト。やることと**やってはいけないこと** |
| `references/01-principles/semantic-classification-policy.md` | 5原則と用語定義。全ての判断の根拠 |
| `app/src/test/calculationCanonRegistry.ts` | **Master Registry**。CanonEntry の型定義と全 35 エントリ |
| `app/src/test/semanticViews.ts` | Derived View の生成ロジック。手編集禁止 |
| `app/src/test/migrationTagRegistry.ts` | 移行タグの型定義と運用例。Phase 3 で初めてエントリが入る |
| `references/03-guides/migration-tag-policy.md` | 移行タグの付け方・外し方のルール |

## 3. プランだけではわからない文脈

### 3.1 CanonEntry の型は変えない

Phase 2 で最終形を定義済み。Phase 3 は**値を埋めるだけ**。

```typescript
// Phase 2 で追加済み（optional）— Phase 3 で埋める対象
readonly contractId?: string        // BIZ-XXX or ANA-XXX
readonly bridgeKind?: 'business' | 'analytics'
readonly rateOwnership?: 'engine' | 'n/a'
readonly fallbackPolicy?: 'current' | 'none'
```

`calculationCanonRegistry.ts` を開けば型が全部見える。新しいフィールドを足す必要はない。

### 3.2 文書追加時の連鎖更新（最もハマりやすい）

新しい `.md` を `references/` に追加すると、以下の **4箇所** を全て更新しないとガードが落ちる:

1. `docs/contracts/doc-registry.json` — 文書レジストリに追加
2. `references/README.md` — 上部テーブル（索引）に追加
3. `references/README.md` — 下部テーブル（全文書一覧）にも追加
4. `cd app && npm run docs:generate` — generated section を再生成

この 4 つを忘れると `docRegistryGuard` / `projectStructureGuard` / `coChangeGuard` のどれかが落ちる。

### 3.3 principles.json の連鎖

`architectureRules.ts` に新しい `principleRefs` を書くと:

1. `docs/contracts/principles.json` の `categories` に ID が存在すること
2. `app/src/test/guardTagRegistry.ts` に同じ ID のタグ定義が存在すること
3. コードベースに `@guard I1` のようなアノテーションが存在するか、`REVIEW_ONLY_TAGS` に登録されていること

この 3 つが揃わないと `architectureRuleGuard` / `documentConsistency` テストが落ちる。

### 3.4 experimental ルールの制約

`maturity: 'experimental'` のルールは:
- `severity: 'gate'` 禁止（`severity: 'warn'` のみ）
- `severity: 'block-merge'` も禁止
- `lifecyclePolicy` 必須（`promoteIf` / `withdrawIf` は `readonly string[]`）

stable に昇格してから gate / block-merge に切り替える。

### 3.5 block-merge は型定義のみ

`block-merge` severity は `architectureRules.ts` の型に追加済みだが、**CI / pre-commit hook での enforcement はまだ実装していない**。現時点では `gate` と同じく「宣言」として存在する。enforcement は Phase 3 以降で pre-commit hook に組み込むか、PR チェックで実装する。

### 3.6 エントリ数

registry は **35 エントリ**（実ファイル 35）。計画書では「36」と書いている箇所があるが、これは registry の型定義行がカウントに混入した誤差。実数は 35 で正しい。内訳: business 13 / analytic 9 / utility 13。

### 3.7 authoritative 単独使用の baseline

`AR-TERM-AUTHORITATIVE-STANDALONE` の baseline は **279**。これは Phase 0 時点の計測値。Phase 3-4 で bridge / observation テスト / 文書を修正すると減る。減ったら `architectureRules.ts` の `baseline` を更新する（ratchet-down）。

## 4. Phase 3 で具体的にやること

### 4.1 契約定義書の作成

`references/03-guides/contract-definition-policy.md` を新規作成。Business Contract テンプレート（BIZ-XXX）と Analytic Contract テンプレート（ANA-XXX）を定義。

### 4.2 registry の契約値埋め

`calculationCanonRegistry.ts` の各エントリに `contractId` / `bridgeKind` / `rateOwnership` / `fallbackPolicy` を設定。型は変えない。

### 4.3 bridge ファイルに JSDoc 追加

5 つの bridge ファイルに `semanticClass` と `contractId` を JSDoc で明記:

```
app/src/application/services/factorDecompositionBridge.ts  → business
app/src/application/services/grossProfitBridge.ts          → business
app/src/application/services/budgetAnalysisBridge.ts       → business
app/src/application/services/forecastBridge.ts             → analytics
app/src/application/services/timeSlotBridge.ts             → analytics
```

この修正で `authoritative` 単独使用が 34 件減る → baseline 更新。

### 4.4 Phase 3 の guard 6 件を即時導入

`architectureRules.ts` に追加。plan.md の「Phase 3 の即時 guard」テーブル参照。

### 4.5 移行タグの初使用

bridge の JSDoc 修正中に中間状態が発生する場合、`migrationTagRegistry.ts` に MT-001 等を追加。完了したら checklist を実行して removed にする。

## 5. テスト実行の手順

```bash
cd app
npm run format          # Prettier 自動修正
npm run lint            # ESLint（0 errors 必須）
npm run build           # tsc -b + vite build
npm run test:guards     # ガードテスト（53 ファイル / 461+ テスト）
npm run docs:generate   # guard/allowlist/文書変更時は必須
npm run test:guards     # docs:generate 後に再度（generated section 反映確認）
```

`docs:generate` は guard / allowlist / references/ を変更した場合に**必ず**実行する。忘れると `coChangeGuard` か `projectStructureGuard` が落ちる。

## 6. 絶対にやってはいけないこと

1. `calculationCanonRegistry.ts` 以外に registry を作る
2. `semanticViews.ts` を手編集する（master から自動導出のみ）
3. `authoritative` を単独語で新規追加する
4. candidate エントリを current view に混ぜる
5. 移行タグを `completionChecklist` なしで作る
6. 移行タグを checklist 未実行で removed にする
7. CanonEntry に新しいフィールドを足す（Phase 2 で完了済み）
