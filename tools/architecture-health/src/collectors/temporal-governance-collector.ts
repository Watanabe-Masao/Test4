/**
 * Temporal Governance Collector — ルールと例外の時間軸 KPI を抽出
 *
 * reviewPolicy / sunsetCondition / allowlist createdAt から
 * temporal governance の健全性を計測する。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { HealthKpi } from "../types.js";

export function collectFromTemporalGovernance(repoRoot: string): HealthKpi[] {
  const kpis: HealthKpi[] = [];
  const now = Date.now();

  // --- Architecture Rules の temporal governance ---
  const rulesPath = resolve(repoRoot, "app/src/test/architectureRules/rules.ts");
  const rulesContent = readFileSync(rulesPath, "utf-8");

  // Project Overlay 側（reviewPolicy / lifecyclePolicy の正本）
  const overlayPath = resolve(
    repoRoot,
    "projects/pure-calculation-reorg/aag/execution-overlay.ts",
  );
  const overlayContent = readFileSync(overlayPath, "utf-8");

  // reviewPolicy 設定率（Project Overlay 側正本）
  const totalRules = (rulesContent.match(/id: 'AR-/g) || []).length;
  const withReviewPolicy = (overlayContent.match(/reviewPolicy: \{/g) || [])
    .length;
  kpis.push({
    id: "temporal.rules.reviewPolicy.count",
    label: "reviewPolicy 設定済みルール数",
    category: "guard",
    value: withReviewPolicy,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [
      {
        kind: "definition",
        path: "references/03-guides/architecture-rule-system.md",
      },
    ],
    implRefs: ["projects/pure-calculation-reorg/aag/execution-overlay.ts"],
  });

  // sunsetCondition 設定率
  const withSunset = (rulesContent.match(/sunsetCondition: '/g) || []).length;
  kpis.push({
    id: "temporal.rules.sunsetCondition.count",
    label: "sunsetCondition 設定済みルール数",
    category: "guard",
    value: withSunset,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [
      {
        kind: "definition",
        path: "references/01-principles/architecture-rule-feasibility.md",
      },
    ],
    implRefs: ["app/src/test/architectureRules/rules.ts"],
  });

  // review overdue（lastReviewedAt + cadence < today、Project Overlay 側正本）
  // quote-agnostic: overlay が Prettier により single/double quote どちらになっても動く
  const reviewMatches = [
    ...overlayContent.matchAll(
      /lastReviewedAt:\s*['"](\d{4}-\d{2}-\d{2})['"][\s\S]*?reviewCadenceDays:\s*(\d+)/g,
    ),
  ];
  let overdueCount = 0;
  for (const match of reviewMatches) {
    const lastReviewed = new Date(match[1]).getTime();
    const cadence = Number(match[2]);
    const elapsed = Math.floor((now - lastReviewed) / (1000 * 60 * 60 * 24));
    if (elapsed > cadence) overdueCount++;
  }
  kpis.push({
    id: "temporal.rules.reviewOverdue.count",
    label: "review overdue ルール数",
    category: "guard",
    value: overdueCount,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [],
    implRefs: ["projects/pure-calculation-reorg/aag/execution-overlay.ts"],
  });

  // heuristic + gate 件数
  const heuristicGateMatches = [
    ...rulesContent.matchAll(
      /ruleClass: 'heuristic'[\s\S]*?severity: '(\w+)'/g,
    ),
  ];
  const heuristicGateCount = heuristicGateMatches.filter(
    (m) => m[1] === "gate",
  ).length;
  kpis.push({
    id: "temporal.rules.heuristicGate.count",
    label: "heuristic + gate ルール数",
    category: "guard",
    value: heuristicGateCount,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [],
    implRefs: ["app/src/test/architectureRules/rules.ts"],
  });

  // --- Allowlist の temporal governance ---
  const allowlistFiles = [
    "architecture.ts",
    "complexity.ts",
    "responsibility.ts",
    "size.ts",
    "misc.ts",
  ];
  let activeDebtTotal = 0;
  let activeDebtWithCreatedAt = 0;

  for (const file of allowlistFiles) {
    const filePath = resolve(repoRoot, "app/src/test/allowlists", file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const activeDebtEntries = (
        content.match(/lifecycle: 'active-debt'/g) || []
      ).length;
      const withCreatedAt = [
        ...content.matchAll(/lifecycle: 'active-debt'[\s\S]*?createdAt:/g),
      ].length;
      activeDebtTotal += activeDebtEntries;
      activeDebtWithCreatedAt += withCreatedAt;
    } catch {
      // File not found — skip
    }
  }

  kpis.push({
    id: "temporal.allowlist.activeDebt.count",
    label: "active-debt 例外数",
    category: "allowlist",
    value: activeDebtTotal,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [],
    implRefs: allowlistFiles.map((f) => `app/src/test/allowlists/${f}`),
  });

  kpis.push({
    id: "temporal.allowlist.activeDebt.withCreatedAt",
    label: "active-debt で createdAt 設定済み",
    category: "allowlist",
    value: activeDebtWithCreatedAt,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [],
    implRefs: allowlistFiles.map((f) => `app/src/test/allowlists/${f}`),
  });

  // --- Rule Efficacy ---

  // protectedHarm 設定率
  const withProtectedHarm = (rulesContent.match(/protectedHarm: \{/g) || [])
    .length;
  kpis.push({
    id: "efficacy.rules.withProtectedHarm.count",
    label: "protectedHarm 設定済みルール数",
    category: "guard",
    value: withProtectedHarm,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [
      {
        kind: "definition",
        path: "references/01-principles/architecture-rule-feasibility.md",
      },
    ],
    implRefs: ["app/src/test/architectureRules/rules.ts"],
  });

  // allowlist 高集中ルール（1 ルールに例外 10 件以上）
  const exceptionsByRule = new Map<string, number>();
  for (const file of allowlistFiles) {
    const filePath = resolve(repoRoot, "app/src/test/allowlists", file);
    try {
      const content = readFileSync(filePath, "utf-8");
      for (const match of content.matchAll(/ruleId: '([^']+)'/g)) {
        exceptionsByRule.set(
          match[1],
          (exceptionsByRule.get(match[1]) ?? 0) + 1,
        );
      }
    } catch {
      // skip
    }
  }
  const highNoiseRules = [...exceptionsByRule.entries()].filter(
    ([, count]) => count >= 10,
  ).length;
  kpis.push({
    id: "efficacy.rules.highNoise.count",
    label: "高例外圧ルール数（≥10 件）",
    category: "guard",
    value: highNoiseRules,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [],
    implRefs: ["app/src/test/allowlists/"],
  });

  // renewalCount 合計
  let totalRenewals = 0;
  for (const file of allowlistFiles) {
    const filePath = resolve(repoRoot, "app/src/test/allowlists", file);
    try {
      const content = readFileSync(filePath, "utf-8");
      for (const match of content.matchAll(/renewalCount: (\d+)/g)) {
        totalRenewals += Number(match[1]);
      }
    } catch {
      // skip
    }
  }
  kpis.push({
    id: "efficacy.allowlist.renewalTotal",
    label: "renewalCount 合計",
    category: "allowlist",
    value: totalRenewals,
    unit: "count",
    status: "ok",
    owner: "architecture",
    docRefs: [],
    implRefs: ["app/src/test/allowlists/"],
  });

  return kpis;
}
