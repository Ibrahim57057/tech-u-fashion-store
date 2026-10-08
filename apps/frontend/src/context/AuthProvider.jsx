import { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./AuthContext.js";
import { apiFetch } from "../lib/apiClient.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  /**
   * Drops every cached query when the signed-in identity changes.
   *
   * The queries behind this — ['my-orders'], ['my-returns'], ['wishlist'] —
   * are keyed only by page, never by account, and the global staleTime is 60
   * seconds. So on a shared laptop, signing out and signing in as somebody
   * else served the previous customer's orders straight from cache without a
   * single network request: the key matched, and the data was still fresh.
   *
   * Clearing wholesale rather than enumerating per-user keys is deliberate —
   * a new account-scoped hook added later is covered without anyone having to
   * remember to list it here. The cost is refetching the catalogue once after
   * a sign-in, which staleTime already makes cheap.
   *
   * Must run alongside the setUser that follows it, never on its own: the
   * point is that the cache is empty by the time anything renders as the new
   * identity.
   */
  const clearCachedAccountData = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

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

  const login = useCallback(
    async ({ email, password }) => {
      const next = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      clearCachedAccountData();
      setUser(next);
    },
    [clearCachedAccountData],
  );

  const register = useCallback(
    async ({ name, email, phone, password }) => {
      const next = await apiFetch("/auth/register", {
        method: "POST",
        body: { name, email, phone, password },
      });
      clearCachedAccountData();
      setUser(next);
    },
    [clearCachedAccountData],
  );

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
  const resetPassword = useCallback(
    async ({ token, password, confirmPassword }) => {
      const next = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { token, password, confirmPassword },
      });
      // Clearing here also matters for the recovery case: the account was
      // taken over, so nothing fetched before the reset should survive it.
      clearCachedAccountData();
      setUser(next);
    },
    [clearCachedAccountData],
  );

  const logout = useCallback(async () => {
    // Cleared regardless of what the server said: the cookie is the session,
    // and leaving the user rendered as signed in after a failed logout is
    // worse than an optimistic sign-out.
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    clearCachedAccountData();
  }, [clearCachedAccountData]);

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
