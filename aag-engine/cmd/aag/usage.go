package main

// usage は --help / argument 不足時の hint 文字列。
//
// 各 command の articulate は file_layout (= command_*.go) と整合。新 command
// 追加時は同時に本 const にも 1 行 articulate する。
const usage = `aag — AAG / RepoSteward read-only operations CLI

NAMING:
  Concept / platform = "RepoSteward AI Ops Platform" (= reposteward-ai-ops-platform project)
  Binary             = "aag" (= aag-engine-go-mvp で institute された binary 名を継続)
  Plan / docs で "reposteward 〇〇" と articulate される command は本 binary では "aag 〇〇" で実行する。

USAGE:
  aag <command> [flags]

COMMANDS:
  validate         repo を read-only で検証し DetectorResult[] を出力 (= Phase 1 skeleton)
  fixtures         fixtures/aag/ 配下を discover し catalog を出力 (= Phase 3 deliverable)
  shadow           5 detector × 8 fixture を全 dispatch、parity summary を出力 (= Phase 9 deliverable)
  task prepare     active project の Task Capsule を JSON で出力 (= reposteward-ai-ops-platform Wave 1 #2 deliverable)
  task validate    --capsule <file> の TaskCapsule を schema 準拠 + value invariant で検証 (= Wave 5 #22)
  task close       --capsule <file> の TaskCapsule を close 可能か articulate (= Wave 5 #22)
  stats files      effectiveCodeLines を bucket / range / layer / percentile で query (= reposteward-ai-ops-platform Wave 1 #6 deliverable)
  where-am-i       branch / activeProject / repoHealth / openObligations / 推奨 next command を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #10 deliverable)
  context          active project の requiredReads / constraints / nextActions を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #11 deliverable)
  changed          --base..--head の changed file を area / obligations / requiredReads で articulate (= reposteward-ai-ops-platform Wave 3 #12 deliverable)
  rule locate      ruleId から rule の definition / guards / docs / thresholds を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #13 deliverable)
                   note: 'aag rule locate --repo PATH <ruleId>' のように flag を ruleId の前に articulate
  detector refs    detectorId から goImplementation / tsImplementation / schema / fixtures を JSON で出力 (= reposteward-ai-ops-platform Wave 3 #14 deliverable)
                   note: 'aag detector refs --repo PATH <detectorId>' のように flag を detectorId の前に articulate
  clean check      generated 混入 / archive manifest 不在 / projectId 重複 等の cleanliness 違反を JSON で出力 (= reposteward-ai-ops-platform Wave 4 #15 deliverable)
  comments list    --kind todo|suppression|expired のコメントを repo 全体から scan して JSON で出力 (= reposteward-ai-ops-platform Wave 4 #16 deliverable)
  docs placement-check  schema / generated artifact の配置規約違反を JSON で出力 (= reposteward-ai-ops-platform Wave 4 #17 deliverable)
  obligation check  premise contract triggers を git diff で検出し requirements を JSON で出力 (= reposteward-ai-ops-platform Wave 5 #20 deliverable)
  repair-context   --from <file> の検出結果から repairReads / suggestedActions / requiredChecks を JSON で出力 (= reposteward-ai-ops-platform Wave 5 #21 deliverable)
  project stale    active project の最終 commit から stale (= 30 日以上 commit なし) 状態を JSON で articulate (= reposteward-ai-ops-platform Wave 5 #23 deliverable)
  next             AI session の next action recommendation を JSON で articulate (= reposteward-ai-ops-platform Wave 5 #23 deliverable)
  wrap             stdin の JSON を pipeline envelope (= aag-pipeline-envelope-v1) で wrap (= improvement A、'aag <cmd> | aag wrap --command <name>')
  describe         指定 command の metadata (= maturity / args / output schema) を JSON で articulate (= improvement E)
  list             全 command 一覧 + maturity を JSON で articulate (= improvement E)
  introspect command  command の implementation pointer (= dispatcher / handler / package / schema / tests) を JSON で articulate (= v4.2 seed)
                   note: 'aag introspect command <name>' のように subcommand + command 名を articulate
  introspect schema   schema id の path + virtual flag + producers + consumers を JSON で articulate (= v4.2 introspect-provenance)
                   note: 'aag introspect schema <schema-id>' (= 例: detector-result-v1 / aag-pipeline-envelope-v1)
  self-check       AAG 自身の整合性 (= cross-table sync + file 実在 + orphan schema) を 5 軸で機械検証 (= v4.2 introspect-provenance)
                   note: exit code は常に 0 (= advisory)、violation は output 'violations[]' で articulate
  chaos            command の既知 failure modes を adversarial 視点で articulate (= v4.2 chaos)
                   note: 引数なしで overview / 引数ありで per-command articulate

FLAGS (validate / fixtures / shadow):
  --repo PATH       検証対象 repo root の path (= default: 現在 directory)
  --format FORMAT   出力形式 (= 'json' のみ対応、default: 'json')

FLAGS (task prepare):
  --repo PATH       repo root の path (= default: 現在 directory)
  --project ID      active project id (= projects/active/<id>/、required)
  --intent TEXT     task の意図 (= optional、free-form 1 文)
  --task ID         task id (= optional、kebab-case、default: --intent slug or <project>-task)

FLAGS (stats files):
  --repo PATH       repo root の path (= default: 現在 directory)
  --metric NAME     size metric (= currently only 'effectiveCodeLines'、default)
  --range N..M      effectiveCodeLines を inclusive range で filter (= e.g., '21..30')
  --bucket ID       aag-parameters bucket id で filter (= e.g., 'loc.021_030')
  --layer NAME      layer 完全一致 filter (= e.g., 'presentation' / 'features/budget')
  --above PNN       percentile 超過 filter (= 'p50' / 'p75' / 'p90' / 'p95' / 'p99')
  --limit N         上位 N 件に cap (= 0 = unlimited、default)

  --help            本 help を表示

EXIT CODE:
  0    pass (= violation 0 件 / parity all match)
  1    fail (= violation ≥ 1 件 / parity mismatch)
  2    error (= 引数 / config 不正、内部 error)

STATUS:
  Go MVP family (= validate / fixtures / shadow) は aag-engine-go-mvp で landing。
  validate subcommand は skeleton のまま (= empty DetectorResult[]、real repo dispatch は後続 program 候補)。
  shadow は 5 detector × 8 fixture parity を集約 (= primary success metric)。
  Wave 1〜5 全 23 step は reposteward-ai-ops-platform で landing 済 (= consolidated branch 上)。
  各 command の maturity (= stable / provisional) は plan.md / decision-audit.md DA-β-001 を参照。
`
