# plan — aag-engine-readiness-refactor

## 不可侵原則

1. **engine 実装には入らない** — Go / Rust / その他言語での collector / detector / renderer / hard gate / KPI 計算の実装は本 project の scope 外。違反したら scope 逸脱として user に escalate。
2. **既存 guard の意味は変えない** — 検出条件 / hard gate / KPI 閾値 / baseline 数値 は本 project では touch しない。pure detector 抽出時も同じ test が同じ結果を返すことを Vitest wrapper で確認する（parity 保証）。意味変更が必要と判明したら別 project 起票。
3. **新 hard gate を追加しない** — 本 project は readiness を作る段階。hard gate 化判断は Phase 7 の readiness report で articulate するが、guard 実装そのものは別 project の所掌。
4. **rule semantics を別言語に複製しない** — 「TS で書いた detector logic を Go で再実装する」は engine 実装 project の責務。本 project では「Go で再実装可能な構造」になっているかだけを見る。
5. **app-specific TS guard を無理に外へ出さない** — calculation / presentation / domain 系の guard は app 固有で engine 化対象外。本 project では archive / project lifecycle / doc-registry / generated metadata 系のみを対象にする。
6. **§13.1 / §13.2 / §13.3 の commit pattern を全 Phase で適用** — Phase landing + wrap-up の二段 commit、references/ 新 doc 追加時の atomic dependent update、checkbox flip 後の docs:generate 別 commit。
7. **L3 重変更 routing に従う** — 各 Phase は decision-audit.md に DA-α-N entry を articulate（5 軸 + 観測点 + Lineage 仮 sha → 実 sha）し、振り返り判定（正しい / 部分的 / 間違い）まで完遂する（complexity-policy.md §3.4）。
8. **実装 AI が完了承認しない** — checklist の最終レビュー section は user 判断。AI 自己レビューを完遂しても user 承認なしでは archive 不可（PZ-13）。

## Phase 構造

各 Phase は §13.1 に従って **landing commit + wrap-up commit** の二段で進行する。
checkbox flip がある場合は §13.3 に従って docs:generate 反映を別 commit で landing。
references/ 配下に新 doc を追加する場合は §13.2 に従って doc-registry / README index /
inbound link を **同 atomic commit** に統合する。

### Phase 0: Bootstrap / Scope Lock

**目的**: project を起票し、scope / non-goals / authority / commit pattern を固定する。

**作業**:
- projects/active/aag-engine-readiness-refactor/ ディレクトリ + 必須 file 7 件 (AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit) + config/project.json
- references/04-tracking/open-issues.md の active project 索引に追加
- DA-α-000 entry articulate（本 project の進行モデル institute）
- §13.1 / §13.2 / §13.3 適用方針を plan.md に明記（本 section）

**完了条件**:
- project が architecture-health / project-health に認識される
- checklistFormatGuard / projectCompletionConsistencyGuard / projectizationPolicyGuard が PASS
- docs:check PASS
- DA-α-000 振り返り判定（landing commit SHA 確定後）

### Phase 1: AAG Input Inventory

**目的**: 将来 engine が読むべき input を棚卸し、永続 doc として landing する。

**作業**:
- 以下の input を分類:
  - **A. contracts**: `docs/contracts/*.json`
  - **B. generated artifacts**: `references/04-tracking/generated/*.json` / `docs/generated/aag/*.json`
  - **C. project lifecycle**: `projects/active/*/config/project.json` / `projects/completed/*/config/project.json` / `archive.manifest.json` / `ARCHIVE.md`
  - **D. rule source**: `app-domain/gross-profit/rule-catalog/base-rules.ts` 等
  - **E. guard source**: `app/src/test/guards/**` / `tools/architecture-health/**`
- `references/03-implementation/aag-engine-readiness-inventory.md` を新設し、上記分類 + 各 input の path / format / consumer を articulate
- §13.2 適用: 同 commit で `docs/contracts/doc-registry.json` + `references/README.md` 索引 + 必要な inbound link を統合
- DA-α-001 entry

