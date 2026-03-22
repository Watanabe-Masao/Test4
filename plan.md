# 品質基盤全面再構築プラン

> **状態: Phase 1〜3, 5 実装完了。Phase 4 は延期（次回改修時に段階的実施）。**
> ビルドエラー（WASM rollupOptions.external）も解消済み。

## 背景と問題認識

### 現状の数値
- 原則体系: 51ルール（設計思想19 + 禁止事項13 + 過剰複雑性12 + 層内設計7）
- ガードテスト: 9ファイル、3,424行
- domain/calculations テスト: 32ファイル、2,655行
- カバレッジ閾値: 全体55%、domain/calculations 80%

### 構造的問題: ルールの重複・肥大化

51ルールのうち **32+が重複に関与** しており、以下9つの重複セットが存在する:

| 重複セット | 関与ルール数 | 具体例 |
|---|---|---|
| 純粋ロジック分離 | 7 | P#9, P#11, 禁止#5, 禁止#9, R4, R7, 層内Pure |
| 単一責務 | 4 | P#4, 層内責務, R1, R9 |
| データアクセス境界 | 4 | 禁止#6, #11, #12, R2 |
| facade制約 | 3 | 層内Facade×2, R5 |
| テスト容易性 | 3 | P#1, 層内テスト, R3/R10 |
| イミュータブル設計 | 3 | P#2, 禁止#8, P#16 |
| store責務 | 2 | 層内Store, R7 |
| 互換性管理 | 2 | 層内互換, R6 |
| 配置規約 | 2 | P#15, P#7 |

**結論:** 4つのカテゴリ（19原則・13禁止・12ルール・7層内原則）に分かれているが、
実質的には重複した概念を異なる粒度・文脈で繰り返し記述している。
これがルール理解のコストを上げ、ガードテストの責務境界も曖昧にしている。

---

## 全体方針

### やること
1. **原則体系の統合・再編** — 51ルール → 重複排除した新体系へ
2. **ガードテストの再構造化** — 新原則体系に1:1対応する構造へ
3. **許可リストの外部化** — メタデータ付き一元管理
4. **ドキュメント整合**

### やらないこと（スコープ外）
- アプリケーションコードの変更
- E2E/Storybook の修正
- カバレッジ閾値の変更
- domain/calculations のテスト追加

---

## Phase 1: 原則体系の統合再編

### 目標
51ルールを重複排除し、**関心事ベースの原則グループ**に再編する。
CLAUDE.md の「設計思想19原則」「禁止事項13件」「過剰複雑性12ルール」「層内設計7原則」の
4セクションを廃止し、新しい統合セクションに置き換える。

### 新原則体系（案）

重複を排除すると、実質的な独立概念は以下の **7カテゴリ・約25原則** に集約される:

#### カテゴリ A: 層境界（Layer Boundary）
統合元: P#6, P#15, 禁止#5, #6, #11, #12, R2, 層内責務, 層内load
- A1: 4層依存ルール（Presentation → Application → Domain ← Infrastructure）
- A2: Domain は純粋（副作用・外部依存禁止）
- A3: Presentation は描画専用（外部API・データ変換・状態管理禁止）
- A4: 取得対象の契約は Domain で定義
- A5: DI はコンポジションルート（具体実装を知るのは App.tsx のみ）
- A6: load 処理は「計画・取得・反映」に分離

#### カテゴリ B: 実行エンジン境界（Engine Boundary）
統合元: P#11, 禁止#9, #10
- B1: Authoritative 計算は domain/calculations のみ（制御層に新規実装禁止）
- B2: 同一ロジックの JS/SQL 二重実装禁止
- B3: 率（rate）は domain/calculations で算出（パイプライン持ち回し禁止）

#### カテゴリ C: 純粋性と責務分離（Purity & Separation）
統合元: P#4, P#9, R1, R4, R7, R9, 層内Pure, 層内Store
- C1: 1ファイル = 1変更理由（300行超は分割検討）
- C2: pure function は1仕様軸に閉じる（集計+補完+マッピング混在禁止）
- C3: store action は state 反映のみ（業務計算禁止）
- C4: memo + hook で描画と計算を分離
- C5: 最小セレクタ（store はスライスで購読）

