# taxonomy-origin-journal — 全タグの Origin（Why / When / Who / Sunset）

> **役割**: 責務軸（R:*）+ テスト軸（T:*）の各タグの **採択経緯**を記録する journal。
> Constitution 原則 5「Origin は記録する」の正本。
>
> **位置付け**: 本 journal は **App Domain 層** に属する（AAG Core / App Domain / Project Overlay 分離）。
> AAG Core は registry の **型** を提供、本 journal は app 固有の vocabulary 採択経緯を保持する。
>
> **改訂規律**: 本 journal の改訂は **review window** 経由のみ（原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）。
> AI が単独でエントリを追加・改変することは禁止。
>
> **status**: **draft skeleton（Phase 1 起草中）**。実 v1 タグ採取は子 Phase 0（Inventory）で完了させ、本 journal を full populate する。Phase 1 段階では **テンプレ + skeleton + 採取 obligation** を確定させる。

## 1. 形式定義

各タグは以下の形式で 1 エントリを持つ。

```markdown
### {軸}:{tag-name}

| 項目 | 値 |
|---|---|
| **Why** | <なぜこのタグが必要か> |
| **When** | <YYYY-MM-DD or "legacy-unknown"> |
| **Who** | <採択者ロール / "legacy-unknown"> |
| **Sunset 条件** | <何が起きたら撤退するか> |
| **Antibody Pair** | <対概念タグ。原則 6> |
| **promotionLevel** | L0 / L1 / L2 / L3 / L4 / L5 / L6（OCS.5）|
| **evidenceLevel** | generated / tested / guarded / reviewed / asserted / unknown（OCS.2）|
| **Lifecycle status** | proposed / active / deprecated / sunsetting / retired / archived（OCS.4）|

**Origin context**:
<採択時の状況・前提・制約。原則 5 の核心>

**関連 review window**:
- {YYYY-Q-N}: <window record への参照>
```

### 必須フィールド

- `Why` / `When` / `Who` / `Sunset 条件`（Constitution 原則 5）
- `Antibody Pair`（Constitution 原則 6）
- `promotionLevel`（OCS.5）
- `evidenceLevel`（OCS.2）
- `Lifecycle status`（OCS.4）

これらが欠落した entry は `AR-TAXONOMY-ORIGIN-REQUIRED` で hard fail。

### legacy-unknown の扱い

v1 から継承するタグで採択経緯が不明なものは:

- `When`: `legacy-unknown`
- `Who`: `legacy-unknown`
- `Why`: 推定理由 + 「（Phase 0 Inventory で `legacy-unknown` として採取）」と注記
- `Sunset 条件`: review window で別途検討（明示できなければ `TBD-pending-review-window`）

これは **Phase 0 Inventory で許可される唯一の例外**。新タグ（review window 経由）は legacy-unknown を使えない。

## 2. 責務軸（R:*）— v1 タグ skeleton

> **status**: skeleton。実採取は子 `responsibility-taxonomy-v2` Phase 0（Inventory）で完了。本節は **採取対象**を確定させる。
> 子 Phase 0 で `references/02-status/responsibility-taxonomy-inventory.yaml` に YAML 形式で全件記録した上で、本 journal の各 entry に転記する。

### 採取対象

`app/src/test/responsibilityTagRegistry.ts` 配下の **現行 v1 全タグ**。
件数の見込みは 20 タグ前後（親 plan.md §現行 v1 の課題に基づく）。

### Anchor Slice 5 R:tag（先行採取対象）

子 Phase 0 で **最優先で採取**する対象。Phase 1 Constitution の制度設計が完了した時点で
本 journal に entry が landing している必要がある（OCS.5 L2 到達条件）。

#### R:calculation

