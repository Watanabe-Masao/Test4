# inquiry/10 — 仮説間の相互作用

> 役割: Phase 2 inquiry 成果物 #2。inquiry/09 で提示した 20 仮説（6 症状群 × 2-4 仮説）が、**相互にどう作用するか**を事実構造として記述する。
>
> 不可侵原則 #11 に従い、複数仮説を単一原因へ縮約せず、**相互作用そのものを観察対象**として扱う。
> 改修案は書かない（Phase 4 で扱う）。
>
> 本ファイルは immutable。Phase 3 以降で追加情報が判明しても書き換えず、`10a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `015b3ef` |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/09-symptom-to-hypothesis.md`（6 症状群 × 20 仮説） |

## A. 相互作用の分類

本台帳で用いる相互作用の種類:

| 種類 | 定義 | 表記 |
|---|---|---|
| 強化（reinforce） | 仮説 A が真なら仮説 B の成立条件が強まる | A → B |
| 共起（co-occur） | 仮説 A と B が同じ構造的源を共有しており、片方だけ真なのは不整合 | A ↔ B |
| 競合（compete） | 仮説 A と B が同じ症状を異なる原因で説明し、両立可能だが排他的な解釈 | A ⊥ B |
| 遮蔽（mask） | 仮説 A が成立すると仮説 B の検証が困難になる（A が B の観察を妨げる） | A ⇒ mask(B) |

## B. 症状群横断の相互作用

### B-1. S1-H1（段階的導入）と S3-H1（page-local 継ぎ足し）は共起

両仮説は「時系列的に要素を追加し、撤去の機会が来なかった」という同一の成長パターンを WidgetDef 型と UnifiedWidgetContext 型の 2 箇所で説明している。

- 記号: S1-H1 ↔ S3-H1
- 整合する事実: `components/widgets/types.ts` が WidgetDef 型定義と UnifiedWidgetContext 型定義の両方を抱える（同じファイル）
- 整合する事実: page 固有機能の追加（Insight / CostDetail / Category / 等）に対して、ctx と registry の両方で追加対応が必要な時に、どちらも optional 追加で対応してきた

### B-2. S3-H4（isVisible gate の定着）と S4-H1（useMemo の最短経路性）は構造同型

両仮説とも「最短経路で問題を解決できる機構が存在すると、構造的改善の圧力が減衰する」という同じメカニズムを、ctx と pure fn の 2 箇所で説明している。

- 記号: S3-H4 ↔ S4-H1
- `isVisible` gate = optional field の null check を widget 側で吸収 → ctx 側を required にする圧力が消える
- `useMemo` 内 pure = pure 抽出を useMemo で代替 → domain/calculations への昇格圧力が消える
- 共通するメタ構造: **「近道が存在すると、正道を通る動機が消える」**

### B-3. S2-H2（handler / readModel 責務境界の未成文）と S4-H2（pure 抽出先規約の未成文）は共起

両仮説は「配置規約の成文化が行われていない」という同一原因を、handler と pure fn の 2 箇所で観察している。

- 記号: S2-H2 ↔ S4-H2
- 事実: `references/01-principles/` には業務値の正本定義（purchase-cost / gross-profit / sales 等）は存在するが、「コード片の配置先ルール」は成文化が部分的
- 共通するメタ構造: **「what を規定する原則」はあるが、「where に置くかを規定する原則」が弱い**

### B-4. S5-H1（feature slice 移行中間）と S2-H3（useCostDetailData 複製）は同一事象の別側面

両仮説は「feature slice 化移行の中間状態」を widget 層と hook 層で観察した結果を別仮説として立てている。

- 記号: S5-H1 ↔ S2-H3
- 事実: `features/cost-detail/` は widgets.tsx も useCostDetailData.ts も複製を抱えている（inquiry/01 §特殊 1 / inquiry/06 §A-2）
- 単一の移行作業（feature slice 化）が widget 層と hook 層の両方で中断されている

### B-5. S1-H2（ctx scope 相違）と S6-H3（Dashboard 独自分析概念集中）は相互依存

Dashboard が全店横断 + 独自分析概念を持つことが、WidgetDef 型 A（Dashboard-local）と Dashboard-local `WidgetContext` required 昇格の両方を必要とした。両仮説は同じ Dashboard の特殊性を、型と分析概念の 2 軸で観察している。

- 記号: S1-H2 → S6-H3 / S6-H3 → S1-H2（双方向強化）
- 事実: inquiry/04 §C の 25 field 昇格中、20 field が Dashboard 固有 optional（inquiry/04 §B-3）

### B-6. S6-H2（ConditionSummaryEnhanced の多 sub-widget 化）と S1-H3（WidgetId string 緩和）は競合的説明

`WidgetId` が literal union（型 A）のまま厳格管理されれば、ConditionSummaryEnhanced 相当の「1 widget だが実体は多機能」は登録コストが高く抑制されうる。逆に string 緩和があったから 1 widget に機能を畳み込むことが許された可能性がある。

- 記号: S6-H2 ⊥ S1-H3（両立可能だが説明競合）
- 競合: S6-H2 が真なら「widget 機能の畳み込みが発生する方が先」、S1-H3 が真なら「型緩和が畳み込みを許した方が先」。両者の時系列順序は本台帳では未検証（Phase 3 以降）。

## C. 同一症状群内の仮説相互作用

### C-1. S1 内部（WidgetDef 2 型）

- S1-H1（段階的導入）→ S1-H3（string 緩和）: 過渡期に adapter が必要で adapter 側が string 受けになり、literal union 管理のコストが増えて緩和圧力が生じた
- S1-H2（scope 相違）⊥ S1-H1: H2 なら 2 型は本質的に必要で、H1 なら 2 型は過渡期の残存。両立可能だが説明の重心が異なる

