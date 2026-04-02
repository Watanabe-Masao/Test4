export { DiscountFactReadModel, DiscountFactQueryInput } from './DiscountFactTypes'
export type {
  DiscountFactReadModel as DiscountFactReadModelType,
  DiscountFactRow,
} from './DiscountFactTypes'
export {
  buildDiscountFactReadModel,
  toStoreDiscountRows,
  toDailyDiscountRows,
  toDeptDiscountRows,
} from './readDiscountFact'
export type { DiscountFactInput, DiscountFactOutput } from './readDiscountFact'
