/**
 * Firestore 読み取りキャッシュ
 *
 * Supabase からの同期データを Firestore に格納し、
 * フロントエンドからのリアルタイム読み取りを提供する。
 *
 * Firestore コレクション構造:
 *   monthlyData/{year}-{month}/slices/{dataType}
 *     → { payload: <JSON>, updatedAt: <timestamp> }
 *
 *   sessionMeta/latest
 *     → { year, month, savedAt }
 */
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  type Unsubscribe,
  type Firestore,
} from 'firebase/firestore'
import { getFirestoreClient } from './client'

// ─── コレクション構造 ────────────────────────────────────

function monthDocPath(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function sliceDocRef(db: Firestore, year: number, month: number, dataType: string) {
  return doc(db, 'monthlyData', monthDocPath(year, month), 'slices', dataType)
}

function sessionMetaRef(db: Firestore) {
  return doc(db, 'sessionMeta', 'latest')
}

// ─── FirestoreReadCache ──────────────────────────────────

export class FirestoreReadCache {
  /**
   * 指定データ種別のキャッシュを読み取る
   */
  async readSlice<T>(year: number, month: number, dataType: string): Promise<T | null> {
    const db = getFirestoreClient()
    if (!db) return null

    const snap = await getDoc(sliceDocRef(db, year, month, dataType))
    if (!snap.exists()) return null

    return snap.data().payload as T
  }

  /**
   * 指定年月の全スライスを読み取る
   */
  async readAllSlices(year: number, month: number): Promise<Map<string, unknown>> {
    const db = getFirestoreClient()
    if (!db) return new Map()

    const colRef = collection(db, 'monthlyData', monthDocPath(year, month), 'slices')
    const snap = await getDocs(colRef)
    const result = new Map<string, unknown>()
    snap.forEach((docSnap) => {
      result.set(docSnap.id, docSnap.data().payload)
    })
    return result
  }

  /**
   * データスライスを Firestore に書き込む（同期サービスから呼ばれる）
   */
  async writeSlice(
    year: number,
    month: number,
    dataType: string,
    payload: unknown,
  ): Promise<void> {
    const db = getFirestoreClient()
    if (!db) return

    await setDoc(sliceDocRef(db, year, month, dataType), {
      payload,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * 複数スライスを一括書き込み
   */
  async writeSlices(
    year: number,
    month: number,
    slices: ReadonlyMap<string, unknown>,
  ): Promise<void> {
    const db = getFirestoreClient()
    if (!db) return

    const now = new Date().toISOString()
    const promises: Promise<void>[] = []
    for (const [dataType, payload] of slices) {
      promises.push(
        setDoc(sliceDocRef(db, year, month, dataType), {
          payload,
          updatedAt: now,
        }),
      )
    }
    await Promise.all(promises)
  }

  /**
   * セッションメタを更新
   */
  async writeSessionMeta(year: number, month: number): Promise<void> {
    const db = getFirestoreClient()
    if (!db) return

    await setDoc(sessionMetaRef(db), {
      year,
      month,
      savedAt: new Date().toISOString(),
    })
  }

  /**
   * セッションメタを読み取る
   */
  async readSessionMeta(): Promise<{ year: number; month: number; savedAt: string } | null> {
    const db = getFirestoreClient()
    if (!db) return null

    const snap = await getDoc(sessionMetaRef(db))
    if (!snap.exists()) return null

    const data = snap.data()
    return {
      year: data.year as number,
      month: data.month as number,
      savedAt: data.savedAt as string,
    }
  }

  /**
   * 指定年月のキャッシュを削除
   */
  async clearMonth(year: number, month: number): Promise<void> {
    const db = getFirestoreClient()
    if (!db) return

    const colRef = collection(db, 'monthlyData', monthDocPath(year, month), 'slices')
    const snap = await getDocs(colRef)
    const promises: Promise<void>[] = []
    snap.forEach((docSnap) => {
      promises.push(deleteDoc(docSnap.ref))
    })
    await Promise.all(promises)
  }

  /**
   * 特定データスライスのリアルタイムリスナーを登録する。
   * データが更新されるたびに callback が呼ばれる。
   * 戻り値の関数を呼ぶとリスナーを解除する。
   */
  subscribeToSlice<T>(
    year: number,
    month: number,
    dataType: string,
    callback: (data: T | null) => void,
  ): Unsubscribe {
    const db = getFirestoreClient()
    if (!db) {
      callback(null)
      return () => { /* noop */ }
    }

    return onSnapshot(sliceDocRef(db, year, month, dataType), (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      callback(snap.data().payload as T)
    })
  }

  /**
   * セッションメタのリアルタイムリスナーを登録する
   */
  subscribeToSessionMeta(
    callback: (meta: { year: number; month: number; savedAt: string } | null) => void,
  ): Unsubscribe {
    const db = getFirestoreClient()
    if (!db) {
      callback(null)
      return () => { /* noop */ }
    }

    return onSnapshot(sessionMetaRef(db), (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      const data = snap.data()
      callback({
        year: data.year as number,
        month: data.month as number,
        savedAt: data.savedAt as string,
      })
    })
  }
}
