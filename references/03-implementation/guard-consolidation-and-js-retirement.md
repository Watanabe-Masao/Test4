# Guard 統合整理 + JS 正本縮退方針

> Phase 7: guard の統合整理、JS 正本縮退ポリシー、違反レスポンス標準化

## 1. 目的

Phase 0-6 で各 Phase に前倒し導入した guard を統合整理し、JS 正本縮退方針と違反レスポンスを標準化する。

**注意:** Phase 7 は「guard 導入フェーズ」ではない。基本 guard は Phase 0-6 で既に導入済み。

## 2. Guard 全体マップ（Phase 0-7）

### Phase 0: 用語
| ID | severity | 内容 |
|----|----------|------|
| AR-TERM-AUTHORITATIVE-STANDALONE | gate | authoritative 単独使用禁止（baseline 279） |

### Phase 2: 意味分類
| ID | severity | 内容 |
|----|----------|------|
| AR-CANON-SEMANTIC-REQUIRED | block-merge | required に semanticClass 必須 |
| AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION | warn | business/analytic 分離（experimental） |
| AR-CURRENT-CANDIDATE-SEPARATION | warn | current/candidate 分離（experimental） |
| AR-REGISTRY-SINGLE-MASTER | warn | master registry 唯一（experimental） |

### Phase 3: 契約固定
| ID | severity | 内容 |
|----|----------|------|
| AR-CONTRACT-SEMANTIC-REQUIRED | gate | semanticClass なしで契約追加禁止 |
| AR-CONTRACT-BUSINESS-MEANING | gate | BIZ に businessMeaning 必須 |
| AR-CONTRACT-ANALYTIC-METHOD | gate | ANA に methodFamily 必須 |
| AR-BRIDGE-RATE-OWNERSHIP | gate | 率の UI 再計算禁止 |
| AR-BRIDGE-DIRECT-IMPORT | gate | bridge 迂回禁止（baseline 0） |
| AR-BRIDGE-CANDIDATE-DEFAULT | gate | candidate-only をデフォルト禁止 |

### Phase 4: current 保守
| ID | severity | 内容 |
|----|----------|------|
| AR-CURRENT-NO-CANDIDATE-STATE | gate | current に candidate 状態遷移禁止 |
| AR-CURRENT-SEMANTIC-REQUIRED | gate | current に semanticClass 必須 |
| AR-CURRENT-NO-STANDALONE-AUTH | gate | current に authoritative 単独禁止 |
| AR-CURRENT-VIEW-SEPARATION | gate | current view 混在禁止 |
| AR-CURRENT-NO-CANDIDATE-MIX | gate | current に candidate 混入禁止 |
| AR-CURRENT-NO-DIRECT-IMPORT-GROWTH | gate | current direct import 増加禁止 |
| AR-CURRENT-FACTOR-BUSINESS-LOCK | gate | factorDecomposition の semanticClass 変更禁止 |

### Phase 5: Business 候補
| ID | severity | 内容 |
|----|----------|------|
| AR-CAND-BIZ-CONTRACT-REQUIRED | gate | BIZ 契約なしで candidate 化禁止 |
| AR-CAND-BIZ-NO-CURRENT-MIX | gate | candidate → current 混入禁止 |
| AR-CAND-BIZ-NO-ANALYTICS-BRIDGE | gate | business → analytics bridge 禁止 |
| AR-CAND-BIZ-NO-RATE-UI | gate | candidate 率の UI 再計算禁止 |
| AR-CAND-BIZ-NO-DIRECT-IMPORT | gate | candidate direct import 禁止 |
| AR-CAND-BIZ-NO-ROLLBACK-SKIP | gate | rollback 不可禁止 |
| AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN | gate | dual-run なし promotion 禁止 |

### Phase 6: Analytic 候補
| ID | severity | 内容 |
|----|----------|------|
| AR-CAND-ANA-CONTRACT-REQUIRED | gate | ANA 契約なしで candidate 化禁止 |
| AR-CAND-ANA-NO-BUSINESS-BRIDGE | gate | analytics → business bridge 禁止 |
| AR-CAND-ANA-METHOD-REQUIRED | gate | methodFamily 未設定禁止 |
| AR-CAND-ANA-INVARIANT-REQUIRED | gate | invariantSet 未定義禁止 |
| AR-CAND-ANA-NO-DIRECT-IMPORT | gate | candidate direct import 禁止 |
| AR-CAND-ANA-NO-CURRENT-BIZ-MIX | gate | analytics candidate → current/business 混入禁止 |
| AR-CAND-ANA-NO-FACTOR-DECOMP | gate | factorDecomposition の analytics 候補登録禁止 |

