/**
 * Content Graph Collector — Phase A 残課題 #2 (2026-04-29)
 *
 * 役割: 89 spec の frontmatter を読み、spec 間の依存関係 (widget →
 * consumedReadModels / consumedQueryHandlers / children、chart の inputBuilder
 * 等) を抽出して content graph を構築、`content-graph.json` に出力する。
 *
 * 初版 scope (本 collector):
 * - 89 spec を nodes として列挙
 * - 各 spec の direct reference を edges として抽出
 * - orphan (in / out edge ゼロ) の count
 * - 3 KPI を architecture-health.json に feed
 *
 * **未対応** (後続 batch、Phase C で拡張):
 * - consumedReadModels の domain name (customerFact 等) → RM-XXX への mapping
 * - children component name → UIC-XXX への mapping
 * - pipeline lineage (PIPE-XXX / QH-XXX / PROJ-XXX 新サブカテゴリ追加後)
 *
 * 設計判断:
 * - parseFrontmatter は content-spec-collector と同等の subset。inline 実装
 *   (tools/ tsconfig 制約 + 重複削減 trade-off は後続で integrity primitive 経由化)
 * - graph 出力 JSON 経路: `references/02-status/generated/content-graph.json`
 *   (architecture-health.json は KPI のみ集約、content graph 詳細は別 file)
 *
 * @see projects/phased-content-specs-rollout/checklist.md Phase A #2
 * @see projects/phased-content-specs-rollout/plan.md §Phase A 実施内容 #6
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import type { HealthKpi } from "../types.js";

// ---------------------------------------------------------------------------
// Frontmatter parser (content-spec-collector と同等の subset)
// ---------------------------------------------------------------------------

type SpecKind = "widget" | "read-model" | "calculation" | "chart" | "ui-component";

interface SpecRelations {
  readonly id: string;
  readonly kind: SpecKind;
  readonly consumedReadModels: readonly string[];
  readonly consumedQueryHandlers: readonly string[];
  readonly children: readonly string[];
  readonly sourceRef: string | null;
}

function inferKindFromId(id: string): SpecKind | null {
  if (/^WID-\d{3}$/.test(id)) return "widget";
  if (/^RM-\d{3}$/.test(id)) return "read-model";
  if (/^CALC-\d{3}$/.test(id)) return "calculation";
  if (/^CHART-\d{3}$/.test(id)) return "chart";
  if (/^UIC-\d{3}$/.test(id)) return "ui-component";
  return null;
}

function parseScalar(s: string): unknown {
  if (s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "[]") return [];
  if (s === "{}") return {};
  if (/^-?\d+$/.test(s)) return Number(s);
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseFrontmatter(specPath: string): SpecRelations | null {
  const content = readFileSync(specPath, "utf-8");
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const raw: Record<string, unknown> = {};
  const lines = m[1].split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!km) {
      i++;
      continue;
    }
    const key = km[1];
    const valueRaw = km[2].trim();
    if (valueRaw === "") {
      const block: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (next.trim() === "" || next.trim().startsWith("#")) {
          j++;
          continue;
        }
        if (!next.startsWith("  ")) break;
        block.push(next);
        j++;
      }
      if (block.length > 0 && block.every((l) => l.trim().startsWith("- "))) {
        raw[key] = block.map((l) => parseScalar(l.trim().slice(2).trim()));
      } else {
        raw[key] = [];
      }
      i = j;
    } else {
      raw[key] = parseScalar(valueRaw);
      i++;
    }
  }
  const id = String(raw.id ?? "");
  const kind = inferKindFromId(id);
  if (!kind) return null;
  const arrField = (k: string): string[] =>
    Array.isArray(raw[k]) ? (raw[k] as unknown[]).map((v) => String(v)) : [];
  return {
    id,
    kind,
    consumedReadModels: arrField("consumedReadModels"),
    consumedQueryHandlers: arrField("consumedQueryHandlers"),
    children: arrField("children"),
    sourceRef: typeof raw.sourceRef === "string" ? raw.sourceRef : null,
  };
}

// ---------------------------------------------------------------------------
// Spec 列挙
// ---------------------------------------------------------------------------

const KIND_DIRS: Record<SpecKind, string> = {
  widget: "widgets",
  "read-model": "read-models",
  calculation: "calculations",
  chart: "charts",
  "ui-component": "ui-components",
};

function listAllSpecs(repoRoot: string): SpecRelations[] {
  const base = resolve(repoRoot, "references/05-contents");
  const out: SpecRelations[] = [];
  for (const [kind, dir] of Object.entries(KIND_DIRS)) {
    const fullDir = join(base, dir);
    if (!existsSync(fullDir)) continue;
    const re =
      kind === "widget"
        ? /^WID-\d{3}\.md$/
        : kind === "read-model"
          ? /^RM-\d{3}\.md$/
          : kind === "calculation"
            ? /^CALC-\d{3}\.md$/
            : kind === "chart"
              ? /^CHART-\d{3}\.md$/
              : /^UIC-\d{3}\.md$/;
    const files = readdirSync(fullDir).filter((f) => re.test(f));
    for (const f of files) {
      const spec = parseFrontmatter(join(fullDir, f));
      if (spec) out.push(spec);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Graph 構築
// ---------------------------------------------------------------------------

interface GraphNode {
  readonly id: string;
  readonly kind: SpecKind;
}

interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly type: "consumesReadModel" | "consumesQueryHandler" | "hasChild";
}

interface ContentGraph {
  readonly $comment: string;
  readonly generatedAt: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly stats: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly orphanCount: number;
  };
}

function buildGraph(specs: readonly SpecRelations[]): ContentGraph {
  const nodes: GraphNode[] = specs.map((s) => ({ id: s.id, kind: s.kind }));
  const edges: GraphEdge[] = [];

  for (const spec of specs) {
    for (const rm of spec.consumedReadModels) {
      edges.push({ from: spec.id, to: rm, type: "consumesReadModel" });
    }
    for (const qh of spec.consumedQueryHandlers) {
      edges.push({ from: spec.id, to: qh, type: "consumesQueryHandler" });
    }
    for (const child of spec.children) {
      edges.push({ from: spec.id, to: child, type: "hasChild" });
    }
  }

  // orphan = in / out edge ゼロの spec
  const hasInOrOut = new Set<string>();
  for (const e of edges) {
    hasInOrOut.add(e.from);
    // edge.to は spec id とは限らない (domain name / component name) ため、
    // node 集合に含まれるもののみ「reachable」と判定
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (nodeIds.has(e.to)) hasInOrOut.add(e.to);
  }
  const orphanCount = nodes.filter((n) => !hasInOrOut.has(n.id)).length;

  return {
    $comment:
      "spec 間の依存 graph (Phase A #2 初版)。consumedReadModels / consumedQueryHandlers / " +
      "children を edge として抽出。to が spec id とは限らない (domain name / component " +
      "name 経由)、後続 batch で name → spec id mapping 追加予定。",
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      orphanCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const CONTENT_GRAPH_REL = "references/02-status/generated/content-graph.json";

export function writeContentGraph(repoRoot: string): ContentGraph {
  const specs = listAllSpecs(repoRoot);
  const graph = buildGraph(specs);

  const outPath = resolve(repoRoot, CONTENT_GRAPH_REL);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(graph, null, 2) + "\n", "utf-8");

  return graph;
}

export function collectFromContentGraph(repoRoot: string): readonly HealthKpi[] {
  const graph = writeContentGraph(repoRoot);

  return [
    {
      id: "contentGraph.nodes.count",
      label: "Content Graph node 数 (= spec 総数)",
      category: "guard",
      value: graph.stats.nodeCount,
      unit: "count",
      status: "ok",
      owner: "implementation",
      docRefs: [{ kind: "definition", path: CONTENT_GRAPH_REL }],
      implRefs: ["tools/architecture-health/src/collectors/content-graph-collector.ts"],
    },
    {
      id: "contentGraph.edges.count",
      label: "Content Graph edge 数 (spec 間 reference)",
      category: "guard",
      value: graph.stats.edgeCount,
      unit: "count",
      status: "ok",
      owner: "implementation",
      docRefs: [{ kind: "definition", path: CONTENT_GRAPH_REL }],
      implRefs: ["tools/architecture-health/src/collectors/content-graph-collector.ts"],
    },
    {
      id: "contentGraph.orphans.count",
      label: "Content Graph orphan 数 (in / out edge ゼロ spec)",
      category: "guard",
      value: graph.stats.orphanCount,
      unit: "count",
      status: "ok",
      owner: "implementation",
      docRefs: [{ kind: "definition", path: CONTENT_GRAPH_REL }],
      implRefs: ["tools/architecture-health/src/collectors/content-graph-collector.ts"],
    },
  ];
}
