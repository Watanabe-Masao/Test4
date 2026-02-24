/**
 * MurmurHash3 32-bit 実装
 *
 * 高速・低衝突の非暗号学的ハッシュ関数。
 * フィンガープリント生成に使用し、従来の軽量サマリーよりも
 * 信頼性の高いキャッシュ無効化を実現する。
 *
 * 参照: https://en.wikipedia.org/wiki/MurmurHash
 */

/**
 * 文字列を MurmurHash3 32-bit でハッシュする
 */
export function murmurhash3(key: string, seed: number = 0): number {
  let h1 = seed >>> 0
  const len = key.length
  let i = 0

  const c1 = 0xcc9e2d51
  const c2 = 0x1b873593

  while (i + 4 <= len) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24)
    i += 4

    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)

    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1 = Math.imul(h1, 5) + 0xe6546b64
  }

  const tail = len & 3
  if (tail > 0) {
    let k1 = 0
    if (tail >= 3) k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16
    if (tail >= 2) k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8
    k1 ^= key.charCodeAt(i) & 0xff
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)
    h1 ^= k1
  }

  h1 ^= len
  h1 ^= h1 >>> 16
  h1 = Math.imul(h1, 0x85ebca6b)
  h1 ^= h1 >>> 13
  h1 = Math.imul(h1, 0xc2b2ae35)
  h1 ^= h1 >>> 16

  return h1 >>> 0
}

/**
 * データ構造を決定論的に直列化してハッシュする。
 * JSON.stringify よりも高速で、Map/Set にも対応する。
 */
export function hashData(data: unknown, seed: number = 0): number {
  return murmurhash3(serializeForHash(data), seed)
}

/**
 * ハッシュ用の決定論的シリアライズ。
 * - Map はキーをソートしてシリアライズ
 * - Set はソートしてシリアライズ
 * - オブジェクトはキーをソートしてシリアライズ
 */
function serializeForHash(value: unknown): string {
  if (value === null || value === undefined) return 'N'
  if (typeof value === 'number') return `n${value}`
  if (typeof value === 'string') return `s${value}`
  if (typeof value === 'boolean') return value ? 'T' : 'F'

  if (value instanceof Map) {
    const entries = Array.from(value.entries())
      .sort(([a], [b]) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)
    return `M{${entries.map(([k, v]) => `${serializeForHash(k)}:${serializeForHash(v)}`).join(',')}}`
  }

  if (value instanceof Set) {
    const items = Array.from(value).sort()
    return `S{${items.map(serializeForHash).join(',')}}`
  }

  if (Array.isArray(value)) {
    return `A[${value.map(serializeForHash).join(',')}]`
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return `O{${keys.map((k) => `${k}:${serializeForHash(obj[k])}`).join(',')}}`
  }

  return String(value)
}
