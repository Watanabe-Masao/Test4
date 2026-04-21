# HANDOFF — taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**プロジェクト準備完了、着手前（scheduled / not yet kicked off）。**

2026-04-21 に 3 project（親 + 子 2 件）の雛形を同時に作成。移行コストを
考えず長期戦前提で設計した。人間がキックオフする際、親 Phase 1（Constitution
起草）から開始する。

### 3 project の役割

```
taxonomy-v2 (親)
  ├─ Phase 1: Constitution 起草（7 原則 + interlock 仕様）
  ├─ Phase 2: review window 仕様
  ├─ Phase 3: 子 project 立ち上げ
  └─ Phase 4: 制度成立確認 + archive
  
responsibility-taxonomy-v2 (子: 責務軸)
  └─ Phase 0-9（Inventory → Legacy Collection まで）
  
test-taxonomy-v2 (子: テスト軸)
  └─ Phase 0-9（Inventory → Legacy Collection まで）
```

### 着手順序（推奨）

1. **親 Phase 1**（Constitution 起草） — 両子に先立って 7 原則と interlock
   仕様を確定する。これがないと子 project が実装を進められない
2. **親 Phase 2**（review window 仕様） — 追加・撤退ワークフローを定義
3. **親 Phase 3**（子 2 件を同時着手） — responsibility と test を並行で
   Phase 0 Inventory から進める
4. **長期並行運用** — 子 Phase 0-9 は並列で進行（両軸の review window を同期）
5. **親 Phase 4**（両子 archive 確認 + 親 archive） — 制度成立 5 要件達成

## 2. 次にやること

### 高優先（親 Phase 1 キックオフ時）

- **Constitution 起草**: 7 不可侵原則を `references/01-principles/` に landing
- **interlock 仕様**: R:tag ↔ T:kind マトリクスの型定義
- **制度成立 5 要件** の明文化

### 中優先（Phase 1 完了後）

- review window 運用ルールの文書化
- 子 project 2 件の Phase 0 着手承認

### 低優先（子 project 進行中）

- 四半期 Discovery Review の手続き整備
- 親子統合の archive 基準確認

## 3. ハマりポイント

### 3.1. 「移行コストを考えない」= Phase が長大になる

本 project は migration cost を度外視した設計のため、短期で見ると成果が
見えにくい。「Phase 1 Constitution だけで 1 ヶ月」といった時間配分を
最初から覚悟する必要がある。

**対策:**

- 子 project は独立に `in_progress` カウントされるため、全体の進捗は
  `project-health.json` で可視化される
- 四半期ごとに「Constitution landed / schema v2 landed / R:unclassified 能動付与率」
  等の milestone で成果を確認

### 3.2. 親が "制度設計" に偏ると実装が進まない

親 project は Constitution 起草が scope だが、実装のないまま文書だけ増えると
制度が absolute になりがち。

**対策:**

- 親 Phase 1 完了時点で「子 Phase 0 が実行可能な状態」を必達
- Constitution は "子が読めば実装を起動できる" 精度で書く（抽象論に閉じない）

### 3.3. 2 軸の同期 review window

responsibility-taxonomy-v2 と test-taxonomy-v2 の vocabulary 追加・撤退は
**同一 review window で同時裁定** するのが原則。片軸だけ先行すると interlock が
崩れる。

**対策:**

- 親 Phase 2 で「四半期の同期 review window」を明文化
- 各子 Phase 5 の Operations で同じ window 手続きを参照
- 片軸単独の window 裁定は許容するが、直後の同期 window で他軸に連動効果を確認

### 3.4. Cognitive Load Ceiling と現実の衝突

原則 7「Vocabulary は認知上限以下に保つ」を守ると、実際のコードパターンが
vocabulary を超過する可能性がある（統合を強制される）。

**対策:**

- 認知上限は "1 人が把握できる範囲" を基準にする（現状 15 程度）
- 子 project で upper bound 超過が起きた場合、統廃合 or 親 Constitution 変更の
  2 択を Discovery Review で裁定（親の権限）

### 3.5. AI Vocabulary Binding の徹底

本 repo は AI が主要開発者の一角。AI が勢いで新タグを作ると原則 3（タグ生成は
高コスト）が崩壊する。

**対策:**

- 親 Phase 1 で `CLAUDE.md` に §taxonomy-binding を追記
- AI は既存タグ or `R:unclassified` のみ許容、新タグ提案は禁止
- AI 提案の新タグが git diff に現れたら `aiVocabularyBindingGuard` で block（Phase 4 で実装）

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | プロジェクト意味空間の入口（why / scope） |
| `plan.md` | 7 不可侵原則 + 親 Phase 構造 + interlock 仕様 + 8 昇華メカニズム |
| `checklist.md` | 親 Phase 完了条件 |
| `config/project.json` | project 設定 |
| `references/03-guides/project-checklist-governance.md` | 運用ルール（AAG Layer 4A） |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 5.2 Constitution（思想的根拠） |
| `app/src/test/responsibilityTagRegistry.ts` | 現行 v1 の正本 |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | 現行 TSIG（v2 でタグ認識化） |
| `projects/responsibility-taxonomy-v2/AI_CONTEXT.md` | 子: 責務軸 |
| `projects/test-taxonomy-v2/AI_CONTEXT.md` | 子: テスト軸 |
| `projects/pure-calculation-reorg/HANDOFF.md` | 姉妹 project（同じ制度化フレーム） |
