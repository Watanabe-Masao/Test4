/**
 * app-domain/integrity/detection/ — barrel
 */
export {
  checkBidirectionalExistence,
  type ExistenceCheckOptions,
} from "./existence";
export {
  checkPathExistence,
  type ExistsCheck,
  type PathExistenceOptions,
  type RegisteredPath,
} from "./pathExistence";
export {
  checkRatchet,
  type RatchetOptions,
  type RatchetResult,
} from "./ratchet";
export {
  checkExpired,
  checkFreshness,
  type ExpirationOptions,
  type ExpiringItem,
  type FreshnessOptions,
  type FreshnessTarget,
} from "./temporal";
export {
  checkDisjoint,
  checkInclusion,
  checkInclusionByPredicate,
  type DisjointOptions,
  type InclusionOptions,
  type InclusionPredicateOptions,
} from "./setRelation";
