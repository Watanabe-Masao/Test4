# plan — taxonomy-v2（親: 分類体系の制度化）

> 本 project は **responsibility-taxonomy-v2 / test-taxonomy-v2 の 2 軸を束ねる親**。
> Constitution（7 不可侵原則）と interlock 仕様を固定し、両軸が相互契約を持つ
> 状態を AAG 第 3 の柱として恒久化する。実装は子 project が担う。

## 7 不可侵原則（両軸共通）

| # | 原則 | 短い意味 |
|---|---|---|
| 1 | **未分類は分類である** | `R:unclassified` / `T:unclassified` を能動タグとして扱う。タグなしは CI fail |
| 2 | **1 タグ = 1 軸** | 責務 × 純粋性 × 層を 1 つのタグに押し込めない。軸ごとに別 namespace |
| 3 | **語彙生成は高コスト儀式** | 新タグ追加は review window のみ。日常作業では `R:unclassified` に退避 |
| 4 | **Tag ↔ Test は双方向契約** | タグが test obligation を発行し、test が tag contract を検証する |
| 5 | **Origin は記録する** | 全タグに Why（導入理由）+ When（採択日）+ Who（採択者）+ Sunset 条件を持たせる |
| 6 | **Antibody Pair を持つ** | 各タグは対概念タグと相互制約を持つ（例: `R:authoritative` ↔ `R:bridge`） |
| 7 | **Cognitive Load Ceiling** | 1 人が把握できる語彙量を超えない（運用上限 = 15 前後） |

### 原則の位相

- 原則 1〜3: **語彙の扱い方**（create / retire / unclassified）
- 原則 4: **軸間 interlock**（responsibility ↔ test）
- 原則 5〜7: **語彙の寿命管理**（record / pair / ceiling）

原則違反は全て AAG guard で hard fail。例外許容パターンなし（ratchet も設けない）。

---

## Interlock 仕様（責務軸 × テスト軸）

責務タグは **test obligation** を発行する。テストタグは **tag contract** を検証する。
親の Phase 1 で以下のマトリクスを正本化する（値は子 Phase 0 で精査）:

| R:tag | 必須 T:kind | 任意 T:kind | 備考 |
|---|---|---|---|
| `R:calculation` | `T:unit-numerical`, `T:boundary` | `T:invariant-math` | 数値的契約を持つため invariant を推奨 |
| `R:bridge` | `T:contract-parity` | `T:fallback-path` | current ⇔ candidate 境界 |
| `R:read-model` | `T:zod-contract`, `T:null-path` | — | parse fail fast + 欠損正常系 |
| `R:guard` | `T:meta-guard` | `T:allowlist-integrity` | guard 自身の契約テスト |
| `R:presentation` | `T:render-shape` | `T:side-effect-none` | 描画形状のみ検証 |
| `R:store` | `T:state-transition` | — | state のみ保有するため |
| `R:hook` | `T:dependency-list`, `T:unmount-path` | — | deps 完全性・unmount safety |
| `R:unclassified` | なし（**T:unclassified** が対応） | — | review window 待ち |

- マトリクス未登録の組み合わせは guard で block
- R:tag 追加は T:kind 追加と**同じ review window**で裁定する
- 片軸だけの追加は禁止（interlock 崩壊を防ぐ）

---

## 8 昇華メカニズム（継続監視）

| # | メカニズム | 正本 | 何を観測 |
|---|---|---|---|
| 1 | **Origin Journal** | `references/01-principles/taxonomy-origin-journal.md` | 全タグの Why/When/Who/Sunset |
| 2 | **Antibody Pairs** | `taxonomy-pairs.json` | 対概念タグの相互制約 |
| 3 | **Cognitive Load Ceiling** | health KPI | 語彙総数 ≤ 15（軸ごと） |
| 4 | **Bidirectional Contract** | `taxonomy-interlock.json` | R ⇔ T マトリクス整合 |
| 5 | **Entropy Monitoring** | health KPI | 未分類件数・未分類比率・タグ使用偏り |
| 6 | **Review Journal** | `references/02-status/taxonomy-review-journal.md` | 各 review window の追加・撤退・却下記録 |
| 7 | **AI Vocabulary Binding** | `CLAUDE.md` §taxonomy-binding | AI が新タグを勝手に作らない制約 |
| 8 | **Constitution Bootstrap Test** | `constitutionBootstrapGuard.test.ts` | 7 原則ファイルの存在・参照整合 |

