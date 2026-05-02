# plan — aag-platformization

> **Supreme principle (唯一の禁則)**: AAG を「あるべき」で終わらさず、**observable に機能** させる。
> articulation without functioning は本 program の最大の violation (`references/01-principles/aag/strategy.md` §2.1「抽象化の過剰」AI 本質的弱点)。

---

## §1 不可侵原則

| # | 原則 | 違反時 |
|---|---|---|
| 1 | 既存 AAG の振る舞いと思想を変えない (矛盾・潜在バグの修復は例外、DA entry に articulate 必須) | revert + redesign |
| 2 | 既存 9 integrity guard / 12 AAG-REQ を緩和しない (ratchet-down のみ許容) | revert |
| 3 | 派生 artifact を手編集しない (canonical → derived の一方向) | revert |
| 4 | 全 deliverable は **5 軸 design articulation** を持つ (製本 / 依存方向 / 意味 / 責務 / 境界) | scope 外 |
| 5 | 全 deliverable は **observable verification** を持つ。observation なき articulation は scope 外 | scope 外 |
| 6 | 判断は AI-driven、人間承認は archive 1 点のみ。各判断は `decision-audit.md` + commit lineage | scope 外 |

---

## §2 AAG が functioning している状態 (F1〜F7)

supreme principle の operational 形。**F1〜F7 が同時 observable な状態** が完了形。

| # | functioning | observation 方法 |
|---|---|---|
| **F1** | AI が **必要 context だけ** 取得し、無関係 context が surface しない | tool call precision (= 該当 / 取得 ratio) |
| **F2** | AI が **意味のある info に素早く reach** できる | tool call 数 / time-to-meaningful-context |
| **F3** | doc / 実装 / rule の **drift が機械検出** される | guard の hard fail Y/N |
| **F4** | session 間で **判断履歴が継承** され、再 derivation 不要 | DA entry の re-build 必要性 |
| **F5** | 各 deliverable が **5 軸で grounded** されている | 5 軸 articulation 存在 + 整合 |
| **F6** | 新概念追加が **5 軸 review** を経る | review block / pass の Y/N |
| **F7** | 負債が滞留せず **ratchet-down** で減る | inbound 0 + archive 機能 |

---

## §3 技術前提と priority

F1〜F7 を成立させる技術前提。priority は「最も多くの F を enable する」順:

| priority | 技術前提 | 関連 F | 既存? | 工数目安 |
|---|---|---|---|---|
| 1 | 5 軸 articulation framework operational 化 | F5 / F6 | articulate は既存 (`source-of-truth.md` 等)、運用 process 不在 | 1 日 |
| 2 | `rules-by-path` artifact + sync guard | F1 / F3 | 不在 | 2-3 日 |
| 3 | `rule-detail` drawer + `rule-index` | F2 / F3 | 不在 (TS trace のみ) | 2-3 日 |
| 4 | 5 軸 audit (既存 AAG + 本 project) | F5 / F7 | 不在 | 2 日 |
| 5 | `rule-by-topic` index (manifest.json discovery 拡張) | F1 / F2 | 不在 | 1 日 |
| 6 | `decision-audit.md` 実運用 (本 program で actual に使う) | F4 | 制度 articulate 済、運用なし | 継続 |

→ 総工数 ~2 週間。各前提は **observable verification** を持つことが Phase 完了条件。

---

## §4 5 軸 design articulation (lens)

全 deliverable / 既存 audit / restructure 判断は以下を articulate:

