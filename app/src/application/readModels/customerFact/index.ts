/**
 * @responsibility R:unclassified
 */

export type { CustomerFactReadModel, CustomerFactDailyRow } from './CustomerFactTypes'
export {
  customerFactHandler,
  buildCustomerFactReadModel,
  toStoreCustomerRows,
  toDailyCustomerRows,
  toStoreDayCustomerRows,
} from './readCustomerFact'
export type { CustomerFactInput, CustomerFactOutput } from './readCustomerFact'
