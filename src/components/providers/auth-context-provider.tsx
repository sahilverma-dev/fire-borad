import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import Loading from "../custom/loading";
import { auth, firestore } from "@/firebase/config";

// interfaces

export interface AuthContextReturnType {
  user: User | null;
  login: () => void;
  logout: () => void;
}

export interface UserType {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface AuthProviderType {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextReturnType | null>(null);

const AuthProvider = ({ children }: AuthProviderType) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(true);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    try {
      await setDoc(
        doc(firestore, `users/${user?.uid}`),
        {
          name: user?.displayName,
          email: user?.email,
          photoURL: user?.photoURL,
          phoneNumber: user?.phoneNumber,
          url: window.location.host,
          timestamp: serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.log(error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {loading ? children : <Loading />}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context) {
    return context;
  } else {
    throw new Error("Something is wrong with auth context");
  }
};

export { AuthProvider, useAuth };