| 項目 | 値 |
|---|---|
| **Why** | TBD-pending-Phase-0-inventory |
| **When** | TBD（v1 採用日が legacy-unknown の場合は `legacy-unknown`）|
| **Who** | TBD |
| **Sunset 条件** | TBD-pending-review-window |
| **Antibody Pair** | `R:bridge`（authoritative ↔ bridge の対称性、Constitution §3 原則 6）|
| **promotionLevel** | L0（Phase 0 Inventory 完了で L1、Phase 1 Origin 採取で L2）|
| **evidenceLevel** | unknown（Phase 0 Inventory で `asserted` 以上に昇格、Phase J で `tested` へ）|
| **Lifecycle status** | active（v1 から継続）|

**Origin context**: TBD-pending-Phase-0-inventory（v1 registry の使用実態を採取後、推定 Why を記入）

**関連 review window**: 初回 review window（親 Phase 2 完了後）で確定

---

#### R:bridge / R:read-model / R:guard / R:presentation

同上の skeleton 形式で **Phase 0 Inventory 完了時に entry を埋める**。本 Phase 1 では entry 枠を確定させるのみ。

### Anchor Slice 以外の v1 タグ（Phase 0 Inventory で採取）

`R:store` / `R:hook` / `R:authoritative` / `R:utility` 等、Anchor Slice 外の v1 タグも子 Phase 0 で全件採取し、本 journal に entry 追加する。

`R:utility` のような **「捨て場」化したタグ**（plan.md §現行 v1 の課題で 33 件と記載）は、Phase 0 Inventory で採取後に **review window** で:

- 残置（理由を Origin context に明記）
- 撤退（`deprecated` → `sunsetting` → `retired`）
- 分割（複数の意味を持つ場合、複数の新タグに分解、各タグの Origin を新規追加）

のいずれかを裁定する。

### R:unclassified

| 項目 | 値 |
|---|---|
| **Why** | Constitution 原則 1「未分類は分類である」の能動タグ。判断保留・review window 待ち・新規ファイルの初期状態を表す |
| **When** | 2026-Q-N（Constitution 起草と同時、本 Phase 1 で確定）|
| **Who** | architecture（Constitution 起草時）|
| **Sunset 条件** | なし（恒久タグ。撤退すると原則 1 が破綻する）|
| **Antibody Pair** | なし（meta-tag。他の R:* と直交）|
| **promotionLevel** | L1（registry 登録後 L2 へ昇格、Phase 0 で）|
| **evidenceLevel** | guarded（`AR-TAXONOMY-NO-UNTAGGED` で「タグなし → unclassified」を強制）|
| **Lifecycle status** | active |

**Origin context**: v1 では「タグなし」と「未分類」が区別されておらず、未分類 400 件が baseline 化していた（plan.md §現行 v1 の課題）。Constitution 原則 1 で **両者を明示的に分離**するため `R:unclassified` を能動タグとして導入。

**関連 review window**: 初回 review window（Constitution 採択時）

## 3. テスト軸（T:*）— v1 TSIG 系統 skeleton

> **status**: skeleton。実採取は子 `test-taxonomy-v2` Phase 0（Inventory）で完了。

### 採取対象

`app/src/test/guards/testSignalIntegrityGuard.test.ts` 配下の **TSIG-* 全 rule** + 既存テスト粗分類。

### Anchor Slice 6 T:kind（先行採取対象）

#### T:unit-numerical

| 項目 | 値 |
|---|---|
| **Why** | TBD-pending-Phase-0-inventory |
| **When** | TBD |
| **Who** | TBD |
| **Sunset 条件** | TBD-pending-review-window |
| **Antibody Pair** | `T:render-shape`（数値検証 ↔ 形状検証）|
| **promotionLevel** | L0（Phase 0 Inventory 完了で L1）|
| **evidenceLevel** | unknown |
| **Lifecycle status** | active |

**Origin context**: TBD-pending-Phase-0-inventory

---

#### T:boundary / T:contract-parity / T:zod-contract / T:meta-guard / T:render-shape

同上の skeleton 形式で **Phase 0 Inventory 完了時に entry を埋める**。

### T:unclassified

