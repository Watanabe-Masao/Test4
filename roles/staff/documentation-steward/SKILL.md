# documentation-steward — スキル（論理構造 + 方法論）

## SKILL-1: ドキュメント更新

### 論理構造（なぜこの手順か）

- CLAUDE.md が古いと → 全ロールが古いルールに従う → プロジェクト全体に影響する
- 更新先を間違えると → 全員必読の CLAUDE.md が肥大化する or ロール固有の知識が散逸する
- 波及確認を怠ると → 1つの変更が複数文書の不整合を生む → documentConsistency.test.ts が FAIL する

### 方法論（手順）

1. 変更内容がどの文書に影響するか特定する:
   - 全員に影響 → CLAUDE.md
   - 特定ロールの責務変更 → 対応する ROLE.md / SKILL.md
   - 参照データの変更 → 対応する references/ ファイル
2. 変更内容を記述する（既存の書式・構造に従う）
3. 関連する他の文書に波及していないか確認する

### 更新判断基準

| 変更の種類 | 更新先 |
|---|---|
| 設計原則の追加・変更 | CLAUDE.md + `references/01-foundation/design-principles.md` |
| ガードテストの追加 | `references/03-implementation/guard-test-map.md` + 対応 ROLE.md |
| 新ロールの追加 | CLAUDE.md ルーティング表 + `roles/` に ROLE.md + SKILL.md |
| 不変条件の追加 | `references/03-implementation/invariant-catalog.md` + 対応 ROLE.md |
| MetricId の追加 | `references/03-implementation/metric-id-registry.md` |
| エンジン責務の変更 | `references/01-foundation/engine-responsibility.md` |

## SKILL-2: ADR 作成

### 論理構造（なぜこの手順か）

- 決定の理由が記録されないと → 将来「なぜこうなっているか」が不明になる → 安全な変更ができなくなる
- ADR がないと → 同じ議論が繰り返される → 意思決定のコストが毎回発生する
- コンテキストが欠けると → 決定だけ見ても「どういう状況でそう判断したか」がわからない

### 方法論（手順）

1. architecture ロールから設計判断書を受け取る
2. ADR テンプレートに従って記録する
3. `references/99-archive/` に配置する

### ADR テンプレート

```markdown
# ADR-NNN: タイトル

**ステータス**: Proposed / Accepted / Deprecated
**日付**: YYYY-MM-DD
**影響範囲**: 影響するレイヤー

## コンテキスト
（なぜこの決定が必要になったか）

## 検討した代替案
（検討した選択肢とその評価）

## 決定
（何を選び、なぜ選んだか）

## 結果
（この決定がもたらす影響・トレードオフ）
```

## SKILL-3: 整合性監査

### 論理構造（なぜこの手順か）

- ドキュメントのドリフトは徐々に蓄積する → 気づいた時にはコードと大きく乖離している
- 機械的検出（documentConsistency.test.ts）は一部しかカバーしない → user の定期監査が補完する
- 乖離を放置すると → 新規参加者が間違った情報を基に作業する → バグの温床になる

### 方法論（手順）

1. CLAUDE.md のルーティング表と `roles/` ディレクトリを照合
2. `references/03-implementation/guard-test-map.md` に記載のテストファイルが実在するか確認
3. `references/03-implementation/metric-id-registry.md` と `domain/models/Explanation.ts` の MetricId を照合
4. `references/03-implementation/invariant-catalog.md` の不変条件 ID がテストコードに存在するか確認
5. 各 ROLE.md の参照ドキュメントパスが実在するか確認
6. `references/04-tracking/open-issues.md` の課題ステータスがコードの実態と一致するか確認
7. 乖離があればリストアップし、修正を実施する

### 出力テンプレート

```
## 整合性監査結果

### 乖離検出
- [ ] （乖離の内容と影響）

### 推奨アクション
- （修正内容）
```
