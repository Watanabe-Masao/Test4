# inquiry/01a — widget specs bootstrap addendum

> 役割: `inquiry/01-widget-registries.md` の **addendum**（plan.md §3 Phase 1「台帳は immutable、追加は `01a-*.md`」規約に従う）。
>
> 目的: Widget Spec System (WSS) の **bootstrap 決定**を Phase 1 内で事実として記録する。本ファイルは WSS の design-of-record。
>
> **振る舞い（behavior）を記述する doc カタログ** を立ち上げる決定の記録。使い方（usage）ではない。

## 背景（採取条件）

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| 起点 | `inquiry/01-widget-registries.md`（45 widget / 10 registry の事実台帳） |
| 追加要件 | (a) AAG 機械検証可能な widget spec doc を整備 / (b) 複合 widget は親 1 spec に集約 / (c) 型番を割り振る / (d) 型・取得経路変更時に spec 更新を強制する仕組み / (e) 放置された古い doc を仕組みで排除する |
| 位置付けの制約 | ドキュメントは**改修・変更のための前提資料（現状把握）**。ユーザー向け機能説明ではない。**振る舞い**を書き、使い方は書かない |

## 決定事項

### D1. 配置: `references/05-contents/widgets/`

- 新カテゴリ `05-contents/`（実装要素の現状把握台帳）を新設
- `05-contents/widgets/` に widget 仕様書を配置
- 各 spec は `WID-NNN.md` 単体ファイル
- `doc-registry.json` に新 category `contents` として登録（doc 品質管理対象）
- `references/README.md` 構造表に追記
- 根拠: `references/` は既に AAG（doc-registry / docRegistryGuard / docCodeConsistencyGuard / obligation map）と結線済み。新 category 追加で既存 governance 機構を継承できる

### D2. 型番: flat `WID-NNN`

- 3 桁ゼロ埋め（`WID-001` 〜 `WID-045`）
- 一度割り当てたら再利用しない（廃止時は欠番のまま保持）
- カテゴリ情報は frontmatter（`registry: WIDGETS_KPI` 等）で持ち、ID には含めない
- 根拠: カテゴリ変更の影響を受けない安定 ID（registry が renamed されても ID 不変）

### D3. 1 widget = 1 spec（複合は親に集約）

- 登録単位は `readonly WidgetDef[]` の各 entry（45 件）
- 子 component は親 spec の「Composition」節に列挙（別 spec を作らない）
- `features/*/ui/widgets.tsx` 3 ファイルの byte-identical 複製は**同じ型番**を指す（別 spec を作らない）
- 根拠: `WidgetDef` が registration の単位であり、spec も同じ単位で揃える。複製問題は別途 Phase 4 で改修計画に載る

### D4. フォーマット: 生成 frontmatter + 手書き prose

- frontmatter は Phase 6 で実装する generator が source AST から**上書き生成**
- prose は手書き（**振る舞い**のみ記述、使い方は禁止）
- 人間が手で frontmatter を同期することはしない（drift 源の排除）
- 根拠: 手書き frontmatter は不可避に drift する。生成にすれば co-change は自動で強制される

### D5. 3 軸 drift 防御

実装要素 doc が陳腐化する 3 モードに対し、それぞれ独立した guard を持たせる。

| 軸 | drift の種類 | AR rule ID（Phase 6 登録予定） | 検出方法 |
|---|---|---|---|
| **存在** | registry に登録されたのに spec がない / spec があるのに registry に無い | `AR-CONTENT-SPEC-EXISTS` | registry × spec 双方向突合（`detection.type = custom`） |
| **構造** | source の型・登録情報が変わったのに frontmatter 古い | `AR-CONTENT-SPEC-FRONTMATTER-SYNC` | generator 再実行後 diff が非 0 → fail（`detection.type = custom`） |
| **構造（co-change）** | source の entry 行が変わった PR で対応 spec が未更新 | `AR-CONTENT-SPEC-CO-CHANGE` | git diff で registry 行変更検出 + 対応 spec の `lastVerifiedCommit` 未更新（`detection.type = co-change`） |
| **時間（freshness）** | source 無変更でも放置で陳腐化 | `AR-CONTENT-SPEC-FRESHNESS` | `(today - lastReviewedAt) > reviewCadenceDays` で fail（`detection.type = custom`） |
| **時間（owner）** | 責任 role 不在の spec | `AR-CONTENT-SPEC-OWNER` | frontmatter `owner` 欠落 / unknown role で fail（`detection.type = must-include`） |

本 5 ルールは Phase 3 で `inquiry/12-principle-candidates.md` の候補として正式に起票し、Phase 6 で実装・active 化する。

### D6. 既存 AAG 機構との結線

| 既存機構 | WSS での使われ方 |
|---|---|
| `docs/contracts/doc-registry.json` | 全 spec を `contents` category に登録（存在検証の入口） |
| `docRegistryGuard.test.ts` | 登録された spec が実在するか双方向検証 |
| `docCodeConsistencyGuard.test.ts` | spec 内の path 参照が実コードと一致 |
| `docStaticNumberGuard.test.ts` | spec 内のバージョン / 件数が generated KPI と一致 |
| `obligation-collector.ts` OBLIGATION_MAP | `app/src/presentation/pages/*/widgets.tsx` 等の registry 変更 → 対応 spec の更新義務（Phase 6 で追加） |
| `aag-core-types.ts` の `ReviewPolicy` | spec frontmatter の `owner / lastReviewedAt / reviewCadenceDays` に流用 |
| Architecture Rule system（`architectureRules.ts`） | Phase 6 で 5 件の `AR-CONTENT-SPEC-*` を登録 |

