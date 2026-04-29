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
export { tsRegistry } from "./tsRegistry";
export {
  scanMarkdownIds,
  type MarkdownIdHeading,
  type MarkdownIdScanOptions,
} from "./markdownIdScan";
export { filesystemRegistry, type FileEntry } from "./filesystemRegistry";
export {
  parseBehaviorClaimsTable,
  type ParsedBehaviorClaim,
} from "./behaviorClaimsTable";
