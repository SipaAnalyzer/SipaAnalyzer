import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";

const AuthContext = createContext(null);

async function enrichUserWithProfile(user) {
  if (!user?.id) return user;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[Auth] profile load error:", error);
    return user;
  }

  return {
    ...user,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
    email: profile?.email || user.email,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(error);
        return null;
      }

      const currentUser = data.user ? await enrichUserWithProfile(data.user) : null;

      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(error);
      return null;
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkUserAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ? await enrichUserWithProfile(session.user) : null;

      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      setAuthError(null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingAuth,
        authChecked,
        authError,
        isAuthenticated,
        checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
