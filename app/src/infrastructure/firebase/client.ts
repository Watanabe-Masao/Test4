/**
 * Firebase / Firestore クライアント設定
 *
 * 環境変数から接続情報を取得し、Firebase を初期化する。
 * 読み取り専用のリアルタイムキャッシュとして使用する。
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

let app: FirebaseApp | null = null
let db: Firestore | null = null

interface FirebaseConfig {
  readonly apiKey: string
  readonly authDomain: string
  readonly projectId: string
  readonly storageBucket: string
  readonly messagingSenderId: string
  readonly appId: string
}

function getConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined

  if (!apiKey || !projectId) return null

  return {
    apiKey,
    authDomain: authDomain ?? '',
    projectId,
    storageBucket: storageBucket ?? '',
    messagingSenderId: messagingSenderId ?? '',
    appId: appId ?? '',
  }
}

/**
 * Firestore インスタンスのシングルトンを取得する。
 * 環境変数が未設定の場合は null を返す。
 */
export function getFirestoreClient(): Firestore | null {
  if (db) return db

  const config = getConfig()
  if (!config) return null

  app = initializeApp(config)
  db = getFirestore(app)

  return db
}

/**
 * Firebase App インスタンスを取得する
 */
export function getFirebaseApp(): FirebaseApp | null {
  return app
}

/**
 * Firestore が利用可能か判定する
 */
export function isFirestoreAvailable(): boolean {
  return getFirestoreClient() !== null
}
