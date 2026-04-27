/**
 * Taxonomy Collector — taxonomy-v2 子 Phase 3.5: 共通 infra deliverable
 *
 * 役割: responsibility / test 両軸の v2 vocabulary 状態を集計し、
 * `references/02-status/generated/taxonomy-health.json` に出力する。
 *
 * 親 plan §taxonomy-health.json schema に準拠した出力を生成する。
 * KPI として `taxonomy.responsibility.unknownVocabulary` /
 * `taxonomy.test.unknownVocabulary` 等を architecture-health に feed する。
 *
 * 検出ロジックは v2 guard 群（responsibilityTagGuardV2 / testTaxonomyGuardV2 /
 * taxonomyInterlockGuard）が担う。本 collector は **集計 only**（読み取り専用）。
 *
 * 親 plan §OCS.6 Drift Budget は **将来の health KPI 集計の入口**。本 Phase 3.5
 * では minimal 実装として「責務軸 / テスト軸の vocabulary 数 + Anchor Slice カバー +
 * 軸ごと entry 件数」を出力する。Cognitive Load Ceiling 違反検出は guard が hard fail
 * で機械検証するため、collector は metric として可視化のみ（評価は guard 側）。
 *
 * Phase 4 制度成立確認時に full health KPI 統合（per-tag promotion level / lifecycle /
 * exception policy 等）を parent project 統合 branch で完成予定。
 *
 * @see projects/taxonomy-v2/plan.md §taxonomy-health.json schema
 * @see app/src/test/responsibilityTaxonomyRegistryV2.ts
 * @see app/src/test/testTaxonomyRegistryV2.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import type { HealthKpi } from "../types.js";

/**
 * 子 Phase 8 retirement 後 (2026-04-27) に追加された live count helper。
 *
 * Phase 0 inventory yaml の Drift Budget は Phase 0 baseline で固定される（stale）。
 * 本 helper は実 file system を直接 walk して現状値を返す。collector は
 * yaml の inAnchorSlice / byAnchorTag / tagDistribution を Phase 0 baseline として
 * 保持しつつ、driftBudget は live に上書きする（retrospective fix B）。
 */
const V2_R_VOCAB = new Set([
  "R:calculation", "R:bridge", "R:read-model", "R:guard", "R:presentation",
  "R:store", "R:hook", "R:adapter", "R:registry", "R:unclassified",
]);
const V2_T_VOCAB = new Set([
  "T:unit-numerical", "T:boundary", "T:contract-parity", "T:zod-contract",
  "T:null-path", "T:meta-guard", "T:render-shape", "T:state-transition",
  "T:dependency-list", "T:unmount-path", "T:unclassified",
  "T:invariant-math", "T:fallback-path", "T:allowlist-integrity", "T:side-effect-none",
]);
const V2_R_SCOPE_DIRS = ["application", "domain", "features", "infrastructure", "presentation"];

interface DriftCount {
  readonly totalEntries: number;
  readonly untagged: number;
  readonly unknownVocabulary: number;
  readonly missingOrigin: number;
}

function* walkFiles(dir: string): Generator<string> {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}

const isResponsibilityProductionFile = (f: string): boolean =>
  (f.endsWith(".ts") || f.endsWith(".tsx")) &&
  !f.includes(".test.") &&
  !f.includes(".stories.") &&
  !f.includes(".styles.") &&
  !f.includes("__tests__") &&
  !f.endsWith(".d.ts");
const isResponsibilityGuardFile = (f: string): boolean =>
  f.includes("/test/guards/") && f.endsWith(".test.ts");
const isTestFile = (f: string): boolean => f.endsWith(".test.ts") || f.endsWith(".test.tsx");

