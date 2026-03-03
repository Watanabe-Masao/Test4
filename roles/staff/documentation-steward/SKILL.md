# documentation-steward — スキル（手順書）

## SKILL-1: ドキュメント更新

ロールの決定事項を適切な文書に反映する手順。

### 手順

1. 変更内容がどの文書に影響するか特定する:
   - 全員に影響 → CLAUDE.md
   - 特定ロールの責務変更 → 対応する ROLE.md / SKILL.md
   - 参照データの変更 → 対応する references/ ファイル
2. 変更内容を記述する（既存の書式・構造に従う）
3. 関連する他の文書に波及していないか確認する

### 更新判断基準

| 変更の種類 | 更新先 |
|---|---|
| 新しい禁止事項の追加 | CLAUDE.md + `references/prohibition-quick-ref.md` |
| ガードテストの追加 | `references/guard-test-map.md` + 対応 ROLE.md |
| 新ロールの追加 | CLAUDE.md ルーティング表 + `roles/` に ROLE.md + SKILL.md |
| 不変条件の追加 | `references/invariant-catalog.md` + 対応 ROLE.md |
| MetricId の追加 | `references/metric-id-registry.md` |
| エンジン責務の変更 | `references/engine-responsibility.md` |

## SKILL-2: ADR 作成

アーキテクチャ上の重要な決定を記録する手順。

### 手順

1. architecture ロールから設計判断書を受け取る
2. ADR テンプレートに従って記録する
3. `references/decisions/` に配置する

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

ドキュメントとコードベースの乖離を検出する手順。

### 手順

1. CLAUDE.md のルーティング表と `roles/` ディレクトリを照合
2. `references/guard-test-map.md` に記載のテストファイルが実在するか確認
3. `references/metric-id-registry.md` と `domain/models/Explanation.ts` の MetricId を照合
4. `references/invariant-catalog.md` の不変条件 ID がテストコードに存在するか確認
5. 各 ROLE.md の参照ドキュメントパスが実在するか確認
6. 乖離があればリストアップし、修正を実施する

### 出力テンプレート

```
## 整合性監査結果

### 乖離検出
- [ ] （乖離の内容と影響）

### 推奨アクション
- （修正内容）
```
