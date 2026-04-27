/**
 * @responsibility R:unclassified
 */

export type { Migration, MigrationResult } from './types'
export { migrations } from './registry'
export { runMigrations, getCurrentVersion } from './runner'
