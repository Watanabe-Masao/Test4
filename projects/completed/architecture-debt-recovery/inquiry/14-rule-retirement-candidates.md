# inquiry/14 — 既存原則・rule・guard の廃止・統合候補

> 役割: Phase 3 inquiry 成果物 #3（最終）。既存 9 カテゴリ（A-I + Q）48 タグ、Architecture Rule 140+ 件、Guard 39 件の中から、**廃止・統合の検討対象**を Phase 2 真因仮説に紐付けて提示する。
>
> 本ファイルは**候補提示**であり、削除や統合の実施ではない。plan.md §2 不可侵原則 #8「既存原則の削除・上書きは Phase 6 で実施する（Phase 3 では候補提示のみ）」を遵守。
>
> 各候補に以下を記述:
> - 対応する真因仮説（廃止理由の根拠）
> - 廃止 / 統合の種別
> - 代替として登場する新原則（inquiry/12）への接続
>
> 本ファイルは immutable。Phase 4 以降で追加情報が判明しても書き換えず、`14a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `14d868e`（inquiry/13 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | CLAUDE.md §設計原則（9 カテゴリ + Q）、`references/01-principles/design-principles.md`、`architectureRules.ts` 系の rule 定義、`inquiry/09-13` |

## 廃止候補の分類

| 種別 | 定義 |
|---|---|
| **R-RETIRE** | 原則そのものを廃止（代替原則に完全置換） |
| **R-MERGE** | 他原則と統合（冗長または重複） |
| **R-REFORMULATE** | 原則の表現を reformulate（意味は保持、機械検出方法を更新） |
| **R-KEEP-EXTEND** | 現状維持だが、inquiry/12 の新原則で補強する方針（廃止ではないが関連） |

## 候補一覧

| ID | 対象 | 種別 | 対応仮説 |
|---|---|---|---|
| R-1 | CLAUDE.md 設計原則 C9「現実把握優先」 | R-KEEP-EXTEND | 全般 |
| R-2 | CLAUDE.md 設計原則 G8「責務分離ガード」 | R-REFORMULATE | S6-H2、D-2 |
| R-3 | CLAUDE.md 設計原則 G5 / G6「サイズ上限」 | R-REFORMULATE | S6-H1 |
| R-4 | CLAUDE.md 設計原則 A1「4 層依存ルール」 | R-KEEP-EXTEND | S2、S4 |
| R-5 | 「`authoritative` 単独使用禁止」（I1） | R-KEEP-EXTEND | 直接関連なし |
| R-6 | Temporal Governance 既存ルール群 | R-REFORMULATE | D-2、inquiry/11 §E |
| R-7 | 「barrel 後方互換」原則（F1） | R-REFORMULATE | S5-H2（orphan 残存理由） |

---

### R-1. CLAUDE.md C9「現実把握優先」

- **種別**: R-KEEP-EXTEND
- **対応仮説**: 本 project 全般（Phase 1 台帳方針の根拠原則）
- **観察事実**:
  - C9 は「現実を正しく把握することを自動推定や形式的分類より優先する」という meta-原則
  - Phase 1 で 9 inquiry 台帳を作成した方針そのものが C9 の具体化
- **扱い**:
  - **廃止しない**（本 project の根幹）
  - 新原則 J1-J8 は全て C9 の「現実把握」を具体化する形で追加される（C9 との対立はない）
  - ただし C9 は「把握する」までが対象で、「把握した事実をどう structure に変換するか」までは規定していない
  - → 補強として J3（移行完了の全層検証）と J8（reviewPolicy 必須）が C9 の継続的運用を保証する

### R-2. CLAUDE.md G8「責務分離ガード」

- **種別**: R-REFORMULATE
- **対応仮説**: S6-H2（ConditionSummaryEnhanced の 1 widget = 多 sub-widget）、D-2（近道の存在が構造改善圧力を消す）
- **観察事実**:
  - G8 は 7 種の機械検出（P2-P18）を持つ（CLAUDE.md §設計原則 G8）
  - しかし、「1 widget の子 component 数」「useMemo 内行数」は P2-P18 に含まれていない
  - 結果として ConditionSummaryEnhanced 相当の畳み込みは P8（useMemo 合計 ≤12）だけでは捕捉できない
- **reformulate 内容**:
  - G8 の定義はそのまま維持
  - inquiry/13 の INV-J2-B（useMemo 内行数）と INV-J2-C（widget 直接子数）を G8 の新しい P 項目として追加
  - 例: **P20「useMemo 内行数」**、**P21「widget 直接子数」**
- **代替**: inquiry/12 J2 + inquiry/13 INV-J2-B / C

### R-3. CLAUDE.md G5 / G6「サイズ上限」

- **種別**: R-REFORMULATE
- **対応仮説**: S6-H1（Dashboard 先行設計の肥大化残留）
- **観察事実**:
  - G5 / G6 はファイルサイズ上限を管理する rule（CLAUDE.md §設計原則 G カテゴリ）
  - 現状 `ConditionSummaryEnhanced.tsx` が 532 行、`ConditionSummaryEnhanced.styles.ts` が 888 行など、G5 超過の事実が Budget Simulator reboot 7 項目として残存（inquiry/07 §E）
  - 「超過を allowlist で許容する運用」がサイズ肥大化を恒久化している
- **reformulate 内容**:
  - G5 / G6 の閾値はそのまま維持
  - allowlist 登録時に `sunsetCondition`（どの条件で解消されるか）+ `expiresAt`（いつまでに解消するか）を必須化
  - inquiry/13 INV-J3-A の「@deprecated metadata 必須」と同構造の適用
- **代替**: inquiry/12 J3 + inquiry/13 INV-J3-A

### R-4. CLAUDE.md A1「4 層依存ルール」

- **種別**: R-KEEP-EXTEND
- **対応仮説**: S2（handler 配置の非統一）、S4（pure 埋没）
- **観察事実**:
  - A1 は 4 層（Presentation → Application → Domain ← Infrastructure）の依存を規定
  - 現状、「application 層内のどこに何を置くか」までは規定していない
  - 結果として `application/readModels/` vs `application/queries/` vs `application/hooks/` の配置判断が個別
- **扱い**:
  - **廃止しない**（4 層の枠組みは有効）
  - 補強として J1（配置規約の成文化）を追加し、application 層内の配置規約を明文化する
- **代替**: inquiry/12 J1 + inquiry/13 INV-J1-A / B

### R-5. 「`authoritative` 単独使用禁止」（I1）

- **種別**: R-KEEP-EXTEND
- **対応仮説**: 本 project の症状とは直接関連しない
- **観察事実**:
  - I1 は `authoritative` を `business-authoritative` / `analytic-authoritative` / `candidate-authoritative` に修飾する要求（CLAUDE.md §設計原則 I1）
  - Phase 1 inquiry では I1 の違反は観察されていない（surface した症状は主に widget / ctx / pipeline 系）
- **扱い**:
  - **廃止しない**（機能している既存 rule）
  - Phase 6 の rule 更新作業で変更の必要なし
- **代替**: なし

### R-6. Temporal Governance 既存ルール群

- **種別**: R-REFORMULATE
- **対応仮説**: D-2（近道の定着）、inquiry/11 §E（reviewPolicy 未設定 92 件）
- **観察事実**:
  - Temporal Governance（CLAUDE.md 2026-04-07 主要変更）で `reviewPolicy` / `ruleClass` / `confidence` / `sunsetCondition` / `lifecyclePolicy` が定義された
  - しかし、92 rule が reviewPolicy 未設定のまま（現状）
  - 既存 rule への reviewPolicy 遡及適用の mechanism が弱い
- **reformulate 内容**:
  - Temporal Governance の概念定義はそのまま維持
  - rule 登録時に reviewPolicy を optional → **required** に型レベルで昇格（inquiry/12 J8 + inquiry/13 INV-J8-A）
  - 既存 92 rule の ratchet-down 削減を明示的 project として扱う
- **代替**: inquiry/12 J8 + inquiry/13 INV-J8-A

### R-7. 「barrel 後方互換」原則（F1）

- **種別**: R-REFORMULATE
- **対応仮説**: S5-H2（削除の決定権が曖昧で非参照 file が残存）
- **観察事実**:
  - F1 は「barrel export で後方互換を保つ」原則（CLAUDE.md §設計原則 F1）
  - しかし、`RangeComparison.styles.ts` のみ barrel re-export 残存 + `.tsx` 本体 orphan（inquiry/03 §Tier D-3）のケースで、barrel が「削除阻害要因」になっている
  - F1 の「後方互換を保つ」意図が、「削除判断を不要にする」解釈に転換している
- **reformulate 内容**:
  - F1 の定義はそのまま維持（barrel による後方互換は有効な設計技法）
  - ただし barrel re-export に `@sunset` / `@expiresAt` / `@reason` の metadata を必須化
  - metadata の無い barrel re-export は「意図的な恒久保持」と判定し、削除阻害にならないように区別
- **代替**: inquiry/12 J3 + inquiry/13 INV-J3-A（F1 自体は維持）

---

## 総括: 本 Phase 3 の廃止判断

**廃止（R-RETIRE）対象**: **0 件**

本 Phase 3 の分析では、完全廃止すべき既存原則は見出されなかった。全ての既存原則は有効に機能している、または維持した上で補強が必要。

**reformulate（R-REFORMULATE）対象**: **4 件**（R-2 / R-3 / R-6 / R-7）

- G8 への P20 / P21 追加
- G5 / G6 の allowlist metadata 必須化
- Temporal Governance の reviewPolicy 必須化
- F1 の barrel re-export metadata 必須化

**keep-extend（R-KEEP-EXTEND）対象**: **3 件**（R-1 / R-4 / R-5）

- C9 / A1 / I1 はそのまま維持

## Phase 6 での実施順序の参考

Phase 4 改修計画で確定するが、本台帳からの参考として:

1. **先行**: reformulate 4 件（既存 rule の拡張のみ、影響範囲明確）
2. **中段**: inquiry/12 J1-J7 の新原則追加
3. **後段**: 既存 allowlist / baseline の段階的 ratchet-down

各 reformulate の実施は 4 ステップ pattern（plan.md §10）に従う。

## 付記

- 本ファイルは候補提示であり、原則の実廃止ではない
- 廃止の実施は Phase 6 の Architecture Rule 更新時に行う
- 本ファイルは immutable。追加情報は `14a-*.md` として addend する
- 関連: `inquiry/12`（新原則候補）、`inquiry/13`（新不変条件候補）、`inquiry/11`（既存対策の回避経緯）