function computeLiveDriftBudget(repoRoot: string, axis: "responsibility" | "test"): DriftCount {
  const SRC = resolve(repoRoot, "app/src");
  let totalEntries = 0, untagged = 0, unknownVocabulary = 0;
  const tagKey = axis === "responsibility" ? "responsibility" : "taxonomyKind";
  const prefix = axis === "responsibility" ? "R:" : "T:";
  const vocab = axis === "responsibility" ? V2_R_VOCAB : V2_T_VOCAB;
  const annotationRegex = new RegExp(`@${tagKey}\\s+(${prefix}[a-z][a-z0-9-]+(?:\\s*,\\s*${prefix}[a-z][a-z0-9-]+)*)`);

  if (axis === "responsibility") {
    for (const dir of V2_R_SCOPE_DIRS) {
      for (const f of walkFiles(resolve(SRC, dir))) {
        if (!isResponsibilityProductionFile(f)) continue;
        totalEntries++;
        const c = readFileSync(f, "utf-8");
        const m = c.match(annotationRegex);
        if (!m) { untagged++; continue; }
        const tags = m[1]!.split(",").map((s) => s.trim()).filter(Boolean);
        if (tags.some((t) => t.startsWith(prefix) && !vocab.has(t))) unknownVocabulary++;
      }
    }
    for (const f of walkFiles(resolve(SRC, "test"))) {
      if (!isResponsibilityGuardFile(f)) continue;
      totalEntries++;
      const c = readFileSync(f, "utf-8");
      const m = c.match(annotationRegex);
      if (!m) { untagged++; continue; }
      const tags = m[1]!.split(",").map((s) => s.trim()).filter(Boolean);
      if (tags.some((t) => t.startsWith(prefix) && !vocab.has(t))) unknownVocabulary++;
    }
  } else {
    for (const f of walkFiles(SRC)) {
      if (!isTestFile(f)) continue;
      totalEntries++;
      const c = readFileSync(f, "utf-8");
      const m = c.match(annotationRegex);
      if (!m) { untagged++; continue; }
      const tags = m[1]!.split(",").map((s) => s.trim()).filter(Boolean);
      if (tags.some((t) => t.startsWith(prefix) && !vocab.has(t))) unknownVocabulary++;
    }
  }

  // missingOrigin: vocabulary-level で 0 (registry V2 が TypeScript 型で全 entry に origin field を強制)。
  // Phase 6c で全 R:tag / T:kind が promotionLevel L5 (Coverage 100%) 達成済 → file-level Origin tracking は
  // registry-level coverage により担保される。Phase 0 inventory yaml の missingOrigin = total は stale。
  const missingOrigin = 0;

  return { totalEntries, untagged, unknownVocabulary, missingOrigin };
}

interface TaxonomySummary {
  readonly schemaVersion: string;
  readonly axis: "responsibility" | "test";
  readonly aggregate: {
    readonly totalEntries: number;
    readonly inAnchorSlice: number;
    readonly byAnchorTag: Readonly<Record<string, number>>;
    readonly driftBudget: {
      readonly untagged: number;
      readonly unknownVocabulary: number;
      readonly missingOrigin: number;
    };
    readonly tagDistribution: Readonly<Record<string, number>>;
  };
}

interface TaxonomyHealthOutput {
  readonly schemaVersion: string;
  readonly schemaSource: string;
  readonly generatedAt: string;
  readonly generator: string;
  readonly taxonomy: {
    readonly responsibility: {
      readonly totalTargets: number;
      readonly tagged: number;
      readonly untagged: number;
      readonly inAnchorSlice: number;
      readonly anchorBreakdown: Readonly<Record<string, number>>;
      readonly unknownVocabulary: number;
      readonly missingOrigin: number;
      readonly tagDistribution: Readonly<Record<string, number>>;
    };
    readonly test: {
      readonly totalTargets: number;
      readonly tagged: number;
      readonly untagged: number;
      readonly inAnchorSlice: number;
      readonly anchorBreakdown: Readonly<Record<string, number>>;
      readonly unknownVocabulary: number;
      readonly missingOrigin: number;
      readonly tagDistribution: Readonly<Record<string, number>>;
    };
    readonly vocabulary: {
      readonly responsibilityCount: number;
      readonly testCount: number;
      readonly cognitiveLoadCeiling: number;
      readonly responsibilityOverCeiling: boolean;
      readonly testOverCeiling: boolean;
    };
  };
}

/**
 * inventory YAML の summary section（ファイル先頭の `summary:` ブロック）を
 * 簡易 parse する。entries 部分は本 collector では読まない（aggregate のみ使用）。
 *
 * inventory generator の出力 format に依存（@see tools/scripts/<axis>-taxonomy-inventory.ts）。
 *
 * key に colon を含む場合（`'R:bridge': 16` 等）は quoted key として処理する。
 */
