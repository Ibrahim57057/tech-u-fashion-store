import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthContext } from "./AuthContext.js";
import { apiFetch } from "../lib/apiClient.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, check if a valid session cookie already exists
  // (e.g. the user refreshed the page while logged in). Without this,
  // every page refresh would silently log the user out on the frontend
  // even though their real backend session is still valid.
  useEffect(() => {
    // .catch is required, not optional: when the API is unreachable (server
    // down, or blocked by CORS) fetch rejects, and an unhandled rejection
    // here used to surface as "Uncaught (in promise) TypeError: Failed to
    // fetch" on every page load. No response from /auth/me means "no
    // session to restore", which is exactly the state we start in.
    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setUser(await apiFetch("/auth/login", { method: "POST", body: { email, password } }));
  }, []);

  const register = useCallback(async ({ name, email, phone, password }) => {
    setUser(
      await apiFetch("/auth/register", {
        method: "POST",
        body: { name, email, phone, password },
      }),
    );
  }, []);

  /**
   * Asks for a reset link. Returns the message to show the customer, and
   * deliberately does NOT touch `user` — the backend answers identically
   * whether or not the address has an account, and this side of the
   * application must not appear to know the difference either.
   */
  const forgotPassword = useCallback(async ({ email }) => {
    const data = await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
    return data.message;
  }, []);

  /**
   * Consumes the token from the emailed link. On success the backend has
   * already re-issued the session cookie, so storing the returned user here
   * is what makes the customer signed in rather than bounced to /login.
   */
  const resetPassword = useCallback(async ({ token, password, confirmPassword }) => {
    setUser(
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { token, password, confirmPassword },
      }),
    );
  }, []);

  const logout = useCallback(async () => {
    // Cleared regardless of what the server said: the cookie is the session,
    // and leaving the user rendered as signed in after a failed logout is
    // worse than an optimistic sign-out.
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  // Memoised so consumers of useAuth() are not re-rendered on every unrelated
  // state change in this provider. Without it the value is a fresh object
  // each render, which defeats context entirely for the whole tree below.
  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      isAuthenticated: !!user,
      isLoading,
    }),
    [user, login, register, logout, forgotPassword, resetPassword, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
