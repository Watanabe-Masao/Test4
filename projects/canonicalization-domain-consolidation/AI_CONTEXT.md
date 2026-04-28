# AI_CONTEXT — canonicalization-domain-consolidation

> 役割: 本 project に AI セッションが入る際の最初のエントリ。scope / read order / 関連 active project / North Star を 1 ファイルに集約する（不変な道具立て、volatile な進行状態は HANDOFF.md に書く）。

## North Star

**正本化 → 制度の統一性 → 簡素な仕組みで強固な効果**

迷ったら plan.md §0「設計目標（North Star）」に戻る。

## Scope

### 含む

- 散在する 13+ 種類の registry+guard ペアの統合（plan.md §1.2）
- `app-domain/integrity/` への共通 primitive 抽出
- 旧経路（重複した drift 検出 logic / 散在型定義）の段階的撤退
- 未正本化領域への横展開（hooks / charts / stores 等のうち selection rule 通過したもののみ）
- 新 registry+guard 追加 checklist の institutionalize

### 含まない（nonGoals）

- drift 検出強度の弱体化
- 業務 logic（domain calc / readModel）の振る舞い変更
- 新 registry+guard の一斉導入（横展開は 1 候補 = 1 PR）
- `phased-content-specs-rollout` の進行妨害（並行 active project）
- `CURRENT_PROJECT.md` の active overlay 自動切替

## Read Order

新規 AI セッションで読む順:

1. **本ファイル**（AI_CONTEXT.md） — scope と read order
2. **plan.md** — North Star + Phase 構造 + 不可侵原則 + 撤退規律
3. **HANDOFF.md** — 直近の状態と次にやること
4. **checklist.md** — 完了条件
5. **projectization.md** — Level 4 判定根拠
6. **`references/01-principles/canonicalization-principles.md`** — 既存の正本化原則（拡張対象）
7. **`references/03-guides/integrity-pair-inventory.md`**（Phase A で landing 予定） — 散在 inventory
8. **`references/03-guides/integrity-domain-architecture.md`**（Phase B で landing 予定） — domain 設計

## 関連 active project

| project | 関係 |
|---|---|
| `phased-content-specs-rollout` | 並行 active。Spec State Layer (contentSpec*Guard) が本 project の **reference 実装**になる（Phase B で先行 adapter 化） |
| `pure-calculation-reorg` | 現 active overlay。本 project は overlay 切替を要求しない（domain 化 landing 後に人間判断） |

## ロール

| ロール | 関与 |
|---|---|
| architecture | domain 境界の確定、共通 primitive 設計、撤退規律の整備 |
| documentation-steward | inventory / canonicalization-checklist / origin journal の運用 |
| review-gate | dual-emit 動作同一性の検証、撤退 PR の合否判定 |
| implementation | adapter / domain primitive 実装 |

## 主要な不変条件（必読）

- **drift 検出強度を弱めない**（plan.md §2 不可侵原則 1）
- **業務 logic 不変**（同 §2 #2）
- **段階的撤退（5 step）**（plan.md §5）
- **selection rule 通過必須**（横展開は無制限ではない、同 §2 #4）

<!-- volatile な進行状態 (Current Status / Next Actions) は HANDOFF.md 側に集約する。
本 doc は不変な道具立て (scope / read order / North Star / 関連 project) のみを保持する。 -->

