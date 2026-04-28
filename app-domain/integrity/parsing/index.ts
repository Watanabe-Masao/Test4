/**
 * app-domain/integrity/parsing/ — barrel
 */
export {
  parseSpecFrontmatter,
  inferKindFromId,
  type SpecKind,
  type SpecFrontmatter,
  type LifecycleStatus,
  type EvidenceLevel,
  type RiskLevel,
  type BehaviorClaim,
} from "./yamlFrontmatter";
export { findIdLine, findExportLine } from "./sourceLineLookup";
export { jsonRegistry } from "./jsonRegistry";