### C-2. S2 内部（pipeline 非統一）

- S2-H1（段階導入）→ S2-H2（責務境界未成文）: 段階導入時に規約が無いと配置が人依存になり、H1 と H2 は強化関係
- S2-H3（feature slice 移行）⊥ S2-H1: H3 は「slice 化」という別観点、H1 は「readModel 正本化」という別観点。同時に両方発生している

### C-3. S3 内部（page-coupled ctx）

- S3-H1（時系列継ぎ足し）→ S3-H4（gate 吸収）: H1 で継ぎ足された optional field が、H4 の gate で運用可能になり、剥離圧力が消える
- S3-H2（統合契約 spec 不在）→ S3-H1（継ぎ足し許容）: spec が無いから継ぎ足しが許容された
- S3-H3（Dashboard required 昇格）⊥ S3-H1（ページ追加継ぎ足し）: H3 は Dashboard の例外的対応、H1 は他 page の継ぎ足し。両立

### C-4. S4 内部（pure 埋没）

- S4-H1（useMemo 最短経路）→ S4-H4（hook / pure 境界曖昧）: 最短経路が使われることで hook 内 pure が常態化する
- S4-H2（配置規約未成文）→ S4-H1（抽出動機不足）: 規約が無いことが抽出判断のコストを上げ、最短経路が選ばれる
- S4-H3（ECharts 対象外）は独立: H1/H2/H4 とは別軸

### C-5. S5 内部（複製 / orphan）

- S5-H1（移行中間）→ S5-H3（正本マーク不在）: 移行中間のどちらが正本かを決定するマークが無いことが、H1 の状態を長期化させる
- S5-H2（削除決定権曖昧）は H1 / H3 と独立: orphan 残存は移行とは別機序

### C-6. S6 内部（Dashboard 複雑性）

- S6-H1（Dashboard 先行設計）→ S6-H2（sub-widget 畳み込み）: 先行設計の名残で ConditionSummaryEnhanced 相当の畳み込みが許容された
- S6-H3（分析概念集中）→ S6-H1（肥大化残留）: 分析概念が Dashboard に集中するため、先行設計の肥大化を解消する機会が来ない
- S6-H4（Plan パターン集約性）は構造必然: 他 H と独立

## D. 共通構造源として浮上する仮説群

B / C の相互作用を通じて、複数症状群を横断する**共通構造源**として以下 4 項が浮上する。これらは「真因仮説の仮説」として Phase 3 原則候補の入力になる想定。本台帳では事実として記録するのみ。

### D-1. 「配置先の規約（where）が what の規約に比べて弱い」

関連仮説: S2-H2 / S4-H2（共起）、S5-H3（正本マーク不在）、S2-H1 / S4-H1（規約が無い代償として個別判断で近道を選ぶ）

- `references/01-principles/` には業務値の正本定義（what）が成文化されている
- 「コード片をどこに置くか」「どちらが正本か」のルール（where）は部分的にしか成文化されていない
- 結果として、handler の配置先（readModels / queries）/ pure の配置先（domain/calculations / features/\*/application/pure / presentation/\*/helpers）/ widget の配置先（pages / features） の 3 軸で並存が発生している

### D-2. 「近道（shortcut）の存在が構造的改善の圧力を消す」

関連仮説: S3-H4（gate）、S4-H1（useMemo）、S6-H2（sub-widget 畳み込み）

- 問題の局所的解決手段（widget 側の null check / useMemo 内の pure / 1 widget 内の機能畳み込み）が存在
- 局所解決が可能な間、構造改善の意思決定が後回しになる
- これが長期化すると、局所解決のパターンが標準化（gate パターン / useMemo パターン / 畳み込みパターン）し、剥離がさらに困難になる

### D-3. 「段階的導入の中間状態が複数層で同期せず固定化する」

関連仮説: S1-H1（WidgetDef 過渡期）、S3-H1（page-local 継ぎ足し）、S5-H1（feature slice 移行）、S2-H1（readModel 正本化段階）、S2-H3（useCostDetailData 複製）

- 大型改修（feature slice 化、readModel 正本化、page 追加）が複数層（widget 型 / ctx 型 / hook / handler / style）にまたがる
- 移行完了の判定が「全層の整合確認」ではなく「主要層の動作確認」になっており、残層（adapter / 複製 / orphan）が中間状態のまま残る
- これが「撤退の 3 ステップ」（plan.md §10）の L3 実削除が発動しないまま固定化する

### D-4. 「Dashboard の構造的特殊性が汎用設計の非対称性を生成する」

関連仮説: S1-H2（ctx scope 相違）、S3-H3（Dashboard required 昇格）、S6-H1 / H2 / H3（Dashboard hotspot）

- Dashboard は全店横断 + 独自分析概念 + 最初に作られた経緯 の 3 要素を持つ
- これを Unified 契約で包もうとすると「Dashboard 固有 optional」として非対称が発生する
- 結果として、Dashboard 関連ファイルが hotspot に集中し、汎用設計（Unified ctx / WidgetDef 型 B）は「Dashboard の例外を除く」形で運用される

### D-5. 「本台帳の読み方」

D-1 〜 D-4 は **4 つの独立した仮説群**として扱う。統合して「1 つの真因」にしようとする試みは拒否する（不可侵原則 #11）。Phase 3 原則候補の提示時には、4 つを並列に原則化する選択肢を検討する想定。

## 付記

- 本台帳は immutable。Phase 3 以降の追加情報は `10a-*.md` として addend する
- 関連: `inquiry/09`（仮説の原出典）、`inquiry/11`（既存対策の回避経緯）