### Phase 7: 統合整理 + JS 縮退
| ID | severity | 内容 |
|----|----------|------|
| AR-JS-NO-NEW-AUTHORITATIVE | gate | TS に新規 pure authoritative logic 追加禁止 |
| AR-JS-NO-REFERENCE-GROWTH | gate | JS reference の増築禁止 |
| AR-JS-NO-PRES-HELPER-PROMOTE | gate | Presentation Helper の誤昇格禁止 |
| AR-REVIEW-NEEDED-BLOCK | gate | review-needed のまま current 編入/candidate 化禁止 |

## 3. Guard 3分類

| 種類 | 用途 | 例 |
|------|------|-----|
| **Hard (gate)** | 即 fail。破壊半径が大きい混線 | current/candidate 混在、authoritative 単独使用 |
| **Soft (warn)** | warning + 修正導線。境界未確定 | review-needed の増加 |
| **Ratchet (gate + baseline)** | 現状悪化禁止。legacy 移行途中 | direct import 件数 |

## 4. JS 正本縮退ポリシー（4段階）

| Stage | 役割 | 制約 |
|-------|------|------|
| **A: current reference** | 比較基準 + fallback + 既存運用正本 | — |
| **B: compare reference** | candidate 比較対象 + fallback | 新規正本ロジック追加禁止 |
| **C: fallback-only** | candidate failure 時の戻り先のみ | 通常運用では primary でない |
| **D: retired-js** | JS reference 削除 | bridge は current engine のみ |

### 4.1 縮退条件（A→B）

以下の全条件を満たすとき:
- contract 固定済み
- bridge 接続済み
- dual-run 実施済み
- rollback 実装済み
- null / warning / shape / scope 一致
- guard 導入済み
- 混線なし
- 観測期間中に重大差分なし

### 4.2 撤去条件（C→D）

以下の全条件を満たすとき:
- current 昇格済み（Phase 8 Promote Ceremony 完了）
- 契約安定
- rollback 別途確保
- dual-run 観測完了
- 旧 path 禁止 guard あり
- import 残存なし

## 5. 違反時レスポンス設計

AAG 違反時の必須レスポンス項目:

```
violation_code:    AR-XXX-YYY
title:             何が壊れたか（1文）
why_dangerous:     なぜ危険か
violated_phase:    Phase N の原則 X
first_look:        まず見るべきファイル
first_fix:         まず直すべき場所
allowed_next:      許容される次のアクション
forbidden_shortcut: やってはいけない近道
prevention:        再発防止候補
```

## 6. 重複検出と統合対象

Phase 0-6 で導入した guard に以下の重複パターンがある:

| 重複パターン | 統合方針 |
|-------------|---------|
| direct import 禁止（Phase 3, 4, 5, 6） | 基本ルール AR-BRIDGE-DIRECT-IMPORT を正本。Phase 別は dependsOn で参照 |
| rate UI 再計算禁止（Phase 3, 5） | 基本ルール AR-BRIDGE-RATE-OWNERSHIP を正本。Phase 5 は candidate 固有条件を追加 |
| factorDecomposition 保護（Phase 4, 6） | AR-CURRENT-FACTOR-BUSINESS-LOCK + AR-CAND-ANA-NO-FACTOR-DECOMP で二重防御 |

**方針:** 重複を統合するのではなく、`relationships.dependsOn` で因果関係を明示する。各ルールは固有の context（Phase）を持つため独立して存在する意味がある。

## 7. 関連文書

- `references/03-implementation/contract-definition-policy.md` — 契約定義ポリシー
- `references/03-implementation/current-maintenance-policy.md` — current 群保守ポリシー
- `references/03-implementation/tier1-business-migration-plan.md` — Tier 1 Business 移行計画
- `references/03-implementation/analytic-kernel-migration-plan.md` — Analytic Kernel 移行計画
- `app/src/test/architectureRules.ts` — 全ルール定義