| 軸 | 既存 articulate 場所 | 本 program での適用 |
|---|---|---|
| **製本** | `aag/source-of-truth.md` | canonical / derived / 何が 1 次正本か |
| **依存方向** | `aag/architecture.md` (5-layer drill-down) + `AAG-REQ-LAYER-SEPARATION` | 何 → 何、一方向か |
| **意味** | `aag/meta.md` (AAG-REQ-* + each rule's `what` / `why`) | 答える 1 問い |
| **責務** | `aag/strategy.md` §1.1.3「1 doc 1 責務」(C1) | single responsibility |
| **境界** | `aag/layer-map.md` + `aag/core/principles/core-boundary-policy.md` | 何の内 / 外 |

新概念追加は 5 軸を articulate してから build。既存 audit は 5 軸を lens に使う。

---

## §5 Phase 構造

各 Phase は **目的 / やること / 5 軸 articulate / 観測 / 不機能時 rollback** を持つ。

### Phase 0: Bootstrap (本 commit で完了)

`projects/_template` から複写 + 必須セット 6 ファイル + DA-α-000 (進行モデル) landing 済。

### Phase 1: 5 軸 articulation framework operational 化

**目的**: 全後続 deliverable の grounded base。

**やること**:
- 既存 5 軸 articulate (source-of-truth / architecture / meta / strategy / layer-map) が 5 軸を覆っていることを verify
- DA entry テンプレに 5 軸 articulation 欄追加 (本 plan + decision-audit.md 修正)
- 不足 articulate があれば既存 doc に追加 (新 doc は作らない)

**5 軸 articulate** (本 Phase 自身):
- 製本: `decision-audit.md` の DA entry テンプレが canonical
- 依存方向: 既存 `aag/source-of-truth.md` 等 → 本 plan/decision-audit が参照 (一方向)
- 意味: 「全 deliverable に design 軸 articulation を要件化する」
- 責務: framework operational 化のみ。新規 doc 作成は scope 外
- 境界: framework 制度内、deliverable 個別 articulate は Phase 2+ の責務

**観測**:
- 本 program 内の deliverable 全件が 5 軸 articulate を持つ Y/N
- 既存 AAG 5 軸 articulate に gap が 0 か確認

**不機能時 rollback**: 本 Phase は doc 編集のみ。git revert で復帰。

### Phase 2: `rules-by-path` artifact + sync guard

**目的**: F1 (path-triggered context 制御) + F3 (drift 検出) の最初の AR-rule 拡張。

**やること**:
- `tools/architecture-health/src/aag/rules-by-path-generator.ts` 新設
- `docs/generated/aag/rules-by-path.<format>` 生成 (path prefix → AR-rule id 配列)
- `app/src/test/guards/aagRulesByPathSyncGuard.test.ts` 新設 (canonical ↔ artifact drift 検出)
- `npm run docs:generate` から呼び出し
- **format 選定** (DA-α-002): JSON / CUE / YAML / TOML 等から AI 判断

**5 軸 articulate**:
- 製本: 派生 (canonical = `app-domain/gross-profit/rule-catalog/base-rules.ts`)
- 依存方向: base-rules.ts → generator → artifact (一方向、逆参照禁止)
- 意味: 「path X で関係する AR-rule id 集合は何か」の 1 問い
- 責務: path → rule id mapping のみ (rule semantics は articulate しない)
- 境界: 派生 artifact 層、authoring 編集禁止 = guard で hard fail

**観測** (Phase 完了直後 simulation):
- AI が `merged.ts` 編集 task で artifact 1 read で rule id 集合取得可? Y/N
- TS trace 比 tool call 削減率 > 2.0?
- 試験 drift で sync guard が hard fail? Y/N

**不機能時 rollback**: artifact 削除 + commit revert + DA-α-002 軌道修正に "機能しなかった" 記録。

### Phase 3: `rule-detail` drawer + `rule-index`

**目的**: F2 (意味のある info に素早く reach) + F3 (drift 検出)。

**やること**:
- `docs/generated/aag/rule-index.<format>` (軽量 index: rule id + 1 行 summary + slice)
- `docs/generated/aag/rule-detail/<id>.<format>` (個別 rule の why / migrationRecipe / fixNow detail、on-demand)
- 同期 guard (rule-index / rule-detail と canonical の sync)

**5 軸 articulate**:
- 製本: 全て派生 (canonical = base-rules.ts + execution-overlay.ts + defaults.ts merged)
- 依存方向: canonical → generator → artifact (一方向)
- 意味: index = 「何があるか」、detail = 「特定 rule の中身」
- 責務: index = 軽量 lookup、detail = 個別 rule の context provision
- 境界: 派生層、TS authoring 編集禁止

**観測**:
- rule lookup が TS trace 比で何倍速いか (tool call 数 / token 消費)
- guard 違反時に AI が rule-detail へ reach する step 数

**不機能時 rollback**: artifact 削除 + revert。

### Phase 4: 5 軸 audit (既存 AAG + 本 project)

**目的**: F5 (grounded) + F7 (負債 ratchet-down)。

**やること**:
- CLAUDE.md / `aag/*` / `references/01-principles/aag/*` / 本 project (`aag-platformization`) を 5 軸で audit
- 違反箇所を分類: **製本重複 / 依存逆 / 責務集合 / 境界曖昧 / 意味曖昧**
- 削減 / restructure 提案を articulate (実施判断は DA-α-004)
- 本 project 内の reframe 跡 (旧 framing 残存) を archive
- 既存 articulate に gap があれば既存 doc に追加 (新 doc は作らない)

**5 軸 articulate** (本 Phase 自身):
- 製本: 本 Phase は audit 結果の articulate のみ、canonical 化はしない
- 依存方向: 既存 doc → audit 結果 (一方向)
- 意味: 「現状の 5 軸 articulate 違反はどこにあるか」
- 責務: 違反検出と分類のみ。restructure 実施は per-violation の DA judgement
- 境界: audit 範囲 = 本 program scope 内 + AAG core docs + 本 project 自身

**観測**:
- 違反検出件数 + 解消件数
- 本 project 内 reframe 跡 articulation 削減量

**不機能時**: audit 結果が空 (違反 0) なら Phase は no-op で完了。問題なし。

### Phase 5: `rule-by-topic` index

**目的**: F1 / F2。manifest.json `discovery.byTopic` の AR-rule 拡張。

**やること**:
- `docs/generated/aag/rule-by-topic.<format>` (topic / keyword → rule id)
- manifest.json の discovery section と並列 articulate (新 file 追加か既存拡張かは DA-α-005 判断)

**5 軸 articulate**:
- 製本: 派生
- 依存方向: canonical + topic vocab → generator → artifact
- 意味: 「topic / keyword に対応する rule id 集合」
- 責務: topic-to-rule-id mapping のみ
- 境界: 派生層

**観測**: AI が topic 起点で rule subset に reach できるか + tool call 削減率

**不機能時 rollback**: artifact 削除 + revert。

### Phase 6: Simulation + 機能 verify

**目的**: F1〜F7 の comprehensive verification。**本 session 内 / 各 Phase 完了直後の AI simulation で測定** (calendar-time 観測なし、`AAG-REQ-NO-DATE-RITUAL` 整合)。

**Control Test Scenarios** (`decision-audit.md` DA-α-006 に observation table landing):

| # | scenario | 関連 F | 測定 |
|---|---|---|---|
| CT1 | `merged.ts` 編集 → rules-by-path から関連 rule subset を 1 read | F1 | precision + tool call 数 |
| CT2 | 関係ない path 編集 → 関連 rule が surface しない | F1 (negative) | 無関係 surface 件数 = 0 ? |
| CT3 | guard 違反 → rule-detail から why/migrationRecipe へ reach | F2 | step 数 / time |
| CT4 | topic 起点で関連 rule discovery (Phase 5 effect) | F1 / F2 | hit rate |
| CT5 | 試験 drift → sync guard hard fail | F3 | guard 反応 Y/N |
| CT6 | 新 session 起動 → DA entry を read して判断継承 (re-derive 不要) | F4 | re-derive 回数 |
| CT7 | 5 軸 articulate なき deliverable は review block (Phase 1 effect) | F5 / F6 | block / pass |

**観測** = simulation 結果が DA-α-006 entry に landing。

**不機能時**: 該当 functioning に対応する技術前提を rollback / 再 design。

### Phase 7: archive + cutover charter

**目的**: F7。本 program 完了時の articulate。

**やること**:
- 不機能と判明した deliverable の revert + DA entry に "機能しなかった" 記録
- Phase 4 audit で identify された負債の削減実施
- 後続 program (もし必要なら) の charter を 1 doc で articulate (`aag/core/AAG_FOLLOWUP_CHARTER.md` または既存 doc 拡張、判断は DA-α-007)
- archive 移行 (人間承認 = 最終 1 点)

**5 軸 articulate**: archive 判断時に articulate。

**観測**: 全 F1-F7 が observable に functioning しているか の最終 audit。

**不機能時**: 部分機能なら部分 archive。全不機能なら full revert + 本 program archive (失敗ではなく mechanism が機能した記録)。

---

## §6 Decision Audit + 観測 protocol

詳細: `decision-audit.md`。各 Phase 着手時に DA entry (判断時 + 5 軸 articulate + commit lineage + 振り返り観測点) を landing、Phase 完了時に振り返り observation 実測。

主要 DA entry:

| ID | Phase | 判断対象 |
|---|---|---|
| DA-α-001 | Phase 1 | 5 軸 framework operational 化方針 |
| DA-α-002 | Phase 2 | rules-by-path format 選定 + sync guard 設計 |
| DA-α-003 | Phase 3 | rule-detail / index granularity |
| DA-α-004 | Phase 4 | audit 違反の restructure 実施判断 (per violation) |
| DA-α-005 | Phase 5 | rule-by-topic 配置 (manifest 拡張 / 並列 file) |
| DA-α-006 | Phase 6 | simulation 結果総括 |
| DA-α-007 | Phase 7 | archive / 後続 program charter 判断 |

---

## §7 やってはいけないこと

| 禁止事項 | なぜ |
|---|---|
| 既存 AAG 振る舞い変更 (rule semantics / merge 結果 / response 出力 / detector message) | 不可侵原則 1 |
| 既存 9 integrity guard / 12 AAG-REQ の baseline 緩和 | 不可侵原則 2 |
| 派生 artifact 手編集 | 不可侵原則 3 |
| 5 軸 articulate なき deliverable 追加 | 不可侵原則 4 |
| observable verification なき articulation | 不可侵原則 5 + supreme principle |
| 単一 commit で 2 Phase 以上をまとめる | Phase 境界での観測ができなくなる |
| `base-rules.ts` (10,805 行) の TS authoring を JSON 化 | authoring の rich 表現を毀損 |
| 新 doc を増やす (gap fill は既存 doc 拡張) | `strategy.md` §1.1「正本を増やさない」整合 |
| Rust を本 program runtime に使う (本体 WASM/Rust と境界混線) | 言語境界、AI が Rust を強く推奨する場合は人間確認 escalation |

---

## §8 関連実装

### 触らない (既存資産は維持)

| パス | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | TS authoring canonical (10,805 行) |
| `app/src/test/architectureRules.ts` | consumer facade |
| `tools/architecture-health/src/aag-response.ts` | AagResponse canonical |
| `references/01-principles/aag/*` | 9 doc, 1,538 行 |
| 既存 9 integrity guard | F3 の現役機能 |
| `manifest.json` | discovery / pathTriggers (本 program で extend) |

### 追加する (= 派生 artifact + 同期 guard)

| パス | Phase | 5 軸 |
|---|---|---|
| `tools/architecture-health/src/aag/rules-by-path-generator.ts` | 2 | 派生生成器 |
| `docs/generated/aag/rules-by-path.<format>` | 2 | 派生 artifact |
| `app/src/test/guards/aagRulesByPathSyncGuard.test.ts` | 2 | sync 検証 |
| `tools/architecture-health/src/aag/rule-detail-generator.ts` | 3 | 派生生成器 |
| `docs/generated/aag/rule-index.<format>` | 3 | 派生 |
| `docs/generated/aag/rule-detail/<id>.<format>` | 3 | 派生 |
| `app/src/test/guards/aagRuleDetailSyncGuard.test.ts` | 3 | sync 検証 |
| `docs/generated/aag/rule-by-topic.<format>` | 5 | 派生 |

### 修正する (既存拡張)

| パス | Phase | 何を |
|---|---|---|
| `tools/architecture-health/src/collectors/obligation-collector.ts` | 2 | rules-by-path を obligation に組み込む拡張 |
| `.claude/manifest.json` | 5 | rule-by-topic を discovery に articulate (判断次第) |

### 修正の可能性 (audit 結果次第)

| パス | Phase | 何を |
|---|---|---|
| `CLAUDE.md` | 4 | 製本重複 / 責務集合があれば restructure |
| `references/01-principles/aag/*` | 4 | 5 軸 articulate に gap があれば追加 |
| `projects/aag-platformization/*` | 4 | reframe 跡 articulation の archive (本 project の自己 audit) |