**完了条件**:
- engine input 候補が 5 分類で articulate 済み
- active / completed / Archive v2 の読み方が明記済み
- completed project に plan.md / checklist.md が存在する前提を排除（= Archive v2 圧縮済 project でも engine が input を読めることを inventory 上で保証）

### Phase 2: DetectorResult / AagResponse Normalization

**目的**: 既存 guard / collector の失敗出力を、engine が扱える machine-readable output に寄せる。

**作業**:
- `tools/architecture-health/src/` 配下に DetectorResult schema + helper を新設
  ```ts
  type DetectorResult = {
    detectorId: string
    ruleId: string
    severity: 'error' | 'warn' | 'info'
    path: string  // repo-relative POSIX
    message: string
    evidence?: { expected?: unknown; actual?: unknown }
  }
  ```
- 対象を以下に限定:
  - project lifecycle 系
  - archive manifest 系
  - doc registry 系
  - generated artifact metadata 系
  - schema validation 系
- 非対象（不可侵原則 5）:
  - TypeScript AST guard
  - React/presentation boundary guard
  - domain calculation guard
  - WASM bridge guard
- human-readable renderer と machine result を分離
- DA-α-002 entry

**完了条件**:
- DetectorResult schema に準拠する output helper が存在
- 上記 5 系統で使用開始
- renderer 経由の人間向け表示と DetectorResult[] が分離されている

### Phase 3: Collector / Detector / Renderer 分離

**目的**: tools / guard 内に混在しがちな処理を engine 移行可能な形へ分離。

**分離モデル**:

```
collector:  repo から facts を集める (fs / glob 依存可)
  ↓
detector:   facts から DetectorResult[] を作る (pure)
  ↓
evaluator:  hard gate / KPI 判定を行う (pure)
  ↓
renderer:   json / markdown / console text を出す
```

**作業**:
- `tools/architecture-health/` 配下のフロー: filesystem read → facts → DetectorResult[] → health summary → renderer
- detector が fs / glob に直接依存しない箇所を増やす
- DA-α-003 entry

**完了条件**:
- detector が fs / glob に直接依存しない箇所が増える（具体数は inventory で確定）
- test wrapper と detection logic が分離される
- renderer 変更で detector logic が変わらない

### Phase 4: Path Normalization / RepoFileIndex

**目的**: engine 化で壊れやすい path 前提を統一。

**作業**:
- repo-relative POSIX path を標準化
- 絶対 path を artifact に入れない
- Windows path separator を内部表現に混ぜない
- `RepoFileEntry` 型を導入:
  ```ts
  type RepoFileEntry = {
    path: string
    kind: "json" | "markdown" | "typescript" | "other"
    sizeBytes: number
    sha256?: string
  }
  ```
- DA-α-004 entry

**完了条件**:
- project / archive / doc registry validator が共通 path helper を使う
- path 正規化処理が各 detector に散らばっていない
- future Go engine が同じ path convention を再現できる

### Phase 5: Archive v2 / Project Lifecycle Fixture Corpus

**目的**: 将来 Go/Rust engine の parity test に使える fixture を作る。

**作業**:
- `fixtures/aag/` 配下に pass / fail fixture を整備:
  - `archive-v2/pass-minimal/`
  - `archive-v2/fail-missing-restore-command/`
  - `archive-v2/fail-deleted-paths-empty/`
  - `project-lifecycle/pass-active/`
  - `project-lifecycle/fail-completed-not-archived/`
  - `doc-registry/fail-missing-readme-index/`
  - `generated/fail-stale-metadata/`
- 各 fixture に expected DetectorResult を定義
- TypeScript detector が fixture で検証できる test を追加
- DA-α-005 entry

