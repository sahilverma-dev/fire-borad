import { initializeApp, getApp, getApps } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const envConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_DATABASE_URL,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
  envConfig.apiKey && envConfig.projectId
);

// Firebase still needs a syntactically valid project to initialise before the
// login screen can explain that configuration is missing.
const firebaseConfig = firebaseConfigured
  ? envConfig
  : {
      ...envConfig,
      apiKey: "demo-api-key",
      authDomain: "demo-fireboard.firebaseapp.com",
      projectId: "demo-fireboard",
      storageBucket: "demo-fireboard.appspot.com",
      messagingSenderId: "0",
      appId: "1:0:web:0",
    };

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // The app was initialised before (e.g. fast refresh) — reuse it.
    return getFirestore(app);
  }
}

export const db = createFirestore();
/** Backwards-compatible alias used by older modules. */
export const firestore = db;
export const auth = getAuth(app);
export const storage = getStorage(app);

let emulatorsConnected = false;

if (import.meta.env.VITE_USE_EMULATORS === "true" && !emulatorsConnected) {
  emulatorsConnected = true;
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  } catch {
    // Hot reloads can try to reconnect — ignore.
  }
}
