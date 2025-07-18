/* eslint-disable react-refresh/only-export-components */
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import Loading from "../custom/loading";
import { auth, firebaseConfigured, firestore } from "@/firebase/config";

export interface AuthContextReturnType {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export interface AuthProviderType {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextReturnType | null>(null);

async function upsertProfile(user: User) {
  const profileRef = doc(firestore, "users", user.uid);
  const existing = await getDoc(profileRef);

  await setDoc(
    profileRef,
    {
      displayName: user.displayName ?? "Someone",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      phoneNumber: user.phoneNumber ?? "",
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

const AuthProvider = ({ children }: AuthProviderType) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        void upsertProfile(nextUser).catch((profileError) => {
          console.error("Could not sync the user profile", profileError);
        });
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    setSigningIn(true);
    setError(null);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import(
        "firebase/auth"
      );
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (loginError) {
      const code =
        typeof loginError === "object" && loginError && "code" in loginError
          ? String((loginError as { code: unknown }).code)
          : "";

      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("Sign-in was cancelled.");
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the sign-in popup. Allow popups and retry.");
      } else if (!firebaseConfigured) {
        setError("Firebase is not configured. Add your VITE_* keys to .env.");
      } else {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await auth.signOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signingIn, error, login, logout, clearError }}
    >
      {loading ? <Loading /> : children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

export { AuthProvider, useAuth };