### D7. 型番割当（45 件、registry 登録順）

`inquiry/01-widget-registries.md` のサマリ表の registry 列挙順に従う。完全割当表は `references/05-contents/widgets/README.md` §「初期割当表」参照。内訳:

| ID 範囲 | registry | 件数 |
|---|---|---|
| WID-001 | WIDGETS_KPI | 1 |
| WID-002 〜 WID-007 | WIDGETS_CHART | 6 |
| WID-008 〜 WID-014 | WIDGETS_EXEC | 7 |
| WID-015 〜 WID-024 | WIDGETS_ANALYSIS | 10 |
| WID-025 〜 WID-029 | WIDGETS_DUCKDB | 5 |
| WID-030 〜 WID-031 | DAILY_WIDGETS | 2 |
| WID-032 〜 WID-037 | INSIGHT_WIDGETS | 6 |
| WID-038 〜 WID-039 | CATEGORY_WIDGETS | 2 |
| WID-040 〜 WID-043 | COST_DETAIL_WIDGETS | 4 |
| WID-044 〜 WID-045 | REPORTS_WIDGETS | 2 |
| **合計** | | **45** |

### D8. spec は改善要求の起点である（pipeline concern の surfacing）

- 4 層依存ルール（`Presentation → Application → Domain ← Infrastructure`）上、presentation 層は**パイプライン本体を直接改修する責務を持たない**
- widget が観察する**パイプライン品質問題**（取得経路の重複 / 脆弱な fallback / 欠落した契約 / 型の曖昧さ / タイミング問題 / raw レコード走査の埋没）は、widget 側で workaround せず、**spec に事実として記録**する
- 記録された concern が Phase 2 真因分析 → Phase 3 原則候補 → Phase 4 改修計画 → Phase 6 実装 の経路で上位層の改善要求として処理される
- spec の Section 9「Pipeline Concerns / Upstream Requests」を必須セクションとする
- 改善は **4 ステップ pattern**（新実装 → 移行 → 削除 → guard）+ guard 先行（`plan.md §10.5`）により「全体が壊れないよう段階的に進める」
- 根拠: widget は困るべきときに困る。困った事実を spec に書く。書かれた事実が上位層への改善要求になる。widget 側で吸収すると改善要求が生まれず、pipeline の病理が永続化する

**Phase 1 における書き方の制約:**
- concern は**事実として記述**する（例: 「`result.daily` を直接 iterate している」）
- 改修案は書かない（例: 「readModel 化すべき」は Phase 4）
- concern に改修責務層（application / domain / infrastructure のどこで直すべきか）の示唆を併記するのは**事実の一部**として許容する（その解釈は Phase 2 以降で検証）

## bootstrap 時点の landed（本 commit）

- `references/05-contents/README.md`（category 正本。位置付け + 3 軸 drift 防御 + frontmatter 共通スキーマ）
- `references/05-contents/widgets/README.md`（widget catalog 正本。45 件 型番割当表 + WSS format + freshness policy）
- `docs/contracts/doc-registry.json` に category `contents` を追加（2 エントリ）
- `references/README.md` 構造表に `05-contents/` を追記

## 未着手（後 Phase に明示的に送る）

| 項目 | 送り先 Phase | 備考 |
|---|---|---|
| 各 `WID-NNN.md` spec doc（45 件） | Phase 6 量産 | frontmatter generator 実装後。pilot として WID-001 / WID-002（chart-daily-sales）/ WID-040（costdetail-kpi-summary）の 3 件を archetype 代表として先行作成予定 |
| frontmatter generator 実装（`tools/widget-specs/generate.mjs`） | Phase 6 | source AST から frontmatter を上書き生成 |
| 5 件の Architecture Rule 登録 | Phase 3 候補 → Phase 6 active | `AR-CONTENT-SPEC-EXISTS` / `AR-CONTENT-SPEC-FRONTMATTER-SYNC` / `AR-CONTENT-SPEC-CO-CHANGE` / `AR-CONTENT-SPEC-FRESHNESS` / `AR-CONTENT-SPEC-OWNER` |
| `obligation-collector.ts` への OBLIGATION_MAP entry | Phase 6 | registry 変更 → 対応 spec 更新強制 |
| `@widget-id WID-NNN` JSDoc の source 側注入 | Phase 6 | source ↔ spec の双方向 link |

## 本 addendum の位置付け制約（Phase 1 規律）

- 本ファイルは **bootstrap 決定の記録**。原則（principles）の正本化ではない
- 5 件の AR rule は Phase 3 で正式に原則候補化する（本ファイルでは「候補の候補」として列挙するに留める）
- 本ファイルが `references/01-principles/` や `docs/contracts/principles.json` を touch しないことを確認した

## 参照

- 起点台帳: `inquiry/01-widget-registries.md`
- カテゴリ正本: `references/05-contents/README.md`
- widget カタログ: `references/05-contents/widgets/README.md`
- AAG 既存機構: `app/src/test/aag-core-types.ts`、`tools/architecture-health/src/collectors/obligation-collector.ts`、`app/src/test/architectureRules.ts`
- plan 根拠: `plan.md` §2 不可侵原則 #12、§3 Phase 1 次 Phase への渡し方（`01a-*.md` addend 規約）