---

## 親 Phase 構造（4 Phase）

### Phase 1: Constitution 起草

**目的:** 7 不可侵原則と interlock 仕様を固定する。子 project が実装を起動できる状態を必達。

**成果物:**
- `references/01-principles/taxonomy-constitution.md`（7 原則）
- `references/01-principles/taxonomy-interlock.md`（R ⇔ T マトリクス仕様）
- `references/01-principles/taxonomy-origin-journal.md`（初期記入: 現行 v1 の 20 タグ）
- `CLAUDE.md` §taxonomy-binding 追記（AI Vocabulary Binding）
- `constitutionBootstrapGuard.test.ts`（原則文書の存在検証）

**受け入れ条件:** 子 Phase 0 Inventory が Constitution を参照して開始可能。

### Phase 2: Review Window 仕様

**目的:** 語彙の追加・撤退・却下を扱う四半期 review window の運用を明文化する。

**成果物:**
- `references/03-guides/taxonomy-review-window.md`（手続き + 判定基準 + 記録形式）
- `references/02-status/taxonomy-review-journal.md`（journal skeleton）
- 同期 window ルール: 両軸の追加・撤退は同一 window で裁定

**受け入れ条件:** 初回 review window の開催手順が記述されている。

### Phase 3: 子 project 立ち上げ（承認ゲート）

**目的:** 両子 project の Phase 0 着手を承認し、並行進行を起動する。

**成果物:**
- 子 2 件の Phase 0 キックオフ承認記録
- 共通 Inventory Schema（両軸が同じ CanonEntry 形を使う合意）

**受け入れ条件:** 両子 Phase 0 が Constitution + interlock 仕様に基づき着手されている。

### Phase 4: 制度成立確認 + archive

**目的:** 制度成立 5 要件を満たし、親・子を archive する。

**制度成立 5 要件:**
1. 両子 Phase 9（Legacy Collection）完了
2. health KPI: 未分類件数 ≤ baseline（両軸）+ 未分類比率 安定
3. Cognitive Load Ceiling 維持（語彙 ≤ 15 / 軸）
4. 四半期 review window が 2 回以上記録されている
5. interlock マトリクスの違反件数 = 0（連続 2 四半期）

**受け入れ条件:** 5 要件全クリア + 人間レビュー承認 → archive。

---

## やってはいけないこと

- **親で実装を持つ** → Constitution / 仕様のみ。タグ書き換え等の個別作業は子に委譲
- **片軸だけ先行する** → interlock が崩れる。両子は同期進行
- **review window 外での新タグ追加** → 原則 3 違反。例外なし
- **未分類を "debt" として扱う** → 原則 1 違反。未分類は能動的分類であり eliminate 目標ではない
- **"authoritative" と同じ語を意味違いで併用** → semantic-classification-policy.md と同じ轍を踏まない
- **AI が自発的に新タグを提案** → CLAUDE.md §taxonomy-binding で block。提案は review window でのみ

---

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/test/responsibilityTagRegistry.ts` | 現行 v1 正本（子で v2 に拡張） |
| `app/src/test/guards/responsibilityTagGuard.test.ts` | 現行 v1 guard |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | 現行 TSIG（v2 でタグ認識化） |
| `projects/responsibility-taxonomy-v2/` | 子: 責務軸（Phase 0-9） |
| `projects/test-taxonomy-v2/` | 子: テスト軸（Phase 0-9） |
| `projects/pure-calculation-reorg/` | 姉妹 project（同じ制度化フレーム） |
