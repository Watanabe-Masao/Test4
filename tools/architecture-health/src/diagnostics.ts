/**
 * Diagnostics — raw KPI から健康診断書の素材を生成する
 *
 * 責務:
 *   1. 複合指標（6本の健康指標）への集約
 *   2. 前回比 trend の検出
 *   3. 危険箇所ランキング
 *   4. 推奨アクション生成
 */
import type { HealthReport, HealthKpi, KpiStatus } from "./types.js";

// ---------------------------------------------------------------------------
// 1. 総合判定
// ---------------------------------------------------------------------------

export type OverallVerdict = "Healthy" | "Watch" | "Risk";
export type TrendDirection = "Improved" | "Flat" | "Regressed";

export interface OverallAssessment {
  readonly verdict: OverallVerdict;
  readonly trend: TrendDirection;
  readonly affectsRelease: boolean;
  readonly timestamp: string;
}

export function assessOverall(
  report: HealthReport,
  previous?: HealthReport,
): OverallAssessment {
  const { fail, warn } = report.summary;

  let verdict: OverallVerdict;
  if (fail > 0) verdict = "Risk";
  else if (warn >= 3) verdict = "Risk";
  else if (warn > 0) verdict = "Watch";
  else verdict = "Healthy";

  const trend = detectOverallTrend(report, previous);
  const affectsRelease = fail > 0;

  return { verdict, trend, affectsRelease, timestamp: report.timestamp };
}

function detectOverallTrend(
  current: HealthReport,
  previous?: HealthReport,
): TrendDirection {
  if (!previous) return "Flat";

  let improved = 0;
  let regressed = 0;
  const prevMap = new Map(previous.kpis.map((k) => [k.id, k]));

  for (const kpi of current.kpis) {
    const prev = prevMap.get(kpi.id);
    if (!prev) continue;
    if (statusRank(kpi.status) < statusRank(prev.status)) improved++;
    if (statusRank(kpi.status) > statusRank(prev.status)) regressed++;
  }

  if (regressed > improved) return "Regressed";
  if (improved > regressed) return "Improved";
  return "Flat";
}

function statusRank(s: KpiStatus): number {
  switch (s) {
    case "ok":
      return 0;
    case "warn":
      return 1;
    case "fail":
      return 2;
  }
}

// ---------------------------------------------------------------------------
// 2. 複合指標（6本の健康指標）
// ---------------------------------------------------------------------------

export interface CompositeIndicator {
  readonly name: string;
  readonly items: readonly IndicatorItem[];
  readonly worstStatus: KpiStatus;
}

export interface IndicatorItem {
  readonly label: string;
  readonly value: number;
  readonly budget?: number;
  readonly unit: string;
  readonly status: KpiStatus;
  readonly delta?: number;
}

const INDICATOR_GROUPS: readonly { name: string; ids: readonly string[] }[] = [
  {
    name: "例外圧",
    ids: [
      "allowlist.total",
      "allowlist.frozen.nonZero",
      "allowlist.active.count",
    ],
  },
  {
    name: "後方互換負債",
    ids: ["compat.bridge.count", "compat.reexport.count"],
  },
  {
    name: "複雑性圧",
    ids: [
      "complexity.nearLimit.count",
      "complexity.hotspot.count",
      "complexity.vm.count",
    ],
  },
  {
    name: "境界健全性",
    ids: ["boundary.presentationToInfra", "boundary.infraToApplication"],
  },
  {
    name: "ガード強度",
    ids: ["guard.files.count", "guard.reviewOnlyTags.count"],
  },
  {
    name: "性能",
    ids: [
      "perf.bundle.totalJsKb",
      "perf.bundle.mainJsKb",
      "perf.bundle.vendorEchartsKb",
    ],
  },
  {
    name: "Temporal Governance",
    ids: [
      "temporal.rules.reviewOverdue.count",
      "temporal.rules.heuristicGate.count",
      "temporal.allowlist.activeDebt.count",
      "temporal.rules.reviewPolicy.count",
      "temporal.rules.sunsetCondition.count",
      "temporal.allowlist.activeDebt.withCreatedAt",
    ],
  },
  {
    name: "Rule Efficacy",
    ids: [
      "efficacy.rules.withProtectedHarm.count",
      "efficacy.rules.highNoise.count",
      "efficacy.allowlist.renewalTotal",
    ],
  },
] as const;

export function buildCompositeIndicators(
  report: HealthReport,
  previous?: HealthReport,
): CompositeIndicator[] {
  const kpiMap = new Map(report.kpis.map((k) => [k.id, k]));
  const prevMap = previous
    ? new Map(previous.kpis.map((k) => [k.id, k]))
    : new Map<string, HealthKpi>();

  return INDICATOR_GROUPS.map(({ name, ids }) => {
    const items: IndicatorItem[] = [];
    let worst: KpiStatus = "ok";

    for (const id of ids) {
      const kpi = kpiMap.get(id);
      if (!kpi) continue;

      const prev = prevMap.get(id);
      const delta = prev ? kpi.value - prev.value : undefined;

      items.push({
        label: kpi.label,
        value: kpi.value,
        budget: kpi.budget,
        unit: kpi.unit,
        status: kpi.status,
        delta,
      });

      if (statusRank(kpi.status) > statusRank(worst)) worst = kpi.status;
    }

    return { name, items, worstStatus: worst };
  });
}

