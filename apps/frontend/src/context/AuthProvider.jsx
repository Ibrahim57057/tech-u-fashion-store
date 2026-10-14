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
      // With 2FA on, a correct password only earns a short-lived ticket. No
      // session exists yet, so there is nothing to store until the code is
      // supplied via completeTwoFactor.
      if (next?.twoFactorRequired) {
        return { twoFactorRequired: true, ticket: next.ticket };
      }
      clearCachedAccountData();
      setUser(next);
      return next;
    },
    [clearCachedAccountData],
  );

  /**
   * Finishes a login that stopped at the 2FA step, exchanging the password
   * ticket plus a code for a real session.
   */
  const completeTwoFactor = useCallback(
    async ({ ticket, code }) => {
      const next = await apiFetch("/auth/2fa/authenticate", {
        method: "POST",
        body: { ticket, code },
      });
      clearCachedAccountData();
      setUser(next);
      return next;
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

  /**
   * Edits the signed-in customer's own details. Only name and phone are sent;
   * the backend ignores anything else, so this cannot be used to grant a role
   * or flip the account's status. The cache is left alone — the identity has
   * not changed, so the orders already on screen are still the right ones.
   */
  const updateProfile = useCallback(async ({ name, phone }) => {
    const next = await apiFetch("/auth/me", {
      method: "PATCH",
      body: { name, phone },
    });
    setUser(next);
    return next;
  }, []);

  /**
   * Changes the password while signed in. The backend re-issues the session
   * cookie here, so storing the returned user keeps this browser signed in
   * while every other session for the account is invalidated.
   */
  const changePassword = useCallback(
    async ({ currentPassword, password, confirmPassword }) => {
      const next = await apiFetch("/auth/me/password", {
        method: "PATCH",
        body: { currentPassword, password, confirmPassword },
      });
      setUser(next);
      return next;
    },
    [],
  );

  /**
   * Confirms an address from an emailed link. This both finishes a signup and
   * applies a pending email change. When a session is already open (the
   * change-email case) the returned user replaces the cached one so the new
   * address shows immediately; a confirmation opened on another device leaves
   * the signed-in state untouched.
   */
  const verifyEmail = useCallback(async ({ token }) => {
    const next = await apiFetch("/auth/verify-email", {
      method: "POST",
      body: { token },
    });
    setUser((prev) => (prev ? next : prev));
    return next;
  }, []);

  /** Sends a fresh signup-confirmation email to the signed-in account. */
  const resendVerification = useCallback(async () => {
    return apiFetch("/auth/resend-verification", { method: "POST" });
  }, []);

  /**
   * Starts an email change. The address is only held as pending until the new
   * mailbox confirms it; the current address remains the login until then.
   */
  const changeEmail = useCallback(async ({ email, password }) => {
    const next = await apiFetch("/auth/me/email", {
      method: "PATCH",
      body: { email, password },
    });
    setUser(next);
    return next;
  }, []);

  /** Returns { secret, otpauthUrl, qrDataUrl } for the authenticator app. */
  const setupTwoFactor = useCallback(async () => {
    return apiFetch("/auth/2fa/setup", { method: "POST" });
  }, []);

  /**
   * Turns 2FA on with a code from the app. Returns the one-time recovery codes,
   * which the backend only ever sends in this response.
   */
  const enableTwoFactor = useCallback(async ({ code }) => {
    const data = await apiFetch("/auth/2fa/enable", {
      method: "POST",
      body: { code },
    });
    setUser((prev) => (prev ? { ...prev, twoFactorEnabled: true } : prev));
    return data.recoveryCodes;
  }, []);

  /** Turns 2FA off, re-authenticating with the password and a current code. */
  const disableTwoFactor = useCallback(async ({ password, code }) => {
    const next = await apiFetch("/auth/2fa/disable", {
      method: "POST",
      body: { password, code },
    });
    setUser(next);
    return next;
  }, []);

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
      completeTwoFactor,
      register,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      changeEmail,
      changePassword,
      verifyEmail,
      resendVerification,
      setupTwoFactor,
      enableTwoFactor,
      disableTwoFactor,
      isAuthenticated: !!user,
      isLoading,
    }),
    [
      user,
      login,
      completeTwoFactor,
      register,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      changeEmail,
      changePassword,
      verifyEmail,
      resendVerification,
      setupTwoFactor,
      enableTwoFactor,
      disableTwoFactor,
      isLoading,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