#### カテゴリ D: 数学的不変条件（Mathematical Invariants）
統合元: P#5, 禁止#2, #4
- D1: 要因分解の合計は売上差に完全一致
- D2: 引数を無視して再計算禁止（シャープリー恒等式保護）
- D3: 不変条件はテストで守る（実装ではなく制約をテスト）

#### カテゴリ E: 型安全と欠損処理（Type Safety）
統合元: P#2, P#13, 禁止#3, #8, #13
- E1: 外部入力は Branded Type で検証済みを型保証
- E2: useMemo/useCallback の依存配列から参照値を省かない
- E3: 比較データの sourceDate を落とす変換禁止
- E4: `number | null` の欠損判定は `== null` / `!= null`（truthiness 禁止）
- E5: 型粒度は変更頻度に合わせる

#### カテゴリ F: コード構造規約（Structural Conventions）
統合元: P#7, P#8, P#14, P#15, P#17, P#18, P#19, 層内Facade, 層内互換, R5, R6
- F1: バレルで後方互換（ファイル移動で外部 import を壊さない）
- F2: UI 文字列は messages.ts に一元管理
- F3: 全パターンに例外なし（チャート・Hook・Handler 構造は同一）
- F4: 配置はパスで決まる
- F5: チャート間データは文脈継承
- F6: View に raw 値を渡さない（ViewModel のみ）
- F7: 独立互換で正本を汚さない
- F8: facade は orchestration のみ（判断・分岐・派生計算禁止）
- F9: 同義 API/action の併存禁止（互換は移行目的に限定）

#### カテゴリ G: 機械的防御（Mechanical Guards）
統合元: P#1, P#3, 禁止#1, R3, R8, R10, R11, R12, 層内テスト
- G1: ルールはテストに書く（文書だけでは守られない）
- G2: エラーは伝播（catch で握り潰さない）
- G3: コンパイラ警告を `_` や `eslint-disable` で黙らせない
- G4: テスト用 export 禁止（@internal, typeof テスト）
- G5: hook ≤300行、useMemo ≤7、useState ≤6
- G6: Presentation .tsx ≤600行（Tier 2 は除外リスト管理）
- G7: キャッシュは本体より複雑にしない
- G8: カバレッジ回復のための実装変更禁止

### 作業内容
1. CLAUDE.md の4セクションを新7カテゴリに書き換え
2. 旧ルール番号 → 新ルール番号のマッピング表を作成（移行期間用）
3. `references/01-principles/design-principles.md` を新体系に更新
4. `references/01-principles/prohibition-quick-ref.md` を廃止（新体系に統合済み）

### 検証
- `cd app && npx vitest run src/test/documentConsistency.test.ts` が通ること
- 全ルールが新体系のいずれかのカテゴリに含まれていること（漏れなし）

---

## Phase 2: 共有テストインフラ抽出

### 目標
6ファイルに重複する `collectTsFiles`, `rel`, `extractImports` 等のヘルパーを共通化。

### 新ファイル: `app/src/test/guardTestHelpers.ts`

抽出対象:
- `collectTsFiles(dir, excludeTests?)` — 6ファイルで重複
- `rel(filePath)` — 5ファイルで重複（architectureGuard の `relativePath` も統一）
- `extractImports(filePath)` — 2ファイルで重複
- `extractValueImports(filePath)` — architectureGuard から
- `isCommentLine(line)` — 2ファイルで重複
- `stripStrings(line)` — domainPurityGuard から
- `SRC_DIR` 定数

### 検証
- `cd app && npx vitest run src/test/` — 全9ガードテスト通過

---

## Phase 3: 許可リスト外部化

### 目標
全ガードテストに散在する11+の許可リストを1ファイルに集約し、メタデータを付与。

### 新ファイル: `app/src/test/allowlists.ts`

```typescript
interface AllowlistEntry {
  path: string
  reason: string
  category: 'adapter' | 'bridge' | 'lifecycle' | 'legacy' | 'structural'
  removalCondition: string
  addedDate: string
}

interface QuantitativeAllowlistEntry extends AllowlistEntry {
  limit: number
}
```

外部化対象（architectureGuard から9つ、hookComplexityGuard から5つ、他）

### 検証
- 全テスト通過
- Set のサイズが旧インライン定義と一致

