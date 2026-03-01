/**
 * マイグレーション登録レジストリ
 *
 * 新しいスキーマ変更を追加する場合:
 * 1. schemas.ts の SCHEMA_VERSION をインクリメント
 * 2. このファイルに新しい Migration を追加
 * 3. up() でテーブル変更、down() で巻き戻し SQL を記述
 *
 * 例（バージョン 1 → 2）:
 * ```
 * {
 *   version: 2,
 *   description: 'classified_sales に store_name_kana カラムを追加',
 *   up: async (conn) => {
 *     await conn.query('ALTER TABLE classified_sales ADD COLUMN store_name_kana VARCHAR')
 *   },
 *   down: async (conn) => {
 *     await conn.query('ALTER TABLE classified_sales DROP COLUMN store_name_kana')
 *   },
 * }
 * ```
 */
import type { Migration } from './types'
import { BUDGET_DDL, INVENTORY_CONFIG_DDL, APP_SETTINGS_DDL } from '../schemas'

/**
 * 全マイグレーションを version 昇順で登録する。
 * version は連番であること（1, 2, 3, ...）。
 */
export const migrations: readonly Migration[] = [
  // バージョン 1 は初期スキーマ（resetTables で作成）のためマイグレーション不要

  // バージョン 2: budget, inventory_config, app_settings テーブル追加
  // JS 計算パイプラインを DuckDB SQL に移行するための基盤テーブル
  {
    version: 2,
    description: 'budget, inventory_config, app_settings テーブルを追加（SQL 計算統合基盤）',
    up: async (conn) => {
      await conn.query(BUDGET_DDL)
      await conn.query(INVENTORY_CONFIG_DDL)
      await conn.query(APP_SETTINGS_DDL)
    },
    down: async (conn) => {
      await conn.query('DROP TABLE IF EXISTS app_settings')
      await conn.query('DROP TABLE IF EXISTS inventory_config')
      await conn.query('DROP TABLE IF EXISTS budget')
    },
  },
]