// ---------------------------------------------------------------------------
// 3. 危険箇所トップ3
// ---------------------------------------------------------------------------

export interface RiskItem {
  readonly kpiId: string;
  readonly label: string;
  readonly reason: string;
  readonly file: string;
  readonly definition: string;
}

export function detectTopRisks(report: HealthReport, maxItems = 3): RiskItem[] {
  // fail > warn > budget超過率でソート
  const scored = report.kpis
    .filter((k) => k.status !== "ok")
    .map((k) => {
      const overBudgetPct =
        k.budget && k.budget > 0 ? ((k.value - k.budget) / k.budget) * 100 : 0;
      const score = statusRank(k.status) * 1000 + overBudgetPct;
      return { kpi: k, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxItems).map(({ kpi }) => {
    const reason =
      kpi.budget !== undefined
        ? `${kpi.value} / budget ${kpi.budget}（${Math.round(((kpi.value - kpi.budget) / Math.max(kpi.budget, 1)) * 100)}% 超過）`
        : `${kpi.value}（${kpi.status}）`;

    const implFile = kpi.implRefs[0] ?? "—";
    const defDoc = kpi.docRefs.find(
      (d) => d.kind === "definition" || d.kind === "roadmap",
    );
    const definition = defDoc
      ? defDoc.path + (defDoc.section ? ` #${defDoc.section}` : "")
      : "—";

    return {
      kpiId: kpi.id,
      label: kpi.label,
      reason,
      file: implFile,
      definition,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. 推奨アクション
// ---------------------------------------------------------------------------

export interface RecommendedAction {
  readonly priority: number;
  readonly action: string;
  readonly kpiId: string;
}

export function generateRecommendations(
  report: HealthReport,
  previous?: HealthReport,
  maxItems = 3,
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const kpiMap = new Map(report.kpis.map((k) => [k.id, k]));
  const prevMap = previous
    ? new Map(previous.kpis.map((k) => [k.id, k]))
    : new Map<string, HealthKpi>();

  // fail は最優先
  for (const kpi of report.kpis) {
    if (kpi.status === "fail") {
      actions.push({
        priority: 0,
        action: `${kpi.label} を budget ${kpi.budget} 以下に修正する`,
        kpiId: kpi.id,
      });
    }
  }

  // warn で budget 超過が大きいもの
  for (const kpi of report.kpis) {
    if (kpi.status === "warn" && kpi.budget !== undefined) {
      const gap = kpi.value - kpi.budget;
      actions.push({
        priority: 10 + gap,
        action: `${kpi.label} を ${kpi.value} → ${kpi.budget} に削減する（残 ${gap}）`,
        kpiId: kpi.id,
      });
    }
  }

  // 悪化傾向のもの
  for (const kpi of report.kpis) {
    const prev = prevMap.get(kpi.id);
    if (!prev) continue;
    if (kpi.value > prev.value && kpi.status !== "ok") {
      actions.push({
        priority: 20,
        action: `${kpi.label} が悪化（${prev.value} → ${kpi.value}）— 原因を調査する`,
        kpiId: kpi.id,
      });
    }
  }

  // near-limit は予防的推奨
  const nearLimit = kpiMap.get("complexity.nearLimit.count");
  if (nearLimit && nearLimit.value > 0) {
    actions.push({
      priority: 30,
      action: `上限間近ファイル ${nearLimit.value} 件を分割検討する`,
      kpiId: nearLimit.id,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, maxItems);
}

// ---------------------------------------------------------------------------
// 5. 直近の変化
// ---------------------------------------------------------------------------

export interface ChangeItem {
  readonly label: string;
  readonly previous: number;
  readonly current: number;
  readonly delta: number;
  readonly unit: string;
  readonly direction: "better" | "same" | "worse";
}

/** 「better」の方向は KPI によって異なる（guard は多い方が良い等） */
const HIGHER_IS_BETTER = new Set(["guard.files.count"]);

export function detectRecentChanges(
  report: HealthReport,
  previous?: HealthReport,
): ChangeItem[] {
  if (!previous) return [];

  const prevMap = new Map(previous.kpis.map((k) => [k.id, k]));
  const changes: ChangeItem[] = [];

  for (const kpi of report.kpis) {
    const prev = prevMap.get(kpi.id);
    if (!prev) continue;

    const delta = kpi.value - prev.value;
    if (delta === 0) continue;

    const higherIsBetter = HIGHER_IS_BETTER.has(kpi.id);
    let direction: "better" | "same" | "worse";
    if (delta > 0) direction = higherIsBetter ? "better" : "worse";
    else direction = higherIsBetter ? "worse" : "better";

    changes.push({
      label: kpi.label,
      previous: prev.value,
      current: kpi.value,
      delta,
      unit: kpi.unit,
      direction,
    });
  }

  return changes.sort((a, b) => {
    // worse first
    if (a.direction === "worse" && b.direction !== "worse") return -1;
    if (a.direction !== "worse" && b.direction === "worse") return 1;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });
}