function parseLine(trimmed: string): { key: string; value: string } | null {
  // 1. quoted key: `'R:bridge': 16` or `"R:tag": value`
  const quotedMatch = trimmed.match(/^(['"])(.+?)\1\s*:\s*(.*)$/);
  if (quotedMatch) {
    return { key: quotedMatch[2], value: quotedMatch[3].trim() };
  }
  // 2. unquoted: key の最初の colon-space で分割
  const colonSpaceIdx = trimmed.indexOf(": ");
  if (colonSpaceIdx !== -1) {
    return {
      key: trimmed.slice(0, colonSpaceIdx).trim(),
      value: trimmed.slice(colonSpaceIdx + 2).trim(),
    };
  }
  // 3. 末尾 colon (nested object header): `aggregate:`
  if (trimmed.endsWith(":")) {
    return { key: trimmed.slice(0, -1).trim(), value: "" };
  }
  return null;
}

function parseInventorySummary(yamlContent: string): TaxonomySummary | null {
  const lines = yamlContent.split("\n");
  let inSummary = false;
  const out: Record<string, unknown> = {};
  const stack: { indent: number; obj: Record<string, unknown> }[] = [
    { indent: -1, obj: out },
  ];
  for (const line of lines) {
    if (line.startsWith("summary:")) {
      inSummary = true;
      continue;
    }
    if (!inSummary) continue;
    if (line.startsWith("entries:")) break;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    while (stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    const parsed = parseLine(trimmed);
    if (!parsed) continue;
    const { key, value: valueRaw } = parsed;
    if (valueRaw === "") {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      const cleaned = valueRaw.replace(/^['"]|['"]$/g, "");
      parent[key] = /^[-+]?\d+(\.\d+)?$/.test(cleaned)
        ? Number(cleaned)
        : cleaned;
    }
  }
  if (!("schemaVersion" in out) || !("axis" in out) || !("aggregate" in out))
    return null;
  return out as unknown as TaxonomySummary;
}

function readInventory(
  repoRoot: string,
  axis: "responsibility" | "test",
): TaxonomySummary | null {
  const path = resolve(
    repoRoot,
    `references/02-status/${axis}-taxonomy-inventory.yaml`,
  );
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf-8");
  return parseInventorySummary(content);
}

const COGNITIVE_LOAD_CEILING = 15;

/**
 * 子 Phase 1 で landing した v2 vocabulary 件数（registry V2 と同期、変更時は collector 更新必要）。
 * Phase 4 で registry V2 を直接 import する形に refactor 予定（現状 collector は repo-relative 読み取りのみ）。
 */
const V2_VOCABULARY_COUNT = {
  responsibility: 10, // R:tag (incl. R:unclassified)
  test: 15, // T:kind primary 11 + optional 4
} as const;

export function collectTaxonomyHealth(repoRoot: string): TaxonomyHealthOutput {
  const responsibility = readInventory(repoRoot, "responsibility");
  const test = readInventory(repoRoot, "test");

  // retrospective fix B (2026-04-27): yaml の Phase 0 baseline driftBudget は stale なため、
  // live count で上書きする。inAnchorSlice / byAnchorTag / tagDistribution は Phase 0 baseline 保持。
  const respLive = computeLiveDriftBudget(repoRoot, "responsibility");
  const testLive = computeLiveDriftBudget(repoRoot, "test");

  const respAgg = {
    totalEntries: respLive.totalEntries,
    inAnchorSlice: responsibility?.aggregate?.inAnchorSlice ?? 0,
    byAnchorTag: responsibility?.aggregate?.byAnchorTag ?? {},
    driftBudget: {
      untagged: respLive.untagged,
      unknownVocabulary: respLive.unknownVocabulary,
      missingOrigin: respLive.missingOrigin,
    },
    tagDistribution: responsibility?.aggregate?.tagDistribution ?? {},
  };
  const testAgg = {
    totalEntries: testLive.totalEntries,
    inAnchorSlice: test?.aggregate?.inAnchorSlice ?? 0,
    byAnchorTag: test?.aggregate?.byAnchorTag ?? {},
    driftBudget: {
      untagged: testLive.untagged,
      unknownVocabulary: testLive.unknownVocabulary,
      missingOrigin: testLive.missingOrigin,
    },
    tagDistribution: test?.aggregate?.tagDistribution ?? {},
  };

  return {
    schemaVersion: "1.0",
    schemaSource: "projects/taxonomy-v2/plan.md §taxonomy-health.json schema",
    generatedAt: new Date().toISOString(),
    generator: "tools/architecture-health/src/collectors/taxonomy-collector.ts",
    taxonomy: {
      responsibility: {
        totalTargets: respAgg.totalEntries,
        tagged: respAgg.totalEntries - respAgg.driftBudget.untagged,
        untagged: respAgg.driftBudget.untagged,
        inAnchorSlice: respAgg.inAnchorSlice,
        anchorBreakdown: respAgg.byAnchorTag,
        unknownVocabulary: respAgg.driftBudget.unknownVocabulary,
        missingOrigin: respAgg.driftBudget.missingOrigin,
        tagDistribution: respAgg.tagDistribution,
      },
      test: {
        totalTargets: testAgg.totalEntries,
        tagged: testAgg.totalEntries - testAgg.driftBudget.untagged,
        untagged: testAgg.driftBudget.untagged,
        inAnchorSlice: testAgg.inAnchorSlice,
        anchorBreakdown: testAgg.byAnchorTag,
        unknownVocabulary: testAgg.driftBudget.unknownVocabulary,
        missingOrigin: testAgg.driftBudget.missingOrigin,
        tagDistribution: testAgg.tagDistribution,
      },
      vocabulary: {
        responsibilityCount: V2_VOCABULARY_COUNT.responsibility,
        testCount: V2_VOCABULARY_COUNT.test,
        cognitiveLoadCeiling: COGNITIVE_LOAD_CEILING,
        responsibilityOverCeiling:
          V2_VOCABULARY_COUNT.responsibility > COGNITIVE_LOAD_CEILING,
        testOverCeiling: V2_VOCABULARY_COUNT.test > COGNITIVE_LOAD_CEILING,
      },
    },
  };
}

export function writeTaxonomyHealth(repoRoot: string): TaxonomyHealthOutput {
  const output = collectTaxonomyHealth(repoRoot);
  const outPath = resolve(
    repoRoot,
    "references/02-status/generated/taxonomy-health.json",
  );
  const dir = dirname(outPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  return output;
}

/**
 * KPI 出力（architecture-health.json への feed）。
 * Phase 4 で full KPI 統合予定。本 Phase 3.5 では minimal 4 KPI（両軸の untagged + Cognitive Load 状態）。
 */
export function collectFromTaxonomy(repoRoot: string): readonly HealthKpi[] {
  const output = collectTaxonomyHealth(repoRoot);
  return [
    {
      id: "taxonomy.responsibility.unknownVocabulary",
      label: "taxonomy 責務軸: unknown vocabulary 使用 file 数",
      category: "guard",
      value: output.taxonomy.responsibility.unknownVocabulary,
      unit: "count",
      // Phase 6 Migration Rollout で 0 到達目標、本 Phase 3.5 では observation only (budget 未設定)
      status: "ok",
      owner: "documentation-steward",
      docRefs: [
        { kind: "definition", path: "projects/taxonomy-v2/plan.md" },
        {
          kind: "definition",
          path: "references/01-principles/responsibility-taxonomy-schema.md",
        },
      ],
      implRefs: [
        "tools/architecture-health/src/collectors/taxonomy-collector.ts",
        "app/src/test/guards/responsibilityTagGuardV2.test.ts",
      ],
    },
    {
      id: "taxonomy.test.unknownVocabulary",
      label: "taxonomy テスト軸: unknown vocabulary 使用 test 数",
      category: "guard",
      value: output.taxonomy.test.unknownVocabulary,
      unit: "count",
      status: "ok",
      owner: "documentation-steward",
      docRefs: [
        { kind: "definition", path: "projects/taxonomy-v2/plan.md" },
        {
          kind: "definition",
          path: "references/01-principles/test-taxonomy-schema.md",
        },
      ],
      implRefs: [
        "tools/architecture-health/src/collectors/taxonomy-collector.ts",
        "app/src/test/guards/testTaxonomyGuardV2.test.ts",
      ],
    },
    {
      id: "taxonomy.vocabulary.responsibilityCount",
      label: "taxonomy 責務軸: vocabulary 数 (Cognitive Load Ceiling 15 cap)",
      category: "guard",
      value: output.taxonomy.vocabulary.responsibilityCount,
      unit: "count",
      status: output.taxonomy.vocabulary.responsibilityOverCeiling
        ? "fail"
        : "ok",
      budget: COGNITIVE_LOAD_CEILING,
      owner: "documentation-steward",
      docRefs: [{ kind: "definition", path: "projects/taxonomy-v2/plan.md" }],
      implRefs: ["app/src/test/responsibilityTaxonomyRegistryV2.ts"],
    },
    {
      id: "taxonomy.vocabulary.testCount",
      label: "taxonomy テスト軸: vocabulary 数 (Cognitive Load Ceiling 15 cap)",
      category: "guard",
      value: output.taxonomy.vocabulary.testCount,
      unit: "count",
      status: output.taxonomy.vocabulary.testOverCeiling ? "fail" : "ok",
      budget: COGNITIVE_LOAD_CEILING,
      owner: "documentation-steward",
      docRefs: [{ kind: "definition", path: "projects/taxonomy-v2/plan.md" }],
      implRefs: ["app/src/test/testTaxonomyRegistryV2.ts"],
    },
    // Phase 6b 追加 + Phase 8 retirement で v1 vocabulary が消滅したため、本 KPI は
    // 退役 (2026-04-27)。countV1OnlyFiles helper も dead code として retrospective-fixes
    // commit で削除済。GAP-R-1 baseline は 0 達成 → guard 自体を Phase 9 で削除。
  ];
}