| 項目 | 値 |
|---|---|
| **Why** | Constitution 原則 1 の能動タグ（テスト軸版）。タグなしテストと未分類テストを分離する |
| **When** | 2026-Q-N（Constitution 起草と同時、本 Phase 1 で確定）|
| **Who** | architecture（Constitution 起草時）|
| **Sunset 条件** | なし（恒久タグ）|
| **Antibody Pair** | なし（meta-tag）|
| **promotionLevel** | L1 |
| **evidenceLevel** | guarded |
| **Lifecycle status** | active |

**Origin context**: 責務軸 `R:unclassified` と対称。タグなしテストは CI fail、`T:unclassified` は active に許容。

**関連 review window**: 初回 review window（Constitution 採択時）

## 4. 採取 obligation（子 Phase 0 への引き継ぎ）

子 Phase 0 Inventory 完了時に、本 journal の以下が満たされている必要がある:

- [ ] 全 v1 R:tag（推定 20 件前後）の entry が landing
- [ ] 全 v1 T:kind（推定 TSIG-* 件数 + α）の entry が landing
- [ ] Anchor Slice 5 R:tag + 6 T:kind の entry が **完全状態**（TBD なし、または明示的な `legacy-unknown`）
- [ ] `R:unclassified` / `T:unclassified` の entry が landing（本 Phase 1 で確定）
- [ ] `legacy-unknown` を持つ entry の `Sunset 条件` が `TBD-pending-review-window` で明示されている

これは子 Phase 0 checklist の対応 checkbox と相互参照する（親 checklist Phase 1 §Constitution 本体「現行 v1 の 20 タグの Origin が記入されている」+ 子 Phase 0「現行 v1 の 20 タグ全てに Origin が記入されている」）。

## 5. 改訂手続き

### 5.1. 新タグ追加時

1. review window で提案 + 本 journal に skeleton entry 追加（Lifecycle: `proposed`）
2. 同 window で必須 T:kind / 必須 R:tag を Interlock マトリクスに追加
3. window 承認 → Lifecycle: `active` + 本 journal の `When` / `Who` を window 開催日 / 承認者に確定

### 5.2. 既存タグの撤退

1. review window で `deprecated` 提案 → 本 journal の Lifecycle 更新 + `Sunset 条件` を確定
2. `replacedBy` を Origin context に追記（plan §OCS.4）
3. 撤退期限到達 → `sunsetting` → `retired` → `archived`

### 5.3. legacy-unknown の解消

子 Phase 0 で採取された `legacy-unknown` entry は、初回〜複数回の review window で:

- 推定 Why の確認（archive されたコミット履歴を辿る等）
- 本来の Sunset 条件の議論
- 不要なら `deprecated` へ降格

を経て **legacy-unknown が 0 件** になるまで継続。これは制度成立 5 要件の一部ではないが、原則 5「Origin は記録する」の品質指標。

## 6. 関連文書

| 文書 | 役割 |
|---|---|
| `references/01-principles/taxonomy-constitution.md` | 7 不可侵原則（本 journal は原則 5 の正本） |
| `references/01-principles/taxonomy-interlock.md` | R ⇔ T マトリクス（本 journal の各タグが Interlock 上の役割を持つ） |
| `projects/taxonomy-v2/plan.md` | 親 plan §OCS.2 Evidence Level / §OCS.4 Lifecycle / §OCS.5 Promotion Gate |
| `projects/responsibility-taxonomy-v2/plan.md` Phase 0 | 子: 責務軸 v1 タグの採取 |
| `projects/test-taxonomy-v2/plan.md` Phase 0 | 子: テスト軸 v1 TSIG-* の採取 |
| `references/02-status/responsibility-taxonomy-inventory.yaml`（Phase 0 で生成） | 採取結果の YAML 正本 |
| `references/02-status/test-taxonomy-inventory.yaml`（Phase 0 で生成） | 採取結果の YAML 正本 |
| `references/02-status/taxonomy-review-journal.md`（Phase 2 で landing） | 各 review window の追加・撤退・却下記録 |
| `app/src/test/guards/constitutionBootstrapGuard.test.ts` | 本 journal の存在 + 形式検証 |