**完了条件**:
- pass / fail fixture が最低 6〜8 件
- expected DetectorResult が fixture ごとに定義されている
- 既存 guard と pure detector が同じ DetectorResult を返す parity test が PASS

### Phase 6: Pure Detector Extraction

**目的**: Vitest や CLI に密着した guard から pure detector を切り出す。

**作業**:
- 優先対象（5 系統 → 最低 3 系統を抽出）:
  1. archive manifest detector
  2. project lifecycle detector
  3. doc registry detector
  4. generated artifact metadata detector
  5. schema validation detector
- before / after pattern:
  ```ts
  // before
  test("archive manifest is valid", () => {
    const files = fs.readFileSync(...)
    expect(...).toBe(...)
  })

  // after
  export function detectArchiveManifestIssues(input: ArchiveInput): DetectorResult[] {
    return [...]
  }
  test("archive manifest is valid", () => {
    expect(detectArchiveManifestIssues(input)).toEqual([])
  })
  ```
- DA-α-006 entry

**完了条件**:
- pure detector が最低 3 系統存在
- Vitest wrapper は thin wrapper 化されている
- Go/Rust engine が再実装すべき logic boundary が明確になる

### Phase 7: Engine Readiness Report / No-Go Boundary

**目的**: Go/Rust engine に入る前の最終判定を作る。

**作業**:
- 本 project root 配下に engine readiness report を作成 (= ファイル名は Phase 7 着手時に articulate、Phase 0 時点では path 文字列として書かない = pathExistence guard hard fail 回避)
- 内容:
  - 移行可能になった detector
  - まだ TS 側に残す detector
  - Go engine MVP input
  - Go engine MVP output
  - shadow mode 対象
  - hard gate 化してよいもの / まだ advisory にすべきもの
  - Go 実装開始条件
- DA-α-007 entry
- AI 自己レビュー全項目 [x]
- 最終レビュー (user 承認) 待ち state

**完了条件**:
- Go engine MVP scope が明確
- 移植禁止領域が明確
- shadow mode の比較対象が明確
- user 最終承認可能な状態（archive プロセスへ移行可能）

## やってはいけないこと

- **engine 実装に着手する** → 不可侵原則 1 違反、scope 逸脱として user escalate
- **既存 guard の検出条件 / hard gate / KPI 閾値を変更する** → 不可侵原則 2 違反
- **新 hard gate を追加する** → 不可侵原則 3 違反、必要なら別 project 起票
- **app-specific TS guard を engine 化対象に含める** → 不可侵原則 5 違反
- **1 commit に landing + wrap-up を統合** → §13.1 antipattern、drawer Pattern 1 違反
- **references/ 新 doc を doc-registry 更新なしで commit** → §13.2 antipattern、push fail
- **checkbox flip + docs:generate を amend で混ぜる** → §13.3 antipattern、AAG-REQ-NO-AMEND 違反
- **AI 単独で最終レビュー section を [x] にする** → 不可侵原則 8 違反、PZ-10/PZ-13 違反

## 関連実装

| パス | 役割 |
|---|---|
| `tools/architecture-health/src/collectors/` | Phase 1〜3 の collector 分離対象 |
| `tools/architecture-health/src/aag-response.ts` | Phase 2 の DetectorResult 統合候補 |
| `app/src/test/guards/projectizationPolicyGuard.test.ts` | Phase 6 の pure detector 抽出 候補 |
| `app/src/test/guards/checklistFormatGuard.test.ts` | Phase 6 の pure detector 抽出 候補 |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | Phase 6 の pure detector 抽出 候補 |
| `app/src/test/guards/docRegistryGuard.test.ts` | Phase 6 の pure detector 抽出 候補 |
| `docs/contracts/project-archive.schema.json` | Phase 5 の fixture が準拠する schema |
| `references/03-implementation/aag-engine-readiness-inventory.md` | Phase 1 で新設する永続 doc |
| `fixtures/aag/` | Phase 5 で新設する fixture corpus |
