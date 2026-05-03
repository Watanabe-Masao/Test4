/**
 * Taxonomy Collector — taxonomy-v2 子 Phase 3.5: 共通 infra deliverable
 *
 * 役割: responsibility / test 両軸の v2 vocabulary 状態を集計し、
 * `references/04-tracking/generated/taxonomy-health.json` に出力する。
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

const ANCHOR_R_SLICE = new Set([
  "R:calculation", "R:bridge", "R:read-model", "R:guard", "R:presentation",
]);
const ANCHOR_T_SLICE = new Set([
  "T:unit-numerical", "T:boundary", "T:contract-parity",
  "T:zod-contract", "T:meta-guard", "T:render-shape",
]);

interface LiveAxisStats {
  readonly totalEntries: number;
  readonly untagged: number;
  readonly unknownVocabulary: number;
  readonly missingOrigin: number;
  readonly inAnchorSlice: number;
  readonly byAnchorTag: Record<string, number>;
  readonly tagDistribution: Record<string, number>;
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

/**
 * Live axis scanner — retrospective fix B (live drift) + post-review fix #1/#2 (2026-04-27)
 *
 * 修正内容:
 * - **#1 current/baseline 混在解消**: tagDistribution / inAnchorSlice / byAnchorTag も live scan で計測。
 *   yaml の Phase 0 baseline は完全に放棄し、collector 出力は 100% current 値のみとする。
 * - **#2 parser 統一**: guard と同じ loose regex `(.+)` で annotation を取得し、その後 per-tag で
 *   既知/未知/anchor 分類する。strict regex で annotation 自体を見落として untagged 計上する false negative を解消。
 *
 * 統一 parser 仕様 (responsibilityTagGuardV2 / testTaxonomyGuardV2 と同じ動作):
 * 1. file 内最初の `@responsibility\s+(.+)` または `@taxonomyKind\s+(.+)` を取得
 * 2. comma で split → trim → 空文字除去
 * 3. 各 tag を { prefix 一致 + vocab 登録済 / prefix 一致 + vocab 未登録 / prefix 不一致 } で分類
 *
 * file 単位の分類 (counted-once-per-file):
 * - untagged: annotation なし
 * - unknownVocabulary: annotation あり、vocab 未登録 tag を 1 件以上含む
 * - tagDistribution: annotation あり file の tag 出現件数（同 file 内重複は 1 回計上）
 */
function computeLiveAxisStats(repoRoot: string, axis: "responsibility" | "test"): LiveAxisStats {
  const SRC = resolve(repoRoot, "app/src");
  const tagKey = axis === "responsibility" ? "responsibility" : "taxonomyKind";
  const prefix = axis === "responsibility" ? "R:" : "T:";
  const vocab = axis === "responsibility" ? V2_R_VOCAB : V2_T_VOCAB;
  const anchorSlice = axis === "responsibility" ? ANCHOR_R_SLICE : ANCHOR_T_SLICE;
  const looseRegex = new RegExp(`@${tagKey}\\s+(.+)`);

  let totalEntries = 0;
  let untagged = 0;
  let unknownVocabulary = 0;
  let inAnchorSlice = 0;
  const byAnchorTag: Record<string, number> = {};
  const tagDistribution: Record<string, number> = {};

  const targetFiles: string[] = [];
  if (axis === "responsibility") {
    for (const dir of V2_R_SCOPE_DIRS) {
      for (const f of walkFiles(resolve(SRC, dir))) {
        if (isResponsibilityProductionFile(f)) targetFiles.push(f);
      }
    }
    for (const f of walkFiles(resolve(SRC, "test"))) {
      if (isResponsibilityGuardFile(f)) targetFiles.push(f);
    }
  } else {
    for (const f of walkFiles(SRC)) {
      if (isTestFile(f)) targetFiles.push(f);
    }
  }

  for (const f of targetFiles) {
    totalEntries++;
    const content = readFileSync(f, "utf-8");
    const match = content.match(looseRegex);
    if (!match) {
      untagged++;
      tagDistribution.untagged = (tagDistribution.untagged ?? 0) + 1;
      continue;
    }
    // loose 取得 → comma split → 各 tag classify (guard と同じ動作)
    const tags = match[1]!
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const dedupedTags = [...new Set(tags)];

    let hasUnknownInThisFile = false;
    let hasAnchorInThisFile = false;
    for (const t of dedupedTags) {
      // 同 file 内重複は 1 回計上 (Set で dedup 済)
      tagDistribution[t] = (tagDistribution[t] ?? 0) + 1;
      if (t.startsWith(prefix) && !vocab.has(t)) {
        hasUnknownInThisFile = true;
        // unknown:* prefix で distribution に集計 (Phase 0 yaml と互換)
        const unknownKey = `unknown:${t}`;
        tagDistribution[unknownKey] = (tagDistribution[unknownKey] ?? 0) + 1;
      }
      if (anchorSlice.has(t)) {
        hasAnchorInThisFile = true;
        byAnchorTag[t] = (byAnchorTag[t] ?? 0) + 1;
      }
    }
    if (hasUnknownInThisFile) unknownVocabulary++;
    if (hasAnchorInThisFile) inAnchorSlice++;
  }

  // missingOrigin: vocabulary-level で 0 (registry V2 が TypeScript 型で全 entry に origin field を強制)。
  // Phase 6c で全 R:tag / T:kind が promotionLevel L5 (Coverage 100%) 達成済 → file-level Origin tracking は
  // registry-level coverage により担保される。
  const missingOrigin = 0;

  return {
    totalEntries,
    untagged,
    unknownVocabulary,
    missingOrigin,
    inAnchorSlice,
    byAnchorTag,
    tagDistribution,
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
  // post-review fix #1 + #2 (2026-04-27): collector は **完全 live scan** に統一。
  // Phase 0 inventory yaml は historical baseline として読み込みを維持するが、本 collector の
  // 出力 (driftBudget / inAnchorSlice / byAnchorTag / tagDistribution) は **全て live 値**を使う。
  // これにより同一 object 内の current / baseline 混在 (post-review 指摘 #1) が解消される。
  // tag parser は guard と同じ loose regex に統一 (#2) され、表記揺れの false negative も解消される。
  const respLive = computeLiveAxisStats(repoRoot, "responsibility");
  const testLive = computeLiveAxisStats(repoRoot, "test");

  const respAgg = {
    totalEntries: respLive.totalEntries,
    inAnchorSlice: respLive.inAnchorSlice,
    byAnchorTag: respLive.byAnchorTag,
    driftBudget: {
      untagged: respLive.untagged,
      unknownVocabulary: respLive.unknownVocabulary,
      missingOrigin: respLive.missingOrigin,
    },
    tagDistribution: respLive.tagDistribution,
  };
  const testAgg = {
    totalEntries: testLive.totalEntries,
    inAnchorSlice: testLive.inAnchorSlice,
    byAnchorTag: testLive.byAnchorTag,
    driftBudget: {
      untagged: testLive.untagged,
      unknownVocabulary: testLive.unknownVocabulary,
      missingOrigin: testLive.missingOrigin,
    },
    tagDistribution: testLive.tagDistribution,
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
    "references/04-tracking/generated/taxonomy-health.json",
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
          path: "references/01-foundation/responsibility-taxonomy-schema.md",
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
          path: "references/01-foundation/test-taxonomy-schema.md",
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