---

## Phase 4: ガードテスト再構造化

### 目標
新原則体系（7カテゴリ）に対応するガードテスト構造に再編。

### 新構造: `app/src/test/guards/`

| 新ファイル | 対応カテゴリ | 統合元 |
|---|---|---|
| `layerBoundaryGuard.test.ts` | A: 層境界 | architectureGuard の層依存テスト6件 + domainPurityGuard の domain純粋性・presentation描画専用 |
| `engineBoundaryGuard.test.ts` | B: エンジン境界 | domainPurityGuard のEngine境界 + architectureGuard のCQRS |
| `purityGuard.test.ts` | C: 純粋性・責務分離 | hookComplexityGuard のR1,R4,R7 + domainPurityGuard のfacade + hookComplexityGuard のR2 |
| `invariantGuard.test.ts` | D: 数学的不変条件 | 変更なし（既存の scopeBoundaryInvariant, waterfallDataIntegrity を維持） |
| `typeSafetyGuard.test.ts` | E: 型安全 | 新規（現在ガードなし → 将来追加のプレースホルダ） |
| `structuralConventionGuard.test.ts` | F: コード構造規約 | architectureGuard のvertical slice, prototype, barrel, DOW |
| `sizeGuard.test.ts` | G: 機械的防御（サイズ系） | hookComplexityGuard のR11,R12 + domainPurityGuard のファイルサイズ |
| `codePatternGuard.test.ts` | G: 機械的防御（パターン系） | hookComplexityGuard のR3,R10 |

### 削除ファイル
- `architectureGuard.test.ts`（838行 → 3ファイルに分割）
- `hookComplexityGuard.test.ts`（664行 → 3ファイルに分割）
- `domainPurityGuard.test.ts`（388行 → 2ファイルに統合）

### 変更なしファイル
- `comparisonMigrationGuard.test.ts`（327行、単一関心事）
- `designSystemGuard.test.ts`（434行、単一関心事）
- `documentConsistency.test.ts`（320行、単一関心事）
- `scopeBoundaryInvariant.test.ts`（181行）
- `scopeConsistencyGuard.test.ts`（178行）
- `waterfallDataIntegrity.test.ts`（94行）

### 検証
- `cd app && npx vitest run src/test/` — 全テスト通過
- INV-* ID の全カバー確認（guard-test-map.md との照合）

---

## Phase 5: ドキュメント整合

### 更新対象
1. `references/03-guides/guard-test-map.md` — 新ファイルパスに更新
2. `references/03-guides/invariant-catalog.md` — 新ファイルパスに更新
3. CLAUDE.md のプロジェクト構成セクション — guards/ ディレクトリ追加
4. CLAUDE.md のルーティング表・ファイルパスベース自動ルーティング — 新体系参照に更新

### 新規ドキュメント
5. `references/03-guides/allowlist-management.md` — 許可リスト運用ガイド
6. `references/03-guides/principle-migration-map.md` — 旧ルール番号→新番号の対応表（移行期間用）

### 検証
- `cd app && npx vitest run src/test/documentConsistency.test.ts` 通過

---

## Phase 依存関係

```
Phase 1 (原則体系の統合再編)
    │
    v
Phase 2 (共有テストインフラ抽出)
    │
    v
Phase 3 (許可リスト外部化)
    │
    ├──> Phase 4 (ガードテスト再構造化)
    │
    v
Phase 5 (ドキュメント整合)
```

各 Phase は独立してマージ可能。Phase 4 は Phase 2+3 の完了が前提。

---

## 最終検証

全 Phase 完了後、CI 6段階ゲート通過を確認:

```bash
cd app && npm run lint
cd app && npm run format:check
cd app && npm run build
cd app && npx vitest run
```

---

## リスクと対策

| リスク | 対策 |
|---|---|
| 原則統合で意図が失われる | 旧→新マッピング表で追跡可能性を維持 |
| ガードテスト分割で INV-* ID が漏れる | Phase 4 で全 ID のカバー確認を検証ステップに含む |
| 許可リスト外部化で Set サイズ不一致 | 外部化前後で Set.size の一致を自動検証 |
| documentConsistency.test.ts が新構造に追従できない | Phase 5 で同テストも更新 |
