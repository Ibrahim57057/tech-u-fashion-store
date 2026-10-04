/**
 * Who can get into the admin area, in one place.
 *
 * This existed as a bare `user?.role === "admin"` copy-pasted into Header.jsx
 * while AdminRoute checked `["admin", "staff"]`. The two disagreed, so a staff
 * member could reach /admin by typing the URL but had no way to find the link
 * — and nobody could tell whether the panel was missing or they were simply
 * signed in as the wrong account.
 */
export const ADMIN_ROLES = ["admin", "staff"];

export function isAdmin(user) {
  return user?.role === "admin";
}

/** Matches the AdminRoute guard, so the link is shown exactly where it works. */
export function canAccessAdmin(user) {
  return ADMIN_ROLES.includes(user?.role);
}