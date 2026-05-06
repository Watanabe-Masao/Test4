# Detection Inventory v2

> **役割**: AAG / RepoSteward に articulate された検出 logic の **inventory map** (= どこにどんな検出があるかを 1 か所で articulate)。Wave 4 #18 (= reposteward-ai-ops-platform、preparatory doc work) で landing。
>
> **canonical**: 本 narrative + `docs/contracts/aag/detection-inventory.schema.json` (= contract) + `references/04-tracking/generated/detection-inventory.json` (= 生成 artifact)。
>
> **位置付け**: 本 inventory は AI session が「どこに何が articulate されているか」を直接 query するための index。Wave 4 #16 comment scan / Wave 4 #15 cleanliness check と並ぶ AI navigation surface (= Wave 3 navigation MVP の補完)。
>
> **AAG framework との関係**: AAG framework 自体の articulation source は `aag/_internal/`、本 inventory は AAG が articulate する rule / detector / guard を **集約 query** するための view (= 1 → many index)。

## 動機

AI session が repo を articulate するときに「この検出 logic はどこにあるか」「この path で何が検出されるか」を articulate する必要がある。従来は:

- `app/src/test/guards/` を grep
- `tools/architecture-health/src/collectors/` を walk
- `aag-engine/internal/detectors/` を inspect
- `app/src/test/audits/` を inspect

の 4 か所を独立に articulate する必要があり、AI session が抜け漏れた articulate を踏みやすかった。

Detection Inventory v2 は **4 か所の articulate を 1 JSON に articulate して 一括 query 可能にする**。

## 4 kind の articulate

| kind | location | 役割 | 数（articulate 時） |
|---|---|---|---|
| `guard` | `app/src/test/guards/` | 構造制約の機械検証 (= violation で fail) | 多数 (60+) |
| `audit` | `app/src/test/audits/` | 状態観測の数値化 (= 違反観測のみ、fail しない) | 4-5 |
| `detector` | `aag-engine/internal/detectors/` + `tools/architecture-health/src/detectors/` | DetectorResult を返す read-only 検出 (= Go MVP family) | 5 |
| `collector` | `tools/architecture-health/src/collectors/` | KPI を集計して Health に articulate | 14 |

## inventory の更新方針

### v1 (= 本 step、MVP)

- 手動 articulate (= initial inventory.json を hand-build)
- schema は contract として固定、後続 v2 で field 拡張
- AI session が必要時に inventory を読んで navigate

### 将来の v2 (= 本 PR scope 外、後続 step で検討)

- 自動生成 (= source-facts.ts と同 idiom で collector が articulate)
- `inputSources` / `outputContract` / `severity` の articulate
- `aag inventory` CLI command (= where-am-i / context と同 family)

## 参照

| 文書 / artifact | 役割 |
|---|---|
| `docs/contracts/aag/detection-inventory.schema.json` | canonical schema (= JSON Schema draft-07) |
| `references/04-tracking/generated/detection-inventory.json` | 初期 inventory artifact (= Wave 4 #18 で hand-author) |
| `tools/architecture-health/src/detectors/README.md` | detector 4 層 layered model articulate (= 本 inventory の `detector` kind の根拠) |
| `references/03-implementation/architecture-rule-system.md` | AAG rule 体系全体 (= guard / detector の articulate 根拠) |
| `aag-engine/internal/detectors/` (5 files) | Go-side detector 5 件 |
| `tools/architecture-health/src/detectors/` (5 files) | TS-side detector 5 件 |
| `tools/architecture-health/src/collectors/` (14 files) | collector 14 件 |
| `app/src/test/guards/` (60+ files) | guard 60+ 件 |
| `app/src/test/audits/` (4-5 files) | audit 4-5 件 |

## 関連 Wave (= reposteward-ai-ops-platform)

- **Wave 1 #1〜#6**: Task Capsule + Parameters + SourceFacts + Statistics + stats query (= 統計層の articulate)
- **Wave 2 #7〜#9**: effective LOC 化 + bucket distribution (= size 軸の articulate)
- **Wave 3 #10〜#14**: AI navigation MVP (= where-am-i / context / changed / rule locate / detector refs)
- **Wave 4 #15〜#17**: Cleanliness / Comments / Docs placement (= cleanliness 層の articulate)
- **Wave 4 #18 (本 step)**: Detection Inventory v2 (= preparatory doc work、Wave 4 全完遂 + Wave 5 への入力)
- **Wave 5 #19〜#23**: Premise / Repair / Next (= obligation 拡張 + repair-context generator + project stale + next action)

本 inventory は Wave 5 #21 (`reposteward repair-context`) の入力として再利用可能 (= violation kind から関連 detection を look up する用途)。
